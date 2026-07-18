"use client";

import { useState } from "react";
import Link from "next/link";
import type { FeedItem, TaskType } from "@/lib/types";
import { SEVERITY_CHIP } from "@/components/admin/ui";

const KIND_LABEL: Record<TaskType, string> = {
  inspection: "בדיקה",
  training: "הדרכה",
  document: "מסמך",
};

// Legacy-style alerts drilldown: date-range + type + handler filters over the
// aggregated feed (already scoped to a company by the caller when relevant).
export default function AlertsPanel({
  items,
  handlers,
}: {
  items: FeedItem[];
  handlers: { id: string; name: string }[];
}) {
  const [kind, setKind] = useState("");
  const [handler, setHandler] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = items.filter((i) => {
    if (kind && i.kind !== kind) return false;
    if (handler && i.handlerId !== handler) return false;
    // Items without a due date (e.g. monthly inspections) pass date filters.
    if (from && i.dueDate && i.dueDate < from) return false;
    if (to && i.dueDate && i.dueDate > to) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">כל הסוגים</option>
          {Object.entries(KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={handler}
          onChange={(e) => setHandler(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">כל המטפלים</option>
          {handlers.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          מתאריך
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          עד תאריך
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <span className="mr-auto text-sm text-slate-500">
          {filtered.length} התראות
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">אין התראות</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filtered.map((i) => {
            const sev = SEVERITY_CHIP[i.severity];
            return (
              <li key={i.id}>
                <Link
                  href={i.href}
                  className="flex items-center justify-between gap-3 px-2 py-2.5 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      <span className="ml-2 text-xs text-slate-400">
                        {KIND_LABEL[i.kind]}
                      </span>
                      {i.title}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {i.subtitle}
                      {i.dueDate ? ` · יעד ${i.dueDate}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${sev.cls}`}
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
