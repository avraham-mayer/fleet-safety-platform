import { createClient } from "@/lib/supabase/server";
import { getTaskFeed } from "@/lib/actions/tasks";
import { currentCycleRange } from "@/lib/cycle";
import { severityFor } from "@/lib/expiry";
import type {
  Company,
  Document,
  Driver,
  EntityType,
  Severity,
  Task,
  Vehicle,
} from "@/lib/types";

// Read-only queries backing the officer-facing status views in app/(app)/.
// Scoping is company-only: an officer sees companies where
// companies.handler_id = them (admins see everything). Types live here rather
// than in lib/types.ts because they are view models, not schema rows.

export type OfficerCompany = {
  id: string;
  name: string;
  vehicleCount: number;
  driverCount: number;
  openItems: number;
  worstSeverity: Severity | null;
};

export type VehicleStatusRow = Pick<
  Vehicle,
  "id" | "license_plate" | "model" | "status"
> & {
  monthlyDone: boolean;
  docSeverity: Severity | null;
  pendingTasks: number;
};

export type DriverStatusRow = Pick<Driver, "id" | "name" | "license_expiry"> & {
  docSeverity: Severity | null;
  pendingTasks: number;
};

export type EntityDetail = {
  entityType: EntityType;
  entityId: string;
  label: string;
  companyId: string;
  companyName: string;
  documents: (Document & { severity: Severity })[];
  pendingTasks: Task[];
  monthlyDone?: boolean;
};

const SEVERITY_RANK: Record<Severity, number> = {
  expired: 0,
  warning: 1,
  ok: 2,
};

function worstOf(a: Severity | null, b: Severity): Severity {
  if (a === null) return b;
  return SEVERITY_RANK[b] < SEVERITY_RANK[a] ? b : a;
}

async function getScope() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, isAdmin: false };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return { supabase, userId: user.id, isAdmin: profile?.role === "admin" };
}

// Companies handled by the current officer (all companies for admins), each
// with entity counts and a rollup of its open feed items.
export async function getMyCompanies(): Promise<OfficerCompany[]> {
  const { supabase, userId, isAdmin } = await getScope();
  if (!userId) return [];

  let companiesQuery = supabase
    .from("companies")
    .select("id, name")
    .order("name");
  if (!isAdmin) companiesQuery = companiesQuery.eq("handler_id", userId);
  const { data: companies } = await companiesQuery;
  if (!companies?.length) return [];

  const companyIds = companies.map((c) => c.id);
  const [{ data: vehicles }, { data: drivers }, feed] = await Promise.all([
    supabase.from("vehicles").select("company_id").in("company_id", companyIds),
    supabase.from("drivers").select("company_id").in("company_id", companyIds),
    getTaskFeed(isAdmin ? undefined : { forHandlerId: userId }),
  ]);

  return companies.map((c) => {
    const items = feed.filter((i) => i.companyId === c.id);
    return {
      id: c.id,
      name: c.name,
      vehicleCount: (vehicles ?? []).filter((v) => v.company_id === c.id).length,
      driverCount: (drivers ?? []).filter((d) => d.company_id === c.id).length,
      openItems: items.length,
      worstSeverity: items.reduce<Severity | null>(
        (acc, i) => worstOf(acc, i.severity),
        null,
      ),
    };
  });
}

// Worst severity per entity over its dated documents. Undated documents don't
// count against the entity (severityFor(null) means "missing", not relevant here).
function docSeverityByEntity(docs: Document[]): Map<string, Severity> {
  const map = new Map<string, Severity>();
  for (const d of docs) {
    if (!d.expiry_date) continue;
    const key = `${d.entity_type}-${d.entity_id}`;
    map.set(key, worstOf(map.get(key) ?? null, severityFor(d.expiry_date)));
  }
  return map;
}

// Full status board for one company. Returns null when the company doesn't
// exist or isn't handled by the current officer.
export async function getCompanyStatus(companyId: string): Promise<{
  company: Company;
  vehicles: VehicleStatusRow[];
  drivers: DriverStatusRow[];
  companyDocuments: (Document & { severity: Severity })[];
} | null> {
  const { supabase, userId, isAdmin } = await getScope();
  if (!userId) return null;

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();
  if (!company) return null;
  if (!isAdmin && company.handler_id !== userId) return null;

  const [{ data: vehicles }, { data: drivers }, { data: docs }, { data: tasks }] =
    await Promise.all([
      supabase
        .from("vehicles")
        .select("id, license_plate, model, status")
        .eq("company_id", companyId)
        .order("license_plate"),
      supabase
        .from("drivers")
        .select("id, name, license_expiry")
        .eq("company_id", companyId)
        .order("name"),
      supabase.from("documents").select("*").eq("company_id", companyId),
      supabase
        .from("tasks")
        .select("entity_type, entity_id")
        .eq("company_id", companyId)
        .eq("status", "pending"),
    ]);

  // Monthly-cycle state, same rule as getMonthlyQueue but scoped to this company.
  const { start, end } = currentCycleRange();
  const { data: monthlyTemplates } = await supabase
    .from("checklist_templates")
    .select("id")
    .eq("type", "monthly");
  const monthlyIds = (monthlyTemplates ?? []).map((t) => t.id);
  const vehicleIds = (vehicles ?? []).map((v) => v.id);

  let doneIds = new Set<string>();
  if (vehicleIds.length > 0) {
    let doneQuery = supabase
      .from("inspections")
      .select("vehicle_id")
      .eq("status", "completed")
      .in("vehicle_id", vehicleIds)
      .gte("conducted_at", start.toISOString())
      .lt("conducted_at", end.toISOString());
    if (monthlyIds.length > 0) doneQuery = doneQuery.in("template_id", monthlyIds);
    const { data: done } = await doneQuery;
    doneIds = new Set((done ?? []).map((r) => r.vehicle_id));
  }

  const docSev = docSeverityByEntity((docs ?? []) as Document[]);
  const taskCount = new Map<string, number>();
  for (const t of tasks ?? []) {
    const key = `${t.entity_type}-${t.entity_id}`;
    taskCount.set(key, (taskCount.get(key) ?? 0) + 1);
  }

  return {
    company: company as Company,
    companyDocuments: ((docs ?? []) as Document[])
      .filter((d) => d.entity_type === "company")
      .map((d) => ({ ...d, severity: severityFor(d.expiry_date) })),
    vehicles: (vehicles ?? []).map((v) => ({
      ...v,
      monthlyDone: doneIds.has(v.id),
      docSeverity: docSev.get(`vehicle-${v.id}`) ?? null,
      pendingTasks: taskCount.get(`vehicle-${v.id}`) ?? 0,
    })),
    drivers: (drivers ?? []).map((d) => ({
      ...d,
      docSeverity: docSev.get(`driver-${d.id}`) ?? null,
      pendingTasks: taskCount.get(`driver-${d.id}`) ?? 0,
    })),
  };
}

// Detail card for one vehicle/driver: documents with severity, pending tasks,
// and (vehicles) the monthly-cycle state. Null when out of scope or missing.
export async function getEntityDetail(
  entityType: EntityType,
  entityId: string,
): Promise<EntityDetail | null> {
  const { supabase, userId, isAdmin } = await getScope();
  if (!userId) return null;

  const table = entityType === "vehicle" ? "vehicles" : "drivers";
  const { data: entity } = await supabase
    .from(table)
    .select("*")
    .eq("id", entityId)
    .single();
  if (!entity) return null;

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, handler_id")
    .eq("id", entity.company_id)
    .single();
  if (!company) return null;
  if (!isAdmin && company.handler_id !== userId) return null;

  const [{ data: docs }, { data: tasks }] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("expiry_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("status", "pending")
      .order("due_date", { ascending: true, nullsFirst: false }),
  ]);

  let monthlyDone: boolean | undefined;
  if (entityType === "vehicle") {
    const { start, end } = currentCycleRange();
    const { data: monthlyTemplates } = await supabase
      .from("checklist_templates")
      .select("id")
      .eq("type", "monthly");
    const monthlyIds = (monthlyTemplates ?? []).map((t) => t.id);
    let doneQuery = supabase
      .from("inspections")
      .select("id")
      .eq("status", "completed")
      .eq("vehicle_id", entityId)
      .gte("conducted_at", start.toISOString())
      .lt("conducted_at", end.toISOString())
      .limit(1);
    if (monthlyIds.length > 0) doneQuery = doneQuery.in("template_id", monthlyIds);
    const { data: done } = await doneQuery;
    monthlyDone = (done ?? []).length > 0;
  }

  return {
    entityType,
    entityId,
    label:
      entityType === "vehicle"
        ? (entity as Vehicle).license_plate
        : (entity as Driver).name,
    companyId: company.id,
    companyName: company.name,
    documents: ((docs ?? []) as Document[]).map((d) => ({
      ...d,
      severity: severityFor(d.expiry_date),
    })),
    pendingTasks: (tasks ?? []) as Task[],
    monthlyDone,
  };
}
