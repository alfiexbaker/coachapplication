# P1-SVC — Service Layer Hardening

**Category**: Service Layer (62 → 80)
**Scope**: services/ directory ONLY. Do NOT touch app/, components/, .tmp-tests/.
**Run**: Parallel with Phase 1 (no overlap with other agents)

## Work Items

### 1. Fix Exception Throwing (CRITICAL — 3 files)

**services/api-client.ts** — 4 throws on lines ~117, 156, 164, 172
- These `throw new NetworkError/UnauthorizedError/ApiError` break the Result pattern
- Wrap `apiFetch<T>()` to catch internally and return Result
- Callers should get `Result<T, ServiceError>` not exceptions
- NOTE: Be careful — auth-service depends on these. Test the auth flow after changes.

**services/auth-service.ts** — 2 throws on lines ~310, 319
- `throw new Error('No refresh token available')` → `return err({ code: 'UNAUTHORIZED', message: '...' })`
- `throw new Error(result.error.message)` → `return err({ code: 'AUTH_ERROR', message: '...' })`

### 2. Standardize Error Helpers (~80 call sites)

Replace raw `err({ code: '...', message: '...' })` with typed helpers from `types/result.ts`:

| Raw Pattern | Replace With |
|-------------|-------------|
| `err({ code: 'NOT_FOUND', message: '...' })` | `err(notFound('Entity', id))` |
| `err({ code: 'STORAGE', message: '...' })` | `err(storageError('...'))` |
| `err({ code: 'VALIDATION', message: '...' })` | `err(validationError('...'))` |
| `err({ code: 'UNAUTHORIZED', message: '...' })` | `err(unauthorized('...'))` |
| `err({ code: 'CONFLICT', message: '...' })` | `err(conflictError('...'))` |
| `err({ code: 'NETWORK', message: '...' })` | `err(networkError('...'))` |

**How to find them**: `grep -rn "err({" services/ --include="*.ts"`
Import helpers from `@/types/result` in each file.

### 3. Split Top 5 Mega-Services (>800 lines)

| Service | Lines | Split Into |
|---------|-------|-----------|
| skill-definition-service.ts | 1087 | Keep as-is (already in skills/ module) — just reduce internal duplication |
| session-invite-service.ts | 1043 | Already in invite/ module — extract helper functions, reduce line count |
| notification-service.ts | 1003 | Already split into notification/ module — verify facade works |
| badge-service.ts | 939 | Extract badge-award-logic, badge-display helpers |
| invoice-service.ts | 930 | Extract invoice-template, invoice-export helpers |

**Pattern for splitting:**
1. Identify logical groups of methods
2. Extract to private helper files in same directory
3. Main service file imports and delegates
4. Keep all public API on the main service (backward compat)
5. Add index.ts facade if not already present

### 4. BaseService Adoption (5 CRUD services)

Pick 5 simple CRUD services and migrate to extend BaseService:
1. `favourite-service.ts` — simple key-value CRUD
2. `seen-service.ts` — simple key-value CRUD
3. `report-service.ts` — simple CRUD with status
4. `trial-service.ts` — simple CRUD
5. `referral-service.ts` — simple CRUD with code generation

**Pattern:**
```typescript
import { BaseService } from './base-service';

class FavouriteService extends BaseService<Favourite> {
  constructor() {
    super('FavouriteService', STORAGE_KEYS.FAVOURITES);
  }
  // Only override methods that need custom logic
}
```

## File List (exact)

| File | Action |
|------|--------|
| services/api-client.ts | Remove throws, return Result |
| services/auth-service.ts | Remove throws, return Result |
| services/badge-service.ts | Extract helpers, reduce to <500 lines |
| services/invoice-service.ts | Extract helpers, reduce to <500 lines |
| services/favourite-service.ts | Extend BaseService |
| services/seen-service.ts | Extend BaseService |
| services/report-service.ts | Extend BaseService |
| services/trial-service.ts | Extend BaseService |
| services/referral-service.ts | Extend BaseService |
| services/*.ts (all) | Standardize err() → helper functions |

## Quality Gate
- [ ] `grep -rn "throw new" services/ --include="*.ts"` returns 0 results
- [ ] `grep -rn 'err({' services/ --include="*.ts"` returns 0 results (all use helpers)
- [ ] badge-service.ts < 500 lines
- [ ] invoice-service.ts < 500 lines
- [ ] 5 services extend BaseService
- [ ] All existing tests still pass: `cd clubroom && node --require ./scripts/test-register.js --test .tmp-tests/services/**/*.test.js`

## Do NOT Touch
- .tmp-tests/ (test agents own this)
- app/ or components/
- types/result.ts (unless adding new helper — coordinate with architect)
- service-subscribers.ts (event wiring)
