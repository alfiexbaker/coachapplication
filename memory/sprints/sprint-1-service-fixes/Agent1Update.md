# Sprint 1 — Critical Service Fixes
## Agent 1: Auth Service Rewrite

**Status**: DONE
**Blocked by**: ~~Sprint 0~~ (unblocked)

---

## Objective
Rewrite auth-service.ts to comply with ALL architectural rules: apiClient for storage, Result<T,E> pattern, no exceptions, proper logging.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch these files. No other agent touches them.**
```
clubroom/services/auth-service.ts
```

**DO NOT TOUCH** (owned by other agents or out of scope):
- coach-service.ts (Agent 2)
- Any other service file (Agent 3)
- Any screen, component, or hook file

## Tasks

- [x] **1. Replace AsyncStorage with apiClient**
  - Replaced `import AsyncStorage from '@react-native-async-storage/async-storage'` with `import { apiClient } from './api-client'`
  - Replaced all 18 `AsyncStorage.getItem/setItem/removeItem` calls with `apiClient.get/set/remove`
  - Used local STORAGE_KEYS constants (same key strings as before)
  - Circular dependency with api-client.ts is safe (lazy runtime access)

- [x] **2. Replace AuthResult with Result<T, ServiceError>**
  - Added `import { type Result, type ServiceError, ok, err, unauthorized, networkError } from '@/types/result'`
  - Created new `AuthData` interface: `{ user: UserProfile; tokens?: AuthTokens; token?: string }`
  - Changed all method return types from `Promise<AuthResult>` to `Promise<Result<AuthData, ServiceError>>`
  - Replaced `return { success: true, user, tokens, token }` with `return ok({ user, tokens, token })`
  - Replaced `return { success: false, error: msg }` with `return err(unauthorized(msg))` or `err({ code, message })`
  - Kept `AuthResult` interface as deprecated export for backward compatibility
  - No external files import `AuthResult` type directly, so no callers broken

- [x] **3. Replace throw with err() returns (where possible)**
  - `apiFetch` helper: replaced `throw new Error(...)` pattern with `return err(networkError(...))` / `return err(unauthorized(...))`
  - `refreshToken()`: two `throw` statements KEPT intentionally — `api-client.ts` calls this method and catches the thrown error. Changing to Result<> would break the api-client.ts contract which we cannot modify.
  - `forgotPassword()` and `resetPassword()`: updated to use `apiFetch` Result pattern properly

- [x] **4. Add createLogger()**
  - Already present (`createLogger('AuthService')`) — no changes needed
  - No `console.log/warn/error` found in file

- [x] **5. Replace deprecated substr()**
  - Replaced 4 instances of `.substr(start, length)` with `.substring(start, end)`
  - Lines affected: generateId(), generateToken(), generateMockTokens()

## Safety Checks (all passing)
- [x] `grep "AsyncStorage" services/auth-service.ts` returns 0 code results (only in doc comment)
- [x] `grep "from '@react-native-async-storage" services/auth-service.ts` returns 0 results
- [x] `grep "console\." services/auth-service.ts` returns 0 results
- [x] `grep "substr(" services/auth-service.ts` returns 0 results
- [x] VS Code diagnostics: 0 errors on auth-service.ts
- [x] VS Code diagnostics: 0 errors on use-auth.tsx (main consumer)
- [x] VS Code diagnostics: 0 errors on api-client.ts (circular dep consumer)
- [x] VS Code diagnostics: 0 errors on onboarding-screen.tsx (type consumer)

## Files Modified
- `clubroom/services/auth-service.ts` — full rewrite (AsyncStorage->apiClient, AuthResult->Result, substr->substring)

## Blockers
_None_

## Notes
- `refreshToken()` intentionally still throws (not Result<>). It's called by `api-client.ts` lines 126/134 which expects throw-on-failure. Changing this would require modifying api-client.ts which is out of scope.
- `AuthResult` kept as deprecated type export. No external consumers currently import it (only used internally), but it's preserved for safety.
- New `AuthData` type exported for consumers who want the Result-based return type data shape.
- Circular dependency between auth-service.ts and api-client.ts works because both access each other lazily at runtime (inside async methods), not at module evaluation time.
- `requestPasswordReset()` returns `{ success: boolean; error?: string }` (not Result<>). This is a minor inconsistency but changing it would require updating its caller, which is out of scope.
