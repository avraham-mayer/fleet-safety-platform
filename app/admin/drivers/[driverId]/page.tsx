import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  saveDriver,
  deleteDriver,
  saveDocument,
  deleteDocument,
  saveRecord,
  deleteRecord,
  scheduleTask,
} from "@/lib/actions/admin";
import { severityFor } from "@/lib/expiry";
import { TRAINING_MODULES } from "@/lib/constants";
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
  Company,
  Course,
  DocType,
  Document,
  Driver,
  MedicalCheck,
  Profile,
  TachographCheck,
  Training,
  VehicleDriver,
  Vehicle,
  Violation,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// Driver card (legacy כרטיס נהג): details, documents, trainings, accidents,
// violations, medical checks, courses, tachograph audits, assigned vehicles.
export default async function DriverPage({
  params,
  searchParams,
}: {
  params: Promise<{ driverId: string }>;
  searchParams: Promise<{ company?: string }>;
}) {
  const { driverId } = await params;
  const { company: companyParam } = await searchParams;
  const isNew = driverId === "new";
  const supabase = await createClient();

  const [{ data: companies }, { data: profiles }] = await Promise.all([
    supabase.from("companies").select("id, name").order("name"),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  let driver: Driver | null = null;
  let docs: Document[] = [];
  let docTypes: DocType[] = [];
  let trainings: Training[] = [];
  let vehicles: (VehicleDriver & { vehicle: Vehicle })[] = [];
  let accidents: Accident[] = [];
  let violations: Violation[] = [];
  let medicals: MedicalCheck[] = [];
  let courses: Course[] = [];
  let tachographs: TachographCheck[] = [];

  if (!isNew) {
    const { data: d } = await supabase
      .from("drivers")
      .select("*")
      .eq("id", driverId)
      .single();
    if (!d) notFound();
    driver = d as Driver;

    const [docsRes, dtRes, trainRes, vehRes, accRes, vioRes, medRes, crsRes, tacRes] =
      await Promise.all([
        supabase
          .from("documents")
          .select("*")
          .eq("entity_type", "driver")
          .eq("entity_id", driverId)
          .order("expiry_date"),
        supabase
          .from("doc_types")
          .select("*")
          .eq("entity_type", "driver")
          .eq("active", true)
          .order("name"),
        supabase
          .from("trainings")
          .select("*")
          .eq("driver_id", driverId)
          .order("conducted_at", { ascending: false }),
        supabase
          .from("vehicle_drivers")
          .select("*, vehicle:vehicles(*)")
          .eq("driver_id", driverId),
        supabase
          .from("accidents")
          .select("*")
          .eq("driver_id", driverId)
          .order("occurred_at", { ascending: false }),
        supabase
          .from("violations")
          .select("*")
          .eq("driver_id", driverId)
          .order("occurred_at", { ascending: false }),
        supabase
          .from("medical_checks")
          .select("*")
          .eq("driver_id", driverId)
          .order("checked_at", { ascending: false }),
        supabase
          .from("courses")
          .select("*")
          .eq("driver_id", driverId)
          .order("completed_at", { ascending: false }),
        supabase
          .from("tachograph_checks")
          .select("*")
          .eq("driver_id", driverId)
          .order("checked_at", { ascending: false }),
      ]);
    docs = (docsRes.data ?? []) as Document[];
    docTypes = (dtRes.data ?? []) as DocType[];
    trainings = (trainRes.data ?? []) as Training[];
    vehicles = (vehRes.data ?? []) as (VehicleDriver & { vehicle: Vehicle })[];
    accidents = (accRes.data ?? []) as Accident[];
    violations = (vioRes.data ?? []) as Violation[];
    medicals = (medRes.data ?? []) as MedicalCheck[];
    courses = (crsRes.data ?? []) as Course[];
    tachographs = (tacRes.data ?? []) as TachographCheck[];
  }

  const companyId = driver?.company_id ?? companyParam ?? "";

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isNew ? "נהג חדש" : driver!.name}
          </h1>
          {!isNew && (
            <p className="text-sm text-slate-500">
              רישיון {driver!.license_number ?? "—"}
              {driver!.license_type ? ` · דרגה ${driver!.license_type}` : ""}
            </p>
          )}
        </div>
        {!isNew && (
          <Link href={`/train/${driver!.id}`} className={submitCls}>
            ביצוע הדרכה
          </Link>
        )}
      </div>

      <Card title="פרטים אישיים">
        <form action={saveDriver} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {!isNew && <input type="hidden" name="id" value={driver!.id} />}
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
          <Field label="שם מלא">
            <input name="name" defaultValue={driver?.name ?? ""} required className={inputCls} />
          </Field>
          <Field label="ת. זהות">
            <input name="id_number" defaultValue={driver?.id_number ?? ""} className={inputCls} />
          </Field>
          <Field label="מס' רישיון">
            <input name="license_number" defaultValue={driver?.license_number ?? ""} className={inputCls} />
          </Field>
          <Field label="דרגת רישיון">
            <input name="license_type" defaultValue={driver?.license_type ?? ""} placeholder="C / C1 / E…" className={inputCls} />
          </Field>
          <Field label="הגבלות">
            <input name="license_restrictions" defaultValue={driver?.license_restrictions ?? ""} className={inputCls} />
          </Field>
          <Field label="שנת הנפקה">
            <input name="license_issue_year" type="number" defaultValue={driver?.license_issue_year ?? ""} className={inputCls} />
          </Field>
          <Field label="רישיון בתוקף עד">
            <input name="license_expiry" type="date" defaultValue={driver?.license_expiry ?? ""} className={inputCls} />
          </Field>
          <Field label="כתובת">
            <input name="address" defaultValue={driver?.address ?? ""} className={inputCls} />
          </Field>
          <Field label="יישוב">
            <input name="city" defaultValue={driver?.city ?? ""} className={inputCls} />
          </Field>
          <Field label="טלפון">
            <input name="phone" defaultValue={driver?.phone ?? ""} className={inputCls} />
          </Field>
          <Field label='דוא"ל'>
            <input name="email" type="email" defaultValue={driver?.email ?? ""} className={inputCls} />
          </Field>
          <Field label="תאריך לידה">
            <input name="birth_date" type="date" defaultValue={driver?.birth_date ?? ""} className={inputCls} />
          </Field>
          <Field label="תחילת עבודה">
            <input name="work_start_date" type="date" defaultValue={driver?.work_start_date ?? ""} className={inputCls} />
          </Field>
          <Field label="מטפל אחראי">
            <select name="handler_id" defaultValue={driver?.handler_id ?? ""} className={inputCls}>
              <option value="">—</option>
              {((profiles ?? []) as Profile[]).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="מוביל חומ״ס" className="flex items-end">
            <input
              name="hazmat_certified"
              type="checkbox"
              defaultChecked={driver?.hazmat_certified ?? false}
              className="h-5 w-5 rounded border-slate-300"
            />
          </Field>
          <Field label="הערות" className="col-span-2 lg:col-span-4">
            <textarea name="notes" rows={2} defaultValue={driver?.notes ?? ""} className={inputCls} />
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
              action={deleteDriver}
              fields={{ id: driver!.id, company_id: driver!.company_id }}
              label="מחיקת נהג"
              confirmText="למחוק את הנהג על כל המסמכים וההדרכות שלו?"
            />
          </div>
        )}
      </Card>

      {!isNew && (
        <>
          <Card title="מסמכים ואישורים">
            <Table
              headers={["מסמך", "בתוקף עד", "מצב", "קובץ", ""]}
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
              <input type="hidden" name="entity_type" value="driver" />
              <input type="hidden" name="entity_id" value={driver!.id} />
              <input type="hidden" name="company_id" value={driver!.company_id} />
              <Field label="סוג מסמך">
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

          <Card title="היסטוריית הדרכות">
            <Table
              headers={["הדרכה", "בוצעה בתאריך", "הבאה עד"]}
              empty={trainings.length === 0}
            >
              {trainings.map((t) => (
                <tr key={t.id} className="transition hover:bg-slate-50">
                  <td className={tdCls}>{t.type}</td>
                  <td className={tdCls}>{t.conducted_at.slice(0, 10)}</td>
                  <td className={tdCls}>{t.next_due_date ?? "—"}</td>
                </tr>
              ))}
            </Table>
            <form
              action={scheduleTask}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="company_id" value={driver!.company_id} />
              <input type="hidden" name="entity_type" value="driver" />
              <input type="hidden" name="entity_id" value={driver!.id} />
              <input type="hidden" name="task_type" value="training" />
              <Field label="תזמון הדרכה">
                <select name="title" required className={inputCls}>
                  {TRAINING_MODULES.map((m) => (
                    <option key={m.type} value={m.title}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="תאריך יעד">
                <input name="due_date" type="date" required className={inputCls} />
              </Field>
              <button type="submit" className={submitCls}>
                תזמון
              </button>
            </form>
          </Card>

          <Card title="רכבים צמודים">
            <Table
              headers={["מס' רישוי", "דגם", "משויך מתאריך"]}
              empty={vehicles.length === 0}
            >
              {vehicles.map((l) => (
                <tr key={l.id} className="transition hover:bg-slate-50">
                  <td className={tdCls}>
                    <Link
                      href={`/admin/vehicles/${l.vehicle_id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {l.vehicle?.license_plate}
                    </Link>
                  </td>
                  <td className={tdCls}>{l.vehicle?.model}</td>
                  <td className={tdCls}>{l.assigned_at ?? "—"}</td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card title="עבירות ודוחות">
            <Table
              headers={["תאריך", "סוג עבירה", "קנס (₪)", "נקודות", ""]}
              empty={violations.length === 0}
            >
              {violations.map((v) => (
                <tr key={v.id} className="transition hover:bg-slate-50">
                  <td className={tdCls}>{v.occurred_at}</td>
                  <td className={tdCls}>{v.violation_type ?? "—"}</td>
                  <td className={tdCls}>{v.fine_amount ?? "—"}</td>
                  <td className={tdCls}>{v.points ?? "—"}</td>
                  <td className={`${tdCls} text-left`}>
                    <DeleteButton
                      action={deleteRecord}
                      fields={{ table: "violations", id: v.id }}
                      confirmText="למחוק את הרשומה?"
                    />
                  </td>
                </tr>
              ))}
            </Table>
            <form
              action={saveRecord}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="table" value="violations" />
              <input type="hidden" name="driver_id" value={driver!.id} />
              <Field label="תאריך">
                <input name="occurred_at" type="date" required className={inputCls} />
              </Field>
              <Field label="סוג עבירה" className="min-w-48 flex-1">
                <input name="violation_type" className={inputCls} />
              </Field>
              <Field label="קנס (₪)">
                <input name="fine_amount" type="number" step="0.01" className={inputCls} />
              </Field>
              <Field label="נקודות">
                <input name="points" type="number" className={inputCls} />
              </Field>
              <button type="submit" className={submitCls}>
                + הוספה
              </button>
            </form>
          </Card>

          <Card title="בדיקות רפואיות">
            <Table
              headers={["תאריך", "סוג בדיקה", "בתוקף עד", "תוצאה", ""]}
              empty={medicals.length === 0}
            >
              {medicals.map((m) => (
                <tr key={m.id} className="transition hover:bg-slate-50">
                  <td className={tdCls}>{m.checked_at}</td>
                  <td className={tdCls}>{m.check_type ?? "—"}</td>
                  <td className={tdCls}>{m.valid_until ?? "—"}</td>
                  <td className={tdCls}>{m.result ?? "—"}</td>
                  <td className={`${tdCls} text-left`}>
                    <DeleteButton
                      action={deleteRecord}
                      fields={{ table: "medical_checks", id: m.id }}
                      confirmText="למחוק את הרשומה?"
                    />
                  </td>
                </tr>
              ))}
            </Table>
            <form
              action={saveRecord}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="table" value="medical_checks" />
              <input type="hidden" name="driver_id" value={driver!.id} />
              <Field label="תאריך">
                <input name="checked_at" type="date" required className={inputCls} />
              </Field>
              <Field label="סוג בדיקה">
                <input name="check_type" className={inputCls} />
              </Field>
              <Field label="בתוקף עד">
                <input name="valid_until" type="date" className={inputCls} />
              </Field>
              <Field label="תוצאה">
                <input name="result" className={inputCls} />
              </Field>
              <button type="submit" className={submitCls}>
                + הוספה
              </button>
            </form>
          </Card>

          <Card title="קורסים">
            <Table
              headers={["קורס", "הושלם בתאריך", "בתוקף עד", ""]}
              empty={courses.length === 0}
            >
              {courses.map((c) => (
                <tr key={c.id} className="transition hover:bg-slate-50">
                  <td className={tdCls}>{c.name}</td>
                  <td className={tdCls}>{c.completed_at ?? "—"}</td>
                  <td className={tdCls}>{c.valid_until ?? "—"}</td>
                  <td className={`${tdCls} text-left`}>
                    <DeleteButton
                      action={deleteRecord}
                      fields={{ table: "courses", id: c.id }}
                      confirmText="למחוק את הרשומה?"
                    />
                  </td>
                </tr>
              ))}
            </Table>
            <form
              action={saveRecord}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="table" value="courses" />
              <input type="hidden" name="driver_id" value={driver!.id} />
              <Field label="שם הקורס" className="min-w-48 flex-1">
                <input name="name" required className={inputCls} />
              </Field>
              <Field label="הושלם בתאריך">
                <input name="completed_at" type="date" className={inputCls} />
              </Field>
              <Field label="בתוקף עד">
                <input name="valid_until" type="date" className={inputCls} />
              </Field>
              <button type="submit" className={submitCls}>
                + הוספה
              </button>
            </form>
          </Card>

          <Card title="ביקורות טכוגרף">
            <Table
              headers={["תאריך", "תקופה", "ממצאים", ""]}
              empty={tachographs.length === 0}
            >
              {tachographs.map((t) => (
                <tr key={t.id} className="transition hover:bg-slate-50">
                  <td className={tdCls}>{t.checked_at}</td>
                  <td className={tdCls}>{t.period ?? "—"}</td>
                  <td className={tdCls}>{t.findings ?? "—"}</td>
                  <td className={`${tdCls} text-left`}>
                    <DeleteButton
                      action={deleteRecord}
                      fields={{ table: "tachograph_checks", id: t.id }}
                      confirmText="למחוק את הרשומה?"
                    />
                  </td>
                </tr>
              ))}
            </Table>
            <form
              action={saveRecord}
              className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
            >
              <input type="hidden" name="table" value="tachograph_checks" />
              <input type="hidden" name="driver_id" value={driver!.id} />
              <Field label="תאריך">
                <input name="checked_at" type="date" required className={inputCls} />
              </Field>
              <Field label="תקופה">
                <input name="period" placeholder="06/2026" className={inputCls} />
              </Field>
              <Field label="ממצאים" className="min-w-48 flex-1">
                <input name="findings" className={inputCls} />
              </Field>
              <button type="submit" className={submitCls}>
                + הוספה
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
              <input type="hidden" name="driver_id" value={driver!.id} />
              <Field label="תאריך">
                <input name="occurred_at" type="date" required className={inputCls} />
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
        </>
      )}
    </div>
  );
}
