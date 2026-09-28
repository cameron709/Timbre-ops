-- Timbre Ops V1 operational foundation. This migration is deliberately additive.

create schema if not exists private;

create or replace function private.is_timbre_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_timbre_member() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_timbre_member() to authenticated;

-- Replace exposed helper use with the private helper and remove duplicate client policies.
drop policy if exists "members activity" on public.activity_log;
create policy "members activity" on public.activity_log for all to authenticated
  using ((select private.is_timbre_member())) with check ((select private.is_timbre_member()));
drop policy if exists "members read clients" on public.clients;
drop policy if exists "members write clients" on public.clients;
create policy "members clients" on public.clients for all to authenticated
  using ((select private.is_timbre_member())) with check ((select private.is_timbre_member()));
drop policy if exists "members external links" on public.external_links;
create policy "members external links" on public.external_links for all to authenticated
  using ((select private.is_timbre_member())) with check ((select private.is_timbre_member()));
drop policy if exists "members job changes" on public.job_changes;
create policy "members job changes" on public.job_changes for all to authenticated
  using ((select private.is_timbre_member())) with check ((select private.is_timbre_member()));
drop policy if exists "members jobs" on public.jobs;
create policy "members jobs" on public.jobs for all to authenticated
  using ((select private.is_timbre_member())) with check ((select private.is_timbre_member()));
drop policy if exists "members operations" on public.operations;
create policy "members operations" on public.operations for all to authenticated
  using ((select private.is_timbre_member())) with check ((select private.is_timbre_member()));
drop policy if exists "members pack items" on public.pack_items;
create policy "members pack items" on public.pack_items for all to authenticated
  using ((select private.is_timbre_member())) with check ((select private.is_timbre_member()));
drop policy if exists "member sees self" on public.team_members;
create policy "member sees self" on public.team_members for select to authenticated
  using (user_id = (select auth.uid()));

drop function if exists public.is_timbre_member();

insert into public.team_members (user_id, display_name, role)
select id, 'Cameron', 'owner'
from auth.users
where lower(email) = 'cameron@timbrepa.com.au'
on conflict (user_id) do update
set display_name = excluded.display_name, role = excluded.role;

alter table public.jobs
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists arrival_at timestamptz,
  add column if not exists site_notes jsonb not null default '{}'::jsonb,
  add column if not exists tags text[] not null default '{}';

alter table public.job_changes
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution text,
  add column if not exists resolved_by uuid references auth.users(id);

create table if not exists public.job_requirements (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  key text not null,
  label text not null,
  category text not null default 'planning',
  applicable boolean not null default true,
  resolved boolean not null default false,
  detail text,
  source public.source_kind not null default 'cameron',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, key)
);

create table if not exists public.job_documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  name text not null,
  category text not null default 'other',
  storage_path text,
  external_url text,
  mime_type text,
  version integer not null default 1 check (version > 0),
  is_current boolean not null default true,
  source public.source_kind not null default 'cameron',
  notes text,
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);

create table if not exists public.job_debriefs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  raw_text text not null,
  source public.source_kind not null default 'cameron',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_memories (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  debrief_id uuid references public.job_debriefs(id) on delete set null,
  category text not null check (category in ('keep','change_next_time','equipment_issue','missing_gear','client_follow_up','purchase_idea','technical_lesson','general')),
  summary text not null,
  detail text,
  tags text[] not null default '{}',
  source public.source_kind not null default 'cameron',
  created_at timestamptz not null default now()
);

create table if not exists public.integration_connections (
  provider text primary key check (provider in ('gmail','google_calendar','openai')),
  status text not null default 'disconnected' check (status in ('disconnected','configured','connected','error')),
  account_label text,
  last_synced_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('gmail','google_calendar')),
  status text not null check (status in ('running','succeeded','failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_seen integer not null default 0,
  records_changed integer not null default 0,
  error text,
  metadata jsonb not null default '{}'::jsonb
);

do $$
declare table_name text;
begin
  foreach table_name in array array['job_requirements','job_documents','job_debriefs','job_memories','integration_connections','sync_runs']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "members %s" on public.%I for all to authenticated using ((select private.is_timbre_member())) with check ((select private.is_timbre_member()))', table_name, table_name);
  end loop;
end $$;

grant select, insert, update, delete on public.job_requirements, public.job_documents,
  public.job_debriefs, public.job_memories, public.integration_connections, public.sync_runs to authenticated;
revoke all on public.job_requirements, public.job_documents, public.job_debriefs,
  public.job_memories, public.integration_connections, public.sync_runs from anon;

create trigger set_job_requirements_updated_at before update on public.job_requirements
  for each row execute function public.set_updated_at();
create trigger set_job_debriefs_updated_at before update on public.job_debriefs
  for each row execute function public.set_updated_at();
create trigger set_integration_connections_updated_at before update on public.integration_connections
  for each row execute function public.set_updated_at();

create index if not exists activity_log_job_id_idx on public.activity_log(job_id);
create index if not exists activity_log_operation_id_idx on public.activity_log(operation_id);
create index if not exists external_links_job_id_idx on public.external_links(job_id);
create index if not exists external_links_operation_id_idx on public.external_links(operation_id);
create index if not exists jobs_client_id_idx on public.jobs(client_id);
create index if not exists jobs_precedent_job_id_idx on public.jobs(precedent_job_id);
create index if not exists operations_job_id_idx on public.operations(job_id);
create index if not exists job_changes_attention_idx on public.job_changes(requires_attention, resolved_at) where requires_attention;
create index if not exists job_requirements_job_id_idx on public.job_requirements(job_id);
create index if not exists job_documents_job_id_idx on public.job_documents(job_id);
create index if not exists job_debriefs_job_id_idx on public.job_debriefs(job_id);
create index if not exists job_memories_job_id_idx on public.job_memories(job_id);
create index if not exists job_memories_client_id_idx on public.job_memories(client_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-files', 'job-files', false, 20971520, array['application/pdf','image/jpeg','image/png','image/webp','text/plain'])
on conflict (id) do nothing;

create policy "members read job files" on storage.objects for select to authenticated
  using (bucket_id = 'job-files' and (select private.is_timbre_member()));
create policy "members add job files" on storage.objects for insert to authenticated
  with check (bucket_id = 'job-files' and (select private.is_timbre_member()));
create policy "members update job files" on storage.objects for update to authenticated
  using (bucket_id = 'job-files' and (select private.is_timbre_member()))
  with check (bucket_id = 'job-files' and (select private.is_timbre_member()));
create policy "members remove job files" on storage.objects for delete to authenticated
  using (bucket_id = 'job-files' and (select private.is_timbre_member()));
