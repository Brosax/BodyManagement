export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function weekdayOf(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1; // Mon=1..Sun=7
}

export function formatDateCN(s: string): string {
  const [, m, d] = s.split("-").map(Number);
  return `${m}月${d}日`;
}
