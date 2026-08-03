# Route inventory and consent API authority — 2026-08-02

Scope: local static analysis and local Fastify fixture tests only. No production or staging request, mutation or destructive test was run.

| Check | Result |
| --- | --- |
| `npm run audit:loading-routes` | Passed. 151 route files are covered by the loading manifest; `submit-only=4`, `section-skeleton=101`, `static=23`, `warm-first=23`; one intentional fallback static route. |
| `npm run audit:pdos:routes -- --json` | Passed. 151 routes, zero routes needing a product decision, zero needing implementation. |
| `npm run audit:ui:quality` | Static controls passed: dead-action/native-popup lint, layout audit and loading-route audit. Browser flow suite was skipped because `http://localhost:8083` was not running. |
| `NODE_ENV=test API_DATA_BACKEND=seed apps/api/node_modules/.bin/tsx --test apps/api/src/modules/coach-club/roster-consents.routes.test.ts` | Passed 2/2. Assigned coach receives the roster-consent projection; outsider receives 403; `coach_roster_consents.read` success and denial audit assertions passed for the fixture backend. |

The route inventory establishes auditable static ownership, not a claim that every control received semantic device traversal. `ENV-006` remains open because the native semantic runner cannot attach until macOS Developer Tools security is enabled. Actual native iOS screenshots remain the runtime proof for the audited roster routes.
