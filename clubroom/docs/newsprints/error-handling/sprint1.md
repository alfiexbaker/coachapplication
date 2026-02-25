# Error Handling Sprint 1: Silent Failures (Data Loss)

**Goal**: Fix silent failures that cause data loss or show incorrect state to users.

**Items**: 7, 8, 79, 80, 81, 82, 83, 205, 266, 267, 274, 275, 299, 359, 360, 365, 366

---

## Item 7: Quick Rate modal no feedback

**Problem**: `components/group/quick-rate-modal.tsx` ~101 submitRating() has no loading state, no success toast, no error handling.

**Files**:
- `components/group/quick-rate-modal.tsx`

```
Add loading, success, and error feedback to Quick Rate modal.

FILE: `components/group/quick-rate-modal.tsx`

1. FIND submitRating (~101):
```typescript
const handleSubmit = async () => {
  await rateCoachService.submitRating({
    coachId,
    rating: selectedRating,
    comment: feedback,
  });
  onClose();
};
```

REPLACE with:
```typescript
import { useToast } from '@/components/ui/toast';

// Inside the component:
const { showToast } = useToast();

const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = useCallback(async () => {
  if (!selectedRating) {
    showToast('Please select a rating', 'error');
    return;
  }

  setIsSubmitting(true);

  const result = await rateCoachService.submitRating({
    coachId,
    rating: selectedRating,
    comment: feedback,
    sessionId,
  });

  if (!result.success) {
    showToast(result.error.message || 'Failed to submit rating', 'error');
    setIsSubmitting(false);
    return;
  }

  showToast('Rating submitted', 'success');
  setIsSubmitting(false);
  onClose();
}, [coachId, selectedRating, feedback, sessionId, onClose]);
```

NOTE: The service returns Result<T, ServiceError> — it does NOT throw.
No try/catch needed. Check `result.success` / `result.data` directly.

2. UPDATE submit button:
```typescript
<Button
  variant="primary"
  onPress={handleSubmit}
  disabled={!selectedRating || isSubmitting}
  loading={isSubmitting}
>
  {isSubmitting ? 'Submitting...' : 'Submit Rating'}
</Button>
```

ACCEPTANCE:
✅ isSubmitting state tracks loading
✅ Success → toast + onClose()
✅ Error → toast with error message
✅ Submit button shows loading spinner
✅ Submit button disabled during submission
✅ No dead try/catch — service returns Result, doesn't throw
✅ Handler wrapped in useCallback
```

---

## Item 8: Roll Call allows all absent

**Problem**: `components/group/roll-call-modal.tsx` has no validation. Coach can mark all athletes absent and submit.

**Files**:
- `components/group/roll-call-modal.tsx`

```
Add minimum attendance validation to Roll Call.

FILE: `components/group/roll-call-modal.tsx`

1. FIND handleSubmit (~120-140):
```typescript
const handleSubmit = async () => {
  await sessionService.recordAttendance(sessionId, attendance);
  onClose();
};
```

REPLACE with:
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = useCallback(async () => {
  const presentCount = Object.values(attendance).filter(a => a === 'present').length;
  const totalCount = Object.keys(attendance).length;

  if (presentCount === 0 && totalCount > 0) {
    Alert.alert(
      'No Attendees',
      'Are you sure no one attended this session? This will mark the session as cancelled.',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            await submitAttendance();
          },
        },
      ]
    );
    return;
  }

  await submitAttendance();
}, [attendance, sessionId]);

const submitAttendance = useCallback(async () => {
  setIsSubmitting(true);

  const result = await sessionService.recordAttendance(sessionId, attendance);

  if (!result.success) {
    showToast(result.error.message || 'Failed to save attendance', 'error');
    setIsSubmitting(false);
    return;
  }

  const presentCount = Object.values(attendance).filter(a => a === 'present').length;
  showToast(`Attendance saved: ${presentCount} attended`, 'success');
  setIsSubmitting(false);
  onClose();
}, [sessionId, attendance, onClose]);
```

2. ADD attendance summary above submit button:
```typescript
const presentCount = Object.values(attendance).filter(a => a === 'present').length;
const absentCount = Object.values(attendance).filter(a => a === 'absent').length;
const totalCount = Object.keys(attendance).length;

// In render:
<SurfaceCard style={{ marginTop: Spacing.md, backgroundColor: colors.surfaceSecondary }}>
  <Row gap={Spacing.md}>
    <Column style={{ flex: 1 }}>
      <ThemedText type="caption" color={colors.muted}>Present</ThemedText>
      <ThemedText type="heading" color={colors.success}>{presentCount}</ThemedText>
    </Column>
    <Column style={{ flex: 1 }}>
      <ThemedText type="caption" color={colors.muted}>Absent</ThemedText>
      <ThemedText type="heading" color={colors.error}>{absentCount}</ThemedText>
    </Column>
    <Column style={{ flex: 1 }}>
      <ThemedText type="caption" color={colors.muted}>Total</ThemedText>
      <ThemedText type="heading">{totalCount}</ThemedText>
    </Column>
  </Row>
</SurfaceCard>
```

ACCEPTANCE:
✅ All absent → confirmation alert before submit
✅ Attendance summary shows present/absent/total counts
✅ Success → toast with present count
✅ Error → toast with error message
✅ isSubmitting state prevents double-submit
✅ No dead try/catch — service returns Result
✅ Handlers wrapped in useCallback
```

---

## Item 79: Analytics returns fake data on error

**Problem**: `services/analytics/analytics-query-service.ts` ~280-284 returns empty arrays with fake totals on storage failure. UI shows "0 bookings" when it should show error.

**Files**:
- `services/analytics/analytics-query-service.ts`

```
Return ServiceError instead of fake data on analytics failures.

FILE: `services/analytics/analytics-query-service.ts`

1. FIND getBookingStats (~280-284):
```typescript
async getBookingStats(coachId: string, dateRange: DateRange): Promise<BookingStats> {
  try {
    const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    // ... process bookings
    return {
      total: bookings.length,
      confirmed: confirmedCount,
      cancelled: cancelledCount,
      revenue: totalRevenue,
    };
  } catch (error) {
    logger.error('Failed to get booking stats', error);
    return {
      total: 0,
      confirmed: 0,
      cancelled: 0,
      revenue: 0,
    };
  }
}
```

REPLACE return type and implementation:
```typescript
async getBookingStats(
  coachId: string,
  dateRange: DateRange
): Promise<Result<BookingStats, ServiceError>> {
  try {
    const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);

    const filtered = bookings.filter(
      b => b.coachId === coachId &&
           new Date(b.date) >= dateRange.start &&
           new Date(b.date) <= dateRange.end
    );

    const confirmed = filtered.filter(b => b.status === 'confirmed').length;
    const cancelled = filtered.filter(b => b.status === 'cancelled').length;
    const revenue = filtered
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + b.amount, 0);

    return ok({
      total: filtered.length,
      confirmed,
      cancelled,
      revenue,
    });
  } catch (error) {
    logger.error('Failed to get booking stats', error);
    return err({
      code: 'STORAGE',
      message: 'Failed to load booking statistics',
      details: error,
    });
  }
}
```

2. REPEAT pattern for all analytics methods:
- getRevenueStats
- getRetentionStats
- getAthleteProgress
- getCoachPerformance

3. UPDATE all call sites to handle Result:
```typescript
// Before:
const stats = await analyticsService.getBookingStats(coachId, range);
setStats(stats);

// After:
const stats = await analyticsService.getBookingStats(coachId, range);
if (stats.success) {
  setStats(stats.data);
} else {
  setError(stats.error.message);
}
```

ACCEPTANCE:
✅ All analytics methods return Result<T, ServiceError>
✅ Storage errors return err() with code: 'STORAGE' (valid ServiceErrorCode)
✅ No fake data (zeros) returned on error
✅ Call sites handle Result and show error state
✅ err() shape: { code, message, details? } — NOT originalError
```

---

## Item 80: Booking list shows empty on storage fail

**Problem**: `services/booking/booking-crud-service.ts` ~123-125 getBookingsByCoach returns empty array on error. Coach sees "No bookings" when storage is broken.

**Files**:
- `services/booking/booking-crud-service.ts`

```
Return Result instead of empty array on booking fetch errors.

FILE: `services/booking/booking-crud-service.ts`

1. FIND getBookingsByCoach (~123-125):
```typescript
async getBookingsByCoach(coachId: string): Promise<Booking[]> {
  try {
    const allBookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    return allBookings.filter(b => b.coachId === coachId);
  } catch (error) {
    logger.error('Failed to get bookings', error);
    return [];
  }
}
```

REPLACE with:
```typescript
async getBookingsByCoach(coachId: string): Promise<Result<Booking[], ServiceError>> {
  try {
    const allBookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const filtered = allBookings.filter(b => b.coachId === coachId);

    logger.debug(`Fetched ${filtered.length} bookings for coach ${coachId}`);
    return ok(filtered);
  } catch (error) {
    logger.error('Failed to get bookings for coach', { coachId, error });
    return err({
      code: 'STORAGE',
      message: 'Failed to load bookings',
      details: error,
    });
  }
}
```

2. REPEAT for related methods:
- getBookingsByParent
- getBookingsByAthlete
- getUpcomingBookings
- getPastBookings

3. UPDATE hooks that use these methods:
```typescript
// In hooks/use-bookings.ts:
const [bookings, setBookings] = useState<Booking[]>([]);
const [error, setError] = useState<string | null>(null);

const fetchBookings = async () => {
  setLoading(true);
  setError(null);

  const result = await bookingService.getBookingsByCoach(coachId);

  if (result.success) {
    setBookings(result.data);
  } else {
    setError(result.error.message);
    logger.error('Failed to fetch bookings', result.error);
  }

  setLoading(false);
};
```

ACCEPTANCE:
✅ All getBookings* methods return Result<Booking[], ServiceError>
✅ Storage errors return err() not empty array
✅ Hooks handle Result and set error state
✅ UI shows ErrorState when Result is err
✅ err() uses code: 'STORAGE', details (not originalError)
```

---

## Item 81: saveGoals silently fails

**Problem**: `services/analytics/analytics-tracking-service.ts` ~319-321 saveGoals catches errors but doesn't return status. Caller assumes success.

**Files**:
- `services/analytics/analytics-tracking-service.ts`

```
Return Result from saveGoals and surface errors to UI.

FILE: `services/analytics/analytics-tracking-service.ts`

FIND saveGoals (~319-321):
```typescript
async saveGoals(athleteId: string, goals: Goal[]): Promise<void> {
  try {
    await apiClient.set(`${STORAGE_KEYS.ATHLETE_GOALS}_${athleteId}`, goals);
    logger.debug('Goals saved', { athleteId, count: goals.length });
  } catch (error) {
    logger.error('Failed to save goals', error);
  }
}
```

REPLACE with:
```typescript
async saveGoals(athleteId: string, goals: Goal[]): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(`${STORAGE_KEYS.ATHLETE_GOALS}_${athleteId}`, goals);

    logger.debug('Goals saved', { athleteId, count: goals.length });

    emitTyped(ServiceEvents.GOAL_COMPLETED, { athleteId, goalCount: goals.length });

    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save goals', { athleteId, error });
    return err({
      code: 'STORAGE',
      message: 'Failed to save goals',
      details: error,
    });
  }
}
```

NOTE: Use `ServiceEvents.GOAL_COMPLETED` (an actual event from event-bus.ts)
or a more appropriate event. The event payload must match the EventPayloads type.
If no existing event fits, do NOT emit — add the event to event-bus.ts first.

UPDATE call sites (likely in `components/goals/GoalForm.tsx`):
```typescript
const handleSubmit = useCallback(async () => {
  setIsSubmitting(true);

  const result = await analyticsService.saveGoals(athleteId, updatedGoals);

  if (result.success) {
    showToast('Goals saved', 'success');
    router.back();
  } else {
    showToast(result.error.message, 'error');
  }

  setIsSubmitting(false);
}, [athleteId, updatedGoals]);
```

ACCEPTANCE:
✅ saveGoals returns Result<void, ServiceError>
✅ Call sites handle Result and show toast
✅ Errors surfaced to user, not swallowed
✅ err() shape: { code: 'STORAGE', message, details }
✅ Handler wrapped in useCallback
```

---

## Item 82: Parent dev screen blank no error

**Problem**: `hooks/use-parent-development.ts` ~327-338, 440-450 fetchProgress returns empty object on error. Parent sees blank screen.

**Files**:
- `hooks/use-parent-development.ts`

```
Return Result from fetchProgress and show error state in UI.

FILE: `hooks/use-parent-development.ts`

1. FIND fetchProgress (~327-338):
```typescript
const fetchProgress = async (childId: string) => {
  try {
    const progress = await progressService.getChildProgress(childId);
    setProgress(progress);
  } catch (error) {
    logger.error('Failed to fetch progress', error);
    setProgress({});
  }
};
```

REPLACE with:
```typescript
const [error, setError] = useState<string | null>(null);

const fetchProgress = useCallback(async (childId: string) => {
  setLoading(true);
  setError(null);

  const result = await progressService.getChildProgress(childId);

  if (result.success) {
    setProgress(result.data);
  } else {
    setError(result.error.message);
    logger.error('Failed to fetch child progress', result.error);
  }

  setLoading(false);
}, []);
```

2. UPDATE progressService.getChildProgress to return Result:
```typescript
// In services/progress/progress-goals-service.ts:
async getChildProgress(childId: string): Promise<Result<ChildProgress, ServiceError>> {
  try {
    const sessions = await apiClient.get<Session[]>(
      `${STORAGE_KEYS.ATHLETE_SESSIONS}_${childId}`,
      []
    );

    const badges = await apiClient.get<Badge[]>(
      `${STORAGE_KEYS.ATHLETE_BADGES}_${childId}`,
      []
    );

    const goals = await apiClient.get<Goal[]>(
      `${STORAGE_KEYS.ATHLETE_GOALS}_${childId}`,
      []
    );

    return ok({
      sessions,
      badges,
      goals,
      totalSessions: sessions.length,
      badgesEarned: badges.length,
      goalsCompleted: goals.filter(g => g.completed).length,
    });
  } catch (error) {
    logger.error('Failed to get child progress', { childId, error });
    return err({
      code: 'STORAGE',
      message: 'Failed to load progress data',
      details: error,
    });
  }
}
```

3. UPDATE hook return type:
```typescript
return {
  progress,
  loading,
  error,
  refetch: () => fetchProgress(childId),
};
```

4. UPDATE component to show error state:
```typescript
// In components/parent/dev-progress-tab.tsx:
const { progress, loading, error, refetch } = useParentDevelopment(childId);

if (loading) return <LoadingState />;
if (error) return <ErrorState message={error} onRetry={refetch} />;
if (!progress.sessions?.length) return <EmptyState title="No progress data yet" message="Complete some sessions to see progress" />;
```

ACCEPTANCE:
✅ fetchProgress handles Result with result.success / result.data
✅ Hook exposes error state
✅ Component shows ErrorState when Result is err
✅ ErrorState has retry button
✅ No blank screen on storage failure
✅ err() uses { code: 'STORAGE', message, details }
```

---

## Item 83: Athlete sessions shows "No sessions" falsely

**Problem**: `components/athlete/athlete-sessions.tsx` ~54-56 shows EmptyState when sessions fetch fails. Should show ErrorState.

**Files**:
- `components/athlete/athlete-sessions.tsx`
- `hooks/use-athlete-sessions.ts` (likely exists)

```
Show ErrorState instead of EmptyState on fetch failure.

FILE: `hooks/use-athlete-sessions.ts` (or create if missing):

```typescript
import { useState, useEffect, useCallback } from 'react';
import { sessionService } from '@/services/session-service';
import { createLogger } from '@/utils/logger';
import type { Session } from '@/types/session-types';

const logger = createLogger('useAthleteSessions');

export function useAthleteSessions(athleteId: string) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await sessionService.getSessionsByAthlete(athleteId);

    if (result.success) {
      setSessions(result.data);
    } else {
      setError(result.error.message);
      logger.error('Failed to fetch athlete sessions', result.error);
    }

    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
  };
}
```

NOTE: Import logger from `@/utils/logger` (NOT `@/services/logger`).

FILE: `components/athlete/athlete-sessions.tsx`

FIND render logic (~54-56):
```typescript
if (!sessions.length) {
  return <EmptyState message="No sessions yet" />;
}
```

REPLACE with:
```typescript
const { sessions, loading, error, refetch } = useAthleteSessions(athleteId);

if (loading) return <LoadingState />;
if (error) return <ErrorState message={error} onRetry={refetch} />;
if (!sessions.length) return <EmptyState title="No sessions yet" message="Book a session to get started" />;
```

ACCEPTANCE:
✅ Hook returns loading, error, refetch
✅ Component shows LoadingState while fetching
✅ Component shows ErrorState on fetch failure
✅ ErrorState has retry button
✅ EmptyState only shown when fetch succeeds with 0 results
✅ Logger imported from @/utils/logger
✅ fetchSessions wrapped in useCallback
```

---

## Item 205: useScreen silent refetch never updates status

**Problem**: `hooks/use-screen.ts` ~83-114 silent refetch doesn't update loading state. User sees stale data with no indication of refresh.

**Files**:
- `hooks/use-screen.ts`

**NOTE**: The actual `useScreen` hook ALREADY supports `refreshing` state and pull-to-refresh.
Read the actual file at `hooks/use-screen.ts` before implementing.

**Actual useScreen API** (verified from source):
```typescript
export interface UseScreenOptions<T> {
  load: () => Promise<Result<T, ServiceError>>;
  deps?: ReadonlyArray<unknown>;
  events?: ReadonlyArray<keyof EventPayloads>;
  isEmpty?: (data: T) => boolean;
  refetchOnFocus?: boolean;
}

export interface UseScreenResult<T> {
  data: T | null;
  status: ScreenStatus;  // 'loading' | 'error' | 'empty' | 'success'
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  colors: ThemeColors;
  scheme: ThemeName;
}
```

The hook already provides:
- `status` (not separate `loading`/`error` booleans)
- `refreshing` for pull-to-refresh
- `onRefresh` and `retry` callbacks
- `colors` and `scheme` from theme

**What actually needs fixing**: The `refetchOnFocus` silent refetch uses mode `'silent'`
which does not set `refreshing` or update `status`. If it fails silently, the user sees
stale data with no error indication.

PROPOSED FIX:
```typescript
// In use-screen-core.ts, update runFocusRefetch to propagate errors:
// When a silent refetch fails, update error state so the screen can
// optionally show a subtle error banner without replacing content.
```

**MIGRATION NOTE**: useScreen is used across all 199 route files. Any breaking changes
to the return type require updating every screen. The fix should be additive:
- Add optional `silentError` field to UseScreenResult
- Existing screens continue working unchanged
- New screens can opt-in to showing silent refetch errors

USAGE in screens (already works today):
```typescript
const { data, status, error, refreshing, onRefresh, retry, colors } = useScreen({
  load: () => coachService.getProfile(coachId),
  deps: [coachId],
  events: [ServiceEvents.USER_PROFILE_CHANGED],
  refetchOnFocus: true,
});

if (status === 'loading') return <LoadingState />;
if (status === 'error') return <ErrorState message={error!.message} onRetry={retry} />;
if (status === 'empty') return <EmptyState title="No data" message="..." />;

// In render:
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.tint}
    />
  }
>
```

ACCEPTANCE:
✅ useScreen already exposes refreshing state
✅ Additive change: add silentError for focus-refetch failures
✅ No breaking changes to existing 199 routes
✅ RefreshControl uses refreshing state (already works)
✅ Silent refetch still works (no loading spinner)
```

---

## Item 266: useSessionCompletion no unmount guard

**Problem**: `hooks/use-session-completion.ts` ~613-1009 has setState calls in async functions with no isMounted check. Unmount during save → React warning.

**Files**:
- `hooks/use-session-completion.ts`

```
Add unmount guard to prevent setState on unmounted component.

FILE: `hooks/use-session-completion.ts`

1. ADD useRef for mounted state (~50):
```typescript
import { useRef } from 'react';

export function useSessionCompletion(sessionId: string) {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
```

2. FIND all setState calls in async functions (~613-1009):
```typescript
const saveCompletion = async () => {
  setLoading(true);

  const result = await sessionService.completeSession(sessionId, data);

  if (result.success) {
    setCompleted(true);
  } else {
    setError(result.error.message);
  }

  setLoading(false);
};
```

WRAP setState with isMounted check:
```typescript
const saveCompletion = useCallback(async () => {
  setLoading(true);

  const result = await sessionService.completeSession(sessionId, data);

  if (!isMountedRef.current) return;

  if (result.success) {
    setCompleted(true);
  } else {
    setError(result.error.message);
  }

  setLoading(false);
}, [sessionId, data]);
```

3. SEARCH for all async functions with setState:
- saveCompletion
- saveDraft
- submitFeedback
- awardBadges
- uploadMedia

ADD `if (!isMountedRef.current) return;` after each await, before setState.

NOTE: Check result.success (NOT result.isOk). Access result.data (NOT result.value).

ACCEPTANCE:
✅ isMountedRef added with cleanup
✅ All async functions check isMounted before setState
✅ No React warnings on unmount during async operations
✅ Handlers wrapped in useCallback
```

---

## Item 267: useSessionCompletion review timer leaks

**Problem**: `hooks/use-session-completion.ts` ~934-936 sets timeout for review prompt but doesn't clear on unmount.

**Files**:
- `hooks/use-session-completion.ts`

```
Clear review timer on unmount.

FILE: `hooks/use-session-completion.ts`

FIND review timer (~934-936):
```typescript
useEffect(() => {
  if (completed) {
    setTimeout(() => {
      setShowReviewPrompt(true);
    }, 3000);
  }
}, [completed]);
```

REPLACE with:
```typescript
useEffect(() => {
  if (!completed) return;

  const timerId = setTimeout(() => {
    if (isMountedRef.current) {
      setShowReviewPrompt(true);
    }
  }, 3000);

  return () => {
    clearTimeout(timerId);
  };
}, [completed]);
```

ACCEPTANCE:
✅ Timer ID stored in variable
✅ clearTimeout in cleanup function
✅ isMountedRef checked before setState
✅ No memory leaks on unmount
```

---

## Item 274: base-service getById returns soft-deleted

**Problem**: `services/base-service.ts` ~252-265 getById doesn't filter deletedAt. UI shows deleted items.

**Files**:
- `services/base-service.ts`

**NOTE**: Read the actual `base-service.ts` first. The actual implementation uses:
- `T extends BaseEntity` where `BaseEntity` has `deletedAt?: string`
- Map-based cache (`Map<string, T>`) with TTL
- `getAll()` already accepts `QueryOptions<T>` with `includeDeleted?: boolean`
- `getAll()` already filters `deletedAt` by default (line ~143-145)
- `delete()` already implements soft-delete (sets `deletedAt`)
- `restore()` already exists

The actual getById:
```typescript
async getById(id: string): Promise<Result<T, ServiceError>> {
  try {
    const cache = await this.getCache();
    const item = cache.get(id);
    if (!item) {
      return err(notFound(this.entityName, id));
    }
    return ok(item);
  } catch (error) {
    logger.error(`Failed to get ${this.entityName} by id`, error);
    return err(storageError(`Failed to retrieve ${this.entityName}`));
  }
}
```

FIX: Add soft-delete check to getById. Since `T extends BaseEntity` and
`BaseEntity` already has `deletedAt?: string`, NO type cast is needed.

```typescript
async getById(id: string): Promise<Result<T, ServiceError>> {
  try {
    const cache = await this.getCache();
    const item = cache.get(id);

    if (!item || item.deletedAt) {
      return err(notFound(this.entityName, id));
    }

    return ok(item);
  } catch (error) {
    logger.error(`Failed to get ${this.entityName} by id`, error);
    return err(storageError(`Failed to retrieve ${this.entityName}`));
  }
}
```

NO `(cached as any).deletedAt` — `T extends BaseEntity` already defines `deletedAt`.
NO `(item as any).deletedAt` — same reason. Zero `any` casts needed.

The existing `getAll()` already filters soft-deleted items (line 143-145):
```typescript
if (!options?.includeDeleted) {
  data = data.filter((item) => !item.deletedAt);
}
```

And soft-delete, hard-delete, and restore methods already exist.

ACCEPTANCE:
✅ getById checks deletedAt and returns NOT_FOUND — no type cast needed
✅ getAll already filters deletedAt by default (verified in source)
✅ softDelete/delete/restore methods already exist (verified in source)
✅ Zero `any` casts — T extends BaseEntity has deletedAt
✅ Uses notFound() and storageError() helpers from types/result.ts
```

---

## Item 275: Notification triggers swallow errors

**Problem**: `services/notification-trigger.ts` ~51-71 triggerNotification catches errors but doesn't surface them. Silent notification failures.

**Files**:
- `services/notification-trigger.ts`

**NOTE**: Read the actual `notification-trigger.ts` first. The actual structure is:

```typescript
export type NotifiableAction = {
  type: string;
  recipientId?: string;
  recipientRole: 'coach' | 'parent' | 'athlete';
  title: string;
  body: string;
  deepLink?: string;
  data?: Record<string, string>;
};

export async function triggerNotification(action: NotifiableAction): Promise<void> {
  // ... creates notification via notificationService.create()
}
```

It is a standalone async function (NOT a class method).
It uses `notificationService.create()` (NOT `this.buildNotification` / `this.sendNotification`).
The `data` field on `NotifiableAction` is `Record<string, string>` (NOT `any`).

FIX: Return Result and use correct types:

```typescript
import { type Result, type ServiceError, ok, err } from '@/types/result';

export async function triggerNotification(
  action: NotifiableAction
): Promise<Result<void, ServiceError>> {
  try {
    const notificationType = mapToNotificationType(action.type);

    await notificationService.create({
      id: generateId('notif'),
      type: notificationType,
      title: action.title,
      body: action.body,
      recipientId: action.recipientId,
      recipientRole: action.recipientRole === 'athlete' ? undefined : action.recipientRole,
      deepLink: action.deepLink,
      data: action.data,
      read: false,
    });

    logger.info('Notification triggered', { type: action.type, recipient: action.recipientRole });
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to trigger notification', { type: action.type, error });
    return err({
      code: 'UNKNOWN',
      message: 'Failed to trigger notification',
      details: error,
    });
  }
}
```

NOTE on error code: `'NOTIFICATION_ERROR'` is NOT a valid ServiceErrorCode.
Valid codes: 'NOT_FOUND' | 'VALIDATION' | 'NETWORK' | 'STORAGE' | 'UNAUTHORIZED' | 'CONFLICT' | 'RATE_LIMITED' | 'UNKNOWN'.
Use `'UNKNOWN'` for notification failures.

UPDATE call sites to handle Result:
```typescript
// In booking-service.ts after booking created:
const notificationResult = await triggerNotification({
  type: 'booking_confirmed',
  recipientRole: 'parent',
  recipientId: parentId,
  title: 'Booking Confirmed',
  body: `Booking confirmed with Coach ${coachName}`,
  deepLink: '/bookings',
});

if (!notificationResult.success) {
  // Log but don't fail the booking
  logger.warn('Failed to send booking notification', notificationResult.error);
}
```

ACCEPTANCE:
✅ triggerNotification returns Result<void, ServiceError>
✅ Uses correct NotifiableAction type (data: Record<string, string>)
✅ Error code: 'UNKNOWN' (valid ServiceErrorCode)
✅ err() shape: { code, message, details } — NOT originalError
✅ Errors propagated, not swallowed
✅ Call sites log notification failures
✅ Booking/session operations don't fail if notification fails
```

---

## Item 299: Seven event-bus events defined but never emitted

**Problem**: Events exist in EventPayloads but no emitTyped() calls. Dead code or missing features.

**Files**:
- `services/event-bus.ts`
- Various service files

**NOTE**: Read the actual `services/event-bus.ts` first. Events are defined as:

```typescript
export const ServiceEvents = {
  BOOKING_CREATED: 'booking:created',
  SESSION_STARTED: 'session:started',
  PAYMENT_FAILED: 'payment:failed',
  // ... 83 total events
} as const;

export interface EventPayloads {
  [ServiceEvents.BOOKING_CREATED]: { bookingId: string; userId: string; coachId: string; ... };
  [ServiceEvents.PAYMENT_FAILED]: { userId: string; bookingId: string; amount: number; error: string };
  [ServiceEvents.SESSION_STARTED]: { sessionId: string; coachId: string; athleteIds: string[] };
  // ...
}
```

Events use `ServiceEvents.EVENT_NAME` constants (e.g., `'booking:created'`),
NOT `'PAYMENT_FAILED'` or `'SESSION_STARTED'` as bare strings.

```
Audit event-bus for unused events and either emit or remove them.

FILE: `services/event-bus.ts`

1. LIST all event names from ServiceEvents object (~112-278).

2. FOR EACH EVENT, grep codebase:
```bash
rg "emitTyped.*BOOKING_CREATED" --type ts
rg "ServiceEvents.SESSION_STARTED" --type ts
```

3. IDENTIFY unused events (defined in ServiceEvents + EventPayloads but never emitted).

4. FOR EACH unused event, DECIDE:
   A) If feature exists but missing emit → ADD emitTyped() with correct payload
   B) If feature doesn't exist → REMOVE event definition from both ServiceEvents and EventPayloads

EXAMPLE for PAYMENT_FAILED (if unused):
```typescript
// In services/wallet/wallet-transaction-service.ts, after payment attempt:
if (!result.success) {
  emitTyped(ServiceEvents.PAYMENT_FAILED, {
    userId: booking.parentId,
    bookingId: booking.id,
    amount: booking.amount,
    error: result.error.message,
  });
}
```

EXAMPLE for SESSION_STARTED (if unused):
```typescript
// In session service, when session begins:
emitTyped(ServiceEvents.SESSION_STARTED, {
  sessionId,
  coachId: session.coachId,
  athleteIds: session.athleteIds,
});
```

5. CREATE audit report documenting decisions (inline in PR description, not a separate file).

ACCEPTANCE:
✅ All events in EventPayloads have at least one emitTyped() call
✅ OR events removed if feature doesn't exist
✅ Event payloads match EventPayloads type definitions exactly
✅ Grep confirms no orphaned events
✅ Use ServiceEvents.* constants, not raw strings
```

---

## Item 359: No timeout on AsyncStorage

**Problem**: `services/api-client.ts` ~297-324 set/get can hang forever if storage is corrupted or locked.

**Files**:
- `services/api-client.ts`
- `utils/timeout.ts` (new)

```
Add timeout wrapper for AsyncStorage operations.

FILE: `utils/timeout.ts` (NEW):
```typescript
import { type Result, type ServiceError, ok, err } from '@/types/result';

/**
 * Wraps a promise with a timeout. Returns a Result to integrate with
 * the service error pattern. Cleans up the timer to prevent memory leaks.
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number
): Promise<Result<T, ServiceError>> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Timeout')), ms);
  });
  return Promise.race([promise, timeout])
    .then(data => ok(data))
    .catch(() => err({ code: 'NETWORK', message: `Operation timed out after ${ms}ms` }))
    .finally(() => clearTimeout(timeoutId));
};
```

NOTE: Uses `Promise.race` with `clearTimeout` in `.finally()` to prevent timer leak.
The losing promise's timer is always cleaned up. Returns Result<T, ServiceError>.

FILE: `services/api-client.ts`

ADD constants (~20):
```typescript
const STORAGE_TIMEOUT_MS = 5000; // 5 seconds
```

FIND get (~297-307):
```typescript
async get<T>(key: string, fallback: T): Promise<T> {
  try {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached as T;

    const serialized = await AsyncStorage.getItem(key);
    if (!serialized) return fallback;

    const parsed = JSON.parse(serialized);
    this.cache.set(key, parsed);
    return parsed;
  } catch (error) {
    logger.error('Failed to get item', error);
    return fallback;
  }
}
```

WRAP AsyncStorage call with timeout:
```typescript
import { withTimeout } from '@/utils/timeout';

async get<T>(key: string, fallback: T): Promise<T> {
  try {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached as T;

    const timeoutResult = await withTimeout(
      AsyncStorage.getItem(key),
      STORAGE_TIMEOUT_MS
    );

    if (!timeoutResult.success) {
      logger.error('Storage read timeout', { key, timeout: STORAGE_TIMEOUT_MS });
      return fallback;
    }

    const serialized = timeoutResult.data;
    if (!serialized) return fallback;

    const parsed = JSON.parse(serialized);
    this.cache.set(key, parsed);
    return parsed;
  } catch (error) {
    logger.error('Failed to get item', { key, error });
    return fallback;
  }
}
```

REPEAT for set (~308-324):
```typescript
async set<T>(key: string, value: T): Promise<void> {
  try {
    const serialized = JSON.stringify(value);

    const timeoutResult = await withTimeout(
      AsyncStorage.setItem(key, serialized),
      STORAGE_TIMEOUT_MS
    );

    if (!timeoutResult.success) {
      logger.error('Storage write timeout', { key, timeout: STORAGE_TIMEOUT_MS });
      throw new Error(`Storage write timeout for ${key}`);
    }

    this.cache.set(key, value);
    logger.debug(`Set ${key}`);
  } catch (error) {
    // ... existing QuotaExceededError handling
    throw error;
  }
}
```

ACCEPTANCE:
✅ withTimeout utility created — uses Promise.race with clearTimeout in .finally()
✅ No timer memory leak — clearTimeout always runs
✅ Returns Result<T, ServiceError> for clean integration
✅ AsyncStorage.getItem wrapped with 5s timeout
✅ AsyncStorage.setItem wrapped with 5s timeout
✅ Timeout logged separately from other errors
✅ get returns fallback on timeout
✅ set throws on timeout (to surface to caller)
```

---

## Item 360: useScreen loading no timeout

**Problem**: `hooks/use-screen.ts` ~83-117 can show loading spinner forever if fetchData hangs.

**Files**:
- `hooks/use-screen.ts`

**NOTE**: The actual useScreen already has proper error handling via try/catch in fetchData.
The real fix is at the storage layer (Item 359) since that's where hangs occur.
Adding a timeout to useScreen on top of the storage timeout provides defense-in-depth.

```
Add timeout to useScreen data fetching.

FILE: `hooks/use-screen.ts`

The actual fetchData function (line ~83-117) already handles errors:
```typescript
const fetchData = useCallback(async (mode: ScreenLoadMode = 'initial') => {
  if (mode === 'refresh') {
    setRefreshing(true);
  } else if (mode === 'initial') {
    setStatus('loading');
    setError(null);
  }

  try {
    const result = await load();
    if (!mountedRef.current) return;

    if (!result.success) {
      setError(result.error);
      setStatus('error');
      return;
    }

    const resultData = result.data;
    setData(resultData);
    setStatus(deriveScreenStatus(resultData, isEmpty));
    setError(null);
  } catch (loadError) {
    if (!mountedRef.current) return;
    setError(normalizeUnknownError(loadError));
    setStatus('error');
  } finally {
    if (mode === 'refresh' && mountedRef.current) {
      setRefreshing(false);
    }
    hasLoadedOnceRef.current = true;
  }
}, deps);
```

ADD timeout wrapper around the load() call:
```typescript
import { withTimeout } from '@/utils/timeout';

const FETCH_TIMEOUT_MS = 10_000; // 10 seconds

// Inside fetchData:
try {
  const timeoutResult = await withTimeout(load(), FETCH_TIMEOUT_MS);

  if (!mountedRef.current) return;

  if (!timeoutResult.success) {
    // Timeout or load returned err
    setError({ code: 'NETWORK', message: 'Loading timed out. Please try again.' });
    setStatus('error');
    return;
  }

  const result = timeoutResult.data;
  // result is Result<T, ServiceError> from load()
  if (!result.success) {
    setError(result.error);
    setStatus('error');
    return;
  }

  setData(result.data);
  setStatus(deriveScreenStatus(result.data, isEmpty));
  setError(null);
} catch (loadError) {
  // ...
}
```

ACCEPTANCE:
✅ fetchData wrapped with 10s timeout
✅ Timeout shows user-friendly error message
✅ Timeout logged with context
✅ Loading state always clears (finally block already exists)
✅ Compatible with existing useScreen API
```

---

## Item 365: Result pattern not enforced in hooks

**Problem**: `hooks/use-quick-rate.ts` ~180-257 calls service methods that return Result but doesn't handle errors. Assumes success.

**Files**:
- `hooks/use-quick-rate.ts`

```
Enforce Result handling in use-quick-rate hook.

FILE: `hooks/use-quick-rate.ts`

FIND submitRating (~180-257):
```typescript
const submitRating = async () => {
  const result = await rateCoachService.submitRating({
    coachId,
    rating: selectedRating,
    comment: feedback,
  });

  setSubmitted(true);
  onSuccess();
};
```

ADD Result handling:
```typescript
const [error, setError] = useState<string | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);

const submitRating = useCallback(async () => {
  if (!selectedRating) {
    setError('Please select a rating');
    return;
  }

  setIsSubmitting(true);
  setError(null);

  const result = await rateCoachService.submitRating({
    coachId,
    rating: selectedRating,
    comment: feedback,
    sessionId,
  });

  if (result.success) {
    setSubmitted(true);
    onSuccess?.();
  } else {
    setError(result.error.message);
    logger.error('Failed to submit rating', result.error);
  }

  setIsSubmitting(false);
}, [coachId, selectedRating, feedback, sessionId, onSuccess]);
```

NOTE: No try/catch — the service returns Result, it doesn't throw.
Check `result.success` (NOT `result.isOk`). Access `result.data` (NOT `result.value`).

UPDATE return value:
```typescript
return {
  selectedRating,
  feedback,
  submitted,
  isSubmitting,
  error,
  setSelectedRating,
  setFeedback,
  submitRating,
  reset: useCallback(() => {
    setSelectedRating(0);
    setFeedback('');
    setSubmitted(false);
    setError(null);
  }, []),
};
```

REPEAT pattern for all hooks that call service methods:
- use-rate-coach.ts
- use-session-completion.ts
- use-bookings.ts
- use-dev-badges.ts

ACCEPTANCE:
✅ All service calls check result.success (NOT result.isOk)
✅ Access result.data (NOT result.value)
✅ Errors stored in state and returned
✅ Loading states track async operations
✅ No assumptions of success
✅ No dead try/catch around Result-returning services
✅ Handlers wrapped in useCallback
```

---

## Item 366: No retry for transient storage failures

**Problem**: `services/api-client.ts` doesn't retry on transient AsyncStorage errors (device locked, quota temporarily exceeded).

**Files**:
- `services/api-client.ts`
- `utils/retry.ts` (new)

```
Add retry logic for transient storage failures.

FILE: `utils/retry.ts` (NEW):
```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('Retry');

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoff?: boolean;
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { maxAttempts, delayMs, backoff = true, shouldRetry } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const isLastAttempt = attempt === maxAttempts;
      const shouldRetryError = shouldRetry ? shouldRetry(error) : true;

      if (isLastAttempt || !shouldRetryError) {
        throw error;
      }

      const delay = backoff ? delayMs * attempt : delayMs;

      logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

NOTE: Zero `any` types. All error parameters are `unknown`.
Uses `error instanceof Error ? error.message : 'Unknown error'` for safe narrowing.
Logger imported from `@/utils/logger` (NOT `@/services/logger`).

FILE: `services/api-client.ts`

ADD retry options (~20):
```typescript
const STORAGE_RETRY_ATTEMPTS = 3;
const STORAGE_RETRY_DELAY = 500; // ms

function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const message = 'message' in error && typeof error.message === 'string'
    ? error.message.toLowerCase()
    : '';

  return (
    message.includes('database locked') ||
    message.includes('disk i/o error') ||
    message.includes('temporarily unavailable')
  );
}
```

NOTE: `isTransientError` takes `unknown`, not `any`. Uses proper type narrowing.

UPDATE set (~308-324):
```typescript
import { withRetry } from '@/utils/retry';

async set<T>(key: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);

  try {
    await withRetry(
      () => AsyncStorage.setItem(key, serialized),
      {
        maxAttempts: STORAGE_RETRY_ATTEMPTS,
        delayMs: STORAGE_RETRY_DELAY,
        shouldRetry: isTransientError,
      }
    );

    this.cache.set(key, value);
    logger.debug(`Set ${key}`);
  } catch (error) {
    // ... existing error handling
  }
}
```

UPDATE get (~297-307):
```typescript
async get<T>(key: string, fallback: T): Promise<T> {
  try {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached as T;

    const serialized = await withRetry(
      () => AsyncStorage.getItem(key),
      {
        maxAttempts: STORAGE_RETRY_ATTEMPTS,
        delayMs: STORAGE_RETRY_DELAY,
        shouldRetry: isTransientError,
      }
    );

    if (!serialized) return fallback;

    const parsed = JSON.parse(serialized);
    this.cache.set(key, parsed);
    return parsed;
  } catch (error) {
    logger.error('Failed to get item after retries', { key, error });
    return fallback;
  }
}
```

ACCEPTANCE:
✅ withRetry utility created — zero `any` types, all `unknown`
✅ isTransientError uses proper unknown narrowing
✅ Logger imported from @/utils/logger
✅ AsyncStorage.setItem retries 3x with backoff
✅ AsyncStorage.getItem retries 3x with backoff
✅ Non-transient errors fail immediately
✅ Retry attempts logged with error message
```

---

## Sprint 1 Summary

**Effort**: 5-6 days (1 dev)

**Priority**: P0 — These are silent data loss and false empty states that confuse users.

**Key patterns used across all items**:
- Result API: `result.success` / `result.data` (NOT `.ok` / `.isOk` / `.value`)
- ServiceErrorCode: ONLY `'NOT_FOUND' | 'VALIDATION' | 'NETWORK' | 'STORAGE' | 'UNAUTHORIZED' | 'CONFLICT' | 'RATE_LIMITED' | 'UNKNOWN'`
- err() shape: `{ code, message, details? }` — NOT `originalError`
- Logger: `import { createLogger } from '@/utils/logger'` — NOT `@/services/logger`
- No dead try/catch around Result-returning services
- All handlers wrapped in `useCallback`
- Zero `any` types — use `unknown` with proper narrowing

**Dependencies**:
- Items 7, 8: Need toast.tsx + Button loading prop
- Items 79-83: Need Result pattern in all analytics/booking services
- Item 205: useScreen already has refreshing — add silentError (additive)
- Items 266-267: Need hooks refactored for proper state management
- Item 274: Minimal change — add deletedAt check to getById (no cast needed)
- Item 275: Use actual NotifiableAction type from notification-trigger.ts
- Item 299: Use ServiceEvents.* constants for real event names
- Items 359-360: Need timeout utility with proper cleanup
- Items 365-366: Need retry utility with zero `any`

**Testing**:
- Item 7: Submit rating → see loading, then success toast
- Item 8: Mark all absent → see confirmation alert
- Items 79-83: Simulate storage failure → see ErrorState not EmptyState
- Item 205: Pull-to-refresh → see spinner in RefreshControl (already works)
- Items 266-267: Unmount during save → no React warnings
- Item 274: Soft-delete item → getById returns NOT_FOUND (no cast needed)
- Item 275: Notification failure → logged but doesn't block operation
- Item 299: Grep emitTyped → all events have at least one call
- Item 359-360: Corrupt storage → timeout after 5s/10s, timer cleaned up
- Items 365-366: Transient storage error → retries 3x, succeeds

**Success criteria**:
- Zero silent failures in critical paths (rating, attendance, bookings)
- All empty states only shown when data truly empty
- All async operations have timeout protection (with cleanup)
- All storage operations retry transient failures
- All hooks handle Result pattern (result.success / result.data)
- Event-bus events all emitted or removed
- Unmount guards prevent setState warnings
- Zero `any` types in all new/modified code
