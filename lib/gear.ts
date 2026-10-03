import type { GearItem, Job, PackItem } from "@/types/database";

export type PackAllocation = {
  gearItemId: string;
  gearName: string;
  quantityOwned: number;
  planned: number;
  packed: number;
  out: number;
  returned: number;
  requestedBy: string[];
  shortage: number;
  overlapWarning: boolean;
};

export type PackLineWarning = {
  itemId: string;
  level: "warning" | "info";
  message: string;
};

export function allocationSummary(gear: GearItem[], pack: PackItem[], jobs: Pick<Job, "id" | "title" | "start_date" | "start_at" | "date_precision">[] = []) {
  const gearById = new Map(gear.map((item) => [item.id, item]));
  const jobById = new Map(jobs.map((job) => [job.id, job]));
  const allocations = new Map<string, PackAllocation>();

  for (const line of pack.filter((item) => item.gear_item_id)) {
    const item = gearById.get(line.gear_item_id as string);
    if (!item) continue;
    const current = allocations.get(item.id) ?? {
      gearItemId: item.id,
      gearName: item.name,
      quantityOwned: item.quantity_owned,
      planned: 0,
      packed: 0,
      out: 0,
      returned: 0,
      requestedBy: [],
      shortage: 0,
      overlapWarning: false
    };
    current.planned += line.quantity_planned;
    current.packed += line.quantity_packed;
    current.out += line.quantity_out;
    current.returned += line.quantity_returned;
    const job = jobById.get(line.job_id);
    if (job && !current.requestedBy.includes(job.title)) current.requestedBy.push(job.title);
    allocations.set(item.id, current);
  }

  return Array.from(allocations.values()).map((allocation) => ({
    ...allocation,
    shortage: Math.max(0, allocation.planned - allocation.quantityOwned),
    overlapWarning: allocation.planned > allocation.quantityOwned && allocation.requestedBy.length > 1
  }));
}

export function warningForPackLine(line: PackItem, gear: GearItem[], allPack: PackItem[], jobs: Pick<Job, "id" | "title" | "start_date" | "start_at" | "date_precision">[] = []): PackLineWarning[] {
  const warnings: PackLineWarning[] = [];
  if (line.quantity_packed > line.quantity_planned) warnings.push({ itemId: line.id, level: "warning", message: "Packed quantity is higher than planned." });
  if (line.quantity_out > line.quantity_packed) warnings.push({ itemId: line.id, level: "warning", message: "Out quantity is higher than packed." });
  if (line.quantity_returned > line.quantity_out) warnings.push({ itemId: line.id, level: "warning", message: "Returned quantity is higher than out." });
  if (!line.gear_item_id) {
    if (line.line_type === "catalogue") warnings.push({ itemId: line.id, level: "info", message: "Match this line to a catalogue item or mark it as hire, consumable, purchase or custom." });
    return warnings;
  }
  const allocation = allocationSummary(gear, allPack, jobs).find((item) => item.gearItemId === line.gear_item_id);
  if (!allocation) return warnings;
  if (allocation.shortage > 0) warnings.push({ itemId: line.id, level: "warning", message: `${allocation.gearName} is short by ${allocation.shortage} against owned stock.` });
  if (allocation.overlapWarning) warnings.push({ itemId: line.id, level: "warning", message: `${allocation.gearName} is provisionally over-allocated across overlapping work.` });
  return warnings;
}

export function expandKitLines(kitName: string, components: { gear: GearItem; quantity: number }[], multiplier = 1) {
  return components.map(({ gear, quantity }) => ({
    item_name: gear.name,
    gear_item_id: gear.id,
    quantity_planned: quantity * multiplier,
    line_type: "catalogue" as const,
    notes: `${kitName} kit component`
  }));
}
