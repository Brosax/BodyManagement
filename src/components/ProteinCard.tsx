"use client";

import { useEffect, useState } from "react";
import { proteinUrl, refresh, todayUrl, useApi } from "@/lib/api-cache";
import { toDateStr } from "@/lib/date";
import { calcPowderNutrition } from "@/lib/protein";
import { usePersons } from "@/lib/person-context";

const MIN_G = 5;
const MAX_G = 500;
const STEP_G = 5;

export default function ProteinCard({
  personId,
  date,
}: {
  personId: number;
  date?: string;
}) {
  const day = date ?? toDateStr(new Date());
  const { current } = usePersons();
  const defaultServingG =
    current?.proteinServingG ?? 30; /* 迁移生效前的兜底默认值 */
  const powderConfig = {
    kcalPer100G: current?.proteinKcalPer100G ?? 400,
    proteinPer100G: current?.proteinProteinPer100G ?? 80,
  };

  const checkins = useApi<string[]>(proteinUrl(personId, day));
  const checkedAt = (checkins.data ?? []).includes(day) ? day : null;
  const loading = checkins.loading && checkins.data == null;
  const [servingG, setServingG] = useState<number>(defaultServingG);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setServingG(defaultServingG);
  }, [defaultServingG]);

  async function checkin() {
    setBusy(true);
    try {
      const res = await fetch("/api/protein", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, date: day, servingG }),
      });
      if (res.ok) {
        checkins.reload();
        refresh(todayUrl(personId, day));
      }
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/protein?personId=${personId}&date=${day}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        checkins.reload();
        refresh(todayUrl(personId, day));
      }
    } finally {
      setBusy(false);
    }
  }

  const nutrition = calcPowderNutrition(servingG, powderConfig);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">💊 蛋白粉</p>
          {loading ? (
            <p className="text-sm text-gray-500 mt-0.5">查询中…</p>
          ) : checkedAt ? (
            <p className="text-sm text-green-600 mt-0.5">✅ 今天已完成 · {servingG}g</p>
          ) : (
            <p className="text-sm text-gray-500 mt-0.5">今天还没喝哦</p>
          )}
        </div>
        {!loading &&
          (checkedAt ? (
            <button
              onClick={undo}
              disabled={busy}
              className="text-xs text-gray-500 underline disabled:opacity-50 px-2 py-1"
            >
              取消打卡
            </button>
          ) : (
            <button
              onClick={checkin}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium active:bg-green-700 disabled:opacity-50"
            >
              {busy ? "…" : "打卡"}
            </button>
          ))}
      </div>

      {!loading && !checkedAt && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setServingG((g) => Math.max(MIN_G, g - STEP_G))
              }
              disabled={busy || servingG <= MIN_G}
              aria-label="减少克数"
              className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 text-lg leading-none active:bg-gray-200 disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-[52px] text-center tabular-nums text-sm font-medium">
              {servingG}g
            </span>
            <button
              onClick={() =>
                setServingG((g) => Math.min(MAX_G, g + STEP_G))
              }
              disabled={busy || servingG >= MAX_G}
              aria-label="增加克数"
              className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 text-lg leading-none active:bg-gray-200 disabled:opacity-40"
            >
              ＋
            </button>
            <span className="ml-1 text-xs text-gray-400">
              ≈{nutrition.calories} kcal · 蛋白{nutrition.proteinG}g
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
