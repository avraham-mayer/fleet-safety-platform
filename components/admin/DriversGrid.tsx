"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/admin/Modal";
import { saveDriver, deleteDriver } from "@/lib/actions/admin";
import { severityFor } from "@/lib/expiry";
import type { Company, Driver, Severity } from "@/lib/types";

const EXPIRY_CLS: Record<Severity, string> = {
  expired: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  ok: "bg-green-100 text-green-700",
};

const EMPTY = {
  company_id: "",
  name: "",
  license_number: "",
  id_number: "",
  license_expiry: "",
  hazmat_certified: false,
};

export default function DriversGrid({
  rows,
  companies,
}: {
  rows: Driver[];
  companies: Company[];
}) {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Driver | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyName = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  );

  const filtered = rows.filter((d) => {
    if (company && d.company_id !== company) return false;
    if (search) {
      const q = search.trim().toLowerCase();
      const hay = `${d.name} ${d.license_number ?? ""} ${d.id_number ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  function open(row: Driver | "new") {
    setEditing(row);
    setError(null);
    setForm(
      row === "new"
        ? { ...EMPTY, company_id: companies[0]?.id ?? "" }
        : {
            company_id: row.company_id,
            name: row.name,
            license_number: row.license_number ?? "",
            id_number: row.id_number ?? "",
            license_expiry: row.license_expiry ?? "",
            hazmat_certified: row.hazmat_certified,
          },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveDriver({
      id: editing === "new" ? undefined : editing?.id,
      company_id: form.company_id,
      name: form.name,
      license_number: form.license_number || null,
      id_number: form.id_number || null,
      license_expiry: form.license_expiry || null,
      hazmat_certified: form.hazmat_certified,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(row: Driver) {
    if (!window.confirm(`למחוק את הנהג ${row.name}?`)) return;
    const res = await deleteDriver(row.id);
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
          <h1 className="text-2xl font-bold text-slate-900">נהגים</h1>
          <p className="text-sm text-slate-500">{rows.length} נהגים במערכת</p>
        </div>
        <button
          onClick={() => open("new")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + נהג חדש
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
        >
          <option value="">כל החברות</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, רישיון או ת״ז"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">שם</th>
              <th className="px-4 py-3 font-medium">חברה</th>
              <th className="px-4 py-3 font-medium">מס׳ רישיון</th>
              <th className="px-4 py-3 font-medium">ת״ז</th>
              <th className="px-4 py-3 font-medium">תוקף רישיון</th>
              <th className="px-4 py-3 font-medium">חומ״ס</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  לא נמצאו נהגים.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                <td className="px-4 py-3 text-slate-600">
                  {companyName.get(row.company_id) ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.license_number ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{row.id_number ?? "—"}</td>
                <td className="px-4 py-3">
                  {row.license_expiry ? (
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${EXPIRY_CLS[severityFor(row.license_expiry)]}`}
                    >
                      {row.license_expiry}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.hazmat_certified ? (
                    <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                      מוסמך
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
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
          title={editing === "new" ? "נהג חדש" : `עריכת ${editing.name}`}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">חברה *</label>
              <select
                required
                value={form.company_id}
                onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                className={inputCls}
              >
                <option value="">בחרו חברה…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">שם מלא *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">מס׳ רישיון</label>
                <input
                  value={form.license_number}
                  onChange={(e) => setForm({ ...form, license_number: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">ת״ז</label>
                <input
                  value={form.id_number}
                  onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">תוקף רישיון</label>
                <input
                  type="date"
                  value={form.license_expiry}
                  onChange={(e) => setForm({ ...form, license_expiry: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.hazmat_certified}
                onChange={(e) =>
                  setForm({ ...form, hazmat_certified: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              מוסמך להובלת חומרים מסוכנים
            </label>

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
