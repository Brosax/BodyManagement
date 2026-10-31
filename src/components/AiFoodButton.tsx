"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/image";

type Result = {
  name: string;
  calories: number;
  note: string;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

export default function AiFoodButton({
  onResult,
}: {
  onResult: (food: Result, image: string, hint?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const image = await compressImage(file);
      setHint("");
      setPreview(image);
    } catch {
      setError("图片处理失败");
      setTimeout(() => setError(null), 4000);
    }
  }

  function closePreview() {
    setPreview(null);
    setHint("");
    setError(null);
  }

  async function recognize() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const trimmed = hint.trim();
      const res = await fetch("/api/food/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: preview,
          ...(trimmed ? { hint: trimmed } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "识别失败");
      onResult(
        {
          name: data.name,
          calories: data.calories,
          note: data.note ?? "",
          protein: typeof data.protein === "number" ? data.protein : null,
          carbs: typeof data.carbs === "number" ? data.carbs : null,
          fat: typeof data.fat === "number" ? data.fat : null,
        },
        preview,
        trimmed || undefined
      );
      closePreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "识别失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full py-3.5 rounded-2xl border-2 border-dashed border-green-300 text-green-700 font-medium active:bg-green-50 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy && (
          <span className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        )}
        📸 拍照识别卡路里
      </button>
      {!preview && error && (
        <p className="text-red-500 text-sm text-center mt-1">{error}</p>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={busy ? undefined : closePreview}
          />
          <div className="relative w-full bg-white rounded-t-3xl p-4 pb-8 max-w-md mx-auto">
            <h2 className="text-lg font-semibold mb-4 text-center">
              补充说明（可选）
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="待识别食物照片"
              className="w-24 h-24 object-cover rounded-xl mx-auto mb-3"
            />
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              maxLength={200}
              rows={3}
              disabled={busy}
              placeholder="份量、配料、做法等，如：大份麻辣烫，加了牛肉丸和宽粉，少油"
              className="w-full px-4 py-3 rounded-xl bg-gray-100 outline-none focus:ring-2 ring-green-500 text-sm resize-none disabled:opacity-50"
            />
            <p className="text-[10px] text-gray-400 text-right mt-1 mb-3">
              {hint.length}/200
            </p>
            {error && (
              <p className="text-red-500 text-sm text-center mb-3">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={closePreview}
                disabled={busy}
                className="flex-1 py-3.5 rounded-2xl border border-gray-300 text-gray-600 font-medium active:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={recognize}
                disabled={busy}
                className="flex-[2] py-3.5 rounded-2xl bg-green-600 text-white font-medium active:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {busy ? "识别中…" : "🔍 开始识别"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
