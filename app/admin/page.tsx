import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { saveCompany } from "@/lib/actions/admin";
import { Card, Field, inputCls, submitCls, Table, tdCls } from "@/components/admin/ui";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

// Admin landing: companies overview + new-company form.
export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: showNew } = await searchParams;
  const supabase = await createClient();

  const [{ data: companies }, { data: profiles }, { count: vehicleCount }, { count: driverCount }] =
    await Promise.all([
      supabase.from("companies").select("*").order("name"),
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("vehicles").select("id", { count: "exact", head: true }),
      supabase.from("drivers").select("id", { count: "exact", head: true }),
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
        {!showNew && (
          <Link href="/admin?new=1" className={submitCls}>
            + חברה חדשה
          </Link>
        )}
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
          headers={["שם החברה", 'מנכ"ל', "מנהל מקצועי", "טלפון", "מטפל אחראי"]}
          empty={(companies ?? []).length === 0}
        >
          {(companies ?? []).map((c) => (
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
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
