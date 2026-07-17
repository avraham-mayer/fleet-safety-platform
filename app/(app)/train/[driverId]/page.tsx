import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOfficerSignature } from "@/lib/actions/profile";
import BackLink from "@/components/BackLink";
import TrainingFlow from "@/components/TrainingFlow";
import type { Driver } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TrainPage({
  params,
  searchParams,
}: {
  params: Promise<{ driverId: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const { driverId } = await params;
  const { task: taskId } = await searchParams;
  const supabase = await createClient();

  const { data: driver } = await supabase
    .from("drivers")
    .select("*")
    .eq("id", driverId)
    .single();
  if (!driver) notFound();

  const officerSignature = await getOfficerSignature();

  // Where the signature gate should send the officer back to once they've
  // saved a signature: this same training, task context preserved.
  const returnTo = taskId
    ? `/train/${driverId}?task=${taskId}`
    : `/train/${driverId}`;

  return (
    <div className="space-y-4">
      <BackLink />
      <TrainingFlow
        driver={driver as Driver}
        hasOfficerSignature={Boolean(officerSignature)}
        taskId={taskId ?? null}
        returnTo={returnTo}
      />
    </div>
  );
}
