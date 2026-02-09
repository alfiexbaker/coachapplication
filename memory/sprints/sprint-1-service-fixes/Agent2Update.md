# Sprint 1 — Critical Service Fixes
## Agent 2: Coach Service Fix

**Status**: DONE
**Completed**: 2026-02-09

---

## Objective
Fix coach-service.ts: replace raw fetch() with apiClient, add Result<T,E> returns, add error handling, add logging.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch these files. No other agent touches them.**
```
clubroom/services/coach-service.ts
```

**DO NOT TOUCH** (owned by other agents or out of scope):
- auth-service.ts (Agent 1)
- Any other service file (Agent 3)
- Any screen, component, or hook file

## Tasks

- [x] **1. Replace raw fetch() with apiClient**
  - Removed `import { api } from '@/constants/config'` and `USE_MOCK` flag
  - Replaced all 7 raw `fetch()` calls with `apiClient.get<T>(key, fallback)` pattern
  - Uses `apiClient.get<Coach[]>(COACHES_KEY, MOCK_COACHES)` — fallback IS the mock data
  - Uses `apiClient.set()` for write operations (submitReview)
  - Storage keys: `clubroom.coaches` and `clubroom.coach_reviews` (inline, to be added to storage-keys.ts by another agent)

- [x] **2. Add Result<T, ServiceError> returns**
  - Imported `Result`, `ok`, `err`, `notFound`, `storageError` from `@/types/result`
  - All 7 public methods now return `Promise<Result<T, ServiceError>>`
  - Success paths wrapped in `ok(data)`
  - Not-found paths use `err(notFound('Coach', coachId))`
  - Failure paths use `err(storageError('...'))`

- [x] **3. Add error handling**
  - Every `apiClient` call wrapped in try/catch
  - All errors return `err()` — never throw
  - Proper error logging before returning err

- [x] **4. Add createLogger()**
  - `import { createLogger } from '@/utils/logger'`
  - `const logger = createLogger('CoachService')`
  - All operations log: `logger.info()` on entry, `logger.error()` on failure

## Safety Checks (all passed)
- [x] `grep -r "fetch(" services/coach-service.ts` returns 0 raw fetch calls
- [x] `grep -r "throw " services/coach-service.ts` returns 0 results
- [x] `grep -r "console\." services/coach-service.ts` returns 0 results
- [x] Every public method has return type `Promise<Result<...>>`
- [x] TypeScript compiles: `npx tsc --noEmit` — 0 errors from coach-service.ts
- [x] Zero `any` types in the file

## Methods Migrated
| Method | Old Return | New Return |
|--------|-----------|------------|
| `getCoach(id)` | `Promise<Coach \| null>` | `Promise<Result<Coach, ServiceError>>` |
| `getCoaches(filters?)` | `Promise<Coach[]>` | `Promise<Result<Coach[], ServiceError>>` |
| `getCoachReviews(id)` | `Promise<PublicReview[]>` | `Promise<Result<PublicReview[], ServiceError>>` |
| `submitReview(id, review)` | `Promise<PublicReview>` | `Promise<Result<PublicReview, ServiceError>>` |
| `searchCoaches(query)` | `Promise<Coach[]>` | `Promise<Result<Coach[], ServiceError>>` |
| `getFeaturedCoaches()` | `Promise<Coach[]>` | `Promise<Result<Coach[], ServiceError>>` |
| `toggleFollow(id, userId)` | `Promise<boolean>` | `Promise<Result<boolean, ServiceError>>` |

## Consumer Impact (out of scope — needs separate update)
These files consume coachService and will need Result unwrapping:
- `hooks/use-coach-detail.ts` — `coachService.getCoach()` and `getCoachReviews()`
- `hooks/use-public-profile.ts` — `coachService.getCoach()` and `getCoachReviews()`
- `services/follow-service.ts` — `coachService.getCoaches()`
- `app/book/[coachId]/review.tsx` — `coachService.getCoach()`

## Files Modified
- `clubroom/services/coach-service.ts` — full migration

## Blockers
_None — complete_
