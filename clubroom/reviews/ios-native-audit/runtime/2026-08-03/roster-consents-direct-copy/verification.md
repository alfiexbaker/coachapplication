# QA-099 — roster consents direct copy and authority

## Scope

Coach roster consent overview, filters, search, role denial, and the roster-consent API projection. API execution used only the local seeded and fixture stores; no production, staging, player, family, consent, audit, or permission data was changed.

## Finding and fix

The access model was already correctly coach-scoped, but its product surface read like a generic admin dashboard. The screen now says `Consents`, uses player language, and describes the exact decision: review player consents before posting.

## Verification

- App contracts passed for coach-only loading, terminal access denial, authoritative summary failure handling, filters, accessibility labels, and direct copy.
- `roster-consents.routes.test.ts` passed with two tests: assigned roster projections and filters succeed; outsiders are denied and allowed/denied reads are audited; the equivalent db fixture projection also passed.
- Targeted ESLint passed.

## Limitation

ENV-008 blocks native iOS retesting. This record proves UI source and API behavior only.
