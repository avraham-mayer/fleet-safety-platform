# Kochavit Feature Parity Map

Comparison of the client's legacy program **Kochavit** (Delphi/Pascal desktop app,
Firebird/InterBase SQL, FastReport, ~219 source units) against our current
Next.js platform. Goal: at minimum match its capabilities.

Source analyzed: `Kochavit_code/` (Source `.pas`/`.dfm` forms, `SQL/` query defs,
`Report/` FastReport `.fr3` templates).

Status legend: ✅ done · 🟡 partial · ❌ to-do · ➖ obsolete-by-architecture
(Kochavit needed it because it was an offline Windows app; our web/mobile design
removes the need).

---

## 1. What Kochavit is

Single-officer Windows desktop program. Company-tree navigation (חברות → רכבים/נהגים).
Manages a fleet's vehicles, drivers, treatments, inspections, compliance docs, and
**also billing** (checks, invoices, payments). Heavy on printed reports, label
printing, handheld-terminal (מסופון) sync, and warning emails. Hebrew-first, RTL.

Our platform covers the **safety-officer + admin** half. Kochavit's **billing half**
(חשבוניות/המחאות/בנקים) is out of our product scope — noted below but not a parity target
unless the client asks.

---

## 2. Data model — Kochavit tables → ours

| Kochavit table | Meaning | Our table | Status |
|---|---|---|---|
| `KClient` | companies/customers | `companies` | ✅ |
| `KCar` | vehicles | `vehicles` | ✅ (some fields missing, §4) |
| `KDriver` | drivers | `drivers` | ✅ |
| `KCrTipul` / `KCrTipulHis` | vehicle treatments (pending + history) | `inspections` + `tasks` + `documents` | 🟡 |
| `KTblTipul` | treatment taxonomy | `doc_types` | 🟡 |
| `KCrAcdnt` | vehicle accidents | `accidents` | ✅ |
| `KDrAcdnt` | driver accidents | `accidents` | 🟡 (verify driver-linked) |
| `KDrAvira` | driver violations/tickets | `violations` | ✅ |
| `KDrBdika` | driver medical checks | `medical_checks` | ✅ |
| `KDrTaho` | tachograph checks | `tachograph_checks` | ✅ |
| `KDrCourse` | driver courses | `courses` + `trainings` | ✅ |
| `KDrHeiterHis` | driver permits (היתרים) history | `documents` (via doc_types) | 🟡 |
| `KChecks` | bank checks | — | ➖ billing |
| `KBill` | invoices/bills | — | ➖ billing |
| lookup `KTblType` | vehicle types | `vehicle_type` free text | 🟡 |
| lookup `KTblProducer` | manufacturers | `make` free text | 🟡 |
| lookup `KTblDgam` | models | `model` free text | 🟡 |
| lookup `KTblCargo` | cargo types | — | ❌ |
| lookup `KTblInsure` | insurance types | `policy_type` free text | 🟡 |
| lookup `KTblAtar` | inspection sites (אתרים) | — | ❌ |
| lookup `KTblOved` | office employees (=handler מטפל) | `profiles` | ✅ |
| lookup `KTblBank` | banks | — | ➖ billing |
| lookup `KTblOfenPay` | payment methods | — | ➖ billing |
| lookup `KTblCause` | transfer reasons | — | ❌ |
| lookup `KTblLicence` | license types | `license_type` free text | 🟡 |
| lookup `KTblGroup` | groups | — | ❌ |
| lookup `KTblCourse` | course catalog | `doc_types`/`courses` | 🟡 |
| lookup `KTblHeiter` | permit catalog | `doc_types` | 🟡 |

**Gap pattern:** Kochavit uses normalized lookup tables (dropdowns) for vehicle
type / manufacturer / model / insurance / license type / site. We store these as
free-text. Fine for now; blocks clean filtering/reporting later.

---

## 3. Feature-area comparison

### Core entity CRUD
| Feature | Kochavit | Ours | Status |
|---|---|---|---|
| Companies list + edit | ✅ | `/admin` + `/admin/companies/[id]` | ✅ |
| Vehicles list + edit | ✅ | admin vehicle card + officer views | ✅ |
| Drivers list + edit | ✅ | admin driver card | ✅ |
| Vehicle↔driver assignment (נהגים צמודים) | ✅ | `vehicle_drivers` | ✅ |
| Sub-records: accidents/violations/medical/courses/taho | ✅ | admin `saveRecord`/`deleteRecord` | ✅ |
| Company-tree navigation | ✅ | `CompanyTree` sidebar | ✅ |
| **Archives** (ארכיונים) archived vehicles/drivers/clients | ✅ separate archive lists | only `status` active/pending | 🟡 |

### Compliance / safety workflow (our core strength)
| Feature | Kochavit | Ours | Status |
|---|---|---|---|
| Monthly vehicle inspection | ✅ (treatments) | derived monthly queue + wizard | ✅ |
| DB-driven checklists | partial | `checklist_templates` | ✅ (better) |
| Defect photos on fail | scan/photo import | `defect-photos` bucket | ✅ |
| Driver trainings + auto-reschedule +1yr | manual | `submitTraining` | ✅ (better) |
| Compliance doc renewal + expiry prefill | ✅ | `renewDocument` + `recurrence_months` | ✅ |
| Digital signatures | ✅ (PassSign) | `SignaturePad` base64 | ✅ |
| **Expiry alerts** (התראות רכבים/נהגים) | ✅ `WrnCar`/`WrnDrv` reports | hybrid `getTaskFeed` | ✅ (better – live) |
| Permits (היתרים) tracking | ✅ dedicated | via generic documents | 🟡 |

### Reporting — Kochavit's biggest surface, our biggest gap
Kochavit ships **~80 FastReport templates** (`Report/*.fr3`). We have **none**.
| Report family | Kochavit templates | Ours | Status |
|---|---|---|---|
| Vehicle reports | `rpCarRprt*`, `rpCarKartis` (vehicle card) | screen views only | ❌ |
| Driver reports | `rpDriverRprt*`, `rpDrvKartis` | screen views only | ❌ |
| Client/company reports | `rpClientRprt*` | screen views | ❌ |
| Annual plan/report (תוכנית שנתית) | `rpAnualRprt*` | — | ❌ |
| Warning/expiry reports | `rpWrnCar*`, `rpWrnDrv*` | live feed (not printable) | 🟡 |
| Treatment/inspection reports | `rpTipul*`, `rpBikoret` | — | ❌ |
| Accident/violation/taho/course/medical reports | `rpAcdnt`, `rpAvira`, `rpDrTaho`, `rpCourse`, `rpDrBdika` | — | ❌ |
| Billing reports | `rpBill*`, `rpCheck*` | — | ➖ billing |
| **Excel export** | `ExportToExcel`, `ExcelRprtDM` | — | ❌ |
| **SPSS statistics export** | `*SpssSlctDlg`, `GnrlSpssChart` | — | ❌ (niche) |
| **Label printing** (Dymo) | `LabelWriter`, `rp*Lbl*` | — | ➖ (physical labels) |
| Printer settings / selective print | ✅ | browser print | 🟡 |

### Communication
| Feature | Kochavit | Ours | Status |
|---|---|---|---|
| Warning emails to clients | ✅ `WrnMail`, `MailSendList`, `OpenToSendEmail` | — | ❌ |
| SMS/messages (הודעות) | ✅ `GnrlSendMsg` | — | ❌ |
| Print form / work order (טופס / Tofes) | ✅ `PrintTofes`, `WrnTofes` | — | ❌ |
| Word doc editing/merge | ✅ `WordEdit`, `WordFunc` | — | ➖ (legacy) |

### Data exchange / integration
| Feature | Kochavit | Ours | Status |
|---|---|---|---|
| Handheld terminal (מסופון) export/import | ✅ `Export2Masofon`, `ImportMasofon*` | native mobile app replaces it | ➖ |
| Web sync (סינכרון לאתר) | ✅ `Upload/DownloadWebDataDM`, `WebInteraction` | web-native, no sync needed | ➖ |
| Gov vehicle-data lookup | ✅ `carDetail_gov` | — | ❌ (nice-to-have) |
| Scan / photo import | ✅ `ScanImport`, `ImportPhoto` | `DocumentCapture` (camera) | ✅ |
| Delete old documents (housekeeping) | ✅ `DeleteOldDocuments` | — | ❌ |
| **Missing-data report** (חסרי נתונים) | ✅ | — | ❌ |

### Platform / auth
| Feature | Kochavit | Ours | Status |
|---|---|---|---|
| Login / password | ✅ `Bcrypt`, `Password` | Supabase Auth | ✅ (better) |
| Role gating | ✅ | admin/officer via `proxy.ts`+`requireAdmin` | ✅ |
| Taxonomy management | table editors | `/admin/settings/doc-types` | 🟡 (fewer lookups) |
| History / audit (`History.pas`) | ✅ | — | ❌ |

---

## 4. Vehicle field gaps (KCar vs our `vehicles`)

We already carry most: plate, model, make, year, weights, insurance/tacho/registration
expiry, VIN, monthly_fee, policy_type. Kochavit also has, that we lack:
- `Engine` flag (has-engine / motorized yes-no — used in fleet stats)
- `CodSecure` (security code)
- `Spido` odometer as a tracked field (we have `mileage` — ok)
- normalized `Atar` (inspection site), `Cargo` type, `Insure` type, `Type` — free-text/absent here

Driver/company fields are well covered.

---

## 5. To-do list to reach parity (prioritized)

**P1 – real gaps officers/admins will feel**
1. **Printable/exportable reports.** At least: vehicle card (כרטיס רכב), driver card,
   company compliance summary, expiry/warning report. Start with server-rendered
   print-friendly pages + "Export to Excel/CSV".
2. **Archive** flow for vehicles/drivers/companies (retire without delete) — Kochavit
   has dedicated archive lists; we only have `status`.
3. **Warning emails / notifications** to companies about upcoming expiries (Kochavit's
   `WrnMail`). Pairs naturally with our hybrid alert feed.
4. **Missing-data report** (חסרי נתונים) — flag entities lacking required fields.

**P2 – normalization & completeness**
5. Convert free-text vehicle type / manufacturer / model / insurance / license type
   into managed lookup tables (dropdowns) + settings screens.
6. Dedicated **permits (היתרים)** handling if the generic documents flow proves too thin.
7. Add missing lookups the client used: cargo types, inspection sites (אתרים),
   transfer reasons (סיבות העברה), groups.
8. Annual plan (תוכנית שנתית) view — scheduled work across the year.

**P3 – nice-to-have / low priority**
9. Gov vehicle-data lookup (`carDetail_gov`) to auto-fill vehicle details by plate.
10. History/audit log.
11. Label printing (only if they still print physical labels).
12. SPSS export (very niche; likely droppable).

**Explicitly NOT parity targets (out of scope unless client asks)**
- Billing: invoices (חשבוניות), checks (המחאות), banks, payment methods, annual billing.
- Handheld-terminal (מסופון) sync — replaced by native mobile.
- Web-sync layer — replaced by web-native architecture.
- Word mail-merge editing.

---

## 6. Summary

We **match or beat** Kochavit on: core CRUD, company-tree nav, the compliance/safety
workflow (inspections, trainings, doc renewal, signatures), live expiry alerts, auth.

Our **main gaps** are all downstream of Kochavit being a *reporting/office* tool:
**printed & Excel reports, warning emails, archives, missing-data report, and
normalized lookup taxonomies.** None are architecturally hard; reports are the
biggest single body of work (~80 templates → a handful of parameterized report pages).
