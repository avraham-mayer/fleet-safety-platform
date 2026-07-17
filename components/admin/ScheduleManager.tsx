"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { scheduleTask, cancelTask } from "@/lib/actions/admin";
import { severityFor } from "@/lib/expiry";
import { TRAINING_MODULES } from "@/lib/constants";
import type { ChecklistTemplate, Severity, Task } from "@/lib/types";

const SEVERITY_CHIP: Record<Severity, { label: string; cls: string }> = {
  expired: { label: "באיחור", cls: "bg-red-100 text-red-700" },
  warning: { label: "קרוב", cls: "bg-amber-100 text-amber-700" },
  ok: { label: "מתוזמן", cls: "bg-green-100 text-green-700" },
};

const KIND_BADGE: Record<Task["task_type"], { label: string; cls: string }> = {
  inspection: { label: "בדיקה", cls: "bg-blue-50 text-blue-700" },
  training: { label: "הדרכה", cls: "bg-violet-50 text-violet-700" },
  document: { label: "מסמך", cls: "bg-slate-100 text-slate-600" },
};

export type TaskRow = Task & { entity_label: string; company_name: string };
export type EntityOption = { id: string; label: string };

export default function ScheduleManager({
  pending,
  resolved,
  vehicleOptions,
  driverOptions,
  templates,
}: {
  pending: TaskRow[];
  resolved: TaskRow[];
  vehicleOptions: EntityOption[];
  driverOptions: EntityOption[];
  templates: ChecklistTemplate[];
}) {
  const router = useRouter();
  const [taskType, setTaskType] = useState<"inspection" | "training">("inspection");
  const [entityId, setEntityId] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [module, setModule] = useState(TRAINING_MODULES[0]?.title ?? "");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(false);

    const isInspection = taskType === "inspection";
    const res = await scheduleTask({
      task_type: taskType,
      entity_id: entityId,
      // Inspections take the template's name server-side; trainings use the module title.
      title: isInspection ? "" : module,
      due_date: dueDate,
      template_id: isInspection ? templateId : null,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEntityId("");
    setDueDate("");
    setCreated(true);
    router.refresh();
  }

  async function handleCancel(row: TaskRow) {
    if (!window.confirm(`לבטל את המשימה "${row.title}" של ${row.entity_label}?`))
      return;
    const res = await cancelTask(row.id);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    router.refresh();
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none";

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">תזמון משימות</h1>
        <p className="text-sm text-slate-500">
          בדיקות מתוזמנות והדרכות נכנסות לפיד המשימות של קצין הבטיחות. הבדיקה
          החודשית נגזרת אוטומטית ואינה דורשת תזמון.
        </p>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-4 font-bold text-slate-900">משימה חדשה</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">סוג משימה</label>
            <select
              value={taskType}
              onChange={(e) => {
                setTaskType(e.target.value as "inspection" | "training");
                setEntityId("");
              }}
              className={inputCls}
            >
              <option value="inspection">בדיקה מתוזמנת</option>
              <option value="training">הדרכת נהג</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              {taskType === "inspection" ? "רכב *" : "נהג *"}
            </label>
            <select
              required
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className={inputCls}
            >
              <option value="">בחרו…</option>
              {(taskType === "inspection" ? vehicleOptions : driverOptions).map(
                (o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              {taskType === "inspection" ? "תבנית בדיקה *" : "מודול הדרכה *"}
            </label>
            {taskType === "inspection" ? (
              <select
                required
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className={inputCls}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                required
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className={inputCls}
              >
                {TRAINING_MODULES.map((m) => (
                  <option key={m.type} value={m.title}>
                    {m.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">תאריך יעד *</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="lg:col-span-4">
            {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
            {created && (
              <p className="mb-2 text-sm text-green-600">המשימה תוזמנה ✓</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "מתזמן…" : "תזמון משימה"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <h2 className="px-5 pt-5 font-bold text-slate-900">
          משימות ממתינות ({pending.length})
        </h2>
        <div className="overflow-x-auto p-2">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="px-3 py-2 font-medium">סוג</th>
                <th className="px-3 py-2 font-medium">משימה</th>
                <th className="px-3 py-2 font-medium">שייך ל־</th>
                <th className="px-3 py-2 font-medium">חברה</th>
                <th className="px-3 py-2 font-medium">יעד</th>
                <th className="px-3 py-2 font-medium">סטטוס</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    אין משימות ממתינות.
                  </td>
                </tr>
              )}
              {pending.map((row) => {
                const sev = SEVERITY_CHIP[severityFor(row.due_date)];
                const kind = KIND_BADGE[row.task_type];
                return (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${kind.cls}`}
                      >
                        {kind.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {row.title}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{row.entity_label}</td>
                    <td className="px-3 py-2.5 text-slate-600">{row.company_name}</td>
                    <td className="px-3 py-2.5 text-slate-600">{row.due_date ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sev.cls}`}
                      >
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleCancel(row)}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        >
                          ביטול
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {resolved.length > 0 && (
        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <h2 className="px-5 pt-5 font-bold text-slate-900">הושלמו לאחרונה</h2>
          <div className="overflow-x-auto p-2">
            <table className="w-full text-right text-sm">
              <tbody className="divide-y divide-slate-100">
                {resolved.map((row) => (
                  <tr key={row.id} className="text-slate-500">
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${KIND_BADGE[row.task_type].cls}`}
                      >
                        {KIND_BADGE[row.task_type].label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{row.title}</td>
                    <td className="px-3 py-2.5">{row.entity_label}</td>
                    <td className="px-3 py-2.5">{row.company_name}</td>
                    <td className="px-3 py-2.5">
                      הושלמה{" "}
                      {row.resolved_at
                        ? new Date(row.resolved_at).toLocaleDateString("he-IL")
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
