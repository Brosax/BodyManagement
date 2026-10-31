"use client";

import { useState } from "react";
import { MEALS, MEAL_LABELS } from "@/lib/meals";
import type { FoodEntry } from "@/lib/types";
import FoodPhotoViewer from "@/components/FoodPhotoViewer";

/** 「蛋白12 · 碳水30 · 脂肪8」，无任何营养素时返回 null */
function nutritionText(e: FoodEntry): string | null {
  const parts: string[] = [];
  if (e.proteinG != null) parts.push(`蛋白${e.proteinG}`);
  if (e.carbsG != null) parts.push(`碳水${e.carbsG}`);
  if (e.fatG != null) parts.push(`脂肪${e.fatG}`);
  return parts.length ? parts.join(" · ") : null;
}

export default function FoodList({
  entries,
  onEdit,
  onDelete,
}: {
  entries: FoodEntry[];
  onEdit: (entry: FoodEntry) => void;
  onDelete: (id: number) => void;
}) {
  const [viewer, setViewer] = useState<FoodEntry | null>(null);

  if (entries.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12 text-sm">
        今天还没记录，点下方 ＋ 添加吧
      </div>
    );
  }
  return (
    <div className="px-4 space-y-4">
      {MEALS.map((meal) => {
        const items = entries.filter((e) => e.mealType === meal);
        if (items.length === 0) return null;
        return (
          <section key={meal}>
            <h2 className="text-xs text-gray-600 font-medium mb-1.5 px-1">
              {MEAL_LABELS[meal]}
            </h2>
            <div className="bg-white rounded-2xl divide-y divide-gray-100 shadow-sm">
              {items.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2 px-4 py-3 active:bg-gray-50"
                >
                  {e.hasPhoto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/foods/${e.id}/photo`}
                      alt={e.name}
                      onClick={() => setViewer(e)}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                  )}
                  <button
                    onClick={() => onEdit(e)}
                    className="flex-1 text-left min-w-0"
                  >
                    <span className="block truncate">{e.name}</span>
                    {nutritionText(e) && (
                      <span className="block text-[10px] text-gray-400 tabular-nums truncate">
                        {nutritionText(e)}
                      </span>
                    )}
                    {e.source === "ai" && (
                      <span className="text-[10px] text-green-600">AI识别</span>
                    )}
                  </button>
                  <span className="text-sm text-gray-500 tabular-nums">
                    {e.calories} kcal
                  </span>
                  <button
                    onClick={() => {
                      if (confirm(`删除「${e.name}」？`)) onDelete(e.id);
                    }}
                    className="text-gray-400 hover:text-red-500 px-1 text-lg"
                    aria-label="删除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {viewer && (
        <FoodPhotoViewer
          foodId={viewer.id}
          name={viewer.name}
          note={viewer.aiNote}
          proteinG={viewer.proteinG}
          carbsG={viewer.carbsG}
          fatG={viewer.fatG}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
