"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SAFETY_BRIEFING } from "@/lib/constants";
import {
  submitInspection,
  uploadDefectPhoto,
  type ChecklistLineInput,
} from "@/lib/actions/inspections";
import type {
  ChecklistTemplate,
  Company,
  Driver,
  Vehicle,
} from "@/lib/types";
import SignaturePad from "@/components/SignaturePad";

type LineState = {
  is_intact: boolean; // defaults to true (Pass) — officer only flips to Fail
  remarks: string;
  photo_url: string | null;
  uploading: boolean;
};

const STEP_TITLES = ["רכב ומסמכים", "נהג והדרכה", "רשימת בדיקה", "חתימות"];

export default function InspectionWizard({
  vehicle,
  company,
  drivers,
  template,
  taskId,
}: {
  vehicle: Vehicle;
  company: Company;
  drivers: Driver[];
  template: ChecklistTemplate;
  taskId: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — vehicle docs
  const [insurance, setInsurance] = useState(vehicle.insurance_expiry ?? "");
  const [tachograph, setTachograph] = useState(vehicle.tachograph_expiry ?? "");
  const [registration, setRegistration] = useState(
    vehicle.registration_expiry ?? "",
  );

  // Step 2 — driver
  const [driverId, setDriverId] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [hazmat, setHazmat] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Step 3 — checklist (all items default to Pass)
  const [lines, setLines] = useState<Record<string, LineState>>(() =>
    Object.fromEntries(
      template.items.map((p) => [
        p.key,
        { is_intact: true, remarks: "", photo_url: null, uploading: false },
      ]),
    ),
  );
  const [summary, setSummary] = useState("");

  // Step 4 — signatures
  const [officerSignature, setOfficerSignature] = useState("");
  const [driverSignature, setDriverSignature] = useState("");

  function selectDriver(id: string) {
    setDriverId(id);
    const driver = drivers.find((d) => d.id === id);
    setLicenseNumber(driver?.license_number ?? "");
    setHazmat(driver?.hazmat_certified ?? false);
  }

  function updateLine(key: string, patch: Partial<LineState>) {
    setLines((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function handlePhoto(key: string, file: File) {
    updateLine(key, { uploading: true });
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const url = await uploadDefectPhoto(formData);
      updateLine(key, { photo_url: url, uploading: false });
    } catch {
      updateLine(key, { uploading: false });
      setError("העלאת התמונה נכשלה");
    }
  }

  const canLeaveStep2 = driverId !== "" && acknowledged;
  // Every item starts Pass; only failed items must carry a remark.
  const canLeaveStep3 = template.items.every((p) => {
    const line = lines[p.key];
    return line.is_intact || line.remarks.trim() !== "";
  });
  const canSubmit = officerSignature !== "" && driverSignature !== "";

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payloadLines: ChecklistLineInput[] = template.items.map((p) => {
        const line = lines[p.key];
        return {
          parameter_name: p.label,
          is_intact: line.is_intact,
          remarks: line.is_intact ? null : line.remarks.trim() || null,
          photo_url: line.is_intact ? null : line.photo_url,
        };
      });

      await submitInspection({
        vehicleId: vehicle.id,
        driverId,
        templateId: template.id,
        taskId,
        vehicle: {
          insurance_expiry: insurance || null,
          tachograph_expiry: tachograph || null,
          registration_expiry: registration || null,
        },
        driver: { license_number: licenseNumber || null, hazmat_certified: hazmat },
        summaryRemarks: summary.trim() || null,
        officerSignature,
        driverSignature,
        lines: payloadLines,
      });

      router.push("/");
      router.refresh();
    } catch {
      setError("שמירת הבדיקה נכשלה. נסו שוב.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-500">
          {company.name} · {template.name}
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          {vehicle.license_plate} · {vehicle.model}
        </h1>
      </div>

      <ol className="flex gap-2">
        {STEP_TITLES.map((title, i) => {
          const n = i + 1;
          const state = n < step ? "done" : n === step ? "current" : "upcoming";
          return (
            <li key={title} className="flex-1">
              <div
                className={`rounded-lg px-2 py-1.5 text-center text-xs font-medium ${
                  state === "current"
                    ? "bg-blue-600 text-white"
                    : state === "done"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {n}. {title}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        {step === 1 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">מסמכי רכב</h2>
            <p className="text-sm text-slate-500">
              ודאו ועדכנו את תוקף המסמכים של הרכב.
            </p>
            <Field label="תוקף ביטוח / Insurance">
              <input
                type="date"
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="תוקף טכוגרף / Tachograph">
              <input
                type="date"
                value={tachograph}
                onChange={(e) => setTachograph(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="תוקף רישיון רכב / Registration">
              <input
                type="date"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
                className={inputClass}
              />
            </Field>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">נהג והדרכה</h2>
            <Field label="בחירת נהג / Driver">
              <select
                value={driverId}
                onChange={(e) => selectDriver(e.target.value)}
                className={inputClass}
              >
                <option value="">— בחרו נהג —</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>

            {driverId && (
              <>
                <Field label="מספר רישיון / License number">
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={hazmat}
                    onChange={(e) => setHazmat(e.target.checked)}
                    className="h-4 w-4"
                  />
                  הסמכת חומ״ס / Hazmat certified
                </label>
              </>
            )}

            <div>
              <h3 className="mb-1 text-sm font-medium text-slate-700">
                הדרכה מובנית
              </h3>
              <div className="max-h-56 overflow-y-auto whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
                {SAFETY_BRIEFING}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="h-4 w-4"
              />
              הנהג קרא והבין את ההדרכה
            </label>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{template.name}</h2>
            <p className="text-sm text-slate-500">
              כל הפריטים מסומנים תקין כברירת מחדל. סמנו ״לא תקין״ רק במקרה של ליקוי.
            </p>
            {template.items.map((p) => {
              const line = lines[p.key];
              return (
                <div
                  key={p.key}
                  className="space-y-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{p.label}</span>
                    <div className="flex gap-2">
                      <ToggleButton
                        active={line.is_intact}
                        tone="ok"
                        onClick={() => updateLine(p.key, { is_intact: true })}
                      >
                        תקין
                      </ToggleButton>
                      <ToggleButton
                        active={!line.is_intact}
                        tone="fail"
                        onClick={() => updateLine(p.key, { is_intact: false })}
                      >
                        לא תקין
                      </ToggleButton>
                    </div>
                  </div>

                  {!line.is_intact && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="תיאור הליקוי"
                        value={line.remarks}
                        onChange={(e) =>
                          updateLine(p.key, { remarks: e.target.value })
                        }
                        className={inputClass}
                      />
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhoto(p.key, file);
                          }}
                        />
                        {line.uploading
                          ? "מעלה…"
                          : line.photo_url
                            ? "החלף תמונת ליקוי"
                            : "צרף תמונת ליקוי / Attach Defect Photo"}
                      </label>
                      {line.photo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={line.photo_url}
                          alt="תמונת ליקוי"
                          className="h-24 w-24 rounded-lg object-cover ring-1 ring-slate-200"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <Field label="הערות סיכום / Summary remarks">
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className={inputClass}
              />
            </Field>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-5">
            <h2 className="text-lg font-semibold">חתימות</h2>
            <SignaturePad label="חתימת קצין בטיחות" onChange={setOfficerSignature} />
            <SignaturePad label="חתימת נהג" onChange={setDriverSignature} />
          </section>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
        >
          חזרה
        </button>

        {step < 4 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 2 && !canLeaveStep2) || (step === 3 && !canLeaveStep3)
            }
            className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            הבא
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="rounded-lg bg-green-600 px-6 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-40"
          >
            {submitting ? "שומר…" : "שלח בדיקה"}
          </button>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  tone,
  onClick,
  children,
}: {
  active: boolean;
  tone: "ok" | "fail";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeClass =
    tone === "ok" ? "bg-green-600 text-white" : "bg-red-600 text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
        active ? activeClass : "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}
