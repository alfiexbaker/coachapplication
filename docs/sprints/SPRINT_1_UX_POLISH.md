# Sprint 1: Core UX & UI Polish
**Duration:** 1-2 weeks
**Focus:** Polish existing UI, improve navigation, add missing screens, enhance user experience

---

## Copy/paste prompt for an AI to execute Sprint 1

Use this verbatim (adjust role/account names if needed) to keep the agent anchored to the current repo, the spines, and the existing components. It assumes front-end only with mock data and that nothing net-new is invented when an existing pattern can be extended.

```text
You are working in the Clubroom repo (football-first coaching marketplace) at /workspace/coachapplication.
Before coding:
- Read AGENTS.md at repo root for collaboration rules (reuse existing flows, map work to spines, keep diffs scoped).
- Read docs/SOURCE_OF_TRUTH.md, docs/SPINE_CATEGORIES.md, docs/sprints/SPRINT_1_UX_POLISH.md, and docs/sprints/SPRINTS_TO_99_DETAIL.md (Sprint 1 sections) to align scope and acceptance criteria.
- Stay frontend/mock-data only; do NOT add backend calls.

Goal (Sprint 1): Polish UX/UI for all roles by extending existing screens/components—no parallel implementations. Prioritize: discovery filters/search, booking status management + detail screen, enhanced messaging with attachments, role-specific profiles, settings, onboarding, loading/empty/error states, and coach availability polish.

Implementation rules:
- Reuse and extend current components in clubroom/app and components/*; only create new components listed in Sprint 1 if reuse is impossible (document why).
- Keep styling consistent with constants/theme.ts, IconSymbol, and existing spacing; avoid bespoke inline styles.
- Maintain role-aware navigation already present; new screens should slot into current tabs/routes.
- Mock data only; keep state machines/UI ready to swap to APIs later. Note assumptions in code comments when unavoidable.
- Add loading/empty/error states and haptics/toasts where Sprint 1 calls for them.

Definition of done for the agent:
- Every Sprint 1 checklist item is implemented or explicitly noted as blocked with rationale.
- Tests/checks run when feasible; if skipped, state why in commit/PR.
- Summary + Testing reported using repo AGENTS formatting; cite touched files/commands.
```

---

## Objectives

Refine the MVP foundation to create a polished, professional experience for all user roles.

### What We're Building:
1. ✅ Enhanced role-based navigation (DONE - Admin/Coach/User segmentation)
2. Enhanced coach discovery with filters
3. Improved booking cards with status management
4. Better messaging UI with attachments
5. Profile screens for all user types
6. Settings & preferences
7. Onboarding flow
8. Loading states & animations

---

## Tasks

### 1. Enhanced Coach Discovery (Users/Parents)

**File:** `clubroom/app/(tabs)/index.tsx`

**Improvements:**
- [ ] Add filter panel (slide-up modal)
  - Price range slider (£0-£200/hr)
  - Distance radius (5, 10, 25, 50 miles)
  - Session type (1-on-1, Small group, Team)
  - Specialties checkboxes (Dribbling, Finishing, Passing, etc.)
  - Availability (Today, This week, This month)
- [ ] Add sort options (Distance, Price, Rating, Newest)
- [ ] Add search bar (by name or location)
- [ ] Add map toggle (list view / map view)
- [ ] Empty state when no coaches match filters
- [ ] Loading skeleton while searching

**Map View (Optional):**
- [ ] Install `react-native-maps`
- [ ] Show coaches as pins on map
- [ ] Cluster nearby coaches
- [ ] Tap pin to see coach card

---

### 2. Booking Management Improvements

**File:** `clubroom/app/(tabs)/bookings.tsx`

**Enhancements:**
- [ ] Add tabs: Upcoming | Past | Cancelled
- [ ] Add booking status badges (Confirmed, Pending, Completed, Cancelled)
- [ ] Add actions per status:
  - Pending → Accept/Decline (Coach only) or Cancel (User)
  - Confirmed → View details, Message coach, Cancel with refund policy
  - Completed → Leave review, View session notes
- [ ] Add calendar integration button (Add to Calendar)
- [ ] Add directions/navigation (if location available)
- [ ] Countdown timer for upcoming sessions (e.g., "Starts in 2 hours")
- [ ] Empty states for each tab

**Booking Detail Screen:**
- [ ] Create `app/booking/[id].tsx`
- [ ] Show full booking details
- [ ] Show location on mini-map
- [ ] Show coach profile summary
- [ ] Show payment breakdown
- [ ] Add cancel booking button
- [ ] Add message coach button

---

### 3. Enhanced Messaging

**File:** `clubroom/app/(tabs)/messages.tsx`

**Features:**
- [ ] Add unread message badge on tab icon
- [ ] Add typing indicator simulation
- [ ] Add message timestamps (relative: "2h ago" or absolute: "Mon 3:45 PM")
- [ ] Add attachment support:
  - Image picker
  - Document picker (PDF)
  - Camera integration
- [ ] Add message status indicators (Sent, Delivered, Seen)
- [ ] Add message search
- [ ] Long-press message for actions (Copy, Delete)
- [ ] Pull-to-refresh conversations list
- [ ] Swipe conversation to archive/delete

**Safety Features:**
- [ ] Add "Report" button in conversation
- [ ] Show safety banner for first-time chats
- [ ] Disable messages until booking is confirmed

---

### 4. Profile Screens (All Roles)

**User/Parent Profile:**
`clubroom/app/(tabs)/profile.tsx`

- [ ] Update to show:
  - Profile photo upload
  - Display name & bio
  - Children profiles (for Parents)
  - Session stats (Total sessions, Hours trained, Favorite coaches)
  - Achievement badges (mock data for now)
  - Recent session history
- [ ] Add "Edit Profile" screen
- [ ] Add "Manage Children" screen (Parents only)

**Coach Profile:**
`clubroom/app/(tabs)/profile.tsx`

- [ ] Show coach-specific stats:
  - Total earnings (mock)
  - Total sessions taught
  - Average rating
  - Review count
- [ ] Show availability schedule preview
- [ ] Add "Edit Availability" button → goes to Calendar tab
- [ ] Add certifications section (DBS, FA Level, etc.)
- [ ] Add "Manage Services" section (pricing, session types)

**Admin Profile:**
`clubroom/app/(tabs)/profile.tsx`

- [ ] Show platform stats:
  - Total users
  - Total bookings
  - Revenue (GMV)
  - Active coaches
- [ ] Add quick links to moderation tools
- [ ] Add platform settings

---

### 5. Settings & Preferences

**Create:** `app/settings.tsx`

**Sections:**
- [ ] Account settings
  - Email, phone number
  - Password change
  - Notifications preferences
  - Privacy settings
- [ ] App preferences
  - Dark mode toggle
  - Language (future)
  - Measurement units (miles/km, £/$/€)
- [ ] About
  - App version
  - Terms & Conditions
  - Privacy Policy
  - Help & Support
- [ ] Danger zone
  - Logout
  - Delete account

---

### 6. Onboarding Flow

**Create:** `app/onboarding/` screens

**Steps:**
1. Welcome screen (swipe carousel)
   - "Find the perfect coach"
   - "Book with confidence"
   - "Track your progress"
2. Select role screen (User/Parent, Coach, School)
3. Create account or Login
4. (If Parent) Add children profiles
5. (If Coach) Complete profile setup
6. Permission requests (notifications, location)

**Implementation:**
- [ ] Use AsyncStorage to track if user has seen onboarding
- [ ] Skip onboarding if user is already logged in

---

### 7. Coach Availability (Coach Role)

**File:** `clubroom/app/(tabs)/availability.tsx`

**Enhancements:**
- [ ] Add week view selector (< Mar 18-24 >)
- [ ] Add "Set recurring availability" button
- [ ] Create modal: Set weekly schedule
  - Monday: 9am-5pm ✓
  - Tuesday: 9am-5pm ✓
  - Wednesday: OFF ✗
  - etc.
- [ ] Add "Block dates" feature (holidays, events)
- [ ] Add visual indicators:
  - Green: Available slots
  - Blue: Booked sessions
  - Red: Blocked times
  - Grey: Past times
- [ ] Tap slot to see booking details or block time

---

### 8. Loading States & Animations

**Throughout the app:**
- [ ] Add skeleton loaders for lists (coaches, bookings, messages)
- [ ] Add pull-to-refresh on all scrollable screens
- [ ] Add loading spinners for button actions
- [ ] Add page transitions (fade, slide)
- [ ] Add haptic feedback on important actions
- [ ] Add success/error toast notifications

**Create:** `components/ui/skeleton.tsx`
**Create:** `components/ui/toast.tsx`

---

### 9. Empty States

**Design empty states for:**
- [ ] No coaches found (Discover)
- [ ] No bookings yet (Bookings)
- [ ] No messages (Messages)
- [ ] No reviews yet (Profile)
- [ ] No availability set (Calendar)

**Each should have:**
- Icon or illustration
- Helpful message
- Call-to-action button

---

### 10. Error Handling

**Add throughout app:**
- [ ] Network error screen (no internet)
- [ ] 404 / Not found screens
- [ ] Permission denied screens
- [ ] Graceful error boundaries (catch React errors)

---

## Components to Build

### New Components:
- [ ] `components/coach/filter-panel.tsx` - Filter modal for discovery
- [ ] `components/booking/status-badge.tsx` - Booking status indicator
- [ ] `components/booking/booking-card-enhanced.tsx` - Better booking card
- [ ] `components/chat/attachment-picker.tsx` - Attachment picker modal
- [ ] `components/chat/message-bubble-enhanced.tsx` - Support attachments
- [ ] `components/ui/skeleton.tsx` - Skeleton loading states
- [ ] `components/ui/toast.tsx` - Toast notifications
- [ ] `components/ui/empty-state.tsx` - Empty state component
- [ ] `components/profile/stat-card.tsx` - Profile stats display
- [ ] `components/profile/achievement-badge.tsx` - Achievement badge

---

## Success Criteria

✅ Sprint 1 is complete when:
1. Navigation is properly segmented by role (DONE)
2. Discovery has working filters and search
3. Bookings show proper status management
4. Messages support attachments and better UX
5. All profiles show role-specific information
6. Settings screen is functional
7. Onboarding flow is complete
8. All screens have loading and empty states
9. Error handling is in place
10. App feels polished and professional

---

## Design Tokens & Theme

**Maintain consistency:**
- Use existing `constants/theme.ts` for all colors
- Use `IconSymbol` for all icons
- Use `HapticTab` for tactile feedback
- Follow existing spacing/padding patterns

---

## Testing Checklist

- [ ] Login as each role (User, Parent, Coach, Admin)
- [ ] Verify navigation shows correct tabs per role
- [ ] Filter coaches by various criteria
- [ ] View booking in all states
- [ ] Send message with image attachment
- [ ] Edit profile for each role
- [ ] Complete onboarding flow
- [ ] Test all empty states
- [ ] Test loading states
- [ ] Test error scenarios

---

## Notes

- All data remains hardcoded (no database/backend changes)
- Focus on UI/UX polish and flow
- Prepare structure for future backend integration
- Keep admin features minimal (just UI structure)

---

**Next Sprint Preview:**
Sprint 2 will add real-time features, booking flow completion, payment UI (Stripe Connect prep), and session notes.
