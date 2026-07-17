"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/admin/Modal";
import { saveCompany, deleteCompany } from "@/lib/actions/admin";
import type { Company, Profile } from "@/lib/types";

export type CompanyRow = Company & {
  vehicle_count: number;
  driver_count: number;
  handler_name: string | null;
};

const EMPTY = {
  name: "",
  ceo_name: "",
  prof_manager: "",
  address: "",
  handler_id: "",
};

export default function CompaniesGrid({
  rows,
  profiles,
}: {
  rows: CompanyRow[];
  profiles: Profile[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<CompanyRow | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(row: CompanyRow | "new") {
    setEditing(row);
    setError(null);
    setForm(
      row === "new"
        ? EMPTY
        : {
            name: row.name,
            ceo_name: row.ceo_name ?? "",
            prof_manager: row.prof_manager ?? "",
            address: row.address ?? "",
            handler_id: row.handler_id ?? "",
          },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveCompany({
      id: editing === "new" ? undefined : editing?.id,
      name: form.name,
      ceo_name: form.ceo_name || null,
      prof_manager: form.prof_manager || null,
      address: form.address || null,
      handler_id: form.handler_id || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(row: CompanyRow) {
    if (
      !window.confirm(
        `למחוק את "${row.name}"? כל הרכבים, הנהגים והמשימות של החברה יימחקו.`,
      )
    )
      return;
    const res = await deleteCompany(row.id);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    router.refresh();
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none";

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">חברות</h1>
          <p className="text-sm text-slate-500">{rows.length} חברות במערכת</p>
        </div>
        <button
          onClick={() => open("new")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + חברה חדשה
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">שם החברה</th>
              <th className="px-4 py-3 font-medium">מטפל אחראי</th>
              <th className="px-4 py-3 font-medium">מנכ״ל</th>
              <th className="px-4 py-3 font-medium">מנהל מקצועי</th>
              <th className="px-4 py-3 font-medium">רכבים</th>
              <th className="px-4 py-3 font-medium">נהגים</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  אין חברות עדיין — הוסיפו את הראשונה.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/companies/${row.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {row.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {row.handler_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.ceo_name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{row.prof_manager ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{row.vehicle_count}</td>
                <td className="px-4 py-3 text-slate-600">{row.driver_count}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => open(row)}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
                    >
                      עריכה
                    </button>
                    <button
                      onClick={() => handleDelete(row)}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      מחיקה
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal
          title={editing === "new" ? "חברה חדשה" : "עריכת חברה"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">שם החברה *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">מטפל אחראי</label>
              <select
                value={form.handler_id}
                onChange={(e) => setForm({ ...form, handler_id: e.target.value })}
                className={inputCls}
              >
                <option value="">ללא שיוך</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">מנכ״ל</label>
              <input
                value={form.ceo_name}
                onChange={(e) => setForm({ ...form, ceo_name: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">מנהל מקצועי</label>
              <input
                value={form.prof_manager}
                onChange={(e) => setForm({ ...form, prof_manager: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">כתובת</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={inputCls}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "שומר…" : "שמירה"}
            </button>
          </form>
        </Modal>
      )}
    </main>
  );
}
