"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SubmitTrainingInput = {
  driverId: string;
  type: string; // module title
  driverSignature: string;
  taskId?: string | null;
};

// Records a driver training: officer signature is auto-appended from the
// officer's profile. Resolves the originating task and schedules the next one
// exactly one year out (Flow 4 auto-scheduling).
export async function submitTraining(input: SubmitTrainingInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("נדרשת התחברות");

  if (!input.driverSignature) throw new Error("נדרשת חתימת נהג");

  const { data: profile } = await supabase
    .from("profiles")
    .select("signature_url")
    .eq("id", user.id)
    .single();
  if (!profile?.signature_url) {
    throw new Error("יש לשמור חתימת קצין בטיחות בפרופיל לפני ביצוע הדרכה");
  }

  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("id, company_id")
    .eq("id", input.driverId)
    .single();
  if (driverError) throw driverError;

  const now = new Date();
  const nextDue = new Date(now);
  nextDue.setFullYear(nextDue.getFullYear() + 1);
  const nextDueDate = nextDue.toISOString().slice(0, 10);

  const { error: trainingError } = await supabase.from("trainings").insert({
    driver_id: input.driverId,
    officer_id: user.id,
    type: input.type,
    material_ack: true,
    driver_signature: input.driverSignature,
    officer_signature: profile.signature_url,
    next_due_date: nextDueDate,
    task_id: input.taskId ?? null,
  });
  if (trainingError) throw trainingError;

  if (input.taskId) {
    await supabase
      .from("tasks")
      .update({ status: "resolved", resolved_at: now.toISOString() })
      .eq("id", input.taskId);
  }

  // Schedule the next mandatory training.
  const { error: nextTaskError } = await supabase.from("tasks").insert({
    company_id: driver.company_id,
    entity_type: "driver",
    entity_id: input.driverId,
    task_type: "training",
    title: input.type,
    due_date: nextDueDate,
  });
  if (nextTaskError) throw nextTaskError;

  revalidatePath("/");
}
