# QA-094 — bookings find-coach action

## Scope

The bookings discover feed and its empty state. This is a local presentation and navigation-label simplification; no booking or external data was changed.

## Finding and fix

The bookings tab promoted `Map-first coach search` with generic explanatory copy and a second nested action. It now exposes one clear card action: `Find a coach`. The empty state uses the same outcome label. The map remains the destination selected by the existing handler.

## Verification

- `npm run typecheck` — passed.
- `npm run test:compile` — passed.
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/bookings/discover-feed-copy.test.js` — passed (1/1).
- Focused ESLint and `git diff --check` — passed.
- The contract preserves the existing `handleFindCoachPress` callback and rejects both removed marketing phrases.

## Native retest limitation

Native retest is pending the same local iPhone simulator SpringBoard recovery recorded in QA-093. No after screenshot is claimed.

## External systems

No Fastify request, Supabase query or mutation, audit-event write, Sentry event, or booking submission occurred.
