# On The Day Phase 1 implementation

Entry: Job workspace → On The Day, `/jobs/[id]/on-the-day`.

Local review: set `NEXT_PUBLIC_ENABLE_REVIEW_FIXTURES=1`, run `npm run dev -- --webpack --port 3010`, open `/review/on-the-day`. Scenarios: `pre`, `active`, `overrun`, `curfew`, `curfew-delay`, `sparse` via `?scenario=`. Review times are fixed and displayed in the device timezone. Normal job views use the live device clock, resynchronise on focus/visibility and refresh the job every minute. No writes are made.

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

The latest scheduled start is the best available evidence of progression. At an explicit finish, that item remains likely active until the next explicit start. Delay shifts future projected starts and the last known programme finish equally. At the next scheduled start, speculative drift resets; this is not an actual-progress measurement or a persisted delay history. Without actual timings, neither continued performance nor early completion can be known. The UI labels this uncertainty.

Projected finish means the latest known item end, not departure/site-clear. Curfew arithmetic is shown only for an explicit Hard curfew line. Overlapping timed items, duplicate starts and invalid ranges suppress live schedule conclusions. Absolute timestamps support overnight and multi-day schedules; the device timezone determines display. No timezone is inferred from venue text.

The screen needs no timer buttons or confirmations. Browser suspension/device sleep can pause rendering; the clock catches up on resume. It does not prevent iPad auto-lock. Live authenticated access must still be tested with the user's session; review fixtures verify presentation without exposing job data.
