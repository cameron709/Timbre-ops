-- Practical gear catalogue and job allocation support.
-- This is intentionally not a full asset/inventory system.

create table if not exists public.gear_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'audio',
  quantity_owned integer not null default 0 check (quantity_owned >= 0),
  description text,
  notes text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.gear_kits (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gear_kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.gear_kits(id) on delete cascade,
  gear_item_id uuid not null references public.gear_items(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (kit_id, gear_item_id)
);

alter table public.pack_items
  add column if not exists gear_item_id uuid references public.gear_items(id) on delete set null,
  add column if not exists line_type text not null default 'catalogue'
    check (line_type in ('catalogue','hire','consumable','purchase','custom')),
  add column if not exists source_context text;

do $$
declare table_name text;
begin
  foreach table_name in array array['gear_items','gear_kits','gear_kit_items']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "members %s" on public.%I', table_name, table_name);
    execute format('create policy "members %s" on public.%I for all to authenticated using ((select private.is_timbre_member())) with check ((select private.is_timbre_member()))', table_name, table_name);
  end loop;
end $$;

grant select, insert, update, delete on public.gear_items, public.gear_kits, public.gear_kit_items to authenticated;
revoke all on public.gear_items, public.gear_kits, public.gear_kit_items from anon;

create trigger set_gear_items_updated_at before update on public.gear_items
  for each row execute function public.set_updated_at();
create trigger set_gear_kits_updated_at before update on public.gear_kits
  for each row execute function public.set_updated_at();

create index if not exists pack_items_gear_item_idx on public.pack_items(gear_item_id);
create index if not exists pack_items_job_gear_idx on public.pack_items(job_id, gear_item_id);
create index if not exists gear_kit_items_kit_idx on public.gear_kit_items(kit_id);
