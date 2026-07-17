"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TRAINING_MODULES } from "@/lib/constants";
import { submitTraining } from "@/lib/actions/trainings";
import type { Driver } from "@/lib/types";
import SignaturePad from "@/components/SignaturePad";

export default function TrainingFlow({
  driver,
  hasOfficerSignature,
  taskId,
  returnTo,
}: {
  driver: Driver;
  hasOfficerSignature: boolean;
  taskId: string | null;
  returnTo: string;
}) {
  const router = useRouter();
  const [moduleType, setModuleType] = useState(TRAINING_MODULES[0].type);
  const [acknowledged, setAcknowledged] = useState(false);
  const [driverSignature, setDriverSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModule = TRAINING_MODULES.find((m) => m.type === moduleType)!;
  const canSubmit = acknowledged && driverSignature !== "";

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await submitTraining({
        driverId: driver.id,
        type: selectedModule.title,
        driverSignature,
        taskId,
      });
      router.push("/");
      router.refresh();
    } catch {
      setError("שמירת ההדרכה נכשלה. נסו שוב.");
      setSubmitting(false);
    }
  }

  if (!hasOfficerSignature) {
    return (
      <div className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-slate-700">
          יש לשמור חתימת קצין בטיחות בפרופיל לפני ביצוע הדרכה.
        </p>
        <Link
          href={`/profile?returnTo=${encodeURIComponent(returnTo)}`}
          className="inline-block rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700"
        >
          מעבר לפרופיל
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">הדרכת נהג</p>
        <h1 className="text-2xl font-bold text-slate-900">{driver.name}</h1>
      </div>

      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">
            מודול הדרכה
          </label>
          <select
            value={moduleType}
            onChange={(e) => {
              setModuleType(e.target.value);
              setAcknowledged(false);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
          >
            {TRAINING_MODULES.map((m) => (
              <option key={m.type} value={m.type}>
                {m.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="mb-1 text-sm font-medium text-slate-700">חומר הדרכה</h3>
          <div className="whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
            {selectedModule.material}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="h-4 w-4"
          />
          הנהג קרא והבין את חומר ההדרכה
        </label>

        <SignaturePad label="חתימת נהג" onChange={setDriverSignature} />
        <p className="text-xs text-slate-500">
          חתימת קצין הבטיחות תצורף אוטומטית מהפרופיל.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="w-full rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-40"
        >
          {submitting ? "שומר…" : "סיום הדרכה"}
        </button>
      </div>
    </div>
  );
}
