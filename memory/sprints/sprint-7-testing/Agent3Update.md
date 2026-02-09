# Sprint 7 — Service Testing
## Agent 3: Feature Service Tests — E-N

**Status**: NOT_STARTED
**Blocked by**: Sprint 7 Agent 1 (core infra tests must pass first)

---

## Objective
Write tests for all untested feature services in the E-N alphabetical range: event, family, follow, group-session, invite, match, notification.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY read these service files and create test files:**

### Services to TEST (25 services — read-only):
```
clubroom/services/event-service.ts
clubroom/services/event/event-attendance-service.ts
clubroom/services/event/event-crud-service.ts
clubroom/services/event/event-display-service.ts
clubroom/services/event/event-rsvp-service.ts
clubroom/services/family/family-member-service.ts
clubroom/services/family/family-permission-service.ts
clubroom/services/family/family-relationship-service.ts
clubroom/services/follow-service.ts
clubroom/services/group-session-service.ts
clubroom/services/group-session/session-crud-service.ts
clubroom/services/group-session/session-display-service.ts
clubroom/services/group-session/session-registration-service.ts
clubroom/services/group-session/session-scheduling-service.ts
clubroom/services/invite-hold-service.ts
clubroom/services/invite/bulk-invite-service.ts
clubroom/services/invite/event-invite-service.ts
clubroom/services/invite/match-invite-service.ts
clubroom/services/invite/repeat-invite-helper.ts
clubroom/services/invite/session-invite-service.ts
clubroom/services/invite/squad-invite-service.ts
clubroom/services/match-service.ts
clubroom/services/notification-service.ts
clubroom/services/notification/notification-sender.ts
clubroom/services/notification/notification-store.ts
```

### Test files to CREATE:
```
clubroom/__tests__/services/event-service.test.ts
clubroom/__tests__/services/event-attendance-service.test.ts
clubroom/__tests__/services/event-crud-service.test.ts
clubroom/__tests__/services/event-display-service.test.ts
clubroom/__tests__/services/event-rsvp-service.test.ts
clubroom/__tests__/services/family-member-service.test.ts
clubroom/__tests__/services/family-permission-service.test.ts
clubroom/__tests__/services/family-relationship-service.test.ts
clubroom/__tests__/services/follow-service.test.ts
clubroom/__tests__/services/group-session-service.test.ts
clubroom/__tests__/services/group-session-crud-service.test.ts
clubroom/__tests__/services/group-session-display-service.test.ts
clubroom/__tests__/services/group-session-registration-service.test.ts
clubroom/__tests__/services/group-session-scheduling-service.test.ts
clubroom/__tests__/services/invite-hold-service.test.ts
clubroom/__tests__/services/bulk-invite-service.test.ts
clubroom/__tests__/services/event-invite-service.test.ts
clubroom/__tests__/services/match-invite-service.test.ts
clubroom/__tests__/services/repeat-invite-helper.test.ts
clubroom/__tests__/services/session-invite-service.test.ts
clubroom/__tests__/services/squad-invite-service.test.ts
clubroom/__tests__/services/match-service.test.ts
clubroom/__tests__/services/notification-service.test.ts
clubroom/__tests__/services/notification-sender.test.ts
clubroom/__tests__/services/notification-store.test.ts
```

**DO NOT TOUCH**: Core services (Agent 1), services A-C (Agent 2), services P-Z (Agent 4), any screen/component files.

**Note**: Some services already have tests (family-service.test.ts, messaging-service.test.ts). Do NOT overwrite existing tests. Only create NEW test files for services that lack tests. Check `clubroom/__tests__/services/` first.

## Same test pattern as Agent 2.

## Per-Service Test Coverage (minimum)
For EACH service:
- [ ] CRUD operations return `ok()` for valid input
- [ ] CRUD operations return `err()` for invalid input
- [ ] `getById()` returns `notFound()` for missing entities
- [ ] Event emission verified on state changes
- [ ] Edge cases: empty arrays, missing optional fields, concurrent access
- [ ] For invite services: test accept/decline flows
- [ ] For notification services: test delivery, read status, filtering

## Safety Checks
- [ ] All tests use `node:test` (NOT Jest)
- [ ] Unique IDs via random string (NOT Date.now())
- [ ] Both `ok()` and `err()` paths tested
- [ ] No duplicate test file names (check existing tests first)
- [ ] `tsconfig.test.json` updated if needed
- [ ] Compile + run + ALL pass

## Files Modified
_None yet_

## Blockers
_Sprint 7 Agent 1 must complete core infra tests first_
