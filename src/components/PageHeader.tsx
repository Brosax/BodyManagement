"use client";

import { ReactNode } from "react";

export default function PageHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 bg-gray-50 border-b border-gray-200">
      <div className="mx-auto max-w-md flex items-center justify-between px-4 h-12">
        <span className="w-16" />
        <h1 className="font-semibold">{title}</h1>
        <div className="w-16 flex justify-end">{right}</div>
      </div>
    </header>
  );
}
