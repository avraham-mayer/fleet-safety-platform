import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { severityFor } from "@/lib/expiry";
import { SeverityChip } from "@/components/admin/ui";
import {
  ReportShell,
  Section,
  KV,
  MiniTable,
  fmtDate,
} from "@/components/admin/reportBits";
import type { Driver } from "@/lib/types";

export const dynamic = "force-dynamic";

// Driver card (כרטיס נהג) — printable single-driver dossier: details, documents,
// courses, medical checks, tachograph, violations, accidents, trainings,
// assigned vehicles. Mirrors the legacy rpDrvKartis. Reached from the driver
// admin page.
export default async function DriverCardReport({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;
  const supabase = await createClient();

  const { data: dRow } = await supabase
    .from("drivers")
    .select("*, company:companies(id, name)")
    .eq("id", driverId)
    .single();
  if (!dRow) notFound();
  const driver = dRow as unknown as Driver & {
    company: { id: string; name: string } | null;
  };

  const [
    { data: docs },
    { data: courses },
    { data: medical },
    { data: taho },
    { data: violations },
    { data: accidents },
    { data: trainings },
    { data: links },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("entity_type", "driver")
      .eq("entity_id", driverId)
      .order("expiry_date"),
    supabase.from("courses").select("*").eq("driver_id", driverId).order("completed_at", { ascending: false }),
    supabase.from("medical_checks").select("*").eq("driver_id", driverId).order("checked_at", { ascending: false }),
    supabase.from("tachograph_checks").select("*").eq("driver_id", driverId).order("checked_at", { ascending: false }),
    supabase.from("violations").select("*").eq("driver_id", driverId).order("occurred_at", { ascending: false }),
    supabase.from("accidents").select("*").eq("driver_id", driverId).order("occurred_at", { ascending: false }),
    supabase.from("trainings").select("id, type, conducted_at, next_due_date").eq("driver_id", driverId).order("conducted_at", { ascending: false }),
    supabase.from("vehicle_drivers").select("vehicle:vehicles(id, license_plate, model)").eq("driver_id", driverId),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const handler = (profiles ?? []).find((p) => p.id === driver.handler_id);

  return (
    <ReportShell
      title={`כרטיס נהג — ${driver.name}`}
      subtitle={`${driver.company?.name ?? ""}${
        driver.archived_at ? " · בארכיון" : ""
      }`}
    >
      <Section title="פרטים אישיים">
        <KV
          rows={[
            ["שם", driver.name],
            ["ת. זהות", driver.id_number],
            ["מס' רישיון", driver.license_number],
            ["דרגת רישיון", driver.license_type],
            ["הגבלות", driver.license_restrictions],
            ["תוקף רישיון", fmtDate(driver.license_expiry)],
            ['הסמכת חומ"ס', driver.hazmat_certified ? "כן" : "לא"],
            ["מטפל אחראי", handler?.full_name],
            ["טלפון", driver.phone],
            ["כתובת", driver.address],
            ["עיר", driver.city],
            ["תחילת עבודה", fmtDate(driver.work_start_date)],
          ]}
        />
        {driver.notes && (
          <p className="mt-2 text-sm text-slate-600">הערות: {driver.notes}</p>
        )}
      </Section>

      <Section title="מסמכים">
        <MiniTable
          headers={["סוג מסמך", "תוקף", "סטטוס"]}
          rows={(docs ?? []).map((d) => [
            d.doc_type,
            fmtDate(d.expiry_date),
            <SeverityChip key={d.id} severity={severityFor(d.expiry_date)} />,
          ])}
        />
      </Section>

      <Section title="קורסים והשתלמויות">
        <MiniTable
          headers={["שם הקורס", "הושלם", "תוקף"]}
          rows={(courses ?? []).map((c) => [
            c.name,
            fmtDate(c.completed_at),
            fmtDate(c.valid_until),
          ])}
        />
      </Section>

      <Section title="הדרכות בטיחות">
        <MiniTable
          headers={["סוג", "תאריך", "חידוש הבא"]}
          rows={(trainings ?? []).map((t) => [
            t.type,
            fmtDate(t.conducted_at),
            fmtDate(t.next_due_date),
          ])}
        />
      </Section>

      <Section title="בדיקות רפואיות">
        <MiniTable
          headers={["סוג", "תאריך", "תוקף", "תוצאה"]}
          rows={(medical ?? []).map((m) => [
            m.check_type ?? "—",
            fmtDate(m.checked_at),
            fmtDate(m.valid_until),
            m.result ?? "—",
          ])}
        />
      </Section>

      <Section title="בדיקות טכוגרף">
        <MiniTable
          headers={["תאריך", "תקופה", "ממצאים"]}
          rows={(taho ?? []).map((t) => [
            fmtDate(t.checked_at),
            t.period ?? "—",
            t.findings ?? "—",
          ])}
        />
      </Section>

      <Section title="עבירות ודוחות">
        <MiniTable
          headers={["תאריך", "סוג", "קנס", "נקודות"]}
          rows={(violations ?? []).map((v) => [
            fmtDate(v.occurred_at),
            v.violation_type ?? "—",
            v.fine_amount ?? "—",
            v.points ?? "—",
          ])}
        />
      </Section>

      <Section title="תאונות">
        <MiniTable
          headers={["תאריך", "תיאור", "מיקום"]}
          rows={(accidents ?? []).map((a) => [
            fmtDate(a.occurred_at),
            a.description ?? "—",
            a.location ?? "—",
          ])}
        />
      </Section>

      <Section title="רכבים צמודים">
        <MiniTable
          headers={["מס' רישוי", "דגם"]}
          rows={(links ?? [])
            .map((l) => (l as unknown as { vehicle: { license_plate: string; model: string } | null }).vehicle)
            .filter((v): v is { license_plate: string; model: string } => !!v)
            .map((v) => [v.license_plate, v.model])}
        />
      </Section>
    </ReportShell>
  );
}
