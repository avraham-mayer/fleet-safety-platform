// Shared row types mirroring the SQL schema in supabase/migrations/.
// Hand-maintained (no ORM) — keep in sync with the migrations.

export type VehicleStatus = "active" | "pending";
export type Role = "admin" | "officer";
export type EntityType = "vehicle" | "driver";
// Documents (and their catalog) can also attach at company level (0004);
// tasks/inspections stay vehicle/driver-only — don't widen EntityType itself.
export type DocEntityType = EntityType | "company";
export type TaskType = "inspection" | "training" | "document";
export type TaskStatus = "pending" | "resolved";

export type Company = {
  id: string;
  name: string;
  ceo_name: string | null;
  prof_manager: string | null;
  address: string | null;
  handler_id: string | null;
  phone: string | null;
  notes: string | null;
  archived_at: string | null;
  archive_reason: string | null;
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
  handler_id: string | null;
  vin: string | null;
  vehicle_type: string | null;
  registration_date: string | null;
  total_weight_kg: number | null;
  self_weight_kg: number | null;
  payload_weight_kg: number | null;
  monthly_fee: number | null;
  policy_type: string | null;
  notes: string | null;
  archived_at: string | null;
  archive_reason: string | null;
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
  handler_id: string | null;
  license_type: string | null;
  license_restrictions: string | null;
  license_issue_year: number | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  work_start_date: string | null;
  notes: string | null;
  archived_at: string | null;
  archive_reason: string | null;
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

export type DocType = {
  id: string;
  entity_type: DocEntityType;
  name: string;
  recurrence_months: number | null;
  active: boolean;
  created_at: string;
};

export type Document = {
  id: string;
  entity_type: DocEntityType;
  entity_id: string;
  company_id: string;
  doc_type: string;
  doc_type_id: string | null;
  file_url: string | null;
  expiry_date: string | null;
  created_at: string;
};

export type VehicleDriver = {
  id: string;
  vehicle_id: string;
  driver_id: string;
  assigned_at: string | null;
  created_at: string;
};

export type Accident = {
  id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  occurred_at: string;
  description: string | null;
  location: string | null;
  file_url: string | null;
  notes: string | null;
  created_at: string;
};

export type Violation = {
  id: string;
  driver_id: string;
  occurred_at: string;
  violation_type: string | null;
  fine_amount: number | null;
  points: number | null;
  notes: string | null;
  created_at: string;
};

export type MedicalCheck = {
  id: string;
  driver_id: string;
  check_type: string | null;
  checked_at: string;
  valid_until: string | null;
  result: string | null;
  notes: string | null;
  created_at: string;
};

export type Course = {
  id: string;
  driver_id: string;
  name: string;
  completed_at: string | null;
  valid_until: string | null;
  certificate_url: string | null;
  notes: string | null;
  created_at: string;
};

export type TachographCheck = {
  id: string;
  driver_id: string;
  checked_at: string;
  period: string | null;
  findings: string | null;
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
  plate: string | null;
  driverName: string | null;
  dueDate: string | null;
  severity: Severity;
  href: string;
  handlerId: string | null;
};
