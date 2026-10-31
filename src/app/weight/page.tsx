"use client";

import { useState } from "react";
import Calendar from "@/components/Calendar";
import PageHeader from "@/components/PageHeader";
import PersonBadge from "@/components/PersonBadge";
import WeightChart from "@/components/WeightChart";
import { refresh, todayUrl, useApi, weightsUrl } from "@/lib/api-cache";
import { formatDateCN, toDateStr } from "@/lib/date";
import { formatDecimal, parseDecimalLoose } from "@/lib/format";
import { usePersons } from "@/lib/person-context";
import type { WeightEntry } from "@/lib/types";

export default function WeightPage() {
  const { current } = usePersons();
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const personId = current?.id;
  const today = toDateStr(new Date());
  const weights = useApi<WeightEntry[]>(
    personId ? weightsUrl(personId, 90) : null,
    personId
  );
  const points = weights.data ?? [];

  if (!current) return <PageHeader title="重" right={<PersonBadge />} />;

  const byDate = Object.fromEntries(points.map((p) => [p.date, p.weightKg]));
  const selectedValue = byDate[selectedDate];
  const isPast = selectedDate < today;

  async function submit() {
    const w = parseDecimalLoose(input);
    if (w === null || w < 20 || w > 500) {
      setMsg("请输入 20–500 之间的体重（如 65,5）");
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          date: selectedDate,
          weightKg: Math.round(w * 10) / 10,
        }),
      });
      if (res.ok) {
        setInput("");
        weights.reload();
        refresh(todayUrl(personId!, today));
        setMsg(isPast ? "已补记 ✓" : "已记录 ✓");
        setTimeout(() => setMsg(null), 2000);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="重" right={<PersonBadge />} />

      <Calendar
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
          cellInfo={(d) => {
            const w = byDate[d];
            if (w === undefined) return {};
            return {
              sub: formatDecimal(w),
              tone: d === today ? "green" : "plain",
            };
          }}
      />

      <div className="px-4 pt-4 space-y-4">
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm text-gray-600">
              {isPast ? `${formatDateCN(selectedDate)}的体重（补记）` : "今天的体重"}
            </h2>
            {selectedValue != null && (
              <span className="text-sm font-semibold text-green-600">
                {formatDecimal(selectedValue)} kg
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              inputMode="decimal"
              placeholder={
                selectedValue != null
                  ? `更新为 ${formatDecimal(selectedValue)}？输入新数值`
                  : isPast
                    ? "给这天补个体重，如：65,5"
                    : "如：65,5"
              }
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500"
            />
            <span className="text-gray-400">kg</span>
            <button
              onClick={submit}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium active:bg-green-700 disabled:opacity-50"
            >
              {isPast ? "补记" : "记录"}
            </button>
          </div>
          {msg && <p className="text-xs mt-2 text-green-600">{msg}</p>}
        </section>

        {weights.error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm flex justify-between items-center">
            <span>{weights.error}</span>
            <button onClick={weights.reload} className="underline">
              重试
            </button>
          </div>
        )}

        <section className="bg-white rounded-2xl p-3 shadow-sm">
          <h2 className="text-sm text-gray-600 px-2 pt-1 mb-1">
            近 90 天趋势
          </h2>
          <WeightChart points={points} />
        </section>
      </div>
    </>
  );
}
