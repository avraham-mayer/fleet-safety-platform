import { createClient } from "@/lib/supabase/server";
import VehiclesGrid from "@/components/admin/VehiclesGrid";
import type { Company, Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  const supabase = await createClient();

  const [{ data: vehicles }, { data: companies }] = await Promise.all([
    supabase.from("vehicles").select("*").order("license_plate"),
    supabase.from("companies").select("*").order("name"),
  ]);

  return (
    <VehiclesGrid
      rows={(vehicles ?? []) as Vehicle[]}
      companies={(companies ?? []) as Company[]}
    />
  );
}
