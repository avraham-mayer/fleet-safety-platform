# supabase/ — Schema & Seed

**The two-place rule: every schema change = a new migration here AND a
matching edit to [`lib/types.ts`](../lib/types.ts). Commit them together.**
Migrations are the source of truth; there is no ORM and no codegen.

## Files

| File | Contents |
|---|---|
| `migrations/0001_init.sql` | Core: companies, vehicles, drivers, inspections, inspection_checklist_lines; RLS; `defect-photos` + `vehicle-docs` buckets |
| `migrations/0002_phase2.sql` | profiles (+`handle_new_user` trigger), checklist_templates, documents, trainings, tasks; `documents` bucket |
| `migrations/0003_phase3.sql` | Legacy-program parity: handler_id on the 3 core entities, extended vehicle/driver fields, doc_types, vehicle_drivers, accidents, violations, medical_checks, courses, tachograph_checks |
| `migrations/0004_company_documents.sql` | Widens `documents.entity_type` + `doc_types.entity_type` CHECKs to allow `'company'` (fleet-level docs); `tasks` stays vehicle/driver-only |
| `seed.sql` | Optional sample data + the doc_types catalog (18 legacy treatment types) |

Never edit an applied migration — add a new `000N_*.sql`. Apply via the
Supabase SQL editor, `supabase db push`, or the MCP `apply_migration` tool.

## Tables

### Core entities
| Table | Purpose | Key columns |
|---|---|---|
| `companies` | Customer companies | name, ceo_name, prof_manager, address, phone, notes, **handler_id → profiles** |
| `vehicles` | Fleet vehicles | company_id, license_plate, model, status(active/…), insurance/tachograph/registration expiries, vin, vehicle_type, registration_date, weights (total/self/payload kg), monthly_fee, policy_type, handler_id |
| `drivers` | Drivers | company_id, name, id_number, license_number/type/restrictions/issue_year, hazmat_certified, address, city, phone, email, birth_date, work_start_date, handler_id |
| `profiles` | One per auth user (via `handle_new_user` trigger) | full_name, **role** ('admin' unlocks the portal), signature_url (base64 data-URL) |

### Inspection system
| Table | Purpose |
|---|---|
| `checklist_templates` | DB-driven checklists; `items` jsonb `[{key,label}]`; `type='monthly'` is the one the monthly queue counts |
| `inspections` | Completed inspections: vehicle, driver, officer, template_id, both signatures (base64 text), summary, optional task_id |
| `inspection_checklist_lines` | One row per checklist item: is_intact, remarks, photo_url |

### Alerts & documents
| Table | Purpose |
|---|---|
| `tasks` | **Materialized** alerts: entity_type+entity_id, task_type (inspection/training/document), title, due_date, template_id, status pending→resolved. Trainings and admin-scheduled inspections live here; monthly-inspection and doc-expiry alerts are DERIVED, not rows (see [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)) |
| `documents` | Compliance docs per entity: entity_type+entity_id, doc_type (display text), **doc_type_id → doc_types**, expiry_date (drives derived alerts), file_url (path in `documents` bucket) |
| `doc_types` | Treatment/document taxonomy (legacy "טיפולים"): entity_type, name, **recurrence_months** (prefills next expiry on renewal; null = one-off), active |
| `trainings` | Completed trainings: type, both signatures, next_due_date, task_id |

### Phase-3 sub-records (admin portal tables)
| Table | Belongs to |
|---|---|
| `vehicle_drivers` | vehicle↔driver assignment (unique pair, assigned_at) |
| `accidents` | vehicle and/or driver (check: at least one set) |
| `violations` | driver (type, fine_amount, points) |
| `medical_checks` | driver (check_type, checked_at, valid_until, result) |
| `courses` | driver (name, completed_at, valid_until, certificate_url) |
| `tachograph_checks` | driver (checked_at, period, findings) |

## RLS philosophy — permissive ON PURPOSE

Every table: authenticated users get full access (except `profiles`:
update-self only). This is a small internal team; admin-ness is enforced in
the app layer (`app/admin/layout.tsx` + `requireAdmin()` in
`lib/actions/admin.ts`), not in RLS. Supabase advisors will flag the
permissive policies — that is expected; do not "fix" it without a product
decision.

## Storage buckets

| Bucket | Visibility | Use |
|---|---|---|
| `defect-photos` | public | inspection failure photos |
| `documents` | private | document scans (renew flow + admin) |
| `vehicle-docs` | private | legacy phase-1 vehicle docs |

## Seed

`seed.sql` is optional demo data (companies/vehicles/drivers/templates/
documents/tasks) plus the **doc_types catalog insert, which IS wanted in
production** — it's the 18-type legacy taxonomy (ביטוח חובה 12mo, מבחן רישוי
שנתי 12mo, תעודת כיול טכוגרף 24mo, … תיק נהג one-off, הדרכת קיץ/חורף 12mo, …).
