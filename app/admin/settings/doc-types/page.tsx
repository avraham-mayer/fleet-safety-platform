import { createClient } from "@/lib/supabase/server";
import { saveDocType, toggleDocType } from "@/lib/actions/admin";
import { Card, Field, inputCls, submitCls, Table, tdCls } from "@/components/admin/ui";
import type { DocType } from "@/lib/types";

export const dynamic = "force-dynamic";

// Doc-type catalog management: the legacy "טיפולים" taxonomy with recurrence
// intervals that drive the renewal expiry prefill.
export default async function DocTypesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("doc_types")
    .select("*")
    .order("entity_type")
    .order("name");
  const docTypes = (data ?? []) as DocType[];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">סוגי מסמכים וטיפולים</h1>
        <p className="text-sm text-slate-500">
          מרווח החידוש קובע את תאריך התפוגה המוצע בחידוש מסמך
        </p>
      </div>

      <Card title="הוספת סוג">
        <form action={saveDocType} className="flex flex-wrap items-end gap-2">
          <Field label="שם">
            <input name="name" required className={inputCls} />
          </Field>
          <Field label="ישות">
            <select name="entity_type" className={inputCls}>
              <option value="vehicle">רכב</option>
              <option value="driver">נהג</option>
            </select>
          </Field>
          <Field label="מרווח חידוש (חודשים)">
            <input name="recurrence_months" type="number" min={1} className={inputCls} />
          </Field>
          <button type="submit" className={submitCls}>
            + הוספה
          </button>
        </form>
      </Card>

      <Card>
        <Table
          headers={["שם", "ישות", "מרווח חידוש", "פעיל", ""]}
          empty={docTypes.length === 0}
        >
          {docTypes.map((dt) => (
            <tr key={dt.id} className="transition hover:bg-slate-50">
              <td className={tdCls}>{dt.name}</td>
              <td className={tdCls}>{dt.entity_type === "vehicle" ? "רכב" : "נהג"}</td>
              <td className={tdCls}>
                {dt.recurrence_months ? `${dt.recurrence_months} חודשים` : "—"}
              </td>
              <td className={tdCls}>{dt.active ? "✓" : "✗"}</td>
              <td className={`${tdCls} text-left`}>
                <form action={toggleDocType} className="inline">
                  <input type="hidden" name="id" value={dt.id} />
                  <button
                    type="submit"
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    {dt.active ? "השבתה" : "הפעלה"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
