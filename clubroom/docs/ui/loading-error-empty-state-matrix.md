# Loading Error Empty-State Matrix

Validated: 2026-04-20
Purpose: define the default screen-state pattern so new screens stay consistent and agents know which primitives to reuse.

## Canonical Sources

- `hooks/use-screen.ts`
- `components/ui/screen-states.tsx`
- `components/ui/screen-states-sections.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/empty-state.tsx`
- `components/primitives/surface-card.tsx`
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
- use `silentError` for failed background refresh without dropping already-loaded data

## Shared Primitives

- `LoadingState`
  - variants: `list`, `card`, `detail`, `form`, `calendar`
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
  - `section-skeleton`
    - `click -> keep stable shell/header/chrome -> reveal truthful section placeholder only where data is missing -> fill section when ready`
  - `submit-only`
    - `click -> keep current form/screen visible -> show button/action progress -> resolve success or inline error`
  - `cold-first`
    - allowed only when there is no truthful prior frame to preserve
    - `open -> immediate truthful skeleton in final layout geometry -> show content`
- If the transition visibly flashes white, collapses layout, or swaps through an empty intermediate frame, it fails.

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
| list or feed | `list` | contextual `EmptyState` with action when recovery exists | `ErrorState` with retry |
| dashboard or analytics cards | `card` | use explicit empty explanation, usually refresh or setup CTA | `ErrorState` with retry |
| detail screen | `detail` | use only when "no object exists" is a real state | `ErrorState` with retry |
| form or wizard | `form` | usually no empty state; prefer inline guidance | `ErrorState` or inline field errors depending on scope |
| calendar or schedule | `calendar` | empty CTA should explain next scheduling action | `ErrorState` with retry |

## Build Rules

1. Prefer `useScreen` before inventing a custom loading state machine.
2. Prefer shared screen-state primitives before adding ad hoc placeholders.
3. Use toasts and inline banners for follow-up feedback; do not use modal alerts for normal loading or empty states.
4. If stale data remains visible after a silent refresh fails, surface the failure without resetting the whole screen.
5. Prefer section-level placeholders over whole-screen loading whenever the header, chrome, or other loaded sections can stay stable.
6. For segmented or tabbed surfaces, keep previously loaded panes warm or preserve their last loaded data; switching tabs should not blank the whole page.
7. A skeleton should reuse the same spacing, density, and container rules as the loaded component family wherever practical.
8. Do not ship “premium” claims on a surface until it passes the failure conditions above.

## Build Conditions

1. First-load only: whole-screen skeletons are allowed only when no truthful prior data exists.
2. Truthful geometry: skeleton height, spacing, grouping, and visual hierarchy must map to the loaded surface.
3. Stable chrome: headers, segment controls, tabs, and already-loaded sections stay mounted during refresh whenever possible.
4. Warm navigation: revisiting a screen or tab should reveal retained content first and refresh second.
5. Cheap motion: loading motion must be lightweight enough that scrolling still feels immediate.
6. No fallback slop: if a surface needs a custom loading recipe, a generic `list` or `detail` variant is not good enough.
7. Route closure: every async route must have an owning sprint or an explicit documented exception before the loading program can be called complete.
8. Transition integrity: every interactive path must preserve a stable visible state from click until resolved content is ready.

## Validation Notes

- The shared primitives are real and reusable today.
- Domain-specific wrappers exist, but the repo still has drift between shared loading variants and bespoke per-screen placeholders.
- New work should consolidate toward the shared primitives above instead of adding another custom loading pattern.
- If you build a new wrapper, keep it thin and backed by the shared primitives above.
