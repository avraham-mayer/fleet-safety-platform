"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Uploads a defect photo to the public `defect-photos` bucket and returns its
// public URL. Called from the wizard when a checklist item is marked failed.
export async function uploadDefectPhoto(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("לא נבחר קובץ תמונה");
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("defect-photos")
    .upload(path, file, { contentType: file.type });

  if (error) throw error;

  const { data } = supabase.storage.from("defect-photos").getPublicUrl(path);
  return data.publicUrl;
}

export type ChecklistLineInput = {
  parameter_name: string;
  is_intact: boolean;
  remarks: string | null;
  photo_url: string | null;
};

export type SubmitInspectionInput = {
  vehicleId: string;
  driverId: string;
  templateId: string;
  taskId?: string | null;
  // Doc/expiry edits captured in step 1–2 (null = leave unchanged is not
  // supported; the wizard always sends the current values).
  vehicle: {
    insurance_expiry: string | null;
    tachograph_expiry: string | null;
    registration_expiry: string | null;
  };
  driver: {
    license_number: string | null;
    hazmat_certified: boolean;
  };
  summaryRemarks: string | null;
  officerSignature: string;
  driverSignature: string;
  lines: ChecklistLineInput[];
};

// Writes a completed inspection: persists step 1–2 edits to the vehicle/driver,
// inserts the inspection plus its checklist lines, then refreshes the queue.
export async function submitInspection(input: SubmitInspectionInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("נדרשת התחברות");

  if (!input.officerSignature || !input.driverSignature) {
    throw new Error("נדרשות שתי חתימות — קצין בטיחות ונהג");
  }

  const { error: vehicleError } = await supabase
    .from("vehicles")
    .update(input.vehicle)
    .eq("id", input.vehicleId);
  if (vehicleError) throw vehicleError;

  const { error: driverError } = await supabase
    .from("drivers")
    .update(input.driver)
    .eq("id", input.driverId);
  if (driverError) throw driverError;

  const { data: inspection, error: inspectionError } = await supabase
    .from("inspections")
    .insert({
      vehicle_id: input.vehicleId,
      driver_id: input.driverId,
      officer_id: user.id,
      status: "completed",
      summary_remarks: input.summaryRemarks,
      officer_signature: input.officerSignature,
      driver_signature: input.driverSignature,
      template_id: input.templateId,
      task_id: input.taskId ?? null,
    })
    .select("id")
    .single();
  if (inspectionError) throw inspectionError;

  const lines = input.lines.map((line) => ({
    inspection_id: inspection.id,
    parameter_name: line.parameter_name,
    is_intact: line.is_intact,
    remarks: line.remarks,
    photo_url: line.photo_url,
  }));

  const { error: linesError } = await supabase
    .from("inspection_checklist_lines")
    .insert(lines);
  if (linesError) throw linesError;

  // Resolve the originating scheduled task, if this inspection came from one.
  if (input.taskId) {
    await supabase
      .from("tasks")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", input.taskId);
  }

  revalidatePath("/");
  return { id: inspection.id as string };
}
