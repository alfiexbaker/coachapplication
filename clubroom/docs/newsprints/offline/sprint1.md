# Offline Sprint 1: Critical Cache & Connectivity

**Goal**: Fix critical data staleness and offline breakage that causes user-facing errors and confusion.

**Items**: 69, 116, 117, 119, 120, 121, 122, 377, 378 (~~386~~ REMOVED — already fixed)

---

## Item 69: External placeholder images break without internet

**Problem**: picsum.photos (6 files), i.pravatar.cc (7 files), samplelib.com (1 file) all fail without network. App shows broken image icons.

**Files**:
- `components/coach/coach-card-header.tsx`
- `components/coach/coach-detail-hero.tsx`
- `components/coach/public-profile-hero.tsx`
- `components/family/FamilyMemberCard.tsx`
- `components/favourites/FavouriteCoachCard.tsx`
- `components/group/participant-card.tsx`
- `components/roster/athlete-notes.tsx`
- `components/squad/squad-members-card.tsx`
- `components/ui/primitives/Avatar.tsx`
- `constants/theme.ts`

```
Fix external placeholder images by bundling local fallbacks.

AUDIT:
1. Grep for all occurrences:
   - "picsum.photos"
   - "i.pravatar.cc"
   - "samplelib.com"

2. Create `/assets/images/placeholders/`:
   - avatar-default.png (256x256, neutral athlete silhouette)
   - coach-default.png (512x512, generic coach/whistle icon)
   - video-thumbnail.png (1280x720, grey with play icon)

FILES TO CHANGE:

`constants/theme.ts` (ADD after line ~40):
```typescript
export const PlaceholderImages = {
  avatar: require('@/assets/images/placeholders/avatar-default.png'),
  coach: require('@/assets/images/placeholders/coach-default.png'),
  videoThumbnail: require('@/assets/images/placeholders/video-thumbnail.png'),
} as const;
```

`components/ui/primitives/Avatar.tsx` (~42-58):
REPLACE all picsum.photos/i.pravatar.cc with:
```typescript
import { PlaceholderImages } from '@/constants/theme';

// In Avatar component:
const defaultSource = PlaceholderImages.avatar;
```

PATTERN FOR ALL FILES:
- Import PlaceholderImages
- Replace external URLs with PlaceholderImages.avatar or .coach
- Add onError handler that sets local fallback
- Use expo-image contentFit="cover"

ACCEPTANCE:
✅ Zero external image URLs in codebase (grep confirms)
✅ Airplane mode → all images show graceful defaults
✅ PlaceholderImages exported from theme.ts
✅ All Avatar/Image components have onError fallback
```

---

## Item 116: Favourite changes don't propagate

**Problem**: `services/favourite-service.ts` has module-level `favouriteCache` with no TTL. Add/remove doesn't emit events. Components using `useFavourites()` show stale state.

**Files**:
- `services/favourite-service.ts`
- `hooks/use-favourites.ts` (likely exists)

```
Add event emission and TTL to favourite-service.ts cache.

FILE: `services/favourite-service.ts`

1. ADD imports (top):
```typescript
import { emitTyped, ServiceEvents } from './event-bus';
```

2. FIND module-level cache (~10-15):
```typescript
const favouriteCache: Set<string> = new Set();
```

REPLACE WITH:
```typescript
const favouriteCache = new Map<string, { timestamp: number }>();
const CACHE_TTL = 30_000; // 30s to match base-service.ts

function isCacheValid(coachId: string): boolean {
  const entry = favouriteCache.get(coachId);
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}
```

3. FIND addFavourite (~40-60):
```typescript
async addFavourite(coachId: string): Promise<Result<void, ServiceError>> {
  // ... existing storage logic
  favouriteCache.add(coachId);
  return ok(undefined);
}
```

ADD after storage success (payload must match EventPayloads — includes favouriteId):
```typescript
favouriteCache.set(coachId, { timestamp: Date.now() });
emitTyped(ServiceEvents.FAVOURITE_ADDED, {
  userId: currentUser.id,
  coachId,
  favouriteId: newFavourite.id,
});
```

4. FIND removeFavourite (~70-90):
ADD after storage success (payload must match EventPayloads — includes favouriteId):
```typescript
favouriteCache.delete(coachId);
emitTyped(ServiceEvents.FAVOURITE_REMOVED, {
  userId: currentUser.id,
  coachId,
  favouriteId: favourite.id,
});
```

5. FIND getFavourites (~100-120):
Use the base-service cache invalidation pattern: single timestamp, invalidate
whole cache — NOT per-entry iteration. This matches base-service.ts which uses
`_cacheTimestamp` and nulls the entire Map when stale:
```typescript
let _cacheTimestamp = 0;
const CACHE_TTL = 30_000;

function invalidateCache(): void {
  favouriteCache.clear();
  _cacheTimestamp = 0;
}

function isCacheStale(): boolean {
  return Date.now() - _cacheTimestamp > CACHE_TTL;
}

async getFavourites(): Promise<Result<string[], ServiceError>> {
  if (isCacheStale()) {
    invalidateCache();
    // Reload from storage...
  }
  // ... rest of existing logic
}
```

FILE: `services/event-bus.ts`
NOTE: FAVOURITE_ADDED and FAVOURITE_REMOVED already exist as ServiceEvents
constants (lines 210-213). Use the existing constants:
```typescript
// Already exists:
// ServiceEvents.FAVOURITE_ADDED = 'favourite:added'
// ServiceEvents.FAVOURITE_REMOVED = 'favourite:removed'

// Usage:
emitTyped(ServiceEvents.FAVOURITE_ADDED, {
  userId: currentUser.id,
  coachId,
  favouriteId: newFavourite.id,
});
```

DO NOT add duplicate event constants. Use the existing ServiceEvents pattern.

ACCEPTANCE:
✅ favouriteCache uses single-timestamp invalidation (matching base-service pattern)
✅ addFavourite emits ServiceEvents.FAVOURITE_ADDED (existing constant)
✅ removeFavourite emits ServiceEvents.FAVOURITE_REMOVED (existing constant)
✅ Cache invalidated as whole, not per-entry iteration
✅ No duplicate event definitions
```

---

## Item 117: Squad membership stale

**Problem**: `services/squad-service.ts` ~144-174 has module-level `squadCache` with no TTL. Add/remove member doesn't emit event.

**Files**:
- `services/squad-service.ts`

```
Add TTL and event emission to squad-service.ts cache.

FILE: `services/squad-service.ts`

1. FIND module-level cache (~10-20):
```typescript
const squadCache: Map<string, Squad> = new Map();
```

REPLACE WITH:
```typescript
const squadCache = new Map<string, { squad: Squad; timestamp: number }>();
const CACHE_TTL = 30_000;

function getCachedSquad(squadId: string): Squad | null {
  const entry = squadCache.get(squadId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp >= CACHE_TTL) {
    squadCache.delete(squadId);
    return null;
  }
  return entry.squad;
}
```

2. FIND addMember (~144-174):
```typescript
async addMember(squadId: string, userId: string): Promise<Result<void, ServiceError>> {
  // ... existing logic
  squad.memberIds.push(userId);
  await apiClient.set(STORAGE_KEYS.SQUADS, allSquads);
  return ok(undefined);
}
```

ADD after storage success (use existing ServiceEvents constants):
```typescript
squadCache.set(squadId, { squad, timestamp: Date.now() });
emitTyped(ServiceEvents.SQUAD_MEMBER_ADDED, {
  squadId,
  clubId: squad.clubId ?? '',
  userId,
  userName: userName ?? '',
});
```

3. FIND removeMember (~180-210):
ADD after storage success:
```typescript
squadCache.set(squadId, { squad, timestamp: Date.now() });
emitTyped(ServiceEvents.SQUAD_MEMBER_REMOVED, {
  squadId,
  clubId: squad.clubId ?? '',
  userId,
  userName: userName ?? '',
});
```

4. FIND getSquad (~50-80):
ADD cache check at start:
```typescript
async getSquad(squadId: string): Promise<Result<Squad, ServiceError>> {
  const cached = getCachedSquad(squadId);
  if (cached) return ok(cached);

  // ... rest of existing storage fetch

  // After successful fetch:
  squadCache.set(squadId, { squad: foundSquad, timestamp: Date.now() });
  return ok(foundSquad);
}
```

5. ADD imports:
```typescript
import { emitTyped, ServiceEvents } from './event-bus';
```

NOTE: SQUAD_MEMBER_ADDED and SQUAD_MEMBER_REMOVED already exist in event-bus.ts
as ServiceEvents constants (lines 238-241). Their EventPayloads signatures are:
```typescript
// Already defined:
[ServiceEvents.SQUAD_MEMBER_ADDED]: { squadId: string; clubId: string; userId: string; userName: string };
[ServiceEvents.SQUAD_MEMBER_REMOVED]: { squadId: string; clubId: string; userId: string; userName: string };
```
Do NOT add duplicate event definitions. Use the existing constants.

ACCEPTANCE:
✅ squadCache uses { squad, timestamp } with 30s TTL
✅ getCachedSquad() helper checks staleness
✅ addMember emits ServiceEvents.SQUAD_MEMBER_ADDED (existing constant)
✅ removeMember emits ServiceEvents.SQUAD_MEMBER_REMOVED (existing constant)
✅ getSquad() uses cache before storage read
✅ No duplicate event definitions
```

---

## Item 119: Availability deletions not reflected

**Problem**: `services/availability-service.ts` has manual cache but deleteTemplate/deleteOverride don't emit events. Calendar components show deleted slots.

**Files**:
- `services/availability-service.ts`

```
Emit events on availability deletion and add cache invalidation.

FILE: `services/availability-service.ts`

1. FIND deleteTemplate (~120-150):
```typescript
async deleteTemplate(templateId: string): Promise<Result<void, ServiceError>> {
  // ... existing deletion logic
  await apiClient.set(STORAGE_KEYS.AVAILABILITY_TEMPLATES, filtered);
  return ok(undefined);
}
```

ADD after storage success:
```typescript
// Use invalidateCache() (NOT clearCache — matching base-service.ts naming)
this.invalidateCache();
emitTyped(ServiceEvents.AVAILABILITY_TEMPLATE_DELETED, { templateId, coachId: currentUser.id });
```

2. FIND deleteOverride (~180-210):
```typescript
async deleteOverride(overrideId: string): Promise<Result<void, ServiceError>> {
  // ... existing deletion logic
  await apiClient.set(STORAGE_KEYS.AVAILABILITY_OVERRIDES, filtered);
  return ok(undefined);
}
```

ADD after storage success:
```typescript
this.invalidateCache();
emitTyped(ServiceEvents.AVAILABILITY_OVERRIDE_DELETED, { overrideId, coachId: currentUser.id });
```

3. ADD invalidateCache method (if missing — use base-service.ts naming convention):
```typescript
private invalidateCache(): void {
  this._cache = null;
  this._cacheTimestamp = 0;
  logger.debug('Availability cache invalidated');
}
```

4. ADD imports:
```typescript
import { emitTyped, ServiceEvents } from './event-bus';
```

FILE: `services/event-bus.ts`
ADD to ServiceEvents object (using the existing constant naming pattern):
```typescript
AVAILABILITY_TEMPLATE_DELETED: 'availability:template_deleted',
AVAILABILITY_OVERRIDE_DELETED: 'availability:override_deleted',
```

ADD to EventPayloads interface:
```typescript
[ServiceEvents.AVAILABILITY_TEMPLATE_DELETED]: { templateId: string; coachId: string };
[ServiceEvents.AVAILABILITY_OVERRIDE_DELETED]: { overrideId: string; coachId: string };
```

ACCEPTANCE:
✅ deleteTemplate calls invalidateCache() (NOT clearCache) and emits event
✅ deleteOverride calls invalidateCache() and emits event
✅ invalidateCache() method exists (matching base-service.ts naming)
✅ Events use ServiceEvents constants (NOT raw strings)
✅ Events defined in EventPayloads interface
```

---

## Item 120: Session template deletion no event

**Problem**: `services/session-template-service.ts` ~156-165 deleteTemplate doesn't emit event. Scheduling screens show deleted templates.

**Files**:
- `services/session-template-service.ts`

```
Emit event on session template deletion.

FILE: `services/session-template-service.ts`

1. FIND deleteTemplate (~156-165):
```typescript
async deleteTemplate(templateId: string): Promise<Result<void, ServiceError>> {
  const allTemplates = await apiClient.get<SessionTemplate[]>(
    STORAGE_KEYS.SESSION_TEMPLATES,
    []
  );
  const filtered = allTemplates.filter(t => t.id !== templateId);
  await apiClient.set(STORAGE_KEYS.SESSION_TEMPLATES, filtered);
  return ok(undefined);
}
```

REPLACE return with (using correct Result API — .success/.data, NOT .isOk/.value):
```typescript
  await apiClient.set(STORAGE_KEYS.SESSION_TEMPLATES, filtered);

  // Invalidate cache
  this.invalidateCache();

  // Emit event — use correct Result API: result.success / result.data
  const currentUser = await this.getCurrentUser();
  if (currentUser.success) {
    emitTyped(ServiceEvents.SESSION_TEMPLATE_DELETED, {
      templateId,
      coachId: currentUser.data.id,
    });
  }

  return ok(undefined);
}
```

2. ADD imports:
```typescript
import { emitTyped, ServiceEvents } from './event-bus';
```

FILE: `services/event-bus.ts`
ADD to ServiceEvents object:
```typescript
SESSION_TEMPLATE_DELETED: 'session:template_deleted',
```

ADD to EventPayloads interface:
```typescript
[ServiceEvents.SESSION_TEMPLATE_DELETED]: { templateId: string; coachId: string };
```

ACCEPTANCE:
✅ deleteTemplate emits ServiceEvents.SESSION_TEMPLATE_DELETED
✅ Uses correct Result API: result.success / result.data (NOT .isOk/.value)
✅ Calls invalidateCache() after storage write
✅ Event uses ServiceEvents constant (NOT raw string)
✅ Event defined in EventPayloads
```

---

## Item 121: Video/annotation deletions no events

**Problem**: `services/video-service.ts` removeAnnotation, deleteVideo, deleteAnnotation emit nothing. Components show deleted content.

**Files**:
- `services/video-service.ts`

```
Emit events on video/annotation deletion.

FILE: `services/video-service.ts`

1. FIND removeAnnotation (~180-210):
```typescript
async removeAnnotation(videoId: string, annotationId: string): Promise<Result<void, ServiceError>> {
  // ... existing logic
  await apiClient.set(STORAGE_KEYS.VIDEOS, allVideos);
  return ok(undefined);
}
```

ADD before return (use ServiceEvents constants, correct Result API):
```typescript
emitTyped(ServiceEvents.VIDEO_ANNOTATION_REMOVED, { videoId, annotationId });
```

2. FIND deleteVideo (~240-270):
```typescript
async deleteVideo(videoId: string): Promise<Result<void, ServiceError>> {
  // ... existing logic
  await apiClient.set(STORAGE_KEYS.VIDEOS, filtered);
  return ok(undefined);
}
```

ADD before return (use correct Result API: .success/.data, NOT .isOk/.value):
```typescript
const currentUser = await this.getCurrentUser();
if (currentUser.success) {
  emitTyped(ServiceEvents.VIDEO_DELETED, { videoId, userId: currentUser.data.id });
}
```

3. FIND deleteAnnotation (~300-330):
ADD before return:
```typescript
emitTyped(ServiceEvents.VIDEO_ANNOTATION_DELETED, { annotationId, videoId: video.id });
```

4. ADD imports:
```typescript
import { emitTyped, ServiceEvents } from './event-bus';
```

FILE: `services/event-bus.ts`
ADD to ServiceEvents object:
```typescript
VIDEO_ANNOTATION_REMOVED: 'video:annotation_removed',
VIDEO_DELETED: 'video:deleted',
VIDEO_ANNOTATION_DELETED: 'video:annotation_deleted',
```

ADD to EventPayloads interface:
```typescript
[ServiceEvents.VIDEO_ANNOTATION_REMOVED]: { videoId: string; annotationId: string };
[ServiceEvents.VIDEO_DELETED]: { videoId: string; userId: string };
[ServiceEvents.VIDEO_ANNOTATION_DELETED]: { annotationId: string; videoId: string };
```

ACCEPTANCE:
✅ removeAnnotation emits ServiceEvents.VIDEO_ANNOTATION_REMOVED
✅ deleteVideo emits ServiceEvents.VIDEO_DELETED
✅ deleteAnnotation emits ServiceEvents.VIDEO_ANNOTATION_DELETED
✅ Uses correct Result API: result.success / result.data
✅ Events use ServiceEvents constants (NOT raw strings)
✅ Events defined in EventPayloads
```

---

## Item 122: Availability and roster delete no events

**Problem**: `services/availability-service.ts` deleteTemplate/deleteOverride and `services/roster-service.ts` deleteNote emit nothing.

**Note**: Availability covered in Item 119. This focuses on roster-service.

**Files**:
- `services/roster-service.ts`

```
Emit event on roster note deletion.

FILE: `services/roster-service.ts`

1. FIND deleteNote (~150-180):
```typescript
async deleteNote(athleteId: string, noteId: string): Promise<Result<void, ServiceError>> {
  // ... existing logic
  athlete.notes = athlete.notes.filter(n => n.id !== noteId);
  await apiClient.set(STORAGE_KEYS.ROSTER_ATHLETES, allAthletes);
  return ok(undefined);
}
```

ADD before return (use correct Result API: .success/.data, NOT .isOk/.value):
```typescript
const currentUser = await this.getCurrentUser();
if (currentUser.success) {
  emitTyped(ServiceEvents.ROSTER_NOTE_DELETED, {
    athleteId,
    noteId,
    coachId: currentUser.data.id,
  });
}
```

2. ADD imports:
```typescript
import { emitTyped, ServiceEvents } from './event-bus';
```

FILE: `services/event-bus.ts`
ADD to ServiceEvents object:
```typescript
ROSTER_NOTE_DELETED: 'roster:note_deleted',
```

ADD to EventPayloads interface:
```typescript
[ServiceEvents.ROSTER_NOTE_DELETED]: { athleteId: string; noteId: string; coachId: string };
```

ACCEPTANCE:
✅ deleteNote emits ServiceEvents.ROSTER_NOTE_DELETED
✅ Uses correct Result API: result.success / result.data
✅ Event uses ServiceEvents constant (NOT raw string)
✅ Event defined in EventPayloads
```

---

## Item 377: Offline queue auto-flush never called

**Problem**: `services/offline-queue.ts` has `initAutoFlush()` (line 298) that subscribes to `CONNECTION_CHANGED` events, but it's never invoked anywhere. Queue only flushes on manual trigger.

**Files**:
- `services/offline-queue.ts`
- `app/_layout.tsx` or root initialization file

```
Call initAutoFlush() on app startup.

FILE: `services/offline-queue.ts`

1. The actual initAutoFlush() is a MODULE-LEVEL FUNCTION (not a class method).
   It already exists at lines 298-310 and:
   - Subscribes to ServiceEvents.CONNECTION_CHANGED events
   - Calls flushWithBackoff() when payload.isConnected && payload.wasOffline
   - Returns an unsubscribe function

   The implementation is correct. The bug is simply that nobody calls it.

2. VERIFY initAutoFlush is exported (it already is — `export function initAutoFlush()`).

FILE: `app/_layout.tsx`

ADD in root layout component:
```typescript
import { initAutoFlush } from '@/services/offline-queue';

// Inside component:
useEffect(() => {
  const unsubscribe = initAutoFlush();
  logger.info('Offline queue auto-flush initialized');

  return () => {
    unsubscribe();
  };
}, []);
```

Note: initAutoFlush() returns an unsubscribe function. Clean up on unmount
(though root layout rarely unmounts, it's good practice).

ACCEPTANCE:
✅ initAutoFlush() called once in root _layout.tsx useEffect
✅ Unsubscribe function stored and called on cleanup
✅ CONNECTION_CHANGED → triggers flushWithBackoff() when online
✅ Module-level function (NOT class method — matches actual architecture)
```

---

## Item 378: AsyncStorage QuotaExceededError not caught

**Problem**: `services/api-client.ts` ~349-361 set() method throws on error but doesn't distinguish QuotaExceededError. Large data causes unhandled crash.

**Files**:
- `services/api-client.ts`

```
Catch and handle AsyncStorage quota errors.

Note: api-client.ts set() currently has signature `async set<T>(key: string, data: T): Promise<void>`
and throws on failure (lines 349-361). It does NOT return Result — it throws.

FILE: `services/api-client.ts`

1. FIND set method (~349-361):
The actual set() method delegates to mockSet() in mock mode, or apiFetch in real mode.
mockSet() (lines 308-315) does `await AsyncStorage.setItem(key, JSON.stringify(data))`
and throws on error.

2. ADD quota detection in mockSet():
```typescript
async function mockSet<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    if (error instanceof Error && error.message.includes('QuotaExceeded')) {
      logger.error(`Storage quota exceeded for key: ${key}`, { error });

      // Emit event for UI to show warning — do NOT silently delete
      // the offline queue, that's data loss
      emitTyped(ServiceEvents.STORAGE_QUOTA_WARNING, {
        key,
        timestamp: Date.now(),
      });
    }

    logger.error(`Failed to set ${key}`, error);
    throw error;
  }
}
```

3. Do NOT silently delete the offline queue to free space — that is
   unacceptable data loss. Instead, emit a STORAGE_QUOTA_WARNING event
   and let the UI layer decide what to do (e.g., show a toast suggesting
   the user clear old data, or offer to purge expired queue items with
   user confirmation).

4. ADD import at top of api-client.ts:
```typescript
import { emitTyped, ServiceEvents } from './event-bus';
```

FILE: `services/event-bus.ts`
ADD to ServiceEvents object:
```typescript
STORAGE_QUOTA_WARNING: 'storage:quota_warning',
```

ADD to EventPayloads interface:
```typescript
[ServiceEvents.STORAGE_QUOTA_WARNING]: { key: string; timestamp: number };
```

ACCEPTANCE:
✅ QuotaExceededError caught specifically
✅ Emits STORAGE_QUOTA_WARNING event (NOT silently deleting data)
✅ UI layer responsible for showing user feedback and offering cleanup
✅ Offline queue NOT silently deleted (that's data loss)
✅ Error still thrown (callers handle it)
✅ Uses ServiceEvents constant pattern (not raw string)
```

---

## Item 386: BaseService cache and storage desync on write failure

**Status**: ALREADY FIXED in actual codebase. **REMOVE from sprint scope.**

**Verification**: Read `services/base-service.ts` lines 312-361 (update method).
The actual implementation:
1. Loads data from storage via `loadFromStorage()` (line 314)
2. Finds entity by index (line 315)
3. Creates updated entity (lines 336-342)
4. Updates the array: `data[index] = updatedEntity` (line 344)
5. Calls `saveToStorage(data)` FIRST (line 345)
6. Checks save result: `if (!saveResult.success) return saveResult` (lines 347-349)
7. Calls `invalidateCache()` AFTER storage success (line 351)
8. Returns `ok(updatedEntity)` (line 356)

The same storage-first pattern is used in `create()` (lines 271-307):
storage write happens before `invalidateCache()`.

The sprint assumed a cache-before-storage bug that does not exist.
The actual code uses `invalidateCache()` (which nulls the Map cache entirely),
not per-entry `cache.set()` — so cache is always rebuilt from storage on next read.

**Action**: No code changes needed. Remove this item from sprint backlog.

---

## Sprint 1 Summary

**Effort**: 3-4 days (1 dev)

**Priority**: P0 — These issues cause visible user confusion (broken images, stale data) and silent data loss (cache desyncs).

**Dependencies**:
- Item 69 needs placeholder images created
- Items 116-122 need event-bus.ts extended
- Item 377 needs root _layout.tsx identified
- Item 378 needs STORAGE_KEYS imported

**Testing** (use `node --test` runner, NOT Jest):
- Item 69: Airplane mode → browse coaches/squads → all images show defaults
- Items 116-122: Toggle favourite/squad member → other screens refresh immediately
- Item 377: Kill app, reopen → offline queue flushes pending items
- Item 378: Fill storage with large videos → see quota warning event, not crash
- Item 386: REMOVED — already fixed in actual base-service.ts

**Automated test specs** (`node --test`):
```bash
# Compile
npx tsc -p tsconfig.test.json
# Run
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js
```

Add entries to `tsconfig.test.json` for any new test directories.

Example test structure:
```typescript
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

describe('favourite-service cache', () => {
  it('invalidates cache on add', async () => { /* ... */ });
  it('emits FAVOURITE_ADDED event', async () => { /* ... */ });
  it('cache expires after 30s TTL', async () => { /* ... */ });
});
```

**Success criteria**:
- Zero external image URLs (grep confirms)
- All cache-mutating operations emit events using ServiceEvents constants
- Offline queue auto-flushes on CONNECTION_CHANGED event
- QuotaExceededError emits STORAGE_QUOTA_WARNING (no silent data deletion)
- Item 386 removed (already correct in base-service.ts)
