# Native role entry and development cleanup

Date: 2026-08-02

## Scope

This slice adds a local-only role-entry harness so the real iOS development client can be inspected without real credentials, Fastify mutations, Supabase access, or production data. It also removes two misleading development warning surfaces and an empty coach-home card found during that inspection.

## Guard contract

The `clubroom://revyl-auth` link is ignored outside the test/native-audit runtime. In native audit it additionally requires all of:

- `EXPO_PUBLIC_ENV=development`
- `EXPO_PUBLIC_NATIVE_AUDIT_TEST_MODE=true`
- `EXPO_PUBLIC_USE_MOCK=true`
- `EXPO_PUBLIC_REVYL_AUTH_BYPASS_ENABLED=true`
- an exact local token
- an allowlisted role and redirect

It calls the existing mock login path only. Staging and production reject mock mode; no API, database, RLS, audit-event, or Sentry mutation was performed.

## Device evidence

Booted simulator: iPhone 16 Pro Max (`902FA3F5-08F8-417B-B60E-9245A9B86EC6`)

| Check | Result | Evidence |
| --- | --- | --- |
| Forged role-entry token retains the existing coach session | passed | Metro logs show no subsequent login; the backstop returned to the existing tab |
| Coach role entry opens the authenticated coach runtime | passed | `coach-home.png` |
| Parent role entry opens the authenticated family runtime | passed | `parent-home.png` |
| Athlete role entry opens My Progress | passed | `athlete-progress.png` |
| Admin role entry opens Users | passed | `admin-users.png` |
| Expected simulator push limitation does not raise an Expo warning overlay | passed | simulator logs record an info event only; `parent-home.png` has no overlay |
| Mock-only legacy sensitive-fixture read does not raise an Expo warning overlay | passed | simulator logs record a debug event only; backend API mode remains delegated to family health authority |
| Coach home does not render an empty Recent sessions card | passed | `coach-home.png` |

## Validation

- Focused ESLint: passed.
- `tsc -p tsconfig.test.json`: passed.
- Focused Node tests: 47 passed (safety, push notification, runtime config, and role-entry parser).
- Root `npm run typecheck`: passed.
- React Doctor staged audit: no issues found.
- Device screenshots: manually reviewed at native resolution.

## Remaining scope

The role-entry harness unlocks the rest of the native route and state audit. It does not substitute for API-mode, staging, Supabase/RLS, audit-event, Sentry, accessibility automation, or destructive-flow checks; those remain separately tracked in the coverage ledger.
