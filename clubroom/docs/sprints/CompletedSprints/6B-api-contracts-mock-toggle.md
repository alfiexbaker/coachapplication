# 6B: API Contracts + Mock Toggle + Error Types

**Phase**: 1 — Foundation
**Origin**: Sprint 6, Tasks 4, 5, 6
**Estimated scope**: 3 tasks, backend contract docs + env config

## Goal

Every endpoint the backend needs is documented. A single env var switches between mock and real API. Typed error classes used everywhere.

## Tasks

### Task 1: API Contracts Per Domain

**File**: `services/api-contracts.ts` (update existing)

Document every endpoint the backend needs to provide. Grouped by domain. Each entry includes: method, path, request body, response body, auth requirement.

This is the contract between frontend and backend. See the full contracts in `API_README.md`.

### Task 2: Mock Toggle

**File**: `services/api-client.ts`

Single environment variable controls mock vs real:

```typescript
// In .env or config
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

// In api-client.ts
export const apiClient = {
  async get<T>(key: string, fallback: T): Promise<T> {
    if (USE_MOCK) {
      // AsyncStorage path
      return mockGet(key, fallback);
    }
    // Real API path
    return apiFetch<T>(`/api/${key}`);
  },
  // ... same pattern for set, update, remove
};
```

### Task 3: Error Types

**File**: `constants/error-types.ts`

```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

// Common errors
export class NotFoundError extends ApiError { ... }
export class ValidationError extends ApiError { ... }
export class UnauthorizedError extends ApiError { ... }
export class ForbiddenError extends ApiError { ... }
export class NetworkError extends ApiError { ... }
```

All services throw typed errors. All screens catch and display them via `ErrorState` (from 5A).

## Acceptance Criteria

- [ ] `USE_MOCK` toggle switches between local data and API calls
- [ ] All API contracts documented per domain in `API_README.md`
- [ ] Typed error classes used across all services
- [ ] `.env.example` documents EXPO_PUBLIC_USE_MOCK

## Files Changed

| File | Action |
|------|--------|
| `services/api-contracts.ts` | MODIFY — full endpoint documentation |
| `services/api-client.ts` | MODIFY — add mock toggle |
| `constants/error-types.ts` | CREATE |
| `.env.example` | CREATE |

## Dependencies

- **Blocks**: Nothing (contract docs inform backend team)
- **Blocked by**: 6A (needs auth service for auth endpoints), 1A (needs api-client)
