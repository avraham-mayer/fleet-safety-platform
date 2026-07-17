import { createClient } from "@/lib/supabase/server";
import DocumentsGrid, {
  type DocumentRow,
  type EntityOption,
} from "@/components/admin/DocumentsGrid";
import type { Document } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDocumentsPage() {
  const supabase = await createClient();

  const [{ data: docs }, { data: companies }, { data: vehicles }, { data: drivers }] =
    await Promise.all([
      supabase.from("documents").select("*").order("expiry_date"),
      supabase.from("companies").select("id, name").order("name"),
      supabase
        .from("vehicles")
        .select("id, license_plate, company_id")
        .order("license_plate"),
      supabase.from("drivers").select("id, name, company_id").order("name"),
    ]);

  const companyName = new Map((companies ?? []).map((c) => [c.id, c.name]));
  const vehicleOptions: EntityOption[] = (vehicles ?? []).map((v) => ({
    id: v.id,
    label: `${v.license_plate} · ${companyName.get(v.company_id) ?? ""}`,
  }));
  const driverOptions: EntityOption[] = (drivers ?? []).map((d) => ({
    id: d.id,
    label: `${d.name} · ${companyName.get(d.company_id) ?? ""}`,
  }));

  const vehicleLabel = new Map((vehicles ?? []).map((v) => [v.id, v.license_plate]));
  const driverLabel = new Map((drivers ?? []).map((d) => [d.id, d.name]));

  const rows: DocumentRow[] = ((docs ?? []) as Document[]).map((doc) => ({
    ...doc,
    entity_label:
      (doc.entity_type === "vehicle"
        ? vehicleLabel.get(doc.entity_id)
        : driverLabel.get(doc.entity_id)) ?? "—",
    company_name: companyName.get(doc.company_id) ?? "—",
  }));

  return (
    <DocumentsGrid
      rows={rows}
      vehicleOptions={vehicleOptions}
      driverOptions={driverOptions}
    />
  );
}
