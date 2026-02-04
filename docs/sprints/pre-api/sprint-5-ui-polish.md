# Sprint 5: UI Polish — Loading States, Empty States, Onboarding

## Goal

Every screen handles loading, error, and empty gracefully. New users (coach and parent) get guided onboarding checklists. The app feels polished and production-quality.

## User Stories This Sprint Fixes

| Role | Story | Current State |
|------|-------|---------------|
| **All** | I don't want to see a blank screen while data loads | Many screens have no loading state |
| **All** | If something goes wrong, I want to know what happened | Most screens silently fail |
| **All** | If there's nothing to show, I want to know what to do next | Some screens show blank space |
| **Coach** | When I first sign up, I want to know what to set up | No onboarding checklist |
| **Parent** | When I first sign up, I want to know what to do | No onboarding checklist |
| **Coach** | I want the app to feel fast and responsive | Some transitions are jarring |

## Task 1: Shared State Components

**File**: `components/ui/screen-states.tsx`

Three reusable components used everywhere:

**LoadingState**:
```
┌─────────────────────────────────────┐
│                                     │
│         [Skeleton shimmer]          │
│         [Skeleton shimmer]          │
│         [Skeleton shimmer]          │
│                                     │
└─────────────────────────────────────┘
```
- Skeleton shimmer loaders that match the layout of the screen
- NOT a centered spinner — actual content-shaped skeletons
- Props: `variant: 'list' | 'card' | 'detail' | 'form' | 'calendar'`

**ErrorState**:
```
┌─────────────────────────────────────┐
│                                     │
│         Something went wrong        │
│                                     │
│    [subtle icon]                    │
│    Couldn't load your bookings.     │
│    Check your connection and        │
│    try again.                       │
│                                     │
│         [Retry]                     │
│                                     │
└─────────────────────────────────────┘
```
- Descriptive message (not "Error 500")
- Retry button
- Props: `message: string`, `onRetry: () => void`

**EmptyState**:
```
┌─────────────────────────────────────┐
│                                     │
│         [contextual icon]           │
│                                     │
│    No bookings yet                  │
│    Find a coach and book your       │
│    first session.                   │
│                                     │
│    [Find Coaches]                   │
│                                     │
└─────────────────────────────────────┘
```
- Contextual message + illustration/icon
- Call-to-action button
- Props: `icon`, `title`, `message`, `actionLabel`, `onAction`

## Task 2: Audit All Screens

Apply loading/error/empty to every screen. Priority order:

**Critical path screens** (user sees daily):
| Screen | Loading | Error | Empty |
|--------|---------|-------|-------|
| Home (coach) | Skeleton cards | Retry | "Set up your profile to get started" |
| Home (parent) | Skeleton cards | Retry | "Book your first session" |
| Bookings list | Skeleton rows | Retry | "No bookings yet — find a coach" |
| Schedule (coach) | Skeleton calendar | Retry | "Set your availability to start" |
| Messages | Skeleton threads | Retry | "No conversations yet" |
| Feed | Skeleton posts | Retry | "Follow coaches to see updates" |
| Roster (coach) | Skeleton rows | Retry | "Athletes will appear after bookings" |

**Secondary screens** (coach tools):
| Screen | Loading | Error | Empty |
|--------|---------|-------|-------|
| Analytics | Skeleton charts | Retry | "Complete sessions to see analytics" |
| Badges | Skeleton grid | Retry | "Award your first badge" |
| Drills | Skeleton cards | Retry | "Create your first drill" |
| Videos | Skeleton grid | Retry | "Upload session videos" |

**Club/squad screens**:
| Screen | Loading | Error | Empty |
|--------|---------|-------|-------|
| Club home | Skeleton dashboard | Retry | "Create or join a club" |
| Club feed | Skeleton posts | Retry | "Post the first update" |
| Club calendar | Skeleton calendar | Retry | "No sessions scheduled yet" |
| Squad members | Skeleton rows | Retry | "Invite players to your squad" |
| Matches | Skeleton cards | Retry | "Create your first fixture" |
| Events | Skeleton cards | Retry | "Create your first event" |

**Family/child screens**:
| Screen | Loading | Error | Empty |
|--------|---------|-------|-------|
| Family dashboard | Skeleton overview | Retry | "Add your children to get started" |
| Child progress | Skeleton charts | Retry | "Book sessions to track progress" |
| Child badges | Skeleton grid | Retry | "Badges will appear after sessions" |

## Task 3: Coach Onboarding Checklist

**File**: `components/coach/onboarding-checklist.tsx`

Shows on coach home until all items are done:

```
┌─────────────────────────────────────┐
│ Get ready to coach                  │
│ ████████░░░░░░░░ 4/8 complete      │
│                                     │
│ ✅ Create your account              │
│ ✅ Add a profile photo              │
│ ✅ Write your bio                   │
│ ✅ Add qualifications               │
│ ○  Set your availability     [→]   │
│ ○  Set scheduling rules      [→]   │
│ ○  Set cancellation policy   [→]   │
│ ○  Go live                   [→]   │
│                                     │
│ [Dismiss checklist]                 │
└─────────────────────────────────────┘
```

Each incomplete item links to the relevant screen. Progress bar fills as items complete. "Dismiss" hides it forever (saves to AsyncStorage).

**Items to check**:
1. Account created (always done)
2. Profile photo set (`avatar` is not null)
3. Bio written (`bio` length > 20)
4. Qualifications added (`certifications.length > 0`)
5. Availability set (at least 1 template exists)
6. Scheduling rules configured (bufferMinutes set — from Sprint 3)
7. Cancellation policy set (at least 1 tier — from Sprint 3)
8. Gone live (`isLive === true`)

## Task 4: Parent Onboarding Checklist

**File**: `components/parent/onboarding-checklist.tsx`

```
┌─────────────────────────────────────┐
│ Get started                         │
│ ██████░░░░░░░░░░ 3/6 complete      │
│                                     │
│ ✅ Create your account              │
│ ✅ Add a child                      │
│ ✅ Add emergency contacts           │
│ ○  Add medical info          [→]   │
│ ○  Set consent preferences   [→]   │
│ ○  Book your first session   [→]   │
│                                     │
│ [Dismiss checklist]                 │
└─────────────────────────────────────┘
```

**Items to check**:
1. Account created
2. At least 1 child added
3. Emergency contacts added for each child
4. Medical info reviewed
5. Consent preferences set (photo, video, etc.)
6. First booking made

## Task 5: Smooth Transitions

**Files**: Various screen files

- Add `entering`/`exiting` animations for screen transitions (Reanimated or native)
- Tab switches should cross-fade, not hard-cut
- Bottom sheets should spring open with gesture support
- Lists should animate items in (stagger fade)
- Pull-to-refresh on all list screens

**Keep it subtle** — no dramatic animations, just smooth and responsive.

## Task 6: Consistent Typography & Spacing

Audit and fix:
- All headers use consistent sizes (H1=28, H2=22, H3=18, body=16, caption=13)
- Consistent padding (screen=16, card=12, between-cards=12)
- Consistent border radius (cards=12, buttons=8, avatars=round)
- Consistent shadow (cards only, subtle)
- Colour palette applied consistently (no random hex values)

## Task 7: Safety & Reporting System

**File**: `components/safety/report-flow.tsx` + `app/report.tsx`

Report from: coach profile, message thread, review. Types: inappropriate, safety_concern, fake_profile, spam, other. Confidential — reported user NOT notified. Admin review queue. Block user option after reporting.

**Block User**: prevents messaging, invites, discovery visibility. Reversible from settings.

## Task 8: Accessibility Audit

All components — add:
- `accessibilityLabel` on all touchables
- `accessibilityRole` on buttons, links, images, headers
- Minimum touch targets: 44x44pt
- Colour contrast: WCAG AA (4.5:1 text, 3:1 large)
- Dynamic text size (`allowFontScaling`)
- `reduceMotion` check — disable animations when system setting on
- Screen reader navigation order

## Task 9: Settings Completeness

**File**: `app/settings/index.tsx` — EXPAND

Add missing settings:
- **Notification Preferences**: per-type toggles (bookings, invites, reminders, reviews, messages, badges, milestones)
- **Privacy**: profile visibility (public/registered-only), search visibility toggle
- **Data & Privacy**: download my data (JSON/ZIP), delete account (30-day grace → hard delete). GDPR requirement.
- **Preferences**: distance unit (miles/km), language
- **About**: terms of service, privacy policy, help, app version
- **Delete Account**: confirmation → soft-delete → 30-day grace → permanent. Required for app store compliance.

## Task 10: "Seen" Indicators (Action→Reaction)

Parents never know if the coach actually read their message, saw their RSVP, or reviewed their booking request. Add subtle "seen" indicators:

- **Messages**: ✓ sent, ✓✓ delivered, blue ✓✓ read (WhatsApp pattern)
- **Session invites**: After parent responds, show "Coach viewed your response" timestamp
- **RSVP**: After parent RSVPs, show "Coach has seen your response" or "3 parents responded" count
- **Booking requests** (manual confirm): Show "Coach will review" → "Coach viewed" → "Confirmed/Declined"
- **Goals**: After coach sets a goal, parent sees "New goal from Coach Marcus" → tapping marks as acknowledged

These are SMALL UI additions but they make the parent feel heard. Nobody likes shouting into a void.

```typescript
// Simple seen tracking — works locally, server-synced later
interface SeenStatus {
  entityType: 'message' | 'invite_response' | 'rsvp' | 'booking_request' | 'goal';
  entityId: string;
  seenBy: string;  // userId
  seenAt: string;
}
```

## Acceptance Criteria

- [ ] Every screen has loading skeleton, error with retry, and empty with CTA
- [ ] Coach sees onboarding checklist until all 8 items done
- [ ] Parent sees onboarding checklist until all 6 items done
- [ ] Checklists can be dismissed permanently
- [ ] Screen transitions are smooth (no hard cuts)
- [ ] Pull-to-refresh on all list/feed screens
- [ ] Typography, spacing, and colours are consistent across all screens
- [ ] No blank screens or silent failures anywhere in the app
- [ ] Report button accessible on coach profiles, messages, reviews
- [ ] Block user prevents messaging, invites, discovery
- [ ] All touchables have accessibility labels, 44x44pt min targets
- [ ] Dynamic text size and reduce motion supported
- [ ] Settings: notification prefs, privacy, delete account, data export
- [ ] Terms of service and privacy policy screens exist
- [ ] Messages show sent/delivered/read indicators
- [ ] Invite responses show "Coach viewed" status
- [ ] RSVP shows "Coach has seen" after response
- [ ] Booking requests show review status progression
- [ ] Goals show parent acknowledged status

### Action→Reaction: Family Service Gaps (from code audit)

| Service Function | Actor | Notify Who | Message |
|-----------------|-------|-----------|---------|
| `family-service.inviteGuardian` | Primary parent | Invited guardian | "You've been invited to join [name]'s family account" |
| `family-service.acceptInvite` | Guardian | Primary parent | "[Guardian] accepted your family invite" |
| `family-service.removeGuardian` | Primary parent | Removed guardian | "You've been removed from [name]'s family account" |
| `family-service.updatePermissions` | Primary parent | Guardian | "Your family permissions were updated" |

## Files Changed

| File | Action |
|------|--------|
| `components/ui/screen-states.tsx` | CREATE — LoadingState, ErrorState, EmptyState |
| `components/ui/skeleton.tsx` | ENHANCE (59 lines exist) — add list/card/detail/calendar variants |
| `components/coach/onboarding-checklist.tsx` | CREATE |
| `components/parent/onboarding-checklist.tsx` | CREATE |
| `components/safety/report-flow.tsx` | CREATE |
| `components/safety/block-user.tsx` | CREATE |
| `app/report.tsx` | CREATE |
| `app/settings/index.tsx` | ENHANCE (331 lines exist) — expand with all sections |
| `app/settings/notifications/preferences.tsx` | ENHANCE (334 lines exist) — add per-type toggles |
| `app/settings/privacy.tsx` | ENHANCE (242 lines exist) — add visibility, data export, delete account |
| `app/settings/terms.tsx` | CREATE |
| `app/settings/privacy-policy.tsx` | CREATE |
| `app/family/sharing.tsx` | VERIFY (726 lines exist!) — family account sharing may already work |
| `app/(tabs)/edit-profile.tsx` | AUDIT (1393 lines) — accessibility pass needed |
| `app/(tabs)/index.tsx` | MODIFY — add checklists + state handling |
| `app/(tabs)/bookings.tsx` | MODIFY — add state handling |
| `app/(tabs)/schedule.tsx` | MODIFY — add state handling |
| `app/(tabs)/messages.tsx` | MODIFY — add state handling |
| `app/(tabs)/feed.tsx` | MODIFY — add state handling |
| `app/(tabs)/athletes.tsx` | MODIFY — add state handling |
| All list/detail screens | MODIFY — wrap in loading/error/empty + accessibility |
| `constants/theme.ts` | CREATE or MODIFY — single source for colors, spacing, typography |
| `services/report-service.ts` | CREATE |
| `services/block-service.ts` | CREATE |
