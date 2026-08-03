# QA-095 — coach discovery price-unit consistency

## Scope

Athlete coach search and map result pricing. No booking or external state was changed.

## Finding and fix

The search cards rendered `£45/hr`, but the same coach and the data contract use session pricing. This made the price look inconsistent when switching between list and map. The shared discovery metadata now says `£45/session`; map and compact cards already use session wording.

## Verification

- `npm run typecheck` — passed.
- `npm run test:compile` — passed.
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/discover/book-coach-screen.test.js .tmp-tests/__tests__/book-coach.snapshot.js` — passed (3/3).
- Focused ESLint and `git diff --check` — passed.
- The contract requires `/session` and rejects `/hr` in the shared discovery metadata component.

## Native retest limitation

`before-price-unit.png` records the inconsistent native list. The post-fix native retest remains pending ENV-007 local simulator recovery; no after screenshot is claimed.

## External systems

Presentation-only change. No Fastify request, Supabase query or mutation, audit-event write, Sentry event, or booking submission occurred.
