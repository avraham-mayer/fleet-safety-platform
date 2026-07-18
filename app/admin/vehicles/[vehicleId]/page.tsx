import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  saveVehicle,
  deleteVehicle,
  saveDocument,
  deleteDocument,
  assignVehicleDriver,
  unassignVehicleDriver,
  saveRecord,
  deleteRecord,
  scheduleTask,
} from "@/lib/actions/admin";
import { severityFor } from "@/lib/expiry";
import DeleteButton from "@/components/admin/DeleteButton";
import {
  Card,
  Field,
  inputCls,
  submitCls,
  SeverityChip,
  Table,
  tdCls,
} from "@/components/admin/ui";
import type {
  Accident,
  ChecklistTemplate,
  Company,
  DocType,
  Document,
  Driver,
  Profile,
  Vehicle,
  VehicleDriver,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// Vehicle card (legacy כרטיס רכב): details, treatments (documents), assigned
// drivers, accidents, inspection scheduling. `new` renders an empty form.
export default async function VehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ company?: string }>;
}) {
  const { vehicleId } = await params;
  const { company: companyParam } = await searchParams;
  const isNew = vehicleId === "new";
  const supabase = await createClient();

  const [{ data: companies }, { data: profiles }] = await Promise.all([
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  let vehicle: Vehicle | null = null;
  let docs: Document[] = [];
  let docTypes: DocType[] = [];
  let links: (VehicleDriver & { driver: Driver })[] = [];
  let companyDrivers: Driver[] = [];
  let accidents: Accident[] = [];
  let templates: ChecklistTemplate[] = [];

  if (!isNew) {
    const { data: v } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();
    if (!v) notFound();
    vehicle = v as Vehicle;

    const [docsRes, dtRes, linksRes, driversRes, accRes, tplRes] =
      await Promise.all([
        supabase
          .from("documents")
          .select("*")
          .eq("entity_type", "vehicle")
          .eq("entity_id", vehicleId)
          .order("expiry_date"),
        supabase
          .from("doc_types")
          .select("*")
          .eq("entity_type", "vehicle")
          .eq("active", true)
          .order("name"),
        supabase
          .from("vehicle_drivers")
          .select("*, driver:drivers(*)")
          .eq("vehicle_id", vehicleId),
        supabase
          .from("drivers")
          .select("*")
          .eq("company_id", vehicle.company_id)
          .order("name"),
        supabase
          .from("accidents")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .order("occurred_at", { ascending: false }),
        supabase
          .from("checklist_templates")
          .select("*")
          .eq("active", true)
          .order("name"),
      ]);
    docs = (docsRes.data ?? []) as Document[];
    docTypes = (dtRes.data ?? []) as DocType[];
    links = (linksRes.data ?? []) as (VehicleDriver & { driver: Driver })[];
    companyDrivers = (driversRes.data ?? []) as Driver[];
    accidents = (accRes.data ?? []) as Accident[];
    templates = (tplRes.data ?? []) as ChecklistTemplate[];
  }

  const companyId = vehicle?.company_id ?? companyParam ?? "";
  const linkedIds = new Set(links.map((l) => l.driver_id));

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isNew ? "רכב חדש" : `רכב ${vehicle!.license_plate}`}
          </h1>
          {!isNew && (
            <p className="text-sm text-slate-500">
              {vehicle!.model}
              {vehicle!.vehicle_type ? ` · ${vehicle!.vehicle_type}` : ""}
            </p>
          )}
        </div>
        {!isNew && (
          <Link href={`/inspect/${vehicle!.id}`} className={submitCls}>
            ביצוע בדיקה
          </Link>
        )}
      </div>

      <Card title="פרטי רכב">
        <form action={saveVehicle} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {!isNew && <input type="hidden" name="id" value={vehicle!.id} />}
          <Field label="חברה">
            <select name="company_id" defaultValue={companyId} required className={inputCls}>
              <option value="">—</option>
              {(companies ?? []).map((c: Pick<Company, "id" | "name">) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="מס' רישוי">
            <input name="license_plate" defaultValue={vehicle?.license_plate ?? ""} required className={inputCls} />
          </Field>
          <Field label="דגם">
            <input name="model" defaultValue={vehicle?.model ?? ""} required className={inputCls} />
          </Field>
          <Field label="יצרן">
            <input name="make" defaultValue={vehicle?.make ?? ""} className={inputCls} />
          </Field>
          <Field label="סוג רכב">
            <input name="vehicle_type" defaultValue={vehicle?.vehicle_type ?? ""} className={inputCls} />
          </Field>
          <Field label="שנת ייצור">
            <input name="year" type="number" defaultValue={vehicle?.year ?? ""} className={inputCls} />
          </Field>
          <Field label="מס' שילדה (VIN)">
            <input name="vin" defaultValue={vehicle?.vin ?? ""} className={inputCls} />
          </Field>
          <Field label="תאריך רישום">
            <input name="registration_date" type="date" defaultValue={vehicle?.registration_date ?? ""} className={inputCls} />
          </Field>
          <Field label='מד אוץ (ק"מ)'>
            <input name="mileage" type="number" defaultValue={vehicle?.mileage ?? ""} className={inputCls} />
          </Field>
          <Field label="סוג דלק">
            <input name="fuel_type" defaultValue={vehicle?.fuel_type ?? ""} className={inputCls} />
          </Field>
          <Field label='משקל כולל (ק"ג)'>
            <input name="total_weight_kg" type="number" defaultValue={vehicle?.total_weight_kg ?? ""} className={inputCls} />
          </Field>
          <Field label='משקל עצמי (ק"ג)'>
            <input name="self_weight_kg" type="number" defaultValue={vehicle?.self_weight_kg ?? ""} className={inputCls} />
          </Field>
          <Field label='מטען מורשה (ק"ג)'>
            <input name="payload_weight_kg" type="number" defaultValue={vehicle?.payload_weight_kg ?? ""} className={inputCls} />
          </Field>
          <Field label="חיוב חודשי (₪)">
            <input name="monthly_fee" type="number" step="0.01" defaultValue={vehicle?.monthly_fee ?? ""} className={inputCls} />
          </Field>
          <Field label="סוג פוליסה">
            <input name="policy_type" defaultValue={vehicle?.policy_type ?? ""} className={inputCls} />
          </Field>
          <Field label="סטטוס">
            <select name="status" defaultValue={vehicle?.status ?? "active"} className={inputCls}>
              <option value="active">פעיל</option>
              <option value="pending">ממתין</option>
            </select>
          </Field>
          <Field label="מטפל אחראי">
            <select name="handler_id" defaultValue={vehicle?.handler_id ?? ""} className={inputCls}>
              <option value="">—</option>
              {((profiles ?? []) as Profile[]).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ביטוח בתוקף עד">
            <input name="insurance_expiry" type="date" defaultValue={vehicle?.insurance_expiry ?? ""} className={inputCls} />
          </Field>
          <Field label="טכוגרף בתוקף עד">
            <input name="tachograph_expiry" type="date" defaultValue={vehicle?.tachograph_expiry ?? ""} className={inputCls} />
          </Field>
          <Field label="רישוי בתוקף עד">
            <input name="registration_expiry" type="date" defaultValue={vehicle?.registration_expiry ?? ""} className={inputCls} />
          </Field>
          <Field label="הערות" className="col-span-2 lg:col-span-4">
            <textarea name="notes" rows={2} defaultValue={vehicle?.notes ?? ""} className={inputCls} />
          </Field>
          <div className="col-span-2 flex items-center gap-3 lg:col-span-4">
            <button type="submit" className={submitCls}>
              שמירה
            </button>
          </div>
        </form>
        {!isNew && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <DeleteButton
              action={deleteVehicle}
              fields={{ id: vehicle!.id, company_id: vehicle!.company_id }}
              label="מחיקת רכב"
              confirmText="למחוק את הרכב על כל המסמכים והבדיקות שלו?"
            />
          </div>
        )}
      </Card>

      {!isNew && (
        <>
          <Card title="טיפולים ומסמכים">
            <Table
              headers={["טיפול", "בתוקף עד", "מצב", "קובץ", ""]}
              empty={docs.length === 0}
            >
              {docs.map((d) => (
                <tr key={d.id} className="transition hover:bg-slate-50">
                  <td className={tdCls}>{d.doc_type}</td>
                  <td className={tdCls}>{d.expiry_date ?? "—"}</td>
                  <td className={tdCls}>
                    <SeverityChip severity={severityFor(d.expiry_date)} />
                  </td>
                  <td className={tdCls}>{d.file_url ? "✓" : "—"}</td>
                  <td className={`${tdCls} text-left`}>
                    <Link
                      href={`/renew/${d.id}`}
                      className="ml-2 text-xs font-medium text-blue-700 hover:underline"
                    >
                      חידוש
                    </Link>
                    <DeleteButton
                      action={deleteDocument}
                      fields={{ id: d.id }}
                      confirmText="למחוק את המסמך?"
                    />
                  </td>
                </tr>
              ))}
            </Table>

            <form
              action={saveDocument}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="entity_type" value="vehicle" />
              <input type="hidden" name="entity_id" value={vehicle!.id} />
              <input type="hidden" name="company_id" value={vehicle!.company_id} />
              <Field label="סוג טיפול/מסמך">
                <select name="doc_type_id" required className={inputCls}>
                  {docTypes.map((dt) => (
                    <option key={dt.id} value={dt.id}>
                      {dt.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="בתוקף עד">
                <input name="expiry_date" type="date" className={inputCls} />
              </Field>
              <Field label="קובץ">
                <input name="file" type="file" accept="image/*,.pdf" className={inputCls} />
              </Field>
              <button type="submit" className={submitCls}>
                + הוספה
              </button>
            </form>
          </Card>

          <Card title="נהגים צמודים">
            <Table
              headers={["שם הנהג", "מס' רישיון", "משויך מתאריך", ""]}
              empty={links.length === 0}
            >
              {links.map((l) => (
                <tr key={l.id} className="transition hover:bg-slate-50">
                  <td className={tdCls}>
                    <Link
                      href={`/admin/drivers/${l.driver_id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {l.driver?.name}
                    </Link>
                  </td>
                  <td className={tdCls}>{l.driver?.license_number ?? "—"}</td>
                  <td className={tdCls}>{l.assigned_at ?? "—"}</td>
                  <td className={`${tdCls} text-left`}>
                    <DeleteButton
                      action={unassignVehicleDriver}
                      fields={{ id: l.id }}
                      label="הסרה"
                      confirmText="להסיר את שיוך הנהג?"
                    />
                  </td>
                </tr>
              ))}
            </Table>
            <form
              action={assignVehicleDriver}
              className="mt-4 flex items-end gap-2 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="vehicle_id" value={vehicle!.id} />
              <Field label="שיוך נהג מהחברה">
                <select name="driver_id" required className={inputCls}>
                  {companyDrivers
                    .filter((d) => !linkedIds.has(d.id))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </Field>
              <button type="submit" className={submitCls}>
                + שיוך
              </button>
            </form>
          </Card>

          <Card title="תאונות">
            <Table
              headers={["תאריך", "תיאור", "מקום", ""]}
              empty={accidents.length === 0}
            >
              {accidents.map((a) => (
                <tr key={a.id} className="transition hover:bg-slate-50">
                  <td className={tdCls}>{a.occurred_at}</td>
                  <td className={tdCls}>{a.description ?? "—"}</td>
                  <td className={tdCls}>{a.location ?? "—"}</td>
                  <td className={`${tdCls} text-left`}>
                    <DeleteButton
                      action={deleteRecord}
                      fields={{ table: "accidents", id: a.id }}
                      confirmText="למחוק את רשומת התאונה?"
                    />
                  </td>
                </tr>
              ))}
            </Table>
            <form
              action={saveRecord}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="table" value="accidents" />
              <input type="hidden" name="vehicle_id" value={vehicle!.id} />
              <Field label="תאריך">
                <input name="occurred_at" type="date" required className={inputCls} />
              </Field>
              <Field label="נהג מעורב">
                <select name="driver_id" defaultValue="" className={inputCls}>
                  <option value="">—</option>
                  {companyDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="תיאור" className="min-w-48 flex-1">
                <input name="description" className={inputCls} />
              </Field>
              <Field label="מקום">
                <input name="location" className={inputCls} />
              </Field>
              <button type="submit" className={submitCls}>
                + הוספה
              </button>
            </form>
          </Card>

          <Card title="תזמון בדיקה">
            <form action={scheduleTask} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="company_id" value={vehicle!.company_id} />
              <input type="hidden" name="entity_type" value="vehicle" />
              <input type="hidden" name="entity_id" value={vehicle!.id} />
              <input type="hidden" name="task_type" value="inspection" />
              <Field label="תבנית בדיקה">
                <select name="template_id" required className={inputCls}>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="כותרת">
                <input name="title" required defaultValue="בדיקה יזומה" className={inputCls} />
              </Field>
              <Field label="תאריך יעד">
                <input name="due_date" type="date" required className={inputCls} />
              </Field>
              <button type="submit" className={submitCls}>
                תזמון
              </button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
