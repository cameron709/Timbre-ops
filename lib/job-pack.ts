import type { Client, ExternalLink, Job, JobChange, JobDocument, JobRequirement, PackItem } from "@/types/database";

export type JobPackInput = { job: Job; client: Client | null; pack: PackItem[]; changes: JobChange[]; requirements: JobRequirement[]; documents: JobDocument[]; links: ExternalLink[] };
export function jobPackContents(input: JobPackInput) {
  const unresolved = input.changes.filter((item) => item.requires_attention && !item.resolved_at);
  const plans = input.documents.filter(isPlanDocument);
  return {
    sections: ["Schedule", "On-day contacts", "Venue and access", "Technical details", "Pack checklist", "Outstanding questions", "Plans and attachments"],
    unresolved,
    plans,
    hasActualPlan: plans.length > 0,
    contact: input.job.contact_name || input.client?.name || null
  };
}
export function isPlanDocument(document: Pick<JobDocument,"name"|"category">) {
  return ["site_plan","stage_plot"].includes(document.category) || /site.?plan|stage.?plot/i.test(document.name);
}
