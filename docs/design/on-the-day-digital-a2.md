# On The Day / Digital A2

## Purpose

Create an **On The Day** mode inside each Timbre Ops job that behaves like an ambient digital A2 / show-caller assistant.

This is not another dashboard to maintain.

The core promise is:

> If Cameron looks at this screen for two seconds, he should know what is happening, what happens next, and whether anything needs his attention.

The screen must remain operationally useful if it is opened at the start of the event and then **never touched again**.

Manual interaction is optional correction, never required upkeep.

---

## Product principles

### 1. Zero-babysitting default

The page must continue to advance and remain useful without user input.

Do not require:

- routine status updates
- check-ins
- checkbox completion
- typing notes
- confirmation before the timeline advances
- manual timer operation

If reality may have diverged from the schedule, show uncertainty rather than blocking:

- `Likely running 8 min over`
- `Changeover probably underway`
- `Projected finish 22:11`

Optional one-tap correction may be added later, but the page must never depend on it.

### 2. No data, no component

If information does not exist, do not render a heading, empty panel, placeholder or `Not provided` message.

Examples:

- no curfew -> no curfew UI
- no noise limit -> no noise-limit UI
- no changeover -> no changeover block
- no useful site access information -> no access panel

The layout should close up naturally around the information that exists.

Exception: if missing information is itself operationally risky, surface a contextual warning only when relevant. Do not create permanent empty sections.

### 3. Attention is earned

Do not show information merely because Timbre Ops knows it.

Show information because knowing it **now**:

- changes a decision
- reduces uncertainty
- avoids a likely mistake
- removes something the operator would otherwise need to remember

At any moment, only one item should normally dominate the visual hierarchy. Two is acceptable if there is a genuine alert.

### 4. Content-driven, not template-driven

The layout should adapt to the job and the current phase of the day.

The same page may look materially different during:

- pre-arrival
- load-in
- setup
- soundcheck
- doors
- show
- changeover
- pack-down
- departure

### 5. Deterministic core intelligence

Do not use AI for simple schedule arithmetic.

The context engine should deterministically derive:

- current phase
- current run item
- next milestones
- schedule overrun
- projected finish
- hard deadline margin
- likely state when a scheduled item has passed

AI can be introduced later for extraction and synthesis from messy emails, riders and documents.

---

## Visual direction

Follow:

`docs/design/visual-refresh-black-aluminium.md`

The approved visual system is:

- 70% Black Aluminium
- 20% Technical Atelier
- 10% Midnight Glass

The On The Day page should feel more like a professional control surface / broadcast rundown display than a SaaS dashboard.

### Visual rules

- calm by default
- large, readable time
- tabular numerals for all timing
- strong whitespace and hierarchy
- avoid grids of equal cards
- avoid decorative icons
- use Timbre orange sparingly for active / selected / primary state
- semantic amber/red only when operationally justified
- preserve safe-area behaviour
- readable from roughly 1-2 metres on iPad
- phone layout must remain first-class, not a shrunk desktop screen

---

# Phase 1: Thin vertical slice

## Goal

Prove that a real Timbre job can open an On The Day page, be left untouched, and remain useful for at least an hour.

Phase 1 is intentionally narrow.

### Include

- job / event identity
- venue when available
- live local clock
- current phase
- current run-sheet item
- next two meaningful milestones
- elapsed / remaining time
- schedule overrun when the scheduled finish passes
- projected finish where derivable
- hard deadline / curfew only if present in existing data
- passive schedule-drift indication
- content-driven rendering
- responsive phone layout
- first-class iPad portrait and landscape layouts

### Do not include yet

- weather API
- satellite maps
- Gmail parsing
- AI extraction
- document conflict resolution
- changeover delta generation
- crew tracking
- incident reporting
- new database schema
- manual event logging
- required user confirmations
- new UI framework / Tailwind

---

## Phase 1 user experience

A representative live state might look conceptually like:

```
20:14
Rogue Pony · LIVE

Scheduled finish 20:30
16 min remaining

NEXT
20:30 Changeover
20:45 MC
```

If the scheduled finish passes and the user does nothing:

```
20:37
Rogue Pony
Likely running 7 min over

Projected next:
20:37 Changeover
20:52 MC
```

If a hard deadline exists:

```
HARD CURFEW 22:00
Projected finish 21:53
7 min margin
```

If no curfew exists, none of the above curfew UI should render.

---

# Context engine

Create a small pure / testable context layer so the page does not own operational reasoning.

Suggested conceptual output:

```ts
type OnTheDayContext = {
  now: Date
  currentPhase?: EventPhase
  currentItem?: RunItemContext
  nextMilestones: RunItemContext[]
  scheduleDriftMinutes?: number
  projectedFinish?: Date
  hardDeadline?: {
    label: string
    at: Date
    marginMinutes?: number
  }
  attentionItems: AttentionItem[]
}
```

Exact types should fit the existing codebase.

The important architectural requirement is:

> raw job/run-sheet data -> context engine -> rendered On The Day view

Do not bury schedule reasoning inside individual presentation components.

---

## Schedule reasoning

Phase 1 should support the following deterministic rules where the existing data allows it.

### Current item

Use current local time against ordered run-sheet items.

Prefer explicit start/end times when present.

If the current time is inside an item's time range, that item is current.

### Before first item

Show the next meaningful milestone and a countdown.

### After scheduled finish

Do not block waiting for confirmation.

Continue showing the item as likely active if there is no evidence that a later state has begun, with overrun:

`Likely running 6 min over`

### Next milestones

Show at most two by default.

Do not dump the full run sheet onto the primary screen.

### Drift

When a timed item passes its scheduled finish, calculate downstream projected timing where possible.

The model may initially use simple accumulated delay. It does not need advanced recovery optimisation in Phase 1.

### Hard deadlines

If an existing data source clearly identifies a hard operational deadline such as curfew, calculate margin against projected finish.

Never invent a deadline.

---

# Screen hierarchy

## Phone

Primary order:

1. live time
2. event / venue identity
3. NOW / current phase
4. dominant current item
5. next milestones
6. relevant deadline / drift state if present

Avoid requiring scrolling for the critical current-state information on a normal phone viewport.

## iPad portrait

Use the extra space for stronger hierarchy and more breathing room.

Do not simply scale phone cards wider.

## iPad landscape

Treat as a first-class operational display.

Preferred composition:

- left / primary zone: clock + NOW state + current item
- right / secondary zone: NEXT + relevant constraint / attention
- optional thin timeline treatment along an edge or lower region if it improves orientation

Do not create a desktop analytics dashboard grid.

---

# Empty / missing states

## Missing run sheet

The On The Day page should still render job identity and clock.

Provide a restrained message that live schedule intelligence is unavailable because no run sheet exists.

This is one of the rare acceptable missing-data messages because it explains why the primary feature cannot operate.

Do not generate empty subsections for every absent field.

## Partial timing

Use whatever is known.

Do not invent start/end times.

## Invalid / contradictory timing

Fail safely.

Do not confidently display false schedule state.

A small contextual warning is preferable to fabricated certainty.

---

# Interaction

Phase 1 should require no interaction after opening.

Allowed interactions:

- normal navigation
- tap a run item to inspect existing detail if a suitable route already exists

Do not add:

- Start
- Stop
- Complete
- Check in
- Confirm
- Still playing
- Finished

Those may become optional precision controls in a future phase, but they are specifically not required for the first build.

---

# Data / architecture constraints

- preserve current Supabase behaviour
- do not change database schema in Phase 1
- do not remove existing functionality
- reuse existing run-sheet / job data structures
- do not add Tailwind or another UI framework
- preserve print behaviour elsewhere
- preserve review fixtures
- preserve safe-area handling
- avoid adding external services for Phase 1
- keep the context engine easy to unit test

---

# Accessibility and operational legibility

- maintain strong contrast
- timing must use tabular numerals
- do not communicate urgency by colour alone
- minimum touch target should follow existing app conventions
- support reduced motion
- do not rely on animation for schedule state
- primary timing/state should be readable at a glance on an iPad placed at FOH

---

# Acceptance criteria: Phase 1

The implementation is acceptable when all of the following are true:

1. A user can open a real job and enter an On The Day view.
2. Current local time updates live.
3. Current run-sheet state changes as time passes without user input.
4. The next two meaningful milestones update automatically.
5. A passed scheduled finish becomes an overrun state without requiring confirmation.
6. Projected downstream timing updates where enough data exists.
7. A hard deadline is shown only when real hard-deadline data exists.
8. Missing optional information does not create empty headings/cards.
9. The critical screen remains useful if untouched for an hour.
10. The phone version works without horizontal overflow.
11. iPad portrait is deliberately composed.
12. iPad landscape is deliberately composed and suitable as a persistent FOH display.
13. Existing Supabase behaviour and job functionality continue to work.
14. No database migration is introduced.
15. No AI, weather or Gmail dependency is required for the core page.
16. Automated tests cover the context engine's key time-state transitions.

---

# Review scenarios

Provide deterministic review fixtures or test scenarios for at least:

### Scenario A: pre-event

- now before first timed run item
- countdown to first milestone
- no hard deadline

### Scenario B: active item

- now inside scheduled act
- remaining time visible
- next two milestones visible

### Scenario C: overrun

- scheduled finish has passed
- no manual confirmation supplied
- likely overrun shown
- downstream projected times shift

### Scenario D: hard curfew

- projected finish before curfew
- positive margin shown
- then simulated delay reduces margin

### Scenario E: sparse data

- no venue / curfew / optional metadata
- no empty placeholder panels rendered

---

# North-star roadmap after Phase 1

These are intentionally **not** part of the first implementation, but the architecture should not block them.

## Weather exposure intelligence

Weather should be shown based on operational exposure windows, not simply indoor/outdoor event type.

Examples:

- load-in
- outdoor audience period
- show finish
- bump-out
- departure

Future outputs:

- rain arrival relative to bump-out
- rain-clear time
- wind direction / gusts
- lightning / official warning context
- next relevant solar event
- sunset during daylight operations
- sunrise during overnight operations

The rule is:

> Is the crew likely to be exposed to weather during a meaningful operational window?

## Operational satellite map

Future map layers may include:

- stage
- FOH / ops
- load zone
- vehicle route
- parking
- power
- first aid / muster
- north
- sun direction
- wind vector
- approaching rain direction

Layers should appear contextually, not all at once.

## Changeover delta

Compare current and next technical state and summarise only the differences:

- inputs added / removed
- instruments added / removed
- DI changes
- monitor moves
- microphone changes
- RF requirements
- notable patch differences

## Source / version confidence

Future ingestion should track provenance and freshness.

Examples:

- updated rider supersedes older rider
- recent client email changed speech timing
- latest stage plot received today
- cached weather is stale

## Change detection

Prefer:

`Speeches moved 18:30 -> 18:50`

over showing the entire source email.

## Hard versus soft time

Future context logic should distinguish:

- hard curfew
- doors
- broadcast / booked windows
- venue lock-up
- noise restrictions

from softer schedule items.

## Recovery intelligence

Future passive output may include:

`12 min behind · 8 min recoverable before curfew`

Do not make automatic destructive schedule edits.

## Authority intelligence

When relevant, surface who has authority for:

- show stop
- weather hold
- doors delay
- evacuation
- curfew enforcement

Only when source data exists.

## Critical resource anticipation

Future logic may compare upcoming technical need with allocated inventory and surface mismatches before they become show problems.

## Automatic event memory

Build a passive event record from:

- planned schedule
- inferred actual timing
- schedule drift
- weather events
- consequential source changes
- rare manual corrections

The goal is a useful post-event record without requiring show-time data entry.

---

# Product test

The defining question for every future addition is:

> Does this remove thinking from the operator during the event, or does it create another thing they have to maintain?

If it creates upkeep without an immediate payoff, it does not belong on On The Day.
