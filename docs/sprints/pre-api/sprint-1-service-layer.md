# Sprint 1: Service Layer Standardisation + Fix Broken Flows

## Goal

Every service follows one pattern. The two broken core flows (invite→booking, counter-offer→booking) actually work. Remove payment-specific services from the critical path.

## User Stories This Sprint Fixes

| Role | Story | Current State |
|------|-------|---------------|
| **Coach** | I invite a parent to a session and they accept — a booking should exist | BROKEN — logs to console |
| **Parent** | I accept a session invite and expect to see it in my bookings | BROKEN — nothing created |
| **Parent** | I counter-propose a time and coach accepts — booking should exist | BROKEN — same bug |
| **Coach** | I see consistent loading/error behaviour across all my screens | INCONSISTENT |

## Task 1: Create `api-client.ts`

**File**: `services/api-client.ts`

A single shared module that every service imports. For now it wraps AsyncStorage. Later it wraps `fetch`.

```typescript
// services/api-client.ts
//
// Every service calls these instead of touching AsyncStorage directly.
// When backend exists, swap the implementation — services don't change.

interface ApiResponse<T> {
  data: T;
  error?: string;
}

const apiClient = {
  async get<T>(key: string, fallback: T): Promise<T> { ... },
  async set<T>(key: string, data: T): Promise<void> { ... },
  async update<T>(key: string, updater: (current: T) => T, fallback: T): Promise<T> { ... },
  async remove(key: string): Promise<void> { ... },
  generateId(prefix?: string): string { ... },
}
```

**Why**: 46 services each do their own `AsyncStorage.getItem` / `JSON.parse` / `JSON.stringify`. Bugs hide in that repetition. One client, one place.

## Task 2: Fix invite → booking creation

**File**: `services/invite-service.ts` (~line 408)

**Current bug**:
```typescript
if (input.response === 'ACCEPTED') {
  notification.title = 'Invite Accepted!';
  console.log('[SessionInviteService] Booking would be created...');
  // No actual booking creation!
}
```

**Fix**: When invite is accepted, call `bookingService.create()` with the selected slot, athlete IDs, and coach ID. Link the booking back to the invite via `sessionInviteId`.

```
invite accepted
  → bookingService.create({
      coachId: invite.coachId,
      athleteIds: invite.athleteIds,
      bookedById: invite.parentId,
      scheduledAt: selectedSlot.date + 'T' + selectedSlot.startTime,
      duration: calculateDuration(selectedSlot),
      location: selectedSlot.location,
      status: 'CONFIRMED',
      sessionInviteId: invite.id,
    })
  → update invite.status = 'ACCEPTED'
  → update invite.bookingId = newBooking.id
  → send notification to coach
```

## Task 3: Fix counter-offer → booking creation

**File**: `services/counter-offer-service.ts`

Same pattern — when a counter-offer is accepted by either party, create the booking from the agreed `TimeSlot`.

## Task 4: Migrate services to use `api-client.ts`

Migrate all 46 services to use the shared client. Priority order:

**Critical path (do first)**:
1. `booking-service.ts`
2. `invite-service.ts`
3. `counter-offer-service.ts`
4. `availability-service.ts`
5. `coach-service.ts`
6. `roster-service.ts`

**Important (do second)**:
7. `messaging-service.ts`
8. `notification-service.ts`
9. `badge-service.ts`
10. `club-service.ts`
11. `squad-service.ts`
12. `match-service.ts`
13. `event-service.ts`
14. `review-service.ts`

**Supporting (do third)**:
15-46: Everything else — `drill-service`, `goal/progress-service`, `video-service`, `family-service`, `injury-service`, `skill-tree-service`, `follow-service`, `social-feed-service`, `community-service`, etc.

**Deferred (cash-only MVP — mark as mock-only)**:
- `wallet-service.ts` — keep but mark as not-for-MVP
- `earnings-service.ts` — display only, no real transactions
- `invoice-service.ts` — defer
- `package-service.ts` — defer
- `promo-service.ts` — defer
- `referral-service.ts` — defer (keep code, just not in critical path)

## Task 5: Consistent service exports

Every service should export the same shape:

```typescript
export const exampleService = {
  // Read
  async list(filters?): Promise<T[]>,
  async getById(id: string): Promise<T | null>,

  // Write
  async create(input: CreateInput): Promise<T>,
  async update(id: string, patch: Partial<T>): Promise<T>,
  async remove(id: string): Promise<void>,
};
```

No class instances. No `new Service()`. Just plain objects with async methods.

## Task 6: Connection Status Detection

**File**: `hooks/useConnectionStatus.ts`

Detect when the user goes offline and show a banner:

```typescript
import NetInfo from '@react-native-community/netinfo';

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  return { isConnected };
}
```

**UI**: Persistent top banner when offline:
```
┌─────────────────────────────────────┐
│ ⚠️ You're offline. Changes will    │
│ sync when you reconnect.            │
└─────────────────────────────────────┘
```
- Animated slide-down/slide-up
- Shows on every screen (add to root layout)
- Automatically hides when connection restored with "Back online ✓" flash

## Task 7: Offline Action Queue

**File**: `services/api-client.ts` (extend)

When offline, queue write operations for later:

```typescript
interface QueuedAction {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body: any;
  timestamp: number;
}

// In api-client.ts
async function queuedWrite<T>(method: string, path: string, body: any): Promise<T> {
  if (!isConnected) {
    await addToQueue({ id: generateId(), method, path, body, timestamp: Date.now() });
    // Return optimistic response from local cache
    return optimisticResponse(method, path, body);
  }
  return apiFetch(method, path, body);
}

// On reconnect: flush queue in order
async function flushQueue(): Promise<void> {
  const queue = await getQueue();
  for (const action of queue) {
    try {
      await apiFetch(action.method, action.path, action.body);
      await removeFromQueue(action.id);
    } catch (err) {
      // Stop flushing on failure — will retry next reconnect
      break;
    }
  }
}
```

- Queue stored in AsyncStorage (persists across app restart)
- Flush on reconnect (NetInfo listener)
- Optimistic responses return immediately so UI feels instant
- Conflict resolution: server wins on conflict (last-write-wins for MVP)

## Acceptance Criteria

- [ ] `api-client.ts` exists and handles all storage operations
- [ ] Accepting a session invite creates a real booking visible in Bookings tab
- [ ] Accepting a counter-offer creates a real booking
- [ ] All 46 services use `api-client.ts` (no direct AsyncStorage calls)
- [ ] Payment-related services marked as deferred with `// MVP: Cash only — defer to post-API phase`
- [ ] No regressions — existing screens still load their data
- [ ] Offline banner shown when connection lost, auto-hides on reconnect
- [ ] Write actions queued when offline and flushed on reconnect
- [ ] Optimistic UI — user sees immediate feedback even when offline

## Files Changed

| File | Action |
|------|--------|
| `services/api-client.ts` | CREATE — includes offline queue + flush logic |
| `services/invite-service.ts` | FIX — booking creation on accept |
| `services/counter-offer-service.ts` | FIX — booking creation on accept |
| `services/booking-service.ts` | MIGRATE to api-client |
| `services/*.ts` (all 46) | MIGRATE to api-client |
| `hooks/useConnectionStatus.ts` | CREATE — NetInfo listener |
| `components/ui/offline-banner.tsx` | CREATE — persistent top banner |
| `app/_layout.tsx` | MODIFY — add offline banner to root layout |
