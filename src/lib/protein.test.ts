import { describe, it, expect } from "vitest";
import { calcPowderNutrition, powderEntryName } from "./protein";

describe("protein powder utils", () => {
  it("calcPowderNutrition scales by serving size", () => {
    expect(
      calcPowderNutrition(30, { kcalPer100G: 400, proteinPer100G: 80 })
    ).toEqual({ calories: 120, proteinG: 24 });
    expect(
      calcPowderNutrition(100, { kcalPer100G: 400, proteinPer100G: 80 })
    ).toEqual({ calories: 400, proteinG: 80 });
  });

  it("calcPowderNutrition rounds to integers", () => {
    expect(
      calcPowderNutrition(25, { kcalPer100G: 371, proteinPer100G: 75 })
    ).toEqual({ calories: 93, proteinG: 19 });
  });

  it("calcPowderNutrition handles zero serving", () => {
    expect(
      calcPowderNutrition(0, { kcalPer100G: 400, proteinPer100G: 80 })
    ).toEqual({ calories: 0, proteinG: 0 });
  });

  it("powderEntryName includes grams", () => {
    expect(powderEntryName(30)).toBe("蛋白粉 30g");
  });
});
