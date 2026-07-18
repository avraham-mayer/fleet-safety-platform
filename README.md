# Fleet Safety Platform / מערכת ניהול בטיחות צי

Fleet Safety Officer platform for a small operator (~140–150 vehicles),
replacing a legacy Windows program. Hebrew-first, RTL. Two apps in one
codebase, one Supabase backend:

- **Officer app** (mobile, `/`) — a safety officer works an aggregated task
  feed: monthly vehicle inspections (4-step wizard, dual digital signatures),
  driver trainings, and compliance-document renewals. Completed vehicles drop
  off the queue and reappear automatically next month.
- **Admin portal** (desktop, `/admin`) — company-tree navigation modeled on
  the legacy program: full CRUD on companies/vehicles/drivers, documents &
  treatment taxonomy, sub-records (accidents, violations, medical checks,
  courses, tachograph audits), vehicle↔driver assignment, task scheduling,
  and a filterable alerts screen. Requires `profiles.role = 'admin'`.

Stack: **Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase**
(Postgres + Auth + Storage). No ORM, no test framework, no cron jobs.

## Documentation map

| Doc | What's inside |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it all works: hybrid alerts (derived + materialized), auth layers, task lifecycle, signatures, buckets |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Supabase production setup, env vars, rollback, tier caveats |
| [docs/MAINTENANCE.md](docs/MAINTENANCE.md) | Runbook: schema changes, user management, debugging table, verification checklist |
| [supabase/README.md](supabase/README.md) | Every table, RLS philosophy, migrations, buckets, seed |
| [app/README.md](app/README.md) | Routing map, route groups, Next 16 conventions |
| [lib/README.md](lib/README.md) | Domain logic: cycle, expiry/severity, constants, the 3 Supabase clients |
| [lib/actions/README.md](lib/actions/README.md) | Every server action: what it writes, auth level, patterns |
| [components/README.md](components/README.md) | Officer + admin components and conventions |
| [CLAUDE.md](CLAUDE.md) | AI-agent entrypoint (condensed operating rules) |

## Quick start (local)

1. **Supabase project** at [supabase.com](https://supabase.com) — or use the
   existing production project (see docs/DEPLOYMENT.md).

2. **Schema.** In the Supabase SQL editor run, in order:
   `supabase/migrations/0001_init.sql` → `0002_phase2.sql` → `0003_phase3.sql`,
   then `supabase/seed.sql` (sample data + the doc_types catalog — the
   catalog part is wanted even in production).

3. **Login user.** Supabase → Authentication → Users → Add user. To make an
   admin: `update profiles set role='admin' where id='<user-id>';`

4. **Env.** Copy `.env.local.example` → `.env.local`, fill from Supabase →
   Project Settings → API:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ```

5. **Run.**
   ```bash
   npm install
   npm run dev        # http://localhost:3000
   npm run build      # prod build + typecheck (needs .env.local to exist)
   npm run lint
   ```
   After signing in, save an officer signature in **Profile** once — the
   training flow auto-appends it.

   **WSL note:** node comes from nvm. If `npm run dev` fails with
   "UNC paths are not supported", the Windows npm shim intercepted the
   command — see docs/MAINTENANCE.md (Local development).

## Production

Hosted on **Vercel**, auto-deploys on every push to `master`. Database is
the Supabase cloud project. Full runbook: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Core concepts in 30 seconds

- **Alerts are hybrid, no cron.** Monthly-inspection-due and doc-expiry
  alerts are *computed at read time*; trainings and scheduled inspections
  are *rows in `tasks`*. One merged feed serves both the officer app and the
  admin alerts tab.
- **Severity** everywhere = `expired` (red) / `warning` (amber, ≤30 days) /
  `ok` (green) from a single function (`lib/expiry.ts`).
- **Checklists and document types live in the DB**, not in code
  (`checklist_templates`, `doc_types`). Change content without deploys.
- **Schema = migrations + `lib/types.ts`, kept in sync by hand.** Every
  schema change touches both.

## Project layout

```
proxy.ts             auth wall (Next 16 proxy — session refresh + redirects)
app/login/           public sign-in
app/(app)/           officer app: feed, inspect/, train/, renew/, profile/
app/admin/           desktop admin portal (role-gated)
components/          officer components + components/admin/
lib/                 types, cycle, expiry, constants, supabase clients
lib/actions/         ALL write paths (server actions)
supabase/            migrations (source of truth) + seed
docs/                architecture / deployment / maintenance
```
