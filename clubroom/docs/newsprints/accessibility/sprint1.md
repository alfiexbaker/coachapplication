# Accessibility Sprint 1: Critical WCAG Violations

**Goal**: Eliminate critical WCAG compliance failures that block screen reader users and violate accessibility standards. Priority focus on interactive controls, live regions, and semantic HTML/ARIA.

**Effort**: 5-6 days
**Impact**: High — removes barriers for 15% of potential users
**Dependencies**: None

---

## Item 347: Icon buttons missing accessibilityLabel

**Priority**: P0
**WCAG**: 4.1.2 (Name, Role, Value)
**Files**: `notification-bell.tsx`, `QuickActions.tsx`, `coach-card-header.tsx`, `athlete-notes.tsx`

```typescript
/*
TASK: Add accessibilityLabel to ~200 icon-only Pressable/TouchableOpacity buttons across the codebase.

FILES TO FIX:
1. components/notification/notification-bell.tsx line 35
2. components/bookings/QuickActions.tsx lines 36-54
3. components/coach/coach-card-header.tsx lines 59-62
4. components/roster/athlete-notes.tsx line 106

PATTERN:
Replace:
  <Pressable onPress={handleAction}>
    <Ionicons name="icon-name" size={24} />
  </Pressable>

With:
  <Pressable
    onPress={handleAction}
    accessibilityLabel="Clear description of action"
    accessibilityRole="button"
  >
    <Ionicons name="icon-name" size={24} />
  </Pressable>

SEARCH STRATEGY:
1. Use Grep to find all Pressable/TouchableOpacity wrapping Ionicons/MaterialIcons
2. Filter for components that DON'T have accessibilityLabel
3. Categorise by action type (delete, edit, more, close, etc.)
4. Apply consistent labels per action type

LABEL CONVENTIONS:
- Close/dismiss: "Close", "Dismiss notification"
- More actions: "More options", "Show actions"
- Edit: "Edit [item]"
- Delete: "Delete [item]"
- Filter: "Filter by [category]"
- Add: "Add [item]"

IMPLEMENTATION STEPS:
1. Run: grep -r "Pressable" components/ --include="*.tsx" | grep -v "accessibilityLabel"
2. For each file, read full component to understand action context
3. Add accessibilityLabel with clear, verb-first description
4. Add accessibilityRole="button" if missing
5. Verify icon colour has sufficient contrast (use theme.colors, not hardcoded)

ACCEPTANCE CRITERIA:
- [ ] All Pressable/TouchableOpacity wrapping icons have accessibilityLabel
- [ ] Labels are descriptive ("Delete booking" not "Delete")
- [ ] accessibilityRole="button" present on all interactive icons
- [ ] Screen reader announces action before user activates control
- [ ] No generic labels like "Icon" or "Button"
*/
```

**Acceptance Criteria**:
- All icon buttons announce clear action to screen readers
- Labels follow verb-first convention ("Delete session", not "Session delete")
- accessibilityRole="button" present on all instances
- Manual VoiceOver/TalkBack test passes on 5 representative screens

---

## Item 348: Images without accessibilityLabel

**Priority**: P0
**WCAG**: 1.1.1 (Non-text Content)
**Files**: `Avatar.tsx`, `group-session-card.tsx`, `feed-post-card.tsx`

```typescript
/*
TASK: Add accessibilityLabel to ~100 Image/expo-image components that convey information.

FILES TO FIX:
1. components/ui/primitives/Avatar.tsx line 115
2. components/group/group-session-card.tsx lines 54-56
3. components/social/feed-post-card.tsx lines 87-89

PATTERN:
Replace:
  <Image source={{ uri: avatarUrl }} style={styles.avatar} />

With:
  <Image
    source={{ uri: avatarUrl }}
    style={styles.avatar}
    accessibilityLabel={`${userName}'s profile photo`}
  />

DECORATIVE VS INFORMATIVE:
- Decorative (use accessible={false}): Background patterns, separator icons, purely aesthetic images
- Informative (need label): Profile photos, session images, post attachments, badge icons

SEARCH STRATEGY:
1. Grep for "<Image " and "<ExpoImage " across components/
2. Filter for images WITHOUT accessibilityLabel or accessible props
3. Categorise: Avatar, badge icon, session photo, post image, drill thumbnail
4. Apply appropriate labeling strategy per category

LABEL CONVENTIONS:
- Avatar: "{name}'s profile photo" or "Anonymous user avatar" if no name
- Badge: "{badgeName} badge icon"
- Session image: "{sessionType} session photo"
- Post image: "Photo posted by {userName}" + optional description from post.caption
- Drill thumbnail: "{drillName} video thumbnail"

IMPLEMENTATION STEPS:
1. Audit Avatar.tsx — add accessibilityLabel prop, default to "User avatar"
2. For group-session-card.tsx — use session.title in label
3. For feed-post-card.tsx — combine post.author + post.caption (truncated to 100 chars)
4. Add accessible={false} to decorative images (background patterns, dividers)
5. Test with VoiceOver — ensure images announce before interactive elements

EDGE CASES:
- Image failed to load → label should still announce
- Multiple images in carousel → label should include position ("Photo 1 of 3")
- User has no profile photo → "Default avatar" or "Anonymous user"

ACCEPTANCE CRITERIA:
- [ ] All informative images have descriptive accessibilityLabel
- [ ] Decorative images use accessible={false}
- [ ] Avatar component accepts optional accessibilityLabel prop
- [ ] Labels are contextual (include user name, session type, etc.)
- [ ] Screen reader announces image content before moving to next element
*/
```

**Acceptance Criteria**:
- All avatars announce user name + "profile photo"
- Session images announce session type/title
- Post images announce author + brief description
- Decorative images use `accessible={false}`
- Manual screen reader test confirms content is announced

---

## Item 349: Touch targets below 44px

**Priority**: P0
**WCAG**: 2.5.5 (Target Size)
**Files**: `chip.tsx`, `CompareButton.tsx`, `comment-input.tsx`

```typescript
/*
TASK: Increase touch targets to minimum 44px for ~50 interactive components currently below threshold.

FILES TO FIX:
1. components/primitives/chip.tsx lines 85-89 (currently 20px height)
2. components/compare/CompareButton.tsx lines 84-116 (currently 40px)
3. components/social/comment-input.tsx lines 68-71 (send button 36px)

PATTERN:
Replace:
  <Pressable style={{ height: 32 }} onPress={handlePress}>

With:
  <Pressable
    style={{ height: 44, minHeight: 44 }}
    onPress={handlePress}
  >

OR use hitSlop if visual size must stay small:
  <Pressable
    style={{ height: 32 }}
    hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
    onPress={handlePress}
  >

SEARCH STRATEGY:
1. Grep for Pressable/TouchableOpacity with height/width < 44
2. Check Components constants in theme.ts for non-compliant sizes
3. Prioritise frequently-used primitives (Chip, Badge, Icon buttons)

IMPLEMENTATION STEPS:
1. Chip.tsx:
   - DO NOT change Components.buttonCompact from 32 — it's used across 927 components
   - Add hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }} to reach 44px touch target
   - Visual size stays at 32px, touch area expands to 44px
   - Update variant styles to maintain visual appearance

2. CompareButton.tsx:
   - Increase floating button from 40px to 44px
   - Adjust icon size if needed (24px works in 44px container)
   - Test positioning — may need bottom offset adjustment

3. comment-input.tsx:
   - Send button: increase from 36px to 44px
   - Use Components.button.height constant
   - Align with input field height (should match)

4. Global audit:
   - Search for all icon-only buttons smaller than 44px
   - Apply hitSlop to reach 44px touch target where visual size must stay small
   - Check all icon-only buttons in header bars
   - Review filter chips, tag selectors, close buttons

OPTIONAL FOLLOW-UP (requires visual regression testing across all 927 components):
  Changing Components.buttonCompact.height from 32 to 44 in constants/theme.ts
  would enforce 44px globally, but risks layout regressions in every component
  using buttonCompact. Only attempt with full visual regression test suite.

ACCEPTANCE CRITERIA:
- [ ] All interactive elements have 44x44px minimum touch area (via size or hitSlop)
- [ ] Visual design preserved via hitSlop where appropriate
- [ ] Components.buttonCompact stays at 32 (use hitSlop for touch target expansion)
- [ ] Manual tap test on smallest phone (iPhone SE) passes
- [ ] No accidental taps on adjacent elements
*/
```

**Acceptance Criteria**:
- All interactive elements meet 44x44px minimum (via size or hitSlop)
- Visual design preserved (use hitSlop for small visual elements)
- Components.buttonCompact remains 32px (hitSlop expands touch target)
- Manual test on iPhone SE confirms easy tapping
- No regression in layout spacing

---

## Item 350: Toast not announced to screen readers

**Priority**: P0
**WCAG**: 4.1.3 (Status Messages)
**File**: `components/ui/toast.tsx`

```typescript
/*
TASK: Add accessibilityLiveRegion to toast component so status messages are announced to screen readers.

FILE: components/ui/toast.tsx lines 143-177

CURRENT CODE (excerpt):
  <View style={styles.container}>
    <ThemedText>{message}</ThemedText>
  </View>

UPDATED CODE:
  <View
    style={styles.container}
    accessibilityLiveRegion="polite"
    accessibilityRole="alert"
  >
    <ThemedText>{message}</ThemedText>
  </View>

IMPLEMENTATION STEPS:
1. Read components/ui/toast.tsx
2. Locate root View in toast render (likely AnimatedView from reanimated)
3. Add accessibilityLiveRegion="polite" for non-critical toasts
4. Add accessibilityLiveRegion="assertive" for error toasts
5. Add accessibilityRole="alert"
6. Ensure toast is not focusable (no onPress unless dismiss action)

LIVE REGION LEVELS:
- "polite" — success, info toasts (waits for screen reader to finish current announcement)
- "assertive" — error, warning toasts (interrupts current announcement)

EDGE CASES:
- Multiple toasts queued → only visible toast should have liveRegion
- Toast dismissed before announcement completes → acceptable
- Toast appears during form input → "polite" won't interrupt typing

TESTING:
1. Enable VoiceOver (iOS) or TalkBack (Android)
2. Trigger success toast → should announce without interrupting
3. Trigger error toast → should announce immediately
4. Verify announcement includes full message text
5. Test with toast auto-dismiss — announcement should complete even if toast disappears

ACCEPTANCE CRITERIA:
- [ ] Toast root View has accessibilityLiveRegion prop
- [ ] Error/warning toasts use "assertive"
- [ ] Success/info toasts use "polite"
- [ ] accessibilityRole="alert" present
- [ ] VoiceOver announces toast message without user action
- [ ] TalkBack announces toast message without user action
*/
```

**Acceptance Criteria**:
- Toast root has `accessibilityLiveRegion="polite"` (or "assertive" for errors)
- `accessibilityRole="alert"` added
- VoiceOver announces toast without user interaction
- TalkBack announces toast without user interaction
- Announcement completes even if toast auto-dismisses

---

## Item 351: Chip/selection-tile missing accessibilityState

**Priority**: P0
**WCAG**: 4.1.2 (Name, Role, Value)
**Files**: `chip.tsx`, `selection-tile.tsx`

```typescript
/*
TASK: Add accessibilityState to Chip and SelectionTile components to announce selected/disabled states.

FILES TO FIX:
1. components/primitives/chip.tsx lines 69-79
2. components/primitives/selection-tile.tsx lines 36-47

PATTERN:
Replace:
  <Pressable
    onPress={onPress}
    disabled={disabled}
  >

With:
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityState={{
      selected: isSelected,
      disabled: disabled,
    }}
  >

IMPLEMENTATION STEPS:

1. Chip.tsx:
   - Read current component props (likely has onPress, selected, disabled)
   - Add accessibilityRole="button" to root Pressable
   - Add accessibilityState={{ selected: selected, disabled: disabled }}
   - If no "selected" prop exists, add it to component interface
   - Update all usages to pass selected={...} prop

2. selection-tile.tsx:
   - Add accessibilityRole="radio" if single-select context
   - Add accessibilityRole="checkbox" if multi-select context
   - Add accessibilityState={{ selected: isSelected, disabled: disabled }}
   - Add accessibilityLabel if not already present (tile.label value)

SEARCH FOR USAGES:
1. Grep for "<Chip " across components/
2. Identify single-select vs multi-select contexts
3. Update parent components to track selected state
4. Pass selected prop to Chip/SelectionTile

EXAMPLE USAGE (filter chips):
  const [selectedSport, setSelectedSport] = useState('football');

  <Chip
    label="Football"
    selected={selectedSport === 'football'}
    onPress={() => setSelectedSport('football')}
  />

ACCEPTANCE CRITERIA:
- [ ] Chip component accepts "selected" prop (boolean)
- [ ] SelectionTile component accepts "selected" prop
- [ ] accessibilityState includes selected and disabled
- [ ] accessibilityRole matches interaction pattern (button/radio/checkbox)
- [ ] VoiceOver announces "selected" or "not selected" state
- [ ] TalkBack announces selection state before label
*/
```

**Acceptance Criteria**:
- Chip and SelectionTile accept `selected` prop
- `accessibilityState={{ selected, disabled }}` added
- `accessibilityRole` matches context (button/radio/checkbox)
- Screen reader announces "selected" or "not selected"
- State changes announce immediately

---

## Item 352: Tab components missing accessibilityRole="tab"

**Priority**: P0
**WCAG**: 4.1.2 (Name, Role, Value)
**File**: `components/bookings/CoachTabNavigation.tsx`

```typescript
/*
TASK: Add accessibilityRole="tab" and accessibilityState to all tab navigation components.

FILE: components/bookings/CoachTabNavigation.tsx lines 23-45

CURRENT PATTERN (likely):
  <Pressable onPress={() => setActiveTab('upcoming')}>
    <ThemedText>Upcoming</ThemedText>
  </Pressable>

UPDATED PATTERN:
  <Pressable
    onPress={() => setActiveTab('upcoming')}
    accessibilityRole="tab"
    accessibilityState={{ selected: activeTab === 'upcoming' }}
    accessibilityLabel="Upcoming bookings tab"
  >
    <ThemedText>Upcoming</ThemedText>
  </Pressable>

IMPLEMENTATION STEPS:
1. Read CoachTabNavigation.tsx to understand current tab structure
2. Add accessibilityRole="tab" to each tab Pressable
3. Add accessibilityState={{ selected: activeTab === tab.key }}
4. Add accessibilityLabel if tab text is ambiguous (e.g. icon-only tabs)
5. Wrap tab group in View with accessibilityRole="tablist"

SEARCH FOR ALL TAB COMPONENTS:
1. Grep for "Tab" in component names → profile-tabs.tsx, community-tab-content.tsx, etc.
2. Look for horizontal ScrollView with Pressable children
3. Check for segmented controls (alternative tab pattern)

FULL STRUCTURE:
  <View accessibilityRole="tablist">
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: activeTab === 'tab1' }}
      accessibilityLabel="Tab 1"
    >
      <ThemedText>Tab 1</ThemedText>
    </Pressable>

    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: activeTab === 'tab2' }}
      accessibilityLabel="Tab 2"
    >
      <ThemedText>Tab 2</ThemedText>
    </Pressable>
  </View>

OTHER TAB COMPONENTS TO FIX:
- components/coach/profile-tabs.tsx
- components/athlete/athlete-notes-tab-sections.tsx
- components/drills/drill-tab-filter.tsx (if uses tab pattern)

ACCEPTANCE CRITERIA:
- [ ] All tab containers have accessibilityRole="tablist"
- [ ] All tab buttons have accessibilityRole="tab"
- [ ] Selected state announced via accessibilityState
- [ ] VoiceOver announces "tab, selected" for active tab
- [ ] Swipe navigation between tabs works with screen reader
*/
```

**Acceptance Criteria**:
- Tab container has `accessibilityRole="tablist"`
- Each tab has `accessibilityRole="tab"`
- `accessibilityState={{ selected }}` tracks active tab
- Screen reader announces "tab, selected" for active tab
- Swipe navigation works with VoiceOver/TalkBack

---

## Item 353: Skeleton invisible to screen readers

**Priority**: P0
**WCAG**: 4.1.3 (Status Messages)
**File**: `components/ui/skeleton.tsx`

```typescript
/*
TASK: Add accessibilityLabel to skeleton component so screen readers announce loading state.

FILE: components/ui/skeleton.tsx lines 25-45

CURRENT CODE (likely):
  <View style={[styles.skeleton, { width, height }]} />

UPDATED CODE:
  <View
    style={[styles.skeleton, { width, height }]}
    accessibilityLabel="Loading content"
    accessibilityRole="none"
    accessibilityElementsHidden={false}
  />

IMPLEMENTATION STEPS:
1. Read components/ui/skeleton.tsx
2. Add accessibilityLabel prop to Skeleton component interface
3. Default to "Loading" if no label provided
4. Pass label to root View: accessibilityLabel={label}
5. Add accessibilityRole="none" (skeleton is presentational, not interactive)
6. Do NOT use accessible={false} — screen reader should announce loading state

USAGE PATTERN:
  <Skeleton width={100} height={20} accessibilityLabel="Loading session title" />
  <Skeleton width="100%" height={60} accessibilityLabel="Loading session details" />

ALTERNATIVE (if skeleton used in list):
  <View accessibilityLabel="Loading sessions" accessibilityRole="none">
    <Skeleton width={100} height={20} accessible={false} />
    <Skeleton width="100%" height={60} accessible={false} />
  </View>

SEARCH FOR USAGES:
1. Grep for "<Skeleton" across components/
2. Identify context (session list, profile header, feed, etc.)
3. Add contextual accessibilityLabel to parent or Skeleton itself

ACCEPTANCE CRITERIA:
- [ ] Skeleton component accepts accessibilityLabel prop
- [ ] Default label is "Loading content"
- [ ] Screen reader announces loading state
- [ ] When used in lists, parent View has collective label
- [ ] accessibilityRole="none" prevents confusion with interactive elements
*/
```

**Acceptance Criteria**:
- Skeleton accepts `accessibilityLabel` prop with default "Loading content"
- Screen reader announces loading state when skeleton appears
- `accessibilityRole="none"` prevents interactive element confusion
- For skeleton groups, parent has collective label
- Manual test confirms VoiceOver announces "Loading [context]"

---

## Item 354: Subtle badge variants may fail contrast

**Priority**: P1
**WCAG**: 1.4.3 (Contrast Minimum)
**File**: `components/primitives/badge.tsx`

```typescript
/*
TASK: Audit and fix badge colour contrast for "subtle" variant (withAlpha 0.09 background).

FILE: components/primitives/badge.tsx lines 128-130

CURRENT PATTERN (likely):
  subtle: {
    backgroundColor: withAlpha(colors.primary, 0.09),
    color: colors.primary,
  }

ISSUE:
- withAlpha(color, 0.09) on white background = ~1.5:1 contrast (fails WCAG AA 4.5:1)
- Text colour might be sufficient, but background border needs checking

IMPLEMENTATION STEPS:
1. Read components/primitives/badge.tsx
2. Identify all badge variants: filled, subtle, outlined, ghost
3. For "subtle" variant:
   - Check background: withAlpha(colors.primary, 0.09) → increase to 0.12 minimum
   - Check text: should be solid color (colors.primary, colors.success, etc.)
   - Add 1px border with withAlpha(color, 0.2) for definition

4. Test contrast ratios:
   - Use WebAIM contrast checker or built-in DevTools
   - Test all colour combinations: primary, success, warning, error, neutral
   - Both light and dark themes

UPDATED PATTERN:
  subtle: {
    backgroundColor: withAlpha(colors.primary, 0.12), // increased from 0.09
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.2),
    color: colors.primary, // solid colour = sufficient contrast
  }

COLOUR COMBINATIONS TO TEST (light theme):
- primary (#2563EB) on withAlpha(0.12) background
- success (#16A34A) on withAlpha(0.12) background
- warning (#F59E0B) on withAlpha(0.12) background
- error (#DC2626) on withAlpha(0.12) background

COLOUR COMBINATIONS TO TEST (dark theme):
- Same as above, but on dark surface (colors.surface)

ACCEPTANCE CRITERIA:
- [ ] All badge variants pass WCAG AA (4.5:1 for text, 3:1 for UI components)
- [ ] Subtle variant background increased to withAlpha 0.12 minimum
- [ ] Border added for definition (withAlpha 0.2)
- [ ] Manual contrast test passes for all badge colors
- [ ] Dark theme tested separately
*/
```

**Acceptance Criteria**:
- All badge variants pass WCAG AA contrast (4.5:1 for text)
- Subtle variant uses `withAlpha(color, 0.12)` minimum for background
- Optional border added for definition
- Manual contrast test with WebAIM checker passes
- Both light and dark themes tested

---

## Item 355: Modal focus management absent

**Priority**: P1
**WCAG**: 2.4.3 (Focus Order)
**Files**: All 39 modal routes in `app/(modal)/`

```typescript
/*
TASK: Implement focus trap and restoration for all modal screens.

FILES TO FIX: All 39 files in app/(modal)/
- add-child.tsx
- create-club-post.tsx
- create-post.tsx
- create-squad.tsx
- edit-child-sen.tsx
- ... (all others)

ISSUE:
- When modal opens, focus stays on underlying screen
- Screen reader can navigate to hidden content behind modal
- When modal closes, focus not restored to trigger element

IMPLEMENTATION STRATEGY:

1. Create reusable hook: hooks/use-focus-trap.ts
   - Captures reference to previously focused element
   - Sets focus to first interactive element in modal on mount
   - Prevents focus from escaping modal boundaries
   - Restores focus to trigger element on unmount

2. Pattern for each modal:
   import { useFocusTrap } from '@/hooks/use-focus-trap';

   export default function ModalScreen() {
     const modalRef = useRef<View>(null);
     useFocusTrap(modalRef);

     return (
       <View ref={modalRef} accessible accessibilityViewIsModal>
         {/* modal content */}
       </View>
     );
   }

PRIMARY FIX — accessibilityViewIsModal:
  The key fix is adding accessibilityViewIsModal={true} to each modal's root View.
  This is the React Native built-in that hides background content from screen readers.
  useFocusTrap is supplementary — it improves focus ordering but accessibilityViewIsModal
  is what actually prevents screen reader navigation to background content.

SUPPLEMENTARY HOOK (use-focus-trap.ts):
  import { useEffect, RefObject } from 'react';
  import { findNodeHandle, AccessibilityInfo, View } from 'react-native';

  export function useFocusTrap(ref: RefObject<View | null>) {
    useEffect(() => {
      // Set focus to first element in modal
      const handle = findNodeHandle(ref.current);
      if (handle) {
        AccessibilityInfo.setAccessibilityFocus(handle);
      }

      // Cleanup: focus restoration handled by Expo Router navigation
      return () => {
        // Expo Router handles focus restoration on modal dismiss
      };
    }, [ref]);
  }

REACT NATIVE SPECIFICS:
- accessibilityViewIsModal on root View hides background from screen reader
- AccessibilityInfo.setAccessibilityFocus() moves screen reader cursor
- Expo Router's modal presentation handles some focus restoration automatically

IMPLEMENTATION STEPS:
1. Create hooks/use-focus-trap.ts with basic implementation
2. Update one modal (e.g. add-child.tsx) as proof of concept
3. Test with VoiceOver — background should be hidden
4. Apply pattern to remaining 38 modals
5. Verify focus restoration when modal dismissed

EDGE CASES:
- Modal opened from another modal (nested) → focus trap should stack
- Modal dismissed via gesture (swipe down) → focus still restores
- Modal has form with errors → focus moves to first error

ACCEPTANCE CRITERIA:
- [ ] useFocusTrap hook created and tested
- [ ] All 39 modal screens use accessibilityViewIsModal
- [ ] Focus moves to modal on open
- [ ] Background content hidden from screen reader
- [ ] Focus restored to trigger element on close (or first element if no trigger)
- [ ] VoiceOver cannot navigate to background while modal open
*/
```

**Acceptance Criteria**:
- All 39 modals use `accessibilityViewIsModal={true}` on root View (primary fix)
- `useFocusTrap` hook created as supplementary enhancement for focus ordering
- Focus moves to modal when opened
- Background content hidden from screen reader while modal open
- Focus restored to trigger element when modal closed
- Manual VoiceOver test confirms background is inaccessible while modal open

---

## Item 356: Dynamic content changes not announced

**Priority**: P1
**WCAG**: 4.1.3 (Status Messages)
**Files**: `waitlist-banner.tsx`, `CompareBar.tsx`

```typescript
/*
TASK: Add accessibilityLiveRegion to components with dynamic content that should announce updates.

FILES TO FIX:
1. components/group/waitlist-banner.tsx line 19
2. components/compare/CompareBar.tsx lines 83-139

PATTERN:
Replace:
  <View style={styles.banner}>
    <ThemedText>You're #{position} on the waitlist</ThemedText>
  </View>

With:
  <View
    style={styles.banner}
    accessibilityLiveRegion="polite"
    accessibilityRole="status"
  >
    <ThemedText>You're #{position} on the waitlist</ThemedText>
  </View>

IMPLEMENTATION STEPS:

1. waitlist-banner.tsx:
   - Read component to understand when position updates
   - Add accessibilityLiveRegion="polite" to root View
   - Add accessibilityRole="status"
   - When position changes, screen reader should announce new position
   - Example: "You're number 3 on the waitlist" → "You're number 2 on the waitlist"

2. CompareBar.tsx:
   - This shows selected coaches for comparison (e.g. "2 coaches selected")
   - Add accessibilityLiveRegion="polite" to root View
   - Add accessibilityRole="status"
   - When count changes, announce "3 coaches selected" etc.

SEARCH FOR OTHER DYNAMIC CONTENT:
1. Grep for components that show counts, status, progress
2. Examples:
   - Cart badge (items added)
   - Notification count
   - Upload progress
   - Search results count
   - Filter applied count

OTHER CANDIDATES:
- components/compare/CompareButton.tsx (shows count badge)
- components/ui/notification-bell.tsx (unread count)
- components/bookings/QuickActions.tsx (if shows counts)

LIVE REGION USAGE:
- "polite" = announces when screen reader finishes current task
- "assertive" = interrupts immediately (use sparingly, e.g. errors)
- "none" = default, no announcement

ACCEPTANCE CRITERIA:
- [ ] Waitlist banner announces position changes
- [ ] Compare bar announces selection count changes
- [ ] accessibilityLiveRegion="polite" on dynamic content containers
- [ ] accessibilityRole="status" added
- [ ] VoiceOver announces changes without user action
- [ ] Changes don't interrupt ongoing announcements (polite)
*/
```

**Acceptance Criteria**:
- Waitlist banner has `accessibilityLiveRegion="polite"`
- Compare bar announces selection count changes
- `accessibilityRole="status"` added to both components
- Screen reader announces updates without user interaction
- Updates don't interrupt ongoing announcements

---

## Sprint Summary

**Total Items**: 10
**Estimated Effort**: 5-6 days
**WCAG Impact**: Fixes violations in 4.1.2 (Name, Role, Value), 4.1.3 (Status Messages), 1.1.1 (Non-text Content), 2.5.5 (Target Size), 1.4.3 (Contrast)

**Success Criteria**:
- All interactive controls announce name, role, state to screen readers
- All images have appropriate alternative text or marked decorative
- All touch targets meet 44x44px minimum
- Dynamic content changes announced via live regions
- Manual accessibility audit passes with VoiceOver and TalkBack

**Testing Strategy**:
1. Automated: Run `npx react-native-accessibility-test` (if available)
2. Manual: VoiceOver on iOS, TalkBack on Android
3. Test user flows: Book session, create post, RSVP to event
4. Verify announcements for all state changes

**Dependencies**:
- None — all fixes are additive (add accessibility props)
- No breaking changes to component APIs
- Can be deployed incrementally per component

**Rollout Plan**:
1. Days 1-2: Items 347, 348, 349 (most critical, high impact)
2. Days 3-4: Items 350, 351, 352, 353 (WCAG 4.1.x violations)
3. Days 5-6: Items 354, 355, 356 (polish + focus management)
