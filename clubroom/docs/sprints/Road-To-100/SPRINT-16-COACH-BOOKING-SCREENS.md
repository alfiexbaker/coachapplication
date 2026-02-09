# Sprint 16: Coach, Booking, Matches, & Modal Screens

> **Phase:** 2 — Screen Decomposition
> **Target:** 18 screens decomposed to <250 lines each
> **Quality Bar:** Booking and coach flows are revenue-critical. Every step must feel trustworthy and polished.
> **Estimated Effort:** 6-8 hours

---

## Pre-Flight Checklist

Before writing ANY code:

1. **Read `CLAUDE.md`** — memorize architecture rules
2. **Read `hooks/use-screen.ts`** — `useScreen()` API
3. **Read `components/ui/screen-states.tsx`** — `LoadingState`, `ErrorState`, `EmptyState`
4. **Read `components/primitives/index.ts`** — `Row`, `Column`, `Center`, `Spacer`, `SurfaceCard`
5. **Read `services/booking/booking-crud-service.ts`** — booking data model, CRUD methods
6. **Read `services/match-service.ts`** — match data model
7. **Read `constants/session-types.ts`** — Session, Booking, Match type definitions
8. **Read `constants/app-types.ts`** — User, CoachProfile type definitions
9. **Read Sprint 13-15 patterns** — reuse established decomposition approaches

---

## Target Files (18 screens)

### Coach & Booking Screens (8)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 1 | `app/booking/[id]/cancel.tsx` | 1068 | Form/Wizard | form | `components/booking/` |
| 2 | `app/coach/[coachId]/public.tsx` | 943 | Detail | detail | `components/coach/` |
| 3 | `app/coach/[id].tsx` | 841 | Detail | detail | `components/coach/` |
| 4 | `app/confirm-booking.tsx` | 600 | Form | form | `components/booking/` |
| 5 | `app/bookings/[id]/negotiate.tsx` | 543 | Form | form | `components/booking/` |
| 6 | `app/rate-coach.tsx` | 490 | Form | form | `components/coach/` |
| 7 | `app/book-coach.tsx` | 426 | Form | form | `components/booking/` |
| 8 | `app/bookings/subscribe.tsx` | 335 | Form | form | `components/booking/` |
| 9 | `app/bookings/[id]/counter.tsx` | 315 | Form | form | `components/booking/` |

### Match Screens (3)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 10 | `app/matches/create.tsx` | 795 | Form | form | `components/match/` |
| 11 | `app/matches/[id].tsx` | 659 | Detail | detail | `components/match/` |
| 12 | `app/matches/index.tsx` | 329 | List | list | `components/match/` |

### Modal Screens (5)

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 13 | `app/(modal)/create-club-post.tsx` | 778 | Form (Modal) | form | `components/social/` |
| 14 | `app/(modal)/create-post.tsx` | 591 | Form (Modal) | form | `components/social/` |
| 15 | `app/(modal)/post-detail.tsx` | 535 | Detail (Modal) | detail | `components/social/` |
| 16 | `app/(modal)/add-child.tsx` | 514 | Form (Modal) | form | `components/family/` |
| 17 | `app/(modal)/create-squad.tsx` | 422 | Form (Modal) | form | `components/club/` |

### Other

| # | File | Lines | Archetype | LoadingState Variant | Sub-component Dir |
|---|------|-------|-----------|---------------------|------------------|
| 18 | `app/coach-invites.tsx` | 447 | List | list | `components/coach/` |

---

## Decomposition Instructions Per Screen

### Screen 1: `app/booking/[id]/cancel.tsx` (1068 lines) — Booking Cancellation

**Archetype:** Multi-step form (reason selection -> policy display -> confirmation -> result)

This is the LARGEST file in this sprint. It likely contains:
- Cancellation reason selection (radio buttons or list)
- Cancellation policy display (refund %, deadlines)
- Confirmation step with summary
- Success/failure result screen

**Decomposition plan:**

1. **Read the entire file.** Map all steps and their state.

2. **Create a custom hook** `hooks/use-cancel-booking.ts`:
   - Booking data loading (fetch by ID)
   - Cancellation policy computation (refund amount based on time until session)
   - Reason state, step state
   - Cancel handler (calls bookingService.cancel)
   - Return: `{ booking, step, reason, policy, loading, error, handlers }`

3. **Create sub-components** in `components/booking/`:
   - `components/booking/cancel-reason-step.tsx` — Reason selection list (radio-style SurfaceCards)
   - `components/booking/cancel-policy-display.tsx` — Refund policy card (amount, deadline, terms)
   - `components/booking/cancel-confirm-step.tsx` — Summary of what will happen + confirm button
   - `components/booking/cancel-result.tsx` — Success/failure screen with next actions

4. **Screen file:**
   - Custom hook for multi-step state
   - 4 state branches (loading/error for initial booking fetch)
   - Switch on step to render correct step component
   - <250 lines

**Special requirements:**
- Destructive action — confirm button should use `destructive` styling (red tint)
- `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)` on cancel confirm
- accessibilityLabel on every reason option and confirm button

---

### Screen 2: `app/coach/[coachId]/public.tsx` (943 lines) — Public Coach Profile

**Archetype:** Detail screen (public-facing, may work without login)

**Decomposition plan:**

1. **Read the file.** Identify: hero header (photo, name, rating, sport), bio section, session offerings, reviews, location, credentials, CTA (book now).

2. **Use `useScreen()`** to load coach profile data.

3. **Create sub-components** in `components/coach/`:
   - `components/coach/public-hero-header.tsx` — Large photo, name, rating stars, sport badges, location
   - `components/coach/public-bio-section.tsx` — About me text, qualifications, experience
   - `components/coach/public-offerings.tsx` — Session types with prices (SurfaceCard per offering)
   - `components/coach/public-reviews-section.tsx` — Recent reviews with star ratings
   - `components/coach/public-credentials.tsx` — DBS check, qualifications, insurance
   - `components/coach/public-book-cta.tsx` — Sticky bottom "Book Now" button

4. **Screen file:** `useScreen()` + 4 state branches + ScrollView. Sticky CTA at bottom. <250 lines.

---

### Screen 3: `app/coach/[id].tsx` (841 lines) — Coach Detail (Authenticated)

Similar to public profile but with more actions (follow, message, view schedule).

**Decomposition plan:**

1. **Reuse sub-components** from Screen 2 where possible.
2. **Create additional:**
   - `components/coach/coach-action-row.tsx` — Follow, Message, Share buttons
   - `components/coach/coach-availability-preview.tsx` — Next available slots
   - `components/coach/coach-stats-section.tsx` — Sessions completed, rating, experience
3. **Screen file:** `useScreen()` + 4 states. <250 lines.

---

### Screen 4: `app/confirm-booking.tsx` (600 lines) — Confirm Booking

**Archetype:** Form/confirmation screen (review booking details -> confirm -> payment selection)

**Decomposition plan:**

1. **Create sub-components** in `components/booking/`:
   - `components/booking/confirm-session-card.tsx` — Session details summary (date, time, coach, location)
   - `components/booking/confirm-price-breakdown.tsx` — Price, fees, total
   - `components/booking/confirm-payment-method.tsx` — Payment method selector
   - `components/booking/confirm-policy-note.tsx` — Cancellation policy reminder
   - `components/booking/confirm-submit-bar.tsx` — "Confirm Booking" button (sticky bottom)

2. **Screen file:** `useScreen()` to load booking draft data. ScrollView. <250 lines.

---

### Screen 5: `app/bookings/[id]/negotiate.tsx` (543 lines) — Negotiate Booking

**Archetype:** Form (propose alternative time/price)

**Decomposition plan:**

1. **Create sub-components** in `components/booking/`:
   - `components/booking/negotiate-current-card.tsx` — Current booking terms display
   - `components/booking/negotiate-proposal-form.tsx` — Alternative date/time/price inputs
   - `components/booking/negotiate-message-input.tsx` — Optional message to coach/parent
   - `components/booking/negotiate-submit-bar.tsx` — Submit proposal button

2. **Screen file:** KeyboardAvoidingView + ScrollView. `useScreen()` to load booking. <250 lines.

---

### Screen 6: `app/rate-coach.tsx` (490 lines) — Rate Coach

**Archetype:** Form (star rating + text review)

**Decomposition plan:**

1. **Create sub-components** in `components/coach/`:
   - `components/coach/rate-star-selector.tsx` — 5-star tap rating with animation
   - `components/coach/rate-session-summary.tsx` — Which session is being rated
   - `components/coach/rate-text-review.tsx` — Optional text review TextInput
   - `components/coach/rate-tags.tsx` — Quick feedback tags (Professional, Punctual, Fun, etc.)
   - `components/coach/rate-submit-bar.tsx` — Submit review button

2. **Screen file:** KeyboardAvoidingView. `useScreen()` to load session details. <250 lines.

**Special requirements:**
- Star selector MUST have haptic feedback on each star tap (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`)
- Stars must be 44px minimum touch target
- `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` on submit

---

### Screen 7: `app/book-coach.tsx` (426 lines) — Book Coach Flow

**Decomposition plan:**

1. **Create sub-components** in `components/booking/`:
   - `components/booking/book-coach-header.tsx` — Coach preview (avatar, name, sport)
   - `components/booking/book-slot-selector.tsx` — Available time slot grid/list
   - `components/booking/book-session-type.tsx` — Session type selection (1-on-1, group, etc.)
   - `components/booking/book-cta-bar.tsx` — "Continue to confirm" button

2. **Screen file:** `useScreen()` to load coach availability. <250 lines.

---

### Screens 8-9: `bookings/subscribe.tsx` (335) and `bookings/[id]/counter.tsx` (315)

Both are close to target. Likely need:
1. Extract 1-2 sub-components each
2. Add `useScreen()` + 4 state branches if missing
3. Target: <250 lines

---

### Screen 10: `app/matches/create.tsx` (795 lines) — Create Match

**Archetype:** Form (multi-section: teams, date/time, location, rules)

**Decomposition plan:**

1. **Create a custom hook** `hooks/use-create-match.ts` — form state, validation, submit handler.

2. **Create sub-components** in `components/match/`:
   - `components/match/create-match-teams.tsx` — Team A vs Team B selection (squad picker)
   - `components/match/create-match-schedule.tsx` — Date, time, duration inputs
   - `components/match/create-match-location.tsx` — Venue/location input
   - `components/match/create-match-details.tsx` — Rules, format, notes
   - `components/match/create-match-submit.tsx` — Submit button

3. **Screen file:** KeyboardAvoidingView + ScrollView. <250 lines.

---

### Screen 11: `app/matches/[id].tsx` (659 lines) — Match Detail

**Decomposition plan:**

1. **Create sub-components** in `components/match/`:
   - `components/match/match-header.tsx` — Team A vs Team B with score (if played)
   - `components/match/match-info-card.tsx` — Date, time, location, format
   - `components/match/match-lineup.tsx` — Player lineups per team
   - `components/match/match-action-bar.tsx` — RSVP, Edit, Cancel buttons

2. **Screen file:** `useScreen()` + 4 states. ScrollView. <250 lines.

---

### Screen 12: `app/matches/index.tsx` (329 lines) — Match List

Close to target.
1. Extract `components/match/match-list-card.tsx` (memo!)
2. Add `useScreen()` + 4 states if missing
3. FlatList + pull-to-refresh. <250 lines.

---

### Screens 13-14: Modal Create Post Screens

**Screen 13: `app/(modal)/create-club-post.tsx` (778 lines)**

**Decomposition plan:**

1. **Create sub-components** in `components/social/`:
   - `components/social/post-text-editor.tsx` — Text content input with character count
   - `components/social/post-media-picker.tsx` — Image/video attachment picker
   - `components/social/post-club-selector.tsx` — Club/group selector (which club to post to)
   - `components/social/post-submit-header.tsx` — Header with Cancel + Post buttons

2. **Screen file:** KeyboardAvoidingView. Custom hook for post state. <250 lines.

**Screen 14: `app/(modal)/create-post.tsx` (591 lines)**

Same pattern as Screen 13 but for personal feed posts (no club selector).
- Reuse `components/social/post-text-editor.tsx` and `post-media-picker.tsx`
- Add `components/social/post-visibility-picker.tsx` — Public/followers-only/private

---

### Screen 15: `app/(modal)/post-detail.tsx` (535 lines) — Post Detail

**Decomposition plan:**

1. **Create sub-components** in `components/social/`:
   - `components/social/post-detail-header.tsx` — Author avatar, name, timestamp
   - `components/social/post-detail-content.tsx` — Post text + media
   - `components/social/post-detail-actions.tsx` — Like, Comment, Share buttons
   - `components/social/post-comment-list.tsx` — FlatList of comments (memo renderItem!)
   - Reuse `components/social/comment-card.tsx` (may already exist)
   - Reuse `components/social/comment-input.tsx` (may already exist)

2. **Screen file:** `useScreen()` + 4 states. KeyboardAvoidingView (comment input). <250 lines.

---

### Screen 16: `app/(modal)/add-child.tsx` (514 lines) — Add Child Form

**Decomposition plan:**

1. **Create sub-components** in `components/family/`:
   - `components/family/add-child-info.tsx` — Name, date of birth, gender
   - `components/family/add-child-sports.tsx` — Sport selection chips
   - `components/family/add-child-medical.tsx` — Allergies, medical notes (optional)
   - `components/family/add-child-submit.tsx` — Submit button

2. **Screen file:** KeyboardAvoidingView + ScrollView. <250 lines.

---

### Screen 17: `app/(modal)/create-squad.tsx` (422 lines) — Create Squad (Modal)

Similar to `club/squad/create.tsx` but presented as modal.
- Reuse components from Sprint 15 (`components/club/create-squad-form.tsx`, etc.)
- <250 lines.

---

### Screen 18: `app/coach-invites.tsx` (447 lines) — Coach Invites List

**Archetype:** List

**Decomposition plan:**

1. **Create sub-components** in `components/coach/`:
   - `components/coach/coach-invite-card.tsx` — Invite card (memo! SurfaceCard!)
   - `components/coach/coach-invite-filter.tsx` — Filter/tab bar (Pending/Accepted/All)

2. **Screen file:** `useScreen()` + FlatList + pull-to-refresh. <250 lines.

---

## Modal Screen Special Rules

Modal screens (`app/(modal)/*.tsx`) have different requirements from regular screens:

1. **No tab bar.** These are presented modally over the current screen.
2. **SafeAreaView edges:** Use `edges={['top', 'bottom']}` since there's no tab bar.
3. **Header:** Use a custom header with Cancel (left) and Submit/Post (right) buttons.
4. **Dismiss:** Cancel button calls `router.back()` or `router.dismiss()`.
5. **Presentation:** Modal presentation is configured in the `_layout.tsx` — do NOT change it.
6. **Keyboard:** ALWAYS wrap in KeyboardAvoidingView since most modals have text inputs.

---

## Execution Order

1. `booking/[id]/cancel.tsx` (1068) — Largest. Sets cancellation wizard pattern.
2. `coach/[coachId]/public.tsx` (943) — Sets public profile pattern.
3. `coach/[id].tsx` (841) — Reuses coach components.
4. `matches/create.tsx` (795) — Sets match form pattern.
5. `(modal)/create-club-post.tsx` (778) — Sets modal post pattern.
6. `matches/[id].tsx` (659) — Match detail.
7. `confirm-booking.tsx` (600) — Booking confirmation.
8. `(modal)/create-post.tsx` (591) — Reuses post components.
9. `bookings/[id]/negotiate.tsx` (543) — Negotiate form.
10. `(modal)/post-detail.tsx` (535) — Post detail.
11. `(modal)/add-child.tsx` (514) — Add child form.
12. `rate-coach.tsx` (490) — Rate coach form.
13. `coach-invites.tsx` (447) — Coach invites list.
14. `book-coach.tsx` (426) — Book coach flow.
15. `(modal)/create-squad.tsx` (422) — Create squad modal.
16. `bookings/subscribe.tsx` (335) — Minor decomposition.
17. `matches/index.tsx` (329) — Minor decomposition.
18. `bookings/[id]/counter.tsx` (315) — Minor decomposition.

---

## Verification Commands

```bash
# 1. TypeScript compilation
npx tsc -p tsconfig.test.json

# 2. Run all tests
node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js

# 3. Line counts (all <250)
wc -l app/booking/\[id\]/cancel.tsx app/coach/\[coachId\]/public.tsx app/coach/\[id\].tsx app/matches/create.tsx app/matches/\[id\].tsx app/matches/index.tsx app/\(modal\)/create-club-post.tsx app/\(modal\)/create-post.tsx app/\(modal\)/post-detail.tsx app/\(modal\)/add-child.tsx app/\(modal\)/create-squad.tsx app/confirm-booking.tsx app/bookings/\[id\]/negotiate.tsx app/rate-coach.tsx app/coach-invites.tsx app/book-coach.tsx app/bookings/subscribe.tsx app/bookings/\[id\]/counter.tsx

# 4. Verify useScreen or custom hook usage
grep -l "useScreen\|useCancelBooking\|useCreateMatch" app/booking/ app/coach/ app/matches/ app/\(modal\)/ app/confirm-booking.tsx app/rate-coach.tsx app/coach-invites.tsx app/book-coach.tsx app/bookings/ 2>/dev/null

# 5. Verify no Colors.light
grep -r "Colors\.light\." app/booking/ app/coach/ app/matches/ app/\(modal\)/ components/booking/ components/coach/ components/match/ components/social/ || echo "PASS"

# 6. Verify no TouchableOpacity
grep -r "TouchableOpacity" app/booking/ app/coach/ app/matches/ app/\(modal\)/ components/booking/ components/coach/ components/match/ components/social/ || echo "PASS"

# 7. Verify no raw flexDirection in new components
grep -rn "flexDirection" components/booking/ components/match/ 2>/dev/null | head -20
```

---

## Sub-Component Directory Structure

```
components/
  booking/
    cancel-reason-step.tsx
    cancel-policy-display.tsx
    cancel-confirm-step.tsx
    cancel-result.tsx
    confirm-session-card.tsx
    confirm-price-breakdown.tsx
    confirm-payment-method.tsx
    confirm-policy-note.tsx
    confirm-submit-bar.tsx
    negotiate-current-card.tsx
    negotiate-proposal-form.tsx
    negotiate-message-input.tsx
    negotiate-submit-bar.tsx
    book-coach-header.tsx
    book-slot-selector.tsx
    book-session-type.tsx
    book-cta-bar.tsx
  coach/
    public-hero-header.tsx
    public-bio-section.tsx
    public-offerings.tsx
    public-reviews-section.tsx
    public-credentials.tsx
    public-book-cta.tsx
    coach-action-row.tsx
    coach-availability-preview.tsx
    coach-stats-section.tsx
    rate-star-selector.tsx
    rate-session-summary.tsx
    rate-text-review.tsx
    rate-tags.tsx
    rate-submit-bar.tsx
    coach-invite-card.tsx
    coach-invite-filter.tsx
  match/
    create-match-teams.tsx
    create-match-schedule.tsx
    create-match-location.tsx
    create-match-details.tsx
    create-match-submit.tsx
    match-header.tsx
    match-info-card.tsx
    match-lineup.tsx
    match-action-bar.tsx
    match-list-card.tsx
  social/
    post-text-editor.tsx
    post-media-picker.tsx
    post-club-selector.tsx
    post-submit-header.tsx
    post-visibility-picker.tsx
    post-detail-header.tsx
    post-detail-content.tsx
    post-detail-actions.tsx
    post-comment-list.tsx
    (comment-card.tsx — may already exist)
    (comment-input.tsx — may already exist)
  family/
    add-child-info.tsx
    add-child-sports.tsx
    add-child-medical.tsx
    add-child-submit.tsx
hooks/
  use-cancel-booking.ts
  use-create-match.ts
```

---

## Common Pitfalls

1. **Cancel flow is destructive.** Use red/destructive styling on the final confirm button. Add a confirmation Alert before calling the service.
2. **Public coach profile** may be viewable without login. Conditionally show "Log in to book" vs "Book Now" based on auth state.
3. **Rating stars** need precise touch handling. Each star must be individually tappable with clear feedback. Consider using half-star support if the current implementation has it.
4. **Modal screens** use `router.back()` or `router.dismiss()` to close — NOT `router.push()`.
5. **Negotiate/counter screens** display the current booking terms alongside the proposal form. Use a clear visual distinction (muted card for current vs prominent form for proposal).
6. **Existing social components:** Check `components/social/` — `comment-card.tsx`, `comment-input.tsx`, `comment-preview.tsx`, `feed-post-card.tsx` may already exist. Reuse them.
7. **Match teams:** If squad selection is complex, it may need its own FlatList with memoized items.
8. **Post media:** Image picker integration should stay in the component, not the hook. The hook manages the URI state.
