# Black Aluminium refresh: implementation and verification

Implementation for issue #9, based on `0861b1ac0074086578bb5c310503284b10085239` on `codex/visual-refresh-black-aluminium`.

## Implemented

- Semantic graphite surface, text, line, brand, status, radius and spacing tokens. Supporting styles retain compatibility aliases.
- Unboxed sections, restrained dot-and-label statuses, neutral secondary actions, tabular figures, visible keyboard focus and reduced motion support.
- Integrated full-width phone navigation with safe-area padding. Persistent 192px sidebar from 900px, 208px from 1100px. Settings and sign-out remain available in the account menu.
- Home: attention summary and focused Needs You surface; Coming Up before Operations in DOM order; date-led event rows, next readiness milestone, explicit empty states, quieter pipeline and command entry.
- Jobs: mobile rows with date, client, stage, next task/blocker and readiness. Search and horizontally scrollable filters remain available. Aligned venue, stage/value and readiness columns appear from 1100px.
- Job workspace: existing tabs, editors, uploads, status gates and routes retained. Added overview schedule, contact, packing and file summaries; three summary columns at wide widths. Readiness stays neutral until complete.
- Tasks: Today (including overdue), This Week, Waiting, Later & undated, and Completed buckets. Perth business dates and the Monday week boundary are tested. No task owner is invented: the existing task schema has no owner field.
- Task and operation creation/editing use a shared native dialog sheet with modal focus containment, Escape dismissal, close/cancel controls, scroll locking and focus restoration. Operation editing is an explicit keyboard-operable button.
- Gear: searchable catalogue, packages and allocation views; category filters; labelled quantity controls; owned/planned/unallocated figures; serialised assets; collapsible creation surfaces; shortages and project demand. Unallocated means owned minus existing planned demand, not date-aware availability.
- Existing Supabase clients, queries, mutations, Gmail integration, database types, migrations and API handlers are unchanged. No dependency or framework added.
- Existing review fixtures, paper surfaces and print-specific styling retained. Pack review explicitly hides the new sidebar.

## Automated checks

Run on the isolated working copy of the requested branch:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: passed, 14 files / 63 tests.
- `npm run build`: passed, Next.js 16.3.6, webpack production build.

The additional tests verify overdue work, Sunday/Monday boundaries, Perth versus UTC dates, and disjoint waiting/completed buckets.

## Browser verification limitation

Browser visual verification is **not complete**. The execution environment rejects opening the local server port:

```text
Error: listen EPERM: operation not permitted 127.0.0.1:3109
```

The attempted browser connection also returned `ERR_CONNECTION_REFUSED`. No screenshots or successful live browser interactions are claimed. Automated code checks do not replace visual or authenticated integration testing.

## Review checklist

Run the application in an environment that permits a local server, or use a branch preview. Keep production review-fixture access disabled. Set `NEXT_PUBLIC_ENABLE_REVIEW_FIXTURES=1` only in an isolated review environment to access the existing `/review` and `/review/pack` routes.

Inspect all five core screens at 320px and at the required sizes:

- 390 × 844
- 430 × 932
- 768 × 1024
- 1024 × 1366
- 1366 × 1024
- 1440px desktop

Check long job/client names, empty briefing lists, shortages, large stock quantities, dense task lists, every job tab, keyboard focus and modal focus restoration. Confirm catalogue and package creation, task creation/completion, operation editing, document upload/download and status-gate workflows against an authorised test account. Print the review job pack and confirm the navigation/sidebar are absent and paper formatting is intact.

## Issue #13: controlled character pass

Implemented on `codex/visual-refresh-black-aluminium`, reviewed through PR #11.
Both design specifications were read in full. No schema, authentication, data workflow,
dependency or hosting configuration changes are part of this pass.

- Native system font stack; ordinary names and headings wrap at word boundaries.
  Filenames, email links, asset tags and serials retain targeted overflow handling.
- Sidebar retained at 900px; generic detail columns begin at 1100px, with the
  three-column workspace and 300px allocation inspector reserved for 1300px.
- Live briefing statement uses the existing review count, including loading and
  clear states. Dates, stock figures and shortages have stronger type hierarchy.
- Short orange signal rails identify unresolved attention, focused job rows and
  inspector context. Operational state retains semantic colour and text labels.
- Subtle shell highlights and tonal surfaces; translucent depth only for overlays
  and the wide allocation inspector. No imagery, textures or font assets added.
- Tab indicators ease in, rows transition tonally, and readiness bars reveal once
  on mount. Existing reduced-motion overrides disable all added motion.
- Existing isolated review fixture now covers the character headline, long event
  name, date-led row, long asset identifier, shortage and large stock quantities.
  Printed pack styles and review access guard remain intact.

Validation: typecheck, lint, 63 tests and production build pass.
Local browser verification remains blocked by `listen EPERM` on 127.0.0.1:3109.
Phone/iPad visual acceptance is pending on the Netlify Deploy Preview, including
all six sizes listed above, keyboard focus, reduced motion and the printed pack.
Do not merge or deploy to production before that review.
