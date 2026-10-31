"use client";

import { useState } from "react";
import { MEALS, MEAL_LABELS, guessMealType, type MealType } from "@/lib/meals";
import { calcPowderNutrition, powderEntryName } from "@/lib/protein";
import type { FoodEntry } from "@/lib/types";

/** 蛋白粉快捷预设所需的个人配置 */
export type PowderConfig = {
  servingG: number;
  kcalPer100G: number;
  proteinPer100G: number;
};

type Prefill = {
  name: string;
  calories: number;
  note?: string;
  photo?: string;
  hint?: string;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
};

/** 营养素输入框非空时的校验：0–500 整数，合法返回数值否则 null */
function parseGramInput(s: string): number | null | undefined {
  if (!s.trim()) return undefined; // 留空
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0 || n > 500) return null; // 非法
  return n;
}

export default function FoodForm({
  personId,
  date,
  editing,
  prefill,
  powderConfig,
  onClose,
  onSaved,
}: {
  personId: number;
  date: string;
  editing?: FoodEntry | null;
  prefill?: Prefill | null;
  powderConfig?: PowderConfig | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const photo = prefill?.photo ?? null;
  const [mealType, setMealType] = useState<MealType>(
    (editing?.mealType as MealType) ?? guessMealType()
  );
  const [name, setName] = useState(editing?.name ?? prefill?.name ?? "");
  const [calories, setCalories] = useState<string>(
    editing ? String(editing.calories) : prefill ? String(prefill.calories) : ""
  );
  const initGram = (v?: number | null) => (v == null ? "" : String(v));
  const [protein, setProtein] = useState(
    initGram(editing?.proteinG ?? prefill?.protein)
  );
  const [carbs, setCarbs] = useState(initGram(editing?.carbsG ?? prefill?.carbs));
  const [fat, setFat] = useState(initGram(editing?.fatG ?? prefill?.fat));
  const [note, setNote] = useState(prefill?.note ?? "");
  const [hint, setHint] = useState(prefill?.hint ?? "");
  const [reBusy, setReBusy] = useState(false);
  const [reError, setReError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 快捷填入一份蛋白粉（按个人配置换算） */
  function applyPowderPreset() {
    const cfg = powderConfig ?? {
      servingG: 30,
      kcalPer100G: 400,
      proteinPer100G: 80,
    };
    const n = calcPowderNutrition(cfg.servingG, cfg);
    setMealType("protein");
    setName(powderEntryName(cfg.servingG));
    setCalories(String(n.calories));
    setProtein(String(n.proteinG));
  }

  /** 用当前补充说明对同一张照片重新识别，成功后覆盖全部识别字段 */
  async function reAnalyze() {
    if (!photo) return;
    setReBusy(true);
    setReError(null);
    try {
      const trimmed = hint.trim();
      const res = await fetch("/api/food/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: photo,
          ...(trimmed ? { hint: trimmed } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "识别失败");
      setName(data.name);
      setCalories(String(data.calories));
      setProtein(typeof data.protein === "number" ? String(data.protein) : "");
      setCarbs(typeof data.carbs === "number" ? String(data.carbs) : "");
      setFat(typeof data.fat === "number" ? String(data.fat) : "");
      setNote(typeof data.note === "string" ? data.note : "");
    } catch (e) {
      setReError(e instanceof Error ? e.message : "重新识别失败");
    } finally {
      setReBusy(false);
    }
  }

  async function submit() {
    const cal = Number(calories);
    if (!name.trim()) return setError("请填写食物名称");
    if (!Number.isInteger(cal) || cal < 0 || cal > 20000)
      return setError("热量需为 0–20000 的整数");
    const p = parseGramInput(protein);
    if (p === null) return setError("蛋白质需为 0–500 的整数");
    const c = parseGramInput(carbs);
    if (c === null) return setError("碳水需为 0–500 的整数");
    const f = parseGramInput(fat);
    if (f === null) return setError("脂肪需为 0–500 的整数");
    setSaving(true);
    setError(null);
    try {
      const nutrition = {
        ...(p !== undefined ? { proteinG: p } : {}),
        ...(c !== undefined ? { carbsG: c } : {}),
        ...(f !== undefined ? { fatG: f } : {}),
      };
      const res = editing
        ? await fetch(`/api/foods/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              calories: cal,
              mealType,
              proteinG: p ?? null,
              carbsG: c ?? null,
              fatG: f ?? null,
            }),
          })
        : await fetch("/api/foods", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              personId,
              date,
              mealType,
              name: name.trim(),
              calories: cal,
              source: prefill ? "ai" : "manual",
              ...nutrition,
              ...(prefill && photo ? { photo } : {}),
              ...(prefill && note ? { aiNote: note } : {}),
            }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `保存失败(${res.status})`);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl p-4 pb-8 max-w-md mx-auto">
        <h2 className="text-lg font-semibold mb-4 text-center">
          {editing ? "编辑记录" : prefill ? "确认识别结果" : "添加食物"}
        </h2>

        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt="食物照片"
            className="w-24 h-24 object-cover rounded-xl mx-auto mb-1"
          />
        )}
        {note && (
          <p className="text-xs text-gray-500 text-center mb-3">{note}</p>
        )}

        {!editing && photo && (
          <div className="mb-3">
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              maxLength={200}
              rows={2}
              disabled={reBusy}
              placeholder="补充说明（可选）：份量、配料、做法等，如：大份麻辣烫，加了牛肉丸和宽粉"
              className="w-full px-4 py-3 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500 text-sm resize-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between mt-2 gap-2">
              <span className="text-[10px] text-gray-400">
                {hint.length}/200 · 补充后可重新识别
              </span>
              <button
                onClick={reAnalyze}
                disabled={reBusy || saving}
                className="shrink-0 px-4 py-2 rounded-full border border-green-300 text-green-700 text-xs font-medium active:bg-green-50 disabled:opacity-50 flex items-center gap-1.5"
              >
                {reBusy && (
                  <span className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                )}
                {reBusy ? "识别中…" : "🔄 重新识别"}
              </button>
            </div>
            {reError && (
              <p className="text-red-500 text-sm mt-2">{reError}</p>
            )}
          </div>
        )}

        {!editing && !prefill && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-500">快捷添加</span>
            <button
              onClick={applyPowderPreset}
              className="px-3 py-1.5 rounded-full border border-green-200 bg-green-50 text-green-700 text-xs active:bg-green-100"
            >
              💊 蛋白粉
            </button>
          </div>
        )}

        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {MEALS.map((m) => (
            <button
              key={m}
              onClick={() => setMealType(m)}
              className={`py-2 rounded-xl text-xs sm:text-sm border ${
                mealType === m
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white border-gray-300 text-gray-700"
              }`}
            >
              {MEAL_LABELS[m]}
            </button>
          ))}
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="食物名称，如：鸡胸肉"
          className="w-full px-4 py-3 rounded-xl bg-gray-100 mb-3 outline-none focus:ring-2 ring-green-500"
        />
        <div className="flex items-center gap-2 mb-3">
          <input
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            inputMode="numeric"
            placeholder="热量"
            className="flex-1 px-4 py-3 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500"
          />
          <span className="text-gray-500">kcal</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-1">
          {(
            [
              ["蛋白", protein, setProtein],
              ["碳水", carbs, setCarbs],
              ["脂肪", fat, setFat],
            ] as const
          ).map(([label, value, setter]) => (
            <label key={label} className="relative">
              <input
                value={value}
                onChange={(e) => setter(e.target.value)}
                inputMode="numeric"
                placeholder="—"
                aria-label={`${label}克数`}
                className="w-full px-3 py-2 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500 text-sm text-center"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
                {label}g
              </span>
            </label>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mb-3 px-1">营养素可选填（整数克）</p>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          disabled={saving || reBusy}
          onClick={submit}
          className="w-full py-3.5 rounded-2xl bg-green-600 text-white font-medium active:bg-green-700 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}
