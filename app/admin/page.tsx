import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { saveCompany, unarchiveRecord } from "@/lib/actions/admin";
import ArchiveButton from "@/components/admin/ArchiveButton";
import { Card, Field, inputCls, submitCls, Table, tdCls } from "@/components/admin/ui";
import type { Company, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

// Admin landing: companies overview + new-company form.
export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; archived?: string }>;
}) {
  const { new: showNew, archived } = await searchParams;
  const showArchived = archived === "1";
  const supabase = await createClient();

  let companiesQuery = supabase.from("companies").select("*").order("name");
  companiesQuery = showArchived
    ? companiesQuery.not("archived_at", "is", null)
    : companiesQuery.is("archived_at", null);

  const [{ data: companies }, { data: profiles }, { count: vehicleCount }, { count: driverCount }] =
    await Promise.all([
      companiesQuery,
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("vehicles").select("id", { count: "exact", head: true }).is("archived_at", null),
      supabase.from("drivers").select("id", { count: "exact", head: true }).is("archived_at", null),
    ]);

  const handlerName = new Map(
    ((profiles ?? []) as Profile[]).map((p) => [p.id, p.full_name ?? ""]),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">חברות</h1>
          <p className="text-sm text-slate-500">
            {companies?.length ?? 0} חברות · {vehicleCount ?? 0} רכבים ·{" "}
            {driverCount ?? 0} נהגים
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={showArchived ? "/admin" : "/admin?archived=1"}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            {showArchived ? "→ חברות פעילות" : "ארכיון חברות ←"}
          </Link>
          {!showNew && !showArchived && (
            <Link href="/admin?new=1" className={submitCls}>
              + חברה חדשה
            </Link>
          )}
        </div>
      </div>

      {showNew && (
        <Card title="חברה חדשה">
          <form action={saveCompany} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Field label="שם החברה" className="col-span-2">
              <input name="name" required className={inputCls} />
            </Field>
            <Field label='מנכ"ל'>
              <input name="ceo_name" className={inputCls} />
            </Field>
            <Field label="מנהל מקצועי">
              <input name="prof_manager" className={inputCls} />
            </Field>
            <Field label="כתובת" className="col-span-2">
              <input name="address" className={inputCls} />
            </Field>
            <Field label="טלפון">
              <input name="phone" className={inputCls} />
            </Field>
            <Field label="מטפל אחראי">
              <select name="handler_id" className={inputCls} defaultValue="">
                <option value="">—</option>
                {(profiles ?? []).map((p: Profile) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="הערות" className="col-span-2 lg:col-span-4">
              <textarea name="notes" rows={2} className={inputCls} />
            </Field>
            <div className="col-span-2 flex gap-2 lg:col-span-4">
              <button type="submit" className={submitCls}>
                שמירה
              </button>
              <Link
                href="/admin"
                className="rounded-lg px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                ביטול
              </Link>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <Table
          headers={[
            "שם החברה",
            'מנכ"ל',
            "מנהל מקצועי",
            "טלפון",
            "מטפל אחראי",
            ...(showArchived ? [""] : []),
          ]}
          empty={(companies ?? []).length === 0}
        >
          {((companies ?? []) as Company[]).map((c) => (
            <tr key={c.id} className="transition hover:bg-slate-50">
              <td className={tdCls}>
                <Link
                  href={`/admin/companies/${c.id}`}
                  className="font-medium text-blue-700 hover:underline"
                >
                  {c.name}
                </Link>
              </td>
              <td className={tdCls}>{c.ceo_name ?? "—"}</td>
              <td className={tdCls}>{c.prof_manager ?? "—"}</td>
              <td className={tdCls}>{c.phone ?? "—"}</td>
              <td className={tdCls}>
                {c.handler_id ? (handlerName.get(c.handler_id) ?? "—") : "—"}
              </td>
              {showArchived && (
                <td className={`${tdCls} text-left`}>
                  <ArchiveButton
                    action={unarchiveRecord}
                    fields={{ table: "companies", id: c.id }}
                    mode="restore"
                  />
                </td>
              )}
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
