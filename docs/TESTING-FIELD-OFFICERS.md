# Field Officer Testing Guide

Manual test plan for the field-officer experience (scoped feed, status browsing,
document capture, template CRUD). Written 2026-07-19 against the
`Aharon-safety-management` Supabase project.

> **Test accounts only.** These are throwaway credentials seeded into the dev
> database. Delete them (Supabase Dashboard → Authentication → Users) before
> any real rollout.

## Test accounts

| Account | Email | Password | Role | Assigned companies |
|---|---|---|---|---|
| שרה כהן | `officer1@example.com` | `Officer1!2026` | officer | הובלות הגליל בע"מ (both rows — the company name is seeded twice) |
| דוד לוי | `officer2@example.com` | `Officer2!2026` | officer | שינוע דרום בע"מ (both rows) |
| רות מזרחי | `officer3@example.com` | `Officer3!2026` | officer | none — for empty-state testing |
| (your existing admin) | your usual login | — | admin | sees everything |

Assignment mechanism: `companies.handler_id` points at the officer's profile.
Scoping is **company-only** — an officer sees exactly the companies whose
`handler_id` is them, plus all vehicles/drivers/documents of those companies.

Best tested on a phone, or desktop DevTools in mobile viewport (the officer
app is the mobile shell; admin is desktop).

---

## 1. Scoped task feed (`/`)

**As officer1 (שרה כהן):**
- [ ] Log in → lands on `/` "משימות". Every item's subtitle ends with
      `הובלות הגליל בע"מ`. Nothing from שינוע דרום appears.
- [ ] The company dropdown in the feed only offers הגליל companies.
- [ ] Open-count badge matches the number of visible items.

**As officer2 (דוד לוי):** same, mirrored — only שינוע דרום items.

**As officer3 (רות מזרחי):**
- [ ] Feed shows the notice "לא הוקצו לך חברות עדיין — פנה למנהל המערכת"
      instead of a task list.

**As admin:**
- [ ] `/` shows the full unfiltered feed (all 4 companies).
- [ ] Admin portal → company page → alerts tab (AlertsPanel) unchanged.

## 2. Status browsing (`/companies`)

**As officer1:**
- [ ] Header nav has a new "חברות" link. Tap it.
- [ ] `/companies` lists only the two הגליל rows. Each card: vehicle count,
      driver count, open-task count, worst-severity chip (red/amber/green).
- [ ] Tap a company → `/companies/[id]` status board:
  - Vehicles section: plate, model, per-vehicle chips — "✓ בדיקה חודשית" (green)
    if inspected this calendar month, "בדיקה חודשית חסרה" (amber) otherwise;
    a red/amber doc chip only when some document is expiring/expired.
  - Drivers section: name, license expiry, pending-task count.
- [ ] Tap a vehicle → `/vehicles/[id]` entity card: monthly chip, documents
      list with expiry chips, pending tasks, buttons "בצע בדיקה" and "+ הוסף מסמך".
- [ ] Tap a driver → `/drivers/[id]`: same card, "בצע הדרכה" instead of inspect.
- [ ] Documents on the card link to the existing renewal flow (`/renew/[id]`).

**Negative (scoping) — the key security check:**
- [ ] While logged in as officer1, paste a שינוע דרום company URL
      (grab it from the admin portal as admin, `/companies/<id>`) → must 404.
- [ ] Same for one of its vehicle/driver URLs (`/vehicles/<id>`) → 404.
- [ ] As officer3, `/companies` shows the empty-state notice.

**As admin:** `/companies` shows all 4 companies (admins are unscoped).

## 3. Document capture (`/documents/new`)

**As officer1, from a vehicle card:**
- [ ] "+ הוסף מסמך" → capture form with the plate as title.
- [ ] Doc-type dropdown shows only vehicle doc types (from the doc_types catalog).
- [ ] Picking a type with a renewal interval auto-fills the expiry date
      (today + `recurrence_months`); you can clear/edit it — it's optional.
- [ ] On a phone, the file input opens the camera (`capture=environment`).
- [ ] Save → returns to the vehicle card; the new document appears in its list.
- [ ] If you set a near/past expiry, the document also shows up in the feed
      as a "מסמך" item (within the warning window).
- [ ] Verify storage: Supabase Dashboard → Storage → `documents` bucket →
      path `vehicle/<vehicleId>/<uuid>.jpg`. Bucket is private (no public URL).
- [ ] DB row: `documents` has correct `company_id` (derived server-side).

**Company-level document:**
- [ ] On `/companies/[id]`, tap "+ מסמך חברה" → same flow, company doc types.
- [ ] Saved doc appears in a "מסמכי חברה" section on the company page.
- [ ] A company doc type "רישיון מוביל" (12-month interval) is already seeded;
      more can be added at `/admin/settings/doc-types` (ישות → חברה).

**Driver document:** repeat from a driver card — dropdown shows driver doc types.

## 4. Existing officer flows (regression)

- [ ] **Inspection**: from feed or vehicle card → `/inspect/[id]` wizard.
      All checklist items start ✓ (Pass); flipping one to fail reveals
      notes + defect-photo. Both signatures required. Submit → vehicle's
      monthly chip flips to green on the company page and it leaves the feed.
- [ ] **Training**: `/train/[id]` requires the officer's saved signature —
      first visit `/profile` and save one, else it blocks with a message.
      Completing a training auto-schedules next year's task.
- [ ] **Renewal**: `/renew/[id]` from a document chip; new expiry + photo;
      resolves any matching pending document task.

## 5. Checklist-template management (as admin, desktop)

- [ ] `/admin` header now has "תבניות בדיקה" → `/admin/settings/templates`.
- [ ] Existing templates listed as editable cards; items shown one per line.
- [ ] Create a template (e.g. name "בדיקת חורף", type `winter`, a few lines).
- [ ] Edit an existing template: add a line, save. (Unchanged lines keep their
      internal keys so historical inspection lines stay comparable.)
- [ ] השבתה / הפעלה toggles `active`.
- [ ] Schedule an inspection with the new template from an admin vehicle page
      (task scheduling form) → as the assigned officer, the task appears in
      the feed and the wizard shows the new template's items, all default-Pass.
- [ ] The `monthly` type template still drives the monthly queue — don't
      retype existing `monthly` templates to something else.

## Notes / known limitations

- **RLS is intentionally open** (authenticated full access, small internal
  team). Scoping is enforced in the app's queries, not the database. Direct
  API calls with an officer JWT could still read other companies' rows —
  acceptable for the internal tool per current design; tighten RLS if that
  changes.
- The two duplicate company names are seed-data artifacts; scoping assigned
  both rows of each name to the matching officer.
- Migration `0004_company_documents.sql` is already applied to the project.

## Cleanup after testing

```sql
-- remove test officers' company assignments
update companies set handler_id = null
 where handler_id in (select id from profiles where role = 'officer');
```
Then delete the three `officer*@example.com` users in
Dashboard → Authentication → Users (their profiles rows cascade).
