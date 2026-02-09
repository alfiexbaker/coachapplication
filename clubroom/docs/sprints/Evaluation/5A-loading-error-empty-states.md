# 5A: Loading, Error, Empty States

**Phase**: 1 — Foundation
**Origin**: Sprint 5, Tasks 1, 2
**Estimated scope**: 2 tasks, every screen gets state handling

## Goal

No more blank screens. Every screen handles loading (skeleton shimmer), error (retry button), and empty (contextual CTA) gracefully.

## Tasks

### Task 1: Shared State Components

**File**: `components/ui/screen-states.tsx`

Three reusable components used everywhere:

**LoadingState**:
- Skeleton shimmer loaders that match the layout of the screen
- NOT a centered spinner — actual content-shaped skeletons
- Props: `variant: 'list' | 'card' | 'detail' | 'form' | 'calendar'`

**ErrorState**:
- Descriptive message (not "Error 500")
- Retry button
- Props: `message: string`, `onRetry: () => void`

**EmptyState**:
- Contextual message + illustration/icon
- Call-to-action button
- Props: `icon`, `title`, `message`, `actionLabel`, `onAction`

### Task 2: Audit All Screens

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

**Club/squad screens + Family/child screens**: same pattern applied across all.

## Acceptance Criteria

- [ ] Every screen has loading skeleton, error with retry, and empty with CTA
- [ ] Skeletons match actual content layout (not generic spinners)
- [ ] No blank screens or silent failures anywhere in the app
- [ ] Pull-to-refresh on all list/feed screens

## Files Changed

| File | Action |
|------|--------|
| `components/ui/screen-states.tsx` | CREATE — LoadingState, ErrorState, EmptyState |
| `components/ui/skeleton.tsx` | ENHANCE (59 lines exist) — add list/card/detail/calendar variants |
| All tab screens | MODIFY — wrap in loading/error/empty |
| All list/detail screens | MODIFY — same |

## Dependencies

- **Blocks**: Nothing (improves all screens)
- **Blocked by**: Nothing (can be done in parallel with anything)
