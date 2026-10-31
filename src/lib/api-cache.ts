"use client";

/**
 * 轻量 SWR 数据层：内存缓存 + 请求去重 + 预取 + stale-while-revalidate。
 * 目的：切页时缓存命中即时渲染，消除「加载中…」闪烁。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { addDays, toDateStr } from "./date";

// ---------- URL 构造器（页面与预取共用，保证缓存键一致） ----------

export function todayUrl(personId: number, date: string): string {
  return `/api/today?personId=${personId}&date=${date}`;
}

export function proteinUrl(personId: number, date: string): string {
  return `/api/protein?personId=${personId}&from=${date}&to=${date}`;
}

export function foodsUrl(personId: number, date: string): string {
  return `/api/foods?personId=${personId}&date=${date}`;
}

export function summaryUrl(personId: number, toDate: string, days = 90): string {
  const from = toDateStr(addDays(new Date(), -(days - 1)));
  return `/api/foods/summary?personId=${personId}&from=${from}&to=${toDate}`;
}

export function plansUrl(): string {
  return "/api/plans";
}

export function logsUrl(personId: number): string {
  return `/api/training-logs?personId=${personId}`;
}

export function weightsUrl(personId: number, days: number): string {
  return `/api/weights?personId=${personId}&days=${days}`;
}

// ---------- 缓存层 ----------

const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

export function setCached(url: string, data: unknown): void {
  cache.set(url, data);
}

export function invalidate(prefix: string): void {
  for (const key of [...cache.keys()]) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/** 总是走网络（用于后台重验证），结果写回缓存；同 url 并发去重 */
export function fetchAndCache<T>(url: string): Promise<T> {
  const running = inflight.get(url);
  if (running) return running as Promise<T>;
  const p = fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`加载失败(${res.status})`);
    const data = (await res.json()) as T;
    cache.set(url, data);
    return data;
  });
  inflight.set(url, p);
  p.finally(() => inflight.delete(url)).catch(() => {});
  return p;
}

/** 未缓存才预取（静默失败） */
export function prefetch(url: string): void {
  if (cache.has(url) || inflight.has(url)) return;
  fetchAndCache(url).catch(() => {});
}

/** 强制后台刷新缓存（写操作后调用，让下次挂载拿到新数据） */
export function refresh(url: string): void {
  fetchAndCache(url).catch(() => {});
}

// ---------- 预取编排 ----------

/** 预取某个 tab 页挂载时需要的全部接口 */
export function prefetchTabData(href: string, personId: number, date: string): void {
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const urls: string[] = [];
  switch (path) {
    case "/":
      urls.push(todayUrl(personId, date), proteinUrl(personId, date));
      break;
    case "/eat":
      urls.push(foodsUrl(personId, date), summaryUrl(personId, date));
      break;
    case "/train":
      urls.push(plansUrl(), logsUrl(personId));
      break;
    case "/weight":
      urls.push(weightsUrl(personId, 90));
      break;
    case "/me":
      urls.push(weightsUrl(personId, 7));
      break;
  }
  for (const u of urls) prefetch(u);
}

/** 空闲时全量预取 5 个 tab 的核心数据（首次切页也秒开） */
export function prefetchAllTabs(personId: number, date: string): void {
  for (const href of ["/", "/eat", "/train", "/weight", "/me"]) {
    prefetchTabData(href, personId, date);
  }
}

// ---------- useApi hook ----------

export type Api<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** 强制绕过缓存重新请求 */
  reload: () => void;
  /** 本地乐观更新（同时写穿缓存） */
  mutate: (data: T) => void;
};

/**
 * stale-while-revalidate：
 * - 缓存命中 → 立即渲染旧数据，后台静默重验证
 * - 未命中 → 正常加载态
 * - resetKey（如 personId）变化时清空数据，避免串身份
 */
export function useApi<T>(url: string | null, resetKey?: string | number): Api<T> {
  const [data, setData] = useState<T | null>(() =>
    url ? ((cache.get(url) as T) ?? null) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // resetKey 变化（切换身份）时清空旧数据
  const prevKey = useRef(resetKey);
  useEffect(() => {
    if (prevKey.current !== resetKey) {
      prevKey.current = resetKey;
      setData(null);
    }
  }, [resetKey]);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const cached = cache.get(url);
    if (cached !== undefined) {
      setData(cached as T);
      setError(null);
      setLoading(false);
      fetchAndCache<T>(url)
        .then((fresh) => {
          if (!cancelled) setData(fresh);
        })
        .catch(() => {});
    } else {
      setLoading(true);
      setError(null);
      fetchAndCache<T>(url)
        .then((fresh) => {
          if (!cancelled) {
            setData(fresh);
            setError(null);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "加载失败");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [url, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const mutate = useCallback(
    (d: T) => {
      if (url) cache.set(url, d);
      setData(d);
    },
    [url]
  );

  return { data, loading, error, reload, mutate };
}
