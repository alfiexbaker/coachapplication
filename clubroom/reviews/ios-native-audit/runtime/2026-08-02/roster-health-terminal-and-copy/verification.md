# Roster health terminal state and copy — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent.

| Flow | Result | Evidence |
| --- | --- | --- |
| Athlete `user1` → `/roster/user2/health` before fix | No health data was exposed, but a generic error with an unusable `Try again` control appeared. | `athlete-cross-before.png` |
| Athlete `user1` → `/roster/user2/health` after fix | A direct Health review unavailable state has no retry and no player data. | `athlete-cross-terminal-after.png` |
| Assigned coach `coach1` → `/roster/user2/health` after fix | The coach sees `Maisie Barton · Chris Barton`, factual healthy-state copy, and the existing coach-visible health information. | `assigned-coach-allowed-after.png` |

Fix: terminal roster health failures now omit retry. The mock roster aligns user1–3 parent identifiers with authenticated family identities so player details do not render `Parent`. The healthy card uses factual coach-scope copy, and the privacy explanation is shorter without removing its trust boundary.

Verification: focused lint; isolated test compile; roster service and health terminal tests (16/16); root typecheck; actual native iOS before and after screenshots. React Doctor remains clean for this slice; its only diagnostic is the unrelated concurrent `hooks/use-group-session.ts` compiler warning.
