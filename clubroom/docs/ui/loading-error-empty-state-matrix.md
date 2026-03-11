# Loading Error Empty-State Matrix

Validated: 2026-03-11
Purpose: define the default screen-state pattern so new screens stay consistent and agents know which primitives to reuse.

## Canonical Sources

- `hooks/use-screen.ts`
- `components/ui/screen-states.tsx`
- `components/ui/screen-states-sections.tsx`
- `components/ui/empty-state.tsx`
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

## Validation Notes

- The shared primitives are real and reusable today.
- Domain-specific wrappers exist, but the repo does not yet have one universal wrapper for every screen family.
- If you build a new wrapper, keep it thin and backed by the shared primitives above.
