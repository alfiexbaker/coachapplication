# Roster emergency authority boundary — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent.

| Flow | Result | Evidence |
| --- | --- | --- |
| Athlete `user1` → `/roster/user2/emergency` before fix | The direct route exposed another player's medical alert, emergency contacts, phone number, and pickup information. | `athlete-cross-emergency-before.png` |
| Athlete `user1` → `/roster/user2/emergency` after fix | The route stops before the emergency-data service. It shows a direct unavailable state with no retry and no sensitive data. | `athlete-cross-emergency-denied-after.png` |
| Assigned coach `coach1` → `/roster/user2/emergency` after fix | The rostered coach can still open the intended emergency information. | `assigned-coach-emergency-allowed-after.png` |

Fix: require a coach-and-athlete roster entry before asking the safety service for emergency data. A missing entry is a terminal, non-enumerating unavailable state; retry remains available only for transient failures.

Verification: focused lint; isolated test compile; focused authority assertion; root typecheck; actual native iOS before and after screenshots. React Doctor reports no emergency-slice issue; its only changed-file diagnostic is the unrelated concurrent `hooks/use-group-session.ts` compiler warning.
