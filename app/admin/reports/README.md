# app/admin/reports/ — Printable reports (print → PDF)

Replaces the legacy program's FastReport (`.fr3`) output. **No PDF library:**
each report is a normal server-rendered page; a screen-only `PrintButton`
(`components/admin/PrintButton.tsx`) calls `window.print()`, and the
`@media print` block in `app/globals.css` strips the app chrome (`header`,
`aside`, anything marked `.no-print`) so what prints is just the white report
sheet. Users "Save as PDF" from the browser's print dialog.

Admin-only: this tree is under `app/admin/`, gated by `app/admin/layout.tsx`.

## Pages

| Route | File | Legacy equiv | What it is |
|---|---|---|---|
| `/admin/reports` | `page.tsx` | — | Hub. Static list of reports; built ones link through, roadmap ones are disabled cards. |
| `/admin/reports/worklist` | `worklist/page.tsx` | `rpWrnCar*` / יומן עבודה | **Monthly work list** — every open task (due inspections + pending tasks + expiring docs) grouped by company. Reuses `getTaskFeed()`, so it can never drift from the officer dashboard. Filters via GET query: `?handler=&company=&kind=` (a plain `<form method="get">`, no client JS). |
| `/admin/reports/vehicle/[vehicleId]` | `vehicle/[vehicleId]/page.tsx` | `rpCarKartis` / כרטיס רכב | **Vehicle dossier** — details, documents, inspection history, accidents, assigned drivers. Reached via "כרטיס להדפסה" on the vehicle admin page. |
| `/admin/reports/driver/[driverId]` | `driver/[driverId]/page.tsx` | `rpDrvKartis` / כרטיס נהג | **Driver dossier** — details, documents, courses, trainings, medical/tachograph checks, violations, accidents, assigned vehicles. Reached via "כרטיס להדפסה" on the driver admin page. |

## Shared building blocks

The card reports are assembled from `components/admin/reportBits.tsx`
(server-safe): `ReportShell` (title + generated-date header + print bar),
`Section`, `KV` (key/value detail grid), `MiniTable` (compact record table with
empty-state), and `fmtDate`. **Build new reports from these** — don't reinvent
the layout. Severity chips come from `components/admin/ui.tsx` (`SeverityChip`)
+ `lib/expiry.ts` (`severityFor`), same as everywhere else.

## Conventions
- Hebrew-first RTL; `export const dynamic = "force-dynamic"` (live data).
- Next 16: `params`/`searchParams` are Promises — `await` them.
- Screen-only controls (filters, print button) get `.no-print`.
- Group long lists and wrap sections in `break-inside-avoid` so pages break cleanly.

## Roadmap (see docs/TODO-PARITY.md)
Missing-data report, compliance-history report, annual plan — all belong here and
should reuse `reportBits`.
