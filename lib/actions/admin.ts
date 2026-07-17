"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EntityType, VehicleStatus } from "@/lib/types";

// Admin portal write paths. Every action re-checks the caller's role — RLS is
// open to all authenticated users (small internal team), so admin-only rules
// are enforced here at the app level.
//
// Actions return a result object instead of throwing so the grids can show a
// specific Hebrew message (thrown Server Action errors are masked in prod).
export type ActionResult = { ok: true } | { ok: false; error: string };

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

  return supabase;
}

function fail(error: unknown, fallback: string): ActionResult {
  console.error(error);
  return { ok: false, error: fallback };
}

function refresh(path: string) {
  revalidatePath("/"); // officer feed derives from these tables
  revalidatePath(path);
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export type CompanyInput = {
  id?: string;
  name: string;
  ceo_name: string | null;
  prof_manager: string | null;
  address: string | null;
  handler_id: string | null;
};

export async function saveCompany(input: CompanyInput): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    if (!input.name.trim()) return { ok: false, error: "יש להזין שם חברה" };

    const row = {
      name: input.name.trim(),
      ceo_name: input.ceo_name,
      prof_manager: input.prof_manager,
      address: input.address,
      handler_id: input.handler_id,
    };

    const { error } = input.id
      ? await supabase.from("companies").update(row).eq("id", input.id)
      : await supabase.from("companies").insert(row);
    if (error) throw error;

    refresh("/admin/companies");
    return { ok: true };
  } catch (e) {
    return fail(e, "שמירת החברה נכשלה");
  }
}

export async function deleteCompany(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();

    // Deleting a company cascades to vehicles/drivers, but drivers with
    // inspection history are FK-restricted — surface that instead of failing.
    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        return {
          ok: false,
          error: "לא ניתן למחוק חברה שלנהגיה יש היסטוריית בדיקות",
        };
      }
      throw error;
    }

    refresh("/admin/companies");
    return { ok: true };
  } catch (e) {
    return fail(e, "מחיקת החברה נכשלה");
  }
}

// Assigns/clears the company's handling officer (מטפל אחראי) from the
// company card, without round-tripping the whole company form.
export async function assignHandler(
  companyId: string,
  handlerId: string | null,
): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase
      .from("companies")
      .update({ handler_id: handlerId })
      .eq("id", companyId);
    if (error) throw error;

    refresh("/admin/companies");
    revalidatePath(`/admin/companies/${companyId}`);
    return { ok: true };
  } catch (e) {
    return fail(e, "שיוך המטפל נכשל");
  }
}

// ---------------------------------------------------------------------------
// Vehicles
// ---------------------------------------------------------------------------

export type VehicleInput = {
  id?: string;
  company_id: string;
  license_plate: string;
  model: string;
  make: string | null;
  year: number | null;
  fuel_type: string | null;
  mileage: number | null;
  status: VehicleStatus;
  insurance_expiry: string | null;
  tachograph_expiry: string | null;
  registration_expiry: string | null;
};

export async function saveVehicle(input: VehicleInput): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    if (!input.company_id) return { ok: false, error: "יש לבחור חברה" };
    if (!input.license_plate.trim() || !input.model.trim()) {
      return { ok: false, error: "יש להזין מספר רישוי ודגם" };
    }

    const { id, ...row } = input;
    row.license_plate = row.license_plate.trim();
    row.model = row.model.trim();

    const { error } = id
      ? await supabase.from("vehicles").update(row).eq("id", id)
      : await supabase.from("vehicles").insert(row);
    if (error) throw error;

    refresh("/admin/vehicles");
    return { ok: true };
  } catch (e) {
    return fail(e, "שמירת הרכב נכשלה");
  }
}

export async function deleteVehicle(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) throw error;

    refresh("/admin/vehicles");
    return { ok: true };
  } catch (e) {
    return fail(e, "מחיקת הרכב נכשלה");
  }
}

// ---------------------------------------------------------------------------
// Drivers
// ---------------------------------------------------------------------------

export type DriverInput = {
  id?: string;
  company_id: string;
  name: string;
  license_number: string | null;
  id_number: string | null;
  license_expiry: string | null;
  hazmat_certified: boolean;
};

export async function saveDriver(input: DriverInput): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    if (!input.company_id) return { ok: false, error: "יש לבחור חברה" };
    if (!input.name.trim()) return { ok: false, error: "יש להזין שם נהג" };

    const { id, ...row } = input;
    row.name = row.name.trim();

    const { error } = id
      ? await supabase.from("drivers").update(row).eq("id", id)
      : await supabase.from("drivers").insert(row);
    if (error) throw error;

    refresh("/admin/drivers");
    return { ok: true };
  } catch (e) {
    return fail(e, "שמירת הנהג נכשלה");
  }
}

export async function deleteDriver(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("drivers").delete().eq("id", id);
    if (error) {
      // inspections.driver_id is ON DELETE RESTRICT — history must be kept.
      if (error.code === "23503") {
        return {
          ok: false,
          error: "לא ניתן למחוק נהג עם היסטוריית בדיקות",
        };
      }
      throw error;
    }

    refresh("/admin/drivers");
    return { ok: true };
  } catch (e) {
    return fail(e, "מחיקת הנהג נכשלה");
  }
}

// ---------------------------------------------------------------------------
// Documents (baseline compliance docs — the source of derived expiry alerts)
// ---------------------------------------------------------------------------

export type DocumentInput = {
  id?: string;
  entity_type: EntityType;
  entity_id: string;
  doc_type: string;
  expiry_date: string;
  issued_date: string | null;
};

export async function saveDocument(input: DocumentInput): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    if (!input.entity_id) return { ok: false, error: "יש לבחור רכב או נהג" };
    if (!input.doc_type.trim()) return { ok: false, error: "יש לבחור סוג מסמך" };
    if (!input.expiry_date) return { ok: false, error: "יש להזין תאריך תפוגה" };

    // Derive company_id from the owning entity — keeps the denormalized
    // column consistent even if the form was stale.
    const table = input.entity_type === "vehicle" ? "vehicles" : "drivers";
    const { data: entity, error: entityError } = await supabase
      .from(table)
      .select("company_id")
      .eq("id", input.entity_id)
      .single();
    if (entityError) throw entityError;

    const row = {
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      company_id: entity.company_id,
      doc_type: input.doc_type.trim(),
      expiry_date: input.expiry_date,
      issued_date: input.issued_date,
    };

    const { error } = input.id
      ? await supabase.from("documents").update(row).eq("id", input.id)
      : await supabase.from("documents").insert(row);
    if (error) throw error;

    refresh("/admin/documents");
    return { ok: true };
  } catch (e) {
    return fail(e, "שמירת המסמך נכשלה");
  }
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw error;

    refresh("/admin/documents");
    return { ok: true };
  } catch (e) {
    return fail(e, "מחיקת המסמך נכשלה");
  }
}

// ---------------------------------------------------------------------------
// Scheduling (materialized `tasks`: scheduled inspections + trainings)
// ---------------------------------------------------------------------------

export type ScheduleTaskInput = {
  task_type: "inspection" | "training";
  entity_id: string; // vehicle for inspections, driver for trainings
  title: string;
  due_date: string;
  template_id?: string | null; // inspections only
};

export async function scheduleTask(input: ScheduleTaskInput): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    if (!input.entity_id) return { ok: false, error: "יש לבחור רכב או נהג" };
    if (!input.due_date) return { ok: false, error: "יש להזין תאריך יעד" };

    const isInspection = input.task_type === "inspection";
    if (isInspection && !input.template_id) {
      return { ok: false, error: "יש לבחור תבנית בדיקה" };
    }

    let title = input.title.trim();
    if (isInspection && !title) {
      const { data: template } = await supabase
        .from("checklist_templates")
        .select("name")
        .eq("id", input.template_id!)
        .single();
      title = template?.name ?? "בדיקה מתוזמנת";
    }
    if (!title) return { ok: false, error: "יש להזין כותרת משימה" };

    const table = isInspection ? "vehicles" : "drivers";
    const { data: entity, error: entityError } = await supabase
      .from(table)
      .select("company_id")
      .eq("id", input.entity_id)
      .single();
    if (entityError) throw entityError;

    const { error } = await supabase.from("tasks").insert({
      company_id: entity.company_id,
      entity_type: isInspection ? "vehicle" : "driver",
      entity_id: input.entity_id,
      task_type: input.task_type,
      title,
      due_date: input.due_date,
      template_id: isInspection ? input.template_id : null,
    });
    if (error) throw error;

    refresh("/admin/schedule");
    return { ok: true };
  } catch (e) {
    return fail(e, "תזמון המשימה נכשל");
  }
}

// Cancels a scheduled task. Only pending tasks may be removed — resolved ones
// are audit history (and may be referenced by inspections/trainings).
export async function cancelTask(id: string): Promise<ActionResult> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .eq("status", "pending");
    if (error) throw error;

    refresh("/admin/schedule");
    return { ok: true };
  } catch (e) {
    return fail(e, "ביטול המשימה נכשל");
  }
}
