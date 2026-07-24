# lib/actions/ — Server Actions (all write paths)

Every DB write in the app goes through a Server Action in this directory.
All actions get the user's cookie-bound Supabase client
(`lib/supabase/server.ts`) — RLS applies. Errors are thrown as Hebrew
strings shown to the user.

Two auth levels:
- **Authenticated** (any signed-in user): officer flows.
- **Admin** (`requireAdmin()` throws unless `profiles.role === 'admin'`):
  everything in `admin.ts`. This re-check is deliberate defense-in-depth —
  layout redirects do NOT protect server actions called directly.

## Officer flows

| File | Function | What it does |
|---|---|---|
| `tasks.ts` | `getTaskFeed(opts?)` | READ: builds the merged feed (derived monthly queue + pending `tasks` + expiring documents), resolves company/plate/driver/handler labels, sorts expired→warning→ok. **Archived entities are excluded** — it loads only `archived_at IS NULL` companies/vehicles/drivers and skips any task/doc whose entity (or owning company) is archived. `{ forHandlerId }` scopes it to companies where `companies.handler_id` matches (officer view); omit for the full feed (admin). Also backs the work-list report. See [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md). |
| `officer.ts` | `getMyCompanies` / `getCompanyStatus` / `getEntityDetail` | READ: officer status browsing (`/companies`, `/vehicles/[id]`, `/drivers/[id]`). Company-only scoping: officers see companies they handle, admins see all; out-of-scope lookups return null → 404. View-model types live here, not in `lib/types.ts`. |
| `queue.ts` | `getMonthlyQueue()` | READ: active vehicles minus those with a completed monthly-template inspection in `currentCycleRange()`. |
| `inspections.ts` | `submitInspection()` | One logical txn: persist wizard step-1/2 vehicle+driver edits → insert inspection (both signatures, template_id) → bulk-insert checklist lines → resolve linked task if any → `revalidatePath("/")`. |
| `inspections.ts` | `uploadDefectPhoto()` | Upload to public `defect-photos` bucket, returns public URL. |
| `trainings.ts` | `submitTraining()` | Insert training (officer signature auto-appended from `profiles.signature_url` — throws if not saved), resolve linked task, **auto-insert next year's training task** (+1 year due date). |
| `documents.ts` | `renewDocument()` | Update `expiry_date` (+ optional file upload to private `documents` bucket), resolve any pending document task for the entity. Updating the expiry is itself what clears the derived alert. |
| `documents.ts` | `addDocument()` | Field capture of a brand-new document: photo → private `documents` bucket, insert row attributed to vehicle/driver/company. `company_id` is derived server-side from the entity row, never trusted from the form. Expiry optional (undated docs never alert). |
| `profile.ts` | `getMyProfile` / `getOfficerSignature` / `saveSignature` | Officer's reusable signature (base64 data-URL in `profiles.signature_url`). |

## Admin: checklist templates (`templates.ts`)

`saveTemplate` / `toggleTemplate` back `/admin/settings/templates`. Kept in
their own file (with a deliberate copy of `requireAdmin`) instead of
`admin.ts`. Items are edited as one-label-per-line text; on save, unchanged
labels keep their existing `key` so historical
`inspection_checklist_lines.parameter_name` stays comparable.

## Admin portal (`admin.ts` — every function starts with `requireAdmin()`)

| Group | Functions | Notes |
|---|---|---|
| Companies | `saveCompany` / `deleteCompany` | Upsert by presence of hidden `id` field; create redirects to the new entity page. Delete cascades (FKs). |
| Vehicles / Drivers | `saveVehicle` / `deleteVehicle` / `saveDriver` / `deleteDriver` | Same upsert-or-create pattern; handle all Phase-3 fields. |
| Documents | `saveDocument` / `deleteDocument` | Resolves display `doc_type` text from `doc_types` when `doc_type_id` given; optional upload to `documents` bucket at `<entityType>/<entityId>/<uuid>.<ext>`. |
| Archive | `archiveRecord` / `unarchiveRecord` | **Soft-retire over the `{companies,vehicles,drivers}` allowlist** (table from a validated hidden field). Sets/clears `archived_at` (+ `archive_reason`). Archived rows disappear from lists, the company tree, and the **alert feed** — see the `getTaskFeed` note above (it selects `archived_at IS NULL` entities and skips tasks/docs whose entity or company is archived). |
| Taxonomy | `saveDocType` / `toggleDocType` | The `/admin/settings/doc-types` catalog. |
| Assignment | `assignVehicleDriver` / `unassignVehicleDriver` | Upsert on unique (vehicle_id, driver_id). |
| Sub-records | `saveRecord` / `deleteRecord` | **Generic CRUD over the `RECORD_TABLES` allowlist** (accidents, violations, medical_checks, courses, tachograph_checks). The table name comes from a hidden form field and is validated against the allowlist — never widen this to arbitrary table names. Each entry declares its date/text/number field lists. |
| Tasks | `scheduleTask` / `resolveTask` | Insert a materialized `tasks` row (scheduled inspection with optional `template_id`, or training) / mark resolved. This is how admin puts work on the officer's feed. |

All admin mutations end with `revalidatePath("/", "layout")` (edits ripple
across many pages).

## Conventions

- Actions take `FormData` (progressive enhancement — plain `<form action={...}>`
  works without JS), except the wizard-driven `submitInspection` /
  `submitTraining`, which take typed objects from client components.
- Form parsing helpers in `admin.ts`: `str(fd, key)` → trimmed string or
  null; `num(fd, key)` → number or null. Empty inputs become NULL, not `""`.
- Resolve-task pattern: officer flows accept an optional `taskId` (from the
  feed URL `?task=…`) and set `status='resolved'` + `resolved_at` on completion.
