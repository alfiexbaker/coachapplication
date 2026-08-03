# Event creation authority and delivery verification

## Scope

`ROUTE-080` covers `app/events/create.tsx`, `hooks/use-create-event.ts`, event publishing from `hooks/use-event-detail.ts`, and the Fastify club-event write contract. The audit was limited to local test and seed data. No staging or production event, notification, database, Supabase, or Sentry state changed.

## Findings fixed

- Any readable club selected through the direct route could open the event wizard. The client now accepts only an active server-derived club-staff membership, including a requested `clubId`.
- The creation UI offered a `Coaches Only` audience even though Fastify's club invite route would notify every active member. The option is removed. Fastify now rejects both `COACHES` and `PARENTS` on create or update; it accepts only `ALL`, `SQUAD`, and `ATHLETES`, which the visibility and invite routes actually enforce. Legacy rows remain readable rather than being silently rewritten.
- A failed `publishEvent` Result used to fall through to invitation and navigation. It now leaves the event as a draft and reports that fact.
- Invitation failure after a successful publish no longer reports a complete success. The event workspace exposes `Send invitations` to the same staff authority so a staff member can make the real retry.
- Draft publish and cancellation controls now use server-derived event-staff workspace authority instead of creator-only UI gating.

## Validation

```text
npm run typecheck
# pass

npm run test:compile
# pass

node --require ./scripts/test-register.js --test \
  .tmp-tests/__tests__/hooks/event-create-publish-authority-boundary.test.js \
  .tmp-tests/__tests__/hooks/create-event-club-context.test.js \
  .tmp-tests/__tests__/services/event/event-crud-service-api-mode.test.js
# 4 pass; 0 fail

cd apps/api
NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test \
  --test-name-pattern='rejects role-scoped event audiences the API cannot enforce' \
  src/modules/booking/routes.test.ts
# 1 pass; 52 skipped; 0 fail
```

The Fastify test asserts that a staff actor receives `400` for `COACHES` and `PARENTS` creation claims, that a valid `ALL` event still creates, that a later `COACHES` patch is rejected, that persisted audience data remains `ALL`, and that the two rejected creates create audited `club_event.create` denials.

Focused ESLint found no errors. It reported only 18 existing warnings in the large booking route and route test; this slice did not broaden into that cleanup. React Doctor's remaining compiler error is the user-owned `hooks/use-group-session.ts:140`; it was not touched. Its two warnings in this hook are the intentional loading-state transitions before asynchronous authority and squad reads, plus pre-existing large-component and backend-loop warnings. No diagnostic was suppressed.

## Explicit limits

- Native interaction, native semantic tree inspection, Dynamic Type, and VoiceOver retest remain blocked by `ENV-009` CoreSimulator XPC installation failure.
- Supabase MCP/direct per-flow RLS verification remains unavailable under `ENV-003`.
- Sentry issue/event reading remains unavailable under `ENV-004`.
