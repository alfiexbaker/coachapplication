# Last Step Handoff

Date: 2026-04-12

## What Was Just Done

1. Finished `RELEASE-01` by removing the shell `grep` dependency from `scripts/check-row-balance.js`; it now uses the repo-native file scanner like the other UI audit scripts.
2. Switched `services/club-service.ts` dashboard and recent-results reads onto `apiFetch`, removing the remaining release-hostile raw relative fetches from that launch-adjacent club surface.
3. Re-ran the row-balance audit and repo typecheck successfully.
4. Synced the canonical runtime doc to reflect the release-hardening changes.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `node scripts/check-row-balance.js` -> PASS

## Current State

- `AUTH-02`, `TRUST-01`, `BOOK-01`, `OBS-01`, and `AUTHZ-03` are complete in code.
- Coach-profile commerce state now uses backend-owned offerings and go-live writes in non-mock mode instead of local-only placeholders.
- The remaining real seam is the football-first home layer.

## Next Exact Action

1. Start `HOME-01`: add compact football-first home modules for results and club highlights without broadening the home surface.
