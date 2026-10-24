import { describe, expect, it } from "vitest";
import { groupTasks } from "@/lib/task-groups";
import type { CrmTask } from "@/types/database";

function task(id: string, due_date: string | null, status: CrmTask["status"] = "To Do"): CrmTask {
  return { id, title: id, due_date, status, priority: "Normal", description: null, client_id: null, contact_id: null, job_id: null, source_activity_id: null, created_at: "", updated_at: "", completed_at: null, archived_at: null };
}
const ids = (tasks: CrmTask[], at: string) => groupTasks(tasks, new Date(at)).map(group => [group.title, group.items.map(item => item.id)]);

describe("task briefing buckets", () => {
  it("keeps overdue work visible, includes Sunday this week and starts next week on Monday", () => {
    expect(ids([task("overdue", "2026-10-22"), task("today", "2026-10-24"), task("sunday", "2026-10-25"), task("monday", "2026-10-26"), task("undated", null)], "2026-10-24T04:00:00Z")).toEqual([
      ["Today", ["overdue", "today"]], ["This Week", ["sunday"]], ["Waiting", []], ["Later & undated", ["monday", "undated"]], ["Completed", []]
    ]);
  });
  it("uses the Perth business day across UTC midnight boundaries", () => {
    expect(ids([task("perth-today", "2026-10-25")], "2026-10-24T17:00:00Z")[0]).toEqual(["Today", ["perth-today"]]);
  });
  it("puts waiting and completed work in exactly one bucket regardless of due date", () => {
    const result = groupTasks([task("wait", "2026-10-23", "Waiting"), task("done", null, "Done")], new Date("2026-10-24T04:00:00Z"));
    expect(result.find(group => group.title === "Waiting")?.items.map(item => item.id)).toEqual(["wait"]);
    expect(result.find(group => group.title === "Completed")?.items.map(item => item.id)).toEqual(["done"]);
    expect(result.flatMap(group => group.items).map(item => item.id)).toEqual(["wait", "done"]);
  });
});
