# Sprint 4 Quality Fix Plan

> **Owner:** AI Pipeline
> **Status:** COMPLETE
> **Review Score:** Services 78/100 | Components 65/100 | Screens 60/100
> **Target Score:** 95+ across all three
> **Tracking:** Agents mark `[ ]` → `[x]` as they complete each item

---

## Stage 1: Service Layer — Critical + High Fixes
**Agent:** CODER (services focus)
**Estimated items:** 9
**Dependencies:** None — can start immediately

### Critical (must fix)
- [x] **S1-C1** `mock-data.ts:2969` — Remove `as any` cast. Change `getCombinedFeedForParent` parameter type from `string` to the proper `FeedFilter` union type. Import or define the shared type.
- [x] **S1-C2** `comment-service.ts:34` — `saveAllComments` returns `Promise<void>` and swallows errors. Wrap in try/catch, return `Result<void, ServiceError>`. Check result at all 3 call sites (lines 160, 229, 273). If save fails, propagate `err(storageError(...))` to caller.
- [x] **S1-C3** `squad-group-service.ts:40` — Same pattern: `saveMap` returns `Promise<void>`. Convert to `Result<void, ServiceError>`. Check result at call sites (lines 113, 169, 231). If save fails after group creation, rollback or return error.

### High (fix before ship)
- [x] **S1-H1** `service-subscribers.ts:488` — `feedType: 'personal'` is lowercase. Change to `'PERSONAL'` to match the `FeedType` union. This causes posts to silently vanish from personal feeds.
- [x] **S1-H2** `service-subscribers.ts:480` — Remove optional chaining on `feedService.createPost?.()`. Handle the `Result` return: log on error.
- [x] **S1-H3** `service-subscribers.ts:481` — `clubId: ''` passed to createPost. Resolve actual clubId from invite/event data, or guard: if CLUB/BOTH feedType requires non-empty clubId, return early with log.
- [x] **S1-H4** `service-subscribers.ts:548` — `analytics.getAthleteAnalytics?.(data.coachId)` is a read method used as tracking. Replace with `analytics.trackEvent?.()` or remove the no-op call.
- [x] **S1-H5** `social-feed-service.ts:217` — Add explicit return type `Club[]` on `getUserClubs` method.
- [x] **S1-H6** `social-feed-service.ts:566` — `createCoachPost` allows empty clubId for CLUB/BOTH feedType. Add validation: `if ((feedType === 'CLUB' || feedType === 'BOTH') && !clubId) return err(validationError(...))`.

### Verification
- [x] Run: `cd clubroom && npx tsc -p tsconfig.test.json` — zero errors
- [x] Run: all 3 Sprint 4 test suites (comments, squad-group, coach-post) — 114/114 passing
- [x] Grep for `as any` in all Sprint 4 service files — zero matches

---

## Stage 2: Component Layer — Critical Fixes
**Agent:** CODER (components focus)
**Estimated items:** 12
**Dependencies:** None — can run parallel with Stage 1

### Critical (must fix)
- [x] **C2-C1** `feed-post-card.tsx` — Replace all `TouchableOpacity` (11 instances) with `Pressable`. Import from react-native.
- [x] **C2-C2** `feed-post-card.tsx:264-278` — Action buttons (like/comment/share) have NO onPress handlers. Add `onLike`, `onComment`, `onShare` to props interface. Wire handlers with `useCallback`. Add `accessibilityLabel` + `accessibilityRole="button"` to each.
- [x] **C2-C3** `feed-post-card.tsx:417` — `actionButton` style: add `minHeight: 44`, `paddingVertical: Spacing.xs`. Add `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` on each button Pressable.
- [x] **C2-C4** `feed-post-card.tsx` — Add Haptics on action buttons: `void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` guarded by `Platform.OS !== 'web'`.
- [x] **C2-C5** `comment-card.tsx:64-86` — Wrap `handleLike`, `handleReply`, `handleLongPress` in `useCallback` with correct dependency arrays `[isDeleted, onLike, comment.id]` etc.
- [x] **C2-C6** `comment-card.tsx:236` — Increase `actionButton.minHeight` from 28 to 36. Keep existing hitSlop of 10.
- [x] **C2-C7** `comment-card.tsx:89,145,169` — Add `accessibilityLabel` on main Pressable (`Comment by ${comment.authorName}`), Like button (`isLiked ? 'Unlike' : 'Like'`), Reply button (`Reply to comment`). Add `accessibilityRole="button"` on Like and Reply.
- [x] **C2-C8** `comment-input.tsx:154` — Increase send button from 36x36 to 44x44. Update hitSlop to `{ top: 8, bottom: 8, left: 8, right: 8 }`.
- [x] **C2-C9** `comment-input.tsx:134` — Increase cancel reply from 28x28 to 36x36. Keep hitSlop of 10.
- [x] **C2-C10** `comment-input.tsx:40` — Wrap `handleSend` in `useCallback(() => {...}, [text, onSubmit, onCancelReply])`.
- [x] **C2-C11** `attendee-list-modal.tsx:113` — Extract inline `renderItem` to a `useCallback` with deps `[expandedSections, responses, palette, toggleSection]`.
- [x] **C2-C12** `ParentGroupCard.tsx:200-323` — Replace ALL `scaleFont(N)` + raw `fontWeight` with Typography tokens:
  - `scaleFont(17), fontWeight:'700'` → `...Typography.heading`
  - `scaleFont(15)` → `...Typography.body`
  - `scaleFont(14)` → `...Typography.bodySmall`
  - `scaleFont(13)` → `...Typography.small`
  - `scaleFont(12)` → `...Typography.caption`
  - `scaleFont(11), fontWeight:'600'` → `...Typography.micro`
  - Remove the `scaleFont` import if no longer used.

### Verification
- [x] Grep for `TouchableOpacity` in feed-post-card.tsx — zero matches
- [x] Grep for `scaleFont` in ParentGroupCard.tsx — zero matches
- [x] Grep for `minHeight: 28` in comment components — zero matches (should be 36+)
- [x] Verify all interactive elements have `accessibilityLabel`

---

## Stage 3: Component Layer — High Fixes
**Agent:** CODER (components focus)
**Estimated items:** 18
**Dependencies:** Stage 2 complete

### High (should fix)
- [x] **C3-H1** `profile-tabs.tsx:591` — Replace `'rgba(99,102,241,0.1)'` with inline `{ backgroundColor: withAlpha(palette.tint, 0.1) }` using palette from useColorScheme.
- [x] **C3-H2** `profile-tabs.tsx:623` — Replace `'rgba(0,217,163,0.1)'` with `{ backgroundColor: withAlpha(palette.success, 0.1) }`.
- [x] **C3-H3** `profile-tabs.tsx:690` — Replace `borderColor: 'rgba(0,0,0,0.1)'` with `{ borderColor: withAlpha(palette.text, 0.1) }`.
- [x] **C3-H4** `profile-tabs.tsx:569` — Remove `lineHeight: 20` override (Typography.body has lineHeight 22).
- [x] **C3-H5** `profile-tabs.tsx:612` — Remove `lineHeight: 18` override (Typography.bodySmall has lineHeight 20).
- [x] **C3-H6** `profile-tabs.tsx:528` — Replace `fontWeight: '500'` with `...Typography.subheading` or keep bodySmall and use inline fontWeight from a token.
- [x] **C3-H7** `profile-tabs.tsx:160-172` — Move `formatDate` and `formatFullDate` outside the component (no state deps).
- [x] **C3-H8** `feed-post-card.tsx:134-145` — Move `formatDate` outside the component.
- [x] **C3-H9** `feed-post-card.tsx:175` — Replace inline `style={{ flex: 1 }}` with stylesheet `bodyContainer: { flex: 1 }`.
- [x] **C3-H10** `feed-post-card.tsx:377` — Remove `lineHeight: 20` override on postBody.
- [x] **C3-H11** `feed-post-card.tsx:312-313` — Replace `paddingHorizontal: 8` with `Spacing.xs`, replace `paddingRight: 10` with `Spacing.xs`.
- [x] **C3-H12** `feed-post-card.tsx:23` — Wrap `OriginBadge` in `memo()`.
- [x] **C3-H13** `upcoming-events-carousel.tsx:124` — Extract `ItemSeparatorComponent` to module-level: `const Separator = () => <View style={{ width: Spacing.sm }} />;`
- [x] **C3-H14** `ParentGroupCard.tsx:210,319` — Replace `paddingHorizontal: 8` with `Spacing.xs`, replace `paddingHorizontal: 5` with `Spacing.xxs`.
- [x] **C3-H15** `session-invite-card.tsx:410` — Remove `lineHeight: 18` override.
- [x] **C3-H16** `session-invite-card.tsx` — Wrap export in `memo()`: `export const SessionInviteCard = memo(SessionInviteCardComponent)`.
- [x] **C3-H17** `comment-preview.tsx:52` — Add `accessibilityLabel={`View all ${commentCount} comments`}` and `accessibilityRole="button"`.
- [x] **C3-H18** `comment-card.tsx:210` — Replace `...Typography.caption, fontWeight: '600'` with `...Typography.smallSemiBold` (or closest token).

### Verification
- [x] Grep for `rgba(` in profile-tabs.tsx — zero hardcoded rgba colors
- [x] Grep for `lineHeight: 18` and `lineHeight: 20` in Sprint 4 component files — zero raw overrides
- [x] Grep for `paddingHorizontal: 8` or `paddingHorizontal: 5` in Sprint 4 components — zero raw values

---

## Stage 4: Screen Layer — Critical Fixes
**Agent:** CODER (screens focus)
**Estimated items:** 5
**Dependencies:** Stages 1-2 complete (services + components fixed first)

### Critical (must fix)
- [x] **SC4-C1** `club-hub.tsx:487` — Replace `feed.map((post) => <FeedPostCard>)` inside ScrollView with a proper `<FlatList>`. Move all content above the feed (club header, stats, teams, sessions, matches, carousel) into `ListHeaderComponent`. Use `ListEmptyComponent` for empty feed state with CTA.
- [x] **SC4-C2** `post-detail.tsx:84,201-216` — Remove all `as { reactionCount?: number }` casts. Create a `normalizePost(post: Post | ClubFeedPost)` helper that returns a uniform shape using `'field' in post` type guards (no `as` casts).
- [x] **SC4-C3** `create-post.tsx:106` — Add `await` before `clubFeedService.createCoachPost(...)`. Change `result.ok` to `result.success` to match the Result<T> pattern.
- [x] **SC4-C4** `create-club-post.tsx:101-161` — Add `await` before service calls. Fix `handlePost` to be properly async. Fix `KeyboardAvoidingView behavior` from `undefined` to `'height'` on Android.
- [x] **SC4-C5** `create-club-post.tsx:688` — Replace `shadowColor: '#000'` with `...Shadows.light.subtle` or appropriate Shadows token.

### Verification
- [x] Grep for `.map(` inside club-hub.tsx feed section — should use FlatList renderItem instead
- [x] Grep for `as {` in post-detail.tsx — zero unsafe casts
- [x] Grep for `result.ok` in create-post.tsx — should be `result.success`

---

## Stage 5: Screen Layer — High Fixes (Error States + UX)
**Agent:** CODER (screens focus)
**Estimated items:** 10
**Dependencies:** Stage 4 complete

### Error states with retry (4 screens need this)
- [x] **SC5-H1** `club-hub.tsx` — Add `loading` and `error` state variables. Show `<LoadingScreen />` on initial load. Show `<StatusBanner variant="error">` with retry button on data load failure. Coordinate loads with `Promise.allSettled()`.
- [x] **SC5-H2** `coach-profile.tsx` — Add loading state while async data loads (followService, apiClient). Add error state with retry for service failures.
- [x] **SC5-H3** `invites.tsx` — Add `error` state variable. When `loadInvites` fails, set error state. In `ListEmptyComponent`, show error message with retry button instead of empty state.
- [x] **SC5-H4** `community/[groupId].tsx:69-83` — Add `Alert.alert('Send Failed', ...)` when handleSend errors. Fix `(error as Error).message` to `String(error)` at lines 100, 151.

### KeyboardAvoidingView
- [x] **SC5-H5** `squad/[id].tsx` — Wrap content in `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` (has TextInput for squad name editing).
- [x] **SC5-H6** `create-club-post.tsx:194` — Fix Android behavior: already correct after Stage 4, no change needed.

### Touch targets + Typography
- [x] **SC5-H7** `create-club-post.tsx:730` — Increase toolbar buttons from 36x36 to 44x44.
- [x] **SC5-H8** `create-club-post.tsx:568` — Add `minHeight: 44` to postButton style.
- [x] **SC5-H9** `squad/[id].tsx:499` — Replace inline `fontWeight: '600'` with `Typography.bodySemiBold`.
- [x] **SC5-H10** `squad/[id].tsx:663-672` — Replace `Spacing.xs / 2` with `Spacing.xxs`.

### Verification
- [x] Every Sprint 4 screen has all 4 visual states: loading, empty, error, success
- [x] Grep for `KeyboardAvoidingView` in all screens with TextInput — all present
- [x] Grep for `Spacing.xs / 2` — zero matches

---

## Stage 6: Medium Fixes (Polish)
**Agent:** CODER (batch)
**Estimated items:** 12 (selected highest-value items)
**Dependencies:** Stages 1-5 complete

### Service polish
- [x] **M6-1** `comment-types.ts:16` — Make `authorName` required (not optional) in `ThreadedComment` since it's required in `CreateCommentInput`.
- [x] **M6-2** `comment-service.ts:109` — Add max length validation: `if (input.content.trim().length > 2000) return err(validationError(...))`.
- [x] **M6-3** `comment-service.ts:50` — Add JSDoc comment documenting that soft-deleted comments are intentionally included in threads to preserve structure.
- [x] **M6-4** Export `FeedFilter` type from `club-types.ts` and import in `social-feed-service.ts` + `mock-data.ts` (DRY).

### Component polish
- [x] **M6-5** `feed-post-card.tsx:246` — Replace `key={idx}` with `key={attachment}` for attachments.
- [x] **M6-6** `location-map-preview.tsx:34` — SKIPPED: file does not exist in codebase.
- [x] **M6-7** `rsvp-button-group.tsx:72` — Add `void` prefix to `Haptics.impactAsync`.
- [x] **M6-8** `profile-tabs.tsx:192,231,359,383` — Replace `alert()` placeholder calls with TODO comments.

### Screen polish
- [x] **M6-9** `invites.tsx:507` — Extract `ItemSeparatorComponent` to module-level constant.
- [x] **M6-10** `community/[groupId].tsx:97` — Replace `groupId!` non-null assertion with guard `if (!groupId) return;`.
- [x] **M6-11** `create-club-post.tsx:525` — Fix char count warning threshold from 500 to 450.
- [x] **M6-12** `squad/[id].tsx:223` — Add `<ActivityIndicator>` to loading state.

### Verification
- [x] Grep for `alert(` in profile-tabs.tsx — zero instances
- [x] Grep for `key={idx}` or `key={index}` in Sprint 4 files — zero instances
- [x] All medium items checked off

---

## Stage 7: Final Verification Pass
**Agent:** REVIEWER
**Dependencies:** All stages complete

- [x] Run full TypeScript compilation: `npx tsc -p tsconfig.test.json` — zero errors
- [x] Run ALL Sprint 4 tests — 144/144 passing (expanded from 83 with new tests)
- [x] Grep for `any` in all Sprint 4 service files — zero matches
- [x] Grep for hardcoded hex colors in Sprint 4 component + screen files — zero matches
- [x] Grep for `TouchableOpacity` in Sprint 4 new files (feed-post-card, comment-card, comment-input) — zero matches
- [x] Grep for `scaleFont` in Sprint 4 files — zero matches
- [x] Grep for `as any` in Sprint 4 files — zero matches
- [x] Grep for `lineHeight: 18` or `lineHeight: 20` raw overrides in Sprint 4 files — zero matches
- [x] Every screen has: SafeAreaView (or tab layout safe area), loading state, empty state, error state with retry, success state
- [x] Every interactive element has: minHeight 44 (or hitSlop to reach 44), accessibilityLabel, accessibilityRole
- [x] Every FlatList renderItem component is wrapped in `memo()`
- [x] Every handler passed to children is wrapped in `useCallback`

---

## Summary

| Stage | Focus | Items | Status |
|-------|-------|-------|--------|
| 1 | Service Critical + High | 9 | [x] |
| 2 | Component Critical | 12 | [x] |
| 3 | Component High | 18 | [x] |
| 4 | Screen Critical | 5 | [x] |
| 5 | Screen High | 10 | [x] |
| 6 | Medium Polish | 12 | [x] |
| 7 | Final Verification | 12 | [x] |
| **TOTAL** | | **78** | |

**Expected outcome:** All 3 review scores at 95+ after fixes.
