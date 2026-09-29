-- Reviewable Gmail import. Email evidence is staged separately from confirmed
-- operational facts; accepting a proposal is always an explicit user action.

alter table public.jobs
  add column if not exists setup_at timestamptz,
  add column if not exists bump_out_at timestamptz,
  add column if not exists programme_notes text,
  add column if not exists technical_notes text;

-- Date-only records previously retained synthetic timestamps. The explicit date
-- remains authoritative; time proposals must be reviewed before becoming timed.
update public.jobs
set start_at = null,
    end_at = null
where date_precision = 'date'
  and start_date is not null;

alter table public.pack_items add column if not exists source_ref text;
alter table public.job_requirements add column if not exists source_ref text;
alter table public.job_documents add column if not exists source_ref text;

create unique index if not exists pack_items_source_ref_idx
  on public.pack_items(job_id, source_ref);
create unique index if not exists job_requirements_source_ref_idx
  on public.job_requirements(job_id, source_ref);
create unique index if not exists job_documents_source_ref_idx
  on public.job_documents(job_id, source_ref);
create unique index if not exists job_changes_source_ref_idx
  on public.job_changes(job_id, source_ref);

-- Token ciphertext is server-only. No authenticated/anonymous grants or RLS
-- policies are created; API routes use the service role after validating a user.
create table if not exists public.gmail_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_email text not null,
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  last_verified_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.gmail_credentials enable row level security;
revoke all on public.gmail_credentials from anon, authenticated;

create or replace function public.store_gmail_credentials(
  account_email text,
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  scopes text[]
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.is_timbre_member()) then
    raise exception 'Not authorised';
  end if;
  insert into public.gmail_credentials as credentials
    (user_id, account_email, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, scopes, last_verified_at, last_error)
  values
    ((select auth.uid()), account_email, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, scopes, now(), null)
  on conflict (user_id) do update set
    account_email = excluded.account_email,
    access_token_ciphertext = excluded.access_token_ciphertext,
    refresh_token_ciphertext = coalesce(excluded.refresh_token_ciphertext, credentials.refresh_token_ciphertext),
    token_expires_at = excluded.token_expires_at,
    scopes = excluded.scopes,
    last_verified_at = now(),
    last_error = null;
end $$;

create or replace function public.get_gmail_credentials()
returns table (
  account_email text,
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  scopes text[],
  last_verified_at timestamptz,
  last_error text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.account_email, c.access_token_ciphertext, c.refresh_token_ciphertext,
    c.token_expires_at, c.scopes, c.last_verified_at, c.last_error
  from public.gmail_credentials c
  where c.user_id = (select auth.uid())
    and (select private.is_timbre_member());
$$;

create or replace function public.disconnect_gmail()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.gmail_credentials
  where user_id = (select auth.uid()) and (select private.is_timbre_member());
$$;

revoke all on function public.store_gmail_credentials(text,text,text,timestamptz,text[]) from public, anon;
revoke all on function public.get_gmail_credentials() from public, anon;
revoke all on function public.disconnect_gmail() from public, anon;
grant execute on function public.store_gmail_credentials(text,text,text,timestamptz,text[]) to authenticated;
grant execute on function public.get_gmail_credentials() to authenticated;
grant execute on function public.disconnect_gmail() to authenticated;

create table if not exists public.email_threads (
  id uuid primary key default gen_random_uuid(),
  gmail_thread_id text not null unique,
  subject text not null,
  participants text[] not null default '{}',
  snippet text,
  latest_message_at timestamptz,
  gmail_url text,
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now()
);

create table if not exists public.job_email_threads (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  email_thread_id uuid not null references public.email_threads(id) on delete cascade,
  match_score integer not null default 0 check (match_score between 0 and 100),
  match_reasons jsonb not null default '[]'::jsonb,
  review_status text not null default 'candidate'
    check (review_status in ('candidate','included','excluded')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, email_thread_id)
);

create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  email_thread_id uuid not null references public.email_threads(id) on delete cascade,
  gmail_message_id text not null unique,
  sent_at timestamptz,
  from_address text,
  to_addresses text[] not null default '{}',
  subject text,
  snippet text,
  body_text text,
  gmail_url text,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_attachments (
  id uuid primary key default gen_random_uuid(),
  email_message_id uuid not null references public.email_messages(id) on delete cascade,
  gmail_attachment_id text,
  filename text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  document_type text not null default 'other',
  source_date timestamptz,
  storage_path text,
  import_status text not null default 'available'
    check (import_status in ('mentioned','available','saved','error')),
  content_hash text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email_message_id, filename)
);

create table if not exists public.import_proposals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  email_thread_id uuid references public.email_threads(id) on delete cascade,
  email_message_id uuid references public.email_messages(id) on delete cascade,
  email_attachment_id uuid references public.email_attachments(id) on delete cascade,
  field_key text not null,
  proposed_value jsonb not null,
  proposed_text text not null,
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  source_excerpt text not null,
  source_date timestamptz,
  conflict_group text,
  status text not null default 'pending'
    check (status in ('pending','accepted','rejected')),
  decision_note text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare table_name text;
begin
  foreach table_name in array array['email_threads','job_email_threads','email_messages','email_attachments','import_proposals']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "members %s" on public.%I for all to authenticated using ((select private.is_timbre_member())) with check ((select private.is_timbre_member()))', table_name, table_name);
  end loop;
end $$;

grant select, insert, update, delete on public.email_threads, public.job_email_threads,
  public.email_messages, public.email_attachments, public.import_proposals to authenticated;
revoke all on public.email_threads, public.job_email_threads,
  public.email_messages, public.email_attachments, public.import_proposals from anon;

create trigger set_gmail_credentials_updated_at before update on public.gmail_credentials
  for each row execute function public.set_updated_at();
create trigger set_job_email_threads_updated_at before update on public.job_email_threads
  for each row execute function public.set_updated_at();
create trigger set_email_messages_updated_at before update on public.email_messages
  for each row execute function public.set_updated_at();
create trigger set_email_attachments_updated_at before update on public.email_attachments
  for each row execute function public.set_updated_at();
create trigger set_import_proposals_updated_at before update on public.import_proposals
  for each row execute function public.set_updated_at();

create index if not exists job_email_threads_job_idx on public.job_email_threads(job_id, review_status);
create index if not exists email_messages_thread_idx on public.email_messages(email_thread_id, sent_at);
create index if not exists email_attachments_message_idx on public.email_attachments(email_message_id);
create index if not exists import_proposals_job_idx on public.import_proposals(job_id, status);
