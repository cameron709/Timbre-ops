import type { DaySchedule } from "./on-the-day";

const at = (time: string) => Date.parse(`2026-10-24T${time}:00+08:00`);
export const dayReviewScenarios = ["pre", "active", "overrun", "next-start", "accumulated", "curfew", "curfew-delay", "sparse", "invalid", "overnight"] as const;
export type DayReviewScenario = typeof dayReviewScenarios[number];

/** Fixed timestamps exercise the same pure engine as real jobs, without writes. */
export function onTheDayReview(scenario: DayReviewScenario) {
  const schedule: DaySchedule = { warnings: [], items: [
    { id: "act", title: "Rogue Pony", phase: "Show", start: at("20:00"), end: at("20:30") },
    { id: "change", title: "Changeover", phase: "Changeover", start: at("20:40"), end: at("20:50") },
    { id: "mc", title: "MC", phase: "Show", start: at("21:00"), end: at("21:53") }
  ] };
  const clocks: Record<DayReviewScenario, number> = {
    pre: at("19:50"), active: at("20:14"), overrun: at("20:39"),
    "next-start": at("20:40"), accumulated: at("21:14"), curfew: at("20:14"),
    "curfew-delay": at("21:14"), sparse: at("20:14"), invalid: at("20:14"),
    overnight: Date.parse("2026-10-25T00:50:00+08:00")
  };
  if (scenario.startsWith("curfew")) schedule.deadline = { label: "Hard curfew", at: at("22:00") };
  if (scenario === "sparse") schedule.items = [];
  if (scenario === "invalid") schedule.items[0].end = at("20:45");
  if (scenario === "overnight") schedule.items = [
    { id: "night", title: "Late set", phase: "Show", start: at("23:30"), end: Date.parse("2026-10-25T00:30:00+08:00") },
    { id: "pack", title: "Pack-down", phase: "Pack-down", start: Date.parse("2026-10-25T00:40:00+08:00") }
  ];
  return { schedule, now: clocks[scenario] };
}
