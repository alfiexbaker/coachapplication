# QA-089 — idle mock offline-banner noise

## Scope

- Route: `/development/my-progress`
- Role: athlete
- Runtime: iPhone 16 Pro Max simulator `902FA3F5-08F8-417B-B60E-9245A9B86EC6` in local development mock native-audit mode
- Safety: no write was submitted. No staging or production request or mutation occurred.

## Defect and correction

The mock audit runtime is intentionally disconnected from live services. With no queued change, it still showed an oversized global offline banner above every product screen. It displaced the actual page content and made the app read as a demo rather than a finished native product.

The banner now appears in mock mode only when there is a queued change, an active or failed sync, or a reconnection result. API mode still shows an offline connection warning. The existing failed-sync retry and accessibility alert behavior are retained.

## Native evidence

| State | Result | Screenshot |
| --- | --- | --- |
| Idle mock before | A global yellow offline banner occupied the top of the athlete screen without any pending change. | `before-idle-mock.png` |
| Idle mock after | My Progress begins with its normal header and content; no irrelevant warning consumes product chrome. | `after-idle-mock.png` |

## Verification

- Focused connection-status contract test passed (2 tests), including API-mode wording and idle mock suppression.
- `npm run test:compile` and focused ESLint passed.
- The final native iOS screenshot was captured after the hot reload settled.

## External systems

- This is a local mock display-state correction only; Fastify, Supabase, audit events, and Sentry are not involved.
- Native semantic traversal remains blocked by local Developer Tools security (`ENV-006`); rendered simulator evidence is included.
