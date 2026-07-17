import { createClient } from "@/lib/supabase/server";
import CompaniesGrid, { type CompanyRow } from "@/components/admin/CompaniesGrid";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminCompaniesPage() {
  const supabase = await createClient();

  // Handler names come from a separate profiles fetch (not an embed) so the
  // page keeps rendering even before the 0003 handler_id migration runs.
  const [{ data }, { data: profiles }] = await Promise.all([
    supabase
      .from("companies")
      .select("*, vehicles(count), drivers(count)")
      .order("name"),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  const handlerName = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name ?? ""]),
  );

  const rows: CompanyRow[] = (data ?? []).map((c) => ({
    ...c,
    handler_id: c.handler_id ?? null,
    vehicle_count: c.vehicles?.[0]?.count ?? 0,
    driver_count: c.drivers?.[0]?.count ?? 0,
    handler_name: c.handler_id ? (handlerName.get(c.handler_id) ?? null) : null,
  }));

  return <CompaniesGrid rows={rows} profiles={(profiles ?? []) as Profile[]} />;
}
