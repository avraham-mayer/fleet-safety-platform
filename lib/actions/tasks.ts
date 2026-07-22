import { createClient } from "@/lib/supabase/server";
import { getMonthlyQueue } from "@/lib/actions/queue";
import { severityFor } from "@/lib/expiry";
import { EXPIRY_WARNING_DAYS } from "@/lib/constants";
import type { Document, FeedItem, Task } from "@/lib/types";

// Builds the aggregated dashboard feed from three sources:
//   (a) derived monthly-inspection-due (reuses getMonthlyQueue)
//   (b) materialized pending `tasks` (trainings + scheduled inspections)
//   (c) derived expiring `documents`
// Returns a flat, sorted FeedItem[]. The dashboard filters it client-side.
// Pass forHandlerId to scope the feed to companies handled by that officer
// (companies.handler_id); admin callers omit it and get the full feed.
export async function getTaskFeed(opts?: {
  forHandlerId?: string;
}): Promise<FeedItem[]> {
  const supabase = await createClient();
  let items: FeedItem[] = [];

  // Lookups for labels/filtering.
  const [{ data: companies }, { data: vehicles }, { data: drivers }] =
    await Promise.all([
      supabase.from("companies").select("id, name, handler_id"),
      supabase.from("vehicles").select("id, license_plate, company_id, handler_id"),
      supabase.from("drivers").select("id, name, company_id, handler_id"),
    ]);

  const companyName = new Map((companies ?? []).map((c) => [c.id, c.name]));
  const companyHandler = new Map(
    (companies ?? []).map((c) => [c.id, c.handler_id]),
  );
  const vehicleById = new Map((vehicles ?? []).map((v) => [v.id, v]));
  const driverById = new Map((drivers ?? []).map((d) => [d.id, d]));

  // (a) Monthly inspections due.
  const queue = await getMonthlyQueue();
  for (const v of queue) {
    items.push({
      id: `inspection-${v.id}`,
      kind: "inspection",
      title: "בדיקה חודשית",
      subtitle: `${v.license_plate} · ${v.company.name}`,
      companyId: v.company_id,
      companyName: v.company.name,
      plate: v.license_plate,
      driverName: null,
      dueDate: null,
      severity: "warning",
      href: `/inspect/${v.id}`,
      handlerId: v.handler_id,
    });
  }

  // (b) Materialized pending tasks.
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "pending");

  for (const t of (tasks ?? []) as Task[]) {
    const isDriver = t.entity_type === "driver";
    const driver = isDriver ? driverById.get(t.entity_id) : undefined;
    const vehicle = !isDriver ? vehicleById.get(t.entity_id) : undefined;
    const cName = t.company_id ? (companyName.get(t.company_id) ?? "") : "";
    const label = driver?.name ?? vehicle?.license_plate ?? "";

    items.push({
      id: `task-${t.id}`,
      kind: t.task_type,
      title: t.title,
      subtitle: `${label} · ${cName}`,
      companyId: t.company_id,
      companyName: cName,
      plate: vehicle?.license_plate ?? null,
      driverName: driver?.name ?? null,
      dueDate: t.due_date,
      severity: severityFor(t.due_date),
      href:
        t.task_type === "training"
          ? `/train/${t.entity_id}?task=${t.id}`
          : `/inspect/${t.entity_id}?task=${t.id}&template=${t.template_id ?? ""}`,
      handlerId: driver?.handler_id ?? vehicle?.handler_id ?? null,
    });
  }

  // (c) Expiring documents (within the warning window or already past).
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + EXPIRY_WARNING_DAYS);
  const { data: docs } = await supabase
    .from("documents")
    .select("*")
    .not("expiry_date", "is", null)
    .lte("expiry_date", cutoff.toISOString().slice(0, 10));

  for (const d of (docs ?? []) as Document[]) {
    const driver =
      d.entity_type === "driver" ? driverById.get(d.entity_id) : undefined;
    const vehicle =
      d.entity_type === "vehicle" ? vehicleById.get(d.entity_id) : undefined;
    const cName = companyName.get(d.company_id) ?? "";
    // Company-level documents (0004) label as the company itself.
    const label = driver?.name ?? vehicle?.license_plate ?? cName;

    items.push({
      id: `document-${d.id}`,
      kind: "document",
      title: `חידוש מסמך: ${d.doc_type}`,
      subtitle: `${label} · ${cName}`,
      companyId: d.company_id,
      companyName: cName,
      plate: vehicle?.license_plate ?? null,
      driverName: driver?.name ?? null,
      dueDate: d.expiry_date,
      severity: severityFor(d.expiry_date),
      href: `/renew/${d.id}`,
      handlerId: driver?.handler_id ?? vehicle?.handler_id ?? null,
    });
  }

  // Company-only scoping: an officer sees items whose company they handle.
  // Items without a company (rare: tasks rows with null company_id) stay
  // admin-only.
  if (opts?.forHandlerId) {
    items = items.filter(
      (i) =>
        i.companyId != null &&
        companyHandler.get(i.companyId) === opts.forHandlerId,
    );
  }

  // Most urgent first: expired → warning → ok, then by due date.
  const rank = { expired: 0, warning: 1, ok: 2 };
  items.sort((a, b) => {
    if (rank[a.severity] !== rank[b.severity])
      return rank[a.severity] - rank[b.severity];
    return (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
  });

  return items;
}
