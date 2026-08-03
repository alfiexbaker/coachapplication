# Roster concern authority — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent, and no concern was submitted.

| Flow | Result | Evidence |
| --- | --- | --- |
| Athlete `user1` → `/roster/user2/raise-concern` before fix | No concern form was exposed, but the failure was generic and offered an unusable `Try again` control. | `athlete-cross-before.png` |
| Athlete `user1` → `/roster/user2/raise-concern` after fix | A direct concern-access-unavailable state has no retry and no player data. | `athlete-cross-terminal-after.png` |
| Assigned coach `coach1` → `/roster/user2/raise-concern` after fix | The coach sees `Maisie Barton`, selectable concern categories, severity control and the record form. | `assigned-coach-allowed-after.png` |

Fix: the screen now explicitly requires the authenticated role `COACH`, requires a roster entry before rendering, and treats missing or unauthorised roster access as terminal. It does not alter the Fastify safeguarding API or write any data.

Verification: focused lint; isolated test compile; authority-boundary test; root typecheck; actual native iOS before and after screenshots. The repository's concurrent `hooks/use-group-session.ts` React Compiler warning remains outside this slice.
