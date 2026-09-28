alter table public.jobs
  add column if not exists date_precision text not null default 'timed'
    check (date_precision in ('date', 'timed')),
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists bump_in_at timestamptz,
  add column if not exists soundcheck_at timestamptz,
  add column if not exists status_override_reason text,
  add column if not exists status_override_at timestamptz,
  add column if not exists status_override_by uuid references auth.users(id);

alter table public.operations
  add column if not exists due_precision text not null default 'none'
    check (due_precision in ('none', 'date', 'timed')),
  add column if not exists due_date date;

alter table public.job_documents
  add column if not exists size_bytes bigint check (size_bytes is null or size_bytes >= 0);

alter table public.job_memories
  add column if not exists updated_at timestamptz not null default now();

create trigger set_job_memories_updated_at before update on public.job_memories
  for each row execute function public.set_updated_at();

create index if not exists jobs_start_date_idx on public.jobs(start_date);
create index if not exists operations_due_date_idx on public.operations(due_date);
create index if not exists jobs_status_override_by_idx on public.jobs(status_override_by);

-- Existing local-midnight calendar imports are date-only job spans. Keep the
-- original timestamps for provenance while giving the UI explicit precision.
update public.jobs
set date_precision = 'date',
    start_date = (start_at at time zone 'Australia/Perth')::date,
    end_date = (end_at at time zone 'Australia/Perth')::date
where start_at is not null
  and end_at is not null
  and (start_at at time zone 'Australia/Perth')::time = time '00:00'
  and (end_at at time zone 'Australia/Perth')::time = time '00:00';

-- These records explicitly identify themselves as all-day, and the assistant's
-- weekday command is also a date commitment rather than a fabricated 09:00 time.
update public.operations
set due_precision = 'date',
    due_date = (due_at at time zone 'Australia/Perth')::date
where due_at is not null
  and (
    notes ilike '%all-day%'
    or lower(title) = 'order marquee'
  );

update public.operations
set due_precision = 'timed'
where due_at is not null and due_precision = 'none';
