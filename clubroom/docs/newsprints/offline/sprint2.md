# Offline Sprint 2: Background State & Persistence

**Goal**: Fix state persistence, background handling, and offline queue reliability.

**Items**: 192, 276, 379, 380, 381, 384, 385 (~~382, 383~~ ALREADY IMPLEMENTED — verification only)

---

## Item 192: Onboarding progress lost on navigate away

**Problem**: `components/auth/login-screen.tsx` ~95-119 stores onboarding progress in useState. User navigates away (phone call, switch app) → progress lost.

**Files**:
- `components/auth/login-screen.tsx`
- `constants/storage-keys.ts`

```
Persist onboarding progress to AsyncStorage.

FILE: `constants/storage-keys.ts`

ADD new key:
```typescript
export const ONBOARDING_PROGRESS = 'ONBOARDING_PROGRESS' as const;
```

FILE: `components/auth/login-screen.tsx`

1. FIND useState for onboarding (~95-119):
```typescript
const [currentStep, setCurrentStep] = useState(0);
const [formData, setFormData] = useState({
  email: '',
  password: '',
  role: 'parent' as UserRole,
  // ... other fields
});
```

2. ADD persistence hook after useState:
```typescript
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

// Load progress on mount
useEffect(() => {
  async function loadProgress() {
    const saved = await apiClient.get<{
      step: number;
      data: typeof formData;
    }>(STORAGE_KEYS.ONBOARDING_PROGRESS, null);

    if (saved) {
      setCurrentStep(saved.step);
      setFormData(saved.data);
    }
  }
  loadProgress();
}, []);

// Save progress on change
useEffect(() => {
  async function saveProgress() {
    if (currentStep > 0) {
      await apiClient.set(STORAGE_KEYS.ONBOARDING_PROGRESS, {
        step: currentStep,
        data: formData,
        timestamp: Date.now(),
      });
    }
  }
  saveProgress();
}, [currentStep, formData]);
```

3. FIND onboarding completion (~200-230):
```typescript
const handleComplete = async () => {
  // ... create account logic
  await authService.createAccount(formData);
  // Navigate to home
};
```

ADD after successful account creation:
```typescript
// Clear saved progress
await apiClient.remove(STORAGE_KEYS.ONBOARDING_PROGRESS);
```

4. ADD "Resume onboarding" UI at top of screen:
```typescript
const [showResumePrompt, setShowResumePrompt] = useState(false);

useEffect(() => {
  async function checkResumable() {
    const saved = await apiClient.get(STORAGE_KEYS.ONBOARDING_PROGRESS, null);
    if (saved && saved.step > 0) {
      setShowResumePrompt(true);
    }
  }
  checkResumable();
}, []);

// In render, before onboarding form:
{showResumePrompt && (
  <SurfaceCard style={{ marginBottom: Spacing.md }}>
    <ThemedText type="body">
      You have incomplete onboarding from {new Date(saved.timestamp).toLocaleDateString()}
    </ThemedText>
    <Row gap={Spacing.sm} style={{ marginTop: Spacing.xs }}>
      <Button
        variant="secondary"
        size="compact"
        onPress={() => {
          setShowResumePrompt(false);
          apiClient.remove(STORAGE_KEYS.ONBOARDING_PROGRESS);
        }}
      >
        Start fresh
      </Button>
      <Button
        variant="primary"
        size="compact"
        onPress={() => setShowResumePrompt(false)}
      >
        Resume
      </Button>
    </Row>
  </SurfaceCard>
)}
```

ACCEPTANCE:
✅ Onboarding step and formData saved to AsyncStorage on change
✅ Progress auto-loaded on mount if exists
✅ "Resume" prompt shown if saved progress exists
✅ Progress cleared after successful account creation
✅ User can choose "Start fresh" to discard saved progress
```

---

## Item 276: Offline queue no conflict resolution

**Problem**: `services/offline-queue.ts` flushQueue() replays actions via apiFetch but doesn't detect if server/storage data changed while offline.

**CRITICAL**: The actual `QueuedAction` interface (line 30-36) is:
```typescript
export interface QueuedAction {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body: unknown;
  timestamp: number;
}
```
It uses `{ method, path, body }` — NOT `{ operation, entityType, entityId, data }`.
The offline queue is an HTTP-replay queue, not an entity-operation queue.
All conflict resolution must work with this interface.

**Files**:
- `services/offline-queue.ts`
- `types/result.ts` (for ServiceError codes)

```
Add conflict detection and resolution to offline queue, matching actual interface.

FILE: `services/offline-queue.ts`

1. The actual QueuedAction interface uses { method, path, body }.
   Extend it for conflict tracking WITHOUT breaking the existing shape:

```typescript
export interface QueuedAction {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body: unknown;                              // Already unknown, NOT any
  timestamp: number;
  // NEW conflict fields:
  baseVersion?: number;                       // Entity version when queued
  conflictStrategy?: 'overwrite' | 'merge' | 'reject';
}
```

2. The offline queue uses MODULE-LEVEL FUNCTIONS (not class methods).
   Add conflict detection as module-level functions:

```typescript
/**
 * Extract entity info from the HTTP path for version checking.
 * E.g., '/api/bookings/booking_123' → { storageKey: 'bookings', entityId: 'booking_123' }
 */
function parsePathForEntity(path: string): { storageKey: string; entityId: string } | null {
  // Parse /api/{collection}/{id} pattern
  const match = path.match(/^\/api\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return { storageKey: match[1], entityId: match[2] };
}

async function detectConflict(action: QueuedAction): Promise<boolean> {
  if (action.method === 'POST') return false; // Creates can't conflict

  if (!action.baseVersion) return false; // No version to compare

  const parsed = parsePathForEntity(action.path);
  if (!parsed) return false;

  const items = await apiClient.get<Array<{ id: string; version?: number }>>(
    parsed.storageKey,
    []
  );
  const current = items.find(item => item.id === parsed.entityId);

  if (!current) return true; // Deleted while offline

  if (current.version !== undefined && current.version > action.baseVersion) {
    return true; // Modified while offline
  }

  return false;
}
```

3. UPDATE flushQueue (lines 194-271) to check conflicts before replay:

```typescript
export async function flushQueue(): Promise<Result<FlushResult, ServiceError>> {
  if (_isFlushing) {
    return ok({ processed: 0, failed: 0, remaining: 0, failedActions: [] });
  }
  _isFlushing = true;

  try {
    const queue = await loadQueue();
    if (queue.length === 0) {
      _isFlushing = false;
      return ok({ processed: 0, failed: 0, remaining: 0, failedActions: [] });
    }

    let processed = 0;
    const failedActions: string[] = [];

    for (const action of queue) {
      // Conflict detection
      const hasConflict = await detectConflict(action);
      if (hasConflict) {
        const strategy = action.conflictStrategy ?? 'overwrite';

        if (strategy === 'reject') {
          logger.warn('Conflict detected, rejecting queued action', {
            id: action.id, path: action.path,
          });
          await removeFromQueue(action.id);
          emitTyped(ServiceEvents.QUEUE_ACTION_FAILED, {
            actionId: action.id,
            path: action.path,
            method: action.method,
            error: 'Version conflict — action rejected',
            willRetry: false,
          });
          continue;
        }

        // 'overwrite' and 'merge' proceed with replay
        logger.info('Conflict detected, proceeding with strategy', {
          strategy, id: action.id,
        });
      }

      // ... existing apiFetch replay logic
    }

    // ... existing result handling
  } finally {
    _isFlushing = false;
  }
}
```

4. UPDATE addToQueue to capture version when queueing:

```typescript
export async function addToQueue(
  action: Omit<QueuedAction, 'id' | 'timestamp'>,
): Promise<Result<QueuedAction, ServiceError>> {
  // ... existing logic, but also accept baseVersion and conflictStrategy
  // from the caller when they know the entity version
}
```

5. Zero `any` types — the interface already uses `unknown` for body.
   All helper functions above use proper types.

FILE: `services/event-bus.ts`
No new events needed — use existing ServiceEvents.QUEUE_ACTION_FAILED for conflicts.

ACCEPTANCE:
✅ QueuedAction extended with optional baseVersion and conflictStrategy
✅ Conflict detection works with actual { method, path, body } interface
✅ parsePathForEntity extracts entity info from HTTP path
✅ Zero `any` types — body is `unknown`, items typed properly
✅ Module-level functions (matching actual architecture, NOT class methods)
✅ Uses existing ServiceEvents.QUEUE_ACTION_FAILED for conflict reporting
✅ 'reject' drops the action, 'overwrite' proceeds, 'merge' is TODO for v2
```

---

## Item 379: All form state in useState, lost on kill

**Problem**: `hooks/use-form.ts` ~74-78 stores form values in useState. App killed by OS → all draft data lost.

**Files**:
- `hooks/use-form.ts`
- `constants/storage-keys.ts`

```
Persist form state to AsyncStorage with auto-save.

FILE: `constants/storage-keys.ts`

ADD per-form storage key pattern (NOT a single FORM_DRAFTS key):
```typescript
// Use per-form keys to avoid read-modify-write races
// Pattern: FORM_DRAFT_${formId}
// Example: FORM_DRAFT_edit-profile, FORM_DRAFT_create-session
```

FILE: `hooks/use-form.ts`

1. The actual useForm signature (line 66-73) uses a config object:
```typescript
export function useForm<T extends { [K in keyof T]: string }>({
  initialValues,
  validators: fieldValidators,
  onSubmit,
  onValidationError,
  validateOnChange = false,
  validateOnBlur = true,
}: UseFormConfig<T>): UseFormReturn<T>
```

EXTEND UseFormConfig with optional persistence:
```typescript
export interface UseFormConfig<T extends { [K in keyof T]: string }> {
  // ... existing fields
  /** Unique form ID for draft persistence. If omitted, no persistence. */
  formId?: string;
  /** Auto-save delay in ms (default 1000) */
  autosaveDelay?: number;
}
```

2. Use PER-FORM storage keys (NOT a single FORM_DRAFTS key — that creates
   read-modify-write races when multiple forms save concurrently):

```typescript
const draftKey = formId ? `FORM_DRAFT_${formId}` : null;
const autosaveDelay = config.autosaveDelay ?? 1000;

const [isHydrated, setIsHydrated] = useState(!draftKey); // true if no persistence

// Load saved draft on mount
useEffect(() => {
  if (!draftKey) return;

  async function loadDraft() {
    const draft = await apiClient.get<{ values: T; timestamp: number } | null>(
      draftKey!,
      null
    );

    if (draft) {
      setValues(draft.values);
      logger.debug(`Loaded draft for form ${formId}`, { age: Date.now() - draft.timestamp });
    }
    setIsHydrated(true);
  }

  loadDraft();
}, [draftKey]);

// Auto-save draft (debounced)
useEffect(() => {
  if (!draftKey || !isHydrated) return;

  const timeoutId = setTimeout(async () => {
    await apiClient.set(draftKey, {
      values,
      timestamp: Date.now(),
    });
    logger.debug(`Auto-saved draft for form ${formId}`);
  }, autosaveDelay);

  return () => clearTimeout(timeoutId);
}, [values, draftKey, isHydrated, autosaveDelay]);
```

3. ADD clearDraft method:
```typescript
const clearDraft = useCallback(async () => {
  if (!draftKey) return;
  await apiClient.remove(draftKey);
  logger.debug(`Cleared draft for form ${formId}`);
}, [draftKey]);
```

4. EXTEND UseFormReturn:
```typescript
export interface UseFormReturn<T extends { [K in keyof T]: string }> {
  // ... existing fields
  isHydrated: boolean;
  clearDraft: () => Promise<void>;
}
```

USAGE EXAMPLE (using correct Result API: .success/.data):
```typescript
const form = useForm({
  initialValues: { name: '', email: '', bio: '' },
  validators: validationRules,
  onSubmit: handleSave,
  formId: 'edit-profile',
  autosaveDelay: 1500,
});

if (!form.isHydrated) {
  return <LoadingState />;
}

const handleSave = async (values: typeof form.values) => {
  const result = await saveProfile(values);
  if (result.success) {
    await form.clearDraft();
    router.back();
  }
};
```

ACCEPTANCE:
✅ Per-form storage keys: `FORM_DRAFT_${formId}` (NOT single FORM_DRAFTS key)
✅ No read-modify-write races between concurrent forms
✅ Draft auto-saved after delay (default 1s)
✅ isHydrated flag prevents render until load complete
✅ clearDraft() wrapped in useCallback
✅ Uses correct Result API: result.success / result.data
✅ Works without formId (backward compatible)
```

---

## Item 380: Token expiry during background causes silent logout

**Problem**: `services/auth-service.ts` ~362-369 checkTokenExpiry() runs on app actions. User backgrounds app for 2 hours → token expires → next action silently logs out.

**Files**:
- `services/auth-service.ts`

```
Add AppState listener to check token expiry on resume.

FILE: `services/auth-service.ts`

1. FIND class constructor or initialization:
```typescript
class AuthService {
  private logger = createLogger('AuthService');

  constructor() {
    // existing init
  }
}
```

IMPORTANT: Services must NOT show UI (no Alert.alert in service layer).
Emit an event and let a React component show the alert.

```typescript
import { AppState, type AppStateStatus } from 'react-native';

class AuthService {
  private logger = createLogger('AuthService');
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  constructor() {
    this.initAppStateListener();
  }

  private initAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      this.logger.debug('App became active, checking token expiry');
      const expiryCheck = await this.checkTokenExpiry();

      if (!expiryCheck.success) {
        // Token expired while backgrounded — emit event, don't show UI
        this.logger.warn('Token expired during background');
        emitTyped(ServiceEvents.TOKEN_EXPIRED_BACKGROUND, {
          timestamp: Date.now(),
        });
        // Do NOT call Alert.alert here — services must not show UI.
        // A React component listens for TOKEN_EXPIRED_BACKGROUND and shows
        // the alert + triggers logout.
      }
    }
  };

  public cleanup(): void {
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
  }
}
```

2. ADD a React component (or hook) that listens for the event and shows UI:
```typescript
// hooks/use-token-expiry-alert.ts
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { useAuth } from '@/hooks/use-auth';

export function useTokenExpiryAlert(): void {
  const { logout } = useAuth();

  useEffect(() => {
    const unsubscribe = onTyped(ServiceEvents.TOKEN_EXPIRED_BACKGROUND, () => {
      Alert.alert(
        'Session Expired',
        'Your session expired while the app was closed. Please log in again.',
        [{ text: 'OK', onPress: () => void logout() }]
      );
    });
    return unsubscribe;
  }, [logout]);
}
```

3. Use correct Result API: `expiryCheck.success` (NOT `.isOk`)

FILE: `services/event-bus.ts`
ADD to ServiceEvents:
```typescript
TOKEN_EXPIRED_BACKGROUND: 'auth:token_expired_background',
```

ADD to EventPayloads:
```typescript
[ServiceEvents.TOKEN_EXPIRED_BACKGROUND]: { timestamp: number };
```

ACCEPTANCE:
✅ AppState listener registered in constructor
✅ App resume → checkTokenExpiry() runs
✅ Service emits event (does NOT show Alert — services must not show UI)
✅ React hook/component shows Alert and triggers logout
✅ Uses correct Result API: result.success (NOT .isOk)
✅ Subscription typed as `ReturnType<typeof AppState.addEventListener> | null` (NOT `any`)
✅ cleanup() removes listener
```

---

## Item 381: No AppState listener anywhere

**Problem**: Zero calls to AppState.addEventListener. App doesn't react to background/foreground transitions.

**Note**: Items 377 and 380 add AppState listeners. This item ensures a GLOBAL listener for general app lifecycle.

**Files**:
- `services/app-lifecycle-service.ts` (new)
- `app/_layout.tsx`

```
Create app lifecycle service with AppState listener.

FILE: `services/app-lifecycle-service.ts` (NEW):
```typescript
import { AppState, type AppStateStatus } from 'react-native';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';

const logger = createLogger('AppLifecycle');

class AppLifecycleService {
  private subscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private appState: AppStateStatus = AppState.currentState;

  public init(): void {
    this.subscription = AppState.addEventListener('change', this.handleChange);
    logger.info('AppLifecycle service initialized', { initialState: this.appState });
  }

  private handleChange = (nextAppState: AppStateStatus): void => {
    const prevState = this.appState;
    this.appState = nextAppState;

    logger.debug('AppState changed', { from: prevState, to: nextAppState });

    if (prevState === 'background' && nextAppState === 'active') {
      emitTyped(ServiceEvents.APP_FOREGROUNDED, { timestamp: Date.now() });
    }

    if (prevState === 'active' && nextAppState === 'background') {
      emitTyped(ServiceEvents.APP_BACKGROUNDED, { timestamp: Date.now() });
    }

    if (nextAppState === 'active') {
      emitTyped(ServiceEvents.APP_ACTIVE, { timestamp: Date.now() });
    }
  };

  public getCurrentState(): AppStateStatus {
    return this.appState;
  }

  public cleanup(): void {
    this.subscription?.remove();
    this.subscription = null;
    logger.debug('AppLifecycle listener removed');
  }
}

export const appLifecycleService = new AppLifecycleService();
```

FILE: `services/event-bus.ts`
ADD to ServiceEvents object:
```typescript
APP_FOREGROUNDED: 'app:foregrounded',
APP_BACKGROUNDED: 'app:backgrounded',
APP_ACTIVE: 'app:active',
```

ADD to EventPayloads interface:
```typescript
[ServiceEvents.APP_FOREGROUNDED]: { timestamp: number };
[ServiceEvents.APP_BACKGROUNDED]: { timestamp: number };
[ServiceEvents.APP_ACTIVE]: { timestamp: number };
```

FILE: `app/_layout.tsx`

FIND root useEffect:
```typescript
useEffect(() => {
  // existing init
}, []);
```

ADD:
```typescript
import { appLifecycleService } from '@/services/app-lifecycle-service';

useEffect(() => {
  appLifecycleService.init();

  return () => {
    appLifecycleService.cleanup();
  };
}, []);
```

ACCEPTANCE:
✅ app-lifecycle-service.ts created
✅ subscription typed as ReturnType<typeof AppState.addEventListener> | null (NOT any)
✅ AppState listener registered in _layout.tsx
✅ APP_FOREGROUNDED event on background→active (uses ServiceEvents constant)
✅ APP_BACKGROUNDED event on active→background (uses ServiceEvents constant)
✅ APP_ACTIVE event on any→active (uses ServiceEvents constant)
✅ getCurrentState() returns current AppState
✅ cleanup() removes listener
✅ Zero any types
```

---

## Item 382: Offline queue replays overwrite newer edits

**Note**: Largely covered by Item 276 (conflict detection in flushQueue).
This item verifies that base-service.ts already has version support.

**Files**:
- `services/base-service.ts`
- `services/offline-queue.ts`

```
Verify base-service.ts version support and ensure offline queue uses it.

FILE: `services/base-service.ts`

1. ALREADY IMPLEMENTED: Read base-service.ts lines 271-307 (create) and 312-361 (update).
   - create() already sets `version: 1` (line 287)
   - update() already increments `version: (existing.version ?? 0) + 1` (line 341)
   - update() already has optimistic locking (lines 328-334):
     if updates.version !== existing.version → returns conflictError()
   - BaseEntity interface already has `version?: number` (line 17)

   This is ALREADY IMPLEMENTED. No changes needed to base-service.ts.

FILE: `services/offline-queue.ts`

The offline queue uses MODULE-LEVEL FUNCTIONS (not class methods) and replays
via `apiFetch()` (HTTP requests), NOT via service.create()/update()/delete().
There is no `executeOperation()` method or `getServiceForEntity()` method.

The actual replay (lines 213-234) calls:
```typescript
const apiResult = await apiFetch(action.path, {
  method: action.method,
  body: action.body ? JSON.stringify(action.body) : undefined,
});
```

Conflict detection for this HTTP-replay pattern is handled by Item 276's
`detectConflict()` function. No additional changes needed here.

ACCEPTANCE:
✅ BaseService.create() already sets version: 1 — VERIFIED
✅ BaseService.update() already increments version — VERIFIED
✅ BaseService.update() already has optimistic locking — VERIFIED
✅ Conflict detection handled by Item 276
✅ No duplicate work needed — this item is a verification checkpoint
```

---

## Item 383: Optimistic locking — ALREADY IMPLEMENTED

**Status**: ALREADY IMPLEMENTED in actual codebase. Mark as verification checkpoint.

**Verification**: Read `services/base-service.ts` lines 327-334 (update method):
```typescript
// Optimistic locking: reject if version doesn't match
const existing = data[index];
if (updates.version !== undefined && existing.version !== undefined
    && updates.version !== existing.version) {
  return err(conflictError(
    `${this.entityName} was modified by another process (expected version ${updates.version}, found ${existing.version})`
  ));
}
```

The actual implementation:
- Uses `conflictError()` helper from `types/result.ts` (code: 'CONFLICT')
- Checks `updates.version` against `existing.version`
- Returns Result err with CONFLICT code (valid ServiceErrorCode)
- Version incremented on every update: `version: (existing.version ?? 0) + 1`

This does NOT use a separate `checkVersion()` method — it's inline in update().
And it does NOT use a separate `options` parameter — it checks `updates.version`.

**Usage**: Callers pass the expected version in the updates object:
```typescript
const booking = await this.getById(bookingId);
if (!booking.success) return booking;

const result = await this.update(bookingId, {
  status: 'confirmed',
  version: booking.data.version,  // Pass version for optimistic locking
});

if (!result.success && result.error.code === 'CONFLICT') {
  // Handle conflict: reload and retry
}
```

**Action**: No code changes needed. Remove from sprint scope or mark as verified.

---

## Item 384: Offline queue purges after 24h, too aggressive

**Problem**: `services/offline-queue.ts` ~19-20 has 24h max age. User offline for weekend → all drafts lost.

**Files**:
- `services/offline-queue.ts`

```
Increase offline queue max age to 7 days.

FILE: `services/offline-queue.ts`

FIND constant (line 20):
```typescript
const QUEUE_ITEM_MAX_AGE_MS = 24 * 60 * 60 * 1000;
```

REPLACE with:
```typescript
const QUEUE_ITEM_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const QUEUE_ITEM_WARN_AGE_MS = 3 * 24 * 60 * 60 * 1000; // Warn after 3 days
```

The actual purge function is `purgeExpired()` (lines 152-174), a MODULE-LEVEL
FUNCTION (not a class method). It already accepts a customizable maxAgeMs parameter
with default of QUEUE_ITEM_MAX_AGE_MS:

```typescript
export async function purgeExpired(
  maxAgeMs: number = QUEUE_ITEM_MAX_AGE_MS,
): Promise<Result<number, ServiceError>>
```

UPDATE purgeExpired to add warning for aging items:
```typescript
export async function purgeExpired(
  maxAgeMs: number = QUEUE_ITEM_MAX_AGE_MS,
): Promise<Result<number, ServiceError>> {
  try {
    const queue = await loadQueue();
    const now = Date.now();
    const cutoff = now - maxAgeMs;
    const warnCutoff = now - QUEUE_ITEM_WARN_AGE_MS;

    const kept = queue.filter(a => a.timestamp >= cutoff);
    const purgedCount = queue.length - kept.length;

    // Warn about aging items
    const aging = kept.filter(a => a.timestamp < warnCutoff);
    if (aging.length > 0) {
      logger.warn(`${aging.length} queued actions older than 3 days`, {
        actions: aging.map(a => ({
          id: a.id,
          path: a.path,
          ageDays: Math.round((now - a.timestamp) / (24 * 60 * 60 * 1000)),
        })),
      });
    }

    if (purgedCount > 0) {
      const saveResult = await saveQueue(kept);
      if (!saveResult.success) return err(saveResult.error);
      logger.warn(`Purged ${purgedCount} queued actions older than 7 days`);
    }

    return ok(purgedCount);
  } catch (error) {
    logger.error('Failed to purge expired queue items', error);
    return err(storageError('Failed to purge expired queue items'));
  }
}
```

NOTE: Uses module-level function pattern (matching actual architecture),
QueuedAction interface (NOT QueuedOperation), and { path, method }
fields (NOT { operation, entityType }).

ACCEPTANCE:
✅ QUEUE_ITEM_MAX_AGE_MS = 7 days (was 24 hours)
✅ QUEUE_ITEM_WARN_AGE_MS = 3 days (new)
✅ Operations older than 7 days purged with detailed log
✅ Operations older than 3 days trigger warning log
✅ Uses module-level function pattern (NOT class method)
✅ Uses QueuedAction interface (NOT QueuedOperation)
```

---

## Item 385: Network type change not detected

**Problem**: `hooks/useConnectionStatus.ts` ~33-34 ignores state.type. WiFi→cellular doesn't trigger re-fetch.

**Files**:
- `hooks/useConnectionStatus.ts`

```
Track network type changes in useConnectionStatus.

FILE: `hooks/useConnectionStatus.ts`

1. FIND hook (~20-50):
```typescript
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
    });

    return unsubscribe;
  }, []);

  return { isConnected };
}
```

REPLACE with (fix stale closure by using REFS for comparison values
in the NetInfo listener):
```typescript
import { emitTyped, onTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ConnectionStatus');

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [isExpensive, setIsExpensive] = useState(false);

  // Use refs for comparison values to avoid stale closures in NetInfo listener
  const isConnectedRef = useRef(true);
  const connectionTypeRef = useRef<string>('unknown');

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then(state => {
      const connected = state.isConnected ?? false;
      const type = state.type;
      const expensive = state.details?.isConnectionExpensive ?? false;

      setIsConnected(connected);
      setConnectionType(type);
      setIsExpensive(expensive);
      isConnectedRef.current = connected;
      connectionTypeRef.current = type;
    });

    // Subscribe — refs avoid stale closure issue
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasConnected = isConnectedRef.current;
      const prevType = connectionTypeRef.current;

      const nowConnected = state.isConnected ?? false;
      const nowType = state.type;
      const nowExpensive = state.details?.isConnectionExpensive ?? false;

      // Update refs BEFORE state (refs are synchronous)
      isConnectedRef.current = nowConnected;
      connectionTypeRef.current = nowType;

      // Update state
      setIsConnected(nowConnected);
      setConnectionType(nowType);
      setIsExpensive(nowExpensive);

      // Emit typed events using existing ServiceEvents.CONNECTION_CHANGED
      if (!wasConnected && nowConnected) {
        logger.info('Connection restored', { type: nowType });
        emitTyped(ServiceEvents.CONNECTION_CHANGED, {
          isConnected: true,
          wasOffline: true,
        });
      }

      if (wasConnected && !nowConnected) {
        logger.warn('Connection lost');
        emitTyped(ServiceEvents.CONNECTION_CHANGED, {
          isConnected: false,
          wasOffline: false,
        });
      }

      if (wasConnected && nowConnected && prevType !== nowType) {
        logger.info('Connection type changed', { from: prevType, to: nowType });
      }
    });

    return unsubscribe;
  }, []); // Empty deps — refs handle comparison values

  return {
    isConnected,
    connectionType,
    isExpensive,
    isWifi: connectionType === 'wifi',
    isCellular: connectionType === 'cellular',
  };
}
```

KEY FIX: The original code used `isConnected` and `connectionType` STATE
variables inside the NetInfo listener, causing stale closures. By using
REFS (`isConnectedRef`, `connectionTypeRef`), the listener always sees
current values without needing to re-subscribe.

Empty dependency array `[]` is correct — the listener is set up once and
refs handle the mutable comparison values.

NOTE: Uses existing ServiceEvents.CONNECTION_CHANGED event (already defined
in event-bus.ts with payload `{ isConnected: boolean; wasOffline: boolean }`).
No new events needed — the offline queue already listens for CONNECTION_CHANGED
via initAutoFlush().

USAGE EXAMPLE (zero `any` — use proper event payload types):
```typescript
const { isConnected, isExpensive, isWifi } = useConnectionStatus();

useEffect(() => {
  const unsubscribe = onTyped(ServiceEvents.CONNECTION_CHANGED, (payload) => {
    if (payload.isConnected && payload.wasOffline) {
      // Trigger data refresh
    }
  });
  return unsubscribe;
}, []);
```

ACCEPTANCE:
✅ Hook tracks connectionType and isExpensive
✅ Uses existing ServiceEvents.CONNECTION_CHANGED event for online/offline transitions
✅ No new event constants needed — CONNECTION_CHANGED payload { isConnected, wasOffline } covers all cases
✅ Connection type changes logged (not emitted as separate event)
✅ Returns isWifi, isCellular helpers
✅ Logs all connection changes
```

---

## Sprint 2 Summary

**Effort**: 4-5 days (1 dev)

**Priority**: P1 — These issues cause data loss (form drafts, queue conflicts) and poor offline UX.

**Dependencies**:
- Item 192: Needs STORAGE_KEYS extended
- Item 276: Must match actual QueuedAction interface (method/path/body)
- Item 379: Per-form storage keys (FORM_DRAFT_${formId})
- Items 380-381: AppState subscription typed properly (NOT `any`)
- Items 382-383: ALREADY IMPLEMENTED — verification checkpoints only
- Item 385: Uses refs for stale closure fix, existing CONNECTION_CHANGED event

**Testing** (use `node --test` runner, NOT Jest):
```bash
npx tsc -p tsconfig.test.json
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js
```

- Item 192: Fill onboarding → navigate away → return → progress restored
- Item 276: Queue action with baseVersion → detect version conflict on flush
- Item 379: Type in long form → kill app → reopen → form restored
- Item 380: Background app → resume → TOKEN_EXPIRED_BACKGROUND event (Alert from React hook, NOT service)
- Item 381: Background/foreground app → see APP_FOREGROUNDED/APP_BACKGROUNDED events
- Item 382: VERIFIED — base-service already has version support
- Item 383: VERIFIED — optimistic locking already implemented
- Item 384: Queue operations persist for 7 days, warn after 3 days
- Item 385: Switch WiFi→cellular → CONNECTION_CHANGED event (uses refs, no stale closure)

**Success criteria**:
- Zero form data lost on app kill (per-form storage keys)
- Offline queue conflicts use actual QueuedAction interface (method/path/body)
- Token expiry event emitted by service, Alert shown by React hook (separation of concerns)
- AppState subscription typed as `ReturnType<typeof AppState.addEventListener> | null` (zero `any`)
- Network listener uses refs for comparison values (no stale closure)
- Offline queue retains operations for 7 days
- Optimistic locking verified as already implemented
- Zero `any` types in all new code
