"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Sidebar company list (mirrors the legacy "כל החברות" tree): search box +
// alphabetical list, active company highlighted.
export default function CompanyTree({
  companies,
}: {
  companies: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const params = useParams<{ companyId?: string }>();

  const filtered = search.trim()
    ? companies.filter((c) => c.name.includes(search.trim()))
    : companies;

  return (
    <div className="flex max-h-[calc(100vh-7rem)] flex-col rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-900">כל החברות</p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש חברה…"
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
        />
      </div>
      <ul className="flex-1 overflow-y-auto p-2">
        {filtered.map((c) => (
          <li key={c.id}>
            <Link
              href={`/admin/companies/${c.id}`}
              className={`block truncate rounded-lg px-3 py-1.5 text-sm transition ${
                params.companyId === c.id
                  ? "bg-blue-100 font-semibold text-blue-800"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {c.name}
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-3 py-2 text-sm text-slate-400">אין תוצאות</li>
        )}
      </ul>
      <div className="border-t border-slate-200 p-2">
        <Link
          href="/admin?new=1"
          className="block rounded-lg px-3 py-1.5 text-center text-sm font-medium text-blue-700 transition hover:bg-blue-50"
        >
          + חברה חדשה
        </Link>
      </div>
    </div>
  );
}
