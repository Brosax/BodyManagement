"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { prefetchAllTabs } from "./api-cache";
import { toDateStr } from "./date";
import type { Person } from "./types";

export type { Person };

type Ctx = {
  persons: Person[];
  current: Person | null;
  loading: boolean;
  select: (id: number) => void;
  refresh: () => Promise<void>;
};

const PersonContext = createContext<Ctx>({
  persons: [],
  current: null,
  loading: true,
  select: () => {},
  refresh: async () => {},
});

const STORAGE_KEY = "bm_person_id";

export function PersonProvider({ children }: { children: React.ReactNode }) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/persons");
        if (!res.ok) throw new Error(String(res.status));
        const list: Person[] = await res.json();
        if (cancelled) return;
        setPersons(list);
        const saved = Number(localStorage.getItem(STORAGE_KEY));
        if (list.some((p) => p.id === saved)) setCurrentId(saved);
      } catch {
        // 加载失败时保持空列表，界面显示重试入口
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const select = useCallback((id: number) => {
    setCurrentId(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  // 身份就绪后空闲预取全部 tab 的核心数据（首次切页也秒开）
  useEffect(() => {
    if (!currentId) return;
    const t = setTimeout(() => {
      prefetchAllTabs(currentId, toDateStr(new Date()));
    }, 200);
    return () => clearTimeout(t);
  }, [currentId]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/persons");
      if (!res.ok) return;
      setPersons(await res.json());
    } catch {
      // 静默失败，保留旧数据
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      persons,
      current: persons.find((p) => p.id === currentId) ?? null,
      loading,
      select,
      refresh,
    }),
    [persons, currentId, loading, select, refresh]
  );

  return <PersonContext.Provider value={value}>{children}</PersonContext.Provider>;
}

export function usePersons() {
  return useContext(PersonContext);
}
