# Last Step Handoff

Date: 2026-04-12

## What Was Just Done

1. Finished `AUTHZ-03` by moving the remaining privileged admin and staff-invite decisions onto shared helpers in `apps/api/src/lib/authz.ts`.
2. Replaced duplicated route-local role checks across `/v1/clubs*`, `/v1/families/:familyId`, booking invite/group-session routes, and `wave2plus` admin/invoice routes with shared backend authz helpers.
3. Tightened the event RSVP membership check to require an active club membership unless the actor is a privileged admin.
4. Added regression coverage proving `security_admin` can list clubs and use invoice admin paths.
5. Synced the canonical trust/runtime docs and sprint backlog to reflect `AUTHZ-03` completion.

## Verification Run In This Step

- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`43/43`)

## Current State

- `AUTH-02`, `TRUST-01`, `BOOK-01`, `OBS-01`, and `AUTHZ-03` are complete in code.
- Privileged admin and staff invite access is now backend-owned for the current `/v1` trust/commercial routes instead of being split across route-local checks.
- The sprint backlog is now recut around the remaining real seams: commerce authority, release hardening, and the football-first home layer.

## Next Exact Action

1. Start `COMMERCE-01`: make coach and club offers authoritative and easier to buy, beginning with the real go-live state and authoritative coach offerings.
