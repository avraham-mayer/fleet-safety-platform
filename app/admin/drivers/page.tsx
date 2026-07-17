import { createClient } from "@/lib/supabase/server";
import DriversGrid from "@/components/admin/DriversGrid";
import type { Company, Driver } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDriversPage() {
  const supabase = await createClient();

  const [{ data: drivers }, { data: companies }] = await Promise.all([
    supabase.from("drivers").select("*").order("name"),
    supabase.from("companies").select("*").order("name"),
  ]);

  return (
    <DriversGrid
      rows={(drivers ?? []) as Driver[]}
      companies={(companies ?? []) as Company[]}
    />
  );
}
