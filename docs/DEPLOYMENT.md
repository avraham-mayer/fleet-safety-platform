# Deployment

The app is hosted on **Vercel**; the database/auth/storage are on **Supabase**
(project `bugjwbkeshyodqmespkb`, "Aharon-safety-management"). Every push to
`master` on GitHub (`avraham-mayer/fleet-safety-platform`) auto-deploys to
production.

```
GitHub master ──push──► Vercel build (npm run build) ──► https://<project>.vercel.app
                                                              │
                                                              ▼
                                             Supabase (Postgres + Auth + Storage)
```

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Scope | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview | same page ("anon / publishable" key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Production + Preview | same page ("service_role / secret" key) — **server-only secret, never expose client-side** |

Changing an env var requires a redeploy (Vercel → Deployments → ⋯ → Redeploy).

## Supabase auth URL configuration

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: the production URL (e.g. `https://<project>.vercel.app`).
- **Redirect URLs**: add the production URL (and any custom domain later).

This only affects email links (password reset). Normal login is cookie-based
SSR and works regardless.

## Routine operations

- **Deploy**: `git push origin master`. Vercel builds and promotes automatically.
- **Roll back**: Vercel → Deployments → pick a previous good deployment →
  "Promote to Production". (Note: this does NOT roll back DB migrations —
  schema changes are forward-only; write a new migration to undo one.)
- **Preview deploys**: any non-master branch push gets its own preview URL,
  running against the SAME production Supabase project — be careful with
  destructive testing.
- **Logs**: Vercel → Project → Logs (runtime errors, server action failures).
  Supabase side: Dashboard → Logs, or the `get_logs` MCP tool.
- **Schema changes**: applied to Supabase separately from app deploys — see
  [MAINTENANCE.md](MAINTENANCE.md#schema-changes). Deploy order for breaking
  changes: additive migration first, then app code.

## Plan/tier caveats

- **Vercel Hobby (free)** is licensed for *non-commercial* use. This is a
  business tool for a paying customer → upgrade to **Vercel Pro (~$20/mo)**
  when it goes into real use.
- **Supabase Free** pauses projects after ~7 days of inactivity (the app then
  errors until manually restored in the dashboard) and has limited backups.
  For production use, **Supabase Pro (~$25/mo)** gives daily backups and no
  pausing. Until then: if the site suddenly 500s after a quiet week, check
  whether the Supabase project is paused.

## Custom domain (later)

1. Vercel → Project → Settings → Domains → add domain, follow the DNS
   instructions (CNAME/A records at the registrar).
2. Add the new domain to Supabase Redirect URLs + Site URL (above).
3. SSL is automatic via Vercel.

## First-time setup from scratch (disaster recovery)

If the Vercel project is ever lost: import the GitHub repo at
vercel.com/new, framework preset **Next.js**, root directory `/`, default
build command — then set the three env vars above and deploy. Nothing else
is configured on the Vercel side.
