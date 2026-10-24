# Timbre Ops visual character pass

## Intent

The first Black Aluminium pass is structurally successful. It is cleaner, calmer, more professional and significantly less generic SaaS.

The next pass should **add controlled visual character without adding visual noise**.

Do not redesign the system. Refine it.

Target mix:

- 65% Black Aluminium
- 25% Technical Atelier
- 10% Midnight Glass

The result should feel more tactile, typographic, distinctive and production-specific while remaining restrained.

## Non-negotiables

- Preserve all current functionality.
- Preserve Supabase behaviour and database schema.
- Keep mobile first.
- Keep iPad first-class, especially landscape.
- Do not add a UI framework.
- Do not reintroduce card-heavy layouts.
- Do not make the app more colourful just to make it more interesting.
- Avoid glow-heavy, gradient-heavy, cyberpunk or gaming aesthetics.
- Maintain accessibility and 44px touch targets.
- Keep production and CRM surfaces calm enough for prolonged daily use.

## 1. Fix the iPad breakpoint behaviour

The current 900px breakpoint introduces both the sidebar and generic two-column detail layouts. This is too aggressive for iPad portrait.

Keep the persistent sidebar from approximately 900px if it still fits well, but **do not globally switch all detail layouts to two columns at 900px**.

Recommended:

- < 900px: bottom navigation, stacked content
- 900–1099px: sidebar may appear, but most detail content remains single-column unless a specific section clearly benefits from two columns
- >= 1100px: enable the wider two-column workspace layouts
- >= 1200px/1300px: allow denser inspector/workspace patterns where useful

A 1024px iPad portrait must not feel squeezed.

## 2. Use the native system font deliberately

Do not imply Inter unless it is actually bundled.

Use a native system stack intentionally:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Text",
  "SF Pro Display",
  "Segoe UI",
  system-ui,
  sans-serif;
```

Do not ship or bundle Apple font files.

The intention is native-feeling typography on iPhone/iPad with clean system fallbacks elsewhere.

## 3. Improve title wrapping

Remove global aggressive `overflow-wrap:anywhere` from normal headings and ordinary links.

Job names, client names and headings should wrap naturally at word boundaries.

Keep aggressive wrapping only where genuinely necessary:

- email addresses
- filenames
- URLs
- serial numbers
- long technical identifiers

Avoid ugly mid-word breaks.

## 4. Introduce a Timbre signal rail

Create one recurring visual signature: a thin orange signal rail.

Use it sparingly for:

- active sidebar item
- selected job
- urgent Needs You surface
- active inspector context
- possibly high-priority task group

Treatment:

- 2px or similar
- short, deliberate, hardware-indicator feel
- never a giant orange block
- orange must remain a signal, not decoration

This should become a recognisable Timbre visual motif.

## 5. More confident typography

Increase contrast between primary information and metadata.

Use large typographic moments for genuinely important information:

- briefing attention count
- upcoming event date
- job title
- readiness
- stock shortage
- major quantities

Do not simply increase all font sizes.

Aim for stronger scale contrast:

- large operational fact
- normal title
- small technical metadata

Use tabular numerals extensively for dates, times, quantities, percentages and money.

## 6. Add subtle material character

The graphite surfaces are currently clean but somewhat flat.

Introduce extremely subtle material variation.

Allowed:

- very faint noise/grain via CSS
- tiny tonal variation between shell and working surface
- 1px highlight edges where appropriate
- subtle inset/edge treatment inspired by machined hardware

Not allowed:

- obvious brushed-metal textures
- fake skeuomorphic panels
- visible repeating patterns
- gradients across every card
- heavy shadows

The effect should be felt more than noticed.

## 7. Controlled depth

Reserve Midnight Glass for special interaction layers only:

- bottom navigation
- sheets/modals
- command/search overlay
- active inspector
- selected contextual popovers

Use:

- translucent graphite
- restrained backdrop blur
- faint edge highlight
- very subtle shadow

Ordinary page sections must remain mostly flat.

## 8. Motion

Add small, purposeful micro-interactions.

Examples:

- active tab indicator slides/eases rather than snapping
- selected row transitions tonally
- sheets rise subtly
- readiness bar animates on first appearance
- hover rows brighten by one tonal step
- active sidebar state transitions cleanly

Motion should remain 160–220ms and respect `prefers-reduced-motion`.

No bounce. No decorative looping.

## 9. Home / Briefing character

Home should feel editorial and calm, not like a KPI dashboard.

Strengthen the briefing hero.

The hierarchy should feel like:

- greeting
- major operational statement
- next important item

Example visual hierarchy only:

`Good evening, Cameron`

`3 things need you`

Then an upcoming event can use a stronger date-led treatment:

`SAT 31`
`Muster`
`Frankland River`
`Bump-in 11:00 · 6 days`

Do not hard-code this example content.

Use larger date numerals and compact technical metadata.

Needs You should have the strongest signal rail treatment.

Pipeline remains visually quieter.

## 10. Jobs: production ledger feel

Push Jobs slightly toward a production ledger / run-of-show board.

Mobile:

- stronger date column
- clearer title hierarchy
- subtle active/selected rail
- restrained readiness treatment
- no boxed cards

iPad landscape:

- crisp aligned columns
- subtle vertical alignment rules where useful
- clearer separation between date, job, venue, stage/value and readiness
- avoid spreadsheet ugliness

Rows should feel engineered rather than decorated.

## 11. Gear: strongest Technical Atelier expression

Gear should become the most distinctive technical surface.

Increase emphasis on:

- quantities
- asset tags
- serials
- stock state
- owned/planned/unallocated
- allocation warnings

Use technical micro-details:

- compact metadata
- tabular numerals
- restrained mono/system-mono only for IDs/serials where helpful
- thin alignment rules
- stronger quantity hierarchy

Do not turn it into a terminal.

The user should feel like they are operating a professional equipment system.

## 12. iPad inspector treatment

Where a right-hand inspector already exists or can be introduced without destabilising routing, make it feel deliberately different from the primary workspace.

Approximate width:

- 280–320px

Treatment:

- slightly elevated graphite
- subtle translucency
- crisp dividers
- key figures larger
- technical metadata compact
- consistent signal rail for selected context

Do not force inspectors onto phone.

## 13. Imagery

Do not introduce stock photography or decorative generated images.

Only show imagery if the app has meaningful real content, such as:

- event artwork
- venue image
- real gear image
- client-provided visual

If unavailable, remain typographic.

## 14. Empty space and composition

Use whitespace more dramatically.

Do not fill every area merely because space exists.

On larger screens, allow strong type and important data to breathe.

The goal is not density everywhere. It is intentional density.

## 15. Acceptance criteria

This pass is successful when:

- it still looks clean
- it no longer feels visually timid
- it gains a recognisable Timbre identity
- orange feels like a precise hardware signal
- Home feels editorial
- Jobs feels operational
- Gear feels technical
- phone remains fast and uncluttered
- iPad landscape feels like a serious pro workspace
- iPad portrait does not feel squeezed
- no generic glassmorphism/cyberpunk aesthetic appears
- no functionality regresses

## Verification

Run:

```
npm run typecheck
npm run lint
npm test
npm run build
```

Review the Netlify deploy preview at:

- 390 × 844
- 430 × 932
- 768 × 1024
- 1024 × 1366
- 1366 × 1024
- 1440px desktop

Do not merge to production until the updated preview has been reviewed.


## 16. Timbre Pro Audio logo

Use the **actual Timbre Pro Audio brand logo**, not a recreated text wordmark and not an AI-generated approximation.

Current official source of truth:

`https://timbrepa.com.au/`

The live site currently exposes the white Timbre Pro Audio logo asset at:

`https://images.squarespace-cdn.com/content/66af73533f79120d397e78d1/85a060c9-1f1f-4532-a81d-6a0ad8cc6f74/Timbre_white.png?content-type=image%2Fpng&format=1500w`

### Asset handling

- Download/copy the official logo into the repository under `public/brand/`.
- Do **not** hotlink the production app to Squarespace.
- Preserve transparency and aspect ratio.
- Do not redraw, simplify, trace, distort, recolour, or modify the mark.
- If a higher-quality original SVG/vector asset becomes available later, it should replace the PNG without changing layout contracts.

Recommended filename:

`public/brand/timbre-pro-audio-white.png`

### Placement

**Phone**
- Use the logo in the top app chrome at a restrained size.
- It should identify the product without consuming useful vertical space.
- Do not repeat the full logo on every screen body.
- Bottom navigation remains icon/label based.

**iPad / desktop**
- Use the logo prominently but calmly at the top of the persistent sidebar.
- Remove the generic text-only `Timbre Ops` wordmark when the real logo is present.
- A small secondary `OPS` or `Operations` label may sit below/beside the brand mark if it helps distinguish the internal application from the public business brand.

**Auth / sign-in**
- Use the real logo as the primary brand element.
- Do not use the existing generic orange square as the dominant brand mark.

### Sizing and treatment

- Maintain the original aspect ratio.
- Never stretch the logo.
- Use enough clear space around it.
- Prefer the white logo on the graphite/black shell.
- Do not put the logo inside a pill, glossy tile, orange block, or decorative card.
- Do not add a drop shadow or glow to the logo.
- The logo itself should provide the brand recognition; the orange signal system remains separate.

### Product-brand relationship

The interface is **Timbre Ops**, but the owner brand is **Timbre Pro Audio**.

The UI should communicate this as:

`[Timbre Pro Audio logo]`
`OPS`

rather than inventing a new standalone Timbre Ops logo.

The app should feel like a professional internal product made by Timbre Pro Audio, not a separate unrelated software brand.
