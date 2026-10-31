"use client";

import { useEffect, useState } from "react";
import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { prefetchTabData } from "@/lib/api-cache";
import { toDateStr } from "@/lib/date";
import { usePersons } from "@/lib/person-context";
import { setVtDirection } from "@/lib/vt";

const TABS = [
  { href: "/", label: "今天", icon: "🏠" },
  { href: "/eat", label: "吃", icon: "🍚" },
  { href: "/train", label: "练", icon: "🏋️" },
  { href: "/weight", label: "重", icon: "⚖️" },
  { href: "/me", label: "我", icon: "👤" },
];

/** 弹簧回弹曲线：轻微过冲后落位 */
const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export default function TabBar() {
  const pathname = usePathname();
  const { current } = usePersons();
  // 首帧禁用过渡，避免刷新时胶囊从第一格滑入；挂载后才启用滑动动画
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeIndex = TABS.findIndex((t) => t.href === pathname);

  function onTabClick(href: string) {
    setVtDirection(href);
    if (current) prefetchTabData(href, current.id, toDateStr(new Date()));
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-md px-2 py-1.5">
        <div className="relative">
          {/* 滑动选择框：宽度为单格（1/5），按格位移 */}
          <div
            aria-hidden
            className={`absolute top-0.5 bottom-0.5 left-0 w-1/5 rounded-2xl bg-green-100 ${
              activeIndex < 0 ? "opacity-0" : ""
            } ${
              mounted ? "transition-transform duration-300" : ""
            }`}
            style={{
              transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
              ...(mounted ? { transitionTimingFunction: SPRING } : null),
            }}
          />
          <div className="relative z-10 grid grid-cols-5">
            {TABS.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => onTabClick(t.href)}
                  className={`flex flex-col items-center justify-center py-2 text-xs ${
                    active ? "text-green-600 font-semibold" : "text-gray-600"
                  }`}
                >
                  <span className="text-xl leading-6">{t.icon}</span>
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
