# Venue-preset updater-purity verification

Date: 2026-08-02 BST
Scope: availability day-editor venue persistence

## Defect

The saved-location state updater launched an asynchronous local-storage write. React may replay state-updater callbacks, so a single venue action could issue duplicate persistence work.

## Fix

- The next deduplicated, eight-item-capped preset list is computed in the user event handler.
- State is updated once with that value.
- Mock-mode persistence runs afterward in an ordinary `try`/`catch`.
- API mode remains free of device-local venue persistence.
- One unused safe-area import in the same component was removed.

## Verification

- Root TypeScript typecheck passed.
- Venue ownership and location-preset suites passed: 5/5 tests.
- React Doctor 0.9.3 analyzed the component and returned zero diagnostics for the changed slice.
- Focused ESLint passed with zero errors and zero warnings.
- Focused Prettier and `git diff --check` passed.

No production or staging request, storage write, or database mutation was performed.
