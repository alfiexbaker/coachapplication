# Sprint 15: Club & Academy Screens

> **Phase:** 2 — Screen Decomposition
> **Target:** 15 screens decomposed to <250 lines each
> **Quality Bar:** Club management is complex. Every flow must be clear, every action discoverable.
> **Estimated Effort:** 5-7 hours

---

## Pre-Flight Checklist

Before writing ANY code:

1. **Read `CLAUDE.md`** — memorize architecture rules
2. **Read `hooks/use-screen.ts`** — `useScreen()` API (options lines 38-47, result lines 49-58)
3. **Read `components/ui/screen-states.tsx`** — `LoadingState`, `ErrorState`, `EmptyState`
4. **Read `components/primitives/index.ts`** — `Row`, `Column`, `Center`, `Spacer`, `SurfaceCard`
5. **Read `services/club-service.ts`** — understand club data model and available methods
6. **Read `services/academy-service.ts`** — understand academy data model (if separate from club)
7. **Read `services/squad-service.ts`** — squads are children of clubs
8. **Read `constants/club-types.ts`** — all club/academy TypeScript interfaces
9. **Read Sprint 13 + 14 patterns** — reuse established decomposition patterns

---

## Target Files (15 screens)

### Club Screens (10)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 1 | `app/club/[id].tsx` | 972 | Detail | detail | `components/club/` |
| 2 | `app/club/squad/[id].tsx` | 804 | Detail | detail | `components/club/` |
| 3 | `app/club/settings.tsx` | 713 | Form | form | `components/club/` |
| 4 | `app/club/[clubId]/member/[memberId].tsx` | 640 | Detail | detail | `components/club/` |
| 5 | `app/club/invite-members.tsx` | 626 | Form/List | form | `components/club/` |
| 6 | `app/club/training-schedule.tsx` | 619 | Calendar | calendar | `components/club/` |
| 7 | `app/club/[clubId]/calendar.tsx` | 592 | Calendar | calendar | `components/club/` |
| 8 | `app/club/squad/create.tsx` | 434 | Form | form | `components/club/` |
| 9 | `app/club/create.tsx` | 423 | Form | form | `components/club/` |
| 10 | `app/club/[clubId]/dashboard.tsx` | 338 | Dashboard | card | `components/club/` |

### Academy Screens (5)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 11 | `app/academy/[id].tsx` | 567 | Detail | detail | `components/academy/` |
| 12 | `app/academy/create.tsx` | 515 | Form | form | `components/academy/` |
| 13 | `app/academy/[id]/branding.tsx` | 462 | Form | form | `components/academy/` |
| 14 | `app/academy/[id]/staff.tsx` | 444 | List | list | `components/academy/` |
| 15 | `app/academy/[id]/settings.tsx` | 352 | Form | form | `components/academy/` |

---

## Decomposition Instructions Per Screen

### Screen 1: `app/club/[id].tsx` (972 lines) — Club Detail

**Archetype:** Detail screen with multiple info sections and action buttons

**Decomposition plan:**

1. **Read the entire file.** Identify sections: club header (logo, name, sport), stats row, squad list, member list, recent activity, action buttons.

2. **Use `useScreen()`:**
   ```typescript
   const { data, status, error, refreshing, onRefresh, retry, colors, scheme } = useScreen({
     load: async () => {
       const clubResult = await clubService.getById(id);
       if (!clubResult.success) return clubResult;
       const squadsResult = await squadService.getByClub(id);
       const membersResult = await clubService.getMembers(id);
       return ok({
         club: clubResult.data,
         squads: squadsResult.success ? squadsResult.data : [],
         members: membersResult.success ? membersResult.data : [],
       });
     },
     deps: [id],
     events: ['CLUB_UPDATED', 'SQUAD_CREATED', 'MEMBER_ADDED', 'MEMBER_REMOVED'],
   });
   ```

3. **Create sub-components** in `components/club/`:
   - `components/club/club-detail-header.tsx` — Logo, name, sport, location, member count
   - `components/club/club-stats-row.tsx` — Stats: members, squads, sessions this week
   - `components/club/club-squad-section.tsx` — "Squads" section with horizontal cards (SurfaceCard)
   - `components/club/club-member-preview.tsx` — "Members" section with top 5 avatars + "View all" link
   - `components/club/club-activity-feed.tsx` — Recent activity section
   - `components/club/club-detail-actions.tsx` — Action buttons (Join, Leave, Settings, etc.)

4. **Screen file:** `useScreen()` + 4 state branches + ScrollView composing sections. <250 lines.

---

### Screen 2: `app/club/squad/[id].tsx` (804 lines) — Squad Detail

**Archetype:** Detail screen with member roster and session schedule

**Decomposition plan:**

1. **Read the file.** Identify: squad header, member list, upcoming sessions, coach info, action bar.

2. **Use `useScreen()`** loading squad + its members + upcoming sessions.

3. **Create sub-components** in `components/club/`:
   - `components/club/squad-detail-header.tsx` — Squad name, sport, age group, member count
   - `components/club/squad-member-list.tsx` — FlatList of squad members (memo renderItem!)
   - `components/club/squad-member-card.tsx` — Member avatar + name + role (memo!)
   - `components/club/squad-upcoming-sessions.tsx` — Next 3-5 sessions
   - `components/club/squad-coach-info.tsx` — Assigned coach card
   - `components/club/squad-action-bar.tsx` — Invite members, schedule session, message buttons

4. **Screen file:** <250 lines. ScrollView with nested FlatList for members (or use ScrollView if member count is typically <20).

---

### Screen 3: `app/club/settings.tsx` (713 lines) — Club Settings

**Archetype:** Form screen with setting groups

**Decomposition plan:**

1. **Create sub-components** in `components/club/`:
   - `components/club/settings-general.tsx` — Name, description, sport, logo upload
   - `components/club/settings-membership.tsx` — Membership policies, fees, auto-approve
   - `components/club/settings-notifications.tsx` — Notification preferences for the club
   - `components/club/settings-danger-zone.tsx` — Archive club, transfer ownership (destructive)

2. **Screen file:** Custom hook or `useScreen()` for loading current settings. KeyboardAvoidingView + ScrollView. <250 lines.

---

### Screen 4: `app/club/[clubId]/member/[memberId].tsx` (640 lines) — Member Detail

**Archetype:** Detail screen (member profile within club context)

**Decomposition plan:**

1. **Create sub-components** in `components/club/`:
   - `components/club/member-profile-header.tsx` — Avatar, name, role, join date
   - `components/club/member-squads-section.tsx` — Squads this member belongs to
   - `components/club/member-attendance.tsx` — Attendance stats
   - `components/club/member-actions.tsx` — Change role, remove from club, message

2. **Screen file:** `useScreen()` with `[clubId, memberId]` deps. <250 lines.

---

### Screen 5: `app/club/invite-members.tsx` (626 lines) — Invite Members

**Archetype:** Form + List (search contacts, enter emails, share invite link)

**Decomposition plan:**

1. **Create sub-components** in `components/club/`:
   - `components/club/invite-search-bar.tsx` — Search input for finding contacts
   - `components/club/invite-contact-list.tsx` — Searchable contact list with checkboxes
   - `components/club/invite-contact-card.tsx` — Contact row (memo!)
   - `components/club/invite-email-input.tsx` — Manual email entry with chips
   - `components/club/invite-share-link.tsx` — Copy/share invite link section
   - `components/club/invite-send-bar.tsx` — Bottom send button with selected count

2. **Screen file:** KeyboardAvoidingView. Local search state. `useScreen()` for loading contacts. <250 lines.

---

### Screen 6: `app/club/training-schedule.tsx` (619 lines) — Training Schedule

**Archetype:** Calendar view with recurring training slots

**Decomposition plan:**

1. **Create sub-components** in `components/club/`:
   - `components/club/training-calendar-view.tsx` — Week/month calendar grid
   - `components/club/training-slot-card.tsx` — Individual training slot (memo!)
   - `components/club/training-day-sessions.tsx` — Sessions list for selected day
   - `components/club/training-add-button.tsx` — Add recurring training button

2. **Screen file:** `useScreen()` + `LoadingState variant="calendar"`. <250 lines.

---

### Screen 7: `app/club/[clubId]/calendar.tsx` (592 lines) — Club Calendar

Similar to training schedule but shows ALL club events (sessions, matches, events).

**Decomposition plan:**

1. **Reuse** `components/club/training-calendar-view.tsx` if the calendar grid is identical.
2. **Create:**
   - `components/club/calendar-event-card.tsx` — Event card with type badge (session/match/event) (memo!)
   - `components/club/calendar-day-events.tsx` — Events for selected day

3. **Screen file:** `useScreen()` + `LoadingState variant="calendar"`. <250 lines.

---

### Screen 8: `app/club/squad/create.tsx` (434 lines) — Create Squad

**Archetype:** Form

**Decomposition plan:**

1. **Create sub-components** in `components/club/`:
   - `components/club/create-squad-form.tsx` — Name, sport, age group, description fields
   - `components/club/create-squad-members.tsx` — Member selection from club roster
   - `components/club/create-squad-submit.tsx` — Submit button with loading state

2. **Screen file:** KeyboardAvoidingView + ScrollView. Custom hook or `useScreen()`. <250 lines.

---

### Screen 9: `app/club/create.tsx` (423 lines) — Create Club

**Archetype:** Form (multi-section)

**Decomposition plan:**

1. **Create sub-components** in `components/club/`:
   - `components/club/create-club-info.tsx` — Name, sport, description
   - `components/club/create-club-location.tsx` — Location input, map preview
   - `components/club/create-club-branding.tsx` — Logo upload, color picker
   - `components/club/create-club-submit.tsx` — Submit section

2. **Screen file:** KeyboardAvoidingView + ScrollView. <250 lines.

---

### Screen 10: `app/club/[clubId]/dashboard.tsx` (338 lines) — Club Dashboard

**Archetype:** Dashboard (stats + quick actions)

Already close to target. May only need:
1. Extract `components/club/dashboard-stats-grid.tsx` — Stat cards grid
2. Extract `components/club/dashboard-quick-actions.tsx` — Quick action buttons
3. Add `useScreen()` + 4 state branches if not present.
4. Target: <250 lines.

---

### Screens 11-15: Academy Screens

Academy screens follow the same patterns as club screens but for the Academy entity.

**Screen 11: `app/academy/[id].tsx` (567 lines) — Academy Detail**
- Same as Club Detail pattern (Screen 1)
- Sub-components: `components/academy/academy-header.tsx`, `academy-stats.tsx`, `academy-staff-section.tsx`, `academy-programs.tsx`

**Screen 12: `app/academy/create.tsx` (515 lines) — Create Academy**
- Same as Create Club pattern (Screen 9)
- Sub-components: `components/academy/create-academy-info.tsx`, `create-academy-branding.tsx`, `create-academy-submit.tsx`

**Screen 13: `app/academy/[id]/branding.tsx` (462 lines) — Academy Branding**
- Form screen for logo, colors, theme
- Sub-components: `components/academy/branding-logo-section.tsx`, `branding-colors-section.tsx`, `branding-preview.tsx`

**Screen 14: `app/academy/[id]/staff.tsx` (444 lines) — Academy Staff List**
- List archetype
- Sub-components: `components/academy/staff-card.tsx` (memo!), `staff-header.tsx`, `staff-invite-bar.tsx`
- `useScreen()` + FlatList + pull-to-refresh

**Screen 15: `app/academy/[id]/settings.tsx` (352 lines) — Academy Settings**
- Same as Club Settings pattern (Screen 3)
- Sub-components: `components/academy/settings-general.tsx`, `settings-membership.tsx`, `settings-danger.tsx`
- Close to target — may only need 1-2 extractions + `useScreen()`.

---

## Shared Component Opportunities

Several components can be shared between club and academy screens:

| Component | Usage |
|-----------|-------|
| `SurfaceCard` | All detail cards, list items, dashboard stats |
| `components/club/training-calendar-view.tsx` | Club calendar + training schedule |
| Settings row/group pattern | Club settings + academy settings |
| Member card pattern | Club members + squad members + academy staff |

When you notice a component works for both club and academy, consider placing it in a shared location (e.g., `components/shared/member-card.tsx`) or making the club version generic enough to accept academy data.

---

## Execution Order

1. `club/[id].tsx` (972) — Establishes club detail pattern
2. `club/squad/[id].tsx` (804) — Reuses club sub-components
3. `club/settings.tsx` (713) — Establishes settings form pattern
4. `club/[clubId]/member/[memberId].tsx` (640) — Reuses member components
5. `club/invite-members.tsx` (626) — Form + list hybrid
6. `club/training-schedule.tsx` (619) — Establishes calendar pattern
7. `club/[clubId]/calendar.tsx` (592) — Reuses calendar components
8. `academy/[id].tsx` (567) — Mirror of club detail
9. `academy/create.tsx` (515) — Mirror of create club
10. `academy/[id]/branding.tsx` (462) — Form pattern
11. `academy/[id]/staff.tsx` (444) — List pattern
12. `club/squad/create.tsx` (434) — Form pattern
13. `club/create.tsx` (423) — Form pattern
14. `academy/[id]/settings.tsx` (352) — Settings pattern
15. `club/[clubId]/dashboard.tsx` (338) — Dashboard (minor cleanup)

---

## Verification Commands

```bash
# 1. TypeScript compilation
npx tsc -p tsconfig.test.json

# 2. Run all tests
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js

# 3. Line counts — all must be <250
wc -l app/club/\[id\].tsx app/club/squad/\[id\].tsx app/club/settings.tsx app/club/\[clubId\]/member/\[memberId\].tsx app/club/invite-members.tsx app/club/training-schedule.tsx app/club/\[clubId\]/calendar.tsx app/club/squad/create.tsx app/club/create.tsx app/club/\[clubId\]/dashboard.tsx app/academy/\[id\].tsx app/academy/create.tsx app/academy/\[id\]/branding.tsx app/academy/\[id\]/staff.tsx app/academy/\[id\]/settings.tsx

# 4. Verify useScreen usage
grep -l "useScreen" app/club/*.tsx app/club/**/*.tsx app/academy/*.tsx app/academy/**/*.tsx 2>/dev/null

# 5. Verify no Colors.light
grep -r "Colors\.light\." app/club/ app/academy/ components/club/ components/academy/ || echo "PASS"

# 6. Verify no TouchableOpacity
grep -r "TouchableOpacity" app/club/ app/academy/ components/club/ components/academy/ || echo "PASS"

# 7. Verify no raw flexDirection in new sub-components
grep -rn "flexDirection" components/club/ components/academy/ 2>/dev/null | head -20
```

---

## Sub-Component Directory Structure

```
components/
  club/
    # Detail sections
    club-detail-header.tsx
    club-stats-row.tsx
    club-squad-section.tsx
    club-member-preview.tsx
    club-activity-feed.tsx
    club-detail-actions.tsx
    # Squad sections
    squad-detail-header.tsx
    squad-member-list.tsx
    squad-member-card.tsx
    squad-upcoming-sessions.tsx
    squad-coach-info.tsx
    squad-action-bar.tsx
    # Settings
    settings-general.tsx
    settings-membership.tsx
    settings-notifications.tsx
    settings-danger-zone.tsx
    # Member
    member-profile-header.tsx
    member-squads-section.tsx
    member-attendance.tsx
    member-actions.tsx
    # Invite
    invite-search-bar.tsx
    invite-contact-list.tsx
    invite-contact-card.tsx
    invite-email-input.tsx
    invite-share-link.tsx
    invite-send-bar.tsx
    # Calendar/Schedule
    training-calendar-view.tsx
    training-slot-card.tsx
    training-day-sessions.tsx
    training-add-button.tsx
    calendar-event-card.tsx
    calendar-day-events.tsx
    # Create
    create-squad-form.tsx
    create-squad-members.tsx
    create-squad-submit.tsx
    create-club-info.tsx
    create-club-location.tsx
    create-club-branding.tsx
    create-club-submit.tsx
    # Dashboard
    dashboard-stats-grid.tsx
    dashboard-quick-actions.tsx
    # Already existing
    club-hub-header.tsx (from Sprint 14)
    club-announcements.tsx (from Sprint 14)
    upcoming-events-carousel.tsx (already existed)
  academy/
    academy-header.tsx
    academy-stats.tsx
    academy-staff-section.tsx
    academy-programs.tsx
    create-academy-info.tsx
    create-academy-branding.tsx
    create-academy-submit.tsx
    branding-logo-section.tsx
    branding-colors-section.tsx
    branding-preview.tsx
    staff-card.tsx
    staff-header.tsx
    staff-invite-bar.tsx
    settings-general.tsx
    settings-membership.tsx
    settings-danger.tsx
```

---

## Common Pitfalls

1. **Dynamic route params:** Screens like `[id].tsx` and `[clubId]/member/[memberId].tsx` get params via `useLocalSearchParams()`. Always pass these as deps to `useScreen()`.
2. **Club vs Academy:** These are similar but distinct entities. Don't merge them into one screen. But DO share component patterns.
3. **Calendar screens** are complex. If the calendar grid component itself exceeds 250 lines, extract the day cell into its own memoized component.
4. **Form screens need KeyboardAvoidingView.** Every screen with TextInput needs `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>`.
5. **Member list performance:** If clubs can have 100+ members, use FlatList with memoized renderItem, NOT ScrollView.
6. **Nested routes:** `app/club/[clubId]/calendar.tsx` is a nested route. The `clubId` param comes from the URL. Make sure `useLocalSearchParams()` extracts it correctly.
7. **Existing components:** Check `components/club/` before creating new files — some components may already exist from Sprint 14 or earlier.
