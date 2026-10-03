-- Backfill existing production-oriented statuses after the CRM lifecycle enum
-- values have been committed by the previous migration.

update public.jobs set status = 'scoping' where status in ('assessing','site_discovery');
update public.jobs set status = 'quote_required' where status = 'quoting';
update public.jobs set status = 'production' where status in ('planning','ready_to_pack','packed','on_site');
update public.jobs set status = 'completed' where status in ('complete','debriefed','closed');
