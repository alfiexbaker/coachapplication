# QA-091 — coach discovery simplification

## Scope

Athlete `/book-coach` on native iOS with the local development mock. The route was opened directly after authenticated athlete handoff. No booking was submitted and no external system was mutated.

## Finding

The search entry was carrying a giant `MAP-FIRST DISCOVERY` sales panel with generic pitch copy and three decorative aggregates. It put invented product marketing ahead of the job: choose a credible nearby football coach and book them.

## Fix

Keep the useful location selector as the signature control. Reduce the header to `Find a coach`, search and existing filters. Preserve map access, coach cards, availability, price, focus tags, verification and `Book Now`. The results count already communicates availability, so the redundant metrics are gone.

## Native evidence

- `before.png` — previous native screen with the oversized promotional panel.
- `after.png` — settled native screen after the change; controls and bookable results remain visible without the panel.

## Verification

- `npm run typecheck` — passed.
- `npm run test:compile` — passed.
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/discover/book-coach-screen.test.js .tmp-tests/__tests__/book-coach.snapshot.js` — passed (3/3).
- Focused ESLint and `git diff --check` — passed.
- The focused contract preserves map navigation, filters and `onBookNow` while preventing the removed promotional copy and metric labels from returning.

## External systems

The settled local mock view made no Fastify call, Supabase query or mutation, audit-event write, or Sentry event. Native semantic traversal remains blocked by ENV-006 (host DevTools security); screenshots use direct simulator deep links.
