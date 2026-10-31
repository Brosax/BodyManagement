/** 视图过渡方向标记：在 <html> 上设置 data-vt，供 globals.css 的 ::view-transition 动画使用 */

/** 与 TabBar 一致的 tab 顺序 */
export const VT_TABS = ["/", "/eat", "/train", "/weight", "/me"] as const;

/**
 * 点击站内链接时调用。目标在当前右侧 → 内容向左滑（新页从右进入），反之向右滑。
 * 必须在导航触发前调用（Link 的 onClick 先于过渡快照执行）。
 */
export function setVtDirection(href: string): void {
  if (typeof window === "undefined") return;
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const tabs: readonly string[] = VT_TABS;
  const from = tabs.indexOf(window.location.pathname);
  const to = tabs.indexOf(path);
  document.documentElement.dataset.vt =
    from === -1 || to === -1 || from === to ? "none" : to > from ? "left" : "right";
}
