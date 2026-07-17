import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTaskFeed } from "@/lib/actions/tasks";
import { severityFor } from "@/lib/expiry";
import BackLink from "@/components/BackLink";
import CompanyHandler from "@/components/admin/CompanyHandler";
import type { Company, Driver, Profile, Severity, Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

const SEVERITY_CHIP: Record<Severity, { label: string; cls: string }> = {
  expired: { label: "פג תוקף", cls: "bg-red-100 text-red-700" },
  warning: { label: "דורש טיפול", cls: "bg-amber-100 text-amber-700" },
  ok: { label: "תקין", cls: "bg-green-100 text-green-700" },
};

const EXPIRY_CLS: Record<Severity, string> = {
  expired: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
  ok: "bg-green-100 text-green-700",
};

function ExpiryChip({ label, date }: { label: string; date: string | null }) {
  if (!date) return <span className="text-xs text-slate-400">{label}: —</span>;
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${EXPIRY_CLS[severityFor(date)]}`}
    >
      {label} {date}
    </span>
  );
}

// The "company card": everything about one client company in one place —
// details + handler, its open alerts, vehicles, and drivers.
export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const supabase = await createClient();

  const [{ data: companyRaw }, { data: vehicles }, { data: drivers }, { data: profiles }, feed] =
    await Promise.all([
      supabase.from("companies").select("*").eq("id", companyId).single(),
      supabase
        .from("vehicles")
        .select("*")
        .eq("company_id", companyId)
        .order("license_plate"),
      supabase
        .from("drivers")
        .select("*")
        .eq("company_id", companyId)
        .order("name"),
      supabase.from("profiles").select("*").order("full_name"),
      getTaskFeed(),
    ]);

  if (!companyRaw) notFound();
  const company = companyRaw as Company;
  const companyVehicles = (vehicles ?? []) as Vehicle[];
  const companyDrivers = (drivers ?? []) as Driver[];
  const alerts = feed.filter((i) => i.companyId === companyId);
  const expired = alerts.filter((i) => i.severity === "expired").length;

  const details = [
    company.ceo_name ? `מנכ״ל: ${company.ceo_name}` : null,
    company.prof_manager ? `מנהל מקצועי: ${company.prof_manager}` : null,
    company.address ?? null,
  ].filter(Boolean);

  return (
    <main className="space-y-6">
      <BackLink href="/admin/companies" label="חזרה לחברות" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-sm text-slate-500">
            {details.length > 0 ? details.join(" · ") : "אין פרטים נוספים"}
          </p>
        </div>
        <CompanyHandler
          companyId={company.id}
          handlerId={company.handler_id ?? null}
          profiles={(profiles ?? []) as Profile[]}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-medium text-slate-500">רכבים פעילים</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {companyVehicles.filter((v) => v.status === "active").length}
            <span className="text-sm font-normal text-slate-400">
              {" "}/ {companyVehicles.length}
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-medium text-slate-500">נהגים</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {companyDrivers.length}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-medium text-slate-500">התראות פתוחות</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {alerts.length}
            {expired > 0 && (
              <span className="text-sm font-normal text-red-600">
                {" "}· {expired} באיחור
              </span>
            )}
          </p>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-3 font-bold text-slate-900">התראות ומשימות פתוחות</h2>
        {alerts.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            אין התראות פתוחות לחברה זו 🎉
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {alerts.map((item) => {
              const sev = SEVERITY_CHIP[item.severity];
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {item.plate ?? item.driverName ?? ""}
                      {item.dueDate ? ` · יעד ${item.dueDate}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${sev.cls}`}
                  >
                    {sev.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-bold text-slate-900">
            רכבים ({companyVehicles.length})
          </h2>
          <Link
            href="/admin/vehicles"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ניהול רכבים
          </Link>
        </div>
        <div className="overflow-x-auto p-2">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="px-3 py-2 font-medium">מספר רישוי</th>
                <th className="px-3 py-2 font-medium">רכב</th>
                <th className="px-3 py-2 font-medium">סטטוס</th>
                <th className="px-3 py-2 font-medium">תוקפי מסמכים</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companyVehicles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    אין רכבים לחברה זו.
                  </td>
                </tr>
              )}
              {companyVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-900">
                    {v.license_plate}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {[v.make, v.model, v.year].filter(Boolean).join(" ")}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        v.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {v.status === "active" ? "פעיל" : "ממתין"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      <ExpiryChip label="ביטוח" date={v.insurance_expiry} />
                      <ExpiryChip label="טכוגרף" date={v.tachograph_expiry} />
                      <ExpiryChip label="רישוי" date={v.registration_expiry} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-bold text-slate-900">
            נהגים ({companyDrivers.length})
          </h2>
          <Link
            href="/admin/drivers"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ניהול נהגים
          </Link>
        </div>
        <div className="overflow-x-auto p-2">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="px-3 py-2 font-medium">שם</th>
                <th className="px-3 py-2 font-medium">מס׳ רישיון</th>
                <th className="px-3 py-2 font-medium">תוקף רישיון</th>
                <th className="px-3 py-2 font-medium">חומ״ס</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companyDrivers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    אין נהגים לחברה זו.
                  </td>
                </tr>
              )}
              {companyDrivers.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-900">{d.name}</td>
                  <td className="px-3 py-2.5 text-slate-600">
                    {d.license_number ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {d.license_expiry ? (
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-medium ${EXPIRY_CLS[severityFor(d.license_expiry)]}`}
                      >
                        {d.license_expiry}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {d.hazmat_certified ? (
                      <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">
                        מוסמך
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
