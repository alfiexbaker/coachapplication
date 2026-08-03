# QA-092 — coach discovery result-card signal

## Scope

Athlete `/book-coach` result cards on native iOS with local development mock data. No booking or account data was changed.

## Findings and fix

Result cards treated a short coach bio as a decorative testimonial and gave it a large speech-bubble panel. That made the list slower to scan and looked generated rather than deliberate. The cards now contain the signals needed to choose: verified name, rating, distance, price, football focus, next availability and booking action. The full profile remains the place for a bio.

The same screen surfaced an arbitrary mock minute-level time (`Tomorrow 02:22`). Search results now show date-level availability (`Next: Tomorrow`); the booking flow selects the actual slot.

## Native evidence

- `before.png` — result cards included the speech-bubble bio and arbitrary time.
- `after.png` — three coach cards are scannable; `Next: Tomorrow` is clear and the booking action remains direct.

## Verification

- `npm run typecheck` — passed.
- `npm run test:compile` — passed.
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/discover/book-coach-screen.test.js .tmp-tests/__tests__/book-coach.snapshot.js` — passed (3/3).
- Focused ESLint and `git diff --check` — passed.

## External systems

Local presentation change only. No Fastify request, Supabase query or mutation, audit-event write, Sentry event, or booking submission occurred. Native semantic traversal remains unavailable under ENV-006.
