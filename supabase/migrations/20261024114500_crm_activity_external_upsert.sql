-- Make Gmail/CRM activity upserts targetable by Postgres ON CONFLICT.
-- PostgreSQL unique indexes permit multiple NULL values by default, so this
-- preserves the previous partial-index behaviour for rows without external IDs.
drop index if exists public.crm_activities_external_unique_idx;

create unique index if not exists crm_activities_external_unique_idx
  on public.crm_activities(source, external_id);
