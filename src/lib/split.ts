export const SPLIT_COUNT = 4;

export type SplitLog = {
  date: string;
  id: number;
  planWeekday: number | null;
};

/**
 * 四分循环：推导下一个该练的位次（1–4）。
 * 取最近一条计划打卡（按日期倒序、同日取 id 大者），位次 +1，越过 4 回到 1；
 * 自由记录（planWeekday=null）与越界值不参与；无计划打卡从 1 开始。
 */
export function nextSplitPosition(logs: SplitLog[]): number {
  let latestDate = "";
  let latestId = -1;
  let latestPos = 0;
  for (const l of logs) {
    const pos = l.planWeekday;
    if (pos == null || pos < 1 || pos > SPLIT_COUNT) continue;
    if (
      l.date > latestDate ||
      (l.date === latestDate && l.id > latestId)
    ) {
      latestDate = l.date;
      latestId = l.id;
      latestPos = pos;
    }
  }
  return latestPos ? (latestPos % SPLIT_COUNT) + 1 : 1;
}
