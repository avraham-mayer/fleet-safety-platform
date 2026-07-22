# components/ — React components

Officer-app components at the top level; admin-portal components in
[`admin/`](#componentsadmin). All are Client Components unless noted.

## Officer app

| Component | Used by | Notes |
|---|---|---|
| `TaskFeed.tsx` | `/` | Renders `FeedItem[]` with red/amber/green severity chips; client-side filters (company / plate / driver text). The feed itself is built server-side by `getTaskFeed()`. |
| `InspectionWizard.tsx` | `/inspect/[vehicleId]` | 4 steps: vehicle details → driver details + safety briefing ack → checklist → summary + dual signatures. **Every checklist item starts as Pass** — the officer only flips failures, which reveal notes + defect-photo upload (`uploadDefectPhoto`). Checklist items come from the DB template, never hardcoded. |
| `TrainingFlow.tsx` | `/train/[driverId]` | Shows module material (from `TRAINING_MODULES`), driver signs; officer signature auto-appended server-side from the profile. |
| `DocumentRenewal.tsx` | `/renew/[documentId]` | New expiry date (+ optional photo). `defaultExpiry` prop = prefill computed from `doc_types.recurrence_months`. |
| `DocumentCapture.tsx` | `/documents/new` | Capture a brand-new document: doc-type select (prefills expiry from `recurrence_months`), camera input, optional expiry → `addDocument`. |
| `EntityDetailCard.tsx` | `/vehicles/[id]`, `/drivers/[id]` | **Server component.** Officer entity card: monthly chip, documents with severity, pending tasks, action buttons (inspect/train, add document). |
| `StatusChips.tsx` | officer status pages | **Server-safe.** `SeverityChip` (null-tolerant) + `MonthlyChip`; palette imported from `admin/ui.tsx` `SEVERITY_CHIP`. |
| `SignaturePad.tsx` | inspection, training, profile | Canvas → base64 data-URL. **The one shared signature primitive** — reuse it, don't add another. |
| `ProfileSignature.tsx` | `/profile` | Save/replace the officer's reusable signature. |
| `SignOutButton.tsx` | both headers | Supabase sign-out + redirect. |

## components/admin/

| Component | Notes |
|---|---|
| `CompanyTree.tsx` | Sidebar: search box + alphabetical company list (mirrors the legacy Windows program's tree). Active item via `useParams`. |
| `AlertsPanel.tsx` | Legacy-style alerts screen: filters a `FeedItem[]` client-side by kind (inspection/training/document), handler, and date range (items without a due date pass date filters). Server side does only the company filter. |
| `DeleteButton.tsx` | Confirm-before-submit form wrapper: `action` + hidden `fields` + `window.confirm(confirmText)`. Use for every destructive admin action. |
| `ui.tsx` | **Server-safe** shared primitives: `Card`, `Field`, `Table`, `SeverityChip`, and the `inputCls`/`submitCls`/`thCls`/`tdCls` class strings. Extend this before inventing new one-off styles. |

## Conventions

- Hebrew-first RTL; labels in Hebrew, code identifiers in English.
- Severity chips: single source of truth is `SEVERITY_CHIP` in `admin/ui.tsx`
  + `severityFor()` in `lib/expiry.ts` — never restyle severity ad hoc.
- Data flows in as props from Server Components; components call Server
  Actions for writes. No client-side Supabase queries in components except
  auth (SignOutButton).
