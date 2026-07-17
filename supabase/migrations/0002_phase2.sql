-- Phase 2: profiles/roles, checklist templates, documents, trainings, tasks.
-- Additive over 0001_init.sql. Run after 0001.

-- ---------------------------------------------------------------------------
-- Extend existing tables (all nullable — no data loss)
-- ---------------------------------------------------------------------------

alter table companies
  add column ceo_name     text,
  add column prof_manager text,
  add column address      text;

alter table vehicles
  add column make      text,
  add column year      int,
  add column fuel_type text,
  add column mileage   int;

alter table drivers
  add column id_number      text,
  add column license_expiry date;

-- ---------------------------------------------------------------------------
-- profiles — one row per auth user, holds role + pre-saved officer signature
-- ---------------------------------------------------------------------------

create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  role          text not null default 'officer' check (role in ('admin', 'officer')),
  signature_url text, -- base64 data URL of the officer's saved signature
  created_at    timestamptz not null default now()
);

-- Auto-create a profile whenever an auth user is created.
create function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- checklist_templates — configurable inspection checklists (items default Pass)
-- ---------------------------------------------------------------------------

create table checklist_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null, -- 'monthly' | 'winter' | 'brakes' | ...
  items      jsonb not null default '[]', -- [{ "key": "tires", "label": "צמיגים / Tires" }, ...]
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- documents — polymorphic compliance docs; canonical source for expiry alerts
-- ---------------------------------------------------------------------------

create table documents (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('vehicle', 'driver')),
  entity_id   uuid not null,
  company_id  uuid not null references companies (id) on delete cascade,
  doc_type    text not null,
  file_url    text,
  expiry_date date,
  created_at  timestamptz not null default now()
);

create index documents_entity_idx on documents (entity_type, entity_id);
create index documents_expiry_idx on documents (expiry_date);

-- ---------------------------------------------------------------------------
-- trainings — driver training records with dual signature + next due date
-- ---------------------------------------------------------------------------

create table trainings (
  id                uuid primary key default gen_random_uuid(),
  driver_id         uuid not null references drivers (id) on delete cascade,
  officer_id        uuid not null references auth.users (id),
  type              text not null,
  conducted_at      timestamptz not null default now(),
  material_ack      boolean not null default false,
  driver_signature  text not null,
  officer_signature text not null,
  next_due_date     date,
  task_id           uuid,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks — materialized scheduled work (trainings, scheduled inspections)
-- ---------------------------------------------------------------------------

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies (id) on delete cascade,
  entity_type text not null check (entity_type in ('vehicle', 'driver')),
  entity_id   uuid not null,
  task_type   text not null check (task_type in ('inspection', 'training', 'document')),
  title       text not null,
  due_date    date,
  status      text not null default 'pending' check (status in ('pending', 'resolved')),
  template_id uuid references checklist_templates (id),
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index tasks_status_due_idx on tasks (status, due_date);

-- Link inspections to the template used and the task they resolve (if any).
alter table inspections
  add column template_id uuid references checklist_templates (id),
  add column task_id     uuid references tasks (id);

-- ---------------------------------------------------------------------------
-- RLS — authenticated full access (consistent with 0001), profiles update self
-- ---------------------------------------------------------------------------

alter table profiles            enable row level security;
alter table checklist_templates enable row level security;
alter table documents           enable row level security;
alter table trainings           enable row level security;
alter table tasks               enable row level security;

create policy "authenticated read profiles" on profiles
  for select to authenticated using (true);
create policy "update own profile" on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "authenticated full access" on checklist_templates
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on documents
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on trainings
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on tasks
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Storage: private documents bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('documents', 'documents', false)
  on conflict (id) do nothing;

create policy "authenticated read documents bucket" on storage.objects
  for select to authenticated using (bucket_id = 'documents');
create policy "authenticated upload documents bucket" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');
