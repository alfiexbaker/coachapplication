# Roster next-session time — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent.

| Flow | Result | Evidence |
| --- | --- | --- |
| Assigned coach `coach1` → `/roster/user2` before fix | A date-only fixture rendered as `Mon, 12 Jan at 00:00`, inventing a midnight appointment. | `coach-roster-next-session-before.png` |
| Assigned coach `coach1` → `/roster/user2` after fix | The same fixture renders `Mon, 12 Jan · Time TBC` on one line. Explicitly timed sessions retain their time. | `coach-roster-next-session-after.png` |

Fix: distinguish a date-only value from a timestamp. A date-only value is parsed at local noon for a stable calendar date and is labelled `Time TBC`; a supplied timestamp retains its time. Invalid values fall back to `Date to be confirmed`.

Verification: focused lint; isolated test compile; focused formatter test (3/3); root typecheck; actual native iOS before and after screenshots. React Native Testing Library is not installed in this repository, so the component is verified through its pure formatter contract and the actual iOS render.
