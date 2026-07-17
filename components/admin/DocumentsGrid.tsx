"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/admin/Modal";
import { saveDocument, deleteDocument } from "@/lib/actions/admin";
import { severityFor } from "@/lib/expiry";
import { VEHICLE_DOC_TYPES, DRIVER_DOC_TYPES } from "@/lib/constants";
import type { Document, EntityType, Severity } from "@/lib/types";

const SEVERITY_CHIP: Record<Severity, { label: string; cls: string }> = {
  expired: { label: "פג תוקף", cls: "bg-red-100 text-red-700" },
  warning: { label: "עומד לפוג", cls: "bg-amber-100 text-amber-700" },
  ok: { label: "בתוקף", cls: "bg-green-100 text-green-700" },
};

export type DocumentRow = Document & {
  entity_label: string;
  company_name: string;
};

export type EntityOption = { id: string; label: string };

const EMPTY = {
  entity_type: "vehicle" as EntityType,
  entity_id: "",
  doc_type: VEHICLE_DOC_TYPES[0] as string,
  expiry_date: "",
  issued_date: "",
};

export default function DocumentsGrid({
  rows,
  vehicleOptions,
  driverOptions,
}: {
  rows: DocumentRow[];
  vehicleOptions: EntityOption[];
  driverOptions: EntityOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<DocumentRow | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(row: DocumentRow | "new") {
    setEditing(row);
    setError(null);
    setForm(
      row === "new"
        ? EMPTY
        : {
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            doc_type: row.doc_type,
            expiry_date: row.expiry_date ?? "",
            issued_date: row.issued_date ?? "",
          },
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await saveDocument({
      id: editing === "new" ? undefined : editing?.id,
      entity_type: form.entity_type,
      entity_id: form.entity_id,
      doc_type: form.doc_type,
      expiry_date: form.expiry_date,
      issued_date: form.issued_date || null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function handleDelete(row: DocumentRow) {
    if (!window.confirm(`למחוק את המסמך "${row.doc_type}" של ${row.entity_label}?`))
      return;
    const res = await deleteDocument(row.id);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    router.refresh();
  }

  const entityOptions =
    form.entity_type === "vehicle" ? vehicleOptions : driverOptions;

  // Type options follow the owning entity; keep a legacy/free-text value
  // visible when editing a row whose type predates the current lists.
  const baseDocTypes: readonly string[] =
    form.entity_type === "vehicle" ? VEHICLE_DOC_TYPES : DRIVER_DOC_TYPES;
  const docTypeOptions =
    form.doc_type && !baseDocTypes.includes(form.doc_type)
      ? [form.doc_type, ...baseDocTypes]
      : baseDocTypes;

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none";

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">מסמכי ציות</h1>
          <p className="text-sm text-slate-500">
            {rows.length} מסמכים · התראות חידוש נגזרות מתאריכי התפוגה כאן
          </p>
        </div>
        <button
          onClick={() => open("new")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          + מסמך חדש
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-right text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500">
              <th className="px-4 py-3 font-medium">סוג מסמך</th>
              <th className="px-4 py-3 font-medium">שייך ל־</th>
              <th className="px-4 py-3 font-medium">חברה</th>
              <th className="px-4 py-3 font-medium">בוצע</th>
              <th className="px-4 py-3 font-medium">תוקף</th>
              <th className="px-4 py-3 font-medium">סטטוס</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  אין מסמכים עדיין — הוסיפו מסמכי בסיס כדי לקבל התראות חידוש.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const sev = SEVERITY_CHIP[severityFor(row.expiry_date)];
              return (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.doc_type}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                      {row.entity_type === "vehicle" ? "רכב" : "נהג"}
                    </span>
                    {row.entity_label}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.company_name}</td>
                  <td className="px-4 py-3 text-slate-600">{row.issued_date ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{row.expiry_date ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sev.cls}`}
                    >
                      {sev.label}
                    </span>
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
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal
          title={editing === "new" ? "מסמך חדש" : "עריכת מסמך"}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">שייך ל־ *</label>
                <select
                  value={form.entity_type}
                  onChange={(e) => {
                    const entityType = e.target.value as EntityType;
                    setForm({
                      ...form,
                      entity_type: entityType,
                      entity_id: "",
                      doc_type: (entityType === "vehicle"
                        ? VEHICLE_DOC_TYPES
                        : DRIVER_DOC_TYPES)[0],
                    });
                  }}
                  className={inputCls}
                >
                  <option value="vehicle">רכב</option>
                  <option value="driver">נהג</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  {form.entity_type === "vehicle" ? "רכב *" : "נהג *"}
                </label>
                <select
                  required
                  value={form.entity_id}
                  onChange={(e) => setForm({ ...form, entity_id: e.target.value })}
                  className={inputCls}
                >
                  <option value="">בחרו…</option>
                  {entityOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">סוג מסמך *</label>
              <select
                value={form.doc_type}
                onChange={(e) => setForm({ ...form, doc_type: e.target.value })}
                className={inputCls}
              >
                {docTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">בוצע בתאריך</label>
                <input
                  type="date"
                  value={form.issued_date}
                  onChange={(e) => setForm({ ...form, issued_date: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">תאריך תפוגה *</label>
                <input
                  type="date"
                  required
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  className={inputCls}
                />
              </div>
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
