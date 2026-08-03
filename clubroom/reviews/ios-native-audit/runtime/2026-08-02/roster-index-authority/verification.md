# Roster index authority — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent.

| Flow | Result | Evidence |
| --- | --- | --- |
| Athlete `user1` → `/roster` before fix | The roster route showed a coach-oriented loading skeleton after the route settled. No player data was rendered. | `athlete-before-stuck.png` |
| Athlete `user1` → `/roster` after fix and a clean local app restart | The route resolves to `Roster access unavailable`; no retry or roster data is exposed. | `athlete-terminal-after.png` |
| Coach `coach1` → `/roster` after fix | The five-player roster loads with correct player and family names. | `assigned-coach-allowed-after.png` |

Fix: the roster load now explicitly requires the authenticated role `COACH`, re-evaluates when that role changes, and treats an unauthorised result as terminal. It does not alter roster storage, the Fastify API or any data.

Verification: focused lint; isolated test compile; authority-boundary test; root typecheck; native iOS cold-restart denied path and authorised coach path. The React Doctor baseline still contains the unrelated concurrent `hooks/use-group-session.ts` compiler diagnostic.
