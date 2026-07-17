# Fleet Safety Inspection System / מערכת בדיקות בטיחות צי

A mobile-first tool for a small fleet operator (~140–150 vehicles). A Safety
Officer signs in, sees which vehicles still need their monthly safety inspection,
and completes a 4-step field wizard ending in dual digital signatures. Submitted
vehicles drop off the current-month queue and reappear automatically next month.

Stack: **Next.js (App Router) · TypeScript · TailwindCSS · Supabase** (Postgres + Auth + Storage).
UI is **Hebrew-first, RTL**.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).

2. **Apply the schema.** In the Supabase SQL editor, run in order:
   - `supabase/migrations/0001_init.sql` (core tables, RLS, storage buckets)
   - `supabase/migrations/0002_phase2.sql` (profiles+trigger, checklist templates, documents, trainings, tasks, `documents` bucket)
   - `supabase/seed.sql` (sample data: companies, vehicles, drivers, templates, documents, training tasks — optional)

3. **Create an officer login.** Supabase dashboard → Authentication → Users →
   *Add user* (email + password). This is who signs in to the app.

4. **Configure env.** Copy `.env.local.example` to `.env.local` and fill in the
   values from Supabase → Project Settings → API:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ```

5. **Run it.**
   ```bash
   npm install
   npm run dev
   ```
   Open http://localhost:3000 → you'll be redirected to `/login`. After signing
   in, go to **Profile** and save your officer signature once — the training flow
   auto-appends it.

## How it works

- **Aggregated task feed** (`/`, `lib/actions/tasks.ts`): one list merging
  monthly inspections, driver trainings, and expiring documents, with red/amber/
  green severity chips and client-side filters (company / plate / driver).
- **Hybrid alerts, no cron.** Monthly-inspection-due and document-expiry alerts
  are *derived on read* (`lib/cycle.ts`, `lib/expiry.ts`); trainings and scheduled
  inspections are *materialized* `tasks` rows. The monthly cycle auto-resets each
  calendar month.
- **DB-driven checklists, default Pass.** `checklist_templates.items` drives the
  inspection wizard; the officer only flips items to "Fail" (revealing notes +
  defect-photo). Add templates in the DB, not in code.
- **Training auto-schedules** the next session +1 year and resolves the current task.
- **Document renewal** uploads a photo + new expiry, clearing the alert.

## Project layout

```
app/(app)/        auth-gated: / feed, inspect/, train/, renew/, profile/
app/login/        email/password sign-in
components/        TaskFeed, InspectionWizard, TrainingFlow, DocumentRenewal,
                   ProfileSignature, SignaturePad, SignOutButton
lib/supabase/      browser / server / proxy clients
lib/actions/       tasks, queue, inspections, trainings, documents, profile
lib/{cycle,expiry,constants,types}.ts
proxy.ts           auth-refresh + redirect (Next 16 proxy convention)
supabase/          SQL migrations (0001, 0002) + seed
```
