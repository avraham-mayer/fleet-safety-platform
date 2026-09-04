# Maintenance Runbook

Common operations for whoever maintains this (human or AI agent). Assumes
access to the Supabase dashboard (or the Supabase MCP tools) and the repo.

Supabase project id: `bugjwbkeshyodqmespkb`.

## Schema changes

The schema lives in TWO places that must stay in sync (see
[supabase/README](../supabase/README.md)):

1. Write a new file `supabase/migrations/000N_<name>.sql` (never edit an
   already-applied migration).
2. Apply it to the live project — Supabase SQL editor, `supabase db push`,
   or the MCP `apply_migration` tool.
3. Mirror every table/column change in `lib/types.ts`.
4. `npm run build` to typecheck, commit both files together.

Prefer additive changes (new nullable columns, new tables). For breaking
changes, migrate the DB first, then deploy app code that uses it.

## User management

- **Create a login**: Supabase Dashboard → Authentication → Users → Add user
  (email + password, auto-confirm). A `profiles` row is created by trigger
  with the default officer role.
- **Promote to admin**:
  ```sql
  update public.profiles set role = 'admin' where id =
    (select id from auth.users where email = '<email>');
  ```
- **Reset a password**: Dashboard → Authentication → Users → ⋯ → Reset
  password (or the admin API `PUT /auth/v1/admin/users/<id>` with the
  service-role key).
- **Officer prerequisite**: a new officer must save a signature in
  `/profile` once before the training flow will work.

## Content/catalog changes (no code needed)

- **Add/disable a document/treatment type**: `/admin/settings/doc-types` in
  the app. `recurrence_months` drives the renewal expiry prefill.
- **Add/change a checklist**: insert/update a `checklist_templates` row
  (`items` = jsonb `[{"key": "...", "label": "..."}]`). The template with
  `type = 'monthly'` is the one the monthly queue tracks — keep exactly one
  active monthly template.
- **Training modules** are the one hardcoded list: `lib/constants.ts:TRAINING_MODULES`.

## Debugging

| Symptom | Where to look |
|---|---|
| Page 500s in production | Vercel → Logs; if after a quiet period, check Supabase project isn't paused (free tier) |
| Server action fails silently | Vercel function logs; actions throw Hebrew error strings |
| Alert won't clear | Is it derived or materialized? Derived document alert → check `documents.expiry_date`; derived inspection → was the inspection done with the *monthly* template this calendar month?; materialized → check `tasks.status` |
| User can't access /admin | `select role from profiles where id = ...` — must be `'admin'` |
| DB health / slow queries / security | Supabase MCP `get_advisors`, `get_logs`; permissive-RLS warnings are expected and deliberate |
| Build fails on Vercel but not locally | Env vars missing in Vercel; or lockfile drift — reproduce with `npm ci && npm run build` |

## Local development (WSL note)

`node` is installed via nvm. If `npm run dev` errors with "UNC paths are not
supported / CMD.EXE", the Windows npm shim won the PATH race — make sure
`~/.zshrc` puts `$HOME/.nvm/versions/node/v24.14.0/bin` first on PATH (see
CLAUDE.md for the one-liner). Local build/typecheck needs a `.env.local`
(placeholders are enough for `npm run build`; real values for runtime).

## Verification checklist after any change

1. `npm run lint` + `npm test` (Vitest) + `npm run build` (typecheck) — all clean.
2. Drive the affected flow in the browser (tests cover pure logic, not the flows):
   - Feed loads at `/`, chips colored correctly.
   - Officer flows: inspect → dual signatures → vehicle leaves queue;
     train → task resolved + next year's task appears; renew → alert clears.
   - Admin: role gate (officer bounced from `/admin`), company tree, entity
     card edit persists, alerts tab filters.
3. After deploy: repeat a quick smoke test on the production URL.
