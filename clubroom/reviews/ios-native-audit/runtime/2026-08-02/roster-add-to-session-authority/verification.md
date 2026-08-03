# Roster add-to-session authority — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent.

| Flow | Result | Evidence |
| --- | --- | --- |
| Athlete `user1` → `/roster/user2/add-to-session` before fix | The athlete reached coach-only session-creation choices and the player name came from the URL. The screen also duplicated each action with labels, badges, CTA pills, and helper prose. | `athlete-cross-before.png` |
| Athlete `user1` → `/roster/user2/add-to-session` after fix | A terminal unavailable state has no player data, session action, or retry. | `athlete-cross-denied-after.png` |
| Assigned coach `coach1` → `/roster/user2/add-to-session?athleteName=Injected` after fix | The coach sees two direct choices only. The verified roster name is `Maisie Barton`; the URL value is ignored. | `assigned-coach-allowed-after.png` |

Fix: require a coach role and an assigned roster entry before rendering. Session choices now use the roster-derived name. The authorised surface has one tappable card per outcome: `New session` or `Existing session`.

Verification: focused lint; isolated test compile; focused authority/UI assertion; root typecheck; actual native iOS before and after screenshots. React Doctor no longer reports a Fast Refresh component-export warning for the revised cards; the separate `useScreen` callback warning is recorded under QA-065, and the concurrent `use-group-session.ts` compiler warning remains outside this slice.
