import type { JobStatus, OperationStatus, PackState } from "@/types/database";

export const jobStatuses: JobStatus[] = [
  "enquiry",
  "assessing",
  "site_discovery",
  "quoting",
  "quote_sent",
  "confirmed",
  "planning",
  "ready_to_pack",
  "packed",
  "on_site",
  "complete",
  "debriefed",
  "invoiced",
  "closed",
  "cancelled"
];

export const operationStatuses: OperationStatus[] = ["open", "waiting", "done", "cancelled"];
export const packStates: PackState[] = ["planned", "packed", "out", "returned"];
