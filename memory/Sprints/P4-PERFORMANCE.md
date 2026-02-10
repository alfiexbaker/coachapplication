# P4-PERF — Performance (Hooks + Images + ScrollView)

**Category**: Performance (50 → 80)
**Scope**: hooks/, specific app/ and components/ files.
**Run**: AFTER Phases 2 and 3 complete. Parallel with P4-A11Y and P4-SPACING.

## Work Items

### 1. Hook Decomposition (5 giant hooks)

| Hook | Lines | Action |
|------|-------|--------|
| hooks/data/useCoachData.ts | 642 | Split into useCoachProfile + useCoachAvailability + useCoachEarnings |
| hooks/use-schedule.ts | 539 | Split into useScheduleData + useScheduleFilters + useScheduleActions |
| hooks/use-auth.tsx | 482 | Split into useAuthState + useAuthActions + useAuthTokens |
| hooks/use-session-completion.ts | 472 | Split into useSessionSteps + useSessionValidation + useSessionSubmit |
| hooks/use-create-invite.ts | 461 | Split into useInviteForm + useInviteRecipients + useInviteSubmit |

**Pattern:**
```typescript
// BEFORE: hooks/data/useCoachData.ts (642 lines, mixed concerns)

// AFTER: Split into focused hooks
// hooks/data/useCoachProfile.ts (~150 lines)
export function useCoachProfile(coachId: string) {
  // Profile loading, caching, refresh
}

// hooks/data/useCoachAvailability.ts (~150 lines)
export function useCoachAvailability(coachId: string) {
  // Availability slots, blocked dates
}

// hooks/data/useCoachEarnings.ts (~150 lines)
export function useCoachEarnings(coachId: string) {
  // Earnings data, period stats
}

// hooks/data/useCoachData.ts (~100 lines — FACADE that composes the above)
export function useCoachData(coachId: string) {
  const profile = useCoachProfile(coachId);
  const availability = useCoachAvailability(coachId);
  const earnings = useCoachEarnings(coachId);
  return { ...profile, ...availability, ...earnings };
}
```

**Rules:**
- Keep the original hook as a facade (backward compat)
- Each sub-hook should be 100-200 lines max
- Don't change the public API — screens that import useCoachData still work

### 2. expo-image Migration (3 files)

These files import `Image` from `react-native` instead of `expo-image`:

```
app/(modal)/create-club-post.tsx
app/events/[id].tsx
app/settings/index.tsx
```

**Migration:**
```typescript
// BEFORE
import { Image } from 'react-native';
<Image source={{ uri: url }} style={styles.image} />

// AFTER
import { Image } from 'expo-image';
<Image source={{ uri: url }} style={styles.image} placeholder={blurhash} transition={200} />
```

Benefits: Caching, blur placeholder, smooth transitions, better memory management.

### 3. ScrollView Audit

Many screens use `<ScrollView>` for data lists when `<FlatList>` would be more performant.

**Find candidates:**
```bash
grep -rn "ScrollView" app/ --include="*.tsx" -l
```

**When to convert ScrollView → FlatList:**
- List of homogeneous items (same component repeated)
- Could have 10+ items
- Currently mapping an array inside ScrollView

**When to KEEP ScrollView:**
- Mixed content (header + list + footer + form)
- Small fixed lists (< 5 items)
- Settings screens

**Don't convert everything** — only screens where the list could realistically have 20+ items:
- Notification lists
- Transaction histories
- Chat message lists
- Athlete rosters
- Booking histories

**Pattern:**
```typescript
// BEFORE
<ScrollView>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</ScrollView>

// AFTER
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={item => item.id}
  ItemSeparatorComponent={() => <View style={styles.separator} />}
/>
```

Where `renderItem` uses `useCallback` and `ItemCard` is wrapped in `memo()`.

## Quality Gate
- [ ] Zero hooks > 400 lines
- [ ] All 5 giant hooks split into focused sub-hooks
- [ ] Original hooks still export same API (backward compat)
- [ ] Zero `from 'react-native'` Image imports (all expo-image)
- [ ] At least 5 ScrollView → FlatList conversions for large data lists
- [ ] No new TypeScript errors

## Do NOT Touch
- services/ (no UI)
- Components owned by P3 agents
- Don't change hook PUBLIC APIs — only internal structure
