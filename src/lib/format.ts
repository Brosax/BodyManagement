/** 宽容解析数字输入：逗号/句号都可作为小数分隔符（西班牙语键盘友好）。非法返回 null */
export function parseDecimalLoose(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t || !/^\d*\.?\d+$|^\d+\.\d*$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** 展示用：固定小数位 + 逗号分隔符（西班牙语格式） */
export function formatDecimal(n: number, digits = 1): string {
  return n.toFixed(digits).replace(".", ",");
}
