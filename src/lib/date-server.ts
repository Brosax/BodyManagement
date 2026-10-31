/** 以马德里时间为准计算"今天"（YYYY-MM-DD），供服务端使用 */
export function todayMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
  }).format(new Date());
}

/** 当前马德里的 HH:MM（24 小时制） */
export function madridHHMM(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}
