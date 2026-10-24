import { expect, it } from "vitest";
import { eveningReplay, replayTime } from "./on-the-day-replay";
import { onTheDayReview } from "./on-the-day-review";
import { deriveOnTheDay } from "./on-the-day";

it("advances one event minute per second and clamps at evening end", () => {
  expect(replayTime(0)).toBe(eveningReplay.from);
  expect(replayTime(1000)).toBe(eveningReplay.from + 60000);
  expect(replayTime(-1000)).toBe(eveningReplay.from);
  expect(replayTime(1_000_000)).toBe(eveningReplay.to);
});
it("drives the same engine through every expected phase without timer actions", () => {
  const { schedule } = onTheDayReview("evening");
  const states = [0, 10000, 60000, 90000, 160000].map(elapsed => deriveOnTheDay(schedule, replayTime(elapsed)));
  expect(states.map(state => state.currentItem?.id ?? (state.expectedFinished ? "after" : "pre"))).toEqual(["pre", "act", "change", "mc", "after"]);
  expect(states.at(-1)?.scheduleDriftMinutes).toBe(20);
  expect(states.at(-1)?.hardDeadline?.marginMinutes).toBe(-13);
});
