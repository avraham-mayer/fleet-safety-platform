"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDocument } from "@/lib/actions/documents";
import type { DocEntityType, DocType } from "@/lib/types";

// New-document capture form (officer flow): pick a doc type from the catalog,
// snap a photo, optional expiry (prefilled from the type's recurrence_months).
export default function DocumentCapture({
  entityType,
  entityId,
  entityLabel,
  docTypes,
}: {
  entityType: DocEntityType;
  entityId: string;
  entityLabel: string;
  docTypes: DocType[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiry, setExpiry] = useState("");

  const backHref =
    entityType === "vehicle"
      ? `/vehicles/${entityId}`
      : entityType === "driver"
        ? `/drivers/${entityId}`
        : `/companies/${entityId}`;

  function prefillExpiry(docTypeId: string) {
    const dt = docTypes.find((t) => t.id === docTypeId);
    if (dt?.recurrence_months) {
      const next = new Date();
      next.setMonth(next.getMonth() + dt.recurrence_months);
      setExpiry(next.toISOString().slice(0, 10));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await addDocument(new FormData(e.currentTarget));
      router.push(backHref);
      router.refresh();
    } catch {
      setError("שמירת המסמך נכשלה. נסו שוב.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">מסמך חדש</p>
        <h1 className="text-2xl font-bold text-slate-900">{entityLabel}</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <input type="hidden" name="entityType" value={entityType} />
        <input type="hidden" name="entityId" value={entityId} />

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">סוג מסמך</label>
          <select
            name="docTypeId"
            required
            defaultValue=""
            onChange={(e) => prefillExpiry(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            <option value="" disabled>
              בחר סוג מסמך…
            </option>
            {docTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            צילום המסמך
          </label>
          <input
            type="file"
            name="file"
            accept="image/*"
            capture="environment"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            תאריך תפוגה (אופציונלי)
          </label>
          <input
            type="date"
            name="expiryDate"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-40"
        >
          {submitting ? "שומר…" : "שמור מסמך"}
        </button>
      </form>
    </div>
  );
}
