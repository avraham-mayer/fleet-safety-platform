-- Phase 3 follow-ups: per-company handler assignment + richer documents.
-- Additive over 0002_phase2.sql. Run after 0002.

-- Each client company is assigned a handling safety officer (מטפל אחראי).
-- Alerts/tasks inherit the handler from their company.
alter table companies
  add column handler_id uuid references profiles (id);

-- "בוצע בתאריך" — when the document was issued/last renewed. Complements
-- expiry_date ("לבצע בתאריך"), mirroring the legacy system's treatment table.
alter table documents
  add column issued_date date;
