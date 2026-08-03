# Availability native dismiss gesture verification

## Scope

The coach availability day editor previously attached React Native `PanResponder` handlers to its drag handle while animating the sheet with Reanimated shared values. This kept gesture sampling on the JavaScript thread.

The app already provides `GestureHandlerRootView`, `react-native-gesture-handler` 2.28, Reanimated 4.1, and `react-native-worklets`. No dependency or native project change was needed.

## Change

- Replaced `PanResponder` with `Gesture.Pan()` and `GestureDetector`.
- Kept the existing five-point activation distance and 80-point dismissal threshold.
- Kept downward-only translation and the existing snap-back timing.
- Kept the overlay fade and calls `onClose` through `scheduleOnRN` only after the close animation finishes.
- Added cancellation finalization so an interrupted gesture returns the sheet to rest.
- Preserved tap dismissal, keyboard behavior, close labels, form state, save behavior, and all API/service boundaries.

## Verification

- Root TypeScript check: passed.
- Focused ESLint error check: passed.
- React Doctor changed-file scan: 0 diagnostics; the repository's only `rn-no-panresponder` finding cleared.
- Focused availability route/native-gesture boundary: 4/4 passed.
- Current-source availability suite: 57/65 passed.

The eight broad-suite failures all come from `availability-location-drift.test.ts`. Those tests expect direct local booking mutation that current runtime correctly rejects with `Updating booking locations requires backend booking update authority.` The drift is recorded separately as `QA-052`; it was not treated as a gesture regression.

The actual iOS semantic drag could not be driven because the existing XCUITest blocker `ENV-006` remains. No production or staging service, booking, database, or Sentry data was used.
