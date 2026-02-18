# Sprint 4: Demo Polish

**Goal**: The demo feels real. No fake data pretending to be real. Flows have proper guardrails. Edge cases handled.
**Size**: M (8-10 files)
**Priority**: P3 — makes the demo trustworthy

---

## Tasks

### 4.1 Kill fake seed data on analytics screens
**Files**:
- `services/analytics/analytics-query-service.ts`
- `services/analytics/analytics-export-service.ts`
- `app/analytics/dashboard.tsx`
- `app/analytics/revenue.tsx`
- `app/analytics/retention.tsx`

**Problem**: When there's no real data, screens show hardcoded mock charts. This is worse than showing nothing — it's misleading.

**Fix**:
- If no real data exists → show `EmptyState` with message "Complete your first session to see analytics"
- If some real data exists → show real charts only
- Remove MOCK_COACH_ANALYTICS, MOCK_ANALYTICS constants (or gate behind a `__DEV__` flag)
- Keep demo seed data for demo users (coach1, coach2) but don't show it for newly created users

### 4.2 Fix hardcoded message recipient IDs
**File**: `services/messaging-service.ts` (lines 154-165)
**Problem**: `coachId: 'coach1'` and `parentId: 'parent_1'` hardcoded
**Fix**: Read actual recipient ID from the thread/booking context. Thread already has `participantIds[]` — use it.

### 4.3 Double-booking prevention
**Files**: `services/booking/booking-crud-service.ts`, `services/availability-service.ts`
**Problem**: Two parents can book the same slot simultaneously

**Fix**: Optimistic locking approach:
1. When user selects a time slot, write a `SLOT_HOLD` record: `{ slotId, heldBy, heldAt, expiresAt: +5min }`
2. On `createBooking()`, check for existing confirmed bookings AND active holds for that slot
3. If conflict → return `err({ code: 'SLOT_TAKEN', message: 'This slot was just booked' })`
4. On booking confirmation, remove the hold
5. Holds expire automatically after 5 minutes (checked on read)

### 4.4 Coach confirmation flow
**Files**: `services/booking/booking-crud-service.ts`, `hooks/use-confirm-booking.ts`
**Problem**: Bookings auto-confirm. Coach never accepts/declines.

**Fix**:
1. New bookings start as status `PENDING_COACH` (not `CONFIRMED`)
2. Coach gets notification: "New booking request from [parent] for [date/time]"
3. Coach taps notification → booking detail screen with Accept/Decline buttons
4. Accept → status `CONFIRMED`, parent notified
5. Decline → status `DECLINED`, parent notified with reason
6. Auto-accept option in coach settings (for coaches who want current behaviour)

**New screen needed**: Booking accept/decline view (or modal on existing booking detail)

### 4.5 Fix "coming soon" dead ends
**Files**:
- `app/settings/account.tsx:132` — "Google sign-in coming soon"
- `app/settings/account.tsx:138` — "Apple sign-in coming soon"
- `app/drills/create-challenge.tsx:146` — "Video upload will be available in a future update"
- `app/settings/index.tsx:164` — "Security settings coming in Sprint 2"

**Fix**: Either hide these options entirely (don't show what you can't do) or show a proper "Coming Soon" badge that doesn't look broken. Recommended: hide with a comment for re-enabling later.

### 4.6 Fix RSVP deletion error swallowing
**File**: `hooks/use-group-session.ts:398`
**Problem**: `.catch(() => {})` — errors silently eaten
**Fix**: Add error logging and surface to user if critical:
```typescript
const rsvpResult = await rsvpService.deleteForSession(session.id);
if (!rsvpResult.success) {
  logger.error('Failed to clean up RSVPs', rsvpResult.error);
}
```

### 4.7 Wire orphan events
**File**: `services/event-bus.ts` — ~30 events defined but never emitted

**Emit at the right moments**:

| Event | Emit when | File |
|-------|-----------|------|
| `SESSION_CREATED` | Coach creates group session | `services/group-session/session-crud-service.ts` |
| `SESSION_CANCELLED` | Coach cancels session | `services/group-session/session-crud-service.ts` |
| `BOOKING_CONFIRMED` | Coach accepts booking (4.4) | `services/booking/booking-crud-service.ts` |
| `BOOKING_UPDATED` | Any booking field changes | `services/booking/booking-crud-service.ts` |
| `BADGE_EARNED` | Already emitted, but add listener | `services/service-subscribers.ts` |
| `RSVP_RESPONDED` | Parent RSVPs to session | RSVP service |
| `FAVOURITE_ADDED/REMOVED` | User favourites a coach | `services/coach-service.ts` |

**Add listeners in service-subscribers.ts**:
- `BADGE_EARNED` → call `notifyParentBadgeAwarded()`
- `SESSION_CREATED` → analytics tracking
- `SESSION_CANCELLED` → notify registered participants

### 4.8 Follow feature persistence
**File**: `services/coach-service.ts:358`
**Problem**: `toggleFollow()` always returns `ok(true)`, data lost on restart
**Fix**: Store follows in `STORAGE_KEYS.FAVOURITES` (key exists). Read on app start. Toggle writes/removes from storage.

---

## Acceptance Criteria
- [ ] New user sees empty analytics (not fake charts)
- [ ] Demo users (coach1/coach2) still see seeded data for demo purposes
- [ ] Messages go to the right person (not hardcoded coach1)
- [ ] Can't book the same slot twice
- [ ] Coach can accept/decline bookings (or auto-accept via settings)
- [ ] No "coming soon" text visible in the app
- [ ] RSVP errors logged properly
- [ ] Events fire for all major state changes
- [ ] Following a coach persists across app restarts
