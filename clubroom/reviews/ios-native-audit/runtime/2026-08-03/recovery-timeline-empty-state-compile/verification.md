# QA-090 — recovery timeline empty-state build repair

## Scope

`/health/[id]` recovery timeline empty state. Local development mock audit only; no account, database, or production data changed.

## Finding and fix

QA-088 removed `TimelineEmptyState` while `RecoveryTimeline` still imported and rendered it. That left the app unable to typecheck. The export is restored with one concise, readable empty state: `No recovery notes`.

## Verification

- `npm run typecheck` — passed.
- `npm run test:compile` — passed.
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/health/recovery-timeline-empty-state.test.js` — passed (1/1).
- Focused ESLint — passed.
- Native iOS direct open of an unrelated injury remained default-deny (`Injury unavailable`); no mock injury data was altered merely to manufacture an empty-state screenshot.

## External systems

This is a local component/build repair. It makes no Fastify request, Supabase query or mutation, audit-event write, or Sentry event. Semantic iOS traversal remains unavailable under ENV-006 (host DevTools security), so native evidence is retained through direct deep links and simulator screenshots.
