# Roster consents authority and copy — 2026-08-02

Scope: local iPhone 16 Pro Max development audit only. No production or staging request was sent and no consent was changed.

| Flow | Result | Evidence |
| --- | --- | --- |
| Athlete `user1` → `/roster/consents` before fix | The sensitive coach dashboard route remained on a loading skeleton. No consent records were rendered. | `athlete-before-stuck.png` |
| Athlete `user1` → `/roster/consents` after fix and a clean local app restart | The route resolves to `Consent access unavailable`; no retry or consent record is exposed. | `athlete-terminal-after.png` |
| Coach `coach1` → `/roster/consents` after fix | The dashboard loads consent records. Cards now say `Consent status` rather than the generic `Parent`, and `Emergency Treatment` wraps in the summary rather than truncating. | `assigned-coach-allowed-after.png` |

Fix: loading now explicitly requires the authenticated role `COACH`, role changes trigger a reload, and an unauthorised response is terminal. The visual adjustment removes an untruthful generic label and preserves full consent-category wording. It does not alter data, RLS, the Fastify route or audit events.

Verification: focused lint; isolated test compile; authority-and-copy test; root typecheck; actual native iOS before and after screenshots. Fastify's existing consent route continues to enforce coach-or-privileged-admin access and records success and denial audit events; this local mock UI audit did not call it. The concurrent `hooks/use-group-session.ts` React Compiler diagnostic remains outside this slice.
