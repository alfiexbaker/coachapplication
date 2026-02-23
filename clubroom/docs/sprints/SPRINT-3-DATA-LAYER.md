# Sprint 3: Data Layer — Shape for API

**Duration**: 7-10 days
**Goal**: Make the data layer swappable to a real REST API without touching services

---

## 3.1 ID Generation (HIGH)

**Current**: `Date.now() + Math.random().toString(36)` — collision-unsafe, not URL-safe

- [ ] Install `nanoid` (or use `crypto.randomUUID()`)
- [ ] Replace `apiClient.generateId()` in `services/api-client.ts:371-374`
- [ ] Replace inline ID generation in `services/offline-queue.ts:77`
- [ ] Replace inline ID generation in `services/counter-offer-service.ts:183`
- [ ] Grep for all `Date.now().*Math.random()` patterns and replace
- [ ] Decide on format: `uuid v4` or `nanoid(21)` — both are URL-safe and collision-safe
- [ ] Keep prefix convention (`booking_`, `coach_`, etc.) but use proper random suffix

---

## 3.2 Endpoint Mapping Layer (HIGH)

**Current**: `apiFetch('/api/${storageKey}')` — storage keys don't map to REST routes

- [ ] Create `constants/api-endpoints.ts`:
```typescript
export const Endpoints = {
  athletes: {
    skills: (athleteId: string) => `/api/athletes/${athleteId}/skills`,
    feedback: (athleteId: string) => `/api/athletes/${athleteId}/feedback`,
    goals: (athleteId: string) => `/api/athletes/${athleteId}/goals`,
  },
  bookings: {
    list: () => `/api/bookings`,
    detail: (id: string) => `/api/bookings/${id}`,
    status: (id: string) => `/api/bookings/${id}/status`,
  },
  sessions: {
    list: () => `/api/sessions`,
    detail: (id: string) => `/api/sessions/${id}`,
    feedback: (id: string) => `/api/sessions/${id}/feedback`,
    attendance: (id: string) => `/api/sessions/${id}/attendance`,
  },
  coaches: {
    profile: (id: string) => `/api/coaches/${id}`,
    analytics: (id: string) => `/api/coaches/${id}/analytics`,
    availability: (id: string) => `/api/coaches/${id}/availability`,
  },
  auth: {
    login: () => `/api/auth/login`,
    register: () => `/api/auth/register`,
    refresh: () => `/api/auth/refresh`,
    revoke: () => `/api/auth/revoke`,
  },
} as const;
```
- [ ] Map each storage key to its corresponding endpoint
- [ ] Update `apiClient` to use endpoint map when `USE_MOCK === false`

---

## 3.3 Denormalization Cleanup (HIGH)

**Current**: `coachName`, `athleteNames`, `bookedByName` embedded inline — goes stale on name change

### Booking type (`constants/app-types.ts`)
- [ ] Remove `coachName: string` — resolve via `coachId` at display time
- [ ] Remove `athleteNames?: string[]` — resolve via `athleteIds` at display time
- [ ] Remove `bookedByName?: string` — resolve via `bookedById` at display time
- [ ] Create `hooks/use-resolved-booking.ts` that joins Booking + Coach/Athlete names
- [ ] Update all screens that display booking names to use the resolver hook

### Session seeds (`constants/coach-session-seeds.ts`)
- [ ] Remove `coachName: 'Jess Okafor'` from seed data — resolve from coachId
- [ ] Audit all seed files for denormalized name fields

### General pattern
- [ ] Grep for `Name:` and `Names:` in type definitions
- [ ] For each: decide if it should be a FK resolve or stays denormalized (with justification)

---

## 3.4 Pagination (HIGH)

**Current**: Load-all-in-memory, QueryOptions has `offset/limit` but unused

- [ ] Extend `QueryOptions` in `services/base-service.ts` with cursor pagination:
```typescript
export interface QueryOptions<T> {
  filter?: Partial<T>;
  sort?: keyof T;
  sortDirection?: 'asc' | 'desc';
  first?: number;        // page size
  after?: string;        // cursor (ISO date or ID)
  // Keep legacy offset/limit for mock mode
  limit?: number;
  offset?: number;
}

export interface PagedResult<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
    totalCount?: number;
  };
}
```
- [ ] Update `BaseService.getAll()` to support cursor-based pagination
- [ ] Add `PagedResult<T>` return type for list endpoints
- [ ] Update the 5 highest-volume list screens to use pagination:
  - `(tabs)/roster.tsx`
  - `(tabs)/bookings/` list views
  - `(tabs)/messages.tsx`
  - `analytics/dashboard.tsx`
  - `group-sessions/` list views

---

## 3.5 Optimistic Locking (MEDIUM)

**Current**: Read-modify-write pattern, no conflict detection

- [ ] Add `version: number` to `BaseEntity` in `services/base-service.ts`
- [ ] Auto-increment version on every `save()` / `update()`
- [ ] On API mode: send version in PUT/PATCH, handle 409 Conflict response
- [ ] Add `ServiceErrorCode.CONFLICT` to error codes

---

## 3.6 Soft Deletes (MEDIUM)

**Current**: Hard deletes only, no `deletedAt` field

- [ ] Add `deletedAt?: string` to `BaseEntity`
- [ ] Update `BaseService.delete()` to set `deletedAt` instead of removing
- [ ] Update `BaseService.getAll()` to filter out soft-deleted by default
- [ ] Add `includeDeleted?: boolean` to QueryOptions

---

## 3.7 Offline Queue Integration (MEDIUM)

**Current**: `offline-queue.ts` exists but apiClient doesn't use it

- [ ] Wire `addToQueue()` into `apiClient.set()` / `apiClient.update()` when offline
- [ ] Add network listener via `@react-native-community/netinfo`
- [ ] Auto-flush queue on network restore
- [ ] Add exponential backoff for failed flush attempts
- [ ] Emit events: `QUEUE_ACTION_ADDED`, `QUEUE_FLUSHED`, `QUEUE_FLUSH_FAILED`

---

## 3.8 Auth Hardening (MEDIUM)

**Current**: Token refresh works but no expiry validation, no revocation

- [ ] Validate token expiry before each request (decode JWT exp claim)
- [ ] Add session revocation endpoint to Endpoints map
- [ ] Implement PKCE flow for mobile OAuth
- [ ] Add `refreshToken` storage with secure storage (expo-secure-store)
- [ ] Handle concurrent request dedup during token refresh

---

## Definition of Done
- [ ] All entity IDs use UUID/nanoid
- [ ] Endpoint mapping covers all 120 storage keys
- [ ] Zero denormalized name fields in type definitions
- [ ] Pagination works on top 5 list screens (mock mode)
- [ ] Offline queue fires on network loss (simulated)
- [ ] `apiClient.set()` returns version number
- [ ] All existing tests pass with new ID format
