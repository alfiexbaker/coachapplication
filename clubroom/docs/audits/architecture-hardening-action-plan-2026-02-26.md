# Architecture Hardening + Reachability Triage (2026-02-26)

This document is the action-oriented follow-up to the generated audit outputs:

- `docs/audits/architecture-hardening-report-2026-02-26.md`
- `docs/audits/component-reachability-2026-02-26.csv`
- `docs/audits/architecture-reachability-audit-2026-02-26.json`

It answers two questions:

1. Where are the architecture boundary problems?
2. Which components are actually reachable from the app vs dead/legacy filler?

## What Was Checked

- Static reachability from Expo Router `app/` route files (treated as roots)
- Component-by-component inventory for `components/**/*.tsx`
- Layering scans (`components -> services`, `services -> UI/hooks`)
- Route ownership scan (hardcoded `router.push/replace/navigate('/...')`)
- Result-pattern drift scan (`.ok`, `.isOk`, `throw` in services)

## Current Snapshot (from audit JSON)

- Source files scanned: `1561`
- Route files (`app/`): `177`
- Component files: `883`
- Reachable components from app roots: `750`
- Unreachable components (static): `133`

Component status counts:

- `reachable`: `750`
- `not_reachable_from_app`: `43`
- `unreferenced`: `30`
- `barrel_only_not_reachable`: `60`

Architecture counts:

- `components -> services` imports: `201`
- `services -> UI/router/app`: `0`
- `services -> hooks`: `0`
- hardcoded route strings in `router.push/replace/navigate`: `0`
- `.ok` references: `27`
- `.isOk` references: `0`
- services containing `throw`: `4`

## Component Reachability (Component-by-Component)

The component-by-component inventory is in:

- `docs/audits/component-reachability-2026-02-26.csv`

This is the source of truth for "is this component actually reachable from the app?"

Columns:

- `file`
- `reachable_from_app`
- `status`
- `importer_count`
- `importer_kinds`

### Important Caveat

This is a static import-graph audit. It can miss runtime-only registration and string-based loading.

In this repo, the results look credible because:

- the biggest dead clusters are barrel-only chains with no app/hook consumers
- manual spot checks matched the audit (for example `components/progress/cosmetic-selector.tsx` has `0` importers)

## Dead/Filler Signals (Strong)

### Safe Delete Candidates (30 components)

These components are both unreachable from app roots and have `0` importers (not even barrels/tests/scripts):

- `components/analytics/progress-chart.tsx`
- `components/analytics/session-timeline.tsx`
- `components/athlete/athletes-stats-bar.tsx`
- `components/badges/quick-recognition-modal.tsx`
- `components/badges/recognition-detail-card.tsx`
- `components/club/welcome-flow.tsx`
- `components/coach/adjust-day-modal.tsx`
- `components/coach/blocked-dates-calendar.tsx`
- `components/coach/blocked-dates-sections.tsx`
- `components/coach/cancellation-policy-cards.tsx`
- `components/coach/review-response.tsx`
- `components/coach/scheduling-option-picker.tsx`
- `components/coach/scheduling-rules-summary.tsx`
- `components/coach/smart-slots.tsx`
- `components/coach/travel-radius-picker.tsx`
- `components/event/RSVPButton.tsx`
- `components/family/children-hub-sections.tsx`
- `components/family/children-quick-actions.tsx`
- `components/goals/goal-list-sections.tsx`
- `components/parent/multi-week-invite-card-sections.tsx`
- `components/primitives/selection-tile.tsx`
- `components/profile/edit-children-section.tsx`
- `components/progress/cosmetic-selector.tsx`
- `components/progress/family-highlights.tsx`
- `components/progress/homework-card.tsx`
- `components/progress/progress-badges-tab.tsx`
- `components/progress/progress-goals-tab.tsx`
- `components/progress/progress-level-banner.tsx`
- `components/progress/squad-leaderboard.tsx`
- `components/squad/squad-preview-step.tsx`

These are the lowest-risk deletion batch because they are not referenced anywhere in the scanned codebase.

### Largest Unreachable Clusters (by folder)

- `components/invite/*`: `25`
- `components/coach/*`: `16`
- `components/development/*`: `14`
- `components/ui/*`: `9`
- `components/club/*`: `8`
- `components/progress/*`: `7`
- `components/safety/*`: `7`
- `components/bookings/*`: `6`

Interpretation:

- `invite` is likely a legacy wizard chain kept behind a barrel but no app-reachable consumer imports it
- `coach/development/progress` include multiple sprint-touched legacy components (real cleanup opportunity)
- `ui` bucket likely contains old primitives/sections preserved by barrels after refactors

### Barrel-Only Legacy Chains (60 components)

`barrel_only_not_reachable` means the component is still exported by an `index.ts` barrel, but the import chain never reaches an app route.

This is not active product functionality. It is legacy surfacing.

Priority cleanup pattern:

1. Remove app-unreachable barrel exports
2. Delete the underlying files in the same chain
3. Re-run `npm run audit:architecture`

## Architecture Hardening Findings (Requested Order)

## 1. Dependency / Layer Audit

Good:

- `services -> UI/router/app`: `0`
- `services -> hooks`: `0`

Problems:

- `201` components import services directly (`components -> services`)
- `183` of those are in components that are reachable from the app (runtime boundary issue, not just dead code)

Why this matters:

- UI components own data fetching/mutations, making state ownership inconsistent
- harder to test and reason about side effects
- easy to duplicate business logic across screens/components

Highest-priority reachable hotspots (by breadth/size):

- `components/parent/discover-screen.tsx` (imports 6 services)
- `components/notification/notifications-panel.tsx`
- `components/group/group-session-card.tsx`
- `components/consent/ConsentCard.tsx`
- `components/roster/removal-confirmation-modal.tsx`
- `components/invoices/InvoiceCard.tsx`
- several large progress/drills/family components importing services directly

Hardening target:

- Screens/hooks own service calls
- leaf/presentational components receive data + callbacks only

## 2. Service Contract Normalization (`Result<T, ServiceError>`)

Current drift:

- `.ok` references: `27`
- `.isOk` references: `0`
- `throw` in service files: `4`

`.ok` drift is concentrated in services (`23/27`), plus one app file and one hook.

Likely fix order:

1. Reachable runtime services first (event/invoice/auth/calendar/etc.)
2. Dead/legacy or `.legacy` files later
3. Low-level `api-client` last (if kept throw-based intentionally)

Service `throw` files:

- `services/api-client.ts` (likely acceptable low-level transport exceptions)
- `services/event/event-rsvp-service.ts` (business rule capacity throw; should become `Result` conflict)
- `services/relational-demo-seed-service.ts` (rethrow path; lower priority)
- `services/video-service.ts` (validation/not-found throws; should return `Result` for consistency)

## 3. Navigation / Route Ownership

Current state:

- hardcoded route strings in router calls: `0`
- route ownership is materially improved

Known caveat (already fixed earlier in app behavior):

- hidden tab routes were previously treated as restricted routes (caused false `Access restricted` on valid hidden routes like `earnings`)
- guard now distinguishes hidden vs restricted

Remaining route ownership work is not string routes; it is route discoverability/product pruning (dead routes/features), which depends on reachability and product decisions.

## 4. State Management Boundaries / Duplication

Primary signal:

- `components -> services` imports in `183` reachable components

This is the strongest indicator of duplicated state/side-effect ownership in this codebase.

Recommended rule set:

- `app/` routes and `hooks/` orchestrate async work and side effects
- `components/*-sections.tsx` should be pure/presentational by default
- component service imports require an explicit exception (e.g. tiny local read-only helper) and should be rare

Refactor sequence:

1. `components/parent/discover-screen.tsx` (multi-service orchestration)
2. notification panels/cards
3. consent + roster modals
4. invoice cards / finance UI
5. progress/drills UI modules (large file sizes + service coupling)

## 5. Performance Hotspots / Profiling Follow-up

Recent sprint work already removed several high-impact list/render issues.

What remains (static heuristic only, not profiler-backed):

- many files still contain `ScrollView` + `.map(` patterns (some are legitimate small lists, some are candidates for virtualization/memoization)
- several very large reachable components remain (`500-800+` LOC), increasing rerender and state-cohesion risk

Important:

- treat the `ScrollView + map` list as a triage queue, not a bug list
- prioritize reachable screens with user-visible lag reports or large datasets

## 6. Test Strategy Gaps / Regression Harness

What is missing today:

- no automated gate that prevents dead-code growth / reachability regressions
- no contract check for `.ok` reintroduction
- no budget/enforcement for `components -> services` drift

Recommended CI gates (phased):

1. `npm run audit:architecture` on CI artifacts (non-blocking first)
2. fail CI on `services -> UI/router/app > 0` and hardcoded route strings `> 0`
3. fail CI if `.isOk > 0`
4. fail CI if `.ok` count increases above baseline until migration completes
5. optional budget for unreachable components (no net increase)

## What This Means in Practice (Blunt Version)

- There is real filler / legacy UI code in the repo.
- Some sprint fixes were applied to components that are currently unreachable from the app.
- The repo is not structurally broken, but it carries legacy weight and boundary drift.

The fastest quality improvement now is not another feature sprint. It is:

1. delete the 30 zero-importer unreachable components
2. prune the `components/invite/*` barrel-only legacy chain
3. normalize `Result` usage in reachable services (`event-rsvp-service`, `video-service`, then the rest)
4. move service calls out of high-churn reachable components into hooks

## Next Execution Plan (Concrete)

### Phase A (safe cleanup, low risk)

- delete the 30 zero-importer components listed above
- remove broken barrel exports that reference deleted files
- run `npm run audit:architecture`
- run `npx tsc -p tsconfig.test.json`
- run `npm test -- --runInBand`

### Phase B (legacy chain cleanup)

- triage `components/invite/*` chain file-by-file from the reachability CSV/JSON
- delete unreachable wizard step chain(s)
- keep currently reachable invite UI (e.g. current invite cards/detail flow)

### Phase C (contract + boundary hardening)

- convert reachable service `throw`/`.ok` drift to `Result<T, ServiceError>`
- refactor top 5 reachable `components -> services` hotspots into hooks/screen orchestrators

