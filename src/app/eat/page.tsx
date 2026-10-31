"use client";

import { useState } from "react";
import AiFoodButton from "@/components/AiFoodButton";
import Calendar from "@/components/Calendar";
import FoodForm from "@/components/FoodForm";
import FoodList from "@/components/FoodList";
import PageHeader from "@/components/PageHeader";
import PersonBadge from "@/components/PersonBadge";
import { foodsUrl, refresh, summaryUrl, todayUrl, useApi } from "@/lib/api-cache";
import { toDateStr } from "@/lib/date";
import { usePersons } from "@/lib/person-context";
import type { FoodEntry } from "@/lib/types";

export default function EatPage() {
  const { current } = usePersons();
  const [date, setDate] = useState(() => toDateStr(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [prefill, setPrefill] = useState<{
    name: string;
    calories: number;
    note?: string;
    photo?: string;
    hint?: string;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  } | null>(null);

  const personId = current?.id;
  const today = toDateStr(new Date());

  const foods = useApi<FoodEntry[]>(
    personId ? foodsUrl(personId, date) : null,
    personId
  );
  const summary = useApi<{ date: string; total: number }[]>(
    personId ? summaryUrl(personId, today) : null,
    personId
  );
  const entries = foods.data ?? [];
  const dayTotals = Object.fromEntries(
    (summary.data ?? []).map((r) => [r.date, r.total])
  );

  async function remove(id: number) {
    const res = await fetch(`/api/foods/${id}`, { method: "DELETE" });
    if (res.ok) {
      foods.mutate(entries.filter((e) => e.id !== id));
      summary.reload();
    }
  }

  const total = entries.reduce((s, e) => s + e.calories, 0);
  const target = current?.dailyCalorieTarget ?? 2000;
  const pct = Math.min(100, Math.round((total / target) * 100));
  const hasNutrition = entries.some(
    (e) => e.proteinG != null || e.carbsG != null || e.fatG != null
  );
  const sumP = entries.reduce((s, e) => s + (e.proteinG ?? 0), 0);
  const sumC = entries.reduce((s, e) => s + (e.carbsG ?? 0), 0);
  const sumF = entries.reduce((s, e) => s + (e.fatG ?? 0), 0);

  return (
    <>
      <PageHeader title="吃" right={<PersonBadge />} />

      <Calendar
        selectedDate={date}
        onSelect={setDate}
        cellInfo={(d) => {
          const t = dayTotals[d];
          if (t === undefined) return {};
          return { sub: String(t), tone: t > target ? "orange" : "green" };
        }}
      />

      <div className="px-4 mb-2 mt-1">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-gray-600">已摄入</span>
            <span className="text-2xl font-bold tabular-nums">
              {total}
              <span className="text-sm text-gray-500 font-normal"> / {target} kcal</span>
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${pct > 100 ? "bg-orange-400" : "bg-green-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {hasNutrition && (
            <p className="text-xs text-gray-500 mt-2 tabular-nums">
              蛋白{sumP}g · 碳水{sumC}g · 脂肪{sumF}g
            </p>
          )}
        </div>
      </div>

      {foods.error && (
        <div className="mx-4 mb-3 p-3 rounded-xl bg-red-50 text-red-600 text-sm flex justify-between items-center">
          <span>{foods.error}</span>
          <button onClick={foods.reload} className="underline">
            重试
          </button>
        </div>
      )}

      <div className="px-4 mb-4">
        <AiFoodButton
          onResult={(food, image, hint) => {
            setEditing(null);
            setPrefill({ ...food, photo: image, hint });
            setFormOpen(true);
          }}
        />
      </div>

      {foods.loading && !entries.length && (
        <p className="text-center text-gray-500 py-10 text-sm">加载中…</p>
      )}

      <FoodList
        entries={entries}
        onEdit={(e) => {
          setEditing(e);
          setFormOpen(true);
        }}
        onDelete={remove}
      />

      <button
        onClick={() => {
          setEditing(null);
          setPrefill(null);
          setFormOpen(true);
        }}
        className="fixed bottom-24 right-1/2 translate-x-[130px] w-14 h-14 rounded-full bg-green-600 text-white text-3xl shadow-lg active:bg-green-700 leading-none pb-1"
        aria-label="添加食物"
      >
        ＋
      </button>

      {formOpen && personId && (
        <FoodForm
          personId={personId}
          date={date}
          editing={editing}
          prefill={prefill}
          powderConfig={
            current?.proteinServingG != null
              ? {
                  servingG: current.proteinServingG,
                  kcalPer100G: current.proteinKcalPer100G ?? 400,
                  proteinPer100G: current.proteinProteinPer100G ?? 80,
                }
              : null
          }
          onClose={() => {
            setFormOpen(false);
            setPrefill(null);
          }}
          onSaved={() => {
            foods.reload();
            summary.reload();
            if (personId) refresh(todayUrl(personId, today));
          }}
        />
      )}
    </>
  );
}
