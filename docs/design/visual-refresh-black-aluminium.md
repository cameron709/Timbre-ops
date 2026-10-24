# Timbre Ops Visual Refresh Brief

## Goal

Refactor the existing Timbre Ops interface away from generic AI/SaaS styling and toward a premium, designer-led product language that feels native on phone and iPad.

The chosen visual direction is:

- 70% **Black Aluminium**
- 20% **Technical Atelier**
- 10% **Midnight Glass**

The result should feel like a refined Apple Pro-style operational tool for a live production company, not a generic dashboard template.

Do **not** redesign the product architecture or remove working functionality. Preserve the current data model, navigation concepts, Supabase behaviour, Gmail workflows, and existing features unless a visual/layout change requires a small structural refactor.

---

## Core Product Principles

1. **Mobile first.**
   The phone version is the primary product, not a cut-down desktop view.

2. **iPad is a first-class workspace.**
   iPad portrait may behave like a spacious mobile layout. iPad landscape should progressively reveal a persistent sidebar, denser layouts, split views, and inspector-style detail areas.

3. **Restraint over decoration.**
   Avoid gradients, glows, excessive glass, excessive shadows, and generic “AI dashboard” treatment.

4. **Content hierarchy over containers.**
   Use spacing, typography, alignment, tone, and selective dividers before adding cards.

5. **Orange is a signal, not wallpaper.**
   Timbre orange should indicate selected state, primary actions, or meaningful attention. It should not appear everywhere.

6. **Semantic status colours only.**
   Green = healthy/complete.
   Amber = waiting/attention.
   Red = blocker/urgent/error.
   Neutral blue/grey may be used for planning/information.

7. **Operational density must remain readable.**
   Timbre Ops is a working production tool. It needs to be calm, fast, and legible under pressure, not sparse for the sake of aesthetics.

---

## Current Problems To Correct

The existing interface relies heavily on:

- near-black page + slightly lighter cards
- 6px radius almost everywhere
- thin borders around nearly every object
- repeated card/list/card/list compositions
- orange used as the default interaction colour across too many surfaces
- pills for many statuses that could be simpler dot + text states
- lots of small Lucide icons
- visual hierarchy created by containers rather than composition

This creates a competent but generic SaaS appearance.

The refresh should remove the feeling that every section is a bordered rectangle.

---

## Design Tokens

Implement semantic CSS variables rather than scattered hard-coded colours.

### Surfaces

```css
--bg: #0a0b0d;
--surface-1: #101216;
--surface-2: #15181d;
--surface-3: #1b1f25;
--surface-hover: #20242b;
--overlay: rgba(20, 22, 27, 0.82);
```

Do not treat these exact values as sacred if contrast testing suggests small changes, but stay in this graphite family.

### Text

```css
--text-primary: #f4f3ef;
--text-secondary: #a6abb3;
--text-tertiary: #737a85;
--text-disabled: #555c66;
```

### Brand / status

```css
--accent: #f28c28;
--accent-strong: #ff9638;

--success: #63c987;
--warning: #efb956;
--danger: #eb6b63;
--info: #6da9e8;
```

### Lines

```css
--line-subtle: rgba(255,255,255,.07);
--line-strong: rgba(255,255,255,.13);
```

### Radius

Use a deliberate hierarchy:

- controls: 8px
- rows / compact panels: 10px
- major panels: 14px
- sheets / modal surfaces: 20px
- capsules only where semantically appropriate

Do not use one radius globally.

### Spacing

Base on a 4px / 8px system.

Primary rhythm:

- 4
- 8
- 12
- 16
- 24
- 32
- 40
- 48

Prefer larger compositional gaps over borders.

---

## Typography

Use the system stack for performance and native feel:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Do not introduce a serif into the core app.

Typography should feel calm and confident:

- page title: 30–36px phone where appropriate, larger on iPad
- section heading: 17–20px
- row title: 15–17px
- body: 14–16px
- metadata: 12–13px

Use fewer font weights overall.

Use `font-variant-numeric: tabular-nums` for:

- dates/times
- readiness
- counts
- prices
- inventory quantities

Avoid gratuitous uppercase. Eyebrows may remain uppercase when genuinely useful, but reduce their use.

---

## Cards and Surfaces

A card must represent a meaningful object, decision, grouped control surface, or inspector.

Do not automatically wrap sections in cards.

Prefer:

- section title
- whitespace
- aligned rows
- subtle separators

Use elevated/contained panels for:

- unresolved attention items
- readiness summary
- forms
- inspector/detail panes
- warnings
- quick actions
- assistant overlays

Avoid large drop shadows. Use tonal surface separation and very subtle shadow only for overlays/sheets.

---

## Status Language

Reduce pill usage.

Preferred default:

```
● Confirmed
● Waiting
● Attention
```

Use a pill when:

- status itself is interactive
- it functions as a filter
- it is a compact badge attached to a dense row
- it materially improves scanning

Readiness should not always be a progress bar. Depending on context, use:

- percentage + thin bar
- compact ring
- checklist summary

Avoid putting rings on every row.

---

## Icons

Keep Lucide.

Use fewer icons.

Do not add icons simply to decorate section labels.

Icons should serve:

- navigation
- primary actions
- object type
- state
- compact utility controls

Target 18–20px for most controls.

---

## Navigation

### Phone

Use bottom navigation:

- Home
- Jobs
- Clients
- Gear
- More

The current conceptual navigation can remain.

The bottom bar should feel integrated with the app shell:

- dark graphite
- mild translucency may be used
- subtle backdrop blur
- no giant floating island
- active tab uses orange
- inactive tabs are neutral grey

Top chrome should be minimal.

### iPad portrait

May retain bottom navigation for compact widths, or switch to a sidebar once the layout has enough room.

### iPad landscape / desktop

Use a persistent left sidebar.

Sidebar should:

- be narrow and calm
- use selected-row tonal fill plus small orange signal
- avoid oversized icons
- support future sections cleanly
- keep the content workspace visually dominant

Avoid permanently displaying settings/sign-out actions in prominent top chrome if they can live in account/profile UI.

---

## Responsive Breakpoints

Do not think in terms of “desktop shrunk down”.

Build progressive layouts around these rough bands:

### Phone
`< 600px`

- single-column
- full-width rows
- stacked detail sections
- bottom tabs
- thumb-friendly actions
- avoid tables

### Large phone / small tablet
`600px–899px`

- still primarily stacked
- allow two-column summaries where useful
- maintain touch-first interaction

### iPad portrait / compact landscape
`900px–1099px`

- introduce sidebar if it improves space
- allow 2-column content layouts
- keep large readable touch targets

### iPad landscape / desktop
`>= 1100px`

- persistent sidebar
- multi-column operational layouts
- optional inspector/split panes
- dense tables allowed where appropriate

All layouts must remain usable at 320px.

---

## Page 1: Home / Briefing

Refactor `app/page.tsx`.

Phone structure:

1. greeting / date
2. concise “what needs attention” summary
3. Needs You
4. Coming Up
5. Operations
6. Pipeline Snapshot
7. What Changed
8. activity/history collapsed or lower priority

Do not create six unrelated cards.

Needs You should receive the strongest attention hierarchy.

Coming Up should use compact event rows with:

- date
- title
- venue
- next operational milestone
- small state indicator

Operations should show the most useful current operational metrics without becoming a tile-dashboard.

Pipeline should be visually lighter than live operations.

Assistant access should be present but not dominate the page. Prefer search/command treatment or a compact “Ask Timbre” entry point.

On iPad landscape, Home can become a 2-column briefing workspace with balanced sections.

---

## Page 2: Jobs

Refactor `app/jobs/page.tsx`.

### Phone

Use large, high-quality job rows.

Each row should prioritise:

1. date
2. job title
3. client / venue
4. state
5. readiness
6. next task / blocker

Avoid cramming every field.

Filters should be horizontally scrollable or presented in a filter sheet.

Search must remain prominent.

Do not make each job look like a generic SaaS card. Rows can sit on one continuous surface separated by fine rules.

### iPad

Use a denser list/table hybrid.

Columns may include:

- Job / client
- Date
- Venue
- Stage
- Value
- Readiness

Use tabular alignment.

A selected job may eventually open in a split detail pane, but do not implement that unless it can be done cleanly without destabilising existing routing.

---

## Page 3: Job Workspace

Refactor the existing job detail pages/components.

Phone:

- strong job title/header
- date + venue + client
- compact readiness summary
- horizontal tab navigation
- stacked sections
- event details
- operational readiness
- key contacts
- schedule
- packing
- files
- changes
- debrief

Use cards only for meaningful grouped information.

iPad landscape:

- sidebar retained
- job summary across top
- main workspace can use 2 or 3 columns
- schedule, event details, contacts, packing, files, and recent changes should be laid out as operational panels
- avoid huge empty areas

Technical metadata should use tabular alignment where helpful.

---

## Page 4: Tasks / Operations

Refactor `app/tasks/page.tsx` and align `/ops` visually.

Phone:

Group work by useful time/state buckets:

- Today
- This Week
- Waiting

Rows should show:

- completion control
- task
- related job/client
- priority/state
- due time/date
- owner

Do not use coloured pills for everything.

High priority may use a small red marker.
Waiting may use amber.
Normal tasks should remain mostly neutral.

The “new task” experience should become a sheet/modal or clearly separated creation surface rather than permanently feeling like a form embedded in a dashboard.

On iPad, use a task list plus optional right inspector when feasible.

---

## Page 5: Gear / Inventory

Refactor `app/gear/page.tsx`.

This page should carry the strongest **Technical Atelier** influence.

Phone:

- search
- catalogue/package/allocation tabs
- category filters
- clean asset/product rows
- quantity owned / available / allocated
- warnings
- recent demand

Avoid forcing desktop inventory tables onto phone.

Use simple rows and focused drill-down.

Images are optional and should only be used if real inventory imagery exists. Do not add placeholder stock imagery.

iPad landscape:

- catalogue grid or dense list
- optional right-side allocation warning / package summary panel
- serialised asset views can use table-like alignment
- quantities should use tabular numerals
- shortages should be unmistakable but not visually noisy

---

## Forms

Inputs should feel native and professional.

- 44px minimum touch height
- 8px radius
- dark solid surface
- subtle border
- stronger border/focus ring on interaction
- labels above fields
- avoid oversized padded form cards

Primary button:

- orange
- dark text if contrast passes
- clear but not enormous

Secondary:

- neutral surface or subtle border

Destructive:

- red only when truly destructive

---

## Motion

Keep motion understated.

- 160–220ms standard transitions
- subtle opacity / translate for sheets and overlays
- no decorative bouncing
- no glowing animations
- respect `prefers-reduced-motion`

---

## Accessibility

Maintain or improve:

- WCAG contrast
- 44px touch targets
- keyboard focus states
- semantic landmarks
- reduced motion
- readable text at phone sizes
- no information conveyed by colour alone

---

## Glass

Use the Midnight Glass influence sparingly.

Allowed:

- bottom navigation
- modal sheets
- popovers
- quick action overlays
- command/search overlay

Not allowed:

- every card
- every table
- every section
- glowing blurred gradient backgrounds

Glass is seasoning, not soup.

---

## Implementation Approach

### Phase 1: Foundation

1. Refactor `app/globals.css` into semantic tokens and reusable visual primitives.
2. Update `components/app-shell.tsx`.
3. Update shared `components/ui.tsx`.
4. Keep current functionality intact.
5. Remove unnecessary borders/cards/pills where shared primitives currently force them.

### Phase 2: Five Core Screens

Refactor in this order:

1. Home
2. Jobs
3. Job workspace
4. Tasks / Ops
5. Gear

### Phase 3: Supporting screens

Bring clients, calendar, settings, Gmail review, file review, authentication and other secondary screens into the same system.

---

## Important Constraints

- Do not change Supabase schema for this visual refresh.
- Do not remove existing functionality.
- Do not fake integrations.
- Do not introduce a UI framework just for styling.
- Do not add Tailwind solely for this redesign.
- Stay with the current Next.js / React / CSS structure unless a small component extraction clearly improves maintainability.
- Avoid giant monolithic CSS additions. Use semantic classes and variables.
- Preserve print/job-pack behaviour.
- Preserve the existing review-fixture functionality.
- Ensure mobile safe-area handling remains correct.

---

## Validation

Before considering the refresh complete:

- run `npm run typecheck`
- run `npm run lint`
- run `npm test`
- run `npm run build`

Visually inspect at minimum:

- 390 × 844 phone
- 430 × 932 large phone
- 768 × 1024 tablet portrait
- 1024 × 1366 iPad Pro portrait
- 1366 × 1024 iPad Pro landscape
- 1440px desktop

Test:

- long job names
- empty states
- warnings
- forms
- long client names
- large inventory counts
- no upcoming jobs
- no unresolved attention
- high-density task lists

---

## Definition of Done

The refresh is done when:

- Timbre Ops no longer looks like a generic dark SaaS template.
- phone feels deliberately designed rather than compressed.
- iPad landscape feels like a genuine operational workspace.
- orange is restrained and meaningful.
- cards are no longer the default structural device.
- typography and spacing carry the hierarchy.
- live-production data remains quick to scan.
- all existing features still function.
- all checks pass.

The desired impression is:

> “This looks like a polished professional tool built specifically for a live production company.”

Not:

> “This looks like a nice dashboard template.”
