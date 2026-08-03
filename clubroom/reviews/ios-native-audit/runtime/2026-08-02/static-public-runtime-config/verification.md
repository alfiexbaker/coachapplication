# Static public runtime-config verification

Date: 2026-08-02 BST
Scope: Expo frontend environment, API mode, feature flags, Sentry, and UI runtime values

## Defect

`constants/config.ts` constructed `EXPO_PUBLIC_*` names dynamically and read them through `process.env[envKey]`. Metro cannot statically inline that access. Its preferred Expo Constants path was also ineffective because app config exposes camelCase/nested `extra` values while the reader looked for uppercase flat keys. Builds could silently use defaults instead of their intended API URL, mode, feature, Sentry, or UI values.

## Fix

- Forty-one supported frontend values now use explicit `process.env.EXPO_PUBLIC_*` property reads.
- Helper keys are constrained to the allowlist at compile time.
- Every existing default and fail-fast rule is unchanged.
- Only `EXPO_PUBLIC_*` values are included; no server secret or non-public environment key was added.
- The canonical runtime-mode document now prohibits dynamic frontend environment access.

## Verification

- Root TypeScript typecheck passed.
- Runtime-mode configuration suite passed: 6/6 tests.
- The new test proved explicit API URL, timeout, payments flag, public Sentry DSN, and currency values reach runtime config and that `process.env[` is absent.
- `expo config --type public` under a staging fixture returned `Clubroom (Staging)`, the exact staging API URL, `useMock=false`, and `env=staging`.
- React Doctor 0.9.3 analyzed `constants/config.ts` and returned zero diagnostics for the changed slice.
- Focused ESLint, Prettier, and `git diff --check` passed.

No production or staging service, token, Sentry event, API request, or database data was accessed or changed.
