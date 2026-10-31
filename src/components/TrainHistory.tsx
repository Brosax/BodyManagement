"use client";

import { formatDateCN, weekdayOf } from "@/lib/date";
import type { TrainingLog } from "@/lib/types";

const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

/** 训练历史列表（含删除） */
export default function TrainHistory({
  logs,
  onDelete,
}: {
  logs: TrainingLog[];
  onDelete: (id: number) => void;
}) {
  return (
    <div className="mt-4 px-4 space-y-3">
      <h2 className="text-sm text-gray-600 font-medium px-1">
        训练历史（最近 60 条）
      </h2>
      {logs.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-6">还没有训练记录</p>
      ) : (
        <div className="space-y-2 pb-2">
          {logs.map((log) => {
            const d = new Date(
              Number(log.date.slice(0, 4)),
              Number(log.date.slice(5, 7)) - 1,
              Number(log.date.slice(8, 10))
            );
            return (
              <div key={log.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    {formatDateCN(log.date)} · {DAY_NAMES[weekdayOf(d) - 1]}
                    {log.planWeekday == null && (
                      <span className="ml-1 text-blue-400">自由</span>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      if (confirm("删除这条记录？")) onDelete(log.id);
                    }}
                    className="text-gray-400 hover:text-red-500 px-1 text-lg"
                    aria-label="删除"
                  >
                    ✕
                  </button>
                </div>
                <pre className="text-sm whitespace-pre-wrap font-sans">{log.content}</pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
