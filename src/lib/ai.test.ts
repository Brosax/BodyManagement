import { describe, it, expect } from "vitest";
import { parseAiFood, buildUserText } from "./ai";

describe("parseAiFood", () => {
  it("parses clean json object with nutrition", () => {
    expect(
      parseAiFood(
        '{"name":"番茄炒蛋","calories":320,"protein":12.4,"carbs":10.6,"fat":20,"note":"一盘"}'
      )
    ).toEqual({
      name: "番茄炒蛋",
      calories: 320,
      protein: 12,
      carbs: 11,
      fat: 20,
      note: "一盘",
    });
  });

  it("extracts json from surrounding text and code fence", () => {
    const s = '好的！识别结果如下：\n```json\n{"name":"米饭","calories":230}\n```';
    expect(parseAiFood(s)).toEqual({
      name: "米饭",
      calories: 230,
      protein: null,
      carbs: null,
      fat: null,
      note: "",
    });
  });

  it("throws on missing fields or bad types", () => {
    expect(() => parseAiFood('{"name":"x"}')).toThrow();
    expect(() => parseAiFood('{"name":"x","calories":"很多"}')).toThrow();
    expect(() => parseAiFood("not json at all")).toThrow();
  });

  it("rejects empty name and out-of-range calories", () => {
    expect(() => parseAiFood('{"name":"  ","calories":100}')).toThrow();
    expect(() => parseAiFood('{"name":"苹果","calories":99999}')).toThrow();
    expect(() => parseAiFood('{"name":"苹果","calories":-5}')).toThrow();
  });

  it("rounds float calories to int", () => {
    expect(parseAiFood('{"name":"苹果","calories":95.4}').calories).toBe(95);
    expect(parseAiFood('{"name":"苹果","calories":95.6}').calories).toBe(96);
  });

  it("parses optional note field", () => {
    const r = parseAiFood(
      '{"name":"牛肉面","calories":550,"note":"约200g面条+50g牛肉"}'
    );
    expect(r.note).toBe("约200g面条+50g牛肉");
  });

  it("note defaults to empty string when missing or invalid", () => {
    expect(parseAiFood('{"name":"苹果","calories":95}').note).toBe("");
    expect(parseAiFood('{"name":"苹果","calories":95,"note":123}').note).toBe("");
  });

  it("coerces numeric strings for calories and grams", () => {
    const r = parseAiFood(
      '{"name":"面包","calories":"160","protein":"6","carbs":"28.4","fat":"2"}'
    );
    expect(r.calories).toBe(160);
    expect(r.protein).toBe(6);
    expect(r.carbs).toBe(28);
    expect(r.fat).toBe(2);
    const bad = parseAiFood(
      '{"name":"面包","calories":160,"protein":"很多","carbs":{}}'
    );
    expect(bad.protein).toBeNull();
    expect(bad.carbs).toBeNull();
  });

  it("accepts boundary grams 0 and 500", () => {
    const r = parseAiFood(
      '{"name":"鸡胸肉","calories":133,"protein":0,"carbs":500,"fat":31}'
    );
    expect(r.protein).toBe(0);
    expect(r.carbs).toBe(500);
    expect(r.fat).toBe(31);
  });

  it("sets individual nutrition field to null when missing, invalid or out of range", () => {
    const r = parseAiFood(
      '{"name":"沙拉","calories":150,"protein":-3,"carbs":"很多","fat":99999}'
    );
    expect(r.protein).toBeNull();
    expect(r.carbs).toBeNull();
    expect(r.fat).toBeNull();
    expect(parseAiFood('{"name":"沙拉","calories":150,"protein":null}').protein).toBeNull();
    expect(parseAiFood('{"name":"沙拉","calories":150,"protein":{}}').protein).toBeNull();
  });
});

describe("buildUserText", () => {
  it("returns base prompt when hint missing or blank", () => {
    expect(buildUserText()).toBe(buildUserText(""));
    expect(buildUserText("   ")).toBe(buildUserText());
  });

  it("appends user hint section after base prompt", () => {
    const t = buildUserText("大份，加了牛肉丸和宽粉");
    expect(t.startsWith(buildUserText())).toBe(true);
    expect(t).toContain("用户补充说明");
    expect(t).toContain("大份，加了牛肉丸和宽粉");
  });

  it("trims hint and truncates to 200 chars", () => {
    const t = buildUserText(`  ${"a".repeat(250)}  `);
    expect(t.endsWith("a".repeat(200))).toBe(true);
    expect(t.includes("a".repeat(201))).toBe(false);
  });
});
