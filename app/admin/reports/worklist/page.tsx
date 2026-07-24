import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTaskFeed } from "@/lib/actions/tasks";
import PrintButton from "@/components/admin/PrintButton";
import { SeverityChip, thCls, tdCls } from "@/components/admin/ui";
import type { FeedItem, Profile, TaskType } from "@/lib/types";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<TaskType, string> = {
  inspection: "בדיקה",
  training: "הדרכה",
  document: "מסמך",
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("he-IL");
}

// Monthly work list (יומן עבודה) — the legacy program's core deliverable:
// a printable sheet of everything due, grouped by company. Reuses the same
// aggregated feed the officer dashboard is built from, so it can never drift
// from what officers actually see. Filter by handler / company / type, then
// print or save as PDF.
export default async function WorklistReportPage({
  searchParams,
}: {
  searchParams: Promise<{ handler?: string; company?: string; kind?: string }>;
}) {
  const { handler, company, kind } = await searchParams;
  const supabase = await createClient();

  const [{ data: profiles }, { data: companies }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("companies").select("id, name").order("name"),
  ]);
  const handlerName = new Map(
    ((profiles ?? []) as Profile[]).map((p) => [p.id, p.full_name ?? ""]),
  );

  let items = await getTaskFeed(handler ? { forHandlerId: handler } : undefined);
  if (company) items = items.filter((i) => i.companyId === company);
  if (kind) items = items.filter((i) => i.kind === kind);

  // Group by company, preserving the feed's severity ordering within each.
  const groups = new Map<string, FeedItem[]>();
  for (const i of items) {
    const key = i.companyName || "ללא חברה";
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(i);
  }
  const grouped = [...groups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "he"),
  );

  const expired = items.filter((i) => i.severity === "expired").length;
  const warning = items.filter((i) => i.severity === "warning").length;

  const selCls =
    "rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900";

  return (
    <div className="space-y-5">
      {/* Filter bar — screen only */}
      <form
        method="get"
        className="no-print flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
      >
        <label className="space-y-1">
          <span className="block text-xs font-medium text-slate-600">
            מטפל אחראי
          </span>
          <select name="handler" defaultValue={handler ?? ""} className={selCls}>
            <option value="">כל המטפלים</option>
            {(profiles ?? []).map((p: Profile) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-slate-600">חברה</span>
          <select name="company" defaultValue={company ?? ""} className={selCls}>
            <option value="">כל החברות</option>
            {(companies ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium text-slate-600">סוג</span>
          <select name="kind" defaultValue={kind ?? ""} className={selCls}>
            <option value="">הכל</option>
            <option value="inspection">בדיקות</option>
            <option value="training">הדרכות</option>
            <option value="document">מסמכים</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-900"
        >
          סינון
        </button>
        <Link
          href="/admin/reports/worklist"
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          איפוס
        </Link>
        <div className="ms-auto">
          <PrintButton />
        </div>
      </form>

      {/* Report header — prints */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              יומן עבודה — משימות פתוחות
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {handler ? `מטפל: ${handlerName.get(handler) ?? "—"} · ` : ""}
              {company
                ? `חברה: ${(companies ?? []).find((c) => c.id === company)?.name ?? "—"} · `
                : ""}
              הופק: {new Date().toLocaleDateString("he-IL")}
            </p>
          </div>
          <div className="text-left text-sm">
            <div className="font-semibold text-slate-900">
              {items.length} משימות
            </div>
            <div className="text-red-600">{expired} פג תוקף</div>
            <div className="text-amber-600">{warning} דורש טיפול</div>
          </div>
        </div>

        {grouped.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            אין משימות פתוחות עבור הסינון הנבחר.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {grouped.map(([companyLabel, rows]) => (
              <section key={companyLabel} className="break-inside-avoid">
                <h2 className="mb-2 text-base font-semibold text-slate-900">
                  {companyLabel}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    ({rows.length})
                  </span>
                </h2>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className={thCls}>סוג</th>
                      <th className={thCls}>משימה</th>
                      <th className={thCls}>רכב / נהג</th>
                      <th className={thCls}>תאריך יעד</th>
                      <th className={thCls}>סטטוס</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((i) => (
                      <tr key={i.id}>
                        <td className={tdCls}>{KIND_LABEL[i.kind]}</td>
                        <td className={tdCls}>{i.title}</td>
                        <td className={tdCls}>
                          {i.plate ?? i.driverName ?? "—"}
                        </td>
                        <td className={tdCls}>{fmtDate(i.dueDate)}</td>
                        <td className={tdCls}>
                          <SeverityChip severity={i.severity} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
