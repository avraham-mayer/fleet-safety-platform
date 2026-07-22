# app/ — Routes (Next.js 16 App Router)

Three route groups, one auth wall:

```
app/
├── login/            public — email/password sign-in
├── (app)/            officer app (mobile, max-w-3xl shell)
│   ├── page.tsx              /            aggregated task feed (officers: scoped to their companies)
│   ├── companies/            /companies   officer's assigned companies (status rollup)
│   ├── companies/[companyId]/ /companies/… company status board: vehicles/drivers/company docs
│   ├── vehicles/[vehicleId]/ /vehicles/…  officer vehicle card: docs, tasks, actions
│   ├── drivers/[driverId]/   /drivers/…   officer driver card: docs, tasks, actions
│   ├── documents/new/        /documents/new  photo-capture a new document (?entity_type&entity_id)
│   ├── inspect/[vehicleId]/  /inspect/…   4-step inspection wizard
│   ├── train/[driverId]/     /train/…     training flow (co-sign)
│   ├── renew/[documentId]/   /renew/…     document renewal
│   └── profile/              /profile     officer signature
└── admin/            desktop admin portal (wide layout, own shell)
    ├── page.tsx                       /admin                 companies overview + create
    ├── companies/[companyId]/         /admin/companies/…     tabs: vehicles/drivers/alerts/details
    ├── vehicles/[vehicleId]/          /admin/vehicles/…      full vehicle card ("new" = create form)
    ├── drivers/[driverId]/            /admin/drivers/…       full driver card ("new" = create form)
    ├── settings/doc-types/            /admin/settings/…      treatment taxonomy
    └── settings/templates/            /admin/settings/…      checklist-template management
```

## Auth layers

1. **`proxy.ts`** (repo root — Next 16's replacement for `middleware.ts`,
   exports `proxy`): refreshes the Supabase session on every request;
   no session → redirect `/login`; session on `/login` → redirect `/`.
   This is why NO page needs its own "am I logged in" check.
2. **`app/admin/layout.tsx`**: additionally requires `profiles.role === 'admin'`,
   else `redirect("/")`. (Server actions re-check via `requireAdmin()` —
   see [lib/actions/README](../lib/actions/README.md).)

## Why admin/ sits OUTSIDE (app)/

`(app)/layout.tsx` is the mobile shell (`max-w-3xl`, sticky header with
feed/profile links). The admin portal needs a wide desktop two-pane layout
(header + `CompanyTree` sidebar + content), so it's a sibling route group
with its own `layout.tsx`. Auth still comes from the global `proxy.ts`.

## Next.js 16 conventions used here (differ from older training data!)

- `params` and `searchParams` are **Promises**: `const { vehicleId } = await params;`
- `proxy.ts`, not `middleware.ts`.
- Data pages export `const dynamic = "force-dynamic"` — everything is
  per-user and reads live data; nothing should be statically cached.
- When unsure, read `node_modules/next/dist/docs/` first (AGENTS.md mandate).

## Page patterns

- **Server Components fetch, Client Components interact.** Pages are async
  server components doing parallel Supabase reads (`Promise.all`), then
  render client components (wizard, feed filters, alerts panel) with data
  as props.
- **`[id] === "new"`** on admin vehicle/driver pages renders an empty create
  form; `?company=<id>` preselects the company.
- **Tabs via searchParams** (`?tab=vehicles|drivers|alerts|details`) on the
  company page — no client state, links only.
- **Admin forms are plain `<form action={serverAction}>`** with hidden `id`
  fields for upserts — no client JS needed except confirm dialogs
  (`DeleteButton`) and filters.
