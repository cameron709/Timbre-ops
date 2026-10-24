import { describe, expect, it } from "vitest";
import { deriveOnTheDay, scheduleFromJob, type DaySchedule } from "./on-the-day";
import type { Job } from "@/types/database";
const at = (time: string) => Date.parse(`2026-10-24T${time}:00+08:00`);
const schedule: DaySchedule = { warnings: [], items: [
  { id: "act", title: "Rogue Pony", phase: "Show", start: at("20:00"), end: at("20:30") },
  { id: "change", title: "Changeover", phase: "Changeover", start: at("20:40"), end: at("20:50") },
  { id: "mc", title: "MC", phase: "Show", start: at("21:00"), end: at("21:53") },
] };
describe("On The Day time transitions", () => {
  it("counts down before the first item without a fabricated deadline", () => {
    const context = deriveOnTheDay(schedule, at("19:50"));
    expect(context.currentItem).toBeUndefined(); expect(context.countdownMinutes).toBe(10);
    expect(context.hardDeadline).toBeUndefined(); expect(context.nextMilestones).toHaveLength(2);
  });
  it("shows the current item, remaining time and two milestones", () => {
    const context = deriveOnTheDay(schedule, at("20:14"));
    expect(context.currentItem?.id).toBe("act"); expect(context.remainingMinutes).toBe(16);
    expect(context.elapsedMinutes).toBe(14); expect(context.overrun).toBe(false);
  });
  it("passively overruns and projects downstream times", () => {
    const context = deriveOnTheDay(schedule, at("20:37"));
    expect(context.overrun).toBe(true); expect(context.scheduleDriftMinutes).toBe(7);
    expect(context.nextMilestones[0].projectedStart).toBe(at("20:47"));
    expect(context.projectedFinish).toBe(at("22:00"));
  });
  it("advances at the next explicit start without retaining speculative drift", () => {
    const context = deriveOnTheDay(schedule, at("20:40"));
    expect(context.currentItem?.id).toBe("change"); expect(context.scheduleDriftMinutes).toBe(0);
    expect(deriveOnTheDay(schedule, at("21:14")).currentItem?.id).toBe("mc");
  });
  it("reduces real deadline margin under delay", () => {
    const data = { ...schedule, deadline: { label: "Hard curfew", at: at("22:00") } };
    expect(deriveOnTheDay(data, at("20:14")).hardDeadline?.marginMinutes).toBe(7);
    expect(deriveOnTheDay(data, at("20:37")).hardDeadline?.marginMinutes).toBe(0);
  });
  it("handles sparse and start-only timing", () => {
    expect(deriveOnTheDay({ items: [], warnings: [] }, at("20:14")).hasSchedule).toBe(false);
    const context = deriveOnTheDay({ items: [{ ...schedule.items[0], end: undefined }], warnings: [] }, at("21:14"));
    expect(context.elapsedMinutes).toBe(74); expect(context.overrun).toBe(false); expect(context.projectedFinish).toBeUndefined();
  });
  it("fails safely on invalid ranges, overlaps and duplicate starts", () => {
    for (const items of [ [{ ...schedule.items[0], end: at("19:00") }], [...schedule.items, { ...schedule.items[0], id: "duplicate" }], [{ ...schedule.items[0], end: at("20:45") }, schedule.items[1]] ]) {
      const context = deriveOnTheDay({ items, warnings: [] }, at("20:14"));
      expect(context.currentItem).toBeUndefined(); expect(context.projectedFinish).toBeUndefined(); expect(context.warnings.length).toBeGreaterThan(0);
    }
  });
  it("supports midnight with explicit dates", () => {
    const start = Date.parse("2026-10-24T23:30:00+08:00"), end = Date.parse("2026-10-25T00:30:00+08:00");
    expect(deriveOnTheDay({ items: [{ id: "night", title: "Night", phase: "Show", start, end }], warnings: [] }, end - 60000).remainingMinutes).toBe(1);
  });
  it("does not mutate input and marks the exact finish boundary", () => {
    const before = JSON.stringify(schedule); expect(deriveOnTheDay(schedule, at("20:30")).overrun).toBe(true);
    expect(JSON.stringify(schedule)).toBe(before);
  });
});
describe("existing job adapter", () => {
  const job = { title: "Muster", date_precision: "date", start_at: "2026-10-24T00:00:00Z", programme_notes: null } as Job;
  it("does not invent timed shows from date-only jobs", () => expect(scheduleFromJob(job).items).toEqual([]));
  it("excludes prose and recognises only an explicit hard curfew", () => {
    const result = scheduleFromJob({ ...job, programme_notes: "curfew maybe ten\n2026-10-24T22:00+08:00 | Hard curfew\n2026-10-24T20:00+08:00 / 2026-10-24T20:30+08:00 | Rogue Pony" });
    expect(result.deadline?.at).toBe(at("22:00")); expect(result.items[0].title).toBe("Rogue Pony"); expect(result.warnings).toHaveLength(1);
  });
});
