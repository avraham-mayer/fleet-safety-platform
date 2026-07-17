import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackLink from "@/components/BackLink";
import InspectionWizard from "@/components/InspectionWizard";
import type { ChecklistTemplate, Company, Driver, Vehicle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InspectPage({
  params,
  searchParams,
}: {
  params: Promise<{ vehicleId: string }>;
  searchParams: Promise<{ template?: string; task?: string }>;
}) {
  const { vehicleId } = await params;
  const { template: templateId, task: taskId } = await searchParams;
  const supabase = await createClient();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*, company:companies(id, name)")
    .eq("id", vehicleId)
    .single();

  if (!vehicle) notFound();

  const { data: drivers } = await supabase
    .from("drivers")
    .select("*")
    .eq("company_id", vehicle.company_id)
    .order("name");

  // Use the requested template, else fall back to the active Monthly template.
  let templateQuery = supabase.from("checklist_templates").select("*").limit(1);
  templateQuery = templateId
    ? templateQuery.eq("id", templateId)
    : templateQuery.eq("type", "monthly").eq("active", true);
  const { data: template } = await templateQuery.single();

  if (!template) notFound();

  const { company, ...vehicleRow } = vehicle as Vehicle & { company: Company };

  return (
    <div className="space-y-4">
      <BackLink confirm="לצאת מהבדיקה? הנתונים שהוזנו לא יישמרו." />
      <InspectionWizard
        vehicle={vehicleRow}
        company={company}
        drivers={(drivers ?? []) as Driver[]}
        template={template as ChecklistTemplate}
        taskId={taskId ?? null}
      />
    </div>
  );
}
