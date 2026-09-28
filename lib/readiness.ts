import type { Job, JobRequirement, JobStatus, PackItem } from "@/types/database";
export type ReadinessCheck = { key: string; label: string; ready: boolean; requiredForPacking: boolean };
export type ReadinessResult = { score: number; blockers: string[]; checks: ReadinessCheck[] };
export type StatusGate = { allowed: boolean; blockers: string[]; requiresOverride: boolean };
const packingStatuses: JobStatus[] = ["ready_to_pack", "packed", "on_site"];
export function calculateReadiness(job: Job, requirements: JobRequirement[] = [], pack: PackItem[] = []): ReadinessResult {
  const siteNotes = job.site_notes && typeof job.site_notes === "object" && !Array.isArray(job.site_notes) ? job.site_notes : {};
  const checks: ReadinessCheck[] = [
    { key: "schedule", label: "Event date or time", ready: Boolean(job.start_date || job.start_at), requiredForPacking: true },
    { key: "venue", label: "Venue", ready: Boolean(job.venue?.trim()), requiredForPacking: true },
    { key: "client", label: "Client", ready: Boolean(job.client_id), requiredForPacking: false },
    { key: "brief", label: "Brief or intent", ready: Boolean(job.brief?.trim() || job.intent?.trim()), requiredForPacking: true },
    { key: "access", label: "Arrival or access", ready: Boolean(job.arrival_at || Object.keys(siteNotes).some((key) => key === "access" && Boolean(siteNotes[key]))), requiredForPacking: true },
    { key: "pack", label: "Pack list", ready: pack.length > 0 && pack.some((item) => item.quantity_planned > 0), requiredForPacking: true }
  ];
  for (const requirement of requirements.filter((item) => item.applicable)) checks.push({ key: `requirement:${requirement.key}`, label: requirement.label, ready: requirement.resolved, requiredForPacking: true });
  const ready = checks.filter((check) => check.ready).length;
  return { score: Math.round((ready / checks.length) * 100), blockers: checks.filter((check) => !check.ready).map((check) => check.label), checks };
}
export function evaluateStatusGate(target: JobStatus, readiness: ReadinessResult): StatusGate {
  if (!packingStatuses.includes(target)) return { allowed: true, blockers: [], requiresOverride: false };
  const blockers = readiness.checks.filter((check) => check.requiredForPacking && !check.ready).map((check) => check.label);
  return { allowed: blockers.length === 0, blockers, requiresOverride: blockers.length > 0 };
}
export function effectiveStatusGate(target: JobStatus, readiness: ReadinessResult, overrideReason: string | null) {
  const gate = evaluateStatusGate(target, readiness), hasOverride = Boolean(overrideReason?.trim());
  return { ...gate, allowed: gate.allowed || hasOverride, overridden: !gate.allowed && hasOverride };
}
