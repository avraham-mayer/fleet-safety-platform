-- Sample data for local development.
-- Inspections are intentionally NOT seeded: they require a real auth.users
-- officer_id. Sign in and create them through the wizard instead.

insert into companies (name) values
  ('הובלות הגליל בע"מ'),
  ('שינוע דרום בע"מ');

-- Vehicles spread across both companies. Expiry dates are illustrative.
insert into vehicles (company_id, license_plate, model, insurance_expiry, tachograph_expiry, registration_expiry)
select c.id, v.license_plate, v.model, v.insurance_expiry, v.tachograph_expiry, v.registration_expiry
from companies c
join (values
  ('הובלות הגליל בע"מ', '12-345-67', 'Volvo FH16',      date '2026-12-31', date '2026-09-30', date '2027-01-31'),
  ('הובלות הגליל בע"מ', '23-456-78', 'Scania R450',     date '2026-08-15', date '2026-07-01', date '2026-11-30'),
  ('הובלות הגליל בע"מ', '34-567-89', 'MAN TGX',         date '2026-10-20', date '2026-12-01', date '2027-03-15'),
  ('הובלות הגליל בע"מ', '45-678-90', 'Mercedes Actros', date '2026-07-10', date '2026-08-20', date '2026-12-25'),
  ('שינוע דרום בע"מ',   '56-789-01', 'DAF XF',          date '2026-09-05', date '2026-10-10', date '2027-02-28'),
  ('שינוע דרום בע"מ',   '67-890-12', 'Iveco S-Way',     date '2026-11-11', date '2026-06-30', date '2026-10-05'),
  ('שינוע דרום בע"מ',   '78-901-23', 'Renault T',       date '2026-12-01', date '2026-09-15', date '2027-01-10'),
  ('שינוע דרום בע"מ',   '89-012-34', 'Volvo FM',        date '2026-08-25', date '2026-11-20', date '2026-12-31')
) as v(company_name, license_plate, model, insurance_expiry, tachograph_expiry, registration_expiry)
  on v.company_name = c.name;

insert into drivers (company_id, name, license_number, hazmat_certified)
select c.id, d.name, d.license_number, d.hazmat_certified
from companies c
join (values
  ('הובלות הגליל בע"מ', 'יוסי כהן',    '3344556', true),
  ('הובלות הגליל בע"מ', 'משה לוי',     '4455667', false),
  ('שינוע דרום בע"מ',   'דוד פרץ',     '5566778', true),
  ('שינוע דרום בע"מ',   'אבי מזרחי',   '6677889', false)
) as d(company_name, name, license_number, hazmat_certified)
  on d.company_name = c.name;

-- ---------------------------------------------------------------------------
-- Phase 2 sample data
-- ---------------------------------------------------------------------------

-- Checklist templates. Items default to Pass in the wizard.
insert into checklist_templates (name, type, items) values
  ('בדיקה חודשית', 'monthly', '[
    {"key":"tires","label":"צמיגים / Tires"},
    {"key":"lights","label":"תאורה / Lights"},
    {"key":"brakes","label":"בלמים / Brakes"},
    {"key":"fluids","label":"נוזלים / Fluids"}
  ]'),
  ('בדיקת חורף', 'winter', '[
    {"key":"wipers","label":"מגבים / Wipers"},
    {"key":"heating","label":"חימום / Heating"},
    {"key":"tires_winter","label":"צמיגי חורף / Winter tires"}
  ]'),
  ('בדיקת בלמים', 'brakes', '[
    {"key":"pads","label":"רפידות / Pads"},
    {"key":"discs","label":"דיסקים / Discs"},
    {"key":"brake_fluid","label":"נוזל בלמים / Brake fluid"}
  ]');

-- Documents with a mix of expired / expiring-soon / ok dates (today ≈ 2026-06-26).
insert into documents (entity_type, entity_id, company_id, doc_type, expiry_date)
select 'vehicle', v.id, v.company_id, x.doc_type, x.expiry_date
from vehicles v
join (values
  ('12-345-67', 'רישיון רכב', date '2026-06-10'),  -- expired
  ('23-456-78', 'ביטוח',      date '2026-07-15'),  -- soon
  ('56-789-01', 'טכוגרף',     date '2026-12-01')   -- ok
) as x(plate, doc_type, expiry_date)
  on x.plate = v.license_plate;

insert into documents (entity_type, entity_id, company_id, doc_type, expiry_date)
select 'driver', d.id, d.company_id, 'רישיון נהיגה', date '2026-07-05' -- soon
from drivers d
where d.name = 'יוסי כהן';

-- ---------------------------------------------------------------------------
-- Phase 3 sample data
-- ---------------------------------------------------------------------------

-- Doc-type catalog mirroring the legacy "טיפולים" taxonomy.
insert into doc_types (entity_type, name, recurrence_months) values
  ('vehicle', 'ביטוח חובה',                12),
  ('vehicle', 'מבחן רישוי שנתי',           12),
  ('vehicle', 'תעודת כיול טכוגרף',         24),
  ('vehicle', 'אישור ביקורת חורף',         12),
  ('vehicle', 'רשיון מוביל',               12),
  ('vehicle', 'נספח לרשיון רכב',           12),
  ('vehicle', 'צילום רשיון מוביל חודשי',   1),
  ('vehicle', 'דיסקיות טכוגרף חודשי',      1),
  ('vehicle', 'מסמכים נילווים',            null),
  ('driver',  'תיק נהג',                   null),
  ('driver',  'רישיון נהיגה',              12),
  ('driver',  'הדרכת קיץ',                 12),
  ('driver',  'הדרכת חורף',                12),
  ('driver',  'לוח תמרורים',               12),
  ('driver',  'שאלון קיץ',                 12),
  ('driver',  'הנחיות בטיחות כללי',        12),
  ('driver',  'נספחים לנהג',               null),
  ('driver',  'פלט הרשאות נהגים',          12);

-- Pending training tasks (materialized).
insert into tasks (company_id, entity_type, entity_id, task_type, title, due_date)
select d.company_id, 'driver', d.id, 'training', x.title, x.due_date
from drivers d
join (values
  ('יוסי כהן',  'הדרכת תמרורים / Traffic signs', date '2026-06-01'),  -- overdue
  ('דוד פרץ',   'הדרכת חורף / Winter training',   date '2026-07-20')   -- upcoming
) as x(name, title, due_date)
  on x.name = d.name;
