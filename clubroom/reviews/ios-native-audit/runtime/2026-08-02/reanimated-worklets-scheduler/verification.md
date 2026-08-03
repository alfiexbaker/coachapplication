# Reanimated worklets scheduler verification

## Scope

Clubroom uses Reanimated 4.1 and `react-native-worklets` 0.5. The remaining production callbacks still used the Reanimated 3-style `runOnJS(fn)(...args)` bridge.

## Change

Eight callbacks were migrated one-for-one to `scheduleOnRN(fn, ...args)`:

- Availability tutorial step transition.
- Price slider live and committed minimum/maximum changes (four calls).
- Notification toast hide completion.
- Animated progress counter display update.
- Player card flip-lock release.

The availability day-sheet close callback was already migrated in `ad3dfe65`, clearing the ninth baseline finding. No animation duration, easing, spring, callback argument, state shape, copy, or visual style changed.

## Verification

- Production source search: zero `runOnJS` imports or calls under `app`, `components`, `hooks`, and `services`.
- Root TypeScript check: passed.
- Isolated strict test compilation: passed.
- Scheduler argument boundary: 1/1 passed.
- Focused ESLint error check: passed.
- React Doctor reported no diagnostic in this slice and the scheduler rule is absent from changed files. Its diff scan included two unrelated `js-combine-iterations` suggestions in a concurrently modified match route.
- `git diff --check`: passed.

No production or staging service, database, Sentry project, notification, booking, child record, or analytics event was touched.
