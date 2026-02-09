# Sprint 1 — Critical Service Fixes
## Agent 3: Service Pattern Batch Adoption

**Status**: DONE
**Blocked by**: None (Sprint 0 not required for these changes)

---

## Scope (narrowed from original)
The original audit listed 11 services needing createLogger — that was wrong (91 services already have it). Actual scope was narrowed to 4 files with specific issues.

## EXCLUSIVE FILE OWNERSHIP
```
clubroom/services/family/family-member-service.ts
clubroom/services/notification/notification-store.ts
clubroom/services/invite/session-invite-service.ts
clubroom/services/safety-service.ts
```

## Completed Tasks

### TASK 1: Migrate eventBus.emit() to emitTyped() (2 files)
- [x] **family-member-service.ts**: Changed import from `eventBus, ServiceEvents` to `emitTyped, ServiceEvents`. Replaced 2 calls:
  - Line 350: `eventBus.emit(ServiceEvents.FAMILY_MEMBER_ADDED, ...)` -> `emitTyped(ServiceEvents.FAMILY_MEMBER_ADDED, ...)`
  - Line 429: `eventBus.emit(ServiceEvents.FAMILY_MEMBER_REMOVED, ...)` -> `emitTyped(ServiceEvents.FAMILY_MEMBER_REMOVED, { familyId: '', memberId: childId })` (added required `familyId` field per EventPayloads type)
- [x] **notification-store.ts**: Changed import from `eventBus, ServiceEvents` to `emitTyped, ServiceEvents`. Replaced 3 calls:
  - Line 62: `NOTIFICATION_CREATED` — added `?? ''` fallback for `recipientId` (was `string | undefined`, payload requires `string`)
  - Line 85: `NOTIFICATION_READ` — direct replacement
  - Line 120: `NOTIFICATION_DISMISSED` — direct replacement

### TASK 2: Replace throw with err() in session-invite-service.ts
- [x] Line 235: `throw new Error('All proposed time slots are no longer available...')` replaced with `return err(serviceError('VALIDATION', '...'))`
- [x] Return type of `createInvite()` changed from `Promise<SessionInvite>` to `Promise<Result<SessionInvite, ServiceError>>`
- [x] Success return wrapped in `ok()`: `return ok(invite)` instead of `return this._createSingleInvite(input)`
- **Note**: Callers in `hooks/use-create-invite.ts` (lines 341, 368) will need updating to handle Result type. This file is outside Agent 3 scope.

### TASK 3: Check safety-service.ts for hardcoded colors
- [x] Added TODO comments to `getAlertLevelColor()` method (lines 559-571) documenting that the 4 hardcoded hex colors (`#C03E47`, `#C78000`, `#64748b`, `#1C8C5E`) should be mapped to theme tokens in the UI layer
- Colors left in place since they are service-level data values, not UI rendering

## Safety Check Results
- `eventBus.emit` in family-member-service.ts: **0 matches** (PASS)
- `eventBus.emit` in notification-store.ts: **0 matches** (PASS)
- `throw new Error` in session-invite-service.ts: **0 matches** (PASS)
- `as any` in all 4 files: **0 matches** (PASS)
- TypeScript compile (with 4GB heap): **0 errors in modified files** (PASS)
  - Note: Full project `tsc --noEmit` OOMs with default heap. Used `NODE_OPTIONS="--max-old-space-size=4096"` and filtered for modified files — zero type errors.

## Files Modified
1. `clubroom/services/family/family-member-service.ts` — import + 2 emit calls
2. `clubroom/services/notification/notification-store.ts` — import + 3 emit calls
3. `clubroom/services/invite/session-invite-service.ts` — throw -> err(), return type change
4. `clubroom/services/safety-service.ts` — TODO comments on hardcoded colors

## Known Follow-ups (outside Agent 3 scope)
- `hooks/use-create-invite.ts` needs to handle `Result<SessionInvite, ServiceError>` return from `createInvite()` instead of try/catch
- `services/invite/index.ts` re-exports `createInvite` — callers via facade will also see the type change
- `safety-service.ts` still has `console.warn` on line 645 and hardcoded colors (data, not UI) — deferred to future sprint
- `family-member-service.ts` `remove()` method doesn't have access to `parentId` — passes empty string for `familyId` in `FAMILY_MEMBER_REMOVED` event. Consider adding `parentId` parameter to `remove()` in a future refactor.

## Blockers
None
