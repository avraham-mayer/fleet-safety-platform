"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { FeedItem, Severity, TaskType } from "@/lib/types";

const SEVERITY_CHIP: Record<Severity, { label: string; cls: string }> = {
  expired: { label: "פג תוקף", cls: "bg-red-100 text-red-700" },
  warning: { label: "דורש טיפול", cls: "bg-amber-100 text-amber-700" },
  ok: { label: "תקין", cls: "bg-green-100 text-green-700" },
};

const KIND_BADGE: Record<TaskType, { label: string; cls: string }> = {
  inspection: { label: "בדיקה", cls: "bg-blue-50 text-blue-700" },
  training: { label: "הדרכה", cls: "bg-violet-50 text-violet-700" },
  document: { label: "מסמך", cls: "bg-slate-100 text-slate-600" },
};

export default function TaskFeed({ items }: { items: FeedItem[] }) {
  const [company, setCompany] = useState("");
  const [search, setSearch] = useState("");

  const companies = useMemo(
    () =>
      Array.from(
        new Map(
          items
            .filter((i) => i.companyId)
            .map((i) => [i.companyId!, i.companyName]),
        ),
      ),
    [items],
  );

  const filtered = items.filter((i) => {
    if (company && i.companyId !== company) return false;
    if (search) {
      const q = search.trim().toLowerCase();
      const hay = `${i.plate ?? ""} ${i.driverName ?? ""} ${i.title}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
        >
          <option value="">כל החברות</option>
          {companies.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי מספר רכב או נהג"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center text-slate-500 ring-1 ring-slate-200">
          אין משימות פתוחות. 🎉
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const sev = SEVERITY_CHIP[item.severity];
            const kind = KIND_BADGE[item.kind];
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-blue-400"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${kind.cls}`}
                      >
                        {kind.label}
                      </span>
                      <span className="truncate font-semibold text-slate-900">
                        {item.title}
                      </span>
                    </div>
                    <p className="truncate text-sm text-slate-500">
                      {item.subtitle}
                      {item.dueDate ? ` · יעד ${item.dueDate}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${sev.cls}`}
                  >
                    {sev.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
