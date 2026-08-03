# Availability location authority test verification

## Finding

`availability-location-drift.test.ts` still asserted behavior removed by `524a6473` (`fix(availability): stop using local booking mirrors`). It expected device-local bookings to be updated and returned as conflicts even though current runtime intentionally requires backend booking-update authority and ignores local booking mirrors.

## Change

The legacy fixture-heavy pack was replaced by three direct boundary tests:

- Local booking location updates reject without backend authority and do not mutate the local mirror.
- Location drift is not derived from a device-local booking mirror.
- Device-local bookings are not reported as authoritative availability conflicts.

No runtime or API code changed. Existing API-mode tests continue to prove delegated conflict responses, fail-closed authority outages, and `/v1` schedule booking reads.

## Verification

- Isolated TypeScript test compilation: passed.
- Focused local-boundary plus API-authority tests: 7/7 passed.
- Complete current-source availability folder: 58/58 passed.
- Focused ESLint error check: passed.
- `git diff --check`: passed.
- React Doctor reported no diagnostic in the changed test. Its diff scan included two `js-combine-iterations` warnings in an unrelated concurrently modified match route; they were not attributed to this slice.

No production or staging service, database, booking, child record, email, or Sentry project was touched.
