import Link from "next/link";
import { getMyCompanies } from "@/lib/actions/officer";
import { SeverityChip } from "@/components/StatusChips";

export const dynamic = "force-dynamic";

export default async function MyCompaniesPage() {
  const companies = await getMyCompanies();

  return (
    <main className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">החברות שלי</h1>

      {companies.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          לא הוקצו לך חברות עדיין — פנה למנהל המערכת
        </p>
      ) : (
        <ul className="space-y-3">
          {companies.map((c) => (
            <li key={c.id}>
              <Link
                href={`/companies/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-blue-400"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">
                    {c.name}
                  </div>
                  <p className="text-sm text-slate-500">
                    {c.vehicleCount} רכבים · {c.driverCount} נהגים
                    {c.openItems > 0 ? ` · ${c.openItems} משימות פתוחות` : ""}
                  </p>
                </div>
                {c.worstSeverity ? (
                  <SeverityChip severity={c.worstSeverity} />
                ) : (
                  <SeverityChip severity="ok" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
