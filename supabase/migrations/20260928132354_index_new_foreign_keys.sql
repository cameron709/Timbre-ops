create index if not exists job_changes_resolved_by_idx on public.job_changes(resolved_by);
create index if not exists job_memories_debrief_id_idx on public.job_memories(debrief_id);
