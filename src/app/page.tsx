"use client";

import { Link } from "next-view-transitions";
import PageHeader from "@/components/PageHeader";
import PersonBadge from "@/components/PersonBadge";
import ProteinCard from "@/components/ProteinCard";
import StatusCard from "@/components/StatusCard";
import { prefetchTabData, todayUrl, useApi } from "@/lib/api-cache";
import type { BodyProfile, HealthStats } from "@/lib/body";
import { formatDateCN, toDateStr } from "@/lib/date";
import { formatDecimal } from "@/lib/format";
import { usePersons } from "@/lib/person-context";
import { setVtDirection } from "@/lib/vt";

type TodayData = {
  calorieSum: number;
  calorieTarget: number;
  proteinChecked: boolean;
  planContent: string;
  planPosition: number;
  planTotal: number;
  lastWeightDate: string | null;
  latestWeight: number | null;
  todayMacros: { proteinG: number; carbsG: number; fatG: number };
  profile: BodyProfile;
  health: HealthStats | null;
};

function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.UTC(
    Number(fromISO.slice(0, 4)),
    Number(fromISO.slice(5, 7)) - 1,
    Number(fromISO.slice(8, 10))
  );
  const b = Date.UTC(
    Number(toISO.slice(0, 4)),
    Number(toISO.slice(5, 7)) - 1,
    Number(toISO.slice(8, 10))
  );
  return Math.round((b - a) / 86400000);
}

export default function TodayPage() {
  const { current } = usePersons();

  const personId = current?.id;
  const today = toDateStr(new Date());
  const { data, loading, error, reload } = useApi<TodayData>(
    personId ? todayUrl(personId, today) : null,
    personId
  );

  function onCardClick(href: string) {
    setVtDirection(href);
    if (personId) prefetchTabData(href, personId, today);
  }

  if (!current) return <PageHeader title="今天" right={<PersonBadge />} />;

  const pct = data ? Math.min(100, Math.round((data.calorieSum / data.calorieTarget) * 100)) : 0;
  const weightDaysAgo = data?.lastWeightDate ? daysBetween(data.lastWeightDate, today) : null;

  return (
    <>
      <PageHeader title="今天" right={<PersonBadge />} />

      <p className="px-4 pt-3 text-xs text-gray-600">
        {formatDateCN(today)} · {current.name}的健身日记
      </p>

      {error && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 text-red-600 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={reload} className="underline">
            重试
          </button>
        </div>
      )}

      {loading && !data && !error && (
        <p className="text-center text-gray-600 py-16 text-sm">加载中…</p>
      )}

      {data && (
        <div className="px-4 pt-2 space-y-3">
          {/* 状态栏 */}
          <StatusCard
            name={current.name}
            calorieSum={data.calorieSum}
            todayMacros={data.todayMacros}
            latestWeight={data.latestWeight}
            goal={data.profile.goal}
            health={data.health}
          />

          {/* 卡路里 */}
          <Link href="/eat" onClick={() => onCardClick("/eat")} className="block bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50">
            <div className="flex items-baseline justify-between mb-2">
              <span className="font-medium">🔥 卡路里</span>
              <span className="text-sm text-green-600 font-medium">去记录 ›</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {data.calorieSum}
              <span className="text-sm text-gray-600 font-normal">
                {" "}
                / {data.calorieTarget} kcal
              </span>
            </p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${
                  (data.calorieSum / data.calorieTarget) > 1 ? "bg-orange-400" : "bg-green-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </Link>

          {/* 蛋白粉 */}
          <ProteinCard personId={current.id} date={today} />

          {/* 训练 */}
          <Link href="/train" onClick={() => onCardClick("/train")} className="block bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-medium">
                🏋️ 本次该练
                <span className="ml-1.5 text-xs text-green-600 font-medium">
                  第{data.planPosition}练 / 共{data.planTotal}练
                </span>
              </span>
              <span className="text-sm text-green-600 font-medium">去打卡 ›</span>
            </div>
            {data.planContent.trim() ? (
              <pre className="text-sm whitespace-pre-wrap font-sans line-clamp-3">
                {data.planContent}
              </pre>
            ) : (
              <p className="text-sm text-gray-600">该位次还没设置内容，去「练」页填写四分计划</p>
            )}
          </Link>

          {/* 体重 */}
          <Link href="/weight" onClick={() => onCardClick("/weight")} className="block bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">⚖️ 体重</span>
              <span className="text-sm text-green-600 font-medium">去记录 ›</span>
            </div>
            <p className="text-sm mt-1.5">
              {data.latestWeight != null && weightDaysAgo !== null ? (
                <>
                  <span className="text-lg font-bold">{formatDecimal(data.latestWeight)}</span>{" "}
                  kg
                  <span className="text-gray-600 ml-2">
                    {weightDaysAgo === 0 ? "今天已称" : `距上次 ${weightDaysAgo} 天`}
                  </span>
                </>
              ) : (
                <span className="text-gray-600">还没有记录，去称一下吧</span>
              )}
            </p>
          </Link>
        </div>
      )}
    </>
  );
}
