# Sprint 2: Booking Flow & Real-time Features
**Duration:** 2-3 weeks
**Focus:** Complete booking journey, real-time messaging, session notes, reviews

**Note:** Still using mock data/hardcoded backend. Database integration comes later per your request.

---

## Objectives

Build the complete booking flow from discovery to completion, add session feedback, and implement real-time messaging simulation.

### What We're Building:
1. Complete booking flow (multi-step)
2. Real-time messaging simulation
3. Session notes & feedback (Coach → Player)
4. Reviews & ratings system
5. Payment UI (mock, no real Stripe yet)
6. Calendar sync (export to device calendar)
7. Notifications (in-app, no push yet)

---

## Tasks

### 1. Complete Booking Flow

**Create booking wizard:** `app/book/[coachId]/`

**Step 1: Select Session Type**
`app/book/[coachId]/session-type.tsx`
- [ ] Display session type options:
  - 1-on-1 (£90/session)
  - Small Group (£60/person)
  - Team Training (£150/session)
- [ ] Show pricing per type
- [ ] If group/team, ask "How many participants?"
- [ ] Show session duration options (1hr, 1.5hr, 2hr)
- [ ] Continue button

**Step 2: Choose Date & Time**
`app/book/[coachId]/schedule.tsx`
- [ ] Calendar view (month)
- [ ] Highlight available dates (from coach availability)
- [ ] Tap date to see available time slots
- [ ] Display slots in 1-hour blocks
- [ ] Show "No availability" if coach is fully booked
- [ ] Select time slot
- [ ] Continue button

**Step 3: Add Details**
`app/book/[coachId]/details.tsx`
- [ ] Location options:
  - Coach's preferred location (default)
  - My location (enter address)
  - Neutral venue (search map)
  - Virtual session (Zoom link provided)
- [ ] Special requests (textarea)
  - "Focus on passing technique"
  - "Preparing for tryouts"
- [ ] Add child (if Parent)
- [ ] Continue button

**Step 4: Review & Payment**
`app/book/[coachId]/review.tsx`
- [ ] Summary card:
  - Coach name, photo, rating
  - Date & time
  - Duration & session type
  - Location
  - Price breakdown
    - Session: £90
    - Platform fee: £13.50
    - Total: £103.50
- [ ] Payment method selection (mock):
  - Credit card
  - Debit card
  - Apple Pay
  - Google Pay
- [ ] Add payment method (fake form for now)
- [ ] Terms & conditions checkbox
- [ ] "Confirm & Pay" button

**Step 5: Confirmation**
`app/book/[coachId]/confirmation.tsx`
- [ ] Success animation (checkmark)
- [ ] Booking details
- [ ] "What's next" section:
  - You'll receive a confirmation email
  - Your coach will accept within 24 hours
  - Message your coach anytime
- [ ] Buttons:
  - View booking
  - Add to calendar
  - Message coach
  - Return to home

**Implementation:**
- [ ] Use Expo Router params to pass data between steps
- [ ] Use React Context or Zustand to manage booking state
- [ ] Validate each step before allowing continue
- [ ] Add back button to return to previous step

---

### 2. Real-time Messaging Simulation

**Current:** Messages are static mock data

**Goal:** Simulate real-time message sending/receiving

**Approach (No real backend yet):**
- [ ] Use WebSocket simulation with setTimeout
- [ ] Store messages in AsyncStorage
- [ ] Implement optimistic updates (message appears immediately)
- [ ] Simulate network delay (500ms)
- [ ] Simulate delivery status (Sent → Delivered → Seen)

**Features to add:**
- [ ] Send text messages
- [ ] Send images (from camera or gallery)
- [ ] Send documents (PDFs)
- [ ] Real-time typing indicator (simulate other user typing)
- [ ] Message read receipts (blue checkmarks)
- [ ] Message deletion (soft delete)
- [ ] Message reactions (❤️ 👍 😊 - mock for now)

**File updates:**
- `clubroom/app/(tabs)/messages.tsx` - Conversation list
- `clubroom/app/chat/[threadId].tsx` - Individual chat screen

**Create messaging service:**
`services/messaging-service.ts`
```typescript
class MessagingService {
  async sendMessage(threadId: string, content: string, attachments?: any[]) {
    // Simulate API call
    await delay(500);

    // Add to AsyncStorage
    const message = {
      id: generateId(),
      sender: 'parent', // or 'coach'
      body: content,
      createdAt: new Date().toISOString(),
      status: 'sent',
      attachments,
    };

    // Trigger UI update
    return message;
  }

  // More methods...
}
```

---

### 3. Session Notes & Feedback

**After session completion (Coach only):**

**Create:** `app/session-notes/[bookingId].tsx`

**Form fields:**
- [ ] Session summary (textarea)
  - What we covered today
- [ ] Focus areas (multi-select chips)
  - Passing ✓
  - Shooting ✓
  - Dribbling
  - Defending
  - Conditioning
- [ ] Improvements seen (textarea)
  - "Much better first touch under pressure"
- [ ] Areas for improvement (textarea)
  - "Work on weak foot passing"
- [ ] Homework / Practice drills (textarea)
  - "Practice wall passes 20 min daily"
- [ ] Effort rating (1-5 stars)
- [ ] Attendance (Present, Late, No-show)
- [ ] Skill level updates (sliders):
  - Passing: 6 → 7
  - Shooting: 5 → 6
  - Dribbling: 7 (unchanged)
- [ ] Upload attachments
  - Session video clips
  - Training plan PDFs
- [ ] "Submit Notes" button

**Player view:**
- [ ] Notification: "Your coach added session notes"
- [ ] View notes in Booking details
- [ ] See skill progression graph (simple line chart)
- [ ] Download attachments

**Create component:** `components/session/session-notes-form.tsx`
**Create component:** `components/session/session-notes-view.tsx`

---

### 4. Reviews & Ratings

**Trigger:** 24 hours after session completion

**Create:** `app/review/[bookingId].tsx`

**For Players reviewing Coaches:**
- [ ] Overall rating (1-5 stars, required)
- [ ] Category ratings (optional):
  - Communication (1-5 stars)
  - Skill development (1-5 stars)
  - Punctuality (1-5 stars)
  - Value for money (1-5 stars)
- [ ] Written review (optional, 500 char max)
- [ ] "Would you recommend this coach?" (Yes/No)
- [ ] Submit button

**For Coaches reviewing Players:**
- [ ] Overall rating (1-5 stars)
- [ ] Attitude (1-5 stars)
- [ ] Work ethic (1-5 stars)
- [ ] Coachability (1-5 stars)
- [ ] Written feedback (optional)
- [ ] Submit button

**Display reviews:**
- [ ] On coach profile page
- [ ] Show average rating prominently
- [ ] List recent reviews (paginated)
- [ ] Filter: All | 5 star | 4 star | etc.
- [ ] Sort: Recent | Highest rated | Lowest rated

**Coach response:**
- [ ] Coaches can reply to reviews
- [ ] Show response under review

**Create components:**
- `components/review/rating-stars.tsx` - Star rating input
- `components/review/review-card.tsx` - Display review
- `components/review/review-form.tsx` - Review submission form

---

### 5. Payment UI (Mock - No Real Stripe Yet)

**Create:** `app/payment/add-card.tsx`

**Mock payment form:**
- [ ] Card number input (format: 1234 5678 9012 3456)
- [ ] Expiry date (MM/YY)
- [ ] CVV
- [ ] Cardholder name
- [ ] Billing address
- [ ] "Save card" button

**Test cards (accept any):**
- 4242 4242 4242 4242 (Visa)
- 5555 5555 5555 4444 (Mastercard)
- Accept any expiry in the future

**Payment methods screen:**
`app/payment/methods.tsx`
- [ ] List saved cards
- [ ] Default card indicator
- [ ] Add new card button
- [ ] Delete card (swipe)

**Mock Stripe UI:**
- [ ] Use existing Stripe design patterns
- [ ] Show padlock icons for security
- [ ] Show card brand logos

---

### 6. Calendar Integration

**Feature:** Export booking to device calendar

**Implementation:**
- [ ] Install `expo-calendar`
- [ ] Request calendar permissions
- [ ] Create calendar event with:
  - Title: "Session with [Coach Name]"
  - Start time
  - End time
  - Location
  - Notes (session details)
  - Alert: 1 hour before
- [ ] "Add to Calendar" button on booking confirmation
- [ ] "Add to Calendar" button on booking detail screen

**Files:**
- Update `app/book/[coachId]/confirmation.tsx`
- Update `app/booking/[id].tsx`

---

### 7. In-App Notifications

**Create notification system (no push notifications yet):**

**Create:** `app/(tabs)/notifications.tsx` (add new tab for Admin only)

**Notification types:**
- [ ] Booking confirmed
- [ ] Booking declined
- [ ] New message
- [ ] Session starting soon (1 hour before)
- [ ] Session notes added
- [ ] Review request
- [ ] Payment reminder

**Notification card:**
- [ ] Icon (based on type)
- [ ] Title
- [ ] Body text
- [ ] Time ("2h ago")
- [ ] Unread indicator (blue dot)
- [ ] Tap to navigate to relevant screen

**Badge count:**
- [ ] Show unread count on relevant tabs
- [ ] Messages tab badge
- [ ] Bookings tab badge (for pending actions)

**Implementation:**
- [ ] Store notifications in AsyncStorage
- [ ] Mark as read on tap
- [ ] Clear all button
- [ ] Filter: All | Unread

**Create:** `services/notification-service.ts`
```typescript
class NotificationService {
  async createNotification(type: string, data: any) {
    // Create notification object
    // Save to AsyncStorage
    // Trigger badge update
  }

  async markAsRead(notificationId: string) {
    // Update notification
    // Update badge count
  }
}
```

---

### 8. Coach Earnings Dashboard (Mock)

**For Coaches only:**

**Create:** `app/earnings.tsx`

**Overview cards:**
- [ ] Today's earnings: £0
- [ ] This week: £340
- [ ] This month: £1,520
- [ ] Total: £12,450

**Balance:**
- [ ] Available to withdraw: £450.00
- [ ] Pending (from upcoming sessions): £680.00

**Recent transactions:**
- [ ] List of payments received
- [ ] Session details
- [ ] Date & amount
- [ ] Status (Pending, Paid, Refunded)

**Mock data:**
- Use hardcoded transactions for now
- Show realistic payment flow

**Charts (optional):**
- [ ] Line chart: Earnings over last 30 days
- [ ] Use `react-native-chart-kit` or `victory-native`

---

### 9. Booking Cancellation Flow

**For both Users and Coaches:**

**Create:** `app/booking/[id]/cancel.tsx`

**Cancellation policy:**
- [ ] Show policy:
  - Free cancellation up to 24 hours before
  - 50% refund if cancelled 12-24 hours before
  - No refund if cancelled less than 12 hours before
- [ ] Reason for cancellation (dropdown):
  - Schedule conflict
  - Weather
  - Injury/Illness
  - Found another coach
  - Other (specify)
- [ ] Optional message to coach/player
- [ ] Confirm cancellation button

**After cancellation:**
- [ ] Update booking status to "Cancelled"
- [ ] Send notification to other party
- [ ] Process refund (mock)
- [ ] Show cancellation confirmation

---

### 10. Availability Management (Coach)

**Enhance:** `clubroom/app/(tabs)/availability.tsx`

**Features:**
- [ ] Set recurring weekly availability
  - Modal with day toggles and time pickers
  - Save as template
- [ ] Block specific dates (holidays, events)
  - Date picker
  - Reason (optional)
  - Save
- [ ] Add one-time availability
  - Date picker
  - Time range
  - Save
- [ ] Edit/delete availability slots
- [ ] Sync with bookings (show booked times as unavailable)

**Create:** `app/availability/set-schedule.tsx`
- Weekly schedule editor
- Time picker for each day
- Toggle days on/off

---

## Mock Data Updates

**Update:** `constants/mock-data.ts`

**Add:**
- [ ] More coach profiles (10-15 total)
- [ ] More booking samples (various statuses)
- [ ] Session notes examples
- [ ] Reviews & ratings data
- [ ] Notification samples
- [ ] Payment transaction history
- [ ] Availability templates

---

## New Components

- [ ] `components/booking/booking-wizard.tsx` - Multi-step booking flow
- [ ] `components/booking/session-type-selector.tsx`
- [ ] `components/booking/calendar-picker.tsx`
- [ ] `components/booking/time-slot-picker.tsx`
- [ ] `components/session/session-notes-form.tsx`
- [ ] `components/session/session-notes-view.tsx`
- [ ] `components/review/rating-stars.tsx`
- [ ] `components/review/review-card.tsx`
- [ ] `components/review/review-form.tsx`
- [ ] `components/payment/card-form.tsx` (mock)
- [ ] `components/payment/card-list-item.tsx`
- [ ] `components/notification/notification-card.tsx`
- [ ] `components/earnings/stat-card.tsx`
- [ ] `components/earnings/transaction-list-item.tsx`

---

## Services to Create

- [ ] `services/messaging-service.ts` - Handle messaging logic
- [ ] `services/notification-service.ts` - Manage notifications
- [ ] `services/booking-service.ts` - Booking CRUD operations
- [ ] `services/review-service.ts` - Review submission/retrieval
- [ ] `services/storage-service.ts` - AsyncStorage wrapper

---

## Success Criteria

✅ Sprint 2 is complete when:
1. Full booking flow works end-to-end
2. Users can send/receive messages with attachments
3. Coaches can add session notes
4. Both parties can leave reviews
5. Payment UI is functional (mock)
6. Bookings can be added to device calendar
7. In-app notifications display correctly
8. Coach earnings dashboard shows data
9. Booking cancellation works with policy
10. Coach availability management is complete

---

## Testing Checklist

- [ ] Complete full booking flow as User
- [ ] Accept/decline booking as Coach
- [ ] Send message with image attachment
- [ ] Add session notes as Coach
- [ ] View session notes as User
- [ ] Submit review as User
- [ ] Reply to review as Coach
- [ ] Add mock payment method
- [ ] Export booking to calendar
- [ ] Receive and view notification
- [ ] View earnings dashboard as Coach
- [ ] Cancel booking and verify refund policy
- [ ] Set recurring availability as Coach
- [ ] Block dates as Coach

---

## Notes

- Continue using mock data (no real backend)
- Simulate async operations with setTimeout
- Prepare data structures for future backend integration
- Focus on UX and flow
- All Stripe integration is UI-only (no real charges)

---

**Next Sprint Preview:**
Sprint 3 will add social features (feed, posts, follow system), development hub (skills tracking, analytics), and profile enhancements.
