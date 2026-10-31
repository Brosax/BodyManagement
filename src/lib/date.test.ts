import { describe, it, expect } from "vitest";
import { toDateStr, addDays, weekdayOf, formatDateCN } from "./date";

describe("date utils", () => {
  it("toDateStr formats ISO date parts", () => {
    expect(toDateStr(new Date(2026, 7, 3))).toBe("2026-08-03");
    expect(toDateStr(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("addDays crosses months correctly", () => {
    expect(toDateStr(addDays(new Date(2026, 7, 31), 1))).toBe("2026-09-01");
    expect(toDateStr(addDays(new Date(2026, 2, 1), -1))).toBe("2026-02-28");
  });

  it("weekdayOf maps Mon..Sun to 1..7", () => {
    expect(weekdayOf(new Date(2026, 7, 3))).toBe(1); // 2026-08-03 周一
    expect(weekdayOf(new Date(2026, 7, 9))).toBe(7); // 2026-08-09 周日
  });

  it("formatDateCN shows month and day", () => {
    expect(formatDateCN("2026-08-23")).toBe("8月23日");
  });
});
