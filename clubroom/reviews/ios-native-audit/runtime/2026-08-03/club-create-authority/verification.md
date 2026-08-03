# Club creation authority and setup verification

## Scope

`ROUTE-052` covers `app/club/create.tsx`, `hooks/use-create-club.ts`, `services/club-authority-service.ts`, and `POST /v1/clubs`. This was a local source and isolated-seed-Fastify audit. No staging or production request or mutation was made.

## Findings fixed

- The creation screen led with a motivational hero, a fake club preview, and a generic feature checklist. None affected the creation outcome, so all three were removed rather than restyled.
- City was required but had no focused field error. It now validates after blur and when submission is attempted.
- A signed-out creation attempt failed silently. It now reports that sign-in is required.
- A blank country can no longer submit an empty string; the existing UK default is retained at the API boundary.
- `FormInput` now supplies text-field accessibility labels and lets a caller's `maxLength` override its general 100-character default. The badge field therefore enforces its visible four-character limit structurally as well as in its change handler.

## Authority trace

```text
Create Club -> useCreateClub -> clubAuthorityService.createClub
  -> POST /v1/clubs -> club authority repository
  -> Club + owner ClubMembership + member primary invite + optional first-staff invite
  -> club.create audit event -> setup-complete route
```

The Fastify route requires an authenticated actor. The resulting actor is the club owner; a supplied first-staff role creates the optional staff invite. The client remains behind `clubAuthorityService` and uses the API in non-mock mode.

## Validation

```text
npm run test:compile
# pass

node --require ./scripts/test-register.js --test \
  .tmp-tests/__tests__/hooks/create-club-minimal-flow.test.js
# 1 pass; 0 fail

npx eslint hooks/use-create-club.ts app/club/create.tsx \
  __tests__/hooks/create-club-minimal-flow.test.ts hooks/use-club-calendar.ts
# pass; 0 warnings; 0 errors

npm run typecheck
# pass after a strict-null correction in the already-audited calendar route

cd apps/api
NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test \
  --test-name-pattern='creates, updates, and soft-deletes clubs through governed v1 authority' \
  src/modules/coach-club/routes.test.ts
# 1 pass; 41 skipped; 0 fail
```

The Fastify case creates a club with an owner membership, member invite, and first coach invite. It asserts one `club.create` success audit event. Its later outsider checks assert hidden detail (`404`) and denied update/delete (`403`) with the corresponding update/archive denial audit events. Creation denial is implemented by the route but was not invoked by this test case.

## Explicit limits

- Native iOS interaction, semantic traversal, Dynamic Type, and VoiceOver remain blocked by `ENV-009` CoreSimulator XPC installation failure.
- Direct Supabase per-flow RLS verification remains unavailable under `ENV-003`.
- Sentry issue and event reads remain unavailable under `ENV-004`.
