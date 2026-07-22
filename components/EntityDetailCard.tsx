import Link from "next/link";
import type { EntityDetail } from "@/lib/actions/officer";
import { MonthlyChip, SeverityChip } from "@/components/StatusChips";

// Officer-facing entity card (vehicle or driver): status, documents with
// expiry chips, pending tasks, and the relevant actions. Server component —
// rendered by /vehicles/[id] and /drivers/[id].
export default function EntityDetailCard({ detail }: { detail: EntityDetail }) {
  const isVehicle = detail.entityType === "vehicle";
  const addDocHref = `/documents/new?entity_type=${detail.entityType}&entity_id=${detail.entityId}`;

  return (
    <main className="space-y-6">
      <div>
        <Link href={`/companies/${detail.companyId}`} className="text-sm text-blue-600">
          → {detail.companyName}
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{detail.label}</h1>
          {isVehicle && detail.monthlyDone !== undefined && (
            <MonthlyChip done={detail.monthlyDone} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={
            isVehicle
              ? `/inspect/${detail.entityId}`
              : `/train/${detail.entityId}`
          }
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {isVehicle ? "בצע בדיקה" : "בצע הדרכה"}
        </Link>
        <Link
          href={addDocHref}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:ring-blue-400"
        >
          + הוסף מסמך
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          מסמכים ({detail.documents.length})
        </h2>
        {detail.documents.length === 0 ? (
          <p className="text-sm text-slate-500">אין מסמכים.</p>
        ) : (
          <ul className="space-y-2">
            {detail.documents.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/renew/${doc.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-blue-400"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">
                      {doc.doc_type}
                    </div>
                    <p className="text-sm text-slate-500">
                      {doc.expiry_date
                        ? `בתוקף עד ${doc.expiry_date}`
                        : "ללא תאריך תפוגה"}
                    </p>
                  </div>
                  {doc.expiry_date && <SeverityChip severity={doc.severity} />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          משימות פתוחות ({detail.pendingTasks.length})
        </h2>
        {detail.pendingTasks.length === 0 ? (
          <p className="text-sm text-slate-500">אין משימות פתוחות.</p>
        ) : (
          <ul className="space-y-2">
            {detail.pendingTasks.map((t) => (
              <li key={t.id}>
                <Link
                  href={
                    t.task_type === "training"
                      ? `/train/${t.entity_id}?task=${t.id}`
                      : `/inspect/${t.entity_id}?task=${t.id}&template=${t.template_id ?? ""}`
                  }
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-blue-400"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">
                      {t.title}
                    </div>
                    {t.due_date && (
                      <p className="text-sm text-slate-500">יעד {t.due_date}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
