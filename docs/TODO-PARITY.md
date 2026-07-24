# Parity TODO & Open Questions

Working backlog to bring our platform to feature parity with the legacy
**Kochavit** desktop program, plus decisions that need the client/owner.
Companion to [KOCHAVIT-PARITY.md](./KOCHAVIT-PARITY.md) (the full gap analysis
and progress log). When you finish an item, move it to the progress log there.

Last updated: 2026-07-22.

---

## ✅ Done (see KOCHAVIT-PARITY.md §5 progress log for detail)
- Reports infrastructure (print → PDF) + reports hub `/admin/reports`.
- Monthly work list report (`/admin/reports/worklist`).
- Odometer capture on inspection.
- Archive (soft-retire) companies/vehicles/drivers — migration `0005`.
- Vehicle card + driver card printable dossiers.

## ⛔ Needs the owner before it can ship
- **Apply migration `0005_archive.sql`** to the live Supabase project. Archive
  UI is built but non-functional until the columns exist. Apply via Supabase SQL
  editor, `supabase db push`, or the MCP `apply_migration` tool.

---

## 🔧 Remaining build items (priority order)

### P1
1. **Warning notifications to companies** — expiring docs / due items.
   **BLOCKED on a provider decision — see Open Question #1 below.** Build the
   data layer (who-needs-notifying query + a `notifications` log table) first;
   it's provider-agnostic and unblocks the report either way.

### P2
2. **Managed lookup dropdowns** — replace free-text with catalog tables:
   vehicle type, manufacturer/model, insurance type, license type, inspection
   site (אתר), cargo type. Legacy `KTblType/Producer/Dgam/Insure/Licence/Atar/Cargo`.
   Needed for clean filtering AND better reports. New migration + settings screens
   under `/admin/settings/`, following the `doc-types` pattern.
3. **Missing-data report** (חסרי נתונים) — flag entities lacking required fields
   (no license expiry, no insurance date, etc.). New report page under
   `/admin/reports/`, reuse `reportBits`.
4. **Compliance-history report** — per-record-type listings (accidents / courses /
   tachograph / medical / violations) filtered by date + company, for audits.
   Legacy `rpAcdnt`, `rpDrCourse`, `rpDrTaho`, `rpDrBdika`, `rpDrAvira`.

### P3
5. **Annual plan** (תוכנית שנתית) — year overview grouped by handler/site.
   Legacy `rpAnualRprt*`.
6. **Gov vehicle lookup** — auto-fill vehicle by plate from `bd.mot.gov.il`
   (data.gov.il vehicle dataset API). Convenience; legacy `carDetail_gov`.
7. **Label printing** — only if the client still prints physical stickers.

### Optional module (only if client wants one system — not blocking)
8. **Invoicing** (חשבוניות). Client currently keeps Kochavit for invoicing.
   Core (clients/line-items/totals/PDF/list) is straightforward. The **legal-tax
   layer needs the owner**: sequential legal numbering, VAT (מע"מ), credit notes
   (חשבונית זיכוי), and the **מספר הקצאה allocation-number** integration with
   רשות המסים (live API, needs the client's tax credentials/registration; phased
   in 2024–2025). Do NOT promise "delete Kochavit entirely" until this is decided.

---

## ❓ Open Questions (need the owner)

### #1 — Warning-notification channel *(parked; revisit before building item P1.1)*
**What the legacy app actually does today:**
- **Email:** `WrnMail.pas` uses **Windows MAPI** — it hands the message + an
  attached report to the officer's **default desktop mail client (Outlook)**; the
  officer reviews and hits send. It does NOT send email itself via an SMTP server.
- **WhatsApp:** the alerts screen has a WhatsApp button (green icon, visible in
  the client screenshots). No WhatsApp API in the source → it's **assisted-manual**
  (opens WhatsApp Web / `wa.me` for the contact). No automation, no API keys.
- Net: today's workflow is **assisted-manual** ("prep the message, human sends"),
  not automated bulk delivery.

**Options for us:**
| Option | Infra / credentials | Notes |
|---|---|---|
| **Assisted-manual** `mailto:` + `wa.me` prefilled links | **none** | Matches how they work today. Zero vendor, zero keys. Officer clicks → their mail/WhatsApp opens prefilled. Good v1. |
| Automated email — Resend | Resend API key + verified sender domain | Clean API, good deliverability. Best automated default. |
| Automated email — SMTP | Their existing mailbox/SMTP creds | No new vendor; more setup, weaker deliverability at volume. |
| WhatsApp Business API (Twilio / Meta / GreenAPI) | WA Business account + approved templates | Highest engagement in IL; heaviest setup. |

**Recommendation:** ship **assisted-manual `mailto:`/`wa.me` links** first (no
credentials, mirrors current behavior), then offer automated Resend email as an
upgrade once the owner confirms a sender domain. **Decision needed:** which
channel(s) to automate, and provide the matching credentials/domain.

### #2 — Does the client actually use Kochavit's billing?
Owner indicated they keep Kochavit "for invoicing, not taking money." Confirm
scope of the optional Invoicing module (#8) — full tax invoices, or just internal
records? Determines whether the מספר-הקצאה integration is in scope.

### #3 — Physical labels still in use?
Legacy prints Dymo/Avery sticker sheets. Only build label output (#7) if they
still do this.
