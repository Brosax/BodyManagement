"use client";

/** Web Push 的 applicationServerKey 需要 URL-safe base64 转 Uint8Array */
export function urlBase64ToUint8Array(
  base64String: string
): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/**
 * 完整开启通知流程：授权 → 订阅 → 上报服务端
 * 返回错误信息；null 表示成功
 */
export async function enableNotifications(
  personId: number,
  vapidPublicKey: string
): Promise<string | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "此浏览器不支持推送通知";
  }
  const perm =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (perm !== "granted") {
    return "需要通知权限才能收到提醒，请在系统设置中允许";
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId, ...sub.toJSON() }),
  });
  if (!res.ok) return "订阅上报失败，请稍后重试";
  return null;
}
