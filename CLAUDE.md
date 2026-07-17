# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> Next.js 16 here. Conventions differ from training data — read `node_modules/next/dist/docs/` before writing Next-specific code. Notably: `middleware.ts` is deprecated for `proxy.ts` (export `proxy`); route `params` and `searchParams` are Promises (`await` them).

## What this is

Fleet Safety Officer platform for a small operator (~140–150 vehicles). A safety
officer logs in on mobile and works an aggregated task feed: monthly vehicle
inspections, driver trainings, and compliance-document renewals. Hebrew-first, RTL.

Stack: Next.js 16 App Router · TS · Tailwind v4 · Supabase (Postgres + Auth + Storage). No ORM.

## Commands

`node` is via nvm and NOT on PATH. Prefix every shell command, and force nvm's
npm ahead of the Windows npm shim (otherwise scripts run under cmd.exe and fail):
```
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"
```
- `npm run dev` — dev server
- `npm run build` — prod build (also typechecks); needs a `.env.local` to exist
- `npm run lint` — ESLint

No test framework. Build verification needs placeholder env vars in `.env.local`
(real values for runtime). See `README.md` for Supabase setup.

## Architecture

### Schema = hand-maintained, keep two places in sync
Migrations `supabase/migrations/0001_init.sql` + `0002_phase2.sql` are the source
of truth; `lib/types.ts` mirrors them as TS types. Edit both together. RLS =
authenticated full access (small internal team), except `profiles` update-self.
Tables: companies, vehicles, drivers, inspections, inspection_checklist_lines,
profiles, checklist_templates, documents, trainings, tasks. Signatures are base64
data-URL text. Buckets: `defect-photos` (public), `vehicle-docs`/`documents` (private).
A `handle_new_user` trigger auto-creates a `profiles` row per auth user.

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

## Phase 3 (deferred, not yet built)

Desktop Admin Portal: entity onboarding data-grids (companies/vehicles/drivers),
baseline/recurrence scheduling UI, role-gated routing (admin vs officer — the
`profiles.role` column exists; routing is not yet enforced).
