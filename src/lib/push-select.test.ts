import { describe, it, expect } from "vitest";
import { selectPushTargets } from "./push-select";

describe("selectPushTargets", () => {
  const persons = [
    { id: 1, notifyEnabled: true, reminderTime: "18:30" },
    { id: 2, notifyEnabled: false, reminderTime: "18:30" }, // 未开启通知
    { id: 3, notifyEnabled: true, reminderTime: "18:30" }, // 已打卡
    { id: 4, notifyEnabled: true, reminderTime: "20:00" }, // 时间不匹配
    { id: 5, notifyEnabled: true, reminderTime: null }, // 未设置时间
    { id: 6, notifyEnabled: true, reminderTime: "18:30" }, // 多台设备都应收到
  ];
  const checkedInIds = new Set([3]);
  const subs = [
    { personId: 1, endpoint: "a" },
    { personId: 2, endpoint: "b" },
    { personId: 4, endpoint: "c" },
    { personId: 5, endpoint: "e" },
    { personId: 6, endpoint: "c" },
    { personId: 6, endpoint: "d" }, // 同人多设备
  ];

  it("targets enabled persons whose time matches and who have not checked in", () => {
    const result = selectPushTargets(persons, checkedInIds, subs, "18:30");
    expect(result.map((s) => s.endpoint)).toEqual(["a", "c", "d"]);
  });

  it("returns empty when no time matches current madrid time", () => {
    expect(selectPushTargets(persons, checkedInIds, subs, "23:59")).toEqual([]);
  });

  it("keeps full subscription shape (generic passthrough)", () => {
    const rows = [{ personId: 1, endpoint: "a", id: 11, p256dh: "x", auth: "y" }];
    expect(selectPushTargets(persons, checkedInIds, rows, "18:30")).toEqual(rows);
  });
});
