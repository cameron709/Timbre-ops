/** One minute of event time per real second. Clamp rather than restart at EOF. */
export const eveningReplay = {
  from: Date.parse("2026-10-24T19:50:00+08:00"),
  to: Date.parse("2026-10-24T22:30:00+08:00"),
  rate: 60,
};
export function replayTime(elapsedMs: number) {
  return Math.min(eveningReplay.to, eveningReplay.from + Math.max(0, elapsedMs) * eveningReplay.rate);
}
