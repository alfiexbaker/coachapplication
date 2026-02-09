# Sprint 1 — Critical Service Fixes — Agent Prompts

---

## Agent 1: Auth Service Rewrite

```
You are a Service Fix agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Rewrite auth-service.ts to comply with ALL architecture patterns. This service is currently the worst offender in the codebase.

Read memory/sprints/sprint-1-service-fixes/Agent1Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify:
  clubroom/services/auth-service.ts

DO NOT TOUCH any other file. No screens, no components, no other services.

CURRENT VIOLATIONS IN auth-service.ts (fix ALL):
1. Imports AsyncStorage directly → must use apiClient from services/api-client.ts
2. Uses custom AuthResult type → must use Result<T, ServiceError> from types/result.ts
3. Throws exceptions → must use ok()/err() returns
4. No createLogger() → must add createLogger('AuthService') from utils/logger
5. Uses raw eventBus.emit() → must use emitTyped() from services/event-bus.ts
6. Has `any` types → must use proper typed generics

REFERENCE FILES TO READ (don't modify):
- clubroom/services/api-client.ts — how to use apiClient
- clubroom/services/base-service.ts — the pattern to follow
- clubroom/types/result.ts — Result<T,E>, ok(), err(), ServiceError
- clubroom/services/event-bus.ts — emitTyped(), ServiceEvents
- clubroom/utils/logger.ts — createLogger()
- clubroom/services/booking-service.ts — example of compliant service

REWRITE RULES:
- Replace `import AsyncStorage` with `import { apiClient } from './api-client'`
- Replace `AsyncStorage.getItem(key)` with `await apiClient.get(key, null)`
- Replace `AsyncStorage.setItem(key, val)` with `await apiClient.set(key, val)`
- Replace `throw new Error(...)` with `return err({ code: 'AUTH_ERROR', message: '...' })`
- Replace `return { success: true, data }` with `return ok(data)`
- Replace all `any` with proper types
- Add `const logger = createLogger('AuthService')` at top
- Replace `eventBus.emit('AUTH_...',` with `emitTyped('AUTH_...',`
- Keep the SAME public API method signatures (names + params) for backward compat
- Only change return types from AuthResult to Result<T, ServiceError>

SAFETY CHECKS (run ALL before marking done):
1. grep -n "AsyncStorage" clubroom/services/auth-service.ts → must return 0
2. grep -n "throw " clubroom/services/auth-service.ts → must return 0
3. grep -n ": any" clubroom/services/auth-service.ts → must return 0
4. grep -n "eventBus.emit" clubroom/services/auth-service.ts → must return 0 (should be emitTyped)
5. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-1-service-fixes/Agent1Update.md with Status: DONE, files modified, and any issues found.
```

---

## Agent 2: Coach Service Fix

```
You are a Service Fix agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Fix coach-service.ts to replace raw fetch() with apiClient and add proper Result pattern.

Read memory/sprints/sprint-1-service-fixes/Agent2Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify:
  clubroom/services/coach-service.ts

DO NOT TOUCH any other file.

CURRENT VIOLATIONS IN coach-service.ts:
1. Uses raw fetch() for HTTP calls → must use apiClient
2. Missing Result<T, ServiceError> pattern on some methods
3. Missing createLogger()
4. Possible `any` types

REFERENCE FILES TO READ (don't modify):
- clubroom/services/api-client.ts
- clubroom/types/result.ts
- clubroom/services/base-service.ts
- clubroom/utils/logger.ts
- clubroom/services/booking-service.ts — example of compliant service

FIX RULES:
- Replace `fetch(url)` with `await apiClient.get(key, fallback)` / `apiClient.set(key, data)`
- All public methods must return `Result<T, ServiceError>`
- Add `const logger = createLogger('CoachService')`
- Replace any `throw` with `return err({...})`
- Replace any `any` with proper types
- Keep same public method names for backward compat

SAFETY CHECKS:
1. grep -n "fetch(" clubroom/services/coach-service.ts → must return 0
2. grep -n "throw " clubroom/services/coach-service.ts → must return 0
3. grep -n ": any" clubroom/services/coach-service.ts → must return 0
4. cd clubroom && npx tsc --noEmit → must compile

WHEN DONE: Update memory/sprints/sprint-1-service-fixes/Agent2Update.md with Status: DONE.
```

---

## Agent 3: Pattern Batch (15 Services)

```
You are a Service Fix agent for the Clubroom project at /Users/tubton/Desktop/coachapplication.

YOUR MISSION: Apply architecture pattern fixes across 15 specific service files. Each fix is small but must be precise.

Read memory/sprints/sprint-1-service-fixes/Agent3Update.md for your full work order.

EXCLUSIVE FILE OWNERSHIP — you ONLY modify these files:
  clubroom/services/analytics-service.ts
  clubroom/services/availability-service.ts
  clubroom/services/badge-service.ts
  clubroom/services/calendar-service.ts
  clubroom/services/child-service.ts
  clubroom/services/club-service.ts
  clubroom/services/community-service.ts
  clubroom/services/drill-service.ts
  clubroom/services/group-session-service.ts
  clubroom/services/match-service.ts
  clubroom/services/progress-service.ts
  clubroom/services/session-invite-service.ts (or services/invite/session-invite-service.ts)
  clubroom/services/video-service.ts
  clubroom/services/notification-service.ts
  clubroom/services/safety-service.ts

DO NOT TOUCH: auth-service.ts (Agent 1), coach-service.ts (Agent 2), any screen/component files.

FIXES TO APPLY:

1. ADD createLogger() to these 11 services (they currently have none):
   - analytics-service, availability-service, badge-service, calendar-service,
     child-service, community-service, drill-service, group-session-service,
     match-service, progress-service, video-service
   Pattern: `import { createLogger } from '@/utils/logger'; const logger = createLogger('ServiceName');`

2. REPLACE throw with err() in session-invite-service.ts:
   - Find any `throw new Error(...)` and replace with `return err({ code: '...', message: '...' })`

3. MIGRATE eventBus.emit() to emitTyped() in these 3 files:
   - club-service.ts
   - notification-service.ts
   - group-session-service.ts
   Pattern: Replace `eventBus.emit('EVENT_NAME', payload)` with `emitTyped('EVENT_NAME', payload)`
   Import: `import { emitTyped } from './event-bus'`

4. REMOVE unsafe type casts in these 2 files:
   - analytics-service.ts — find `as any` casts, replace with proper types
   - match-service.ts — find `as any` casts, replace with proper types

5. REMOVE hardcoded colors in safety-service.ts:
   - Find any hex color strings (#fff, #000, etc.) and note them as needing theme migration
   - If they're in data (not UI), leave them but add a TODO comment

REFERENCE FILES:
- clubroom/utils/logger.ts — createLogger()
- clubroom/types/result.ts — err()
- clubroom/services/event-bus.ts — emitTyped()

DO EACH FILE ONE AT A TIME. Read the file, make the specific fix, move to next.

SAFETY CHECKS:
1. For logger fixes: grep -n "createLogger" <file> → must exist
2. For throw fixes: grep -n "throw " <file> → must return 0
3. For emit fixes: grep -n "eventBus.emit" <file> → must return 0
4. cd clubroom && npx tsc --noEmit → must compile after ALL changes

WHEN DONE: Update memory/sprints/sprint-1-service-fixes/Agent3Update.md with Status: DONE and list every file + what was changed.
```
