revoke all on public.assets, public.packages, public.package_items, public.job_bookings from authenticated;
grant select, insert, update, delete on public.assets, public.packages, public.package_items, public.job_bookings to authenticated;
revoke all on public.assets, public.packages, public.package_items, public.job_bookings from anon;
