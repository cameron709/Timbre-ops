import { describe, expect, it } from "vitest";
import { allocationSummary, expandKitLines, warningForPackLine } from "@/lib/gear";
import type { GearItem, Job, PackItem } from "@/types/database";

const now = "2026-09-29T00:00:00Z";
const di = { id: "di", name: "DI Box", category: "audio", quantity_owned: 4, description: null, notes: null, photo_url: null, created_at: now, updated_at: now } satisfies GearItem;
const jobA = { id: "mad", title: "Mad Hatters Tea Party", start_date: "2026-10-02", start_at: null, date_precision: "date" } as Job;
const jobB = { id: "noongar", title: "Noongar Festival", start_date: "2026-10-02", start_at: null, date_precision: "date" } as Job;
const line = (patch: Partial<PackItem>): PackItem => ({
  id: patch.id ?? "line",
  job_id: patch.job_id ?? "mad",
  item_name: patch.item_name ?? "DI Box",
  quantity_planned: patch.quantity_planned ?? 0,
  quantity_packed: patch.quantity_packed ?? 0,
  quantity_out: patch.quantity_out ?? 0,
  quantity_returned: patch.quantity_returned ?? 0,
  state: patch.state ?? "planned",
  notes: patch.notes ?? null,
  created_at: now,
  updated_at: now,
  source_ref: patch.source_ref ?? null,
  gear_item_id: patch.gear_item_id ?? null,
  line_type: patch.line_type ?? "catalogue",
  source_context: patch.source_context ?? null
});

describe("gear allocation", () => {
  it("shows a shortage when Mad Hatters plans six DI boxes and four are owned", () => {
    const pack = [line({ id: "mad-di", gear_item_id: "di", quantity_planned: 6 })];
    expect(allocationSummary([di], pack, [jobA])[0]).toMatchObject({ planned: 6, quantityOwned: 4, shortage: 2, requestedBy: ["Mad Hatters Tea Party"] });
    expect(warningForPackLine(pack[0], [di], pack, [jobA]).map((item) => item.message)).toContain("DI Box is short by 2 against owned stock.");
  });

  it("flags provisional over-allocation across simultaneous jobs", () => {
    const pack = [line({ id: "a", job_id: "mad", gear_item_id: "di", quantity_planned: 3 }), line({ id: "b", job_id: "noongar", gear_item_id: "di", quantity_planned: 3 })];
    expect(allocationSummary([di], pack, [jobA, jobB])[0]).toMatchObject({ planned: 6, shortage: 2, overlapWarning: true });
  });

  it("does not warn on a complete return", () => {
    const pack = [line({ id: "returned", gear_item_id: "di", quantity_planned: 2, quantity_packed: 2, quantity_out: 2, quantity_returned: 2 })];
    expect(warningForPackLine(pack[0], [di], pack, [jobA])).toEqual([]);
  });

  it("expands kit components into editable job pack lines", () => {
    expect(expandKitLines("Small PA", [{ gear: di, quantity: 2 }], 2)).toEqual([{ item_name: "DI Box", gear_item_id: "di", quantity_planned: 4, line_type: "catalogue", notes: "Small PA kit component" }]);
  });
});
