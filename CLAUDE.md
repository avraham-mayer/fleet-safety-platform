# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> Next.js 16 here. Conventions differ from training data — read `node_modules/next/dist/docs/` before writing Next-specific code. Notably: `middleware.ts` is deprecated for `proxy.ts` (export `proxy`); route `params` and `searchParams` are Promises (`await` them).

## What this is

Fleet Safety Officer platform for a small operator (~140–150 vehicles). A safety
officer logs in on mobile and works an aggregated task feed: monthly vehicle
inspections, driver trainings, and compliance-document renewals. Hebrew-first, RTL.

Stack: Next.js 16 App Router · TS · Tailwind v4 · Supabase (Postgres + Auth + Storage). No ORM.

## Docs index (read the one matching your task)

- `docs/ARCHITECTURE.md` — hybrid alerts, auth layers, task lifecycle, buckets
- `docs/DEPLOYMENT.md` — Vercel + Supabase prod setup, rollback
- `docs/MAINTENANCE.md` — runbook: schema changes, users, debugging table
- `supabase/README.md` — full table reference, RLS philosophy
- `app/README.md` · `lib/README.md` · `lib/actions/README.md` · `components/README.md` — per-directory deep dives

## Commands

`node` is via nvm and NOT on PATH. Prefix every shell command, and force nvm's
npm ahead of the Windows npm shim (otherwise scripts run under cmd.exe and fail):
```
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"
```
- `npm run dev` — dev server
- `npm run build` — prod build (also typechecks); needs a `.env.local` to exist
- `npm run lint` — ESLint
- `npm test` — Vitest (run once); `npm run test:watch` — watch mode

Build verification needs placeholder env vars in `.env.local` (real values for
runtime). See `README.md` for Supabase setup.

## Testing is mandatory — Test-Driven Development

**Every behavioural change ships with tests, written test-first.** No feature or
bug-fix merges without them. This is enforced by CI (`.github/workflows/ci.yml`
runs lint + `npm test` + build on every PR) and by branch protection on `main`.

TDD loop:
1. Write a failing test that pins the desired behaviour (red).
2. Write the minimum code to pass it (green).
3. Refactor with the test as a safety net.

Stack: **Vitest + React Testing Library** (`vitest.config.ts`, jsdom, `@/` alias
via `vite-tsconfig-paths`, matchers in `test/setup.ts`). Playwright e2e is a
later addition — see `docs/TODO-PARITY.md`.

- Test files live next to their source as `*.test.ts(x)`.
- **Always testable, no DB needed:** pure logic + view-models — `lib/cycle.ts`,
  `lib/expiry.ts`, feed aggregation/sorting, form-parsing helpers, and component
  rendering (RTL). Prefer extracting logic out of Supabase-coupled server actions
  into pure functions so it can be unit-tested directly.
- **Server actions / RLS** that hit Supabase: test the pure parts; mock the
  client for the rest. Don't hit the live project from tests.
- Run `npm test` before every commit; keep the suite green.

## Workflow — branches, PRs, CI

`main` is the protected trunk. **One branch per feature/fix off `main`**
(`feat/…`, `fix/…`, `chore/…`) → write tests first → push → open a PR → CI must
be green → review → merge → delete the branch. Never commit straight to `main`.

## Architecture

### Schema = hand-maintained, keep two places in sync
Migrations `supabase/migrations/0001_init.sql` … `0004_company_documents.sql`
are the source of truth; `lib/types.ts` mirrors them as TS types. Edit both together.
RLS = authenticated full access (small internal team), except `profiles` update-self.
Tables: companies, vehicles, drivers, inspections, inspection_checklist_lines,
profiles, checklist_templates, documents, trainings, tasks, doc_types,
vehicle_drivers, accidents, violations, medical_checks, courses, tachograph_checks.
Companies/vehicles/drivers carry `handler_id` (→ profiles, the legacy מטפל אחראי).
`doc_types` is the treatment/doc taxonomy; `recurrence_months` prefills the next
expiry in the renew flow. Signatures are base64 data-URL text. Buckets:
`defect-photos` (public), `vehicle-docs`/`documents` (private). A `handle_new_user`
trigger auto-creates a `profiles` row per auth user.

### Alerts are HYBRID — derived + materialized (no cron)
The dashboard feed (`lib/actions/tasks.ts:getTaskFeed`) merges three sources into
one `FeedItem[]`:
- **Derived** monthly-inspection-due — `getMonthlyQueue` (`lib/actions/queue.ts`): active vehicles with no completed *monthly-template* inspection in `currentCycleRange()` (`lib/cycle.ts`). Resets each calendar month automatically.
- **Materialized** `tasks` rows (pending) — trainings + scheduled inspections.
- **Derived** expiring `documents` — within `EXPIRY_WARNING_DAYS` or past.
Severity (`lib/expiry.ts:severityFor`) drives the red/amber/green chips. The
dashboard filters the feed client-side (`components/TaskFeed.tsx`).

### Checklists are DB-driven, default Pass
`checklist_templates.items` (jsonb `{key,label}[]`) drives the inspection wizard;
no hardcoded checklist. The "monthly" template preserves the monthly cycle.
`InspectionWizard` starts every item Pass — officer only flips to Fail (reveals
notes + defect-photo, per spec).

### Write paths (Server Actions in `lib/actions/`)
- `submitInspection` — one logical txn: vehicle/driver edits → insert inspection (with `template_id`) → bulk checklist lines → resolve linked task → revalidate.
- `submitTraining` — officer signature auto-appended from `profiles.signature_url`; resolves the task and **auto-schedules the next training +1 year** (inserts a new `tasks` row).
- `renewDocument` — uploads photo to `documents` bucket, updates expiry, resolves the matching pending document task.
- Officer must save a signature in `/profile` before training works.

### Routes
`app/(app)/` is auth-gated (redirect in `proxy.ts`): `/` feed, `/inspect/[vehicleId]`,
`/train/[driverId]`, `/renew/[documentId]`, `/profile`. `/login` is public.
`SignaturePad` (canvas → base64) is reused across inspection, training, profile.

## Phase 3: Desktop Admin Portal (`app/admin/`, built)

Modeled on the customer's legacy Windows program (company-tree navigation).
Own route group outside `(app)` so it gets a wide desktop layout; auth still via
`proxy.ts`. `app/admin/layout.tsx` role-gates server-side (non-admin → `/`) and
every action in `lib/actions/admin.ts` re-checks via `requireAdmin()`. The
officer header shows a "ניהול" link for admins only.

- `/admin` — companies overview + create; `CompanyTree` sidebar everywhere.
- `/admin/companies/[companyId]` — tabs: vehicles / drivers / alerts (reuses
  `getTaskFeed`, filtered client-side in `AlertsPanel` by type/handler/date) / details.
- `/admin/vehicles/[vehicleId]`, `/admin/drivers/[driverId]` — full entity cards:
  edit form, documents/treatments (add via doc_types catalog), sub-record tables,
  vehicle↔driver assignment, task scheduling (`scheduleTask`). `[id]="new"` renders
  an empty create form (`?company=` preselects).
- `/admin/settings/doc-types` — taxonomy management.
- Generic sub-record CRUD: `saveRecord`/`deleteRecord` over the `RECORD_TABLES`
  allowlist (accidents, violations, medical_checks, courses, tachograph_checks).
