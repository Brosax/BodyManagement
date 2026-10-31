import { describe, it, expect } from "vitest";
import { nextSplitPosition, SPLIT_COUNT } from "./split";

type Log = Parameters<typeof nextSplitPosition>[0][number];

describe("nextSplitPosition", () => {
  it("exposes split count of 4", () => {
    expect(SPLIT_COUNT).toBe(4);
  });

  it("starts at 1 with no logged sessions", () => {
    expect(nextSplitPosition([])).toBe(1);
    expect(nextSplitPosition([{ date: "2026-08-20", id: 9, planWeekday: null }])).toBe(1);
  });

  it("advances after the latest session", () => {
    const logs: Log[] = [
      { date: "2026-08-19", id: 1, planWeekday: 1 },
      { date: "2026-08-21", id: 2, planWeekday: 2 },
    ];
    expect(nextSplitPosition(logs)).toBe(3);
  });

  it("wraps back to 1 after position 4", () => {
    expect(nextSplitPosition([{ date: "2026-08-21", id: 2, planWeekday: 4 }])).toBe(1);
  });

  it("ignores free records and picks latest by date then id", () => {
    const logs: Log[] = [
      { date: "2026-08-25", id: 9, planWeekday: null },
      { date: "2026-08-20", id: 2, planWeekday: 3 },
      { date: "2026-08-22", id: 3, planWeekday: 1 },
      // 同日两条计划打卡，取 id 更大的一条
      { date: "2026-08-22", id: 4, planWeekday: 4 },
    ];
    expect(nextSplitPosition(logs)).toBe(1);
  });

  it("treats out-of-range positions as invalid and skips them", () => {
    const logs: Log[] = [
      { date: "2026-08-26", id: 5, planWeekday: 7 },
      { date: "2026-08-20", id: 2, planWeekday: 2 },
    ];
    expect(nextSplitPosition(logs)).toBe(3);
  });
});
