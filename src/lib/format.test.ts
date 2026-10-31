import { describe, it, expect } from "vitest";
import { parseDecimalLoose, formatDecimal } from "./format";

describe("parseDecimalLoose", () => {
  it("accepts comma as decimal separator", () => {
    expect(parseDecimalLoose("65,5")).toBe(65.5);
    expect(parseDecimalLoose("0,25")).toBe(0.25);
  });

  it("accepts period as decimal separator too", () => {
    expect(parseDecimalLoose("65.5")).toBe(65.5);
  });

  it("trims whitespace and handles integers", () => {
    expect(parseDecimalLoose(" 70 ")).toBe(70);
    expect(parseDecimalLoose("80")).toBe(80);
  });

  it("returns null for garbage or empty", () => {
    expect(parseDecimalLoose("")).toBeNull();
    expect(parseDecimalLoose("abc")).toBeNull();
    expect(parseDecimalLoose("1,2,3")).toBeNull();
    expect(parseDecimalLoose(",")).toBeNull();
  });

  it("rejects multiple separators but allows one", () => {
    expect(parseDecimalLoose("12,5")).toBe(12.5);
    expect(parseDecimalLoose("12.5.6")).toBeNull();
  });
});

describe("formatDecimal", () => {
  it("renders with comma decimal separator at fixed precision", () => {
    expect(formatDecimal(65.5)).toBe("65,5");
    expect(formatDecimal(83)).toBe("83,0");
    expect(formatDecimal(12.25, 2)).toBe("12,25");
  });
});
