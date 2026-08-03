# Roster terminal access state — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent.

| Flow | Result | Evidence |
| --- | --- | --- |
| Athlete `user1` → `/roster/user2` before fix | Data remained protected, but the terminal `Athlete not found` state exposed a dead `Try again` action | `athlete-cross-roster-before.png` |
| Athlete `user1` → `/roster/user2` after fix | Direct non-enumerating unavailable state; no retry or protected control | `athlete-cross-roster-after.png` |

Fix: retain retry only for transient errors. `NOT_FOUND` and `UNAUTHORIZED` outcomes are terminal roster-access states with direct copy and no action that cannot work.

Verification: focused lint; isolated test compile; one focused assertion; root typecheck; actual native iOS after screenshot above. React Doctor reports no roster-slice issue; its only changed-file diagnostic is the unrelated concurrent `hooks/use-group-session.ts` compiler warning.
