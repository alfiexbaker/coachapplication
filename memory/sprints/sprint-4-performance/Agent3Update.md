# Sprint 4 — Performance + Memory Safety
## Agent 3: Haptics Guards + Image Migration

**Status**: NOT_STARTED
**Blocked by**: Sprint 0

---

## Objective
1. Add `Platform.OS !== 'web'` guard to ALL expo-haptics calls
2. Replace all raw `Image` from react-native with `expo-image`

## EXCLUSIVE FILE OWNERSHIP
**You touch ALL component + screen files BUT ONLY for these two changes:**
- Adding Platform.OS guard around Haptics calls
- Replacing `Image` import from react-native with expo-image

**Conflict avoidance**: You ONLY touch the Haptics line or the Image import/usage. Nothing else in the file.

**DO NOT TOUCH**: Hooks (Agent 2), services, constants.

## Pattern: Haptics Guard
```typescript
// BAD
import * as Haptics from 'expo-haptics';
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// GOOD
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
if (Platform.OS !== 'web') {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// OR create a utility:
// utils/haptics.ts
export const hapticLight = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};
```

## Pattern: Image Migration
```typescript
// BAD
import { Image } from 'react-native';
<Image source={{ uri: url }} style={styles.image} />

// GOOD
import { Image } from 'expo-image';
<Image source={{ uri: url }} style={styles.image} placeholder={blurhash} transition={200} />
```

## CRITICAL: surface-card.tsx
`components/primitives/surface-card.tsx` line 95 has unguarded Haptics. This component is used 266+ times. Fix this FIRST.

## Known Targets
- 40+ files with unguarded Haptics
- 30+ files with raw RN Image

## Tasks
- [ ] **FIRST**: Fix surface-card.tsx Haptics guard (highest impact)
- [ ] Create `utils/haptics.ts` helper (optional but recommended)
- [ ] Grep for all `Haptics.` calls without Platform guard
- [ ] Add guard to each
- [ ] Grep for `from 'react-native'` imports that include `Image`
- [ ] Replace with expo-image, add placeholder + transition props

## Safety Checks
- [ ] `grep -rn "Haptics\." --include="*.tsx"` — every call has Platform guard or uses utility
- [ ] `grep -rn "Image.*from 'react-native'" --include="*.tsx"` returns 0 (or only where Image is intentionally RN)
- [ ] TypeScript compiles: `cd clubroom && npx tsc --noEmit`

## Files Modified
_None yet_

## Blockers
_None_
