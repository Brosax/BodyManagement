"use client";

import { PersonProvider, usePersons } from "@/lib/person-context";
import SwRegister from "./SwRegister";
import TabBar from "./TabBar";

function PersonChooser() {
  const { persons, loading, current, select } = usePersons();
  if (loading || current || persons.length === 0) return null;
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-4 px-8">
      <h1 className="text-2xl font-bold">今天你是谁？</h1>
      <p className="text-gray-500 text-sm">选择身份开始记录</p>
      <div className="w-full max-w-xs flex flex-col gap-3 mt-4">
        {persons.map((p) => (
          <button
            key={p.id}
            onClick={() => select(p.id)}
            className="w-full py-4 rounded-2xl bg-green-600 text-white text-lg font-medium active:bg-green-700"
          >
            我是{p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PersonProvider>
      <SwRegister />
      <div className="mx-auto w-full max-w-md min-h-dvh pb-24">{children}</div>
      <TabBar />
      <PersonChooser />
    </PersonProvider>
  );
}
