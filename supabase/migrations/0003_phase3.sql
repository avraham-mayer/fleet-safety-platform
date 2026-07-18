-- Phase 3: admin portal data model — handler assignment, richer entity cards,
-- doc-type catalog with recurrence, vehicle↔driver links, driver/vehicle records
-- (accidents, violations, medical checks, courses, tachograph audits).
-- Additive over 0002_phase2.sql. Run after 0002.

-- ---------------------------------------------------------------------------
-- Extend existing tables (all nullable — no data loss)
-- ---------------------------------------------------------------------------

alter table companies
  add column handler_id uuid references profiles (id),
  add column phone      text,
  add column notes      text;

alter table vehicles
  add column handler_id        uuid references profiles (id),
  add column vin               text,
  add column vehicle_type      text,
  add column registration_date date,
  add column total_weight_kg   int,
  add column self_weight_kg    int,
  add column payload_weight_kg int,
  add column monthly_fee       numeric(10,2),
  add column policy_type       text,
  add column notes             text;

alter table drivers
  add column handler_id           uuid references profiles (id),
  add column license_type         text,
  add column license_restrictions text,
  add column license_issue_year   int,
  add column address              text,
  add column city                 text,
  add column phone                text,
  add column email                text,
  add column birth_date           date,
  add column work_start_date      date,
  add column notes                text;

-- ---------------------------------------------------------------------------
-- doc_types — catalog of compliance document/treatment types with recurrence
-- (mirrors the legacy "טיפולים" taxonomy). Drives the renewal expiry prefill.
-- ---------------------------------------------------------------------------

create table doc_types (
  id                uuid primary key default gen_random_uuid(),
  entity_type       text not null check (entity_type in ('vehicle', 'driver')),
  name              text not null,
  recurrence_months int, -- null = no auto-recurrence
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

alter table documents
  add column doc_type_id uuid references doc_types (id);
-- documents.doc_type (free text) stays as the display label / back-compat.

-- ---------------------------------------------------------------------------
-- vehicle_drivers — נהגים צמודים / רכבים צמודים link
-- ---------------------------------------------------------------------------

create table vehicle_drivers (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references vehicles (id) on delete cascade,
  driver_id   uuid not null references drivers (id) on delete cascade,
  assigned_at date,
  created_at  timestamptz not null default now(),
  unique (vehicle_id, driver_id)
);

create index vehicle_drivers_vehicle_idx on vehicle_drivers (vehicle_id);
create index vehicle_drivers_driver_idx  on vehicle_drivers (driver_id);

-- ---------------------------------------------------------------------------
-- accidents — תאונות, attached to a vehicle and/or a driver
-- ---------------------------------------------------------------------------

create table accidents (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid references vehicles (id) on delete cascade,
  driver_id   uuid references drivers (id) on delete cascade,
  occurred_at date not null,
  description text,
  location    text,
  file_url    text,
  notes       text,
  created_at  timestamptz not null default now(),
  check (vehicle_id is not null or driver_id is not null)
);

create index accidents_vehicle_idx on accidents (vehicle_id);
create index accidents_driver_idx  on accidents (driver_id);

-- ---------------------------------------------------------------------------
-- violations — עבירות ודוחות per driver
-- ---------------------------------------------------------------------------

create table violations (
  id             uuid primary key default gen_random_uuid(),
  driver_id      uuid not null references drivers (id) on delete cascade,
  occurred_at    date not null,
  violation_type text,
  fine_amount    numeric(10,2),
  points         int,
  notes          text,
  created_at     timestamptz not null default now()
);

create index violations_driver_idx on violations (driver_id);

-- ---------------------------------------------------------------------------
-- medical_checks — בדיקות רפואיות per driver
-- ---------------------------------------------------------------------------

create table medical_checks (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references drivers (id) on delete cascade,
  check_type  text,
  checked_at  date not null,
  valid_until date,
  result      text,
  notes       text,
  created_at  timestamptz not null default now()
);

create index medical_checks_driver_idx on medical_checks (driver_id);

-- ---------------------------------------------------------------------------
-- courses — קורסים per driver
-- ---------------------------------------------------------------------------

create table courses (
  id              uuid primary key default gen_random_uuid(),
  driver_id       uuid not null references drivers (id) on delete cascade,
  name            text not null,
  completed_at    date,
  valid_until     date,
  certificate_url text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index courses_driver_idx on courses (driver_id);

-- ---------------------------------------------------------------------------
-- tachograph_checks — ביקורות טכוגרף per driver
-- ---------------------------------------------------------------------------

create table tachograph_checks (
  id         uuid primary key default gen_random_uuid(),
  driver_id  uuid not null references drivers (id) on delete cascade,
  checked_at date not null,
  period     text,
  findings   text,
  created_at timestamptz not null default now()
);

create index tachograph_checks_driver_idx on tachograph_checks (driver_id);

-- ---------------------------------------------------------------------------
-- RLS — authenticated full access (consistent with 0001/0002)
-- ---------------------------------------------------------------------------

alter table doc_types         enable row level security;
alter table vehicle_drivers   enable row level security;
alter table accidents         enable row level security;
alter table violations        enable row level security;
alter table medical_checks    enable row level security;
alter table courses           enable row level security;
alter table tachograph_checks enable row level security;

create policy "authenticated full access" on doc_types
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on vehicle_drivers
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on accidents
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on violations
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on medical_checks
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on courses
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on tachograph_checks
  for all to authenticated using (true) with check (true);
