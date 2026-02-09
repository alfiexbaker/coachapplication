# Phase 2: Data Access Layer

> **Duration:** ~1.5 weeks
> **Goal:** Every data access goes Screen → Hook → Service → apiClient. Zero mock-data imports outside services and tests.
> **Depends on:** Phase 1 (services must return Result<T> before migration)

---

## The Problem

70 files import directly from `constants/mock-data.ts`, bypassing the service layer. When the API connects, these 70 files get nothing — they're hardcoded to local mock data.

| Location | Files | Pattern |
|----------|-------|---------|
| Hooks | 35 | Call `getUserById()`, `getSessionsForCoach()` directly |
| Components | 18 | Import mock data for rendering |
| Services | 5 | Use mock data internally instead of apiClient |
| Screens | 7 | Direct mock data in screen files |
| Auth | 1 | `getUserById` in auth context |
| Types | 1 | `booking-types.ts` references mock data |
| Other | 3 | Various |

Additionally, 194 denormalized name/photo fields across 9 type files (`coachName`, `athleteName`, `coachPhoto`, etc.) are baked into entities. These are tagged `TODO(T3.4)`.

---

## Work Items

### 2A. Build UserService (~1 day)

The single most important new service. 13 files call `getUserById()` directly from mock-data.

**Create:** `services/user-service.ts`

```typescript
// Required methods:
getUserById(id: string): Promise<Result<User, ServiceError>>
getUsersByIds(ids: string[]): Promise<Result<User[], ServiceError>>
searchUsers(query: string): Promise<Result<User[], ServiceError>>
getCurrentUser(): Promise<Result<User, ServiceError>>
```

**Implementation:** For now, wraps the mock-data `getUserById()` call through apiClient. When API connects, swaps to REST endpoint. The point is the INTERFACE, not the implementation.

**Events:** USER_UPDATED, USER_PROFILE_CHANGED

### 2B. Migrate 35 hooks off mock-data (~3 days)

Every hook that imports from `@/constants/mock-data` must be changed to import from a service.

**Find them:** `grep -r "from.*mock-data" clubroom/hooks/`

**Pattern:**
```typescript
// BEFORE
import { getUserById, getSessionsForCoach } from '@/constants/mock-data';
const athlete = getUserById(athleteId);
const sessions = getSessionsForCoach(coachId);

// AFTER
import { userService } from '@/services/user-service';
import { sessionService } from '@/services/session-service';
const athleteResult = await userService.getUserById(athleteId);
if (!athleteResult.success) { /* handle error */ }
const athlete = athleteResult.data;
```

**IMPORTANT:** Some hooks use SYNCHRONOUS mock-data functions (`getUserById` returns directly, not a Promise). When migrating to async service calls, the hook needs `useEffect` + `useState` for the async data. This is a structural change, not just an import swap.

### 2C. Migrate 18 components off mock-data (~2 days)

**Find them:** `grep -r "from.*mock-data" clubroom/components/`

Same pattern as 2B. Components should receive data via props from their parent hook/screen, NOT import services directly. If a component currently imports mock-data, the fix is:
1. Remove the mock-data import from the component
2. Add the data as a prop
3. Have the parent hook/screen provide it via a service call

### 2D. Migrate 7 screens + 5 services + remaining files (~1 day)

**Find them:** `grep -r "from.*mock-data" clubroom/app/ clubroom/services/`

Screens: same as components — data should come from hooks, not direct imports.
Services: replace mock-data with apiClient calls.

### 2E. Remove denormalized name/photo fields (~2 days)

194 fields tagged `TODO(T3.4)` across 9 type files:

| File | Count | Examples |
|------|-------|---------|
| `session-types.ts` | 46 | coachName, athleteName, coachPhoto |
| `club-types.ts` | 37 | ownerName, memberName |
| `social-types.ts` | 28 | authorName, authorAvatar |
| `event-types.ts` | 24 | organizerName, attendeeName |
| `financial-types.ts` | 20 | coachName, payeeName |
| `app-types.ts` | 16 | coachName, athleteName |
| `family-types.ts` | 11 | parentName, childName |
| `skill-types.ts` | 7 | coachName |
| `video-types.ts` | 5 | coachName |

**Pattern:**
```typescript
// BEFORE
interface Booking {
  coachId: string;
  coachName: string;    // TODO(T3.4): Remove
  coachPhoto?: string;  // TODO(T3.4): Remove
}

// AFTER
interface Booking {
  coachId: string;
  // Name/photo resolved via UserService at display time
}
```

**CRITICAL:** Every place that reads `booking.coachName` must be changed to look up the name via UserService. This is high volume — grep for every removed field and update every usage.

### 2F. Clean up mock-data.ts (~1 day)

After all imports are migrated:
1. Remove all exported FUNCTIONS from mock-data.ts (`getUserById`, `getSessionsForCoach`, etc.)
2. Keep the RAW DATA arrays — they're still needed as seed data for apiClient/tests
3. Move seed data to a dedicated `constants/seed-data.ts` or `__tests__/fixtures/`
4. Delete the function exports

---

## Quality Gate

Phase 2 is DONE when:
- [ ] `grep -r "from.*mock-data" clubroom/hooks/ clubroom/components/ clubroom/app/` returns 0 matches
- [ ] `grep -r "from.*mock-data" clubroom/services/` returns 0 matches (except test fixtures)
- [ ] UserService exists with full CRUD via apiClient
- [ ] 0 `TODO(T3.4)` markers remain in type files
- [ ] All data access follows: Screen → Hook → Service → apiClient
- [ ] TypeScript compiles with 0 errors
- [ ] No mock-data function exports remain (only raw seed data)

## Agent Instructions

When an agent works on this phase:
- **Document every file you modify** in LastStep.md — which mock-data import was removed, which service replaced it
- **Grep for the FIELD NAME before removing a denormalized field** — e.g. `grep -r "coachName" clubroom/` to find every usage
- **Do NOT change hook/component LOGIC beyond the data access migration** — UI improvements are Phase 3/4
- **If a component imports mock-data, prefer pushing data to props** — components should not import services directly
- **Run tsc after every batch** — denormalized field removal will break many files, fix them incrementally
- **Track: "X of 70 files migrated" in LastStep.md** after every session
