# Sprint 12: Eliminate All `any` Types

## Objective

Remove every `any` type annotation from the codebase. After this sprint, `grep -rn ': any\b\|as any\b' --include='*.ts' --include='*.tsx'` should return zero results in source files (excluding English prose like "has any allergies").

## Current State

**47 true `any` type occurrences** across **18 files**:
- 4 production source files (hooks, components, app screens)
- 2 production hook data files
- 12 test files

## Complete File List with Occurrences

### Production Code (6 files, 12 occurrences) -- MUST FIX

#### 1. `hooks/usePushNotifications.ts` (5 occurrences)

```
Line 31: lastNotification: any | null;
Line 40: const [lastNotification, setLastNotification] = useState<any | null>(null);
Line 42: const notificationListener = useRef<any>(null);
Line 43: const responseListener = useRef<any>(null);
```

**Fix:** Import or define proper Expo Notifications types.

```typescript
// BEFORE
lastNotification: any | null;
const [lastNotification, setLastNotification] = useState<any | null>(null);
const notificationListener = useRef<any>(null);
const responseListener = useRef<any>(null);

// AFTER
import type { Subscription } from 'expo-modules-core';

interface NotificationContent {
  title: string | null;
  body: string | null;
  data: Record<string, unknown>;
}

interface ExpoNotification {
  date: number;
  request: {
    identifier: string;
    content: NotificationContent;
    trigger: unknown;
  };
}

// In the interface:
lastNotification: ExpoNotification | null;

// In the component:
const [lastNotification, setLastNotification] = useState<ExpoNotification | null>(null);
const notificationListener = useRef<Subscription | null>(null);
const responseListener = useRef<Subscription | null>(null);
```

**Note:** Read the actual Expo Notifications API to determine exact types. The `Subscription` type from `expo-modules-core` is the return type of `addNotificationReceivedListener` and `addNotificationResponseReceivedListener`. The notification object type should match what Expo actually passes. If Expo types aren't easily importable in the Node test environment, define local interfaces that match the shape.

#### 2. `hooks/data/useCoachData.ts` (2 occurrences)

```
Line 120: const promises: Promise<any>[] = [];
Line 153: const resultMap: Record<string, any> = {};
```

**Fix:** Read the file to understand what promises and results are stored. Use proper union types.

```typescript
// Likely fix (verify by reading the file):
import type { Result } from '@/types/result';

// The promises array holds Results from various service calls
const promises: Promise<Result<unknown, ServiceError>>[] = [];

// The resultMap holds the resolved values
const resultMap: Record<string, unknown> = {};

// OR if you can determine specific types:
interface CoachDataResults {
  bookings: Booking[];
  reviews: Review[];
  // etc.
}
const resultMap: Partial<CoachDataResults> = {};
```

#### 3. `hooks/data/useClubData.ts` (2 occurrences)

```
Line 128: const promises: Promise<any>[] = [];
Line 151: const resultMap: Record<string, any> = {};
```

**Fix:** Same pattern as useCoachData.ts. Read the file to determine specific types.

```typescript
const promises: Promise<Result<unknown, ServiceError>>[] = [];
const resultMap: Record<string, unknown> = {};
```

#### 4. `components/ui/skeleton.tsx` (1 occurrence)

```
Line 32: width: width as any,
```

**Fix:** The `width` prop accepts `number | string` (e.g., `'80%'`), but React Native's `ViewStyle.width` type is `DimensionValue`. Cast properly.

```typescript
// BEFORE
width: width as any,

// AFTER
import type { DimensionValue } from 'react-native';

// In props interface, ensure width is typed as:
width?: DimensionValue;

// Then no cast is needed:
width,
// OR if the prop type is string | number:
width: width as DimensionValue,
```

#### 5. `app/discover/filters.tsx` (1 occurrence)

```
Line 82: } as any);
```

**Fix:** This is a router.replace call with typed route params. The `as any` is used to bypass Expo Router's strict route typing.

```typescript
// BEFORE
router.replace({
  pathname: returnTo,
  params: { appliedFilters: filtersParam },
} as any);

// AFTER
// Use Href type from expo-router:
import type { Href } from 'expo-router';

router.replace({
  pathname: returnTo,
  params: { appliedFilters: filtersParam },
} as Href);
```

**Note:** `as Href` is an allowed safe cast per CLAUDE.md rules (it's not `as any` or `as unknown as T`).

#### 6. `hooks/usePushNotifications.ts` (1 additional -- line 40 already counted above)

Already addressed in item 1 above.

---

### Test Files (12 files, 35 occurrences) -- FIX WITH PROPER TYPES

Test files should also avoid `any`. Use `unknown`, proper interfaces, or `as unknown as SpecificType` for mocks.

#### 7. `__tests__/bookings/booking-service.test.ts` (2 occurrences)

```
Line 83: let mockAvailableSlots: any[] = [];
Line 84: let mockNotifications: any[] = [];
```

**Fix:** Read the test to understand what shape these mock arrays hold.

```typescript
// Read the test file to find what properties are accessed.
// Likely:
interface MockSlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}
let mockAvailableSlots: MockSlot[] = [];

interface MockNotification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}
let mockNotifications: MockNotification[] = [];
```

#### 8. `__tests__/messaging/messaging-service.test.ts` (3 occurrences)

```
Line 29: attachments?: any[];
Line 46: let mockNotifications: any[] = [];
Line 71: attachments: any[] = []
```

**Fix:**

```typescript
// Define a mock attachment interface based on usage:
interface MockAttachment {
  type: string;
  uri: string;
  name?: string;
}

// Line 29: attachments?: MockAttachment[];
// Line 46: let mockNotifications: MockNotification[] = [];
// Line 71: attachments: MockAttachment[] = []
```

#### 9. `__tests__/invite/accept-revert.test.ts` (4 occurrences)

```
Line 71: let mockNotifications: any[] = [];
Line 72: let bookingCreateResult: { success: boolean; data?: any; error?: { code: string; message: string } } = {
Line 81: async createBooking(_params: any): Promise<typeof bookingCreateResult> {
Line 88: async create(notification: any): Promise<any[]> {
```

**Fix:**

```typescript
// Read the test to understand the Booking and Notification shapes used.
// Line 71:
let mockNotifications: MockNotification[] = [];

// Line 72: Replace `data?: any` with the actual booking data shape:
interface BookingCreateResult {
  success: boolean;
  data?: { id: string; status: string; [key: string]: unknown };
  error?: { code: string; message: string };
}
let bookingCreateResult: BookingCreateResult = { ... };

// Line 81: Type the params based on what createBooking expects:
interface CreateBookingParams {
  coachId: string;
  date: string;
  startTime: string;
  endTime: string;
  athleteId?: string;
}
async createBooking(_params: CreateBookingParams): Promise<BookingCreateResult> {

// Line 88:
async create(notification: MockNotification): Promise<MockNotification[]> {
```

#### 10. `__tests__/calendar/calendar-sync.test.ts` (9 occurrences)

```
Line 57:  (calMod as any).filename = 'expo-calendar';
Line 58:  (calMod as any).loaded = true;
Line 60:  (Module as any)._cache['expo-calendar'] = calMod;
Line 110: const origResolve = (Module as any)._resolveFilename;
Line 118: (mod as any).filename = fakeName;
Line 119: (mod as any).loaded = true;
Line 121: (Module as any)._cache[fakeName] = mod;
Line 128: const prevResolve = (Module as any)._resolveFilename;
Line 129: (Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
```

**Fix:** These are Node.js `Module` internal API hacks for mocking. Use proper typing:

```typescript
// Define an interface for the Module internals we're accessing:
interface ModuleInternal {
  filename: string;
  loaded: boolean;
}

interface ModuleConstructor {
  _cache: Record<string, ModuleInternal>;
  _resolveFilename: (request: string, parent: unknown, isMain: boolean, options: unknown) => string;
}

// Cast Module once at the top of the file:
const ModuleInternals = Module as unknown as ModuleConstructor;

// Then use:
calMod.filename = 'expo-calendar';  // if calMod is already typed
calMod.loaded = true;
ModuleInternals._cache['expo-calendar'] = calMod;
const origResolve = ModuleInternals._resolveFilename;
ModuleInternals._resolveFilename = function (request: string, parent: unknown, isMain: boolean, options: unknown) {
  // ...
};
```

**Note:** `as unknown as ModuleConstructor` is a safe narrowing pattern used specifically for Node internals that don't have public types. This is acceptable.

#### 11. `__tests__/completion/notification-trigger.test.ts` (2 occurrences)

```
Line 21: let capturedNotifications: any[] = [];
Line 25: create: async (notification: any) => {
```

**Fix:**

```typescript
// Define what a notification looks like in this test context:
interface TestNotification {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

let capturedNotifications: TestNotification[] = [];
create: async (notification: TestNotification) => {
```

#### 12. `__tests__/completion/session-completed-event.test.ts` (9 occurrences)

```
Line 53:  let received: any = null;
Line 55:  eventBus.on(ServiceEvents.SESSION_COMPLETED, (data: any) => {
Line 76:  let received: any = null;
Line 78:  eventBus.on(ServiceEvents.SESSION_COMPLETED, (data: any) => {
Line 188: let received: any = null;
Line 237: let received: any = null;
Line 260: let received: any = null;
Line 288: const events: any[] = [];
Line 318: const events: any[] = [];
```

**Fix:** Use the actual event payload type from the event bus:

```typescript
// Import the payload type:
import type { EventPayloads } from '@/services/event-bus';

type SessionCompletedPayload = EventPayloads[typeof ServiceEvents.SESSION_COMPLETED];

// Replace all instances:
let received: SessionCompletedPayload | null = null;
eventBus.on(ServiceEvents.SESSION_COMPLETED, (data: SessionCompletedPayload) => {
const events: SessionCompletedPayload[] = [];
```

**If `EventPayloads` doesn't export the right key**, read `services/event-bus.ts` to find the correct type. Alternatively, define a local interface matching the payload shape used in the test assertions.

## Verification Commands

```bash
# 1. Check for any remaining `any` type annotations in source code
# This grep finds `: any`, `as any`, `any[]`, `any |` patterns
# but filters out English prose (e.g., "has any", "for any", "of any")
grep -rn '\bany\b' --include='*.ts' --include='*.tsx' . | \
  grep -v node_modules | \
  grep -v '.tmp-tests' | \
  grep -E ':\s*any\b|as any\b|any\[\]|any\s*\||\bany>' | \
  grep -v '// .*any' | \
  grep -v '\* .*any'
# Expected: 0 matches

# 2. Simpler check -- just look for the type keyword `any` in type positions
grep -rn ': any\b' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v '.tmp-tests'
grep -rn 'as any\b' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v '.tmp-tests'
grep -rn 'any\[\]' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v '.tmp-tests'
grep -rn '<any>' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v '.tmp-tests'
grep -rn 'Promise<any>' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v '.tmp-tests'
grep -rn 'Record<string, any>' --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v '.tmp-tests'
# Expected: all return 0 matches

# 3. TypeScript compilation (catches any type errors from fixes)
npx tsc -p tsconfig.test.json

# 4. Run all tests (catches any runtime breakage)
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js
# Expected: 1760+ tests pass
```

## Agent Execution Order

This sprint is small enough for a **single agent** or **2 parallel agents**:

### Agent A: Production Code (6 files, 12 occurrences)

Execute in this order:
1. `hooks/usePushNotifications.ts` -- 5 `any` types
2. `hooks/data/useCoachData.ts` -- 2 `any` types
3. `hooks/data/useClubData.ts` -- 2 `any` types
4. `components/ui/skeleton.tsx` -- 1 `any` type
5. `app/discover/filters.tsx` -- 1 `any` type

After fixing all 5 files, run `npx tsc -p tsconfig.test.json` to verify compilation.

### Agent B: Test Files (12 files, 35 occurrences)

Execute in this order (grouped by complexity):

**Simple fixes (define local mock interfaces):**
1. `__tests__/bookings/booking-service.test.ts` -- 2 occurrences
2. `__tests__/messaging/messaging-service.test.ts` -- 3 occurrences
3. `__tests__/completion/notification-trigger.test.ts` -- 2 occurrences

**Medium fixes (use event bus types):**
4. `__tests__/completion/session-completed-event.test.ts` -- 9 occurrences
5. `__tests__/invite/accept-revert.test.ts` -- 4 occurrences

**Complex fix (Node Module internals):**
6. `__tests__/calendar/calendar-sync.test.ts` -- 9 occurrences

After fixing all test files:
```bash
npx tsc -p tsconfig.test.json
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js
```

## Agent Instructions

For each file:

1. **READ the entire file** to understand what types are actually needed.
2. **For each `any` occurrence**, determine what type it SHOULD be:
   - If a specific type exists in the codebase (e.g., `Booking`, `Session`, `EventPayloads`), use it.
   - If the value comes from a library (e.g., Expo Notifications), define a local interface matching the shape actually used.
   - If the value is truly generic (e.g., a cache or registry), use `unknown` or `Record<string, unknown>`.
   - For test mocks, define a minimal interface with only the properties the test accesses.
3. **Do NOT use `any` anywhere**, including:
   - `as any` -- use `as Href`, `as DimensionValue`, `as unknown as SpecificType` etc.
   - `: any` -- use the proper type or `unknown`
   - `any[]` -- use `SpecificType[]` or `unknown[]`
   - `Promise<any>` -- use `Promise<Result<unknown, ServiceError>>` or specific type
   - `Record<string, any>` -- use `Record<string, unknown>` or a specific interface
4. **Verify the fix compiles** after each file (or batch of files).
5. **Verify tests still pass** after fixing test files.

## False Positives to Ignore

These lines contain the English word "any" in comments or strings, NOT type annotations. Do NOT modify them:

```
services/safety-service.ts:310:   * Check if athlete has any allergies or medical conditions
services/injury-service.ts:578:   * Check if user has any active injuries
utils/validation.ts:214:   * Check if form has any errors.
app/(modal)/add-child.tsx:172: 'Please indicate if your child has any special needs...'
app/availability/scheduling-rules.tsx:231: Athletes can book at any time...
components/recurring/RecurringList.tsx:119: 'You don't have any recurring bookings...'
(and many other UI strings and JSDoc comments)
```

## Risk Assessment

**Low risk.** All changes are type-level only -- no runtime behavior changes. TypeScript compilation will catch any incorrect types immediately. Test execution confirms no breakage.

The most complex fix is `__tests__/calendar/calendar-sync.test.ts` which patches Node.js `Module` internals. The `as unknown as ModuleConstructor` pattern is the correct way to type these internal APIs. If compilation issues arise, the fallback is `as unknown as Record<string, unknown>` which is still better than `as any`.
