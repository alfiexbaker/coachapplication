# QA-098 — emergency access denial remains terminal

## Scope

Coach emergency quick access for a rostered athlete. The app was checked statically; API proof used the local seeded test backend only. No production, staging, athlete, family, medical, emergency-contact, audit, or permission state was changed.

## Finding and fix

The hook wrapped an API `UNAUTHORIZED` result as `UNKNOWN`. The screen therefore displayed a retry affordance after access had been denied, despite its own terminal-denial policy. The hook now preserves the service error code so the existing screen branch shows its unavailable state without retry or cached data.

## Verification

- Focused app contract passed: an API access denial is returned unchanged and the screen has no retry for `UNAUTHORIZED` or `NOT_FOUND`.
- Targeted ESLint passed.
- `emergency-read-authority.routes.test.ts` passed against the local seeded API: unverified coach reads returned 403; verified assigned coach reads returned 200; `medical.read` and `emergency_contacts.read` were audited.

## Limitation

ENV-008 blocks the native iOS retest. The app and API proof are complete, but native visual evidence remains pending a working local Clubroom build.
