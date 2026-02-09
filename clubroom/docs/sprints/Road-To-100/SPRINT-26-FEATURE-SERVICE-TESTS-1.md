# Sprint 26: Feature Service Tests -- Invite, Squad, Community, Social, Messaging, Match, Video

> **Phase:** 4 (Test Coverage)
> **Sprint:** 26 of 28
> **Scope:** 12 feature services in the social/communication domain
> **Goal:** Every public method has at least one `ok()` test and one `err()` test.
> **Test Runner:** Node.js built-in test runner (`node --test`), NOT Jest
> **Test Location:** `__tests__/[feature]/[service-name].test.ts`

---

## Pre-Read (MANDATORY)

Before starting ANY work, read these files:

1. `/Users/tubton/Desktop/coachapplication/CLAUDE.md` -- Architecture rules, test commands
2. `/Users/tubton/Desktop/coachapplication/clubroom/services/base-service.ts` -- BaseService CRUD pattern
3. `/Users/tubton/Desktop/coachapplication/clubroom/types/result.ts` -- Result<T>, ok(), err()
4. `/Users/tubton/Desktop/coachapplication/clubroom/services/api-client.ts` -- apiClient mocking
5. `/Users/tubton/Desktop/coachapplication/clubroom/services/event-bus.ts` -- ServiceEvents, emitTyped
6. `/Users/tubton/Desktop/coachapplication/clubroom/constants/storage-keys.ts` -- STORAGE_KEYS
7. `/Users/tubton/Desktop/coachapplication/clubroom/tsconfig.test.json` -- Current include list
8. One of the Sprint 25 test files (for pattern reference)

---

## Existing Tests (check FIRST)

```
__tests__/invite/accept-revert.test.ts               -- invite service (partial)
__tests__/invite/decline-reason.test.ts               -- invite service (partial)
__tests__/invite/invite-booking-flow.test.ts          -- invite booking integration
__tests__/invite/invite-rsvp-service.test.ts          -- invite-rsvp-service.ts
__tests__/invite/invite-share-service.test.ts         -- invite-share-service.ts
__tests__/squad/squad-bulk-invite-service.test.ts     -- bulk-invite-service.ts
__tests__/squad/squad-group-service.test.ts           -- squad-group-service.ts
__tests__/community/community-service.test.ts         -- community-service.ts (the old monolith)
__tests__/social/coach-post-service.test.ts           -- social-feed-service.ts (partial)
__tests__/comments/comment-service.test.ts            -- comment-service.ts
__tests__/messaging/messaging-service.test.ts         -- messaging-service.ts
__tests__/video/annotation-service.test.ts            -- video annotation (partial)
```

**For each service below:** First check if a test file already exists and what it covers. Only create NEW tests for uncovered methods.

---

## Services to Test (12 services)

| # | Service File | Existing Tests? | Action |
|---|-------------|-----------------|--------|
| 1 | `services/invite/session-invite-service.ts` | PARTIAL (accept-revert, decline-reason) | Add comprehensive CRUD + status tests |
| 2 | `services/invite/invite-rsvp-service.ts` | YES | Review coverage, add gaps |
| 3 | `services/invite/invite-share-service.ts` | YES | Review coverage, add gaps |
| 4 | `services/squad-service.ts` | NO | Create `__tests__/squad/squad-service.test.ts` |
| 5 | `services/squad-group-service.ts` | YES | Review coverage, add gaps |
| 6 | `services/community/community-group-service.ts` | PARTIAL (via community-service.test.ts) | Create `__tests__/community/community-group-service.test.ts` |
| 7 | `services/community/community-messaging-service.ts` | NO | Create `__tests__/community/community-messaging-service.test.ts` |
| 8 | `services/social-feed-service.ts` | PARTIAL (coach-post-service.test.ts) | Add comprehensive tests |
| 9 | `services/comment-service.ts` | YES | Review coverage, add gaps |
| 10 | `services/messaging-service.ts` | YES | Review coverage, add gaps |
| 11 | `services/match-service.ts` | NO | Create `__tests__/match/match-service.test.ts` |
| 12 | `services/video-service.ts` | PARTIAL (annotation tests) | Create `__tests__/video/video-service.test.ts` |

---

## Step-by-Step Instructions

### Step 0: Audit Existing Coverage

For each service in the table above:

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. Read the service file to get all public methods
# Example for session-invite-service.ts:
grep -n 'async \|export function\|export const' services/invite/session-invite-service.ts | head -30

# 2. Read the existing test file (if any) to see what's covered
# Example:
cat __tests__/invite/accept-revert.test.ts | grep 'test(' | head -20
cat __tests__/invite/decline-reason.test.ts | grep 'test(' | head -20
```

Make a mental checklist: method -> tested? -> ok path? -> err path?

### Step 1: Write Tests for Each Service

Follow the test template from Sprint 25. Key differences for feature services:

#### Invite Services (services/invite/)

The invite module has 5+ services behind an index.ts facade. Read `services/invite/index.ts` to understand the public API.

**session-invite-service.ts** -- Core invite CRUD:
```typescript
import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';
import { apiClient } from '@/services/api-client';
import { eventBus } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';

// Import from the module facade OR directly
import { sessionInviteService } from '@/services/invite/session-invite-service';

describe('SessionInviteService', () => {
  beforeEach(async () => {
    // Clear ALL invite-related storage keys
    await apiClient.set(STORAGE_KEYS.SESSION_INVITES, []);
    eventBus.clearAll();
  });

  afterEach(async () => {
    await apiClient.set(STORAGE_KEYS.SESSION_INVITES, []);
  });

  describe('createInvite', () => {
    test('returns ok(invite) with valid params', async () => {
      const result = await sessionInviteService.create({
        coachId: 'coach-1',
        // ... other required fields
      });
      assert.ok(result.success, `Expected ok, got: ${!result.success ? result.error.message : ''}`);
      assert.ok(result.data.id);
    });

    test('returns err(VALIDATION) with missing coachId', async () => {
      const result = await sessionInviteService.create({
        coachId: '',
        // ... other fields
      });
      assert.ok(!result.success);
      assert.strictEqual(result.error.code, 'VALIDATION');
    });
  });

  describe('acceptInvite', () => {
    test('returns ok and changes status to ACCEPTED', async () => {
      // First create an invite
      const createResult = await sessionInviteService.create({ /* ... */ });
      assert.ok(createResult.success);
      const inviteId = createResult.data.id;

      // Accept it
      const result = await sessionInviteService.accept(inviteId);
      assert.ok(result.success);
      // Verify status changed
    });

    test('returns err(NOT_FOUND) for nonexistent invite', async () => {
      const result = await sessionInviteService.accept('nonexistent');
      assert.ok(!result.success);
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    });
  });

  // ... declineInvite, getInvitesForCoach, getInvitesForParent, etc.
});
```

#### Squad Service (services/squad-service.ts)

```typescript
describe('SquadService', () => {
  // Test: createSquad, getSquad, addMember, removeMember, getSquadMembers
  // Test: validation (empty name, duplicate members)
  // Test: events emitted on create/update
});
```

#### Community Services (services/community/)

The community module has been split: `community-group-service.ts`, `community-messaging-service.ts`, `community-carpool-service.ts`. Each needs its own test file.

```typescript
// __tests__/community/community-group-service.test.ts
describe('CommunityGroupService', () => {
  // Test: createGroup, getGroup, joinGroup, leaveGroup, getGroupMembers
  // Test: group types (GENERAL, CARPOOL, SQUAD_PARENTS)
  // Test: isPublic/isPrivate filtering
});

// __tests__/community/community-messaging-service.test.ts
describe('CommunityMessagingService', () => {
  // Test: sendMessage, getMessages, pinMessage, unpinMessage
  // Test: message in nonexistent group -> err
  // Test: message ordering (newest first)
});
```

#### Match Service (services/match-service.ts)

```typescript
describe('MatchService', () => {
  // Test: createMatch, getMatch, updateMatch, deleteMatch
  // Test: addToLineup, removeFromLineup, getLineup
  // Test: match status transitions
  // Test: availability responses
});
```

#### Video Service (services/video-service.ts)

```typescript
describe('VideoService', () => {
  // Test: uploadVideo (mock), getVideos, deleteVideo
  // Test: addAnnotation, getAnnotations, deleteAnnotation
  // Test: video not found errors
  // Note: Actual file operations are mocked by test-register.js (expo-file-system)
});
```

### Step 2: Handle Module Imports Correctly

Services in module directories (invite/, community/) use index.ts facades. Test files can import either way:

```typescript
// Import from facade (preferred -- tests the public API)
import { sessionInviteService, inviteRsvpService } from '@/services/invite';

// OR import directly (for testing internal methods)
import { sessionInviteService } from '@/services/invite/session-invite-service';
```

### Step 3: Update tsconfig.test.json

Add any new test directories AND service files not already included:

```json
{
  "include": [
    // New test directories (if created)
    "__tests__/match/**/*.ts",
    // Note: __tests__/squad/, __tests__/community/, __tests__/invite/,
    // __tests__/social/, __tests__/video/, __tests__/messaging/
    // should already exist from prior tests

    // Service files (check if missing)
    "services/match-service.ts",
    "services/messaging-service.ts",
    // services/invite/**/*.ts should already be included
    // services/community/**/*.ts should already be included
  ]
}
```

**Check transitive dependencies:** If `squad-service.ts` imports `roster-service.ts`, both must be in the include list.

### Step 4: Compile and Run

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Compile
npx tsc -p tsconfig.test.json

# Run all tests
node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'

# Run specific test files for debugging
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/squad/squad-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/match/match-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/community/community-group-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/community/community-messaging-service.test.js'
node --require ./scripts/test-register.js --test '.tmp-tests/__tests__/video/video-service.test.js'
```

### Step 5: Fix and Iterate

Common issues in feature service tests:

1. **Storage key mismatch:** Read the service to find the exact STORAGE_KEYS constant used
2. **Event name mismatch:** Check ServiceEvents enum in event-bus.ts for the exact event name
3. **Import resolution:** Module facade might re-export with different names
4. **Date.now() collision:** Use `Math.random().toString(36).slice(2, 8)` for unique IDs
5. **Stale cache:** BaseService has a 30s cache. If tests fail because of stale data, the service's `clear()` method should invalidate the cache. If not, seed storage BEFORE creating the service instance.

---

## Quality Checklist (verify EVERY test file)

- [ ] Uses `node:test` (describe, test, beforeEach, afterEach) -- NOT Jest
- [ ] Uses `node:assert/strict`
- [ ] Imports from actual service module (not mocked)
- [ ] Uses `apiClient` for storage setup/teardown
- [ ] Uses `eventBus.clearAll()` in beforeEach
- [ ] Clears storage in beforeEach AND afterEach
- [ ] Unique IDs per test (no `Date.now()`, use `Math.random()`)
- [ ] Tests EVERY public method on the service
- [ ] Each method has at least one ok() success test
- [ ] Each method has at least one err() error test
- [ ] Tests event emissions where applicable
- [ ] Tests validation (empty/invalid inputs)
- [ ] No cross-test state leaks (each test is isolated)
- [ ] tsconfig.test.json includes all new dirs + service files + transitive deps
- [ ] `npx tsc -p tsconfig.test.json` compiles clean
- [ ] All tests pass

---

## Verification Commands

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. Compile
npx tsc -p tsconfig.test.json

# 2. Run all tests
node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'

# 3. Count tests
find __tests__ -name "*.test.ts" | wc -l

# 4. Verify coverage of key services
for svc in squad-service match-service video-service community-group-service community-messaging-service; do
  echo "=== $svc ==="
  find __tests__ -name "*${svc}*" 2>/dev/null || echo "MISSING"
done
```

---

## Parallel Agent Strategy

- **Agent A**: Invite services (session-invite + review rsvp + review share) -- most complex
- **Agent B**: Squad + Community (squad-service, community-group, community-messaging) -- module services
- **Agent C**: Social + Comment + Messaging (social-feed, comment, messaging) -- review + extend
- **Agent D**: Match + Video (new test files)

---

## Estimated Output

- **Input:** 12 services to test
- **Output:** ~5-7 new test files, ~5 existing files with added tests
- **Test count:** ~80-120 new tests
- **Duration:** ~3 hours for experienced agent
