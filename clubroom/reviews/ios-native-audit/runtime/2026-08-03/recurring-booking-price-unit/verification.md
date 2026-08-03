# QA-096 — recurring booking price unit and copy

## Scope

Athlete and parent recurring-booking selection and summary. Local mock audit only; no booking was submitted and no external service was called.

## Finding and fix

The screen presented its coach price and monthly estimate in US dollars while Clubroom's booking and recurring components use pounds. It also referred to the user's outcome as a generic "subscription". The screen now uses pounds consistently and labels the action as a recurring booking.

## Verification

- `npx tsc -p tsconfig.test.json --listFiles --pretty false` includes the focused test.
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/recurring/subscribe-price-unit.test.js` passed.
- Targeted ESLint passed.
- Full TypeScript checking passed before the final error-label-only amendment.

## Limitation

ENV-008 prevents a native after screenshot. The source contract is verified, but its native retest remains pending until Clubroom can launch on a working iOS device.
