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

// Captures a brand-new document from the field: photo → private `documents`
// bucket, then a row attributed to the vehicle/driver. company_id is derived
// from the entity row server-side, never trusted from the form. Expiry is
// optional — undated documents are stored but never raise feed alerts.
export async function addDocument(formData: FormData) {
  const entityType = String(formData.get("entityType") ?? "");
  const entityId = String(formData.get("entityId") ?? "");
  const docTypeId = String(formData.get("docTypeId") ?? "");
  const expiryDate = String(formData.get("expiryDate") ?? "");
  const file = formData.get("file");

  if (
    entityType !== "vehicle" &&
    entityType !== "driver" &&
    entityType !== "company"
  )
    throw new Error("סוג ישות לא חוקי");
  if (!entityId) throw new Error("ישות לא נמצאה");
  if (!docTypeId) throw new Error("יש לבחור סוג מסמך");
  if (!(file instanceof File) || file.size === 0)
    throw new Error("יש לצלם או לבחור קובץ");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("נדרשת התחברות");

  // Derive the owning company: for company docs the entity IS the company.
  let companyId: string;
  if (entityType === "company") {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", entityId)
      .single();
    if (companyError || !company) throw new Error("הישות לא נמצאה");
    companyId = company.id;
  } else {
    const table = entityType === "vehicle" ? "vehicles" : "drivers";
    const { data: entity, error: entityError } = await supabase
      .from(table)
      .select("company_id")
      .eq("id", entityId)
      .single();
    if (entityError || !entity) throw new Error("הישות לא נמצאה");
    companyId = entity.company_id;
  }

  const { data: docType, error: docTypeError } = await supabase
    .from("doc_types")
    .select("name")
    .eq("id", docTypeId)
    .single();
  if (docTypeError || !docType) throw new Error("סוג המסמך לא נמצא");

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${entityType}/${entityId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("documents").insert({
    entity_type: entityType,
    entity_id: entityId,
    company_id: companyId,
    doc_type: docType.name,
    doc_type_id: docTypeId,
    file_url: path,
    expiry_date: expiryDate || null,
  });
  if (insertError) throw insertError;

  revalidatePath("/");
  revalidatePath(
    entityType === "vehicle"
      ? `/vehicles/${entityId}`
      : entityType === "driver"
        ? `/drivers/${entityId}`
        : `/companies/${entityId}`,
  );
}
