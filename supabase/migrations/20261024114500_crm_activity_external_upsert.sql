-- Make Gmail/CRM activity upserts targetable by Postgres ON CONFLICT.
-- PostgreSQL unique indexes permit multiple NULL values by default, so the
-- full index preserves the previous partial-index behaviour for null IDs.
create unique index if not exists crm_activities_external_upsert_idx
  on public.crm_activities(source, external_id);

drop index if exists public.crm_activities_external_unique_idx;

alter index if exists public.crm_activities_external_upsert_idx
  rename to crm_activities_external_unique_idx;
