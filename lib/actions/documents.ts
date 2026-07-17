"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Renews a compliance document (Flow 5): uploads the new photo to the private
// `documents` bucket, updates expiry_date + file_url, and resolves any pending
// document task for the same entity. Clearing/updating expiry removes the
// derived alert from the feed automatically.
export async function renewDocument(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");
  const expiryDate = String(formData.get("expiryDate") ?? "");
  const file = formData.get("file");

  if (!documentId) throw new Error("מסמך לא נמצא");
  if (!expiryDate) throw new Error("יש להזין תאריך תפוגה חדש");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("נדרשת התחברות");

  const update: { expiry_date: string; file_url?: string } = {
    expiry_date: expiryDate,
  };

  if (file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${documentId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    update.file_url = path;
  }

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .update(update)
    .eq("id", documentId)
    .select("entity_type, entity_id")
    .single();
  if (docError) throw docError;

  // Resolve a matching pending document task for this entity, if any.
  await supabase
    .from("tasks")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("task_type", "document")
    .eq("entity_type", doc.entity_type)
    .eq("entity_id", doc.entity_id)
    .eq("status", "pending");

  revalidatePath("/");
}
