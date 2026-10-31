/** data URL → Buffer；非法返回 null（服务端使用） */
export function decodePhoto(dataUrl: string): Buffer | null {
  const idx = dataUrl.indexOf("base64,");
  if (idx === -1) return null;
  const b64 = dataUrl.slice(idx + 7);
  try {
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}
