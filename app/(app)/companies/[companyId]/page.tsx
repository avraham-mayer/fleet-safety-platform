import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyStatus } from "@/lib/actions/officer";
import { MonthlyChip, SeverityChip } from "@/components/StatusChips";

export const dynamic = "force-dynamic";

export default async function CompanyStatusPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const status = await getCompanyStatus(companyId);
  if (!status) notFound();
  const { company, vehicles, drivers, companyDocuments } = status;

  return (
    <main className="space-y-6">
      <div>
        <Link href="/companies" className="text-sm text-blue-600">
          → כל החברות
        </Link>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <Link
            href={`/documents/new?entity_type=company&entity_id=${company.id}`}
            className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:ring-blue-400"
          >
            + מסמך חברה
          </Link>
        </div>
      </div>

      {companyDocuments.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            מסמכי חברה ({companyDocuments.length})
          </h2>
          <ul className="space-y-2">
            {companyDocuments.map((doc) => (
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
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          רכבים ({vehicles.length})
        </h2>
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-500">אין רכבים לחברה זו.</p>
        ) : (
          <ul className="space-y-2">
            {vehicles.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/vehicles/${v.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-blue-400"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">
                      {v.license_plate}
                    </div>
                    <p className="truncate text-sm text-slate-500">
                      {v.model}
                      {v.pendingTasks > 0
                        ? ` · ${v.pendingTasks} משימות פתוחות`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {v.status === "active" && <MonthlyChip done={v.monthlyDone} />}
                    {v.docSeverity && v.docSeverity !== "ok" && (
                      <SeverityChip severity={v.docSeverity} />
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          נהגים ({drivers.length})
        </h2>
        {drivers.length === 0 ? (
          <p className="text-sm text-slate-500">אין נהגים לחברה זו.</p>
        ) : (
          <ul className="space-y-2">
            {drivers.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/drivers/${d.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-blue-400"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{d.name}</div>
                    <p className="truncate text-sm text-slate-500">
                      {d.license_expiry
                        ? `רישיון עד ${d.license_expiry}`
                        : "אין תוקף רישיון"}
                      {d.pendingTasks > 0
                        ? ` · ${d.pendingTasks} משימות פתוחות`
                        : ""}
                    </p>
                  </div>
                  {d.docSeverity && d.docSeverity !== "ok" && (
                    <SeverityChip severity={d.docSeverity} />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
