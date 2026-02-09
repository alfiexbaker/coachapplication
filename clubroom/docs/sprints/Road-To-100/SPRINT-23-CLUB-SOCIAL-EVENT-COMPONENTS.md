# Sprint 23: Club, Community, Social, Event, Badges Component Decomposition

> **Phase:** 3 (Component Decomposition)
> **Sprint:** 23 of 28
> **Scope:** 22 components >250 lines across club, community, social, event, badges directories
> **Goal:** Every file <250 lines with proper memoization, accessibility, theme tokens, and touch targets.

---

## Pre-Read (MANDATORY)

Before starting ANY work, read these files:

1. `/Users/tubton/Desktop/coachapplication/CLAUDE.md` -- Architecture rules 1-17
2. `/Users/tubton/Desktop/coachapplication/clubroom/constants/theme.ts` -- Design tokens
3. `/Users/tubton/Desktop/coachapplication/clubroom/hooks/useTheme.ts` -- `const { colors, scheme } = useTheme()`
4. `/Users/tubton/Desktop/coachapplication/clubroom/components/primitives/index.ts` -- Row, Column, Center, Spacer, SurfaceCard
5. `/Users/tubton/Desktop/coachapplication/clubroom/constants/club-types.ts` -- Club, Squad type definitions
6. `/Users/tubton/Desktop/coachapplication/clubroom/constants/social-types.ts` -- Post, Feed type definitions
7. `/Users/tubton/Desktop/coachapplication/clubroom/constants/event-types.ts` -- Event type definitions

---

## Files to Decompose (22 files, ordered by size descending)

| # | File | Lines | Directory |
|---|------|-------|-----------|
| 1 | `components/badges/badge-award-modal.tsx` | 561 | badges |
| 2 | `components/club/bulk-message.tsx` | 491 | club |
| 3 | `components/social/feed-post-card.tsx` | 479 | social |
| 4 | `components/club/ClubHeader.tsx` | 463 | club |
| 5 | `components/community/CreateGroupForm.tsx` | 439 | community |
| 6 | `components/event/rsvp-buttons.tsx` | 433 | event |
| 7 | `components/club/branding-editor.tsx` | 434 | club |
| 8 | `components/community/CarpoolOfferCard.tsx` | 400 | community |
| 9 | `components/badges/badge-grid.tsx` | 385 | badges |
| 10 | `components/event/AttendeeList.tsx` | 385 | event |
| 11 | `components/event/AttendeeCard.tsx` | 373 | event |
| 12 | `components/badges/badge-card.tsx` | 371 | badges |
| 13 | `components/event/CheckInButton.tsx` | 341 | event |
| 14 | `components/event/event-card.tsx` | 330 | event |
| 15 | `components/club/welcome-flow.tsx` | 327 | club |
| 16 | `components/community/group-chat-section.tsx` | 326 | community |
| 17 | `components/club/group-chat.tsx` | 319 | club |
| 18 | `components/social/feed-filters.tsx` | 319 | social |
| 19 | `components/community/ParentGroupCard.tsx` | 317 | community |
| 20 | `components/event/RSVPButton.tsx` | 317 | event |
| 21 | `components/community/group-members-modal.tsx` | 266 | community |
| 22 | `components/club/SessionsPanel.tsx` | 270 | club |

---

## Step-by-Step Instructions

### Step 0: Verify Current State

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# Confirm line counts
for dir in club community social event badges; do
  echo "=== $dir ==="
  wc -l components/$dir/*.tsx 2>/dev/null | sort -rn | head -8
done

# List existing files
for dir in club community social event badges; do
  echo "=== $dir ==="
  ls components/$dir/ 2>/dev/null
done
```

### Step 1: Decompose by Component Type

#### Club Components

**ClubHeader.tsx (463 lines):**
```
ClubHeader.tsx (<250, orchestrator)
club-header-banner.tsx (cover image + club logo overlay)
club-header-stats.tsx (member count, session count, rating)
club-header-actions.tsx (join, message, share buttons)
```

**bulk-message.tsx (491 lines):**
```
bulk-message.tsx (<250, orchestrator)
bulk-message-recipient-picker.tsx (squad/group selector)
bulk-message-composer.tsx (message input + preview)
bulk-message-confirm.tsx (review recipients + send)
```

**branding-editor.tsx (434 lines):**
```
branding-editor.tsx (<250, orchestrator)
branding-color-picker.tsx (primary/secondary color selection)
branding-logo-upload.tsx (logo image picker + preview)
branding-preview.tsx (live preview of branding changes)
```

**welcome-flow.tsx (327 lines):**
```
welcome-flow.tsx (<250, step orchestrator)
welcome-flow-intro.tsx (welcome message)
welcome-flow-setup.tsx (initial config)
```

**group-chat.tsx (319 lines) and SessionsPanel.tsx (270 lines):**
These are borderline. Extract if there are clear sub-sections. Otherwise, optimize in place (fix theme tokens, memoization, accessibility).

#### Social Components

**feed-post-card.tsx (479 lines):**
This is a FlatList item -- MUST be `memo()`.

```
feed-post-card.tsx (<250, memo wrapper, orchestrator)
feed-post-header.tsx (avatar, name, timestamp, more menu)
feed-post-content.tsx (text, images, video embed)
feed-post-actions.tsx (like, comment, share buttons)
feed-post-stats.tsx (like count, comment count)
```

**feed-filters.tsx (319 lines):**
```
feed-filters.tsx (<250, orchestrator)
feed-filter-chip-list.tsx (horizontal scrolling chip list)
feed-filter-sort-menu.tsx (sort dropdown)
```

#### Event Components

**rsvp-buttons.tsx (433 lines):**
```
rsvp-buttons.tsx (<250, orchestrator with RSVP state)
rsvp-going-button.tsx (going button with count)
rsvp-maybe-button.tsx (maybe button)
rsvp-decline-button.tsx (can't go button)
```

**AttendeeList.tsx (385 lines):**
```
AttendeeList.tsx (<250, FlatList orchestrator)
attendee-list-item.tsx (memo, individual attendee row)
attendee-list-header.tsx (count + filter)
```

**AttendeeCard.tsx (373 lines):**
```
AttendeeCard.tsx (<250, memo wrapper)
attendee-card-info.tsx (avatar, name, role)
attendee-card-status.tsx (RSVP status badge + check-in)
```

**event-card.tsx (330 lines):**
This is likely a FlatList item -- MUST be `memo()`.
```
event-card.tsx (<250, memo wrapper)
event-card-header.tsx (date badge, title, cover image)
event-card-details.tsx (time, location, attendee count)
```

**CheckInButton.tsx (341 lines):**
```
CheckInButton.tsx (<250, orchestrator)
check-in-confirmation.tsx (confirmation modal/sheet)
```

**RSVPButton.tsx (317 lines):**
Extract the different states (loading, selected, unselected) into cleaner conditional rendering. May not need sub-files if cleanup brings it under 250.

#### Badge Components

**badge-award-modal.tsx (561 lines):**
```
badge-award-modal.tsx (<250, modal orchestrator)
badge-award-animation.tsx (celebration animation/confetti)
badge-award-details.tsx (badge info, earned date, criteria)
badge-award-share.tsx (share badge button + preview)
```

**badge-grid.tsx (385 lines):**
```
badge-grid.tsx (<250, grid orchestrator)
badge-grid-item.tsx (memo, individual badge cell)
badge-grid-category-header.tsx (category section header)
```

**badge-card.tsx (371 lines):**
```
badge-card.tsx (<250, memo wrapper)
badge-card-icon.tsx (badge icon with earned/locked styling)
badge-card-progress.tsx (progress toward earning)
```

#### Community Components

**CreateGroupForm.tsx (439 lines):**
```
CreateGroupForm.tsx (<250, form orchestrator)
create-group-info-section.tsx (name, description, type)
create-group-members-section.tsx (member search + add)
create-group-settings-section.tsx (privacy, rules)
```

**CarpoolOfferCard.tsx (400 lines):**
```
CarpoolOfferCard.tsx (<250, memo wrapper)
carpool-offer-route.tsx (origin, destination, map preview)
carpool-offer-details.tsx (seats, time, recurring)
carpool-offer-actions.tsx (request seat, message driver)
```

**group-chat-section.tsx (326 lines) and ParentGroupCard.tsx (317 lines) and group-members-modal.tsx (266 lines):**
These are borderline. Read the files -- if they have clear sub-sections over 100 lines each, extract. Otherwise optimize in place.

### Step 2: Social Feed Cards -- Special Attention

`feed-post-card.tsx` is one of the most performance-critical components since it renders in a FlatList (potentially hundreds of items). It MUST:

1. Be wrapped in `memo()` with proper comparison
2. Have ALL handlers in `useCallback`
3. Have NO inline style objects
4. Have sub-components also wrapped in `memo()` if they receive changing props
5. Use `SurfaceCard` from `@/components/primitives` for the card wrapper (built-in press animation + haptics)

```tsx
const FeedPostCardInner = ({ post, onLike, onComment, onShare }: FeedPostCardProps) => {
  const { colors, scheme } = useTheme();

  const handleLike = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLike(post.id);
  }, [post.id, onLike]);

  return (
    <SurfaceCard style={styles.card}>
      <FeedPostHeader author={post.author} timestamp={post.createdAt} />
      <FeedPostContent text={post.text} images={post.images} />
      <FeedPostActions
        liked={post.isLiked}
        likeCount={post.likeCount}
        commentCount={post.commentCount}
        onLike={handleLike}
        onComment={onComment}
        onShare={onShare}
      />
    </SurfaceCard>
  );
};

export const FeedPostCard = memo(FeedPostCardInner);
```

### Step 3: Update Index Files

Verify these index files after extraction:
- `components/club/index.ts`
- `components/community/index.ts`
- `components/social/index.ts`
- `components/event/index.ts`
- `components/badges/index.ts`

### Step 4: Compile & Verify

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom
npx tsc --noEmit

for dir in club community social event badges; do
  echo "=== $dir ==="
  wc -l components/$dir/*.tsx 2>/dev/null | awk '$1 > 250 && !/total/'
done

npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
```

---

## Quality Checklist (verify EVERY extracted component)

- [ ] File is <250 lines
- [ ] Uses `const { colors, scheme } = useTheme()` (NOT `Colors.light.*`)
- [ ] All spacing uses `Spacing.*` tokens
- [ ] All typography uses `Typography.*` tokens
- [ ] All border radius uses `Radii.*` tokens
- [ ] All shadows use `Shadows[scheme].card` or `Shadows[scheme].subtle`
- [ ] All transparency uses `withAlpha(color, opacity)`
- [ ] No hardcoded hex colors
- [ ] `memo()` on every FlatList renderItem component (especially feed-post-card, badge-grid-item, attendee-list-item, event-card)
- [ ] `useCallback` on every handler passed as prop
- [ ] No inline objects/arrays in JSX
- [ ] `accessibilityLabel` on every interactive element
- [ ] `accessibilityRole="button"` on Pressables
- [ ] `minHeight: 44` or hitSlop on touch targets
- [ ] Layout uses `Row`/`Column` primitives
- [ ] No `TouchableOpacity`
- [ ] No `any` types
- [ ] Haptics on interactive elements (guarded by `Platform.OS !== 'web'`)
- [ ] SurfaceCard used for interactive cards in feed/list contexts

---

## Verification Commands

```bash
cd /Users/tubton/Desktop/coachapplication/clubroom

# 1. All files <250 lines
for dir in club community social event badges; do
  wc -l components/$dir/*.tsx 2>/dev/null | awk '$1 > 250 && !/total/'
done

# 2. Quality checks
grep -rn 'Colors\.light' components/club/ components/community/ components/social/ components/event/ components/badges/ 2>/dev/null | head -10
grep -rn 'TouchableOpacity' components/club/ components/social/ components/event/ 2>/dev/null | head -10

# 3. TypeScript
npx tsc --noEmit

# 4. Tests
npx tsc -p tsconfig.test.json && node --require ./scripts/test-register.js --test '.tmp-tests/**/*.test.js'
```

---

## Parallel Agent Strategy

- **Agent A**: Club (files 2, 4, 7, 15, 17, 22) -- all club components
- **Agent B**: Social + Community (files 3, 5, 8, 16, 18, 19, 21) -- social + community
- **Agent C**: Event + Badges (files 1, 6, 9, 10, 11, 12, 13, 14, 20) -- event + badges

---

## Estimated Output

- **Input:** 22 files totaling ~8,200 lines
- **Output:** ~55-70 files totaling ~8,200 lines
- **Every file <250 lines**
- **Duration:** ~2-3 hours for experienced agent
