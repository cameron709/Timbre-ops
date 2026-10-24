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
  it.each([
    ["20:39", "act", 9, ["20:49", "21:09"]],
    ["20:40", "act", 10, ["20:50", "21:10"]],
    ["20:49", "act", 10, ["20:50", "21:10"]],
    ["20:50", "change", 10, ["21:10"]],
    ["21:00", "change", 10, ["21:10"]],
    ["21:14", "change", 20, ["21:20"]],
    ["21:20", "mc", 20, []],
  ] as const)("advances the expected item at %s without clearing carried delay", (clock, id, delay, upcoming) => {
    const context = deriveOnTheDay(schedule, at(clock));
    expect(context.currentItem?.id).toBe(id);
    expect(context.scheduleDriftMinutes).toBe(delay);
    expect(context.nextMilestones.map(item => item.projectedStart)).toEqual(upcoming.map(at));
    expect(context.projectedFinish).toBe(at("21:53") + delay * 60000);
  });
  it("uses shifted starts and durations for expected remaining and elapsed time", () => {
    const context = deriveOnTheDay(schedule, at("20:55"));
    expect(context.currentItem?.id).toBe("change");
    expect(context.currentProjectedStart).toBe(at("20:50"));
    expect(context.currentProjectedEnd).toBe(at("21:00"));
    expect(context.elapsedMinutes).toBe(5);
    expect(context.remainingMinutes).toBe(5);
    expect(context.scheduleDriftMinutes).toBe(10);
  });
  it("replays an unattended evening with monotonic delay and expected progression", () => {
    const phases = new Set<string>();
    let lastDrift = 0;
    for (let now = at("19:50"); now <= at("22:30"); now += 60000) {
      const context = deriveOnTheDay(schedule, now);
      expect(context.scheduleDriftMinutes).toBeGreaterThanOrEqual(lastDrift);
      expect(context.nextMilestones.length).toBeLessThanOrEqual(2);
      for (const item of context.nextMilestones) expect(item.projectedStart).toBeGreaterThan(now);
      lastDrift = context.scheduleDriftMinutes;
      phases.add(context.expectedFinished ? "after" : context.currentItem?.id ?? "pre");
    }
    expect([...phases]).toEqual(["pre", "act", "change", "mc", "after"]);
    expect(lastDrift).toBe(20);
    const end = deriveOnTheDay(schedule, at("22:30"));
    expect(end.expectedFinished).toBe(true);
    expect(end.currentItem).toBeUndefined();
    expect(end.projectedFinish).toBe(at("22:13"));
  });
  it("produces identical accumulated delay when opened late or left untouched", () => {
    const direct = deriveOnTheDay(schedule, at("21:14"));
    for (let now = at("19:50"); now <= at("21:14"); now += 60000) {
      const context = deriveOnTheDay(schedule, now);
      if (now === at("21:14")) expect(context).toEqual(direct);
    }
  });
  it("reduces real deadline margin under delay", () => {
    const data = { ...schedule, deadline: { label: "Hard curfew", at: at("22:00") } };
    expect(deriveOnTheDay(data, at("20:14")).hardDeadline?.marginMinutes).toBe(7);
    expect(deriveOnTheDay(data, at("20:37")).hardDeadline?.marginMinutes).toBe(0);
    expect(deriveOnTheDay(data, at("20:40")).hardDeadline?.marginMinutes).toBe(-3);
    expect(deriveOnTheDay(data, at("21:14")).hardDeadline?.marginMinutes).toBe(-13);
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
    const night = { items: [{ id: "night", title: "Night", phase: "Show", start, end }, { id: "pack", title: "Pack-down", phase: "Pack-down", start: end + 600000 }], warnings: [] };
    expect(deriveOnTheDay(night, end - 60000).remainingMinutes).toBe(1);
    const context = deriveOnTheDay(night, end + 1200000);
    expect(context.currentItem?.id).toBe("pack");
    expect(context.scheduleDriftMinutes).toBe(10);
    expect(context.elapsedMinutes).toBe(0);
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
