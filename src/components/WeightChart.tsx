"use client";

import type { WeightEntry } from "@/lib/types";
import { formatDecimal } from "@/lib/format";

/** 纯 SVG 折线趋势图，无第三方依赖 */
export default function WeightChart({ points }: { points: WeightEntry[] }) {
  if (points.length < 2) {
    return (
      <p className="text-center text-gray-500 text-sm py-10">
        再记录一天就能看到趋势啦
      </p>
    );
  }

  const W = 320;
  const H = 170;
  const P = 30;
  const ws = points.map((p) => p.weightKg);
  const min = Math.min(...ws);
  const max = Math.max(...ws);
  const span = max - min;
  const pad = span < 1 ? 0.5 : span * 0.15;
  const lo = min - pad;
  const hi = max + pad;

  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (w: number) => H - P - ((w - lo) / (hi - lo)) * (H - 2 * P);

  const path = points
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.weightKg).toFixed(1)}`
    )
    .join(" ");

  const last = points[points.length - 1];
  const first = points[0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* 参考线 */}
      {[lo, (lo + hi) / 2, hi].map((v, i) => (
        <line
          key={i}
          x1={P}
          x2={W - P}
          y1={y(v)}
          y2={y(v)}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}
      <text x={P} y={y(hi) + 10} fontSize="9" fill="#6b7280">
        {formatDecimal(hi)}
      </text>
      <text x={P} y={y(lo)} fontSize="9" fill="#6b7280" dy="-2">
        {formatDecimal(lo)}
      </text>

      <path
        d={path}
        fill="none"
        stroke="#16a34a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={x(points.length - 1)}
        cy={y(last.weightKg)}
        r="4"
        fill="#16a34a"
      />
      <text
        x={x(points.length - 1)}
        y={y(last.weightKg) - 10}
        fontSize="11"
        fill="#16a34a"
        fontWeight="600"
        textAnchor="end"
      >
        {formatDecimal(last.weightKg)} kg
      </text>

      <text x={P} y={H - 8} fontSize="9" fill="#6b7280">
        {first.date.slice(5)}
      </text>
      <text x={W - P} y={H - 8} fontSize="9" fill="#6b7280" textAnchor="end">
        {last.date.slice(5)}
      </text>
    </svg>
  );
}
