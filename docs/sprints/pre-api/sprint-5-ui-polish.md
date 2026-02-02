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

## Acceptance Criteria

- [ ] Every screen has loading skeleton, error with retry, and empty with CTA
- [ ] Coach sees onboarding checklist until all 8 items done
- [ ] Parent sees onboarding checklist until all 6 items done
- [ ] Checklists can be dismissed permanently
- [ ] Screen transitions are smooth (no hard cuts)
- [ ] Pull-to-refresh on all list/feed screens
- [ ] Typography, spacing, and colours are consistent across all screens
- [ ] No blank screens or silent failures anywhere in the app

## Files Changed

| File | Action |
|------|--------|
| `components/ui/screen-states.tsx` | CREATE — LoadingState, ErrorState, EmptyState |
| `components/ui/skeleton.tsx` | CREATE — skeleton shimmer primitives |
| `components/coach/onboarding-checklist.tsx` | CREATE |
| `components/parent/onboarding-checklist.tsx` | CREATE |
| `app/(tabs)/index.tsx` | MODIFY — add checklists + state handling |
| `app/(tabs)/bookings.tsx` | MODIFY — add state handling |
| `app/(tabs)/schedule.tsx` | MODIFY — add state handling |
| `app/(tabs)/messages.tsx` | MODIFY — add state handling |
| `app/(tabs)/feed.tsx` | MODIFY — add state handling |
| `app/(tabs)/athletes.tsx` | MODIFY — add state handling |
| All list/detail screens | MODIFY — wrap in loading/error/empty |
| `constants/theme.ts` | CREATE or MODIFY — single source for colors, spacing, typography |
