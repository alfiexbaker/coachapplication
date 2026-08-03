# QA-084 — verified coach emergency-data boundary

## Scope

- Routes: `/roster/:athleteId` and `/roster/:athleteId/emergency`
- Roles: native unverified coach; verified and unverified assigned coaches in isolated service and Fastify fixtures
- Runtime: iPhone 16 Pro Max in local development mock audit; isolated Fastify seed fixture
- Safety: no staging or production request or mutation. Fixture stores reset on process exit.

## Defect and correction

The local unverified-coach fixture could open a roster player's emergency screen and see their emergency contacts, phone numbers, allergy, condition, and medication. The quick-emergency service did not receive the viewer context, and its roster check accepted any coach roster entry rather than the requesting coach's entry. A cached copy could also be used after an unauthorised read failed.

All app-facing quick emergency reads now require explicit viewer context. For a coach, the service requires verification and a roster entry owned by that coach; it returns the authority error rather than using cache data. Both roster detail and emergency screens reject unverified coaches before their data reads, preserve the true denial message, and do not offer retry. The refresh control has an accessibility label.

## Native evidence

| State | Result | Screenshot |
| --- | --- | --- |
| Unverified coach before | Emergency contacts, phone numbers, allergies, condition, and medication were exposed. | `unverified-coach-before.png` |
| Unverified coach emergency after | One terminal state says a verified coach account is required; no data or retry. | `unverified-coach-denied.png` |
| Unverified coach roster detail after | The athlete detail screen contains no player or medical data. | `unverified-coach-roster-detail-denied.png` |

## Verification

- Root `npm run typecheck` and test TypeScript compilation passed.
- Focused safety, emergency authority, athlete-detail authority, and API-mode tests passed (43 tests).
- Isolated Fastify `emergency-read-authority` fixture passed: unverified assigned coach receives 403 from both medical and emergency-contact reads; verified assigned coach receives 200; both successful reads are sensitive audit events and both denials are security events.
- Focused ESLint passed with three pre-existing `Array<T>` style warnings in `__tests__/services/safety-service-api-mode.test.ts`; no errors.
- React Doctor changed-file scan reports only the unrelated protected `hooks/use-group-session.ts:140` React Compiler limitation; this slice introduces no diagnostic.
- Native iOS before/after screenshots confirm the P0 exposure and final terminal states.

## External-system coverage

- No staging or production write occurred. The app flow was exercised only in local mock mode.
- Supabase MCP remains unavailable (`ENV-003`), staging remains read-only (`ENV-005`), and Sentry issue read is blocked (`ENV-004`). No synthetic telemetry was sent.
- Native semantic traversal remains unavailable because local DevTools security blocks XCUITest (`ENV-006`); source accessibility checks and rendered iOS screenshots are retained instead.
