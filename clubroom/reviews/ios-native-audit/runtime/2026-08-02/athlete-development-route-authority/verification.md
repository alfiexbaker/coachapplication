# Athlete development route authority — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent.

| Flow | Result | Evidence |
| --- | --- | --- |
| Athlete `user1` → `/development/athlete/user2` before fix | **Critical leak:** another player's name, position, allergy count, and parent-note count rendered | `athlete-cross-detail-before.png` |
| Athlete `user1` → `/development/athlete/user2/special-needs` before fix | **Critical leak:** parent communication/behaviour notes and allergy detail rendered | `athlete-cross-needs-before.png` |
| Athlete `user1` → either user2 route after fix | Denied with no player, medical, or parent data and no retry action | `athlete-cross-detail-denied-after.png`; `athlete-cross-needs-denied-after.png` |
| Parent `user4` → `/development/athlete/user2/special-needs` after fix | Allowed for the declared child | `parent-child-needs-allowed-after.png` |
| Coach `coach1` → `/development/athlete/user2` after fix | Allowed for the assigned roster player | `assigned-coach-detail-allowed-after.png` |
| Athlete `user1` → `/development/athlete/user1` after fix | Allowed for self | `athlete-self-detail-allowed-after.png` |
| Admin `admin` → `/development/athlete/user2` after fix | Denied; privileged application administration does not imply health-data access | `admin-cross-detail-denied-after.png` |

Fix: before reading any mock profile, health-adjacent detail, sessions, feedback, or badge data, prove player self, declared-parent, or assigned-coach authority. API mode remains delegated to Fastify's existing health-read boundary. Permission denials have no retry action.

Verification: focused lint; isolated test compile; two focused authority assertions; root typecheck; actual native iOS before/after screenshots above. The first coach retest exposed a missing roster-service import and failed closed; it was fixed before the final full relationship retest. React Doctor reports no issue in this slice; its only changed-file diagnostic is a concurrent, unrelated `hooks/use-group-session.ts` compiler warning.
