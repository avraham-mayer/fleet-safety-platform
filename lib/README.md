# lib/ — Domain logic & shared utilities

Pure logic + the Supabase clients. Server actions (the write paths) live in
[`lib/actions/`](actions/README.md).

## Files

| File | Purpose |
|---|---|
| `types.ts` | **TS mirror of the DB schema** (see the two-place rule in [supabase/README](../supabase/README.md)) plus app types: `FeedItem`, `Severity`, `QueueVehicle`. Every table row type lives here. |
| `cycle.ts` | Monthly inspection cycle: `currentCycleRange()` = 1st of this month → 1st of next; a vehicle is "done this cycle" iff it has a completed monthly-template inspection inside the window. This computed range is why the queue resets each month with **no cron**. `cycleLabel()` renders "מחזור יוני 2026". |
| `expiry.ts` | `severityFor(date)` → `expired` (past or null) / `warning` (≤ 30 days) / `ok`. The single severity definition for the whole app — feed chips, admin tables, sorting. |
| `constants.ts` | `EXPIRY_WARNING_DAYS` (30), `SAFETY_BRIEFING` text, `TRAINING_MODULES` (the only hardcoded content list — signs/winter/summer/hazmat), legacy `DOC_TYPES` display list. |

## lib/supabase/ — three clients, pick the right one

| File | Export | Use from | Notes |
|---|---|---|---|
| `server.ts` | `createClient()` | Server Components & Server Actions | Bound to request cookies; acts as the signed-in user (RLS applies) |
| `server.ts` | `createServiceClient()` | Server-only privileged work | **Bypasses RLS** (service-role key). Never import into client code. |
| `client.ts` | `createClient()` | Client Components (browser) | anon key |
| `middleware.ts` | `updateSession()` | `proxy.ts` only | Session refresh + login redirects on every request. Don't put logic between `createServerClient` and `getUser()` (per @supabase/ssr docs). |

## Gotchas

- `severityFor(null)` returns `expired`, not `ok` — a missing expiry is
  treated as the worst case on purpose.
- Change `EXPIRY_WARNING_DAYS` in one place; both the feed query cutoff and
  the severity chips use it.
- The monthly queue only counts inspections whose `template_id` belongs to a
  template with `type='monthly'` — other inspection types never clear the queue.
