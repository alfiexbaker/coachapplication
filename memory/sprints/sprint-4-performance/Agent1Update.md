# Sprint 4 — Performance + Memory Safety
## Agent 1: memo() Wrapping

**Status**: NOT_STARTED
**Blocked by**: Sprint 0, partially Sprint 3 (decompose before wrapping)

---

## Objective
Add `memo()` wrapper to all components that are rendered in FlatList/list contexts or receive callback props.

## EXCLUSIVE FILE OWNERSHIP
**You touch ALL component files BUT ONLY to add memo() wrapping.** You do NOT change internal logic, layout, colors, or anything else. Wrap-only.

**Conflict avoidance**: You ONLY add `memo()` to the default export. If Sprint 3 agents are still working on a file, SKIP IT and note as blocker. Check file timestamps.

**DO NOT TOUCH**: Services, hooks, screens, constants.

## Pattern
```typescript
// BEFORE
export function MyComponent(props: Props) { ... }
export default MyComponent;

// AFTER
import { memo } from 'react';
const MyComponent = memo(function MyComponent(props: Props) { ... });
export default MyComponent;
```

## Priority Targets (list items first)
1. All components in `components/*/` that are used as FlatList `renderItem`
2. All components that receive `onPress`, `onSubmit`, or other callback props
3. All card components (likely rendered in lists)

## Tasks
- [ ] Grep for components used as renderItem targets
- [ ] Grep for components receiving `onPress` or callback props
- [ ] Add memo() to each, preserving display name
- [ ] Do NOT memo() components that use `useContext` heavily (memo won't help)

## Safety Checks
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`
- [ ] No functional changes — only memo() wrapping

## Files Modified
_None yet_

## Blockers
_Sprint 3 must finish decomposition first for the 197 oversized files_
