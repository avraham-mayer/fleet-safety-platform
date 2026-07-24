import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTaskFeed } from "@/lib/actions/tasks";
import {
  saveCompany,
  deleteCompany,
  archiveRecord,
  unarchiveRecord,
} from "@/lib/actions/admin";
import { severityFor } from "@/lib/expiry";
import DeleteButton from "@/components/admin/DeleteButton";
import ArchiveButton from "@/components/admin/ArchiveButton";
import AlertsPanel from "@/components/admin/AlertsPanel";
import {
  Card,
  Field,
  inputCls,
  submitCls,
  SeverityChip,
  Table,
  tdCls,
} from "@/components/admin/ui";
import type { Company, Document, Driver, Profile, Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "vehicles", label: "רכבים" },
  { key: "drivers", label: "נהגים" },
  { key: "alerts", label: "התראות" },
  { key: "details", label: "פרטי חברה" },
] as const;

// Company drilldown (legacy-style): vehicles / drivers / alerts / details tabs.
export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ tab?: string; archived?: string }>;
}) {
  const { companyId } = await params;
  const { tab = "vehicles", archived } = await searchParams;
  const showArchived = archived === "1";
  const supabase = await createClient();

  const { data: companyRow } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();
  if (!companyRow) notFound();
  const company = companyRow as Company;

  let vehiclesQuery = supabase
    .from("vehicles")
    .select("*")
    .eq("company_id", companyId)
    .order("license_plate");
  let driversQuery = supabase
    .from("drivers")
    .select("*")
    .eq("company_id", companyId)
    .order("name");
  // Default view = active only; ?archived=1 flips to the archive list.
  vehiclesQuery = showArchived
    ? vehiclesQuery.not("archived_at", "is", null)
    : vehiclesQuery.is("archived_at", null);
  driversQuery = showArchived
    ? driversQuery.not("archived_at", "is", null)
    : driversQuery.is("archived_at", null);

  const [{ data: vehicles }, { data: drivers }, { data: docs }, { data: profiles }] =
    await Promise.all([
      vehiclesQuery,
      driversQuery,
      supabase.from("documents").select("*").eq("company_id", companyId),
      supabase.from("profiles").select("*").order("full_name"),
    ]);

  const handlerName = new Map(
    ((profiles ?? []) as Profile[]).map((p) => [p.id, p.full_name ?? ""]),
  );

  // Worst document severity per entity for the summary chips.
  const worstDoc = new Map<string, "expired" | "warning" | "ok">();
  const rank = { expired: 0, warning: 1, ok: 2 } as const;
  for (const d of (docs ?? []) as Document[]) {
    const sev = severityFor(d.expiry_date);
    const prev = worstDoc.get(d.entity_id);
    if (!prev || rank[sev] < rank[prev]) worstDoc.set(d.entity_id, sev);
  }

  const feed =
    tab === "alerts"
      ? (await getTaskFeed()).filter((i) => i.companyId === companyId)
      : [];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-sm text-slate-500">
            {(vehicles ?? []).length} רכבים · {(drivers ?? []).length} נהגים
            {company.handler_id
              ? ` · מטפל: ${handlerName.get(company.handler_id) ?? ""}`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/vehicles/new?company=${companyId}`}
            className={submitCls}
          >
            + רכב
          </Link>
          <Link
            href={`/admin/drivers/new?company=${companyId}`}
            className={submitCls}
          >
            + נהג
          </Link>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/companies/${companyId}?tab=${t.key}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {(tab === "vehicles" || tab === "drivers") && (
        <div className="no-print -mb-2 flex justify-end">
          <Link
            href={`/admin/companies/${companyId}?tab=${tab}${showArchived ? "" : "&archived=1"}`}
            className="rounded-lg px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            {showArchived ? "→ הצג פעילים" : "הצג ארכיון ←"}
          </Link>
        </div>
      )}

      {tab === "vehicles" && (
        <Card>
          <Table
            headers={["מס' רישוי", "דגם", "סוג רכב", "מטפל", "מצב מסמכים", ""]}
            empty={(vehicles ?? []).length === 0}
          >
            {((vehicles ?? []) as Vehicle[]).map((v) => (
              <tr key={v.id} className="transition hover:bg-slate-50">
                <td className={tdCls}>
                  <Link
                    href={`/admin/vehicles/${v.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {v.license_plate}
                  </Link>
                </td>
                <td className={tdCls}>{v.model}</td>
                <td className={tdCls}>{v.vehicle_type ?? "—"}</td>
                <td className={tdCls}>
                  {v.handler_id ? (handlerName.get(v.handler_id) ?? "—") : "—"}
                </td>
                <td className={tdCls}>
                  {worstDoc.has(v.id) ? (
                    <SeverityChip severity={worstDoc.get(v.id)!} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`${tdCls} text-left`}>
                  <ArchiveButton
                    action={showArchived ? unarchiveRecord : archiveRecord}
                    fields={{ table: "vehicles", id: v.id }}
                    mode={showArchived ? "restore" : "archive"}
                  />
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "drivers" && (
        <Card>
          <Table
            headers={["שם הנהג", "מס' רישיון", "ת. זהות", "דרגה", "מטפל", "מצב מסמכים", ""]}
            empty={(drivers ?? []).length === 0}
          >
            {((drivers ?? []) as Driver[]).map((d) => (
              <tr key={d.id} className="transition hover:bg-slate-50">
                <td className={tdCls}>
                  <Link
                    href={`/admin/drivers/${d.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {d.name}
                  </Link>
                </td>
                <td className={tdCls}>{d.license_number ?? "—"}</td>
                <td className={tdCls}>{d.id_number ?? "—"}</td>
                <td className={tdCls}>{d.license_type ?? "—"}</td>
                <td className={tdCls}>
                  {d.handler_id ? (handlerName.get(d.handler_id) ?? "—") : "—"}
                </td>
                <td className={tdCls}>
                  {worstDoc.has(d.id) ? (
                    <SeverityChip severity={worstDoc.get(d.id)!} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className={`${tdCls} text-left`}>
                  <ArchiveButton
                    action={showArchived ? unarchiveRecord : archiveRecord}
                    fields={{ table: "drivers", id: d.id }}
                    mode={showArchived ? "restore" : "archive"}
                  />
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === "alerts" && (
        <Card>
          <AlertsPanel
            items={feed}
            handlers={((profiles ?? []) as Profile[]).map((p) => ({
              id: p.id,
              name: p.full_name ?? "",
            }))}
          />
        </Card>
      )}

      {tab === "details" && (
        <Card title="פרטי חברה">
          <form action={saveCompany} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <input type="hidden" name="id" value={company.id} />
            <Field label="שם החברה" className="col-span-2">
              <input name="name" defaultValue={company.name} required className={inputCls} />
            </Field>
            <Field label='מנכ"ל'>
              <input name="ceo_name" defaultValue={company.ceo_name ?? ""} className={inputCls} />
            </Field>
            <Field label="מנהל מקצועי">
              <input name="prof_manager" defaultValue={company.prof_manager ?? ""} className={inputCls} />
            </Field>
            <Field label="כתובת" className="col-span-2">
              <input name="address" defaultValue={company.address ?? ""} className={inputCls} />
            </Field>
            <Field label="טלפון">
              <input name="phone" defaultValue={company.phone ?? ""} className={inputCls} />
            </Field>
            <Field label="מטפל אחראי">
              <select name="handler_id" defaultValue={company.handler_id ?? ""} className={inputCls}>
                <option value="">—</option>
                {((profiles ?? []) as Profile[]).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="הערות" className="col-span-2 lg:col-span-4">
              <textarea name="notes" rows={2} defaultValue={company.notes ?? ""} className={inputCls} />
            </Field>
            <div className="col-span-2 flex items-center justify-between lg:col-span-4">
              <button type="submit" className={submitCls}>
                שמירה
              </button>
            </div>
          </form>
          {company.archived_at && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              חברה בארכיון מאז{" "}
              {new Date(company.archived_at).toLocaleDateString("he-IL")}
              {company.archive_reason ? ` · סיבה: ${company.archive_reason}` : ""}
            </p>
          )}
          <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
            <ArchiveButton
              action={company.archived_at ? unarchiveRecord : archiveRecord}
              fields={{ table: "companies", id: company.id }}
              mode={company.archived_at ? "restore" : "archive"}
            />
            <DeleteButton
              action={deleteCompany}
              fields={{ id: company.id }}
              label="מחיקת חברה"
              confirmText="למחוק את החברה על כל הרכבים, הנהגים והמסמכים שלה?"
            />
          </div>
        </Card>
      )}
    </div>
  );
}
