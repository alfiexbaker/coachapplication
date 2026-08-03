# Child progress route authority — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent.

| Flow | Result | Evidence |
| --- | --- | --- |
| Athlete `user1` → `/development/child-progress/user2` before fix | **Critical leak:** birth date, allergy, emergency contacts, phone numbers, and coach notes rendered | `athlete-cross-child-progress-before.png` |
| Parent `user4` → `/development/child-progress/user2` after fix | Allowed; route resolves the requested child `user2` | `parent-requested-child-progress-after.png` |
| Athlete `user1` → `/development/child-progress/user2` after fix | Denied; no progress or child-health data rendered | `athlete-cross-child-progress-denied-after.png` |

Fix: prove the shared child-management authority before any profile, progress, feedback, or badge read. An explicit route child ID now takes precedence over stored active-child state. Permission denials are direct non-retry states.

Verification: focused lint; isolated test compile; two focused authority assertions; root typecheck; native iOS screenshots above. React Doctor has no blocker and one pre-existing giant-component maintainability warning; it is intentionally not refactored inside this authority fix.
