# QA-088 — injury-detail polish and linked-parent access

## Scope

- Route: `/health/:id`
- Roles: athlete self and linked parent in native iOS; linked parent and unrelated parent in an isolated Fastify seed fixture
- Runtime: iPhone 16 Pro Max simulator `902FA3F5-08F8-417B-B60E-9245A9B86EC6` in local development mock native-audit mode
- Safety: no staging or production request or mutation. Fixture writes reset with the test process.

## Defects and correction

The injury detail had a clipped `Expected` label at 100% progress, duplicated the recovery status, reduced a useful injury summary to three words, and exposed an opaque creator ID. A role handoff also stored only a minimal mock session user, which dropped the linked-child relationship required by the parent's local health read.

The recovery marker is now a bounded, labelled marker with no rendered label to clip. The duplicate status badge is removed. The summary shows its first sentence across two lines, and timeline attribution resolves to `You` for the current athlete or a supplied display name for another viewer. Mock sign-in persists the complete session account before marking sign-in successful. The `/revyl-auth` route is now the one test-only allowlisted handoff; the duplicate global listener was removed.

## Native evidence

| State | Result | Screenshot |
| --- | --- | --- |
| Athlete before | The expected label clipped at the right edge, status appeared twice, the summary was truncated, and the note showed a raw ID. | `before-athlete.png` |
| Athlete after | The complete summary and a single status render cleanly; the progress marker has an accessibility label and the athlete note reads `You`. | `after-athlete-self.png` |
| Linked parent after | The settled Family role reads the same linked-child injury; its timeline names `Alfie Barton`, never an opaque ID. | `after-parent-linked-child.png`, `parent-role-handoff.png` |

## API, audit, and database proof

- The Fastify injury detail route calls `assertCanReadAthleteHealth` and records `athlete_injury.read`.
- The new fixture test creates an injury through a real `GuardianChildLink`, receives 200 for that linked parent, receives 403 for an unrelated parent, and asserts one `SUCCESS` and one `DENY` read audit event.
- Fixture tables: `GuardianChildLink`, `AthleteInjury`, `AuditEvent`. The fixture store resets on process exit.

## Verification

- Focused Fastify seed-fixture test passed: linked parent allow, unrelated parent deny, and both audit outcomes.
- Focused local injury-service and Revyl-auth tests passed (43 tests).
- `npm run typecheck`, `npm run test:compile`, focused ESLint, and `git diff --check` passed.
- React Doctor has no finding in this slice; its sole changed-file finding is protected user work in `hooks/use-group-session.ts:140`.
- Native iOS role handoff and both final detail views were captured after the UI settled.

## External systems

- Supabase MCP is unavailable (`ENV-003`); staging remains read-only (`ENV-005`).
- Sentry issue reads remain blocked by the current token scope (`ENV-004`); no synthetic telemetry was sent.
- Native semantic traversal remains blocked by local Developer Tools security (`ENV-006`); rendered simulator screenshots and focused source/API tests provide the evidence here.
