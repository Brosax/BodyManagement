import { describe, it, expect } from "vitest";
import {
  EXERCISE_PRESETS,
  MUSCLE_CATEGORIES,
  presetNamesByMuscle,
  muscleOf,
} from "./exercises";

describe("exercise presets", () => {
  it("has unique names", () => {
    const names = EXERCISE_PRESETS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every preset has a valid category", () => {
    for (const p of EXERCISE_PRESETS) {
      expect(MUSCLE_CATEGORIES).toContain(p.muscle);
    }
  });

  it("covers every category with presets", () => {
    for (const m of MUSCLE_CATEGORIES) {
      expect(presetNamesByMuscle(m).length).toBeGreaterThan(0);
    }
  });

  it("presetNamesByMuscle filters in order", () => {
    const chest = presetNamesByMuscle("胸");
    expect(chest[0]).toBe("杠铃卧推");
    expect(chest).toContain("绳索夹胸");
    expect(chest).not.toContain("硬拉");
  });

  it("muscleOf resolves known and unknown names", () => {
    expect(muscleOf("杠铃深蹲")).toBe("腿");
    expect(muscleOf("自创动作")).toBeNull();
  });
});
