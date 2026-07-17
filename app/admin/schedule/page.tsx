import { createClient } from "@/lib/supabase/server";
import ScheduleManager, { type TaskRow } from "@/components/admin/ScheduleManager";
import type { ChecklistTemplate, Task } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  const supabase = await createClient();

  const [
    { data: pending },
    { data: resolved },
    { data: companies },
    { data: vehicles },
    { data: drivers },
    { data: templates },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("status", "pending")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("status", "resolved")
      .order("resolved_at", { ascending: false })
      .limit(10),
    supabase.from("companies").select("id, name").order("name"),
    supabase
      .from("vehicles")
      .select("id, license_plate, company_id")
      .order("license_plate"),
    supabase.from("drivers").select("id, name, company_id").order("name"),
    supabase
      .from("checklist_templates")
      .select("*")
      .eq("active", true)
      .order("name"),
  ]);

  const companyName = new Map((companies ?? []).map((c) => [c.id, c.name]));
  const vehicleLabel = new Map(
    (vehicles ?? []).map((v) => [v.id, v.license_plate]),
  );
  const driverLabel = new Map((drivers ?? []).map((d) => [d.id, d.name]));

  const toRow = (t: Task): TaskRow => ({
    ...t,
    entity_label:
      (t.entity_type === "vehicle"
        ? vehicleLabel.get(t.entity_id)
        : driverLabel.get(t.entity_id)) ?? "—",
    company_name: t.company_id ? (companyName.get(t.company_id) ?? "—") : "—",
  });

  return (
    <ScheduleManager
      pending={((pending ?? []) as Task[]).map(toRow)}
      resolved={((resolved ?? []) as Task[]).map(toRow)}
      vehicleOptions={(vehicles ?? []).map((v) => ({
        id: v.id,
        label: `${v.license_plate} · ${companyName.get(v.company_id) ?? ""}`,
      }))}
      driverOptions={(drivers ?? []).map((d) => ({
        id: d.id,
        label: `${d.name} · ${companyName.get(d.company_id) ?? ""}`,
      }))}
      templates={(templates ?? []) as ChecklistTemplate[]}
    />
  );
}
