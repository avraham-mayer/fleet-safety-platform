"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "@/components/SignaturePad";
import { saveSignature } from "@/lib/actions/profile";

// Lets the officer capture/replace the signature that is auto-appended to
// every training record. Required before the training flow can be used.
export default function ProfileSignature({
  initialSignature,
}: {
  initialSignature: string | null;
}) {
  const router = useRouter();
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveSignature(signature);
      setSaved(true);
      router.refresh();
    } catch {
      setError("שמירת החתימה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      {initialSignature && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">חתימה שמורה</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={initialSignature}
            alt="חתימה שמורה"
            className="h-24 rounded-lg border border-slate-200 bg-white"
          />
        </div>
      )}

      <SignaturePad
        label={initialSignature ? "החתמה מחדש" : "צייר חתימה"}
        onChange={setSignature}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">החתימה נשמרה ✓</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={!signature || saving}
        className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
      >
        {saving ? "שומר…" : "שמור חתימה"}
      </button>
    </div>
  );
}
