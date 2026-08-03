# Roster detail identity — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent.

| Flow | Result | Evidence |
| --- | --- | --- |
| Assigned coach `coach1` → `/roster/user2` before fix | The player hero rendered the raw internal identifier `user2` and an initial `U`. | `coach-roster-detail-before.png` |
| Assigned coach `coach1` → `/roster/user2` after fix | The hero renders the authenticated demo identity `Maisie Barton` and initials `MB`. | `coach-roster-detail-after.png` |

Fix: make the mock roster detail follow the same display-name hydration path as the roster list. The child fixture now agrees with the authenticated demo identity for `user2`.

Verification: focused lint; isolated test compile; roster-service test suite (13/13); root typecheck; actual native iOS before and after screenshots. The next-session fixture still presents a date-only value as `00:00`; that is recorded for the next flow and is not hidden by this result.
