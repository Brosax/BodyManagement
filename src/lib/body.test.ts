import { describe, it, expect } from "vitest";
import {
  calcBmi,
  bmiLabel,
  calcBmr,
  calcMacroTargets,
  computeHealthStats,
} from "./body";

describe("calcBmi", () => {
  it("computes weight / height²", () => {
    expect(calcBmi(70, 175)).toBe(22.9);
    expect(calcBmi(60, 160)).toBe(23.4);
  });

  it("handles zero height", () => {
    expect(calcBmi(70, 0)).toBe(0);
  });
});

describe("bmiLabel", () => {
  it("uses Chinese adult cutoffs", () => {
    expect(bmiLabel(18.4)).toBe("偏瘦");
    expect(bmiLabel(18.5)).toBe("正常");
    expect(bmiLabel(23.9)).toBe("正常");
    expect(bmiLabel(24)).toBe("超重");
    expect(bmiLabel(27.9)).toBe("超重");
    expect(bmiLabel(28)).toBe("肥胖");
  });
});

describe("calcBmr", () => {
  it("male uses +5", () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780
    expect(calcBmr({ sex: "male", age: 30, weightKg: 80, heightCm: 180 })).toBe(
      1780
    );
  });

  it("female uses -161", () => {
    // 10*55 + 6.25*165 - 5*28 - 161 = 1280.25 → 1280
    expect(calcBmr({ sex: "female", age: 28, weightKg: 55, heightCm: 165 })).toBe(
      1280
    );
  });
});

describe("computeHealthStats", () => {
  const full = {
    heightCm: 180,
    age: 30,
    sex: "male" as const,
    activityLevel: "moderate" as const,
    goal: "maintain" as const,
  };

  it("returns null when any field is missing", () => {
    expect(computeHealthStats({ ...full, heightCm: null }, 75)).toBeNull();
    expect(computeHealthStats({ ...full, age: null }, 75)).toBeNull();
    expect(computeHealthStats({ ...full, sex: null }, 75)).toBeNull();
    expect(
      computeHealthStats({ ...full, activityLevel: null }, 75)
    ).toBeNull();
    expect(computeHealthStats({ ...full, goal: null }, 75)).toBeNull();
    expect(computeHealthStats(full, null)).toBeNull();
  });

  it("computes full stats for a complete profile", () => {
    const stats = computeHealthStats(full, 75)!;
    // bmr = 10*75 + 6.25*180 - 5*30 + 5 = 1730; tdee = round(1730 * 1.55) = 2682
    expect(stats.bmr).toBe(1730);
    expect(stats.tdee).toBe(2682);
    expect(stats.targetCalories).toBe(2682);
    expect(stats.bmi).toBe(23.1);
    expect(stats.bmiLabel).toBe("正常");
  });

  it("applies cut deficit and floors at 1200 kcal", () => {
    const stats = computeHealthStats(
      { ...full, activityLevel: "sedentary", goal: "cut" },
      50
    )!;
    // bmr = 500 + 1125 - 150 + 5 = 1480; tdee = 1776; cut → 1376
    expect(stats.tdee).toBe(1776);
    expect(stats.targetCalories).toBe(1376);
    // 极小体重的久坐减脂也不低于 1200
    const tiny = computeHealthStats(
      { ...full, heightCm: 140, age: 60, activityLevel: "sedentary", goal: "cut" },
      35
    )!;
    expect(tiny.targetCalories).toBeGreaterThanOrEqual(1200);
  });

  it("adds bulk surplus", () => {
    const stats = computeHealthStats({ ...full, goal: "bulk" }, 75)!;
    expect(stats.targetCalories).toBe(2932); // 2682 + 250
  });
});

describe("calcMacroTargets", () => {
  it("cut: protein 2.0 g/kg, fat 25%, carbs fill rest", () => {
    const m = calcMacroTargets("cut", 70, 2000);
    // protein 140, fat round(500/9)=56, carbs (2000-560-504)/4 = 234
    expect(m).toEqual({
      calories: 2000,
      proteinG: 140,
      fatG: 56,
      carbsG: 234,
    });
  });

  it("maintain: protein 1.6 g/kg", () => {
    const m = calcMacroTargets("maintain", 70, 2500);
    expect(m.proteinG).toBe(112);
    expect(m.fatG).toBe(Math.round((2500 * 0.25) / 9));
    expect(m.carbsG).toBe(
      Math.round((2500 - 112 * 4 - m.fatG * 9) / 4)
    );
  });

  it("bulk: protein 1.8 g/kg", () => {
    expect(calcMacroTargets("bulk", 70, 3000).proteinG).toBe(126);
  });

  it("carbs never negative", () => {
    const m = calcMacroTargets("cut", 100, 1200);
    expect(m.carbsG).toBeGreaterThanOrEqual(0);
  });
});
