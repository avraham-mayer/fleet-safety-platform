"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renewDocument } from "@/lib/actions/documents";
import type { Document } from "@/lib/types";

export default function DocumentRenewal({
  document,
  entityLabel,
}: {
  document: Document;
  entityLabel: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await renewDocument(new FormData(e.currentTarget));
      router.push("/");
      router.refresh();
    } catch {
      setError("שמירת המסמך נכשלה. נסו שוב.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">חידוש מסמך</p>
        <h1 className="text-2xl font-bold text-slate-900">{document.doc_type}</h1>
        <p className="text-sm text-slate-500">
          {entityLabel}
          {document.expiry_date ? ` · תוקף נוכחי ${document.expiry_date}` : ""}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
      >
        <input type="hidden" name="documentId" value={document.id} />

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            צילום המסמך החדש
          </label>
          <input
            type="file"
            name="file"
            accept="image/*"
            capture="environment"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            תאריך תפוגה חדש
          </label>
          <input
            type="date"
            name="expiryDate"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-40"
        >
          {submitting ? "שומר…" : "שמור חידוש"}
        </button>
      </form>
    </div>
  );
}
