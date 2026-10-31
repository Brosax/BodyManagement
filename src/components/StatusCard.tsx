"use client";

import { Link } from "next-view-transitions";
import { prefetchTabData } from "@/lib/api-cache";
import { toDateStr } from "@/lib/date";
import { GOAL_LABELS, type Goal, type HealthStats } from "@/lib/body";
import { formatDecimal } from "@/lib/format";
import { usePersons } from "@/lib/person-context";
import { setVtDirection } from "@/lib/vt";

type Macros = { proteinG: number; carbsG: number; fatG: number };

export default function StatusCard({
  name,
  calorieSum,
  todayMacros,
  latestWeight,
  goal,
  health,
}: {
  name: string;
  calorieSum: number;
  todayMacros: Macros;
  latestWeight: number | null;
  goal: Goal | null;
  health: HealthStats | null;
}) {
  const { current } = usePersons();

  function goMe() {
    setVtDirection("/me");
    if (current) prefetchTabData("/me", current.id, toDateStr(new Date()));
  }
  if (!health) {
    return (
      <Link href="/me" onClick={goMe} className="block bg-white rounded-2xl p-4 shadow-sm active:bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">📊 状态栏待解锁</p>
            <p className="text-xs text-gray-500 mt-1">
              填写身高、年龄、性别、活动量与目标，生成你的健康指数和每日营养建议
            </p>
          </div>
          <span className="text-sm text-green-600 font-medium shrink-0 ml-2">
            去完善 ›
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      {/* 头部：名字 + 目标徽章 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">📊 {name}的状态栏</span>
          <span className="px-1.5 py-0.5 rounded-md bg-green-100 text-green-700 text-[11px] font-medium">
            {goal ? GOAL_LABELS[goal] : ""}
          </span>
        </div>
        <Link href="/me" onClick={goMe} className="text-xs text-gray-400">
          编辑 ›
        </Link>
      </div>

      {/* 数值徽章 */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatBadge
          label={`BMI · ${health.bmiLabel}`}
          value={formatDecimal(health.bmi)}
          tone={
            health.bmiLabel === "正常"
              ? "good"
              : health.bmiLabel === "偏瘦"
                ? "warn"
                : "bad"
          }
        />
        <StatBadge label="代谢 TDEE" value={String(health.tdee)} unit="kcal" tone="plain" />
        <StatBadge
          label="最新体重"
          value={latestWeight != null ? formatDecimal(latestWeight) : "--"}
          unit="kg"
          tone="plain"
        />
      </div>

      {/* 今日实际 vs 建议 */}
      <p className="text-[11px] text-gray-400 mb-2">今日摄入 / 每日建议</p>
      <div className="space-y-2.5">
        <MacroBar
          label="🔥 热量"
          current={calorieSum}
          target={health.macroTargets.calories}
          unit="kcal"
        />
        <MacroBar
          label="🥩 蛋白"
          current={todayMacros.proteinG}
          target={health.macroTargets.proteinG}
          unit="g"
        />
        <MacroBar
          label="🍚 碳水"
          current={todayMacros.carbsG}
          target={health.macroTargets.carbsG}
          unit="g"
        />
        <MacroBar
          label="🧈 脂肪"
          current={todayMacros.fatG}
          target={health.macroTargets.fatG}
          unit="g"
        />
      </div>
    </div>
  );
}

function StatBadge({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: "good" | "warn" | "bad" | "plain";
}) {
  const tones = {
    good: "bg-green-50 text-green-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-orange-50 text-orange-600",
    plain: "bg-gray-50 text-gray-700",
  };
  return (
    <div className={`rounded-xl px-2 py-1.5 text-center ${tones[tone]}`}>
      <p className="text-lg font-bold tabular-nums leading-tight">
        {value}
        {unit && <span className="text-[10px] font-normal ml-0.5">{unit}</span>}
      </p>
      <p className="text-[10px] opacity-80 truncate">{label}</p>
    </div>
  );
}

function MacroBar({
  label,
  current,
  target,
  unit,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const over = target > 0 && current > target;
  return (
    <div>
      <div className="flex justify-between items-baseline text-xs mb-1">
        <span>{label}</span>
        <span className="tabular-nums text-gray-600">
          <span className={over ? "text-orange-500 font-medium" : ""}>
            {current}
          </span>
          <span className="text-gray-400"> / {target}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${over ? "bg-orange-400" : "bg-green-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
