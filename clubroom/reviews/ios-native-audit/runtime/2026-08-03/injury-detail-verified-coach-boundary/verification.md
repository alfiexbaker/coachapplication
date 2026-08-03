# QA-083 — verified coach injury-detail boundary

## Scope

- Routes: `/roster/:athleteId/health` and `/health/:injuryId`
- Roles: native unverified coach and athlete; verified coach, unverified coach, and outsider in isolated Fastify and local mock tests
- Runtime: iPhone 16 Pro Max in local development mock audit; isolated Fastify seed fixture
- Safety: no staging or production request or mutation. All test stores reset on exit.

## Defect and correction

The roster-health route did not prove coach verification before reading injury data. Separately, the generic injury-detail lookup only recognised athletes and guardians in mock mode, so the coach flow advertised an injury it could not open. API error codes were discarded, which could turn a denied live detail read into a retryable error.

Roster health now requires a verified coach and has an authority-specific data key. Injury detail permits only a verified coach with a roster assignment and an explicitly shared injury; it preserves live `UNAUTHORIZED` errors as terminal UI. Unverified fixture routes show direct access copy and no retry. The athlete can still open their own injury.

## Native evidence

| State | Result | Screenshot |
| --- | --- | --- |
| Unverified coach before | Direct injury link incorrectly said the record was not found. | `unverified-coach-before-not-found.png` |
| Unverified coach health | Health route is terminal and states that a verified coach account is required. | `unverified-coach-roster-health-denied.png` |
| Unverified coach injury | Detail route is terminal, exposes no injury data, and offers only Go back. | `unverified-coach-injury-denied.png` |
| Athlete | The athlete opens their own shared recovering injury record. | `athlete-own-injury.png` |

The local native role fixture cannot represent a verified coach. The verified allow branch is proved by the Fastify fixture and the local service test below, not inferred from a role name.

## Verification

- Test TypeScript compilation passed.
- Focused injury service, injury-detail authority, and roster-health boundary tests passed (41 tests). A verified assigned mock coach can open a shared injury and receives `null` for an unshared injury.
- Focused API-mode injury tests passed (3 tests): detail and list reads use `/v1`, mock storage stays unused, and scoped auth headers are sent.
- Isolated Fastify `injury-read-authority` fixture passed: unverified assigned coach GET is 403; verified assigned coach GET is 200; one `athlete_injury.read` denial and one success audit event are asserted.
- Focused ESLint passed.
- Native iOS retest passed for the unverified-coach terminal states and athlete-self injury record.
- Root `npm run typecheck`, test compilation, `git diff --check`, and focused ESLint passed.
- React Doctor's changed-file scan has no confirmed regression in this slice: the two `useCallback` notices in `use-health-detail.ts` pre-date this change and preserve the stable callback identity required by `useFocusEffect`; the `AuthProvider` size notice pre-dates this mapping-only addition. The scan also reports the protected, unrelated `hooks/use-group-session.ts:140` React Compiler limitation. None are suppressed or hidden.

## External-system coverage

- Changed screens were exercised only in local mock mode. No injury action was submitted.
- Supabase MCP remains unavailable (`ENV-003`), staging remains read-only (`ENV-005`), and Sentry issue read is blocked (`ENV-004`). No synthetic event was sent.
- Native semantic traversal remains unavailable because local DevTools security blocks XCUITest (`ENV-006`); source accessibility checks and iOS screenshots are retained instead.
