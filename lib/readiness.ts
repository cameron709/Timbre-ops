import type { Job, JobRequirement, PackItem } from "@/types/database";

export type ReadinessResult = { score: number; blockers: string[]; checks: { label: string; ready: boolean }[] };

export function calculateReadiness(job: Job, requirements: JobRequirement[] = [], pack: PackItem[] = []): ReadinessResult {
  const checks = [
    { label: "Date and time", ready: Boolean(job.start_at && job.end_at) },
    { label: "Venue", ready: Boolean(job.venue?.trim()) },
    { label: "Client", ready: Boolean(job.client_id) },
    { label: "Brief", ready: Boolean(job.brief?.trim() || job.intent?.trim()) },
    { label: "Arrival / access", ready: Boolean(job.arrival_at || (job.site_notes && Object.keys(job.site_notes as object).length)) }
  ];
  if (["planning", "ready_to_pack", "packed", "on_site"].includes(job.status)) {
    checks.push({ label: "Pack list", ready: pack.length > 0 });
  }
  for (const requirement of requirements.filter((item) => item.applicable)) {
    checks.push({ label: requirement.label, ready: requirement.resolved });
  }
  const ready = checks.filter((check) => check.ready).length;
  return {
    score: checks.length ? Math.round((ready / checks.length) * 100) : 0,
    blockers: checks.filter((check) => !check.ready).map((check) => check.label),
    checks
  };
}
