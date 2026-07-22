-- Phase 4: company-level documents.
-- Documents (and their doc-type catalog entries) can now attach directly to a
-- company ("fleet" documents), not only to a vehicle/driver. The tasks table
-- keeps its vehicle/driver-only constraint on purpose.

alter table documents
  drop constraint documents_entity_type_check;
alter table documents
  add constraint documents_entity_type_check
  check (entity_type in ('vehicle', 'driver', 'company'));

alter table doc_types
  drop constraint doc_types_entity_type_check;
alter table doc_types
  add constraint doc_types_entity_type_check
  check (entity_type in ('vehicle', 'driver', 'company'));
