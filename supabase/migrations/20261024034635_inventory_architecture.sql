alter table public.gear_items
  add column if not exists item_type text not null default 'product'
    check (item_type in ('product','service','consumable','hire_in')),
  add column if not exists tracking_mode text not null default 'pooled'
    check (tracking_mode in ('pooled','serialised','non_stock')),
  add column if not exists unit text not null default 'each',
  add column if not exists active boolean not null default true,
  add column if not exists sku text,
  add column if not exists default_rate numeric(12,2) check (default_rate is null or default_rate >= 0),
  add column if not exists replacement_value numeric(12,2) check (replacement_value is null or replacement_value >= 0);

create unique index if not exists gear_items_sku_unique_idx
  on public.gear_items (lower(sku))
  where sku is not null;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  gear_item_id uuid not null references public.gear_items(id) on delete cascade,
  asset_tag text not null unique,
  serial_number text,
  barcode text unique,
  status text not null default 'available'
    check (status in ('available','maintenance','retired','lost')),
  condition text not null default 'good'
    check (condition in ('good','fair','damaged','maintenance')),
  purchase_date date,
  purchase_price numeric(12,2) check (purchase_price is null or purchase_price >= 0),
  test_tag_due date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'audio',
  description text,
  client_description text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists packages_name_unique_idx
  on public.packages (lower(name))
  where active;

create table if not exists public.package_items (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.packages(id) on delete cascade,
  gear_item_id uuid references public.gear_items(id) on delete restrict,
  child_package_id uuid references public.packages(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  client_visible boolean not null default false,
  required boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  constraint package_items_exactly_one_component check (
    (gear_item_id is not null and child_package_id is null)
    or
    (gear_item_id is null and child_package_id is not null)
  ),
  constraint package_items_no_direct_self_reference check (
    child_package_id is null or child_package_id <> package_id
  )
);

create unique index if not exists package_items_gear_unique_idx
  on public.package_items(package_id, gear_item_id)
  where gear_item_id is not null;

create unique index if not exists package_items_package_unique_idx
  on public.package_items(package_id, child_package_id)
  where child_package_id is not null;

create table if not exists public.job_bookings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  booking_type text not null check (booking_type in ('item','package')),
  gear_item_id uuid references public.gear_items(id) on delete restrict,
  package_id uuid references public.packages(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  client_visible boolean not null default true,
  source source_kind not null default 'cameron',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_bookings_component_matches_type check (
    (booking_type = 'item' and gear_item_id is not null and package_id is null)
    or
    (booking_type = 'package' and gear_item_id is null and package_id is not null)
  )
);

alter table public.pack_items
  add column if not exists booking_id uuid references public.job_bookings(id) on delete set null,
  add column if not exists package_id uuid references public.packages(id) on delete set null,
  add column if not exists asset_id uuid references public.assets(id) on delete set null;

create index if not exists assets_gear_item_idx on public.assets(gear_item_id);
create index if not exists package_items_package_idx on public.package_items(package_id);
create index if not exists package_items_gear_idx on public.package_items(gear_item_id);
create index if not exists package_items_child_package_idx on public.package_items(child_package_id);
create index if not exists job_bookings_job_idx on public.job_bookings(job_id);
create index if not exists job_bookings_gear_idx on public.job_bookings(gear_item_id);
create index if not exists job_bookings_package_idx on public.job_bookings(package_id);
create index if not exists pack_items_booking_idx on public.pack_items(booking_id);
create index if not exists pack_items_asset_idx on public.pack_items(asset_id);

alter table public.assets enable row level security;
alter table public.packages enable row level security;
alter table public.package_items enable row level security;
alter table public.job_bookings enable row level security;

drop policy if exists "members assets" on public.assets;
create policy "members assets" on public.assets
  for all to authenticated
  using ((select private.is_timbre_member()))
  with check ((select private.is_timbre_member()));

drop policy if exists "members packages" on public.packages;
create policy "members packages" on public.packages
  for all to authenticated
  using ((select private.is_timbre_member()))
  with check ((select private.is_timbre_member()));

drop policy if exists "members package_items" on public.package_items;
create policy "members package_items" on public.package_items
  for all to authenticated
  using ((select private.is_timbre_member()))
  with check ((select private.is_timbre_member()));

drop policy if exists "members job_bookings" on public.job_bookings;
create policy "members job_bookings" on public.job_bookings
  for all to authenticated
  using ((select private.is_timbre_member()))
  with check ((select private.is_timbre_member()));

grant select, insert, update, delete on public.assets, public.packages, public.package_items, public.job_bookings to authenticated;
revoke all on public.assets, public.packages, public.package_items, public.job_bookings from anon;

drop trigger if exists set_assets_updated_at on public.assets;
create trigger set_assets_updated_at before update on public.assets
  for each row execute function public.set_updated_at();

drop trigger if exists set_packages_updated_at on public.packages;
create trigger set_packages_updated_at before update on public.packages
  for each row execute function public.set_updated_at();

drop trigger if exists set_job_bookings_updated_at on public.job_bookings;
create trigger set_job_bookings_updated_at before update on public.job_bookings
  for each row execute function public.set_updated_at();

update public.gear_items
set tracking_mode = case
  when item_type in ('service','hire_in') then 'non_stock'
  else tracking_mode
end;
