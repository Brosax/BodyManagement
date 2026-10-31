"use client";

import { useCallback, useEffect, useState } from "react";
import WeightEntryEditor from "@/components/WeightEntryEditor";
import { formatDateCN, weekdayOf } from "@/lib/date";
import { formatDecimal } from "@/lib/format";
import { SPLIT_COUNT } from "@/lib/split";
import type { ExerciseSetGroup, TrainingLog } from "@/lib/types";

const DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

/** 选中日期的详情：当天练了什么 / 打卡（选位次） / 自由记录 / 重量记录 */
export default function TrainDayDetail({
  personId,
  date,
  slots,
  nextPosition,
  splitLogOfDate,
  hasAnyLog,
  onChanged,
}: {
  personId: number;
  date: string;
  /** 位次模板内容，下标 0 = 第1练 */
  slots: string[];
  nextPosition: number;
  splitLogOfDate: TrainingLog | null;
  hasAnyLog: boolean;
  onChanged: () => void;
}) {
  const [chosenPos, setChosenPos] = useState(nextPosition);
  const [freeText, setFreeText] = useState("");
  const [showFree, setShowFree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sets, setSets] = useState<ExerciseSetGroup[] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // 切换日期时重置位次选择为当前预测
  useEffect(() => {
    setChosenPos(nextPosition);
  }, [date, nextPosition]);

  const d = new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10))
  );
  const wd = weekdayOf(d);
  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();
  const isFuture = date > todayStr;

  const loadSets = useCallback(async () => {
    try {
      const res = await fetch(`/api/exercise-sets?personId=${personId}&date=${date}`);
      if (res.ok) setSets(await res.json());
    } catch {
      // 静默：重量记录加载失败不打断
    }
  }, [personId, date]);

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  async function post(content: string, planWeekday: number | null) {
    setBusy(true);
    try {
      const res = await fetch("/api/training-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, date, content, planWeekday }),
      });
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  }

  function checkin() {
    const content = (slots[chosenPos - 1] || "").trim() || `完成第${chosenPos}练`;
    post(content, chosenPos);
  }

  const doneSlot = splitLogOfDate?.planWeekday ?? null;

  return (
    <section className="mx-4 mt-3 bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="font-medium text-sm">
          {formatDateCN(date)} · {DAY_NAMES[wd - 1]}
        </h2>
        {date === todayStr && (
          <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5">
            今天
          </span>
        )}
        {doneSlot != null && (
          <span className="text-xs text-green-600">✅ 已练第{doneSlot}练</span>
        )}
        {!splitLogOfDate && hasAnyLog && (
          <span className="text-xs text-blue-400">有自由记录</span>
        )}
      </div>

      {/* 当天已打卡：显示练的内容 */}
      {splitLogOfDate && (
        <pre className="text-sm whitespace-pre-wrap font-sans mb-3">
          {splitLogOfDate.content}
        </pre>
      )}

      {/* 打卡：选择这次练的是哪个部位（今天未打卡或补记） */}
      {!splitLogOfDate && !isFuture && (
        <>
          <p className="text-xs text-gray-600 mb-1.5">
            {date === todayStr ? "本次该练" : "补记这天练的部位"}
          </p>
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {Array.from({ length: SPLIT_COUNT }, (_, i) => i + 1).map((pos) => (
              <button
                key={pos}
                onClick={() => setChosenPos(pos)}
                className={`py-2 rounded-xl text-xs border ${
                  chosenPos === pos
                    ? "bg-green-600 text-white border-green-600"
                    : pos === nextPosition
                      ? "border-green-400 text-green-600"
                      : "bg-white border-gray-300 text-gray-700"
                }`}
              >
                第{pos}练
              </button>
            ))}
          </div>
          {(slots[chosenPos - 1] || "").trim() ? (
            <pre className="text-sm whitespace-pre-wrap font-sans bg-gray-50 rounded-xl p-3 mb-3">
              {slots[chosenPos - 1]}
            </pre>
          ) : (
            <p className="text-xs text-gray-400 mb-3">该位次还没设置动作内容</p>
          )}
          <button
            onClick={checkin}
            disabled={busy}
            className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium active:bg-green-700 disabled:opacity-50"
          >
            {busy ? "…" : date === todayStr ? "✅ 完成打卡" : "补记这天打卡"}
          </button>
        </>
      )}

      {/* 自由记录（仅今天） */}
      {date === todayStr && (
        <>
          <button
            onClick={() => setShowFree((v) => !v)}
            className="w-full py-2.5 rounded-xl border border-dashed border-gray-400 text-gray-600 text-sm mt-2"
          >
            {showFree ? "收起" : "＋ 自由记录（不占循环顺序）"}
          </button>
          {showFree && (
            <div className="mt-2">
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={3}
                placeholder="今天额外练了什么？"
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:ring-2 ring-green-500 resize-y"
              />
              <button
                onClick={() => {
                  if (freeText.trim()) {
                    post(freeText.trim(), null);
                    setFreeText("");
                    setShowFree(false);
                  }
                }}
                disabled={busy || !freeText.trim()}
                className="mt-2 w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium active:bg-green-700 disabled:opacity-50"
              >
                记录
              </button>
            </div>
          )}
        </>
      )}

      {/* 重量记录 */}
      <div className="border-t border-gray-100 mt-3 pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-600 font-medium">重量记录</span>
          {!isFuture && (
            <button
              onClick={() => setEditorOpen(true)}
              className="text-xs text-green-600 font-medium"
            >
              🏋️ {sets && sets.length > 0 ? "编辑" : "记重量"}
            </button>
          )}
        </div>
        {sets === null ? (
          <p className="text-xs text-gray-400">加载中…</p>
        ) : sets.length === 0 ? (
          <p className="text-xs text-gray-400">这天还没有逐组重量记录</p>
        ) : (
          <ul className="space-y-1">
            {sets.map((g) => (
              <li key={g.exerciseName} className="text-sm flex gap-2">
                <span className="shrink-0">{g.exerciseName}</span>
                <span className="text-gray-500 tabular-nums text-xs leading-5 truncate">
                  {g.sets
                    .map((s) => `${s.reps}×${formatDecimal(s.weightKg)}kg`)
                    .join("，")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editorOpen && (
        <WeightEntryEditor
          personId={personId}
          date={date}
          onClose={() => setEditorOpen(false)}
          onSaved={() => {
            loadSets();
            onChanged();
          }}
        />
      )}
    </section>
  );
}
