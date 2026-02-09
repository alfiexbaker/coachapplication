# Sprint 4 — Performance + Memory Safety
## Agent 2: useEffect Cleanup + Race Conditions

**Status**: NOT_STARTED
**Blocked by**: Sprint 0

---

## Objective
Add cleanup returns to all subscription/timer/async useEffects. Fix race conditions with abort controllers.

## EXCLUSIVE FILE OWNERSHIP
**You ONLY touch hook files:**
```
clubroom/hooks/**/*.ts
```

**DO NOT TOUCH**: Components, screens, services, constants.

## Patterns to Fix

### Missing cleanup on subscriptions
```typescript
// BAD
useEffect(() => {
  const sub = eventBus.on('EVENT', handler);
  // no cleanup!
}, []);

// GOOD
useEffect(() => {
  const sub = eventBus.on('EVENT', handler);
  return () => sub.off();  // or sub()
}, []);
```

### Missing cleanup on timers
```typescript
// BAD
useEffect(() => {
  setTimeout(() => setState(x), 3000);
}, []);

// GOOD
useEffect(() => {
  const timer = setTimeout(() => setState(x), 3000);
  return () => clearTimeout(timer);
}, []);
```

### Race conditions on async effects
```typescript
// BAD
useEffect(() => {
  const load = async () => {
    const data = await fetch(...);
    setState(data);  // might fire after unmount
  };
  load();
}, [id]);

// GOOD
useEffect(() => {
  let cancelled = false;
  const load = async () => {
    const data = await fetch(...);
    if (!cancelled) setState(data);
  };
  load();
  return () => { cancelled = true; };
}, [id]);
```

## Known Hot Spots
- `use-athlete-development.ts`: 4 useEffects, zero cleanup, race conditions
- `use-goal-detail.ts`: nested setTimeout without clearTimeout
- ~36 subscription-based useEffects missing cleanup returns
- ~15 async useEffects without cancellation guards

## Tasks
- [ ] Audit every useEffect in every hook file
- [ ] Add cleanup return where missing
- [ ] Add cancelled flag to async effects
- [ ] Replace nested setTimeout with proper timer management
- [ ] Wrap `displayItems` computation in `use-bookings.ts` in useMemo

## Safety Checks
- [ ] Every useEffect with subscription/timer has a cleanup return
- [ ] Every async useEffect has a cancelled/aborted guard
- [ ] No bare `setTimeout` without corresponding `clearTimeout`
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_None_
