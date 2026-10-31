"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  computeHealthStats,
  type ActivityLevel,
  type Goal,
  type Sex,
} from "@/lib/body";
import { usePersons } from "@/lib/person-context";
import { enableNotifications } from "@/lib/push-client";
import { formatDecimal } from "@/lib/format";

function SegmentOption({
  active,
  onClick,
  label,
  compact = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl border text-sm font-medium ${
        compact ? "py-2 px-1 text-xs" : "py-2.5"
      } ${
        active
          ? "bg-green-600 text-white border-green-600"
          : "bg-white border-gray-200 text-gray-600"
      }`}
    >
      {label}
    </button>
  );
}

export default function MePage() {
  const { current, persons, select, refresh } = usePersons();
  const [target, setTarget] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [reminderTime, setReminderTime] = useState("");
  const [savingReminder, setSavingReminder] = useState(false);
  const [powderServing, setPowderServing] = useState("");
  const [powderKcal, setPowderKcal] = useState("");
  const [powderProtein, setPowderProtein] = useState("");
  const [savingPowder, setSavingPowder] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // 身体信息
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [savingBody, setSavingBody] = useState(false);
  const [latestWeightKg, setLatestWeightKg] = useState<number | null>(null);

  const currentId = current?.id;
  const currentTarget = current?.dailyCalorieTarget;

  useEffect(() => {
    if (currentTarget != null) setTarget(String(currentTarget));
  }, [currentId, currentTarget]);

  useEffect(() => {
    setName(current?.name ?? "");
  }, [currentId, current?.name]);

  useEffect(() => {
    setReminderTime(current?.reminderTime ?? "");
  }, [currentId, current?.reminderTime]);

  useEffect(() => {
    setPowderServing(
      current?.proteinServingG != null ? String(current.proteinServingG) : ""
    );
    setPowderKcal(
      current?.proteinKcalPer100G != null ? String(current.proteinKcalPer100G) : ""
    );
    setPowderProtein(
      current?.proteinProteinPer100G != null
        ? String(current.proteinProteinPer100G)
        : ""
    );
  }, [currentId, current?.proteinServingG, current?.proteinKcalPer100G, current?.proteinProteinPer100G]);

  useEffect(() => {
    setHeight(current?.heightCm != null ? String(current.heightCm) : "");
    setAge(current?.age != null ? String(current.age) : "");
    setSex(current?.sex ?? null);
    setActivity(current?.activityLevel ?? null);
    setGoal(current?.goal ?? null);
  }, [currentId, current?.heightCm, current?.age, current?.sex, current?.activityLevel, current?.goal]);

  const loadLatestWeight = useCallback(async () => {
    if (!currentId) return;
    try {
      const res = await fetch(`/api/weights?personId=${currentId}&days=7`);
      if (res.ok) {
        const rows: { weightKg: number }[] = await res.json();
        setLatestWeightKg(rows.length ? rows[rows.length - 1].weightKg : null);
      }
    } catch {
      // 静默失败，仅影响建议热量展示
    }
  }, [currentId]);

  useEffect(() => {
    loadLatestWeight();
  }, [loadLatestWeight]);

  /** 表单字段齐全且已知最新体重时，实时算出建议 */
  const suggestion =
    height && age && sex && activity && goal
      ? computeHealthStats(
          {
            heightCm: Number(height),
            age: Number(age),
            sex,
            activityLevel: activity,
            goal,
          },
          latestWeightKg
        )
      : null;

  if (!current) return <PageHeader title="我" />;

  async function saveReminderTime() {
    if (!current) return;
    setSavingReminder(true);
    try {
      const res = await fetch(`/api/persons/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminderTime: reminderTime || null }),
      });
      if (!res.ok) {
        setMsg("保存失败，请重试");
        setTimeout(() => setMsg(null), 3000);
        return;
      }
      await refresh();
      setMsg(
        reminderTime
          ? "提醒时间已保存，生效需等待重新部署（告诉开发者一声即可）"
          : "已清除提醒时间，生效需等待重新部署"
      );
      setTimeout(() => setMsg(null), 5000);
    } finally {
      setSavingReminder(false);
    }
  }

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 10) {
      setMsg("名字需为 1–10 个字符");
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch(`/api/persons/${current!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        setMsg("保存失败，请重试");
        setTimeout(() => setMsg(null), 3000);
        return;
      }
      await refresh();
      setMsg("名字已更新 ✓");
      setTimeout(() => setMsg(null), 2000);
    } finally {
      setSavingName(false);
    }
  }

  async function saveTarget() {
    const n = Number(target);
    if (!Number.isInteger(n) || n < 500 || n > 10000) {
      setMsg("目标需为 500–10000 的整数");
      setTimeout(() => setMsg(null), 3000);
      return;
    }
    setSavingTarget(true);
    try {
      await fetch(`/api/persons/${current!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyCalorieTarget: n }),
      });
      await refresh();
      setMsg("已保存 ✓");
      setTimeout(() => setMsg(null), 2000);
    } finally {
      setSavingTarget(false);
    }
  }

  async function savePowder() {
    if (!current) return;
    const g = Number(powderServing);
    const kcal = Number(powderKcal);
    const p = Number(powderProtein);
    if (!Number.isInteger(g) || g < 5 || g > 500)
      return showPowderError("每次克数需为 5–500 的整数");
    if (!Number.isInteger(kcal) || kcal < 100 || kcal > 1000)
      return showPowderError("每100g热量需为 100–1000 的整数");
    if (!Number.isInteger(p) || p < 20 || p > 100)
      return showPowderError("每100g蛋白质需为 20–100 的整数");
    setSavingPowder(true);
    try {
      await fetch(`/api/persons/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proteinServingG: g,
          proteinKcalPer100G: kcal,
          proteinProteinPer100G: p,
        }),
      });
      await refresh();
      setMsg("蛋白粉设置已保存 ✓");
      setTimeout(() => setMsg(null), 2000);
    } finally {
      setSavingPowder(false);
    }
  }

  function showPowderError(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 3000);
  }

  async function saveBody() {
    if (!current) return;
    const h = Number(height);
    const a = Number(age);
    if (!Number.isFinite(h) || h < 50 || h > 250)
      return showBodyError("身高需为 50–250 cm");
    if (!Number.isInteger(a) || a < 5 || a > 120)
      return showBodyError("年龄需为 5–120 的整数");
    if (!sex) return showBodyError("请选择性别");
    if (!activity) return showBodyError("请选择日常活动量");
    if (!goal) return showBodyError("请选择目标");
    setSavingBody(true);
    try {
      const res = await fetch(`/api/persons/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm: h,
          age: a,
          sex,
          activityLevel: activity,
          goal,
        }),
      });
      if (!res.ok) {
        showBodyError("保存失败，请重试");
        return;
      }
      await refresh();
      showBodyOk("身体信息已保存 ✓");
    } finally {
      setSavingBody(false);
    }
  }

  /** 用当前表单算出的建议热量覆盖手动卡路里目标 */
  async function adoptSuggestion() {
    if (!current || !suggestion) return;
    setSavingBody(true);
    try {
      const res = await fetch(`/api/persons/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyCalorieTarget: suggestion.targetCalories,
        }),
      });
      if (!res.ok) {
        showBodyError("保存失败，请重试");
        return;
      }
      await refresh();
      showBodyOk(`已采用建议热量 ${suggestion.targetCalories} kcal ✓`);
    } finally {
      setSavingBody(false);
    }
  }

  function showBodyError(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 3000);
  }

  function showBodyOk(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 2000);
  }

  async function toggleNotify() {
    if (!current) return;
    if (current.notifyEnabled) {
      await fetch(`/api/persons/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifyEnabled: false }),
      });
      await refresh();
      return;
    }
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key) {
      alert("推送未配置（缺少 VAPID 公钥）");
      return;
    }
    const err = await enableNotifications(current.id, key);
    if (err) {
      alert(err);
      return;
    }
    await fetch(`/api/persons/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifyEnabled: true }),
    });
    await refresh();
  }

  return (
    <>
      <PageHeader title="我" />

      <div className="px-4 pt-4 space-y-4">
        {/* 身份切换 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm text-gray-600 mb-3">当前身份</h2>
          <div className="flex gap-2">
            {persons.map((p) => (
              <button
                key={p.id}
                onClick={() => select(p.id)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${
                  p.id === current.id
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                {p.name}
                {p.id === current.id && "（我）"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={10}
              placeholder="修改名字"
              aria-label="修改名字"
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500 text-sm"
            />
            <button
              onClick={saveName}
              disabled={savingName || !name.trim() || name.trim() === current.name}
              className="px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium active:bg-green-700 disabled:opacity-50"
            >
              {savingName ? "…" : "改名"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 px-1">
            改的是当前身份「{current.name}」的名字，最多 10 个字
          </p>
        </section>

        {/* 每日卡路里目标 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm text-gray-600 mb-3">每日卡路里目标 (kcal)</h2>
          <div className="flex items-center gap-2">
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              inputMode="numeric"
              className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500"
            />
            <button
              onClick={saveTarget}
              disabled={savingTarget}
              className="px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium active:bg-green-700 disabled:opacity-50"
            >
              保存
            </button>
          </div>
        </section>

        {/* 蛋白粉提醒 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-medium">💊 蛋白粉提醒</h2>
              <p className="text-xs text-gray-500 mt-1">
                马德里时间 · 只提醒当天还没打卡的人
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                iOS 需先将本页添加到主屏幕
              </p>
            </div>
            <button
              onClick={toggleNotify}
              className={`w-14 h-8 rounded-full relative transition-colors ${
                current.notifyEnabled ? "bg-green-600" : "bg-gray-300"
              }`}
              aria-label="通知开关"
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${
                  current.notifyEnabled ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
            <label className="text-sm text-gray-600 shrink-0">提醒时间</label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              disabled={!current.notifyEnabled}
              aria-label="蛋白粉提醒时间（马德里时间）"
              className="px-3 py-2 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500 text-sm tabular-nums disabled:opacity-50"
            />
            <button
              onClick={saveReminderTime}
              disabled={savingReminder || !reminderTime}
              className="ml-auto px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium active:bg-green-700 disabled:opacity-50"
            >
              {savingReminder ? "…" : "保存"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5 px-1">
            {current.reminderTime
              ? `当前设定：马德里时间 ${current.reminderTime}`
              : "尚未设置提醒时间"}
          </p>
        </section>

        {/* 蛋白粉营养设置 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-medium mb-1">🥤 蛋白粉用量与营养</h2>
          <p className="text-xs text-gray-500 mb-3">
            按你喝的牌子填写包装上的营养成分（每100g），打卡时按份量自动算进「吃」页
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <label className="text-center">
              <span className="block text-[11px] text-gray-500 mb-1">每次克数</span>
              <input
                value={powderServing}
                onChange={(e) => setPowderServing(e.target.value)}
                inputMode="numeric"
                aria-label="每次蛋白粉克数"
                className="w-full px-2 py-2 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500 text-sm text-center tabular-nums"
              />
            </label>
            <label className="text-center">
              <span className="block text-[11px] text-gray-500 mb-1">热量/100g</span>
              <input
                value={powderKcal}
                onChange={(e) => setPowderKcal(e.target.value)}
                inputMode="numeric"
                aria-label="蛋白粉每100g热量"
                className="w-full px-2 py-2 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500 text-sm text-center tabular-nums"
              />
            </label>
            <label className="text-center">
              <span className="block text-[11px] text-gray-500 mb-1">蛋白g/100g</span>
              <input
                value={powderProtein}
                onChange={(e) => setPowderProtein(e.target.value)}
                inputMode="numeric"
                aria-label="蛋白粉每100g蛋白质"
                className="w-full px-2 py-2 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500 text-sm text-center tabular-nums"
              />
            </label>
          </div>
          {Number(powderServing) > 0 && Number(powderKcal) > 0 && (
            <p className="text-[11px] text-gray-400 mb-3 px-1 tabular-nums">
              默认每次 ≈{Math.round((Number(powderServing) / 100) * Number(powderKcal))} kcal ·
              蛋白{Math.round((Number(powderServing) / 100) * Number(powderProtein))}g
            </p>
          )}
          <button
            onClick={savePowder}
            disabled={
              savingPowder ||
              !powderServing.trim() ||
              !powderKcal.trim() ||
              !powderProtein.trim()
            }
            className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium active:bg-green-700 disabled:opacity-50"
          >
            {savingPowder ? "保存中…" : "保存蛋白粉设置"}
          </button>
        </section>

        {/* 身体信息 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-medium mb-1">📏 身体信息</h2>
          <p className="text-xs text-gray-500 mb-3">
            用于计算 BMI、代谢与每日营养建议；体重取「体重」页最近一次记录
          </p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <label>
              <span className="block text-[11px] text-gray-500 mb-1">身高 (cm)</span>
              <input
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                inputMode="decimal"
                aria-label="身高 cm"
                placeholder="如 175"
                className="w-full px-3 py-2 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500 text-sm tabular-nums"
              />
            </label>
            <label>
              <span className="block text-[11px] text-gray-500 mb-1">年龄</span>
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                inputMode="numeric"
                aria-label="年龄"
                placeholder="如 28"
                className="w-full px-3 py-2 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500 text-sm tabular-nums"
              />
            </label>
          </div>

          <p className="text-[11px] text-gray-500 mb-1">性别</p>
          <div className="flex gap-2 mb-3">
            {(["male", "female"] as const).map((s) => (
              <SegmentOption
                key={s}
                active={sex === s}
                onClick={() => setSex(s)}
                label={s === "male" ? "男" : "女"}
              />
            ))}
          </div>

          <p className="text-[11px] text-gray-500 mb-1">日常活动量</p>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((lv) => (
              <SegmentOption
                key={lv}
                active={activity === lv}
                onClick={() => setActivity(lv)}
                label={ACTIVITY_LABELS[lv]}
                compact
              />
            ))}
          </div>

          <p className="text-[11px] text-gray-500 mb-1">目标</p>
          <div className="flex gap-2 mb-3">
            {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
              <SegmentOption
                key={g}
                active={goal === g}
                onClick={() => setGoal(g)}
                label={GOAL_LABELS[g]}
              />
            ))}
          </div>

          {latestWeightKg == null && (
            <p className="text-[11px] text-amber-600 mb-3 px-1">
              还没有体重记录，去「体重」页称一次后即可生成建议
            </p>
          )}

          {suggestion && (
            <div className="rounded-xl bg-green-50 px-3 py-2.5 mb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-green-800 leading-relaxed">
                  BMI <span className="font-bold tabular-nums">{formatDecimal(suggestion.bmi)}</span>（
                  {suggestion.bmiLabel}）· 代谢{" "}
                  <span className="tabular-nums">{suggestion.tdee}</span> kcal
                  <br />
                  建议摄入{" "}
                  <span className="font-bold tabular-nums">
                    {suggestion.targetCalories}
                  </span>{" "}
                  kcal · 蛋白{" "}
                  <span className="tabular-nums">
                    {suggestion.macroTargets.proteinG}g
                  </span>{" "}
                  · 碳水{" "}
                  <span className="tabular-nums">
                    {suggestion.macroTargets.carbsG}g
                  </span>{" "}
                  · 脂肪{" "}
                  <span className="tabular-nums">
                    {suggestion.macroTargets.fatG}g
                  </span>
                </p>
                {current.dailyCalorieTarget !== suggestion.targetCalories && (
                  <button
                    onClick={adoptSuggestion}
                    disabled={savingBody}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-green-600 text-green-700 text-xs font-medium active:bg-green-50 disabled:opacity-50"
                  >
                    采用为目标
                  </button>
                )}
              </div>
            </div>
          )}

          <button
            onClick={saveBody}
            disabled={savingBody}
            className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium active:bg-green-700 disabled:opacity-50"
          >
            {savingBody ? "保存中…" : "保存身体信息"}
          </button>
        </section>

        {msg && (
          <p className="text-center text-sm text-green-600">{msg}</p>
        )}
      </div>
    </>
  );
}
