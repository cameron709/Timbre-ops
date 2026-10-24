# On The Day Phase 1 implementation

Entry: Job workspace → On The Day, `/jobs/[id]/on-the-day`.

Local review: set `NEXT_PUBLIC_ENABLE_REVIEW_FIXTURES=1`, run `npm run dev -- --webpack --port 3010`, open `/review/on-the-day`. Scenarios: `pre`, `active`, `overrun`, `next-start`, `accumulated`, `curfew`, `curfew-delay`, `sparse`, `invalid`, `overnight`, `evening` via `?scenario=`. Review times are fixed and displayed in Australia/Perth on both server and client to avoid hydration mismatches. Normal job views use the live device clock, resynchronise on focus/visibility and refresh the job every minute. No writes are made.

## Existing data limitations

There is no structured run-sheet table, actual-start/finish record, event timezone or dedicated curfew field. Existing job timestamps provide arrival, load-in, setup, soundcheck, show and pack-down milestones. Date-only events never become timed shows. Setup and logistics have no stored end time, so elapsed time is shown until the next start; an end is never invented. Bump-out/site-clear is treated as a pack-down milestone, not a hard deadline or known duration.

Programme notes remain unchanged. Optional explicit lines can be read deterministically:

```
2026-10-24T20:00+08:00 / 2026-10-24T20:30+08:00 | Rogue Pony
2026-10-24T20:40+08:00 / 2026-10-24T20:50+08:00 | Changeover
2026-10-24T21:00+08:00 / 2026-10-24T21:53+08:00 | MC
2026-10-24T22:00+08:00 | Hard curfew
```

Only explicitly dated ISO times with offsets or `Z` are accepted. A single start is also supported. Prose and ambiguous clock-only text remain available in Production but are excluded with a warning. Detailed programme entries replace the broad job Show envelope. No AI extraction, parsing of attachments, weather or external services are added. Programme phases are labelled Programme rather than guessed from titles. Multiple curfews suppress deadline arithmetic pending review.

## Inference policy

The display separates expected phase progression from carried inferred delay. It never records a forecast as actual progress, and a scheduled start never clears delay.

The pure engine replays a bounded forecast from the beginning. After each explicit finish, it infers overrun during the finish-to-next-start gap, capped at that original gap's duration. The delay is carried forward, and the next item becomes expected only at its shifted start. Its known duration is retained. Later gaps can add delay but cannot recover earlier delay. Contiguous items have no gap to infer additional overrun. Start-only items add no invented duration or delay. This is a deterministic modelling assumption, not evidence that an act actually ran late or a changeover actually began.

Example for the review evening:

| Review time | Expected state | Carried delay | Projected finish |
| --- | --- | --- | --- |
| 20:39 | Rogue Pony / expected transition | 9 min | 22:02 |
| 20:40 | Rogue Pony / expected transition | 10 min | 22:03 |
| 20:50 | Changeover | 10 min | 22:03 |
| 21:14 | Changeover / expected transition | 20 min | 22:13 |
| 21:20 | MC | 20 min | 22:13 |
| 22:30 | Programme expected to have finished | 20 min | 22:13 |

This avoids retaining the first act indefinitely and avoids announcing recovery just because a scheduled boundary passed. Expected elapsed/remaining time uses shifted starts and ends. After the final projected end, the UI says the programme is expected to have finished; it never claims verified completion. Known delay remains. There is still no actual-progress source, so these projections can differ from reality, especially where schedule gaps are intentional breaks. Updated source timing recomputes the forecast. Reloading, resuming and opening late all reconstruct the same result without requiring input or saving timer history.

The UI uses contextual Expected / Projected wording. A real curfew with ten minutes or less projected margin is placed inside the primary current-state zone, ahead of timing detail and Next, with no duplicate constraint panel. Other known deadlines remain secondary. No permanent uncertainty disclaimer is shown.

`?scenario=evening` is a review-only automatic 60× replay of 19:50–22:30 AWST. It needs no Start/Stop controls, catches up after tab suspension and clamps at its final snapshot. Fixed scenarios remain available. The replay uses the production context engine; acceleration exists only in the fixture wrapper.

Projected finish means the latest known item end, not departure/site-clear. Curfew arithmetic is shown only for an explicit Hard curfew line. Overlapping timed items, duplicate starts and invalid ranges suppress live schedule conclusions. Absolute timestamps support overnight and multi-day schedules; the device timezone determines display. No timezone is inferred from venue text.

The screen needs no timer buttons or confirmations. Browser suspension/device sleep can pause rendering; the clock catches up on resume. It does not prevent iPad auto-lock. Live authenticated access must still be tested with the user's session; review fixtures verify presentation without exposing job data.
