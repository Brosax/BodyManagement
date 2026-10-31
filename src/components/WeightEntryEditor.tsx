"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EXERCISE_PRESETS,
  MUSCLE_CATEGORIES,
  presetNamesByMuscle,
} from "@/lib/exercises";
import { formatDateCN } from "@/lib/date";
import { formatDecimal, parseDecimalLoose } from "@/lib/format";
import type { ExerciseSetGroup } from "@/lib/types";

type SetRow = { reps: string; weightKg: string };
type Block = { name: string; sets: SetRow[] };
type LastRecord = { date: string; sets: { reps: number; weightKg: number }[] };

function emptySet(): SetRow {
  return { reps: "", weightKg: "" };
}

/** 新组继承上一组已填的次数/重量（逐字段，空则留白） */
function inheritFrom(prev?: SetRow): SetRow {
  if (!prev) return emptySet();
  return {
    reps: prev.reps.trim() ? prev.reps : "",
    weightKg: prev.weightKg.trim() ? prev.weightKg : "",
  };
}

/** 上次记录的各组摘要，如「12×30kg，10×27.5kg」 */
function lastSetsText(rec: LastRecord): string {
  return rec.sets
    .map((s) => `${s.reps}×${formatDecimal(s.weightKg)}kg`)
    .join("，");
}

export default function WeightEntryEditor({
  personId,
  date,
  onClose,
  onSaved,
}: {
  personId: number;
  date: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pickerText, setPickerText] = useState("");
  const [activeCat, setActiveCat] = useState<string>("history");
  const [historyNames, setHistoryNames] = useState<string[]>([]);
  const [lastRecords, setLastRecords] = useState<Record<string, LastRecord | null>>({});
  /** 本次打开编辑器期间，唯一一次自动弹窗的动作名 */
  const [popupName, setPopupName] = useState<string | null>(null);
  const popupUsed = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  /** 打开时载入当日已有记录（可继续编辑）+ 历史动作名 */
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (async () => {
      try {
        const [dayRes, namesRes] = await Promise.all([
          fetch(`/api/exercise-sets?personId=${personId}&date=${date}`),
          fetch(`/api/exercises?personId=${personId}`),
        ]);
        if (dayRes.ok) {
          const groups: ExerciseSetGroup[] = await dayRes.json();
          setBlocks(
            groups.map((g) => ({
              name: g.exerciseName,
              sets: g.sets.map((s) => ({
                reps: String(s.reps),
                weightKg: String(s.weightKg),
              })),
            }))
          );
        }
        if (namesRes.ok) setHistoryNames(await namesRes.json());
      } catch {
        // 载入失败不阻塞新建流程
      }
    })();
  }, [personId, date]);

  const fetchLast = useCallback(
    async (name: string) => {
      if (!name || name in lastRecords) return;
      try {
        const res = await fetch(
          `/api/exercise-sets/last?personId=${personId}&exercise=${encodeURIComponent(name)}`
        );
        const data = res.ok ? ((await res.json()) ?? null) : null;
        setLastRecords((m) => ({ ...m, [name]: data }));
        // 混合提醒：本次打开后首个带历史记录的动作自动弹窗（当天已有记录不提醒）
        if (data && data.date !== date && !popupUsed.current) {
          popupUsed.current = true;
          setPopupName(name);
        }
      } catch {
        // 对比信息失败不影响录入
      }
    },
    [personId, date, lastRecords]
  );

  const suggestions = useMemo(() => {
    const q = pickerText.trim().toLowerCase();
    if (q) {
      // 搜索模式：跨预设 + 历史联想（原行为）
      const all = [...EXERCISE_PRESETS.map((p) => p.name), ...historyNames];
      const seen = new Set<string>();
      return all
        .filter((n) => {
          if (seen.has(n)) return false;
          seen.add(n);
          return n.toLowerCase().includes(q);
        })
        .slice(0, 10);
    }
    // 浏览模式：按分类 tab 过滤
    return activeCat === "history"
      ? historyNames.slice(0, 15)
      : presetNamesByMuscle(activeCat);
  }, [pickerText, activeCat, historyNames]);

  function addBlock(name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 50) return;
    if (blocks.some((b) => b.name === trimmed)) return setError("该动作已在列表中");
    setError(null);
    setPickerText("");
    setBlocks((bs) => [...bs, { name: trimmed, sets: [emptySet()] }]);
    fetchLast(trimmed);
  }

  function updateBlock(idx: number, fn: (b: Block) => Block) {
    setBlocks((bs) => bs.map((b, i) => (i === idx ? fn(b) : b)));
  }

  /** 把某块的动作组替换为上次记录的各组（已有输入时先确认） */
  function applyLast(idx: number) {
    const b = blocks[idx];
    const rec = b ? lastRecords[b.name] : null;
    if (!b || !rec) return;
    const hasInput = b.sets.some((s) => s.reps.trim() || s.weightKg.trim());
    if (
      hasInput &&
      !confirm(`「${b.name}」已填了内容，沿用上次将覆盖这 ${b.sets.length} 组，继续？`)
    )
      return;
    updateBlock(idx, (blk) => ({
      ...blk,
      sets: rec.sets.map((s) => ({
        reps: String(s.reps),
        weightKg: String(s.weightKg),
      })),
    }));
  }

  function applyPopupLast() {
    const idx = blocks.findIndex((b) => b.name === popupName);
    if (idx >= 0) applyLast(idx);
    setPopupName(null);
  }

  async function save() {
    const payload = {
      personId,
      date,
      exercises: blocks.map((b) => ({
        exerciseName: b.name,
        sets: b.sets
          .map((s) => ({
            reps: Number(s.reps),
            weightKg: parseDecimalLoose(s.weightKg),
          }))
          .filter(
            (s): s is { reps: number; weightKg: number } =>
              Number.isInteger(s.reps) &&
              s.reps >= 1 &&
              s.weightKg !== null &&
              s.weightKg >= 0
          ),
      })),
    };
    for (const e of payload.exercises) {
      if (e.sets.length === 0)
        return setError(`「${e.exerciseName}」还有没填完整的组`);
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/exercise-sets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const popupRec = popupName ? lastRecords[popupName] ?? null : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl p-4 pb-8 max-w-md mx-auto max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-3 text-center">记重量</h2>

        {/* 动作选择 */}
        <input
          value={pickerText}
          onChange={(e) => setPickerText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addBlock(pickerText);
          }}
          placeholder="搜索或输入动作名，如：卧推"
          className="w-full px-4 py-2.5 rounded-xl bg-gray-100 text-sm outline-none focus:ring-2 ring-green-500"
        />

        {/* 部位分类 tab */}
        {!pickerText.trim() && (
          <>
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5">
              {["history", ...MUSCLE_CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs border ${
                    activeCat === cat
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white border-gray-300 text-gray-600"
                  }`}
                >
                  {cat === "history" ? "🕘 历史" : cat}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {suggestions.map((n) => (
                <button
                  key={n}
                  onClick={() => addBlock(n)}
                  className="px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs active:bg-green-100"
                >
                  ＋{n}
                </button>
              ))}
            </div>

            {suggestions.length === 0 && (
              <p className="text-[11px] text-gray-400 mt-2 px-1">
                {activeCat === "history"
                  ? "还没有练过的动作，选个部位看看常用动作，或直接输入名称"
                  : "该分类暂无动作"}
              </p>
            )}
          </>
        )}

        {/* 搜索模式下也显示联想结果 */}
        {pickerText.trim() && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestions.map((n) => (
              <button
                key={n}
                onClick={() => addBlock(n)}
                className="px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs active:bg-green-100"
              >
                ＋{n}
              </button>
            ))}
          </div>
        )}

        {blocks.length > 0 && (
          <p className="text-[11px] text-gray-400 mt-3 px-1">
            保存将整体替换 {formatDateCN(date)} 当天的重量记录
          </p>
        )}

        {/* 动作块列表 */}
        <div className="mt-2 space-y-3">
          {blocks.map((b, bi) => {
            const lastRec =
              lastRecords[b.name] && lastRecords[b.name]!.date !== date
                ? lastRecords[b.name]!
                : null;
            return (
              <div key={b.name} className="bg-gray-50 rounded-2xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{b.name}</span>
                  <button
                    onClick={() => setBlocks((bs) => bs.filter((_, i) => i !== bi))}
                    className="text-gray-400 hover:text-red-500 px-1"
                    aria-label={`移除${b.name}`}
                  >
                    ✕
                  </button>
                </div>
                {lastRec && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-blue-600">
                        上次 {formatDateCN(lastRec.date)}
                      </p>
                      <p className="text-[11px] text-blue-500 truncate tabular-nums">
                        {lastSetsText(lastRec)}
                      </p>
                    </div>
                    <button
                      onClick={() => applyLast(bi)}
                      className="shrink-0 px-2.5 py-1.5 rounded-lg bg-blue-500 text-white text-xs active:bg-blue-600"
                    >
                      沿用上次
                    </button>
                  </div>
                )}
                {b.sets.map((s, si) => (
                  <div key={si} className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-7 text-center text-xs text-gray-500 shrink-0">
                      {si + 1}
                    </span>
                    <input
                      value={s.reps}
                      onChange={(e) =>
                        updateBlock(bi, (blk) => ({
                          ...blk,
                          sets: blk.sets.map((x, i) =>
                            i === si ? { ...x, reps: e.target.value } : x
                          ),
                        }))
                      }
                      inputMode="numeric"
                      placeholder="次数"
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-sm outline-none focus:ring-2 ring-green-500 text-center"
                    />
                    <span className="text-gray-400 text-sm shrink-0">×</span>
                    <input
                      value={s.weightKg}
                      onChange={(e) =>
                        updateBlock(bi, (blk) => ({
                          ...blk,
                          sets: blk.sets.map((x, i) =>
                            i === si ? { ...x, weightKg: e.target.value } : x
                          ),
                        }))
                      }
                      inputMode="decimal"
                      placeholder="重量"
                      title="小数用逗号或句号均可"
                      className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-sm outline-none focus:ring-2 ring-green-500 text-center"
                    />
                    <span className="text-gray-400 text-xs shrink-0">kg</span>
                    <button
                      onClick={() =>
                        updateBlock(bi, (blk) => ({
                          ...blk,
                          sets: blk.sets.filter((_, i) => i !== si),
                        }))
                      }
                      disabled={b.sets.length <= 1}
                      className="text-gray-300 hover:text-red-400 px-0.5 disabled:opacity-30 shrink-0"
                      aria-label="删除该组"
                    >
                      −
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    updateBlock(bi, (blk) => ({
                      ...blk,
                      sets: [
                        ...blk.sets,
                        inheritFrom(blk.sets[blk.sets.length - 1]),
                      ],
                    }))
                  }
                  className="text-xs text-green-600 mt-1 px-1"
                >
                  ＋ 添加一组
                </button>
              </div>
            );
          })}
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <button
          disabled={saving || blocks.length === 0}
          onClick={save}
          className="mt-4 w-full py-3.5 rounded-2xl bg-green-600 text-white font-medium active:bg-green-700 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>

      {/* 上次重量弹窗（本次打开编辑器仅对第一个带历史的动作弹出一次） */}
      {popupName && popupRec && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPopupName(null)} />
          <div className="relative w-full bg-white rounded-t-3xl p-4 pb-8 max-w-md mx-auto">
            <h3 className="text-base font-semibold text-center mb-1">
              💡 上次重量参考
            </h3>
            <p className="text-xs text-gray-500 text-center mb-3">
              {popupName} · {formatDateCN(popupRec.date)}
            </p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-4">
              {popupRec.sets.map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-500">第 {i + 1} 组</span>
                  <span className="tabular-nums">
                    {s.reps} 次 × {formatDecimal(s.weightKg)} kg
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPopupName(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm active:bg-gray-50"
              >
                不用了
              </button>
              <button
                onClick={applyPopupLast}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium active:bg-green-700"
              >
                沿用上次重量
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
