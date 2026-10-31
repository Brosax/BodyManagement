"use client";

import { useEffect, useState } from "react";
import { weekdayOf } from "@/lib/date";

export type PlanRow = {
  id: number;
  personId: number;
  weekday: number;
  content: string;
};

const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

/** 周计划模板编辑器：7 天折叠块，失焦自动保存 */
export default function WeekPlanEditor({
  personId,
  plans,
  onSaved,
}: {
  personId: number;
  plans: PlanRow[];
  onSaved?: (row: PlanRow) => void;
}) {
  const today = weekdayOf(new Date());
  const [open, setOpen] = useState<number | null>(today);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingDay, setSavingDay] = useState<number | null>(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        Array.from({ length: 7 }, (_, i) => [
          i + 1,
          plans.find((p) => p.weekday === i + 1)?.content ?? "",
        ])
      )
    );
    setOpen(today);
  }, [plans, today]);

  async function save(weekday: number) {
    setSavingDay(weekday);
    try {
      const res = await fetch("/api/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          weekday,
          content: drafts[weekday] ?? "",
        }),
      });
      if (res.ok) {
        const row: PlanRow = await res.json();
        onSaved?.(row);
      }
    } finally {
      setSavingDay(null);
    }
  }

  return (
    <div className="px-4 space-y-2">
      <h2 className="text-sm text-gray-600 font-medium px-1 pt-1">
        每周计划（点击编辑，离开输入框自动保存）
      </h2>
      {DAY_NAMES.map((name, i) => {
        const day = i + 1;
        const isOpen = open === day;
        const isToday = day === today;
        return (
          <div
            key={day}
            className={`bg-white rounded-2xl overflow-hidden shadow-sm ${
              isToday ? "ring-2 ring-green-500" : ""
            }`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : day)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <span className="font-medium text-sm flex items-center gap-2">
                {name}
                {isToday && (
                  <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
                    今天
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[55%] text-right">
                {(drafts[day] ?? "").split("\n")[0] || "休息日"}
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-3">
                <textarea
                  value={drafts[day] ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [day]: e.target.value }))
                  }
                  onBlur={() => save(day)}
                  rows={4}
                  placeholder={"卧推 4×8×50kg\n绳索下压 3×12×25kg\n（留空表示休息日）"}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:ring-2 ring-green-500 resize-y"
                />
                {savingDay === day && (
                  <p className="text-xs text-gray-400 mt-1">保存中…</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
