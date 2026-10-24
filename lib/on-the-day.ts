import type { Job } from "@/types/database";

export type RunItem = { id: string; title: string; phase: string; start: number; end?: number };
export type DaySchedule = { items: RunItem[]; deadline?: { label: string; at: number }; warnings: string[] };
const minute = 60_000;
const timestamp = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : undefined;

/** Existing job timestamps are authoritative. Programme lines use explicit ISO dates,
 * 24-hour times and offsets, never ambiguous prose or inferred midnight rollover. */
export function scheduleFromJob(job: Job): DaySchedule {
  const warnings: string[] = [];
  const items: RunItem[] = [];
  const fields = [["arrival_at", "Arrival"], ["bump_in_at", "Load-in"], ["setup_at", "Setup"], ["soundcheck_at", "Soundcheck"], ["start_at", "Show"], ["bump_out_at", "Pack-down"]] as const;
  for (const [key, phase] of fields) {
    if (key === "start_at" && job.date_precision !== "timed") continue;
    const start = timestamp(job[key]);
    if (job[key] && start === undefined) warnings.push(`Invalid ${phase.toLowerCase()} time.`);
    if (start !== undefined) items.push({ id: key, title: phase === "Show" ? job.title : phase, phase, start, ...(key === "start_at" && job.end_at ? { end: timestamp(job.end_at) } : {}) });
  }
  let deadline: DaySchedule["deadline"];
  let conflictingDeadline = false;
  for (const [index, line] of (job.programme_notes ?? "").split(/\n/).entries()) {
    if (!line.trim()) continue;
    // Example: 2026-10-24T20:00+08:00 / 2026-10-24T20:30+08:00 | Rogue Pony
    const match = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2}))(?:\s*\/\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})))?\s*\|\s*(.+)$/);
    if (!match) { warnings.push("Some programme notes have no unambiguous dated timing and are excluded from live reasoning."); continue; }
    const start = timestamp(match[1]), end = timestamp(match[2] ?? null), title = match[3].trim();
    if (start === undefined || (match[2] && end === undefined)) { warnings.push("Invalid programme time excluded."); continue; }
    if (/^hard curfew$/i.test(title) && !match[2]) {
      if (deadline) { warnings.push("Multiple hard curfews need review."); conflictingDeadline = true; }
      else deadline = { label: "Hard curfew", at: start };
    } else items.push({ id: `programme-${index}`, title, phase: "Programme", start, end });
  }
  if (job.end_at && job.date_precision === "timed" && timestamp(job.end_at) === undefined) warnings.push("Invalid show finish time; no finish has been inferred.");
  // A detailed programme replaces the broad show envelope, avoiding two current
  // items at the same start while retaining arrival/setup/logistics milestones.
  const hasProgramme = items.some(item => item.id.startsWith("programme-"));
  return { items: hasProgramme ? items.filter(item => item.id !== "start_at") : items, deadline: conflictingDeadline ? undefined : deadline, warnings: [...new Set(warnings)] };
}

export function deriveOnTheDay(schedule: DaySchedule, now: number) {
  const warnings = [...schedule.warnings];
  const ordered = [...schedule.items].sort((a, b) => a.start - b.start);
  const invalid = ordered.some((item, i) => !Number.isFinite(item.start) || (item.end !== undefined && (!Number.isFinite(item.end) || item.end <= item.start)) || (i > 0 && item.start === ordered[i - 1].start));
  // Programme ranges may sit inside the overall Show range. Other overlaps are ambiguous.
  const overlap = ordered.some((item, i) => ordered.slice(i + 1).some(next => item.end !== undefined && next.start < item.end && item.id !== "start_at"));
  if (invalid || overlap) warnings.push("Contradictory schedule timing. Review the run sheet before relying on live state.");
  const items = invalid || overlap ? [] : ordered;
  const currentItem = items.filter(item => item.start <= now).at(-1);
  const drift = currentItem?.end !== undefined ? Math.max(0, now - currentItem.end) : 0;
  const nextMilestones = items.filter(item => item.start > now).slice(0, 2).map(item => ({ ...item, projectedStart: item.start + drift }));
  const finishes = items.flatMap(item => item.end === undefined ? [] : [item.end]);
  const projectedFinish = finishes.length ? Math.max(...finishes) + drift : undefined;
  return {
    currentItem, nextMilestones, warnings: [...new Set(warnings)],
    currentPhase: currentItem?.phase,
    elapsedMinutes: currentItem ? Math.floor((now - currentItem.start) / minute) : undefined,
    remainingMinutes: currentItem?.end !== undefined && now < currentItem.end ? Math.ceil((currentItem.end - now) / minute) : undefined,
    countdownMinutes: !currentItem && nextMilestones[0] ? Math.ceil((nextMilestones[0].start - now) / minute) : undefined,
    overrun: currentItem?.end !== undefined && now >= currentItem.end,
    scheduleDriftMinutes: Math.ceil(drift / minute), projectedFinish,
    hardDeadline: schedule.deadline && Number.isFinite(schedule.deadline.at) ? { ...schedule.deadline, marginMinutes: projectedFinish === undefined ? undefined : Math.floor((schedule.deadline.at - projectedFinish) / minute) } : undefined,
    hasSchedule: ordered.length > 0,
  };
}
