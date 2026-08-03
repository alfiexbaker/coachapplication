# QA-082 — roster health shared-injury projection

## Scope

- Route: `/roster/:athleteId/health`
- Roles: assigned coach and athlete in native iOS; athlete, outsider, verified coach, and unverified coach in isolated Fastify fixture coverage
- Runtime: iPhone 16 Pro Max in local development mock audit; isolated Fastify seed fixture
- Safety: no staging or production request or mutation. Test writes use reset-on-exit fixture stores only.

## Defect and correction

After proving roster membership, the coach screen read the generic actor/child injury helper. In mock mode it treated the coach as an unrelated user, so a real shared recovering injury rendered as a reassuring empty state. That helper also represents a broader owner/guardian record, not the coach's shared projection.

The route now uses the dedicated coach injury projection. It returns only injuries explicitly shared with the coach in mock mode and uses the scoped Fastify injury route in API mode. The duplicate empty-injury card is removed. The trust copy no longer suggests that family-only notes are exposed.

## Native evidence

| State | Result | Screenshot |
| --- | --- | --- |
| Coach before | A shared recovering ankle injury was incorrectly presented as no active injuries, followed by a duplicate empty state. | `coach-before-missing-injuries.png` |
| Coach after | The shared recovering injury appears once in the timeline; the view stays concise and points time-critical cases to Emergency Info. | `coach-final-shared-injuries.png` |
| Athlete | Direct roster-health link stays terminally unavailable with no data or retry. | `athlete-denied.png` |

## Verification

- Test TypeScript compilation passed.
- Focused roster-health terminal-state and injury-service tests passed (39 tests): the coach service returns only shared injuries and the route selects that projection.
- Isolated Fastify injury fixture passed (2 selected tests): athlete injury create/read/update flow rejects malformed and outsider detail access; group injury logging denies unverified and unassigned coaches and allows a verified assigned coach. Fixture data resets on process exit.
- Focused ESLint passed.
- Native iOS retest passed for the assigned coach and athlete denial state.
- Root `npm run typecheck` and `git diff --check` passed. React Doctor's changed-file scan reports only the unrelated protected `hooks/use-group-session.ts:140` compiler limitation; this slice introduces no React Doctor finding.

## Superseded authority note

QA-083 established that the native `coach` audit fixture is unverified. The coach-after screenshot above is therefore evidence of the shared-projection and duplicate-state correction, not proof that this fixture should retain health access. QA-083 adds the missing verification gate and records the terminal native result; its isolated Fastify test proves the verified-coach allow branch.

## External-system coverage

- The changed UI was exercised only in local mock mode.
- Supabase MCP remains unavailable (`ENV-003`), staging stays read-only (`ENV-005`), and Sentry issue read access remains blocked (`ENV-004`). No synthetic telemetry was sent.
- Native semantic traversal remains unavailable because local DevTools security blocks XCUITest (`ENV-006`); this audit uses source controls and rendered iOS evidence.
