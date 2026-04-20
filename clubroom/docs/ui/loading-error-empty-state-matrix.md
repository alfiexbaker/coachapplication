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

## Validation Notes

- The shared primitives are real and reusable today.
- Domain-specific wrappers exist, but the repo still has drift between shared loading variants and bespoke per-screen placeholders.
- New work should consolidate toward the shared primitives above instead of adding another custom loading pattern.
- If you build a new wrapper, keep it thin and backed by the shared primitives above.
