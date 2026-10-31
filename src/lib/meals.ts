export const MEALS = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "protein",
] as const;

export type MealType = (typeof MEALS)[number];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
  protein: "蛋白粉",
};

/** 按当前时段推断默认餐次 */
export function guessMealType(now: Date = new Date()): MealType {
  const h = now.getHours();
  if (h < 10) return "breakfast";
  if (h < 14) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}
