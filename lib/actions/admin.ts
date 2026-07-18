"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EntityType } from "@/lib/types";

// Admin-portal write paths. Every action re-checks the admin role server-side
// (defense in depth — the /admin layout gate only covers navigation).
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("נדרשת התחברות");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("נדרשת הרשאת מנהל");

  return { supabase, user };
}

// FormData helpers — empty strings become null so optional columns stay null.
const str = (fd: FormData, key: string): string | null => {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const num = (fd: FormData, key: string): number | null => {
  const v = str(fd, key);
  return v === null ? null : Number(v);
};

function revalidateAdmin() {
  revalidatePath("/", "layout"); // feed + all admin pages (internal tool, cheap)
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export async function saveCompany(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const row = {
    name: str(formData, "name") ?? "",
    ceo_name: str(formData, "ceo_name"),
    prof_manager: str(formData, "prof_manager"),
    address: str(formData, "address"),
    phone: str(formData, "phone"),
    handler_id: str(formData, "handler_id"),
    notes: str(formData, "notes"),
  };
  if (!row.name) throw new Error("נדרש שם חברה");

  if (id) {
    const { error } = await supabase.from("companies").update(row).eq("id", id);
    if (error) throw error;
    revalidateAdmin();
  } else {
    const { data, error } = await supabase
      .from("companies")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    revalidateAdmin();
    redirect(`/admin/companies/${data.id}`);
  }
}

export async function deleteCompany(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  if (!id) throw new Error("חברה לא נמצאה");
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
  revalidateAdmin();
  redirect("/admin");
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export async function saveVehicle(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const companyId = str(formData, "company_id");
  const row = {
    company_id: companyId ?? "",
    license_plate: str(formData, "license_plate") ?? "",
    model: str(formData, "model") ?? "",
    make: str(formData, "make"),
    year: num(formData, "year"),
    fuel_type: str(formData, "fuel_type"),
    mileage: num(formData, "mileage"),
    status: str(formData, "status") ?? "active",
    handler_id: str(formData, "handler_id"),
    vin: str(formData, "vin"),
    vehicle_type: str(formData, "vehicle_type"),
    registration_date: str(formData, "registration_date"),
    total_weight_kg: num(formData, "total_weight_kg"),
    self_weight_kg: num(formData, "self_weight_kg"),
    payload_weight_kg: num(formData, "payload_weight_kg"),
    monthly_fee: num(formData, "monthly_fee"),
    policy_type: str(formData, "policy_type"),
    insurance_expiry: str(formData, "insurance_expiry"),
    tachograph_expiry: str(formData, "tachograph_expiry"),
    registration_expiry: str(formData, "registration_expiry"),
    notes: str(formData, "notes"),
  };
  if (!row.company_id) throw new Error("נדרשת חברה");
  if (!row.license_plate) throw new Error("נדרש מספר רישוי");
  if (!row.model) throw new Error("נדרש דגם");

  if (id) {
    const { error } = await supabase.from("vehicles").update(row).eq("id", id);
    if (error) throw error;
    revalidateAdmin();
  } else {
    const { data, error } = await supabase
      .from("vehicles")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    revalidateAdmin();
    redirect(`/admin/vehicles/${data.id}`);
  }
}

export async function deleteVehicle(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const companyId = str(formData, "company_id");
  if (!id) throw new Error("רכב לא נמצא");
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
  revalidateAdmin();
  redirect(companyId ? `/admin/companies/${companyId}` : "/admin");
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

export async function saveDriver(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const row = {
    company_id: str(formData, "company_id") ?? "",
    name: str(formData, "name") ?? "",
    license_number: str(formData, "license_number"),
    id_number: str(formData, "id_number"),
    license_expiry: str(formData, "license_expiry"),
    hazmat_certified: formData.get("hazmat_certified") === "on",
    handler_id: str(formData, "handler_id"),
    license_type: str(formData, "license_type"),
    license_restrictions: str(formData, "license_restrictions"),
    license_issue_year: num(formData, "license_issue_year"),
    address: str(formData, "address"),
    city: str(formData, "city"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    birth_date: str(formData, "birth_date"),
    work_start_date: str(formData, "work_start_date"),
    notes: str(formData, "notes"),
  };
  if (!row.company_id) throw new Error("נדרשת חברה");
  if (!row.name) throw new Error("נדרש שם נהג");

  if (id) {
    const { error } = await supabase.from("drivers").update(row).eq("id", id);
    if (error) throw error;
    revalidateAdmin();
  } else {
    const { data, error } = await supabase
      .from("drivers")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    revalidateAdmin();
    redirect(`/admin/drivers/${data.id}`);
  }
}

export async function deleteDriver(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const companyId = str(formData, "company_id");
  if (!id) throw new Error("נהג לא נמצא");
  const { error } = await supabase.from("drivers").delete().eq("id", id);
  if (error) throw error;
  revalidateAdmin();
  redirect(companyId ? `/admin/companies/${companyId}` : "/admin");
}

// ---------------------------------------------------------------------------
// Documents (treatments) — create/update rows in `documents`; the derived
// expiry alerts on the feed pick them up automatically.
// ---------------------------------------------------------------------------

export async function saveDocument(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const entityType = str(formData, "entity_type") as EntityType | null;
  const entityId = str(formData, "entity_id");
  const companyId = str(formData, "company_id");
  const docTypeId = str(formData, "doc_type_id");
  let docType = str(formData, "doc_type");
  const expiryDate = str(formData, "expiry_date");
  const file = formData.get("file");

  if (!entityType || !entityId || !companyId) throw new Error("ישות לא נמצאה");

  // Resolve display label from the catalog when a doc_type_id is chosen.
  if (docTypeId) {
    const { data: dt } = await supabase
      .from("doc_types")
      .select("name")
      .eq("id", docTypeId)
      .single();
    docType = dt?.name ?? docType;
  }
  if (!docType) throw new Error("נדרש סוג מסמך");

  let fileUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${entityType}/${entityId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    fileUrl = path;
  }

  const row: Record<string, unknown> = {
    entity_type: entityType,
    entity_id: entityId,
    company_id: companyId,
    doc_type: docType,
    doc_type_id: docTypeId,
    expiry_date: expiryDate,
  };
  if (fileUrl) row.file_url = fileUrl;

  const { error } = id
    ? await supabase.from("documents").update(row).eq("id", id)
    : await supabase.from("documents").insert(row);
  if (error) throw error;
  revalidateAdmin();
}

export async function deleteDocument(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  if (!id) throw new Error("מסמך לא נמצא");
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Doc-type catalog
// ---------------------------------------------------------------------------

export async function saveDocType(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const row = {
    entity_type: str(formData, "entity_type") ?? "vehicle",
    name: str(formData, "name") ?? "",
    recurrence_months: num(formData, "recurrence_months"),
    active: formData.get("active") !== "off",
  };
  if (!row.name) throw new Error("נדרש שם");

  const { error } = id
    ? await supabase.from("doc_types").update(row).eq("id", id)
    : await supabase.from("doc_types").insert(row);
  if (error) throw error;
  revalidateAdmin();
}

export async function toggleDocType(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  if (!id) throw new Error("סוג מסמך לא נמצא");
  const { data: dt } = await supabase
    .from("doc_types")
    .select("active")
    .eq("id", id)
    .single();
  const { error } = await supabase
    .from("doc_types")
    .update({ active: !dt?.active })
    .eq("id", id);
  if (error) throw error;
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Vehicle ↔ driver assignment (נהגים צמודים)
// ---------------------------------------------------------------------------

export async function assignVehicleDriver(formData: FormData) {
  const { supabase } = await requireAdmin();
  const vehicleId = str(formData, "vehicle_id");
  const driverId = str(formData, "driver_id");
  if (!vehicleId || !driverId) throw new Error("נדרשים רכב ונהג");
  const { error } = await supabase.from("vehicle_drivers").upsert(
    {
      vehicle_id: vehicleId,
      driver_id: driverId,
      assigned_at: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "vehicle_id,driver_id" },
  );
  if (error) throw error;
  revalidateAdmin();
}

export async function unassignVehicleDriver(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  if (!id) throw new Error("שיוך לא נמצא");
  const { error } = await supabase.from("vehicle_drivers").delete().eq("id", id);
  if (error) throw error;
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Driver/vehicle record tables (accidents, violations, medical checks,
// courses, tachograph audits) — one generic save/delete over an allowlist.
// ---------------------------------------------------------------------------

const RECORD_TABLES = {
  accidents: {
    dates: ["occurred_at"],
    texts: ["vehicle_id", "driver_id", "description", "location", "notes"],
    nums: [],
  },
  violations: {
    dates: ["occurred_at"],
    texts: ["driver_id", "violation_type", "notes"],
    nums: ["fine_amount", "points"],
  },
  medical_checks: {
    dates: ["checked_at", "valid_until"],
    texts: ["driver_id", "check_type", "result", "notes"],
    nums: [],
  },
  courses: {
    dates: ["completed_at", "valid_until"],
    texts: ["driver_id", "name", "notes"],
    nums: [],
  },
  tachograph_checks: {
    dates: ["checked_at"],
    texts: ["driver_id", "period", "findings"],
    nums: [],
  },
} as const;

export type RecordTable = keyof typeof RECORD_TABLES;

export async function saveRecord(formData: FormData) {
  const { supabase } = await requireAdmin();
  const table = str(formData, "table") as RecordTable | null;
  if (!table || !(table in RECORD_TABLES)) throw new Error("טבלה לא מוכרת");

  const cfg = RECORD_TABLES[table];
  const row: Record<string, unknown> = {};
  for (const k of [...cfg.dates, ...cfg.texts]) row[k] = str(formData, k);
  for (const k of cfg.nums) row[k] = num(formData, k);

  const id = str(formData, "id");
  const { error } = id
    ? await supabase.from(table).update(row).eq("id", id)
    : await supabase.from(table).insert(row);
  if (error) throw error;
  revalidateAdmin();
}

export async function deleteRecord(formData: FormData) {
  const { supabase } = await requireAdmin();
  const table = str(formData, "table") as RecordTable | null;
  const id = str(formData, "id");
  if (!table || !(table in RECORD_TABLES)) throw new Error("טבלה לא מוכרת");
  if (!id) throw new Error("רשומה לא נמצאה");
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
  revalidateAdmin();
}

// ---------------------------------------------------------------------------
// Task scheduling — materialize a `tasks` row (scheduled inspection with a
// checklist template, or a training) that shows up in the officer feed.
// ---------------------------------------------------------------------------

export async function scheduleTask(formData: FormData) {
  const { supabase } = await requireAdmin();
  const row = {
    company_id: str(formData, "company_id"),
    entity_type: (str(formData, "entity_type") ?? "vehicle") as EntityType,
    entity_id: str(formData, "entity_id") ?? "",
    task_type: str(formData, "task_type") ?? "inspection",
    title: str(formData, "title") ?? "",
    due_date: str(formData, "due_date"),
    template_id: str(formData, "template_id"),
  };
  if (!row.entity_id) throw new Error("ישות לא נמצאה");
  if (!row.title) throw new Error("נדרשת כותרת");

  const { error } = await supabase.from("tasks").insert(row);
  if (error) throw error;
  revalidateAdmin();
}

export async function resolveTask(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  if (!id) throw new Error("משימה לא נמצאה");
  const { error } = await supabase
    .from("tasks")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidateAdmin();
}
