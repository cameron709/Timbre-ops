-- CRM backbone for Timbre Ops. This migration is additive: existing production
-- job, pack, file, memory and change data remains in place.

alter type public.job_status add value if not exists 'scoping';
alter type public.job_status add value if not exists 'quote_required';
alter type public.job_status add value if not exists 'awaiting_client';
alter type public.job_status add value if not exists 'production';
alter type public.job_status add value if not exists 'completed';
alter type public.job_status add value if not exists 'paid';
alter type public.job_status add value if not exists 'lost';
alter type public.job_status add value if not exists 'deferred';

alter table public.clients
  add column if not exists type text not null default 'Organisation'
    check (type in ('Organisation','Local Government','School','Festival','Arts Organisation','Church','AV / Production Company','Private Client','Wedding Client','Other')),
  add column if not exists status text not null default 'Active'
    check (status in ('Active','Prospect','Inactive')),
  add column if not exists domain text,
  add column if not exists address text,
  add column if not exists billing_details text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists last_activity_at timestamptz,
  add column if not exists archived_at timestamptz;

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  first_name text,
  last_name text,
  display_name text not null,
  job_title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz,
  archived_at timestamptz,
  constraint contacts_name_or_email check (display_name <> '' or email is not null)
);

create unique index if not exists contacts_email_unique_idx
  on public.contacts (lower(email)) where email is not null and archived_at is null;
create index if not exists contacts_client_id_idx on public.contacts(client_id);

alter table public.jobs
  add column if not exists primary_contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists event_date date,
  add column if not exists quoted_value numeric(12,2) check (quoted_value is null or quoted_value >= 0),
  add column if not exists quote_reference text,
  add column if not exists invoice_reference text,
  add column if not exists quote_status text check (quote_status is null or quote_status in ('not_required','required','draft','sent','accepted','declined')),
  add column if not exists invoice_status text check (invoice_status is null or invoice_status in ('not_invoiced','draft','sent','paid','overdue','void')),
  add column if not exists source text,
  add column if not exists lost_reason text,
  add column if not exists archived_at timestamptz;

create index if not exists jobs_primary_contact_id_idx on public.jobs(primary_contact_id);
create index if not exists jobs_event_date_idx on public.jobs(event_date);
create index if not exists jobs_status_idx on public.jobs(status);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null check (activity_type in ('Email','Phone Call','Note','Meeting','File','Client Request','System Change','Quote','Invoice','Other')),
  client_id uuid not null references public.clients(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  direction text check (direction is null or direction in ('inbound','outbound','internal')),
  subject text not null,
  summary text,
  body text,
  source text,
  external_id text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists crm_activities_client_idx on public.crm_activities(client_id, occurred_at desc);
create index if not exists crm_activities_contact_idx on public.crm_activities(contact_id, occurred_at desc);
create index if not exists crm_activities_job_idx on public.crm_activities(job_id, occurred_at desc);
create unique index if not exists crm_activities_external_unique_idx
  on public.crm_activities(source, external_id) where source is not null and external_id is not null;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'To Do' check (status in ('To Do','Waiting','Done')),
  priority text not null default 'Normal' check (priority in ('Normal','Important','Urgent')),
  due_date date,
  client_id uuid references public.clients(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  source_activity_id uuid references public.crm_activities(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  archived_at timestamptz
);

create index if not exists tasks_status_due_idx on public.tasks(status, due_date);
create index if not exists tasks_client_idx on public.tasks(client_id);
create index if not exists tasks_contact_idx on public.tasks(contact_id);
create index if not exists tasks_job_idx on public.tasks(job_id);

create table if not exists public.client_import_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'gmail_client_list',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.client_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.client_import_batches(id) on delete cascade,
  organisation text,
  contact_name text,
  email text,
  client_type text,
  client_status text,
  relationship_notes text,
  matched_client_id uuid references public.clients(id) on delete set null,
  matched_contact_id uuid references public.contacts(id) on delete set null,
  import_status text not null default 'pending' check (import_status in ('pending','imported','skipped','error')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists client_import_rows_email_idx on public.client_import_rows(lower(email));

do $$
declare table_name text;
begin
  foreach table_name in array array['contacts','crm_activities','tasks','client_import_batches','client_import_rows']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "members %s" on public.%I', table_name, table_name);
    execute format('create policy "members %s" on public.%I for all to authenticated using ((select private.is_timbre_member())) with check ((select private.is_timbre_member()))', table_name, table_name);
  end loop;
end $$;

grant select, insert, update, delete on public.contacts, public.crm_activities, public.tasks,
  public.client_import_batches, public.client_import_rows to authenticated;
revoke all on public.contacts, public.crm_activities, public.tasks,
  public.client_import_batches, public.client_import_rows from anon;

create trigger set_contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- Backfill event dates for list/pipeline views.
update public.jobs
set event_date = coalesce(start_date, (start_at at time zone 'Australia/Perth')::date)
where event_date is null
  and (start_date is not null or start_at is not null);

-- Create contacts from existing job contact fields, deduplicating primarily by email.
insert into public.contacts (client_id, display_name, email, is_primary, notes, last_activity_at)
select distinct on (lower(j.contact_email))
  j.client_id,
  coalesce(nullif(j.contact_name, ''), j.contact_email, 'Primary contact'),
  lower(nullif(j.contact_email, '')),
  true,
  'Backfilled from job contact fields.',
  greatest(j.updated_at, j.start_at)
from public.jobs j
where j.client_id is not null
  and (nullif(j.contact_name, '') is not null or nullif(j.contact_email, '') is not null)
  and not exists (
    select 1 from public.contacts c
    where c.email is not null and lower(c.email) = lower(j.contact_email)
  )
order by lower(j.contact_email), j.updated_at desc;

update public.jobs j
set primary_contact_id = c.id
from public.contacts c
where j.primary_contact_id is null
  and j.client_id = c.client_id
  and (
    (j.contact_email is not null and c.email is not null and lower(j.contact_email) = lower(c.email))
    or (j.contact_email is null and j.contact_name is not null and lower(j.contact_name) = lower(c.display_name))
  );

-- Convert existing activity log rows with job/client context into relationship
-- activities without deleting the operational audit trail.
insert into public.crm_activities (activity_type, client_id, job_id, subject, summary, source, external_id, occurred_at)
select
  case
    when al.action ilike '%email%' then 'Email'
    when al.action ilike '%file%' then 'File'
    when al.action ilike '%invoice%' then 'Invoice'
    when al.action ilike '%quote%' then 'Quote'
    else 'System Change'
  end,
  j.client_id,
  al.job_id,
  al.summary,
  al.action,
  al.source,
  al.id::text,
  al.created_at
from public.activity_log al
join public.jobs j on j.id = al.job_id
where j.client_id is not null
on conflict do nothing;

update public.clients c
set last_activity_at = latest.last_activity_at
from (
  select client_id, max(occurred_at) as last_activity_at
  from public.crm_activities
  group by client_id
) latest
where c.id = latest.client_id
  and (c.last_activity_at is null or c.last_activity_at < latest.last_activity_at);
