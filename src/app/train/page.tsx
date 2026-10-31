"use client";

import { useState } from "react";
import Calendar from "@/components/Calendar";
import PersonBadge from "@/components/PersonBadge";
import PageHeader from "@/components/PageHeader";
import SplitPlanEditor, { type PlanRow } from "@/components/SplitPlanEditor";
import TrainDayDetail from "@/components/TrainDayDetail";
import TrainHistory from "@/components/TrainHistory";
import { logsUrl, plansUrl, refresh, todayUrl, useApi } from "@/lib/api-cache";
import { toDateStr } from "@/lib/date";
import { nextSplitPosition, SPLIT_COUNT } from "@/lib/split";
import { usePersons } from "@/lib/person-context";
import type { TrainingLog } from "@/lib/types";

function firstLine(content: string): string {
  const first = content.split("\n")[0].trim();
  return first ? first.slice(0, 4) : "";
}

export default function TrainPage() {
  const { current } = usePersons();
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));

  const personId = current?.id;

  const plansApi = useApi<PlanRow[]>(plansUrl());
  const logsApi = useApi<TrainingLog[]>(
    personId ? logsUrl(personId) : null,
    personId
  );
  const plans = plansApi.data ?? [];
  const logs = logsApi.data ?? [];

  function reloadAll() {
    logsApi.reload();
    if (personId) refresh(todayUrl(personId, toDateStr(new Date())));
  }

  if (!current) return <PageHeader title="练" right={<PersonBadge />} />;

  const todayStr = toDateStr(new Date());
  const loggedDates = new Set(logs.map((l) => l.date));
  /** 位次 → 模板内容（1-based 数组） */
  const slotContent = Array.from({ length: SPLIT_COUNT }, (_, i) =>
    plans.find((p) => p.weekday === i + 1)?.content ?? ""
  );
  const nextPosition = nextSplitPosition(logs);

  /** 某天的计划打卡（同日多条取 id 大者） */
  function splitLogOf(date: string): TrainingLog | null {
    let found: TrainingLog | null = null;
    for (const l of logs) {
      if (l.date === date && l.planWeekday != null) {
        if (!found || l.id > found.id) found = l;
      }
    }
    return found;
  }

  async function removeLog(id: number) {
    const res = await fetch(`/api/training-logs?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      logsApi.mutate(logs.filter((x) => x.id !== id));
      if (personId) refresh(todayUrl(personId, todayStr));
    }
  }

  return (
    <>
      <PageHeader title="练" right={<PersonBadge />} />

      {plansApi.error && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 text-red-600 text-sm flex justify-between items-center">
          <span>{plansApi.error}</span>
          <button onClick={plansApi.reload} className="underline">
            重试
          </button>
        </div>
      )}

      <Calendar
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        cellInfo={(date) => {
          const logged = loggedDates.has(date);
          const sl = splitLogOf(date);
          if (sl) {
            return {
              sub: firstLine(slotContent[sl.planWeekday! - 1]) || `第${sl.planWeekday}练`,
              tone: "green" as const,
              dot: true,
            };
          }
          // 今天还没打卡时预告下一个该练的部位
          if (date === todayStr && !logged) {
            return { sub: `${firstLine(slotContent[nextPosition - 1])}·下次`, tone: "green" };
          }
          return { dot: logged };
        }}
      />

      <p className="mx-4 mt-3 text-xs text-gray-500">
        下一个该练：第{nextPosition}练 ·{" "}
        {(slotContent[nextPosition - 1].split("\n")[0] || "未设置").slice(0, 12)}
      </p>

      <TrainDayDetail
        key={selectedDate}
        personId={current.id}
        date={selectedDate}
        slots={slotContent}
        nextPosition={nextPosition}
        splitLogOfDate={splitLogOf(selectedDate)}
        hasAnyLog={loggedDates.has(selectedDate)}
        onChanged={reloadAll}
      />

      <SplitPlanEditor
        plans={plans}
        nextPosition={nextPosition}
        onSaved={plansApi.reload}
      />

      <TrainHistory logs={logs} onDelete={removeLog} />
    </>
  );
}
