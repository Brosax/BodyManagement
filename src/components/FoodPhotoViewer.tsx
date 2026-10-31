"use client";

/** 全屏照片查看器：大图 + AI 估算说明 + 营养素 */
export default function FoodPhotoViewer({
  foodId,
  name,
  note,
  proteinG,
  carbsG,
  fatG,
  onClose,
}: {
  foodId: number;
  name: string;
  note?: string | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  onClose: () => void;
}) {
  const nutrition: string[] = [];
  if (proteinG != null) nutrition.push(`蛋白${proteinG}g`);
  if (carbsG != null) nutrition.push(`碳水${carbsG}g`);
  if (fatG != null) nutrition.push(`脂肪${fatG}g`);
  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/foods/${foodId}/photo`}
        alt={name}
        className="max-w-full max-h-[75vh] object-contain"
      />
      <p className="text-white font-medium mt-4 px-6 text-center">{name}</p>
      {nutrition.length > 0 && (
        <p className="text-green-300 text-sm mt-1 px-6 text-center tabular-nums">
          {nutrition.join(" · ")}
        </p>
      )}
      {note && (
        <p className="text-gray-300 text-sm mt-1 px-6 text-center">{note}</p>
      )}
      <button
        className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/15 text-white text-lg leading-none"
        aria-label="关闭"
      >
        ✕
      </button>
    </div>
  );
}
