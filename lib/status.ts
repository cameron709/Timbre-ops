import type { JobStatus, OperationStatus, PackState } from "@/types/database";

export const jobStatuses: JobStatus[] = [
  "enquiry",
  "scoping",
  "quote_required",
  "quote_sent",
  "awaiting_client",
  "confirmed",
  "production",
  "completed",
  "invoiced",
  "paid",
  "cancelled",
  "lost",
  "deferred"
];

export const activeJobStatuses: JobStatus[] = ["enquiry", "scoping", "quote_required", "quote_sent", "awaiting_client", "confirmed", "production", "invoiced", "deferred"];
export const closedJobStatuses: JobStatus[] = ["completed", "paid", "cancelled", "lost", "complete", "debriefed", "closed"];

export const operationStatuses: OperationStatus[] = ["open", "waiting", "done", "cancelled"];
export const packStates: PackState[] = ["planned", "packed", "out", "returned"];
