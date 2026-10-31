"use client";

import { useState } from "react";
import { addDays, toDateStr, weekdayOf } from "@/lib/date";

const DOW = ["一", "二", "三", "四", "五", "六", "日"];

export type CellInfo = {
  /** 格子副文字（如当日热量、体重、计划简写） */
  sub?: string;
  /** 副文字色调 */
  tone?: "green" | "orange" | "plain";
  /** 格子底部打卡圆点 */
  dot?: boolean;
};

/** 通用周条/月历：默认本周横条，可展开整月并翻月，未来日期禁选 */
export default function Calendar({
  selectedDate,
  onSelect,
  cellInfo,
}: {
  selectedDate: string;
  onSelect: (d: string) => void;
  cellInfo?: (date: string) => CellInfo | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  const todayStr = toDateStr(now);

  /** 本周一~周日 */
  const monday = addDays(now, -(weekdayOf(now) - 1));
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    toDateStr(addDays(monday, i))
  );

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  /** 月历格子：前置空白 + 当月天数 */
  const monthCells: (string | null)[] = (() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const lead = weekdayOf(first) - 1;
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    return [
      ...Array.from({ length: lead }, () => null),
      ...Array.from(
        { length: days },
        (_, i) => toDateStr(new Date(cursor.y, cursor.m, i + 1))
      ),
    ];
  })();

  function subClass(tone: CellInfo["tone"], selected: boolean): string {
    if (selected) return "text-green-50";
    if (tone === "green") return "text-green-600";
    if (tone === "orange") return "text-orange-500";
    return "text-gray-400";
  }

  function cell(date: string) {
    const info = cellInfo?.(date);
    const isToday = date === todayStr;
    const isSelected = date === selectedDate;
    const future = date > todayStr;
    const dayNum = Number(date.slice(8, 10));
    return (
      <button
        key={date}
        disabled={future}
        onClick={() => onSelect(date)}
        className={`flex flex-col items-center py-1.5 rounded-xl min-w-0 ${
          isSelected ? "bg-green-600 text-white" : future ? "opacity-30" : "active:bg-gray-100"
        }`}
      >
        <span
          className={`text-sm tabular-nums ${
            isToday && !isSelected ? "text-green-600 font-bold" : ""
          }`}
        >
          {dayNum}
        </span>
        <span
          className={`text-[9px] leading-tight truncate max-w-full px-0.5 ${subClass(info?.tone, isSelected)}`}
        >
          {info?.sub ?? ""}
        </span>
        <span className="h-1.5 flex items-center">
          {info?.dot && (
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSelected ? "bg-white" : "bg-green-500"
              }`}
            />
          )}
        </span>
      </button>
    );
  }

  return (
    <section className="mx-4 mt-3 bg-white rounded-2xl p-3 shadow-sm">
      {!expanded ? (
        <>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DOW.map((d) => (
              <span key={d} className="text-center text-[10px] text-gray-400">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">{weekDays.map(cell)}</div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-1 px-1">
            <button
              onClick={() => shiftMonth(-1)}
              className="px-2 text-gray-500 active:text-green-600"
              aria-label="上个月"
            >
              ‹
            </button>
            <span className="text-sm font-medium">
              {cursor.y}年{cursor.m + 1}月
            </span>
            <button
              onClick={() => shiftMonth(1)}
              className="px-2 text-gray-500 active:text-green-600"
              aria-label="下个月"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DOW.map((d) => (
              <span key={d} className="text-center text-[10px] text-gray-400">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {monthCells.map((d, i) =>
              d ? cell(d) : <span key={`blank-${i}`} />
            )}
          </div>
        </>
      )}
      <button
        onClick={() => {
          if (!expanded) setCursor({ y: now.getFullYear(), m: now.getMonth() });
          setExpanded((v) => !v);
        }}
        className="w-full text-center text-xs text-gray-500 pt-1.5"
      >
        {expanded ? "收起 ▴" : "展开月历 ▾"}
      </button>
    </section>
  );
}
