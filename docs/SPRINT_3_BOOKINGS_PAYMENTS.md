# Sprint 3: Bookings, Payments & Sessions
**Duration:** 3-4 weeks
**Goal:** Build the core marketplace functionality - bookings, payments, calendar, session management

---

## Sprint Objectives

By the end of Sprint 3, we will have:
1. ✅ Full booking flow (discovery → calendar → payment)
2. ✅ Stripe integration (payments + Connect for coaches)
3. ✅ Coach calendar management
4. ✅ Session notes & feedback system
5. ✅ Reviews & ratings
6. ✅ Coach income dashboard
7. ✅ Messaging between users
8. ✅ Email & SMS notifications

---

## Features to Build

### 1. Database Schema Extensions

#### New Tables:

```sql
-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES users(id), -- Optional, if booking through school
  session_type VARCHAR(50) NOT NULL, -- '1on1', 'small_group', 'team'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL,
  location_type VARCHAR(20), -- 'coach_location', 'player_location', 'neutral', 'virtual'
  location_address TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  price DECIMAL(8, 2) NOT NULL, -- Amount paid/to be paid
  currency VARCHAR(3) DEFAULT 'GBP',
  notes TEXT, -- Player's notes/requests
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_bookings_player ON bookings(player_id);
CREATE INDEX idx_bookings_coach ON bookings(coach_id);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Session Notes (added after session completion)
CREATE TABLE session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id),
  notes TEXT NOT NULL, -- Coach's feedback
  focus_areas TEXT[], -- ['Passing', 'Shooting']
  improvements TEXT, -- What improved
  homework TEXT, -- Drills to practice
  effort_rating INT CHECK (effort_rating >= 1 AND effort_rating <= 5), -- 1-5 stars
  attendance VARCHAR(20) DEFAULT 'present', -- 'present', 'late', 'absent'
  attachments TEXT[], -- S3 URLs (videos, PDFs)
  skills_updated JSONB, -- { "passing": 7, "shooting": 5 }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_session_notes_booking ON session_notes(booking_id);

-- Reviews
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  communication_rating INT CHECK (communication_rating >= 1 AND communication_rating <= 5),
  skill_development_rating INT CHECK (skill_development_rating >= 1 AND skill_development_rating <= 5),
  punctuality_rating INT CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  value_rating INT CHECK (value_rating >= 1 AND value_rating <= 5),
  comment TEXT,
  response TEXT, -- Reviewee's response
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payee_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Coach/School
  amount DECIMAL(8, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  platform_fee DECIMAL(8, 2), -- 15% commission
  coach_earnings DECIMAL(8, 2), -- Amount after fee
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'refunded'
  payment_method VARCHAR(50), -- 'card', 'apple_pay', 'google_pay'
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  paid_at TIMESTAMP,
  refunded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_payee ON payments(payee_id);

-- Payouts (Coach withdrawals)
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(8, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'in_transit', 'paid', 'failed'
  stripe_payout_id VARCHAR(255),
  arrival_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_payouts_coach ON payouts(coach_id);

-- Coach Availability (recurring weekly schedule)
CREATE TABLE availability_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_availability_coach ON availability_templates(coach_id);

-- Availability Overrides (specific dates blocked/available)
CREATE TABLE availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  available BOOLEAN NOT NULL, -- TRUE = add slot, FALSE = block slot
  reason TEXT, -- e.g., "Holiday", "Special event"
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_overrides_coach ON availability_overrides(coach_id, date);

-- Messages (1-on-1 DMs)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  attachments TEXT[], -- S3 URLs
  type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'video', 'file', 'system'
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- Conversations (1-on-1 or group)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL DEFAULT 'dm', -- 'dm', 'group'
  participants UUID[] NOT NULL, -- Array of user IDs
  last_message_id UUID,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_conversations_participants ON conversations USING GIN(participants);

-- Add Stripe Connect account ID to coach profiles
ALTER TABLE coach_profiles ADD COLUMN stripe_account_id VARCHAR(255);
ALTER TABLE coach_profiles ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE coach_profiles ADD COLUMN balance_available DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE coach_profiles ADD COLUMN balance_pending DECIMAL(10, 2) DEFAULT 0.00;
```

---

### 2. Booking Flow (Player/Parent Side)

#### Step 1: Discover Coach
- [ ] Update existing CoachCard to include "Book Now" button
- [ ] Tapping opens BookingFlow modal

#### Step 2: Select Session Type
- [ ] Screen: Choose session type
  - 1-on-1 (£50/hr)
  - Small Group (£30/hr per person)
  - Team Training (£100/hr)
- [ ] Show pricing for each type
- [ ] If group, ask: "How many participants?"

#### Step 3: Choose Date & Time
- [ ] Interactive calendar component
- [ ] Fetch coach's availability from API
- [ ] Show available slots in green, booked in red
- [ ] Select date → show available time slots
- [ ] Time slots in 30min or 1hr increments

**Frontend:**
```typescript
// GET /api/v1/coaches/:coachId/availability?month=2025-11
const { data: availability } = useQuery({
  queryKey: ['availability', coachId, month],
  queryFn: () => api.coaches.getAvailability(coachId, month)
});

// Returns:
{
  "2025-11-20": [
    { start: "09:00", end: "10:00", available: true },
    { start: "10:00", end: "11:00", available: false },
    // ...
  ]
}
```

#### Step 4: Add Details
- [ ] Location preference:
  - Coach's location
  - My location (enter postcode)
  - Neutral location (map picker)
  - Virtual (Zoom link)
- [ ] Special requests (textarea): "Focus on passing"
- [ ] Duration: 1hr, 1.5hr, 2hr (affects price)

#### Step 5: Review & Payment
- [ ] Summary card:
  - Coach name & photo
  - Date & time
  - Duration & price
  - Location
- [ ] Payment method:
  - Pay now (Stripe)
  - Pay later (if coach allows)
- [ ] Stripe payment form
- [ ] "Confirm Booking" button

**Backend Booking Creation:**
```typescript
// POST /api/v1/bookings
async function createBooking(req, res) {
  const {
    coach_id,
    player_id,
    session_type,
    date,
    start_time,
    end_time,
    location,
    notes,
    payment_method,
  } = req.body;

  // 1. Check availability
  const isAvailable = await checkAvailability(coach_id, date, start_time, end_time);
  if (!isAvailable) {
    return res.status(400).json({ error: 'Slot no longer available' });
  }

  // 2. Calculate price
  const coach = await getCoach(coach_id);
  const duration = calculateDuration(start_time, end_time);
  const price = calculatePrice(coach, session_type, duration);

  // 3. Create booking (status: pending until coach accepts)
  const booking = await db.bookings.create({
    data: {
      player_id,
      coach_id,
      session_type,
      date,
      start_time,
      end_time,
      duration_minutes: duration,
      location_address: location.address,
      price,
      status: 'pending',
      notes,
    }
  });

  // 4. Create payment intent (Stripe)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: price * 100, // Convert to cents
    currency: 'gbp',
    metadata: { booking_id: booking.id },
  });

  // 5. Save payment record
  await db.payments.create({
    data: {
      booking_id: booking.id,
      payer_id: player_id,
      payee_id: coach_id,
      amount: price,
      platform_fee: price * 0.15,
      coach_earnings: price * 0.85,
      status: 'pending',
      stripe_payment_intent_id: paymentIntent.id,
    }
  });

  // 6. Notify coach
  await createNotification({
    user_id: coach_id,
    type: 'booking_request',
    title: 'New booking request',
    body: `${player.name} wants to book a session on ${date}`,
    data: { booking_id: booking.id },
  });

  res.status(201).json({
    booking,
    client_secret: paymentIntent.client_secret,
  });
}
```

---

### 3. Stripe Integration

#### Setup Stripe:
- [ ] Create Stripe account
- [ ] Install Stripe SDK:
  - Backend: `stripe` npm package
  - Frontend: `@stripe/stripe-react-native`
- [ ] Get API keys (test + live)
- [ ] Configure webhooks

#### Stripe Connect (for Coaches):
- [ ] Coaches need to onboard to Stripe Connect
- [ ] Use "Standard" or "Express" accounts
- [ ] Collect bank details for payouts

**Coach Onboarding Flow:**
1. Coach goes to Settings → Payments
2. Tap "Connect Stripe Account"
3. Redirect to Stripe onboarding (OAuth)
4. Stripe collects: Business type, bank details, ID verification
5. Redirect back to app
6. Save `stripe_account_id` to coach profile

**Backend:**
```typescript
// POST /api/v1/stripe/connect/onboard
async function initiateStripeOnboarding(req, res) {
  const { userId } = req.user;

  // Create Stripe Connect account
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'GB',
    email: req.user.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  // Save account ID
  await db.coach_profiles.update({
    where: { user_id: userId },
    data: { stripe_account_id: account.id },
  });

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${APP_URL}/settings/payments?refresh=true`,
    return_url: `${APP_URL}/settings/payments?success=true`,
    type: 'account_onboarding',
  });

  res.json({ url: accountLink.url });
}
```

#### Payment Flow:
1. Player creates booking
2. Stripe PaymentIntent created (hold funds)
3. Coach accepts booking → charge PaymentIntent
4. After session completes → transfer funds to coach (minus 15% fee)
5. Payout to coach's bank account (Stripe handles)

**Stripe Webhook Handling:**
```typescript
// POST /api/v1/webhooks/stripe
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const payment = event.data.object;
      await handlePaymentSuccess(payment);
      break;

    case 'payout.paid':
      const payout = event.data.object;
      await handlePayoutSuccess(payout);
      break;

    // ... other events
  }

  res.json({ received: true });
});
```

#### Frontend Payment (React Native):
```typescript
import { useStripe } from '@stripe/stripe-react-native';

function CheckoutScreen({ booking }) {
  const { confirmPayment } = useStripe();

  const handlePayment = async () => {
    const { client_secret } = await api.bookings.create(booking);

    const { error, paymentIntent } = await confirmPayment(client_secret, {
      paymentMethodType: 'Card',
    });

    if (error) {
      Alert.alert('Payment failed', error.message);
    } else {
      // Success!
      navigation.navigate('BookingConfirmed');
    }
  };

  return (
    <View>
      <CardField />
      <Button onPress={handlePayment}>Pay £{booking.price}</Button>
    </View>
  );
}
```

---

### 4. Coach Calendar Management

#### Calendar Screen (Coach View):

**Views:**
- [ ] Day view (detailed timeline)
- [ ] Week view (7-day grid)
- [ ] Month view (calendar with dots for bookings)

**Features:**
- [ ] Display all bookings (confirmed, pending, completed)
- [ ] Color coding by status
- [ ] Tap booking to view details
- [ ] Swipe to reschedule (drag-and-drop)
- [ ] Empty slots show as available

**Manage Availability:**
- [ ] Settings → Availability
- [ ] Weekly template:
  - Monday: 9am-5pm ✅
  - Tuesday: 9am-5pm ✅
  - Wednesday: OFF ❌
  - etc.
- [ ] Block specific dates (holidays, events)
- [ ] Add one-time availability

**Backend:**
```typescript
// POST /api/v1/coaches/availability/template
// Set weekly recurring availability
{
  "day_of_week": 1, // Monday
  "start_time": "09:00",
  "end_time": "17:00"
}

// POST /api/v1/coaches/availability/override
// Block specific date
{
  "date": "2025-12-25",
  "available": false,
  "reason": "Christmas"
}
```

#### Accept/Decline Booking Requests:
- [ ] Pending bookings show in "Requests" tab
- [ ] Tap to view details
- [ ] Accept → booking status = 'confirmed', payment charged
- [ ] Decline → booking cancelled, payment refunded

```typescript
// PATCH /api/v1/bookings/:id/accept
async function acceptBooking(req, res) {
  const { id } = req.params;
  const booking = await db.bookings.findUnique({ where: { id } });

  // Update status
  await db.bookings.update({
    where: { id },
    data: { status: 'confirmed' },
  });

  // Charge payment
  const payment = await db.payments.findFirst({ where: { booking_id: id } });
  await stripe.paymentIntents.capture(payment.stripe_payment_intent_id);

  // Notify player
  await createNotification({
    user_id: booking.player_id,
    type: 'booking_confirmed',
    title: 'Booking confirmed!',
    body: `Your session with ${coach.name} is confirmed for ${booking.date}`,
  });

  res.json(booking);
}
```

---

### 5. Session Notes & Feedback

#### After Session Completion:

**Coach View:**
- [ ] "Completed" bookings show "Add Notes" button
- [ ] Form:
  - Text notes (what was covered)
  - Focus areas (multi-select: Passing, Shooting, etc.)
  - Improvements seen (text)
  - Homework (drills to practice)
  - Effort rating (1-5 stars)
  - Attendance (present, late, absent)
  - Upload attachments (videos, PDFs)
  - Update skill levels (sliders: Passing 6→7, Shooting 4→5)

**Backend:**
```typescript
// POST /api/v1/bookings/:id/notes
async function addSessionNotes(req, res) {
  const { booking_id } = req.params;
  const {
    notes,
    focus_areas,
    improvements,
    homework,
    effort_rating,
    attendance,
    skills_updated,
  } = req.body;

  // Create session notes
  const sessionNotes = await db.session_notes.create({
    data: {
      booking_id,
      coach_id: req.user.id,
      notes,
      focus_areas,
      improvements,
      homework,
      effort_rating,
      attendance,
      skills_updated,
    }
  });

  // Update player's skill levels in development hub
  await updatePlayerSkills(booking.player_id, skills_updated);

  // Increment player's total sessions
  await db.player_profiles.update({
    where: { user_id: booking.player_id },
    data: {
      total_sessions: { increment: 1 },
      total_hours: { increment: booking.duration_minutes / 60 },
    }
  });

  // Notify player
  await createNotification({
    user_id: booking.player_id,
    type: 'session_notes',
    title: 'Session notes added',
    body: `${coach.name} added notes for your session`,
  });

  res.json(sessionNotes);
}
```

**Player View:**
- [ ] View session notes in Development Hub
- [ ] See skill updates
- [ ] Download attachments

---

### 6. Reviews & Ratings

#### Post-Session Review:

**Trigger:**
- 24 hours after session completion
- Push notification: "How was your session with Sarah?"

**Review Form (Player/Parent → Coach):**
- [ ] Overall rating (1-5 stars)
- [ ] Category ratings:
  - Communication (1-5)
  - Skill development (1-5)
  - Punctuality (1-5)
  - Value for money (1-5)
- [ ] Written review (optional, max 500 chars)
- [ ] Submit

**Backend:**
```typescript
// POST /api/v1/reviews
async function createReview(req, res) {
  const { booking_id, rating, comment, category_ratings } = req.body;
  const booking = await db.bookings.findUnique({ where: { id: booking_id } });

  // Create review
  const review = await db.reviews.create({
    data: {
      booking_id,
      reviewer_id: booking.player_id,
      reviewee_id: booking.coach_id,
      rating,
      communication_rating: category_ratings.communication,
      skill_development_rating: category_ratings.skill_development,
      punctuality_rating: category_ratings.punctuality,
      value_rating: category_ratings.value,
      comment,
    }
  });

  // Update coach's average rating
  const avgRating = await calculateAverageRating(booking.coach_id);
  await db.coach_profiles.update({
    where: { user_id: booking.coach_id },
    data: {
      rating: avgRating,
      total_reviews: { increment: 1 },
    }
  });

  res.json(review);
}
```

**Coach Response:**
- [ ] Coach can respond to reviews
- [ ] `PATCH /api/v1/reviews/:id/response`

**Display Reviews:**
- [ ] On coach profile (Reviews tab)
- [ ] Sort by: Recent, Highest rated, Lowest rated
- [ ] Pagination

---

### 7. Coach Income Dashboard

#### Income Screen (Coach Only):

**Overview Cards:**
- [ ] Today's Earnings: £0
- [ ] This Week: £340
- [ ] This Month: £1,520
- [ ] Total Lifetime: £12,450

**Balance:**
- [ ] Available to withdraw: £450.00
- [ ] Pending (from upcoming sessions): £680.00
- [ ] Withdraw button

**Charts:**
- [ ] Line chart: Earnings over time (last 30 days)
- [ ] Bar chart: Earnings by session type
- [ ] Pie chart: Revenue breakdown

**Transaction History:**
- [ ] List of all payments received
- [ ] Filters: Date range, session type
- [ ] Export to CSV

**Backend:**
```typescript
// GET /api/v1/coaches/income/stats
async function getIncomeStats(req, res) {
  const { userId } = req.user;

  const today = await db.payments.aggregate({
    where: {
      payee_id: userId,
      status: 'succeeded',
      paid_at: { gte: startOfDay(new Date()) }
    },
    _sum: { coach_earnings: true }
  });

  const thisWeek = await db.payments.aggregate({
    where: {
      payee_id: userId,
      status: 'succeeded',
      paid_at: { gte: startOfWeek(new Date()) }
    },
    _sum: { coach_earnings: true }
  });

  // ... similar for month, lifetime

  res.json({
    today: today._sum.coach_earnings || 0,
    this_week: thisWeek._sum.coach_earnings || 0,
    // ...
  });
}
```

#### Withdraw Funds:
- [ ] Button: "Withdraw to Bank"
- [ ] Shows available balance
- [ ] Minimum £10
- [ ] Stripe payout created
- [ ] Funds arrive in 1-3 business days

```typescript
// POST /api/v1/coaches/withdraw
async function withdrawFunds(req, res) {
  const { userId } = req.user;
  const { amount } = req.body;

  const coach = await db.coach_profiles.findUnique({ where: { user_id: userId } });

  if (amount > coach.balance_available) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Create Stripe payout
  const payout = await stripe.payouts.create(
    { amount: amount * 100, currency: 'gbp' },
    { stripeAccount: coach.stripe_account_id }
  );

  // Record payout
  await db.payouts.create({
    data: {
      coach_id: userId,
      amount,
      stripe_payout_id: payout.id,
      status: 'pending',
    }
  });

  // Update balance
  await db.coach_profiles.update({
    where: { user_id: userId },
    data: { balance_available: { decrement: amount } }
  });

  res.json({ success: true, payout });
}
```

---

### 8. Messaging System

#### Conversations:

**Message Threads:**
- [ ] Player ↔ Coach
- [ ] Parent ↔ Coach
- [ ] Group chats (in Sprint 4)

**Backend:**
```typescript
// POST /api/v1/conversations
// Start a conversation
async function createConversation(req, res) {
  const { participant_ids } = req.body; // [userId1, userId2]

  // Check if conversation already exists
  const existing = await db.conversations.findFirst({
    where: {
      type: 'dm',
      participants: { hasEvery: participant_ids },
    }
  });

  if (existing) return res.json(existing);

  // Create new conversation
  const conversation = await db.conversations.create({
    data: {
      type: 'dm',
      participants: participant_ids,
    }
  });

  res.json(conversation);
}

// GET /api/v1/conversations
// Get all conversations for user
async function getConversations(req, res) {
  const { userId } = req.user;

  const conversations = await db.conversations.findMany({
    where: {
      participants: { has: userId },
    },
    include: {
      messages: {
        orderBy: { created_at: 'desc' },
        take: 1, // Last message
      }
    },
    orderBy: { last_message_at: 'desc' }
  });

  res.json(conversations);
}

// POST /api/v1/conversations/:id/messages
// Send message
async function sendMessage(req, res) {
  const { conversation_id } = req.params;
  const { content, attachments } = req.body;
  const { userId } = req.user;

  const message = await db.messages.create({
    data: {
      conversation_id,
      sender_id: userId,
      content,
      attachments,
    }
  });

  // Update conversation last_message
  await db.conversations.update({
    where: { id: conversation_id },
    data: { last_message_at: new Date() }
  });

  // Send real-time update via WebSocket
  const conversation = await db.conversations.findUnique({ where: { id: conversation_id } });
  conversation.participants.forEach(participantId => {
    if (participantId !== userId) {
      io.to(participantId).emit('message', message);
    }
  });

  // Send push notification
  // ...

  res.json(message);
}
```

#### Frontend Messaging:
- [ ] Update existing messages screen to use real API
- [ ] Socket.io integration for real-time messages
- [ ] Typing indicators
- [ ] Read receipts

---

### 9. Notifications (Email & SMS)

#### Email Notifications:

**Templates to Create:**
- [ ] Booking confirmation (to player & coach)
- [ ] Booking reminder (24hr before, 1hr before)
- [ ] Session notes added (to player)
- [ ] Payment received (to coach)
- [ ] Review request (to player, 24hr after session)

**Use SendGrid or AWS SES:**
```typescript
import sgMail from '@sendgrid/mail';

async function sendBookingConfirmation(booking: Booking) {
  const msg = {
    to: booking.player.email,
    from: 'noreply@clubroom.app',
    subject: 'Booking Confirmed',
    text: `Your session with ${booking.coach.name} is confirmed for ${booking.date} at ${booking.start_time}.`,
    html: renderEmailTemplate('booking-confirmation', { booking }),
  };

  await sgMail.send(msg);
}
```

#### SMS Notifications (Twilio):
- [ ] Session reminder (1hr before)
- [ ] Booking cancelled

```typescript
import twilio from 'twilio';

async function sendSMSReminder(booking: Booking) {
  const client = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);

  await client.messages.create({
    body: `Reminder: You have a session with ${booking.coach.name} in 1 hour at ${booking.location_address}.`,
    from: TWILIO_PHONE_NUMBER,
    to: booking.player.phone,
  });
}
```

#### Scheduled Jobs:
- [ ] Use `node-cron` or Bull Queue
- [ ] Job: Send 24hr reminders (runs daily)
- [ ] Job: Send 1hr reminders (runs hourly)
- [ ] Job: Request reviews (runs daily, checks completed sessions from 24hr ago)

```typescript
import cron from 'node-cron';

// Every hour
cron.schedule('0 * * * *', async () => {
  const upcomingBookings = await getBookingsInNextHour();
  upcomingBookings.forEach(booking => sendSMSReminder(booking));
});
```

---

## API Endpoints Summary (Sprint 3)

### Bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - Get my bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `PATCH /api/v1/bookings/:id/accept` - Accept booking (coach)
- `PATCH /api/v1/bookings/:id/decline` - Decline booking (coach)
- `DELETE /api/v1/bookings/:id` - Cancel booking
- `POST /api/v1/bookings/:id/notes` - Add session notes (coach)

### Coaches
- `GET /api/v1/coaches/:id/availability` - Get availability
- `POST /api/v1/coaches/availability/template` - Set recurring availability
- `POST /api/v1/coaches/availability/override` - Block/add specific dates
- `GET /api/v1/coaches/income/stats` - Get income statistics
- `GET /api/v1/coaches/income/transactions` - Transaction history
- `POST /api/v1/coaches/withdraw` - Withdraw funds

### Payments
- `POST /api/v1/stripe/connect/onboard` - Initiate Stripe Connect
- `POST /api/v1/webhooks/stripe` - Stripe webhook handler

### Reviews
- `POST /api/v1/reviews` - Create review
- `GET /api/v1/reviews?reviewee_id=...` - Get reviews for coach
- `PATCH /api/v1/reviews/:id/response` - Respond to review

### Messages
- `POST /api/v1/conversations` - Start conversation
- `GET /api/v1/conversations` - Get all conversations
- `GET /api/v1/conversations/:id/messages` - Get messages
- `POST /api/v1/conversations/:id/messages` - Send message
- `PATCH /api/v1/messages/:id/read` - Mark as read

---

## Success Criteria

✅ Sprint 3 is complete when:
1. User can book a session end-to-end
2. Payment via Stripe works (test mode)
3. Coach can accept/decline bookings
4. Coach can manage availability (recurring + overrides)
5. Coach can add session notes
6. Player can review coach after session
7. Coach can view income dashboard
8. Coach can withdraw funds
9. Messaging works (DMs) with real-time updates
10. Email & SMS notifications send

---

## Testing Checklist

- [ ] Create booking as player
- [ ] Pay with test card
- [ ] Coach receives notification
- [ ] Coach accepts booking
- [ ] Payment is captured
- [ ] Both receive email confirmation
- [ ] SMS reminder sends 1hr before
- [ ] Coach marks session complete
- [ ] Coach adds session notes
- [ ] Player receives notification
- [ ] Player views notes in Development Hub
- [ ] Player submits review
- [ ] Coach sees review on profile
- [ ] Coach's rating updates
- [ ] Payment appears in coach income
- [ ] Coach withdraws funds
- [ ] Send message between player & coach
- [ ] Real-time message delivery
- [ ] Cancel booking & refund

---

## Estimated Effort

**Backend:** 8-10 days
- Bookings API: 2 days
- Stripe integration: 3 days
- Availability system: 1 day
- Session notes & reviews: 1 day
- Messaging: 2 days
- Notifications: 1 day

**Frontend:** 8-10 days
- Booking flow: 3 days
- Calendar UI: 2 days
- Income dashboard: 2 days
- Session notes: 1 day
- Messaging UI: 1 day
- Reviews: 1 day

**Total:** 16-20 days (3-4 weeks)

---

## Dependencies

- Stripe account (test + live keys)
- SendGrid or AWS SES (email)
- Twilio (SMS)
- Socket.io or Pusher (real-time messaging)
- Job scheduler (node-cron or Bull)

---

## Next Sprint Preview

Sprint 4 will focus on:
- Development Hub (analytics, graphs, progress tracking)
- Team management (coach creates teams, invites players)
- Group chats (team chats, class chats)
- Advanced features (achievements, badges, goals)
- Schools (full school profiles, staff management)

