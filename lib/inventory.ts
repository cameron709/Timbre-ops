import type { GearItem, InventoryPackage, PackageItem, PackLineType } from "@/types/database";

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
