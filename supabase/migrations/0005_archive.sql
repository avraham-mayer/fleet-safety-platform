-- Phase 5: soft-archive for companies, vehicles, drivers.
-- Mirrors the legacy program's archive lists (ארכיונים) + transfer reason
-- (KTblCause). Archived = archived_at IS NOT NULL. Archived rows are hidden
-- from lists, the company tree, and the alert feed (retired entities must not
-- raise alerts), but kept for history. archive_reason is the free-text cause.

alter table companies
  add column archived_at    timestamptz,
  add column archive_reason text;
alter table vehicles
  add column archived_at    timestamptz,
  add column archive_reason text;
alter table drivers
  add column archived_at    timestamptz,
  add column archive_reason text;

create index companies_archived_idx on companies (archived_at);
create index vehicles_archived_idx  on vehicles (archived_at);
create index drivers_archived_idx   on drivers (archived_at);
