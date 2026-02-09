# Sprint 14: Tab Screens

> **Phase:** 2 — Screen Decomposition
> **Target:** 16 screens decomposed to <250 lines each
> **Quality Bar:** These are the most-visited screens. They must feel premium — Stripe/Linear quality. Zero mediocrity.
> **Estimated Effort:** 6-8 hours

---

## Pre-Flight Checklist

Before writing ANY code:

1. **Read `CLAUDE.md`** — memorize the 17 architecture rules
2. **Read `hooks/use-screen.ts`** — understand `useScreen()` (options at lines 38-47, result at lines 49-58)
3. **Read `components/ui/screen-states.tsx`** — `LoadingState` (variants: list/card/detail/form/calendar), `ErrorState`, `EmptyState`
4. **Read `components/ui/empty-state.tsx`** — `EmptyState` props: `icon`, `title`, `message`, `actionLabel`, `onPressAction`
5. **Read `components/primitives/index.ts`** — `Row`, `Column`, `Center`, `Spacer`, `SurfaceCard`, `Clickable`, `PageHeader`, `ScreenHeader`
6. **Read `constants/theme.ts`** — memorize `Spacing`, `Typography`, `Radii`, `Shadows`, `Components` token values
7. **Read Sprint 13 doc** — the patterns established there apply here too

**CRITICAL:** Tab screens are the first screens users see after login. Every pixel matters. Every interaction must have immediate feedback (haptics + scale animation via SurfaceCard). Every empty state must motivate action. Every loading state must show skeleton placeholders (not spinners).

---

## Target Files (16 screens)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 1 | `app/(tabs)/edit-profile.tsx` | 1388 | Form | form | `components/profile/` |
| 2 | `app/(tabs)/schedule.tsx` | 1285 | Calendar/List | calendar | `components/schedule/` |
| 3 | `app/(tabs)/roster.tsx` | 788 | List | list | `components/roster/` |
| 4 | `app/(tabs)/badges.tsx` | 783 | Grid/List | card | `components/badges/` |
| 5 | `app/(tabs)/children.tsx` | 749 | List | list | `components/family/` |
| 6 | `app/(tabs)/club-hub.tsx` | 738 | Dashboard | card | `components/club/` |
| 7 | `app/(tabs)/wallet.tsx` | 672 | Dashboard | card | `components/wallet/` |
| 8 | `app/(tabs)/settings.tsx` | 638 | List | list | `components/settings/` |
| 9 | `app/(tabs)/messages.tsx` | 452 | List | list | `components/messages/` |
| 10 | `app/(tabs)/notifications.tsx` | 439 | List | list | `components/notifications/` |
| 11 | `app/(tabs)/bookings/objectives.tsx` | 533 | Detail | detail | `components/bookings/` |
| 12 | `app/(tabs)/bookings/statistics.tsx` | 465 | Dashboard | card | `components/bookings/` |
| 13 | `app/(tabs)/bookings/[id].tsx` | 433 | Detail | detail | `components/bookings/` |
| 14 | `app/(tabs)/bookings/index.tsx` | 411 | List | list | `components/bookings/` |
| 15 | `app/(tabs)/admin/invite-codes.tsx` | 401 | List | list | `components/admin/` |
| 16 | `app/(tabs)/coach-profile.tsx` | 326 | Detail/Tab | detail | `components/coach/` |

---

## Decomposition Instructions Per Screen

### Screen 1: `app/(tabs)/edit-profile.tsx` (1388 lines)

**Archetype:** Form screen with multiple sections (personal info, bio, qualifications, sports, pricing, etc.)

**Decomposition plan:**

1. **Read the entire file.** Map all form sections and their state.

2. **Create a custom hook** `hooks/use-edit-profile.ts`:
   - All form state (`useState` for each field group)
   - Validation logic per section
   - Save handler (calls profile service)
   - Load handler (fetches current profile data)
   - Dirty tracking (has the user changed anything?)
   - Return: `{ formData, handlers, loading, saving, error, isDirty, ... }`

3. **Create form section components** in `components/profile/`:
   - `components/profile/edit-personal-info.tsx` — Name, email, phone, avatar
   - `components/profile/edit-bio-section.tsx` — Bio text area, tagline
   - `components/profile/edit-qualifications.tsx` — Certs, experience, DBS
   - `components/profile/edit-sports-section.tsx` — Sports, specialties, age groups
   - `components/profile/edit-pricing-section.tsx` — Hourly rate, packages, currency
   - `components/profile/edit-location-section.tsx` — Location, travel radius
   - `components/profile/edit-save-bar.tsx` — Sticky bottom save button (shows "Unsaved changes" when dirty)

4. **Screen file:**
   - Custom hook for state management
   - 4 state branches (loading/error handled by hook, empty = profile not found)
   - KeyboardAvoidingView + ScrollView
   - Compose section components
   - <250 lines

**Special requirements:**
- KeyboardAvoidingView with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}`
- `keyboardShouldPersistTaps="handled"` on ScrollView
- Unsaved changes prompt on back navigation (use `router.canGoBack()` check or navigation listener)
- Avatar upload section needs image picker integration

---

### Screen 2: `app/(tabs)/schedule.tsx` (1285 lines)

**Archetype:** Calendar view + session list for a given day

**Decomposition plan:**

1. **Read the file.** Identify: calendar header, day grid, time slots, session cards for selected day.

2. **Create a custom hook** `hooks/use-schedule.ts`:
   - Selected date state
   - Sessions for selected date (filtered from all sessions)
   - Month navigation handlers
   - Calendar data computation (days with sessions marked)

3. **Create sub-components** in `components/schedule/`:
   - `components/schedule/schedule-calendar.tsx` — Month calendar grid with day dots
   - `components/schedule/schedule-day-header.tsx` — Selected day display (e.g., "Tuesday, March 15")
   - `components/schedule/schedule-session-list.tsx` — FlatList of sessions for selected day
   - `components/schedule/schedule-session-card.tsx` — Individual session card (memo!)
   - `components/schedule/schedule-add-button.tsx` — FAB or header button to create session

4. **Screen file:**
   - `useScreen()` to load all sessions + availability
   - 4 state branches with `LoadingState variant="calendar"`
   - Calendar at top, session list below
   - <250 lines

---

### Screen 3: `app/(tabs)/roster.tsx` (788 lines)

**Archetype:** Searchable list of athletes/students

**Decomposition plan:**

1. **Read the file.** Identify: search bar, filter chips, athlete list, athlete card.

2. **Use `useScreen()`:**
   ```typescript
   const { data, status, error, refreshing, onRefresh, colors, scheme } = useScreen({
     load: async () => rosterService.getAll(),
     deps: [],
     events: ['ROSTER_UPDATED', 'ATHLETE_ADDED', 'ATHLETE_REMOVED'],
   });
   ```

3. **Create sub-components** in `components/roster/`:
   - `components/roster/roster-search-bar.tsx` — Search input with filter icon
   - `components/roster/roster-filter-chips.tsx` — Sport, squad, status filter chips
   - `components/roster/roster-athlete-card.tsx` — Athlete card in list (memo! SurfaceCard!)
   - `components/roster/roster-list-header.tsx` — Count label + sort selector

4. **Screen file:** List archetype with FlatList, search state local, filter with useMemo. <250 lines.

---

### Screen 4: `app/(tabs)/badges.tsx` (783 lines)

**Archetype:** Grid/list of available and earned badges

**Decomposition plan:**

1. **Create sub-components** in `components/badges/`:
   - `components/badges/badge-grid.tsx` — Grid layout of badge cards (FlatList numColumns)
   - `components/badges/badge-card.tsx` — Single badge card (memo! SurfaceCard!)
   - `components/badges/badge-filter-bar.tsx` — All/Earned/Available filter
   - `components/badges/badge-stats-header.tsx` — "12 of 45 earned" summary

2. **Screen file:** `useScreen()` + 4 states. Grid FlatList. <250 lines.

---

### Screen 5: `app/(tabs)/children.tsx` (749 lines)

**Archetype:** List of children (parent view) with add child CTA

**Decomposition plan:**

1. **Create sub-components** in `components/family/`:
   - `components/family/child-card.tsx` — Child card with avatar, name, sport, upcoming session (memo!)
   - `components/family/child-list-header.tsx` — Title + "Add child" button
   - `components/family/child-upcoming-session.tsx` — Next session preview on child card

2. **Screen file:** `useScreen()` + 4 states. FlatList. EmptyState: "Add your first child to start booking sessions". <250 lines.

---

### Screen 6: `app/(tabs)/club-hub.tsx` (738 lines)

**Archetype:** Dashboard with sections (announcements, upcoming events, squads, quick actions)

**Decomposition plan:**

1. **Read the file.** Map all dashboard sections.

2. **Create sub-components** in `components/club/`:
   - `components/club/club-hub-header.tsx` — Club name, logo, member count
   - `components/club/club-announcements.tsx` — Pinned announcements section
   - `components/club/club-quick-actions.tsx` — Quick action grid (create event, invite, message)
   - `components/club/club-squad-list.tsx` — Horizontal squad cards
   - `components/club/club-upcoming-events.tsx` — Upcoming events section (already exists: `upcoming-events-carousel.tsx`)

3. **Screen file:** `useScreen()` loads club data. ScrollView (not FlatList — dashboard is heterogeneous). <250 lines.

---

### Screen 7: `app/(tabs)/wallet.tsx` (672 lines)

**Archetype:** Dashboard with balance, transaction list, payout section

**Decomposition plan:**

1. **Create sub-components** in `components/wallet/`:
   - `components/wallet/wallet-balance-card.tsx` — Big balance display with currency
   - `components/wallet/wallet-transaction-list.tsx` — FlatList of transactions (memo items!)
   - `components/wallet/wallet-transaction-card.tsx` — Single transaction row (memo!)
   - `components/wallet/wallet-payout-section.tsx` — Payout settings, next payout date
   - `components/wallet/wallet-action-bar.tsx` — Withdraw, transfer buttons

2. **Screen file:** `useScreen()` + ScrollView for dashboard sections. FlatList nested for transactions or use SectionList. <250 lines.

---

### Screen 8: `app/(tabs)/settings.tsx` (638 lines)

**Archetype:** Settings list (grouped rows)

**Decomposition plan:**

1. **Create sub-components** in `components/settings/`:
   - `components/settings/settings-group.tsx` — Section card with title + list of setting rows
   - `components/settings/settings-row.tsx` — Individual setting row (icon, label, chevron, optional toggle)
   - `components/settings/settings-account-section.tsx` — Account settings group
   - `components/settings/settings-app-section.tsx` — App preferences group (theme, notifications)
   - `components/settings/settings-danger-section.tsx` — Logout, delete account (destructive styling)

2. **Screen file:** ScrollView (settings are static). `useScreen()` only if loading user data dynamically. <250 lines.

---

### Screens 9-10: `messages.tsx` (452) and `notifications.tsx` (439)

**Both are List archetype.** Same pattern:

1. `useScreen()` for data loading with relevant events
2. FlatList with memoized card components
3. Pull-to-refresh
4. Sub-components:
   - `components/messages/message-card.tsx` (memo!)
   - `components/notifications/notification-card.tsx` (memo!)
   - Each card uses `SurfaceCard` for press interaction
5. <250 lines each

---

### Screens 11-14: Bookings sub-screens

These are nested under `(tabs)/bookings/`:

- `objectives.tsx` (533) — Detail archetype. Extract `components/bookings/objectives-header.tsx`, `objectives-list.tsx`, `objective-card.tsx`
- `statistics.tsx` (465) — Dashboard archetype. Extract `components/bookings/stats-grid.tsx`, `stats-chart.tsx`, `stats-summary.tsx`
- `[id].tsx` (433) — Detail archetype. Extract `components/bookings/booking-detail-header.tsx`, `booking-info-card.tsx`, `booking-action-bar.tsx`
- `index.tsx` (411) — List archetype. Extract `components/bookings/booking-list-card.tsx` (memo!), `booking-filter-bar.tsx`

All use `useScreen()` + 4 state branches. All <250 lines.

---

### Screen 15: `app/(tabs)/admin/invite-codes.tsx` (401 lines)

**Archetype:** List with create action

1. `useScreen()` for loading invite codes
2. Extract: `components/admin/invite-code-card.tsx` (memo!), `components/admin/invite-code-header.tsx`
3. FlatList + pull-to-refresh. <250 lines.

---

### Screen 16: `app/(tabs)/coach-profile.tsx` (326 lines)

**Current structure:** Already partially decomposed — imports `ProfileHeader`, `ProfileTabBar`, `ProfileTabContent`, `ProfileQuickActions`, `ProfilePostCard`. Just needs `useScreen()` migration and minor cleanup.

**Decomposition plan:**

1. **Read the file.** It already imports sub-components from `components/coach/`.
2. **Replace manual `useState` loading/error** with `useScreen()`:
   ```typescript
   const { data, status, error, refreshing, onRefresh, colors, scheme } = useScreen({
     load: async () => {
       // Load profile data, offerings, feed posts
       const [profileResult, offeringsResult, postsResult] = await Promise.all([
         profileService.getCurrentCoach(),
         sessionService.getOfferings(coachId),
         socialFeedService.getByCoach(coachId),
       ]);
       // Merge results
     },
     deps: [coachId],
     events: ['PROFILE_UPDATED', 'POST_CREATED', 'FOLLOW_CHANGED'],
   });
   ```
3. Add proper 4 state branches with `LoadingState variant="detail"`.
4. Remove manual `useColorScheme()` + `Colors[scheme]` — use `colors` from `useScreen()`.
5. Target: <250 lines.

---

## useScreen() Data Loading Patterns

### Single service call
```typescript
const { data, status, ... } = useScreen({
  load: async () => rosterService.getAll(),
  deps: [],
  events: ['ROSTER_UPDATED'],
});
```

### Multiple service calls (use Promise.allSettled for resilience)
```typescript
const { data, status, ... } = useScreen({
  load: async () => {
    const [sessionsResult, availResult] = await Promise.all([
      sessionService.getByCoach(coachId),
      availabilityService.getSlots(coachId),
    ]);
    if (!sessionsResult.success) return sessionsResult; // propagate first error
    if (!availResult.success) return availResult;
    return ok({ sessions: sessionsResult.data, availability: availResult.data });
  },
  deps: [coachId],
  events: ['SESSION_CREATED', 'AVAILABILITY_UPDATED'],
  isEmpty: (d) => !d.sessions.length && !d.availability.length,
});
```

### Data with local filter state
```typescript
const [filter, setFilter] = useState<FilterType>('all');

const { data, status, ... } = useScreen({
  load: async () => bookingService.getAll(),
  deps: [],
  events: ['BOOKING_CREATED', 'BOOKING_UPDATED'],
});

// Filter is applied LOCALLY, not re-fetched:
const filteredData = useMemo(() => {
  if (!data) return [];
  if (filter === 'all') return data;
  return data.filter(item => item.status === filter);
}, [data, filter]);
```

---

## Execution Order

Process in this order (largest first, dependencies resolved):

1. `edit-profile.tsx` (1388) — Largest, sets form pattern
2. `schedule.tsx` (1285) — Sets calendar pattern
3. `roster.tsx` (788) — Sets list pattern with search
4. `badges.tsx` (783) — Grid pattern
5. `children.tsx` (749) — List pattern
6. `club-hub.tsx` (738) — Dashboard pattern
7. `wallet.tsx` (672) — Dashboard with list
8. `settings.tsx` (638) — Settings list pattern
9. `bookings/objectives.tsx` (533) — Detail pattern
10. `bookings/statistics.tsx` (465) — Stats dashboard
11. `messages.tsx` (452) — List pattern (quick)
12. `notifications.tsx` (439) — List pattern (quick)
13. `bookings/[id].tsx` (433) — Detail pattern
14. `bookings/index.tsx` (411) — List pattern
15. `admin/invite-codes.tsx` (401) — List pattern (quick)
16. `coach-profile.tsx` (326) — Minor cleanup

---

## Verification Commands

```bash
# 1. TypeScript compilation (MUST pass)
npx tsc -p tsconfig.test.json

# 2. Run all tests (MUST pass — zero regressions)
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js

# 3. Line count verification (all <250)
wc -l app/\(tabs\)/edit-profile.tsx app/\(tabs\)/schedule.tsx app/\(tabs\)/roster.tsx app/\(tabs\)/badges.tsx app/\(tabs\)/children.tsx app/\(tabs\)/club-hub.tsx app/\(tabs\)/wallet.tsx app/\(tabs\)/settings.tsx app/\(tabs\)/messages.tsx app/\(tabs\)/notifications.tsx app/\(tabs\)/bookings/objectives.tsx app/\(tabs\)/bookings/statistics.tsx app/\(tabs\)/bookings/\[id\].tsx app/\(tabs\)/bookings/index.tsx app/\(tabs\)/admin/invite-codes.tsx app/\(tabs\)/coach-profile.tsx

# 4. Verify useScreen usage in all tab screens
grep -l "useScreen" app/\(tabs\)/*.tsx app/\(tabs\)/bookings/*.tsx app/\(tabs\)/admin/*.tsx

# 5. Verify no Colors.light references
grep -r "Colors\.light\." app/\(tabs\)/ || echo "PASS"

# 6. Verify no TouchableOpacity
grep -r "TouchableOpacity" app/\(tabs\)/ components/profile/ components/schedule/ components/roster/ components/badges/ components/wallet/ components/settings/ components/messages/ components/notifications/ components/bookings/ components/admin/ || echo "PASS"

# 7. Verify no raw flexDirection in new components
grep -rn "flexDirection" components/profile/ components/schedule/ components/roster/ components/badges/ components/wallet/ components/settings/ components/messages/ components/notifications/ components/bookings/ components/admin/ 2>/dev/null | head -20
```

---

## Sub-Component Directory Structure

After this sprint, these directories should have new files:

```
components/
  profile/
    edit-personal-info.tsx
    edit-bio-section.tsx
    edit-qualifications.tsx
    edit-sports-section.tsx
    edit-pricing-section.tsx
    edit-location-section.tsx
    edit-save-bar.tsx
  schedule/
    schedule-calendar.tsx
    schedule-day-header.tsx
    schedule-session-list.tsx
    schedule-session-card.tsx
    schedule-add-button.tsx
  roster/
    roster-search-bar.tsx
    roster-filter-chips.tsx
    roster-athlete-card.tsx
    roster-list-header.tsx
  badges/
    badge-grid.tsx (or use FlatList numColumns in screen)
    badge-card.tsx
    badge-filter-bar.tsx
    badge-stats-header.tsx
  family/
    child-card.tsx
    child-list-header.tsx
    child-upcoming-session.tsx
  club/
    club-hub-header.tsx
    club-announcements.tsx
    club-quick-actions.tsx
    club-squad-list.tsx
    (club-upcoming-events-carousel.tsx already exists)
  wallet/
    wallet-balance-card.tsx
    wallet-transaction-list.tsx
    wallet-transaction-card.tsx
    wallet-payout-section.tsx
    wallet-action-bar.tsx
  settings/
    settings-group.tsx
    settings-row.tsx
    settings-account-section.tsx
    settings-app-section.tsx
    settings-danger-section.tsx
  messages/
    message-card.tsx
  notifications/
    notification-card.tsx
  bookings/
    booking-list-card.tsx
    booking-filter-bar.tsx
    booking-detail-header.tsx
    booking-info-card.tsx
    booking-action-bar.tsx
    objectives-header.tsx
    objectives-list.tsx
    objective-card.tsx
    stats-grid.tsx
    stats-chart.tsx
    stats-summary.tsx
  admin/
    invite-code-card.tsx
    invite-code-header.tsx
hooks/
  use-edit-profile.ts
  use-schedule.ts
```

---

## Common Pitfalls

1. **Tab screens have Tab Bar visible.** Do NOT wrap in SafeAreaView with bottom edge — the tab bar handles bottom inset. Use `edges={['top']}` only.
2. **Do NOT change `_layout.tsx` files.** Tab layout configuration is separate from screen content.
3. **Dashboard screens use ScrollView** (heterogeneous sections), NOT FlatList. But sections containing dynamic lists should use FlatList nested inside.
4. **Settings screen does NOT need `useScreen()`** if all items are static navigation rows. Only use it if loading dynamic data (e.g., user profile info at top).
5. **Search/filter state stays LOCAL** in the screen (`useState`). The `useScreen()` hook loads ALL data; filtering happens in `useMemo` on the client side.
6. **`coach-profile.tsx` already imports sub-components.** Don't recreate them — just wire `useScreen()` and add state branches.
7. **Each sub-component gets its own StyleSheet.** Do not create one massive shared stylesheet.
8. **Calendar component may be complex.** If the calendar grid itself is >250 lines, split the day cell into its own memoized component.
