import type { GearItem, InventoryPackage, Job, PackageItem, PackItem, PackLineType } from "@/types/database";

export type FulfilmentDraft = {
  item_name: string;
  gear_item_id: string;
  quantity_planned: number;
  line_type: PackLineType;
  notes: string | null;
  package_id: string | null;
  source_context: string | null;
};

function lineTypeForItem(item: GearItem): PackLineType | null {
  if (item.item_type === "service") return null;
  if (item.item_type === "hire_in") return "hire";
  if (item.item_type === "consumable") return "consumable";
  return "catalogue";
}

export function fulfilmentForItem(item: GearItem, quantity: number, sourceContext = "Project booking"): FulfilmentDraft[] {
  const lineType = lineTypeForItem(item);
  if (!lineType) return [];
  return [{
    item_name: item.name,
    gear_item_id: item.id,
    quantity_planned: Math.max(1, quantity),
    line_type: lineType,
    notes: null,
    package_id: null,
    source_context: sourceContext
  }];
}

export function expandPackage(
  packageId: string,
  quantity: number,
  packages: InventoryPackage[],
  packageItems: PackageItem[],
  gear: GearItem[],
  ancestry: string[] = []
): FulfilmentDraft[] {
  if (ancestry.includes(packageId)) {
    const names = [...ancestry, packageId].map((id) => packages.find((item) => item.id === id)?.name ?? id);
    throw new Error(`Package cycle detected: ${names.join(" → ")}`);
  }

  const current = packages.find((item) => item.id === packageId);
  if (!current) throw new Error("Package not found.");

  const gearById = new Map(gear.map((item) => [item.id, item]));
  const nextAncestry = [...ancestry, packageId];
  const rows: FulfilmentDraft[] = [];

  for (const component of packageItems.filter((item) => item.package_id === packageId && item.required)) {
    const componentQuantity = Math.max(1, quantity) * component.quantity;
    if (component.gear_item_id) {
      const item = gearById.get(component.gear_item_id);
      if (!item) continue;
      rows.push(...fulfilmentForItem(item, componentQuantity, current.name).map((line) => ({ ...line, package_id: packageId, notes: `${current.name} package component` })));
      continue;
    }
    if (component.child_package_id) {
      rows.push(...expandPackage(component.child_package_id, componentQuantity, packages, packageItems, gear, nextAncestry).map((line) => ({
        ...line,
        package_id: packageId,
        source_context: current.name
      })));
    }
  }

  const merged = new Map<string, FulfilmentDraft>();
  for (const line of rows) {
    const key = `${line.gear_item_id}:${line.line_type}`;
    const existing = merged.get(key);
    if (existing) existing.quantity_planned += line.quantity_planned;
    else merged.set(key, { ...line });
  }
  return Array.from(merged.values());
}


export function packageWouldCreateCycle(parentPackageId: string, childPackageId: string, packageItems: PackageItem[]) {
  if (parentPackageId === childPackageId) return true;
  const childrenByPackage = new Map<string, string[]>();
  for (const component of packageItems) {
    if (!component.child_package_id) continue;
    const children = childrenByPackage.get(component.package_id) ?? [];
    children.push(component.child_package_id);
    childrenByPackage.set(component.package_id, children);
  }

  const seen = new Set<string>();
  const stack = [childPackageId];
  while (stack.length) {
    const current = stack.pop() as string;
    if (current === parentPackageId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(childrenByPackage.get(current) ?? []));
  }
  return false;
}

export type BookingAvailabilityConflict = {
  gearItemId: string;
  gearName: string;
  quantityOwned: number;
  existingDemand: number;
  requested: number;
  availableBefore: number;
  shortageAfter: number;
  conflictingProjects: string[];
};

function jobWindow(job: Pick<Job, "start_at" | "end_at" | "start_date" | "end_date" | "event_date" | "date_precision">) {
  if (job.date_precision === "timed" && job.start_at) {
    const start = new Date(job.start_at).getTime();
    const end = job.end_at ? new Date(job.end_at).getTime() : start;
    if (Number.isFinite(start) && Number.isFinite(end)) return [Math.min(start, end), Math.max(start, end)] as const;
  }
  const startDate = job.start_date ?? job.event_date;
  if (!startDate) return null;
  const endDate = job.end_date ?? startDate;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T23:59:59.999Z`).getTime();
  return [start, end] as const;
}

function jobsOverlap(a: Pick<Job, "start_at" | "end_at" | "start_date" | "end_date" | "event_date" | "date_precision">, b: Pick<Job, "start_at" | "end_at" | "start_date" | "end_date" | "event_date" | "date_precision">) {
  const left = jobWindow(a);
  const right = jobWindow(b);
  if (!left || !right) return false;
  return left[0] <= right[1] && right[0] <= left[1];
}

export function bookingAvailability(
  targetJob: Job | undefined,
  drafts: FulfilmentDraft[],
  gear: GearItem[],
  pack: PackItem[],
  jobs: Job[]
) {
  if (!targetJob) return { unknownDate: true, conflicts: [] as BookingAvailabilityConflict[] };

  const targetWindow = jobWindow(targetJob);
  const relevantJobs = jobs.filter((job) => {
    if (job.id === targetJob.id) return true;
    if (job.status === "cancelled" || job.status === "lost") return false;
    return targetWindow ? jobsOverlap(targetJob, job) : false;
  });
  const relevantJobIds = new Set(relevantJobs.map((job) => job.id));
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const requestedByGear = new Map<string, number>();

  for (const draft of drafts) {
    if (draft.line_type === "hire" || draft.line_type === "custom" || draft.line_type === "purchase") continue;
    requestedByGear.set(draft.gear_item_id, (requestedByGear.get(draft.gear_item_id) ?? 0) + draft.quantity_planned);
  }

  const conflicts: BookingAvailabilityConflict[] = [];
  for (const [gearItemId, requested] of requestedByGear) {
    const item = gear.find((record) => record.id === gearItemId);
    if (!item || item.tracking_mode === "non_stock") continue;
    const lines = pack.filter((line) => line.gear_item_id === gearItemId && relevantJobIds.has(line.job_id));
    const existingDemand = lines.reduce((sum, line) => sum + line.quantity_planned, 0);
    const shortageAfter = Math.max(0, existingDemand + requested - item.quantity_owned);
    if (!shortageAfter) continue;
    const conflictingProjects = Array.from(new Set(lines
      .map((line) => jobById.get(line.job_id)?.title)
      .filter((title): title is string => Boolean(title))));
    conflicts.push({
      gearItemId,
      gearName: item.name,
      quantityOwned: item.quantity_owned,
      existingDemand,
      requested,
      availableBefore: Math.max(0, item.quantity_owned - existingDemand),
      shortageAfter,
      conflictingProjects
    });
  }

  return { unknownDate: !targetWindow, conflicts };
}
