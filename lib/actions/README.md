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
| `tasks.ts` | `getTaskFeed()` | READ: builds the merged feed (derived monthly queue + pending `tasks` + expiring documents), resolves company/plate/driver/handler labels, sorts expired→warning→ok. See [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md). |
| `queue.ts` | `getMonthlyQueue()` | READ: active vehicles minus those with a completed monthly-template inspection in `currentCycleRange()`. |
| `inspections.ts` | `submitInspection()` | One logical txn: persist wizard step-1/2 vehicle+driver edits → insert inspection (both signatures, template_id) → bulk-insert checklist lines → resolve linked task if any → `revalidatePath("/")`. |
| `inspections.ts` | `uploadDefectPhoto()` | Upload to public `defect-photos` bucket, returns public URL. |
| `trainings.ts` | `submitTraining()` | Insert training (officer signature auto-appended from `profiles.signature_url` — throws if not saved), resolve linked task, **auto-insert next year's training task** (+1 year due date). |
| `documents.ts` | `renewDocument()` | Update `expiry_date` (+ optional file upload to private `documents` bucket), resolve any pending document task for the entity. Updating the expiry is itself what clears the derived alert. |
| `profile.ts` | `getMyProfile` / `getOfficerSignature` / `saveSignature` | Officer's reusable signature (base64 data-URL in `profiles.signature_url`). |

## Admin portal (`admin.ts` — every function starts with `requireAdmin()`)

| Group | Functions | Notes |
|---|---|---|
| Companies | `saveCompany` / `deleteCompany` | Upsert by presence of hidden `id` field; create redirects to the new entity page. Delete cascades (FKs). |
| Vehicles / Drivers | `saveVehicle` / `deleteVehicle` / `saveDriver` / `deleteDriver` | Same upsert-or-create pattern; handle all Phase-3 fields. |
| Documents | `saveDocument` / `deleteDocument` | Resolves display `doc_type` text from `doc_types` when `doc_type_id` given; optional upload to `documents` bucket at `<entityType>/<entityId>/<uuid>.<ext>`. |
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
