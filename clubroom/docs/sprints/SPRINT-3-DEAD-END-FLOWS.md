# Sprint 3: Dead-End Flows

**Goal**: Every feature that exists in the UI actually works end-to-end. No more buttons that do nothing, no more flows that dead-end.
**Size**: L (12-15 files)
**Priority**: P2 — makes the demo feel complete

---

## Tasks

### 3.1 Wire recurring sessions UI
**Service**: `services/recurring-booking-service.ts` (fully implemented: create, list, pause, resume, cancel)
**Missing**: Zero UI screens connect to this service

**Build**:
- Add a "Make Recurring" toggle/section in the session creation flow (`app/sessions/create.tsx`)
- When toggled on, show: frequency (weekly/biweekly), duration (4/6/8/12 weeks), same time/day
- On save, call `recurringBookingService.createRecurring()` instead of single `createBooking()`
- Add a "Recurring Sessions" section on the schedule screen showing active subscriptions
- Allow pause/cancel from there

**Key files**:
- `app/sessions/create.tsx` — add recurring toggle + fields
- `services/recurring-booking-service.ts` — already done
- `app/(tabs)/schedule.tsx` — add recurring section to Sessions tab

### 3.2 Fix video playback
**File**: `components/video/video-player.tsx` (currently 58 lines, renders "unavailable" placeholder)
**Problem**: `expo-video` causes SIGABRT on iOS simulator with Expo 54

**Options (pick one)**:
1. **expo-av Video component** — more stable, proven on Expo 54
2. **WebView with HTML5 video** — works everywhere, less native feel
3. **expo-video with error boundary** — try expo-video, fall back to placeholder if it crashes

**Recommended**: Option 1 (expo-av). Replace the placeholder with:
```typescript
import { Video, ResizeMode } from 'expo-av';
// Render <Video source={{ uri: videoUrl }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
```

**Test**: Coach uploads video → navigates to video detail → video actually plays

### 3.3 Wire notification triggers (8 orphaned methods)
**File**: `services/notification/notification-sender.ts` has 16 methods, only 4 are called.

**Wire these at the right moments**:

| Method | Wire at | File to modify |
|--------|---------|----------------|
| `notifyCoachBookingCancelled()` | When parent cancels booking | `hooks/use-cancel-flow.ts` (replace manual notification write) |
| `notifyParentBookingCancelled()` | When coach cancels booking | `hooks/use-cancel-flow.ts` |
| `notifyCoachInviteAccepted()` | When parent accepts session invite | `services/invite/session-invite-service.ts` |
| `notifyCoachInviteDeclined()` | When parent declines session invite | `services/invite/session-invite-service.ts` |
| `notifyParentSessionFeedback()` | When coach completes session (Sprint 2 wired feedback) | `services/service-subscribers.ts` SESSION_COMPLETED handler |
| `notifyParentBadgeAwarded()` | When coach awards badge | `services/service-subscribers.ts` or badge-service.ts |
| `notifyParentSessionInvite()` | When coach sends session invite | `services/invite/session-invite-service.ts` |
| `notifyParentClubPost()` | When coach posts to club feed | `services/community/` or service-subscribers |

**Also fix**: `hooks/use-cancel-flow.ts` currently writes raw notification objects directly to storage, bypassing the notification sender. Replace with proper `notifyCoachBookingCancelled()` / `notifyParentBookingCancelled()` calls.

### 3.4 Parent onboarding
**Problem**: `AccountType` includes PARENT but the onboarding picker only shows ATHLETE + COACH.

**Build**:
- Add "I'm a Parent" option to `components/auth/onboarding-step-account-type.tsx`
- Create `components/auth/onboarding-step-parent.tsx` — parent-specific step:
  - Number of children
  - For each child: name, date of birth, relationship
  - Emergency contact (name, phone)
- On completion, create parent user + child profiles via `familyService`
- Route to parent home screen after auto-login

### 3.5 Counter-offer → create booking
**File**: `services/counter-offer-service.ts:325`
**Problem**: Comment says `// CRITICAL: Create a real booking when counter-offer is accepted` — currently marks accepted but no booking created
**Fix**: When counter-offer status transitions to ACCEPTED, call `bookingService.createBooking()` with the agreed-upon terms (date, time, price from the counter-offer).

### 3.6 "Add Payout Method" → working form
**File**: `app/earnings.tsx` — the `handleAddPayoutMethod()` handler
**Problem**: Button exists, handler is empty/incomplete

**Build**:
- Create a modal/bottom sheet: `components/earnings/add-payout-modal.tsx`
- Fields: account name, sort code, account number (UK bank) OR PayPal email
- On save, call `payoutService.addPayoutMethod()` (service already exists)
- Show the new method in the payout methods list

---

## Acceptance Criteria
- [ ] Coach can create a recurring session (weekly, 8 weeks) and see all instances on schedule
- [ ] Video uploaded by coach can be played by athlete/parent
- [ ] Parent gets notification when coach completes session, awards badge, cancels booking
- [ ] Coach gets notification when parent cancels, accepts/declines invite
- [ ] New parent can sign up, add children, land on parent home
- [ ] Accepted counter-offer creates a real booking
- [ ] Coach can add a bank account as payout method
