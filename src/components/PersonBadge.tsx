"use client";

import { useState } from "react";
import { usePersons } from "@/lib/person-context";

export default function PersonBadge() {
  const { current, persons, select } = usePersons();
  const [open, setOpen] = useState(false);
  if (!current) return null;
  const others = persons.filter((p) => p.id !== current.id);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium"
      >
        {current.name} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-28">
            {others.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  select(p.id);
                  setOpen(false);
                }}
                className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
              >
                切换到 {p.name}
              </button>
            ))}
            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="block w-full text-left px-4 py-2 text-xs text-gray-500"
              >
                当前：{current.name}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
