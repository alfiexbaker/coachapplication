# Sprint 17: Development, Analytics, Events & Group Sessions

> **Phase:** 2 — Screen Decomposition
> **Target:** 18 screens decomposed to <250 lines each
> **Quality Bar:** Progress tracking and analytics screens must make data beautiful and actionable. Group session screens must handle RSVP and roster complexity cleanly.
> **Estimated Effort:** 6-8 hours

---

## Pre-Flight Checklist

Before writing ANY code:

1. **Read `CLAUDE.md`** — memorize architecture rules
2. **Read `hooks/use-screen.ts`** — `useScreen()` API
3. **Read `components/ui/screen-states.tsx`** — `LoadingState`, `ErrorState`, `EmptyState`
4. **Read `components/primitives/index.ts`** — `Row`, `Column`, `Center`, `Spacer`, `SurfaceCard`
5. **Read relevant services:**
   - `services/analytics/` — analytics data model
   - `services/skills/` — skills/progress data model
   - `services/community/` — community group data model
   - `services/match-service.ts` — if events reference matches
6. **Read relevant type definitions:**
   - `constants/session-types.ts` — GroupSession, Event types
   - `constants/types.ts` — Badge, Skill, Progress types
7. **Read Sprints 13-16 patterns** — reuse established decomposition approaches

---

## Target Files (18 screens)

### Development / Progress Screens (7)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 1 | `app/development/athlete/[athleteId].tsx` | 983 | Detail | detail | `components/development/` |
| 2 | `app/development/session/[sessionId].tsx` | 961 | Detail | detail | `components/development/` |
| 3 | `app/development/my-progress.tsx` | 726 | Dashboard | card | `components/development/` |
| 4 | `app/development/athlete/[athleteId]/special-needs.tsx` | 594 | Form | form | `components/development/` |
| 5 | `app/development/badges.tsx` | 533 | Grid | card | `components/development/` |
| 6 | `app/development/child-progress/[childId].tsx` | 461 | Dashboard | card | `components/development/` |
| 7 | `app/community/index.tsx` | 506 | List | list | `components/community/` |

### Analytics Screens (3)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 8 | `app/analytics/[athleteId].tsx` | 673 | Dashboard | card | `components/analytics/` |
| 9 | `app/analytics/revenue.tsx` | 487 | Dashboard | card | `components/analytics/` |
| 10 | `app/analytics/dashboard.tsx` | 446 | Dashboard | card | `components/analytics/` |

### Group Session Screens (4)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 11 | `app/group-sessions/[id]/roster.tsx` | 937 | List | list | `components/group/` |
| 12 | `app/group-sessions/[id].tsx` | 552 | Detail | detail | `components/group/` |
| 13 | `app/group-sessions/index.tsx` | 439 | List | list | `components/group/` |
| 14 | `app/group-sessions/create.tsx` | 416 | Form | form | `components/group/` |

### Event Screens (2)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 15 | `app/events/[id]/rsvp.tsx` | 535 | Form/List | list | `components/event/` |
| 16 | `app/events/[id].tsx` | 531 | Detail | detail | `components/event/` |

### Squad Invite (1)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 17 | `app/squads/[id]/invite.tsx` | 588 | Form | form | `components/club/` |

### Carpool (1)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 18 | `app/carpool/index.tsx` | 881 | List/Map | list | `components/carpool/` |

---

## Decomposition Instructions Per Screen

### Screen 1: `app/development/athlete/[athleteId].tsx` (983 lines) — Athlete Development Profile

**Archetype:** Detail/dashboard showing an athlete's development history, skills, badges, session notes

This is a data-rich screen. The coach views an athlete's progress over time.

**Decomposition plan:**

1. **Read the entire file.** Identify sections: athlete header, skill radar/chart, session history, badge collection, development notes, progress metrics.

2. **Use `useScreen()`:**
   ```typescript
   const { data, status, error, refreshing, onRefresh, retry, colors, scheme } = useScreen({
     load: async () => {
       const [athleteResult, skillsResult, sessionsResult, badgesResult] = await Promise.all([
         rosterService.getById(athleteId),
         skillsService.getByAthlete(athleteId),
         sessionService.getByAthlete(athleteId),
         badgeService.getByAthlete(athleteId),
       ]);
       if (!athleteResult.success) return athleteResult;
       return ok({
         athlete: athleteResult.data,
         skills: skillsResult.success ? skillsResult.data : [],
         sessions: sessionsResult.success ? sessionsResult.data : [],
         badges: badgesResult.success ? badgesResult.data : [],
       });
     },
     deps: [athleteId],
     events: ['SKILL_UPDATED', 'BADGE_AWARDED', 'SESSION_COMPLETED'],
   });
   ```

3. **Create sub-components** in `components/development/`:
   - `components/development/athlete-dev-header.tsx` — Athlete avatar, name, age, sport, overall level
   - `components/development/skill-progress-chart.tsx` — Skill radar/bar chart visualization
   - `components/development/skill-card.tsx` — Individual skill card with level + trend (memo!)
   - `components/development/session-history-section.tsx` — Recent sessions with notes preview
   - `components/development/session-history-card.tsx` — Individual session card (memo!)
   - `components/development/badge-collection.tsx` — Badge grid (earned + locked)
   - `components/development/progress-metrics.tsx` — Key stats: sessions attended, avg rating, streaks

4. **Screen file:** `useScreen()` + 4 state branches + ScrollView composing sections. <250 lines.

---

### Screen 2: `app/development/session/[sessionId].tsx` (961 lines) — Session Development Notes

**Archetype:** Detail screen showing development notes for a specific session

**Decomposition plan:**

1. **Read the file.** Identify: session summary header, attendance summary, per-athlete notes, skills assessed, badges awarded.

2. **Use `useScreen()`** to load session + development data.

3. **Create sub-components** in `components/development/`:
   - `components/development/session-dev-header.tsx` — Session title, date, coach, duration
   - `components/development/session-attendance-summary.tsx` — Present/absent/late counts
   - `components/development/athlete-note-card.tsx` — Per-athlete notes (skills, effort, homework) (memo!)
   - `components/development/session-skills-summary.tsx` — Skills covered in the session
   - `components/development/session-badges-awarded.tsx` — Badges given during this session

4. **Screen file:** `useScreen()` + 4 states. If many athletes, use FlatList for athlete notes. <250 lines.

---

### Screen 3: `app/development/my-progress.tsx` (726 lines) — My Progress (Athlete View)

**Archetype:** Dashboard (athlete's own progress view)

**Decomposition plan:**

1. **Create sub-components** in `components/development/`:
   - `components/development/my-progress-header.tsx` — Level, XP bar, current streak
   - `components/development/my-skills-section.tsx` — Skills grid with levels
   - `components/development/my-recent-sessions.tsx` — Last 5 sessions with notes
   - `components/development/my-badges-section.tsx` — Recent badges earned
   - `components/development/my-goals-section.tsx` — Active goals with progress bars

2. **Screen file:** `useScreen()` + 4 states. ScrollView. <250 lines.

---

### Screen 4: `app/development/athlete/[athleteId]/special-needs.tsx` (594 lines) — Special Needs

**Archetype:** Form (record special needs, medical notes, accommodations)

**Decomposition plan:**

1. **Create sub-components** in `components/development/`:
   - `components/development/special-needs-info.tsx` — Main info section (conditions, notes)
   - `components/development/special-needs-accommodations.tsx` — Required accommodations list
   - `components/development/special-needs-contacts.tsx` — Emergency/specialist contacts
   - `components/development/special-needs-submit.tsx` — Save button

2. **Screen file:** KeyboardAvoidingView + ScrollView. `useScreen()` to load existing data. <250 lines.

**Special requirements:**
- This contains sensitive medical data. Ensure `accessibilityLabel` does NOT expose sensitive info to screen readers in public.
- All fields must have proper input types (e.g., phone number keyboard for phone fields).

---

### Screen 5: `app/development/badges.tsx` (533 lines) — All Badges

**Archetype:** Grid (all available badges with earned status)

**Decomposition plan:**

1. **Create sub-components** in `components/development/`:
   - `components/development/badge-grid-card.tsx` — Single badge (earned vs locked styling) (memo!)
   - `components/development/badge-category-header.tsx` — Category section header
   - `components/development/badge-progress-bar.tsx` — "X of Y earned" progress

2. **Screen file:** `useScreen()` + FlatList with `numColumns={3}` or SectionList by category. <250 lines.

---

### Screen 6: `app/development/child-progress/[childId].tsx` (461 lines) — Child Progress (Parent View)

**Archetype:** Dashboard (parent viewing child's progress — simplified version of athlete development)

**Decomposition plan:**

1. **Reuse components** from Screen 1 and Screen 3 where possible:
   - `components/development/skill-progress-chart.tsx` (from Screen 1)
   - `components/development/badge-collection.tsx` (from Screen 1)
2. **Create:**
   - `components/development/child-progress-header.tsx` — Child name, photo, coach name
   - `components/development/child-recent-feedback.tsx` — Recent coach feedback/notes
3. **Screen file:** `useScreen()` + 4 states. <250 lines.

---

### Screen 7: `app/community/index.tsx` (506 lines) — Community Groups List

**Archetype:** List (community groups the user belongs to)

**Decomposition plan:**

1. **Use `useScreen()`:**
   ```typescript
   const { data, status, error, refreshing, onRefresh, colors, scheme } = useScreen({
     load: async () => communityService.getGroups(),
     deps: [],
     events: ['GROUP_CREATED', 'GROUP_UPDATED', 'GROUP_JOINED', 'GROUP_LEFT'],
   });
   ```

2. **Create sub-components** in `components/community/`:
   - `components/community/community-group-card.tsx` — Group card (name, members, last activity) (memo!)
   - `components/community/community-header.tsx` — "My Groups" title + "Create Group" button
   - Reuse existing `components/community/ParentGroupCard.tsx` if applicable

3. **Screen file:** `useScreen()` + FlatList + pull-to-refresh. EmptyState: "Join a community group to connect with other parents and coaches." <250 lines.

---

### Screens 8-10: Analytics Screens

**Screen 8: `app/analytics/[athleteId].tsx` (673 lines) — Athlete Analytics**

**Decomposition plan:**

1. **Create sub-components** in `components/analytics/`:
   - `components/analytics/analytics-header.tsx` — Athlete name, date range selector
   - `components/analytics/analytics-stat-grid.tsx` — Key metric cards (sessions, attendance %, improvement)
   - `components/analytics/analytics-stat-card.tsx` — Individual stat card (memo!)
   - `components/analytics/analytics-trend-chart.tsx` — Line chart of progress over time
   - `components/analytics/analytics-skill-breakdown.tsx` — Per-skill progress breakdown

2. **Screen file:** `useScreen()` + 4 states. Date range filter is local state. <250 lines.

**Screen 9: `app/analytics/revenue.tsx` (487 lines) — Revenue Analytics**

**Decomposition plan:**

1. **Create sub-components** in `components/analytics/`:
   - `components/analytics/revenue-summary-card.tsx` — Total earnings, this month, last month
   - `components/analytics/revenue-chart.tsx` — Bar/line chart of earnings over time
   - `components/analytics/revenue-breakdown.tsx` — By session type, by client
   - `components/analytics/revenue-period-selector.tsx` — Week/Month/Quarter/Year selector

2. **Screen file:** `useScreen()` + 4 states. <250 lines.

**Screen 10: `app/analytics/dashboard.tsx` (446 lines) — Analytics Dashboard**

**Decomposition plan:**

1. **Create sub-components** in `components/analytics/`:
   - `components/analytics/dashboard-summary.tsx` — Top-level KPIs
   - `components/analytics/dashboard-sessions-chart.tsx` — Sessions over time
   - `components/analytics/dashboard-top-athletes.tsx` — Most-booked athletes
   - `components/analytics/dashboard-quick-links.tsx` — Links to detailed analytics pages

2. **Screen file:** `useScreen()` + ScrollView. <250 lines.

---

### Screens 11-14: Group Session Screens

**Screen 11: `app/group-sessions/[id]/roster.tsx` (937 lines) — Group Session Roster**

**Archetype:** List with complex per-athlete state (RSVP status, attendance, actions)

This is the second-largest file in this sprint. It likely has:
- Header with session info
- Athlete list with RSVP status per athlete
- Attendance marking
- Filter by RSVP status

**Decomposition plan:**

1. **Read the entire file.** Map state: athlete list, RSVP statuses, attendance marks, filter state.

2. **Use `useScreen()`:**
   ```typescript
   const { data, status, error, refreshing, onRefresh, colors, scheme } = useScreen({
     load: async () => {
       const [sessionResult, rosterResult] = await Promise.all([
         groupSessionService.getById(id),
         groupSessionService.getRoster(id),
       ]);
       if (!sessionResult.success) return sessionResult;
       return ok({
         session: sessionResult.data,
         roster: rosterResult.success ? rosterResult.data : [],
       });
     },
     deps: [id],
     events: ['GROUP_SESSION_UPDATED', 'RSVP_CHANGED', 'ATTENDANCE_MARKED'],
   });
   ```

3. **Create sub-components** in `components/group/`:
   - `components/group/roster-header.tsx` — Session title, date, RSVP counts summary
   - `components/group/roster-filter-bar.tsx` — All/Going/Maybe/Not going/No response filter tabs
   - `components/group/roster-athlete-card.tsx` — Athlete card with RSVP badge + attendance toggle (memo!)
   - `components/group/roster-attendance-toggle.tsx` — Present/absent/late toggle (reusable)
   - `components/group/roster-action-bar.tsx` — "Mark all present", "Send reminders" buttons
   - `components/group/roster-summary-footer.tsx` — "X of Y confirmed" summary

4. **Screen file:** `useScreen()` + FlatList + pull-to-refresh. Filter with useMemo. <250 lines.

**CRITICAL:** `roster-athlete-card.tsx` MUST be wrapped in `memo()` since it appears in a FlatList that could have 50+ items. Every handler passed to it must use `useCallback`.

---

**Screen 12: `app/group-sessions/[id].tsx` (552 lines) — Group Session Detail**

**Decomposition plan:**

1. **Create sub-components** in `components/group/`:
   - `components/group/group-session-header.tsx` — Title, date/time, location, cover image
   - `components/group/group-session-info.tsx` — Coach, duration, price, capacity
   - `components/group/group-session-attendees.tsx` — Attendee avatar row + "X going"
   - `components/group/group-session-actions.tsx` — RSVP button, View Roster, Edit
   - `components/group/group-session-description.tsx` — Session description, focus areas

2. **Screen file:** `useScreen()` + 4 states. ScrollView. <250 lines.

---

**Screen 13: `app/group-sessions/index.tsx` (439 lines) — Group Sessions List**

**Decomposition plan:**

1. **Create sub-components** in `components/group/`:
   - `components/group/group-session-card.tsx` — Session card in list (memo! SurfaceCard!)
   - `components/group/group-session-filter.tsx` — Upcoming/Past/All filter

2. **Screen file:** `useScreen()` + FlatList + pull-to-refresh. <250 lines.

---

**Screen 14: `app/group-sessions/create.tsx` (416 lines) — Create Group Session**

**Decomposition plan:**

1. **Create sub-components** in `components/group/`:
   - `components/group/create-session-details.tsx` — Title, description, focus
   - `components/group/create-session-schedule.tsx` — Date, time, duration, recurring
   - `components/group/create-session-capacity.tsx` — Max capacity, min to run
   - `components/group/create-session-submit.tsx` — Submit button

2. **Screen file:** KeyboardAvoidingView + ScrollView. <250 lines.

---

### Screens 15-16: Event Screens

**Screen 15: `app/events/[id]/rsvp.tsx` (535 lines) — Event RSVP**

**Decomposition plan:**

1. **Create sub-components** in `components/event/`:
   - `components/event/rsvp-event-header.tsx` — Event title, date, location
   - `components/event/rsvp-status-selector.tsx` — Going/Maybe/Not going toggle (big buttons with haptics)
   - `components/event/rsvp-attendee-list.tsx` — Who's going (FlatList, memo items)
   - `components/event/rsvp-attendee-card.tsx` — Attendee avatar + name (memo!)
   - `components/event/rsvp-message-input.tsx` — Optional message input

2. **Screen file:** `useScreen()` + 4 states. <250 lines.

---

**Screen 16: `app/events/[id].tsx` (531 lines) — Event Detail**

**Decomposition plan:**

1. **Create sub-components** in `components/event/`:
   - `components/event/event-detail-header.tsx` — Cover image, title, date/time
   - `components/event/event-detail-info.tsx` — Location, organizer, capacity
   - `components/event/event-attendee-preview.tsx` — "X going" + avatar row
   - `components/event/event-detail-actions.tsx` — RSVP, Share, Add to Calendar
   - `components/event/event-description.tsx` — Full event description

2. **Screen file:** `useScreen()` + 4 states. ScrollView. <250 lines.

---

### Screen 17: `app/squads/[id]/invite.tsx` (588 lines) — Squad Invite Members

**Archetype:** Form + List (similar to club invite-members from Sprint 15)

**Decomposition plan:**

1. **Reuse components** from Sprint 15 where possible:
   - `components/club/invite-contact-list.tsx`
   - `components/club/invite-contact-card.tsx`
   - `components/club/invite-share-link.tsx`
2. **Create squad-specific:**
   - `components/club/squad-invite-header.tsx` — Squad info + "Invite to [squad name]"
3. **Screen file:** KeyboardAvoidingView. <250 lines.

---

### Screen 18: `app/carpool/index.tsx` (881 lines) — Carpool

**Archetype:** List with potential map view (offered rides, requested rides)

**Decomposition plan:**

1. **Read the file.** Identify: ride offer list, ride request list, create ride button, filter by event/session.

2. **Create sub-components** in `components/carpool/`:
   - `components/carpool/carpool-header.tsx` — Title + "Offer ride" CTA
   - `components/carpool/carpool-filter.tsx` — Filter by event, direction (to/from)
   - `components/carpool/carpool-ride-card.tsx` — Ride offer/request card (memo!)
   - `components/carpool/carpool-ride-details.tsx` — Expanded ride details (seats, time, route)
   - `components/carpool/carpool-request-card.tsx` — Ride request card (memo!)

3. **Screen file:** `useScreen()` + FlatList + pull-to-refresh. <250 lines.

---

## Execution Order

1. `development/athlete/[athleteId].tsx` (983) — Largest. Sets development detail pattern.
2. `development/session/[sessionId].tsx` (961) — Reuses development components.
3. `group-sessions/[id]/roster.tsx` (937) — Sets group roster pattern.
4. `carpool/index.tsx` (881) — Standalone.
5. `development/my-progress.tsx` (726) — Dashboard pattern.
6. `analytics/[athleteId].tsx` (673) — Sets analytics pattern.
7. `development/athlete/[athleteId]/special-needs.tsx` (594) — Form pattern.
8. `squads/[id]/invite.tsx` (588) — Reuses invite components.
9. `group-sessions/[id].tsx` (552) — Group session detail.
10. `events/[id]/rsvp.tsx` (535) — RSVP form.
11. `development/badges.tsx` (533) — Grid pattern.
12. `events/[id].tsx` (531) — Event detail.
13. `community/index.tsx` (506) — List pattern.
14. `analytics/revenue.tsx` (487) — Analytics dashboard.
15. `development/child-progress/[childId].tsx` (461) — Dashboard (reuses components).
16. `analytics/dashboard.tsx` (446) — Analytics dashboard.
17. `group-sessions/index.tsx` (439) — List pattern.
18. `group-sessions/create.tsx` (416) — Form pattern.

---

## Verification Commands

```bash
# 1. TypeScript compilation
npx tsc -p tsconfig.test.json

# 2. Run all tests
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js

# 3. Line counts (all <250)
wc -l app/development/athlete/\[athleteId\].tsx app/development/session/\[sessionId\].tsx app/development/my-progress.tsx app/development/athlete/\[athleteId\]/special-needs.tsx app/development/badges.tsx app/development/child-progress/\[childId\].tsx app/community/index.tsx app/analytics/\[athleteId\].tsx app/analytics/revenue.tsx app/analytics/dashboard.tsx app/group-sessions/\[id\]/roster.tsx app/group-sessions/\[id\].tsx app/group-sessions/index.tsx app/group-sessions/create.tsx app/events/\[id\]/rsvp.tsx app/events/\[id\].tsx app/squads/\[id\]/invite.tsx app/carpool/index.tsx

# 4. Verify useScreen usage
grep -rl "useScreen" app/development/ app/analytics/ app/group-sessions/ app/events/ app/community/index.tsx app/squads/ app/carpool/ 2>/dev/null

# 5. Verify no Colors.light
grep -r "Colors\.light\." app/development/ app/analytics/ app/group-sessions/ app/events/ app/community/ app/squads/ app/carpool/ components/development/ components/analytics/ components/group/ components/event/ components/carpool/ || echo "PASS"

# 6. Verify no TouchableOpacity
grep -r "TouchableOpacity" components/development/ components/analytics/ components/group/ components/event/ components/carpool/ components/community/ || echo "PASS"

# 7. Verify no raw flexDirection in new components
grep -rn "flexDirection" components/development/ components/analytics/ components/group/ components/event/ components/carpool/ 2>/dev/null | head -20
```

---

## Sub-Component Directory Structure

```
components/
  development/
    athlete-dev-header.tsx
    skill-progress-chart.tsx
    skill-card.tsx
    session-history-section.tsx
    session-history-card.tsx
    badge-collection.tsx
    progress-metrics.tsx
    session-dev-header.tsx
    session-attendance-summary.tsx
    athlete-note-card.tsx
    session-skills-summary.tsx
    session-badges-awarded.tsx
    my-progress-header.tsx
    my-skills-section.tsx
    my-recent-sessions.tsx
    my-badges-section.tsx
    my-goals-section.tsx
    special-needs-info.tsx
    special-needs-accommodations.tsx
    special-needs-contacts.tsx
    special-needs-submit.tsx
    badge-grid-card.tsx
    badge-category-header.tsx
    badge-progress-bar.tsx
    child-progress-header.tsx
    child-recent-feedback.tsx
  analytics/
    analytics-header.tsx
    analytics-stat-grid.tsx
    analytics-stat-card.tsx
    analytics-trend-chart.tsx
    analytics-skill-breakdown.tsx
    revenue-summary-card.tsx
    revenue-chart.tsx
    revenue-breakdown.tsx
    revenue-period-selector.tsx
    dashboard-summary.tsx
    dashboard-sessions-chart.tsx
    dashboard-top-athletes.tsx
    dashboard-quick-links.tsx
  group/
    roster-header.tsx
    roster-filter-bar.tsx
    roster-athlete-card.tsx
    roster-attendance-toggle.tsx
    roster-action-bar.tsx
    roster-summary-footer.tsx
    group-session-header.tsx
    group-session-info.tsx
    group-session-attendees.tsx
    group-session-actions.tsx
    group-session-description.tsx
    group-session-card.tsx
    group-session-filter.tsx
    create-session-details.tsx
    create-session-schedule.tsx
    create-session-capacity.tsx
    create-session-submit.tsx
  event/
    rsvp-event-header.tsx
    rsvp-status-selector.tsx
    rsvp-attendee-list.tsx
    rsvp-attendee-card.tsx
    rsvp-message-input.tsx
    event-detail-header.tsx
    event-detail-info.tsx
    event-attendee-preview.tsx
    event-detail-actions.tsx
    event-description.tsx
  carpool/
    carpool-header.tsx
    carpool-filter.tsx
    carpool-ride-card.tsx
    carpool-ride-details.tsx
    carpool-request-card.tsx
  community/
    community-group-card.tsx
    community-header.tsx
    (ParentGroupCard.tsx already exists)
```

---

## Common Pitfalls

1. **Analytics charts:** If using custom chart rendering (not a library), the chart component can be complex. Keep chart SVG/canvas logic in its own component. If it exceeds 250 lines, split into chart-container + chart-renderer.
2. **Group session roster** can have many athletes (50+). MUST use FlatList with memoized items. Never ScrollView.
3. **Development data loading** involves multiple services. Use `Promise.all()` in `useScreen()` load function, and handle partial failures gracefully (show data even if some calls fail).
4. **RSVP status selector** needs clear visual states (Going=green, Maybe=amber, Not going=red). Use `colors.success`, `colors.warning`, `colors.error` from theme.
5. **Special needs screen** contains sensitive data. Be thoughtful about accessibility labels.
6. **Carpool screen** may have map integration. If so, keep map in its own component. Map components are inherently complex — budget 200+ lines for a map wrapper.
7. **Reuse components across screens.** `badge-collection.tsx` should work for athlete dev, my-progress, and child-progress screens. `skill-card.tsx` should work everywhere skills are shown.
8. **Date range selectors** in analytics screens should be local state. Do NOT re-fetch via useScreen when changing date range — filter the loaded data with `useMemo`, or trigger a new load by including the range in `deps`.
