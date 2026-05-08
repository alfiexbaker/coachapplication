# Loading Error Empty-State Matrix

Validated: 2026-04-22
Purpose: define the default screen-state pattern so new screens stay consistent and agents know which primitives to reuse.

## Canonical Sources

- `hooks/use-screen.ts`
- `components/ui/screen-states.tsx`
- `components/ui/screen-states-sections.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/empty-state.tsx`
- `components/primitives/surface-card.tsx`
- `navigation/loading-route-manifest.js`
- `scripts/loading-route-coverage-audit.js`
- `components/analytics/analytics-screen-state.tsx`
- `components/settings/settings-screen-state.tsx`
- `components/verification/verification-screen-state.tsx`
- `components/child/child-screen-state.tsx`

## Core State Machine

Default screen lifecycle:

- `loading`
- `error`
- `empty`
- `success`

Source of truth:

- `useScreen` derives and manages this state machine
- `useScreen.loadingStrategy` declares whether a route is `warm-first`, `section-skeleton`, `submit-only`, or `cold-first`
- `useScreen.dataKey`, `requestedDataKey`, `resolvedDataKey`, and `hasRequestedTruthfulFrame` distinguish a visible truthful frame from the requested truthful frame
- `useScreen.pendingState`, `showLoadingState`, `showSectionSkeleton`, and `showSubmitProgress` expose whether the next load should block, preserve truth, or localize the placeholder
- use `silentError` for failed background refresh without dropping already-loaded data

## Shared Primitives

- `LoadingState`
  - variants: `list`, `feed`, `card`, `detail`, `hero`, `form`, `calendar`, `schedule`, `tab-pane`
  - scopes: `screen`, `section`
- `SectionSkeleton`
  - keeps chrome stable while only the unresolved section skeletonizes
- `SubmitProgressState`
  - keeps the current form or action surface visible while work resolves
- `ErrorState`
  - retry CTA
  - user-facing error code support
- `EmptyState`
  - contextual icon
  - optional action CTA

## Skeleton Fidelity Contract

- A loading placeholder must be a layout twin of the surface it stands in for.
- Lazy-loaded content must preview the same data family that will appear after load:
  - list rows for list rows
  - cards for cards
  - hero plus sections for detail screens
  - field groups for forms
  - tab-pane content for active tabs
- Do not use a generic full-screen loader when the loaded screen is only waiting on one section.
- If the app already has data for the surface, keep rendering that data while a refresh runs instead of replacing it with a blank placeholder.
- Do not mix unrelated loading styles in one viewport, such as skeleton cards plus a random spinner that implies a different structure.

## Anti-Flicker Transition Rule

- Never ship this sequence:
  - `click -> blank/flicker -> load -> show`
- Default route transition rules:
  - `warm-first`
    - `click -> keep stable current frame or prior data -> show local loading affordance -> swap in refreshed content when ready`
    - if the requested dependency frame is not ready yet, keep the committed frame mounted and acknowledge the transition inline until the next frame can commit atomically
  - `section-skeleton`
    - `click -> keep stable shell/header/chrome -> reveal truthful section placeholder only where data is missing -> fill section when ready`
    - if the requested frame is already cached and visible, do not regress back to a dependency-change skeleton
  - `submit-only`
    - `click -> keep current form/screen visible -> show button/action progress -> resolve success or inline error`
  - `cold-first`
    - allowed only when there is no truthful prior frame to preserve
    - `open -> immediate truthful skeleton in final layout geometry -> show content`
- If the transition visibly flashes white, collapses layout, or swaps through an empty intermediate frame, it fails.

## Elite UX Standard

- The user should feel that the app acknowledged the interaction immediately.
- The user should never lose spatial context during loading.
- The viewport should show one coherent loading language, not a mixture of unrelated spinners, bars, and half-loaded cards.
- Chrome, hierarchy, and content priority should stay stable:
  - keep header/tab/filter shell stable first
  - keep prior truthful content second
  - load the critical section third
  - defer secondary sections last
- If a screen cannot preserve prior content, its first-load placeholder must still look like the real screen on its best day, not a cheap approximation.
- Premium means invisible waiting, not prettier waiting.

## Premium Failure Conditions

- Fail the surface if it shows a full-screen skeleton after the user already saw loaded data there once.
- Fail the surface if a segmented or tabbed switch shows empty space, white flash, or a cold reset.
- Fail the surface if a click path goes through `blank/flicker -> load -> show` instead of keeping a stable shell or truthful placeholder visible.
- Fail the surface if the loading state uses generic bars but the loaded UI is actually a mixed card, chip, hero, or timeline composition.
- Fail the surface if the placeholder is denser or sparser than the final UI and therefore lies about what is coming.
- Fail the surface if pull-to-refresh or focus refresh destroys stable chrome that could have stayed on screen.
- Fail the surface if the shimmer, entry animation, or placeholder count is heavy enough to harm scroll performance.
- Fail the surface if a long-list experience uses `ScrollView` without a deliberate reason grounded in low item count or non-feed structure.

## Route Classification Rule

- Every route must be explicitly classified as one of:
  - `warm-first`
    - already-loaded data stays visible while refresh happens
  - `section-skeleton`
    - only unresolved sections render truthful placeholders
  - `submit-only`
    - no entry skeleton; only action progress/loading affordances are needed
  - `static`
    - no async loading contract is required
- No async route is allowed to remain unclassified.
- A route is not “covered by the sprint plan” unless its classification and owning sprint are both explicit.
- Canonical route source:
  - `navigation/loading-route-manifest.js`
- Coverage gate:
  - `node ./scripts/loading-route-coverage-audit.js`

## Elite Review Gate

- Every hot path needs all of the following before it can be called elite:
  - a declared route classification
  - a declared transition sequence from interaction to resolved content
  - a declared loading owner for each unresolved section
  - a declared reason if the route is `cold-first` or `ScrollView`-based
- Review the path in three states:
  - cold open
  - warm revisit
  - background refresh after prior content exists
- Review the path under at least:
  - normal network/runtime conditions
  - stressed conditions where latency is noticeable enough to expose bad choreography
- Reject the path if a screen recording shows:
  - blank intermediate frame
  - header or tab jump
  - mismatched placeholder geometry
  - duplicated loading affordances
  - scroll hitch caused by the loading treatment itself
- Hot-path review state and ship blockers now live in `navigation/loading-route-manifest.js` and are enforced by `scripts/loading-route-coverage-audit.js`.

## Existing Screen Wrappers

- `AnalyticsScreenState`
  - full loading, error, empty wrapper with header support
- `SettingsScreenState`
  - loading and error wrapper for settings surfaces
- `VerificationScreenState`
  - loading, error, empty wrapper for verification flows
- `ChildScreenState`
  - loading and error wrapper for child flows

## Default Selection Matrix

| Screen shape | Loading variant | Empty state | Error state |
|---|---|---|---|
| list or feed | `feed` or `list` | contextual `EmptyState` with action when recovery exists | `ErrorState` with retry |
| dashboard or analytics cards | `card` | use explicit empty explanation, usually refresh or setup CTA | `ErrorState` with retry |
| detail screen | `hero` or `detail` | use only when "no object exists" is a real state | `ErrorState` with retry |
| form or wizard | `form` | usually no empty state; prefer inline guidance | `ErrorState` or inline field errors depending on scope |
| calendar or schedule | `schedule` or `calendar` | empty CTA should explain next scheduling action | `ErrorState` with retry |
| segmented pane | `tab-pane` or `SectionSkeleton` | contextual empty panel | inline error or `ErrorState` depending on scope |

## Build Rules

1. Prefer `useScreen` before inventing a custom loading state machine.
2. Prefer shared screen-state primitives before adding ad hoc placeholders.
3. Use toasts and inline banners for follow-up feedback; do not use modal alerts for normal loading or empty states.
4. If stale data remains visible after a silent refresh fails, surface the failure without resetting the whole screen.
5. Prefer section-level placeholders over whole-screen loading whenever the header, chrome, or other loaded sections can stay stable.
6. For segmented or tabbed surfaces, keep previously loaded panes warm or preserve their last loaded data; switching tabs should not blank the whole page.
7. A skeleton should reuse the same spacing, density, and container rules as the loaded component family wherever practical.
8. Do not ship “premium” claims on a surface until it passes the failure conditions above.
9. Treat immediate visual acknowledgement as mandatory: the user should see either preserved truth, truthful placeholder, or action progress right after interaction.

## Build Conditions

1. First-load only: whole-screen skeletons are allowed only when no truthful prior data exists.
2. Truthful geometry: skeleton height, spacing, grouping, and visual hierarchy must map to the loaded surface.
3. Stable chrome: headers, segment controls, tabs, and already-loaded sections stay mounted during refresh whenever possible.
4. Warm navigation: revisiting a screen or tab should reveal retained content first and refresh second.
5. Cheap motion: loading motion must be lightweight enough that scrolling still feels immediate.
6. No fallback slop: if a surface needs a custom loading recipe, a generic `list` or `detail` variant is not good enough.
7. Route closure: every async route must have an owning sprint or an explicit documented exception before the loading program can be called complete.
8. Transition integrity: every interactive path must preserve a stable visible state from click until resolved content is ready.
9. Immediate response: every interaction must produce a visible acknowledgement on the same surface without waiting for the fetch to finish.
10. Measurement before ego: if a path claims to be elite, it needs a route note, a video-reviewed pass, and an honest justification for any exception.

## Validation Notes

- The shared primitives are real and reusable today.
- Social and communication hot paths now use retained-frame loading recipes in code: home, feed, messages, chat thread detail, community, post detail, and post composers keep shell chrome stable and use inline progress or section-matched placeholders instead of full resets or spinner-only seams.
- Chat thread entry now seeds the next route with in-memory thread preview data from the tapped row, so the chat header and group chrome can stay truthful while only the transcript/composer skeletonize on cold open.
- Shared skeleton recipes now consolidate around `components/ui/skeleton.tsx`, `components/ui/screen-states-sections.tsx`, and `components/primitives/surface-card.tsx` rather than separate shimmer implementations.
- Shared keyed retained-frame support now lives in `useScreen`, so warmed routes can hydrate a truthful cached frame for the requested `dataKey`, and section-skeleton routes only skeletonize when the requested frame is still unresolved.
- Profile, roster, compare, and coach detail routes now use retained pane mounting plus section-level progress treatment, and coach/public profile offering sections now render real live offerings instead of fake session lists or verbose explainer copy.
- Schedule, event, club schedule, club detail, and training schedule cold-load states now keep their header or action chrome visible and use schedule/card/detail-shaped placeholders instead of generic list placeholders.
- Route classification and hot-path review closure now live in `navigation/loading-route-manifest.js`, with repo-level coverage enforced by `scripts/loading-route-coverage-audit.js`.
- Domain-specific wrappers exist, but the repo still has drift between shared loading variants and bespoke per-screen placeholders.
- New work should consolidate toward the shared primitives above instead of adding another custom loading pattern.
- If you build a new wrapper, keep it thin and backed by the shared primitives above.
