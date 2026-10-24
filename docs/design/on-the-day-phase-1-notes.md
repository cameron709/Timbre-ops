# On The Day Phase 1 implementation

Entry: Job workspace → On The Day, `/jobs/[id]/on-the-day`.

Local review: set `NEXT_PUBLIC_ENABLE_REVIEW_FIXTURES=1`, run `npm run dev -- --webpack --port 3010`, open `/review/on-the-day`. Scenarios: `pre`, `active`, `overrun`, `next-start`, `accumulated`, `curfew`, `curfew-delay`, `sparse`, `invalid`, `overnight` via `?scenario=`. Review times are fixed and displayed in Australia/Perth on both server and client to avoid hydration mismatches. Normal job views use the live device clock, resynchronise on focus/visibility and refresh the job every minute. No writes are made.

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

The earliest item whose explicit finish has passed becomes the unresolved overrun anchor. A later scheduled start is not evidence of actual progression or recovery. The anchor remains likely active, with delay equal to elapsed time since its scheduled finish. All downstream items, including those whose original start is now past, remain in the projected sequence; the same accumulated delay shifts each start and the final known finish. Delay is applied once, not repeatedly summed for each item.

For example, an act ending at 20:30 is 9 minutes over at 20:39, 10 minutes over at 20:40 and 44 minutes over at 21:14. Changeover at 20:40 projects to 20:50 at 20:40, then 21:24 at 21:14. MC at 21:00 projects to 21:44 at 21:14. No scheduled boundary silently clears the delay.

This deliberately conservative inference can retain an early item for the rest of the event if nothing supplies stronger evidence. Phase 1 cannot know whether an act really finished, a changeover started, or time was recovered. It does not invent those observations. Updated source timings recompute the context; merely polling the same job does not reset it. The pure engine reconstructs the same result when opened late, reloaded or resumed, with no timer history or required input. The UI uses contextual “Likely active”, “Likely running” and “Projected next” language, with no permanent disclaimer. Start-only milestones can still advance by schedule until an explicit finish becomes unresolved.

Projected finish means the latest known item end, not departure/site-clear. Curfew arithmetic is shown only for an explicit Hard curfew line. Overlapping timed items, duplicate starts and invalid ranges suppress live schedule conclusions. Absolute timestamps support overnight and multi-day schedules; the device timezone determines display. No timezone is inferred from venue text.

The screen needs no timer buttons or confirmations. Browser suspension/device sleep can pause rendering; the clock catches up on resume. It does not prevent iPad auto-lock. Live authenticated access must still be tested with the user's session; review fixtures verify presentation without exposing job data.
