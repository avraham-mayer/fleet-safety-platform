import { createClient } from "@/lib/supabase/server";
import { currentCycleRange } from "@/lib/cycle";
import type { QueueVehicle } from "@/lib/types";

// Active vehicles that still need their MONTHLY inspection this cycle: active
// vehicles minus those with a completed monthly-template inspection in the window.
export async function getMonthlyQueue(): Promise<QueueVehicle[]> {
  const supabase = await createClient();
  const { start, end } = currentCycleRange();

  const { data: monthlyTemplates } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("type", "monthly");
  const monthlyIds = (monthlyTemplates ?? []).map((t) => t.id);

  let doneQuery = supabase
    .from("inspections")
    .select("vehicle_id")
    .eq("status", "completed")
    .gte("conducted_at", start.toISOString())
    .lt("conducted_at", end.toISOString());
  if (monthlyIds.length > 0) {
    doneQuery = doneQuery.in("template_id", monthlyIds);
  }

  const { data: done, error: doneError } = await doneQuery;
  if (doneError) throw doneError;
  const doneIds = (done ?? []).map((r) => r.vehicle_id);

  let query = supabase
    .from("vehicles")
    .select("*, company:companies(id, name)")
    .eq("status", "active")
    .is("archived_at", null)
    .order("license_plate");

  if (doneIds.length > 0) {
    query = query.not("id", "in", `(${doneIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as QueueVehicle[];
}
