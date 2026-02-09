# Phase 1: Service Layer Hardening

> **Duration:** ~1 week
> **Goal:** Every service in the app follows the same contract. No exceptions.
> **Why first:** Every screen, hook, and component depends on services. If services lie about errors, everything above is built on sand.

---

## The Problem

The audit found a two-tier service layer:
- **47 services** return `Result<T, ServiceError>` — the correct pattern
- **34 services** return raw `Promise<T>` — no structured error handling
- **26 services** use `storageService` instead of `apiClient` — bypasses API toggle
- **8 services** have no `createLogger` — invisible failures
- **auth-service.ts** throws raw `Error` on lines 310, 319 — crashes instead of returning err()
- **~24 stateful services** emit no events — UI can't react to cross-service changes
- **BaseService.emit()** uses untyped `eventBus.emit()` instead of `emitTyped()`

---

## Work Items

### 1A. Migrate 34 services to Result<T, ServiceError> (~3 days)

Every public async method must return `Promise<Result<T, ServiceError>>`.

**Services to migrate (by priority — highest traffic first):**

| Service | Methods | Priority |
|---------|---------|----------|
| `notification-service.ts` | 17+ methods | HIGH — used on every screen |
| `messaging-service.ts` | 8 methods | HIGH — core communication |
| `scheduling-rules-service.ts` | 7+ methods | HIGH — booking flow |
| `waitlist-service.ts` | 7+ methods | HIGH — booking flow |
| `counter-offer-service.ts` | 7 methods | HIGH — booking flow |
| `safety-service.ts` | 9+ methods | MEDIUM |
| `package-service.ts` | 11+ methods | MEDIUM |
| `recurring-booking-service.ts` | 5 methods | MEDIUM |
| `cancellation-service.ts` | 3 methods | MEDIUM |
| `academy-service.ts` | 7+ methods | MEDIUM |
| `referral-service.ts` | 3 methods | MEDIUM |
| `review-service.ts` | 4 methods | MEDIUM |
| `comparison-service.ts` | all methods | LOW |
| `consent-service.ts` | all methods | LOW |
| `verification-service.ts` | all methods | LOW |
| `block-service.ts` | 4 methods | LOW |
| `report-service.ts` | 2 methods | LOW |
| `seen-service.ts` | 3 methods | LOW |
| `discover-service.ts` | 5+ methods | LOW |
| `favourite-service.ts` | 3 methods | LOW |
| `analytics/analytics-query-service.ts` | 4 methods | LOW |
| `analytics/analytics-export-service.ts` | 6 methods | LOW |
| `analytics/analytics-tracking-service.ts` | 3 methods | LOW |
| All notification/ submodule services | various | LOW |
| All wallet/ submodule services | various | LOW |
| All progress/ submodule services | various | LOW |
| All skills/ submodule services | various | LOW |

**Pattern to follow:**
```typescript
// BEFORE (raw return)
async getInvoices(userId: string): Promise<Invoice[]> {
  const data = await apiClient.get<Invoice[]>(KEYS.INVOICES, []);
  return data.filter(i => i.userId === userId);
}

// AFTER (Result return)
async getInvoices(userId: string): Promise<Result<Invoice[], ServiceError>> {
  try {
    const data = await apiClient.get<Invoice[]>(KEYS.INVOICES, []);
    return ok(data.filter(i => i.userId === userId));
  } catch (error) {
    logger.error('Failed to get invoices', error);
    return err(storageError('Failed to load invoices'));
  }
}
```

**IMPORTANT:** When migrating a method to Result<T>, you MUST also update every caller. Grep for every usage. If a hook calls `service.getInvoices()` and expects `Invoice[]`, it now gets `Result<Invoice[], ServiceError>` and must handle `.success` / `.error`.

### 1B. Migrate 26 storageService → apiClient (~1 day)

`storageService` is a wrapper around `apiClient` that adds an in-memory fallback cache but loses `Result<T>` error handling. All 26 services using it should import `apiClient` directly.

**Find them:** `grep -r "storageService" clubroom/services/`

**Pattern:**
```typescript
// BEFORE
import { storageService } from '@/services/storage-service';
const data = await storageService.get('key', fallback);

// AFTER
import { apiClient } from '@/services/api-client';
const data = await apiClient.get<Type>('key', fallback);
```

### 1C. Add createLogger to 8 services (~30 min)

| Service | File |
|---------|------|
| consent-service.ts | Missing entirely |
| comparison-service.ts | Missing entirely |
| review-service.ts | Missing entirely |
| seen-service.ts | Missing entirely |
| block-service.ts | Missing entirely |
| report-service.ts | Missing entirely |
| verification-service.ts | Missing entirely |
| discover-service.ts | Missing entirely |

**Add to top of each:**
```typescript
import { createLogger } from '@/utils/logger';
const logger = createLogger('ServiceName');
```

### 1D. Fix auth-service throws (~1 hour)

File: `services/auth-service.ts`

**Line 310:** `throw new Error('No refresh token available')` → `return err({ code: 'AUTH_ERROR', message: 'No refresh token available' })`

**Line 319:** `throw new Error(result.error.message)` → `return err(result.error)`

Then update `api-client.ts` to handle the Result return from `refreshToken()` instead of try/catch.

### 1E. Add event emissions to stateful services (~2 days)

Services that mutate state but emit no events. UI can't react to changes without these.

| Service | Mutations | Events to add |
|---------|-----------|---------------|
| `messaging-service.ts` | send, edit, delete message | MESSAGE_SENT, MESSAGE_EDITED, MESSAGE_DELETED |
| `waitlist-service.ts` | join, leave, promote | WAITLIST_JOINED, WAITLIST_LEFT, WAITLIST_PROMOTED |
| `counter-offer-service.ts` | create, accept, reject | COUNTER_OFFER_CREATED, COUNTER_OFFER_ACCEPTED, COUNTER_OFFER_REJECTED |
| `recurring-booking-service.ts` | create, cancel | RECURRING_CREATED, RECURRING_CANCELLED |
| `verification-service.ts` | verify, reject | VERIFICATION_UPDATED |
| `favourite-service.ts` | add, remove | FAVOURITE_ADDED, FAVOURITE_REMOVED |
| `cancellation-service.ts` | record | CANCELLATION_RECORDED |

**For each:**
1. Add event names to `ServiceEvents` in `event-bus.ts`
2. Add payload types to `EventPayloads` in `event-bus.ts`
3. Add `emitTyped()` calls after successful mutations

### 1F. Centralize auth storage keys (~30 min)

`auth-service.ts` lines 26-31 defines its own `STORAGE_KEYS`:
```typescript
const STORAGE_KEYS = {
  AUTH_USER: 'auth_user',
  AUTH_TOKEN: 'auth_token',
  AUTH_TOKENS: 'auth_tokens',
  ONBOARDING_COMPLETE: 'onboarding_complete',
};
```

Move these to `constants/storage-keys.ts` and import from there.

### 1G. Fix BaseService.emit() to use emitTyped() (~30 min)

File: `services/base-service.ts` line 86-88

Currently uses untyped `eventBus.emit()`. Change to `emitTyped()` so the 2 services extending BaseService (concern-service, roster-service) get typed event emissions.

---

## Quality Gate

Phase 1 is DONE when:
- [ ] `grep -r "storageService" clubroom/services/` returns 0 matches
- [ ] Every public async service method returns `Promise<Result<T, ServiceError>>`
- [ ] `grep -r "throw new Error" clubroom/services/` returns 0 matches in service logic (test files OK)
- [ ] All 111 service files have `createLogger`
- [ ] All stateful services emit typed events for mutations
- [ ] TypeScript compiles with 0 errors (`npx tsc -p tsconfig.test.json`)
- [ ] Auth storage keys in centralized `storage-keys.ts`
- [ ] BaseService uses `emitTyped()`

## Agent Instructions

When an agent works on this phase:
- **Document every file you modify** in LastStep.md — file path, what changed, what callers were updated
- **Grep for callers BEFORE changing a method signature** — every caller must be updated in the same PR
- **Run tsc after every batch of changes** — don't accumulate 20 file changes then discover type errors
- **Do NOT change screen/component/hook code beyond what's needed to handle the new Result<T> return** — screen improvements are Phase 3
