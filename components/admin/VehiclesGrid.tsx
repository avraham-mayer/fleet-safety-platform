"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/admin/Modal";
import { saveVehicle, deleteVehicle } from "@/lib/actions/admin";
import { severityFor } from "@/lib/expiry";
import type { Company, Severity, Vehicle } from "@/lib/types";

const EXPIRY_CLS: Record<Severity, string> = {
  expired: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  ok: "bg-green-100 text-green-700",
};

const EMPTY = {
  company_id: "",
  license_plate: "",
  model: "",
  make: "",
  year: "",
  fuel_type: "",
  mileage: "",
  status: "active" as Vehicle["status"],
  insurance_expiry: "",
  tachograph_expiry: "",
  registration_expiry: "",
};

// Compact expiry chip: label + date, colored by proximity to expiry.
function ExpiryChip({ label, date }: { label: string; date: string | null }) {
  if (!date) return <span className="text-xs text-slate-400">{label}: —</span>;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${EXPIRY_CLS[severityFor(date)]}`}
    >
      {label} {date}
    </span>
  );
}

export default function VehiclesGrid({
  rows,
  companies,
}: {
  rows: Vehicle[];
  companies: Company[];
}) {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Vehicle | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyName = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  );

  const filtered = rows.filter((v) => {
    if (company && v.company_id !== company) return false;
    if (search) {
      const q = search.trim().toLowerCase();
      const hay = `${v.license_plate} ${v.model} ${v.make ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  function open(row: Vehicle | "new") {
    setEditing(row);
    setError(null);
    setForm(
      row === "new"
        ? { ...EMPTY, company_id: companies[0]?.id ?? "" }
        : {
            company_id: row.company_id,
            license_plate: row.license_plate,
            model: row.model,
            make: row.make ?? "",
            year: row.year != null ? String(row.year) : "",
            fuel_type: row.fuel_type ?? "",
            mileage: row.mileage != null ? String(row.mileage) : "",
            status: row.status,
            insurance_expiry: row.insurance_expiry ?? "",
            tachograph_expiry: row.tachograph_expiry ?? "",
            registration_expiry: row.registration_expiry ?? "",
          },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveVehicle({
      id: editing === "new" ? undefined : editing?.id,
      company_id: form.company_id,
      license_plate: form.license_plate,
      model: form.model,
      make: form.make || null,
      year: form.year ? Number(form.year) : null,
      fuel_type: form.fuel_type || null,
      mileage: form.mileage ? Number(form.mileage) : null,
      status: form.status,
      insurance_expiry: form.insurance_expiry || null,
      tachograph_expiry: form.tachograph_expiry || null,
      registration_expiry: form.registration_expiry || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(row: Vehicle) {
    if (
      !window.confirm(
        `למחוק את הרכב ${row.license_plate}? היסטוריית הבדיקות שלו תימחק.`,
      )
    )
      return;
    const res = await deleteVehicle(row.id);
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
          <h1 className="text-2xl font-bold text-slate-900">רכבים</h1>
          <p className="text-sm text-slate-500">
            {rows.length} רכבים · {rows.filter((v) => v.status === "active").length} פעילים
          </p>
        </div>
        <button
          onClick={() => open("new")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + רכב חדש
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
          placeholder="חיפוש לפי מספר רישוי או דגם"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">מספר רישוי</th>
              <th className="px-4 py-3 font-medium">רכב</th>
              <th className="px-4 py-3 font-medium">חברה</th>
              <th className="px-4 py-3 font-medium">ק״מ</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3 font-medium">תוקפי מסמכים</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  לא נמצאו רכבים.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {row.license_plate}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {[row.make, row.model, row.year].filter(Boolean).join(" ")}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {companyName.get(row.company_id) ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {row.mileage != null ? row.mileage.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {row.status === "active" ? "פעיל" : "ממתין"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <ExpiryChip label="ביטוח" date={row.insurance_expiry} />
                    <ExpiryChip label="טכוגרף" date={row.tachograph_expiry} />
                    <ExpiryChip label="רישוי" date={row.registration_expiry} />
                  </div>
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
          title={editing === "new" ? "רכב חדש" : `עריכת רכב ${editing.license_plate}`}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">מספר רישוי *</label>
                <input
                  required
                  value={form.license_plate}
                  onChange={(e) => setForm({ ...form, license_plate: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">סטטוס</label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as Vehicle["status"] })
                  }
                  className={inputCls}
                >
                  <option value="active">פעיל</option>
                  <option value="pending">ממתין</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">יצרן</label>
                <input
                  value={form.make}
                  onChange={(e) => setForm({ ...form, make: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">דגם *</label>
                <input
                  required
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">שנת ייצור</label>
                <input
                  type="number"
                  min={1990}
                  max={2100}
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">סוג דלק</label>
                <input
                  value={form.fuel_type}
                  onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">קילומטראז׳</label>
                <input
                  type="number"
                  min={0}
                  value={form.mileage}
                  onChange={(e) => setForm({ ...form, mileage: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-sm font-medium text-slate-700">
                תוקפי מסמכים
              </legend>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">ביטוח</label>
                  <input
                    type="date"
                    value={form.insurance_expiry}
                    onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">טכוגרף</label>
                  <input
                    type="date"
                    value={form.tachograph_expiry}
                    onChange={(e) => setForm({ ...form, tachograph_expiry: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">רישוי</label>
                  <input
                    type="date"
                    value={form.registration_expiry}
                    onChange={(e) =>
                      setForm({ ...form, registration_expiry: e.target.value })
                    }
                    className={inputCls}
                  />
                </div>
              </div>
            </fieldset>

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
