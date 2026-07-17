// Shared row types mirroring the SQL schema in supabase/migrations/.
// Hand-maintained (no ORM) — keep in sync with the migrations.

export type VehicleStatus = "active" | "pending";
export type Role = "admin" | "officer";
export type EntityType = "vehicle" | "driver";
export type TaskType = "inspection" | "training" | "document";
export type TaskStatus = "pending" | "resolved";

export type Company = {
  id: string;
  name: string;
  ceo_name: string | null;
  prof_manager: string | null;
  address: string | null;
  handler_id: string | null; // assigned safety officer (מטפל אחראי)
  created_at: string;
};

export type Vehicle = {
  id: string;
  company_id: string;
  license_plate: string;
  model: string;
  make: string | null;
  year: number | null;
  fuel_type: string | null;
  mileage: number | null;
  insurance_expiry: string | null;
  tachograph_expiry: string | null;
  registration_expiry: string | null;
  status: VehicleStatus;
  created_at: string;
};

export type Driver = {
  id: string;
  company_id: string;
  name: string;
  license_number: string | null;
  id_number: string | null;
  license_expiry: string | null;
  hazmat_certified: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  role: Role;
  signature_url: string | null;
  created_at: string;
};

export type ChecklistItem = { key: string; label: string };

export type ChecklistTemplate = {
  id: string;
  name: string;
  type: string;
  items: ChecklistItem[];
  active: boolean;
  created_at: string;
};

export type Document = {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  company_id: string;
  doc_type: string;
  file_url: string | null;
  expiry_date: string | null;
  issued_date: string | null; // בוצע בתאריך — set on renewal
  created_at: string;
};

export type Inspection = {
  id: string;
  vehicle_id: string;
  driver_id: string;
  officer_id: string;
  status: string;
  conducted_at: string;
  summary_remarks: string | null;
  officer_signature: string;
  driver_signature: string;
  template_id: string | null;
  task_id: string | null;
  created_at: string;
};

export type InspectionChecklistLine = {
  id: string;
  inspection_id: string;
  parameter_name: string;
  is_intact: boolean;
  remarks: string | null;
  photo_url: string | null;
  created_at: string;
};

export type Training = {
  id: string;
  driver_id: string;
  officer_id: string;
  type: string;
  conducted_at: string;
  material_ack: boolean;
  driver_signature: string;
  officer_signature: string;
  next_due_date: string | null;
  task_id: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  company_id: string | null;
  entity_type: EntityType;
  entity_id: string;
  task_type: TaskType;
  title: string;
  due_date: string | null;
  status: TaskStatus;
  template_id: string | null;
  resolved_at: string | null;
  created_at: string;
};

// A queue row: a vehicle that still needs an inspection this cycle, with its company.
export type QueueVehicle = Vehicle & { company: Pick<Company, "id" | "name"> };

export type Severity = "ok" | "warning" | "expired";

// Unified item shown in the aggregated dashboard feed — built from derived
// alerts (monthly inspections, expiring documents) and materialized tasks.
export type FeedItem = {
  id: string;
  kind: TaskType;
  title: string;
  subtitle: string; // e.g. plate / driver · company
  companyId: string | null;
  companyName: string;
  handlerId: string | null; // the company's assigned officer
  plate: string | null;
  driverName: string | null;
  dueDate: string | null;
  severity: Severity;
  href: string;
};
