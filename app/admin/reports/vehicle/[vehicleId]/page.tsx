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
import type { Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

// Vehicle card (כרטיס רכב) — a printable single-vehicle dossier: details,
// documents, inspection history, accidents, assigned drivers. Mirrors the
// legacy rpCarKartis. Reached from the vehicle admin page.
export default async function VehicleCardReport({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const supabase = await createClient();

  const { data: vRow } = await supabase
    .from("vehicles")
    .select("*, company:companies(id, name)")
    .eq("id", vehicleId)
    .single();
  if (!vRow) notFound();
  const vehicle = vRow as unknown as Vehicle & {
    company: { id: string; name: string } | null;
  };

  const [
    { data: docs },
    { data: inspections },
    { data: accidents },
    { data: links },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("entity_type", "vehicle")
      .eq("entity_id", vehicleId)
      .order("expiry_date"),
    supabase
      .from("inspections")
      .select("id, conducted_at, status, summary_remarks")
      .eq("vehicle_id", vehicleId)
      .order("conducted_at", { ascending: false })
      .limit(12),
    supabase
      .from("accidents")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("vehicle_drivers")
      .select("driver:drivers(id, name, license_number)")
      .eq("vehicle_id", vehicleId),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const handler = (profiles ?? []).find((p) => p.id === vehicle.handler_id);

  return (
    <ReportShell
      title={`כרטיס רכב — ${vehicle.license_plate}`}
      subtitle={`${vehicle.company?.name ?? ""}${
        vehicle.archived_at ? " · בארכיון" : ""
      }`}
    >
      <Section title="פרטי רכב">
        <KV
          rows={[
            ["מס' רישוי", vehicle.license_plate],
            ["דגם", vehicle.model],
            ["יצרן", vehicle.make],
            ["סוג רכב", vehicle.vehicle_type],
            ["שנת ייצור", vehicle.year],
            ['מד-אוץ׳ (ק"מ)', vehicle.mileage],
            ["דלק", vehicle.fuel_type],
            ["מס' שלדה", vehicle.vin],
            ["מטפל אחראי", handler?.full_name],
            ["משקל כולל", vehicle.total_weight_kg],
            ["משקל עצמי", vehicle.self_weight_kg],
            ["מטען מותר", vehicle.payload_weight_kg],
            ["תוקף ביטוח", fmtDate(vehicle.insurance_expiry)],
            ["תוקף טכוגרף", fmtDate(vehicle.tachograph_expiry)],
            ["תוקף רישיון רכב", fmtDate(vehicle.registration_expiry)],
            ["סוג פוליסה", vehicle.policy_type],
          ]}
        />
        {vehicle.notes && (
          <p className="mt-2 text-sm text-slate-600">הערות: {vehicle.notes}</p>
        )}
      </Section>

      <Section title="מסמכים וטיפולים">
        <MiniTable
          headers={["סוג מסמך", "תוקף", "סטטוס"]}
          rows={(docs ?? []).map((d) => [
            d.doc_type,
            fmtDate(d.expiry_date),
            <SeverityChip key={d.id} severity={severityFor(d.expiry_date)} />,
          ])}
        />
      </Section>

      <Section title="היסטוריית בדיקות">
        <MiniTable
          headers={["תאריך", "סטטוס", "הערות"]}
          rows={(inspections ?? []).map((i) => [
            fmtDate(i.conducted_at),
            i.status,
            i.summary_remarks ?? "—",
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

      <Section title="נהגים צמודים">
        <MiniTable
          headers={["שם הנהג", "מס' רישיון"]}
          rows={(links ?? [])
            .map((l) => (l as unknown as { driver: { name: string; license_number: string | null } | null }).driver)
            .filter((d): d is { name: string; license_number: string | null } => !!d)
            .map((d) => [d.name, d.license_number ?? "—"])}
        />
      </Section>
    </ReportShell>
  );
}
