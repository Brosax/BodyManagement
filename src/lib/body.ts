/** 身体数据与营养建议计算（纯函数，服务端与客户端共用） */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "high";
export type Goal = "cut" | "maintain" | "bulk";

/** 身体信息（persons 表中的可空列） */
export type BodyProfile = {
  heightCm: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  goal: Goal | null;
};

export type HealthStats = {
  bmi: number;
  bmiLabel: string;
  bmr: number;
  tdee: number;
  /** 按目标调整后的建议热量 */
  targetCalories: number;
  macroTargets: MacroTargets;
};

export type MacroTargets = {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
};

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "久坐",
  light: "轻度活动",
  moderate: "中度活动",
  high: "高强度",
};

export const GOAL_LABELS: Record<Goal, string> = {
  cut: "减脂",
  maintain: "维持",
  bulk: "增肌",
};

/** 目标对应的热量差与蛋白质 g/kg */
const GOAL_RULES: Record<Goal, { kcalDelta: number; proteinPerKg: number }> = {
  cut: { kcalDelta: -400, proteinPerKg: 2.0 },
  maintain: { kcalDelta: 0, proteinPerKg: 1.6 },
  bulk: { kcalDelta: 250, proteinPerKg: 1.8 },
};

/** BMI = 体重 kg / 身高 m²，保留一位小数 */
export function calcBmi(weightKg: number, heightCm: number): number {
  if (heightCm <= 0) return 0;
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

/** BMI 分级（中国成人标准） */
export function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return "偏瘦";
  if (bmi < 24) return "正常";
  if (bmi < 28) return "超重";
  return "肥胖";
}

/** Mifflin-St Jeor 公式 */
export function calcBmr(input: {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return Math.round(input.sex === "male" ? base + 5 : base - 161);
}

/**
 * 由身体信息推导健康指标；任一必需项缺失返回 null。
 * 体重取最近一次称重，由调用方传入。
 */
export function computeHealthStats(
  profile: BodyProfile,
  weightKg: number | null
): HealthStats | null {
  const { heightCm, age, sex, activityLevel, goal } = profile;
  if (!heightCm || !age || !sex || !activityLevel || !goal || !weightKg) {
    return null;
  }
  const bmr = calcBmr({ sex, age, weightKg, heightCm });
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[activityLevel]);
  const targetCalories = Math.max(1200, tdee + GOAL_RULES[goal].kcalDelta);
  return {
    bmi: calcBmi(weightKg, heightCm),
    bmiLabel: bmiLabel(calcBmi(weightKg, heightCm)),
    bmr,
    tdee,
    targetCalories,
    macroTargets: calcMacroTargets(goal, weightKg, targetCalories),
  };
}

/** 三大宏量：蛋白按体重 g/kg，脂肪占 25% 热量，碳水补足剩余 */
export function calcMacroTargets(
  goal: Goal,
  weightKg: number,
  targetCalories: number
): MacroTargets {
  const rule = GOAL_RULES[goal];
  const proteinG = Math.round(weightKg * rule.proteinPerKg);
  const fatG = Math.round((targetCalories * 0.25) / 9);
  const carbsG = Math.max(
    0,
    Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4)
  );
  return { calories: targetCalories, proteinG, fatG, carbsG };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
