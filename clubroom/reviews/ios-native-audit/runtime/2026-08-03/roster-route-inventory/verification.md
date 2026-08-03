# ROUTE-108, ROUTE-111, ROUTE-114 — roster route inventory reconciliation

## Scope

Three coach roster routes were still present as unclassified Expo Router inventory rows despite focused evidence already covering their authority and states:

- `/roster` — coach roster list with search and filters.
- `/roster/[athleteId]` — verified-coach athlete detail.
- `/roster/[athleteId]/add-to-session` — assigned-coach session choice.

## Runtime path

The route helper is the only entry. Each screen checks the signed-in coach role before reading `rosterService`; the API facade uses `/v1/coaches/:coachId/roster`. Fastify verifies the bearer session, obtains roster assignment and verified-coach state from its trust-access repository, and records sensitive read outcomes. Client debug headers cannot grant access outside the explicit local test harness.

## Verification

- Compiled app route and service checks passed: 18/18. This includes coach-only roster loading, terminal denials without retry, add-to-session roster-entry verification, direct action labels, athlete-detail fail-closed emergency handling, API-mode failure handling, and API-mode local-storage denial.
- The current seed-only Fastify coach-club suite passed: 42/42. Its roster lifecycle check covers outsider denial, coach list/detail success, roster notes, updates, removal/restore, and successful/denied audit outcomes.
- The current seed-only emergency authority suite passed: 1/1. It proves medical and emergency-contact reads deny an unverified/unassigned coach and allow a verified assigned coach.

## Limitations

The full native retest is pending ENV-009 because CoreSimulator's local install XPC channel hangs after the Clubroom build completes. No simulator reset, permission acceptance, staging/production call, payment, audit event, or external service change was made for this reconciliation.
