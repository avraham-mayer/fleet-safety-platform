-- Fleet Safety Inspection System — initial schema
-- Run against your Supabase project (SQL editor or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table vehicles (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references companies (id) on delete cascade,
  license_plate       text not null,
  model               text not null,
  insurance_expiry    date,
  tachograph_expiry   date,
  registration_expiry date,
  status              text not null default 'active' check (status in ('active', 'pending')),
  created_at          timestamptz not null default now()
);

create table drivers (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references companies (id) on delete cascade,
  name            text not null,
  license_number  text,
  hazmat_certified boolean not null default false,
  created_at      timestamptz not null default now()
);

create table inspections (
  id                uuid primary key default gen_random_uuid(),
  vehicle_id        uuid not null references vehicles (id) on delete cascade,
  driver_id         uuid not null references drivers (id) on delete restrict,
  officer_id        uuid not null references auth.users (id),
  status            text not null default 'completed',
  conducted_at      timestamptz not null default now(),
  summary_remarks   text,
  officer_signature text not null, -- base64 data URL from the signature canvas
  driver_signature  text not null,
  created_at        timestamptz not null default now()
);

create table inspection_checklist_lines (
  id             uuid primary key default gen_random_uuid(),
  inspection_id  uuid not null references inspections (id) on delete cascade,
  parameter_name text not null,
  is_intact      boolean not null,
  remarks        text,
  photo_url      text,
  created_at     timestamptz not null default now()
);

-- Drives the monthly-queue lookup: "does this vehicle have a completed
-- inspection within the current cycle window?"
create index inspections_vehicle_conducted_idx
  on inspections (vehicle_id, conducted_at);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Internal tool for a small team: any signed-in officer may read/write all
-- rows. No per-row tenancy. Tighten later if multi-tenant access is needed.
-- ---------------------------------------------------------------------------

alter table companies                 enable row level security;
alter table vehicles                  enable row level security;
alter table drivers                   enable row level security;
alter table inspections               enable row level security;
alter table inspection_checklist_lines enable row level security;

create policy "authenticated full access" on companies
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on vehicles
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on drivers
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on inspections
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on inspection_checklist_lines
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('defect-photos', 'defect-photos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('vehicle-docs', 'vehicle-docs', false)
  on conflict (id) do nothing;

-- Anyone may read public defect photos; signed-in officers may upload to either bucket.
create policy "public read defect photos" on storage.objects
  for select using (bucket_id = 'defect-photos');

create policy "authenticated upload defect photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'defect-photos');

create policy "authenticated read vehicle docs" on storage.objects
  for select to authenticated using (bucket_id = 'vehicle-docs');

create policy "authenticated upload vehicle docs" on storage.objects
  for insert to authenticated with check (bucket_id = 'vehicle-docs');
