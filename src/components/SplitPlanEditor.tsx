"use client";

import { useEffect, useState } from "react";
import { SPLIT_COUNT } from "@/lib/split";

export type PlanRow = {
  id: number;
  personId: number;
  weekday: number; // 四分计划语义下存位次 1–4
  content: string;
};

const SLOT_NAMES = Array.from({ length: SPLIT_COUNT }, (_, i) => `第${i + 1}练`);

/** 四分计划编辑器（两人共用）：4 个训练位次折叠块，失焦自动保存 */
export default function SplitPlanEditor({
  plans,
  nextPosition,
  onSaved,
}: {
  plans: PlanRow[];
  nextPosition: number;
  onSaved?: (row: PlanRow) => void;
}) {
  const [open, setOpen] = useState<number | null>(nextPosition);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingSlot, setSavingSlot] = useState<number | null>(null);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        Array.from({ length: SPLIT_COUNT }, (_, i) => [
          i + 1,
          plans.find((p) => p.weekday === i + 1)?.content ?? "",
        ])
      )
    );
    setOpen(nextPosition);
  }, [plans, nextPosition]);

  async function save(slot: number) {
    setSavingSlot(slot);
    try {
      const res = await fetch("/api/plans", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekday: slot,
          content: drafts[slot] ?? "",
        }),
      });
      if (res.ok) {
        const row: PlanRow = await res.json();
        onSaved?.(row);
      }
    } finally {
      setSavingSlot(null);
    }
  }

  return (
    <div className="px-4 space-y-2">
      <h2 className="text-sm text-gray-600 font-medium px-1 pt-1">
        四分计划（练完一个部位打卡后，自动轮到下一个；点击编辑，离开输入框自动保存）
      </h2>
      {SLOT_NAMES.map((name, i) => {
        const slot = i + 1;
        const isOpen = open === slot;
        const isNext = slot === nextPosition;
        return (
          <div
            key={slot}
            className={`bg-white rounded-2xl overflow-hidden shadow-sm ${
              isNext ? "ring-2 ring-green-500" : ""
            }`}
          >
            <button
              onClick={() => setOpen(isOpen ? null : slot)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <span className="font-medium text-sm flex items-center gap-2">
                {name}
                {isNext && (
                  <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">
                    下次该练
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[55%] text-right">
                {(drafts[slot] ?? "").split("\n")[0] || "未设置"}
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-3">
                <textarea
                  value={drafts[slot] ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [slot]: e.target.value }))
                  }
                  onBlur={() => save(slot)}
                  rows={4}
                  placeholder={"卧推 4×8×50kg\n绳索下压 3×12×25kg"}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:ring-2 ring-green-500 resize-y"
                />
                {savingSlot === slot && (
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
