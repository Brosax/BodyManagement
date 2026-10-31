/**
 * 筛选需要发送蛋白粉提醒的推送订阅：
 * 已开启通知 + 设了提醒时间且等于当前马德里时间 + 当日未打卡 + 有订阅设备
 */
export function selectPushTargets<T extends { personId: number }>(
  persons: {
    id: number;
    notifyEnabled: boolean;
    reminderTime: string | null;
  }[],
  checkedInIds: Set<number>,
  subs: T[],
  madridNow: string
): T[] {
  const eligible = new Set(
    persons
      .filter(
        (p) =>
          p.notifyEnabled && p.reminderTime === madridNow && !checkedInIds.has(p.id)
      )
      .map((p) => p.id)
  );
  return subs.filter((s) => eligible.has(s.personId));
}
