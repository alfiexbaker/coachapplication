# QA-086 — raise concern verified-coach boundary

## Defect

An unverified local coach could open the full roster concern form, select a category and severity, and enter a report. The API subsequently rejected the safeguarding incident with `403`, because it correctly requires a verified assigned coach. That was a dead form in a trust-sensitive flow.

## Fix

The native route now stops before it reads the roster entry or renders the player name and concern controls unless the signed-in actor is a verified coach. Its terminal state is explicit and has no retry. The submit handler repeats the same check so a stale screen cannot submit after an auth-state change.

## Evidence

- `unverified-coach-before.png`: actual iOS showed the editable form to an unverified coach.
- `unverified-coach-denied.png`: actual iOS now shows a terminal verification requirement with no player or form data.
- `__tests__/roster/raise-concern-authority-boundary.test.ts`: validates the native preflight and terminal state.
- `apps/api/src/modules/trust-ops/routes.test.ts`: verifies unverified and unassigned coach denials, a verified assigned coach allow, and the matching audit outcomes.

## Safety

No staging or production write was attempted. Fastify writes used the reset-on-exit seed fixture only.
