# Sprint 7: Coach Business Growth Tools

## Goal

Coaches can grow their business through the app. Public profile page parents can Google. Shareable booking link. Trial sessions. Earnings projections. This is what Spond will never offer.

## Why This Matters

Spond is a walled garden — no one outside the team can see anything. A coach on Spond has zero discoverability. Coaches switch to us because we help them GET new clients, not just manage existing ones.

## User Stories

| Role | Story |
|------|-------|
| **Coach** | I want a public profile page I can share on Instagram/WhatsApp |
| **Coach** | I want a booking link like "clubroom.app/coach/marcus" that parents can tap to book |
| **Coach** | I want to offer a trial/taster session at a discount to attract new families |
| **Coach** | I want to see how much I've earned this week/month and what I'm projected to earn |
| **Coach** | I want to create a promo code for a free first session |
| **Coach** | I want to see which sessions are my best earners |
| **Coach** | I want parents to leave reviews that appear on my public profile |
| **Parent** | I want to find a coach by searching Google for "football coach near me" |
| **Parent** | I want to try a taster session before committing to regular bookings |
| **Parent** | I want to see reviews from other parents before booking |

## Task 1: Public Coach Profile Page

**File**: `app/coach/[coachId]/public.tsx`

A shareable, SEO-friendly page that works even for non-logged-in users:

```
┌─────────────────────────────────────┐
│ [Cover Photo - full width]          │
│                                     │
│ [Avatar]  Coach Marcus Williams     │
│           ⭐ 4.8 (23 reviews)      │
│           ✓ Verified · DBS Checked  │
│           📍 Hackney, London        │
│                                     │
│ [Book a Session]  [Message]         │
│                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                     │
│ ABOUT                               │
│ FA Level 2 coach with 8 years       │
│ experience developing young players │
│ across East London...               │
│                                     │
│ SPECIALTIES                         │
│ [Dribbling] [Passing] [1v1 Skills] │
│                                     │
│ QUALIFICATIONS                      │
│ 🎓 FA Level 2 · 2024               │
│ 🎓 First Aid · 2025                │
│ 🛡️ DBS Enhanced · Verified         │
│                                     │
│ AVAILABLE SESSIONS                  │
│ ┌──────────────────────────────┐   │
│ │ 1-on-1 Training              │   │
│ │ £40/hour · Hackney Downs     │   │
│ │ Next: Tue 4 Feb, 4:00pm      │   │
│ │ [Book Now]                    │   │
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ ⭐ TRIAL SESSION             │   │
│ │ £15 (normally £40)           │   │
│ │ "Try a session before you    │   │
│ │  commit — no obligation"     │   │
│ │ [Book Trial]                 │   │
│ └──────────────────────────────┘   │
│                                     │
│ REVIEWS                             │
│ ┌──────────────────────────────┐   │
│ │ ⭐⭐⭐⭐⭐ "Brilliant coach"  │   │
│ │ Sarah M. · 2 weeks ago       │   │
│ │ "My son's confidence has     │   │
│ │  completely transformed..."   │   │
│ └──────────────────────────────┘   │
│                                     │
│ EXPERIENCE                          │
│ • Head Coach, Hackney Youth (2020-) │
│ • Assistant, Arsenal Academy (2018) │
│                                     │
│ PHOTOS                              │
│ [grid of session photos]            │
│                                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Clubroom — Find football coaches    │
│ near you                            │
└─────────────────────────────────────┘
```

**Key features**:
- Works without login (read-only for visitors)
- "Book Now" requires login/signup
- SEO meta tags: title, description, structured data (Schema.org Coach)
- Shareable URL: `clubroom.app/coach/marcus-williams`
- Open Graph tags for social sharing (preview card on WhatsApp/Instagram)

## Task 2: Shareable Booking Link

**File**: `components/coach/share-profile.tsx`

Coach can copy/share their booking link from profile:

```
┌─────────────────────────────────────┐
│ Share your profile                  │
│                                     │
│ clubroom.app/coach/marcus-williams  │
│ [Copy Link]  [Share]                │
│                                     │
│ Quick share:                        │
│ [WhatsApp] [Instagram] [Copy]       │
│                                     │
│ QR Code:                            │
│ [QR code image]                     │
│ Save this for flyers or posters     │
└─────────────────────────────────────┘
```

- Copy to clipboard
- Native share sheet (WhatsApp, Instagram Stories, SMS)
- QR code (downloadable PNG) for printing on flyers, business cards, pitch-side posters
- Coach slug auto-generated from name (e.g., `marcus-williams`), editable

## Task 3: Trial / Taster Sessions

**File**: `components/coach/trial-session-editor.tsx`

Coaches can create a special trial offering:

```
┌─────────────────────────────────────┐
│ Trial Session                       │
│                                     │
│ Offer new families a taster session │
│ at a reduced rate.                  │
│                                     │
│ ┌──────────────────────────────┐   │
│ │ Enable trial sessions  [ON]  │   │
│ │ Trial price       £15        │   │
│ │ Normal price      £40        │   │
│ │ Duration          30 min     │   │
│ │ Limit per family  1          │   │
│ │ Description:                 │   │
│ │ "Try a session — no          │   │
│ │  obligation to continue"     │   │
│ └──────────────────────────────┘   │
│                                     │
│ [Save]                              │
└─────────────────────────────────────┘
```

**Rules**:
- One trial per family (tracked by parent ID)
- Shows on public profile with "TRIAL" badge
- Shows in discovery results with "Trial available" tag
- After trial, parent prompted: "How was it? Book your next session"
- Coach sees trial conversion rate in analytics

## Task 4: Coach Dashboard Redesign

**File**: `app/(tabs)/index.tsx` (coach view) — REDESIGN

Replace the admin-style development screen with an inspiring business dashboard:

```
┌─────────────────────────────────────┐
│ Good morning, Marcus 👋             │
│                                     │
│ ┌─ This Week ──────────────────┐   │
│ │  £320        8          4.9  │   │
│ │  earned    sessions    rating │   │
│ │  ↑ 12%      ↑ 2       steady │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Today's Sessions ───────────┐   │
│ │ 🟢 4:00  Jake B. (1:1)      │   │
│ │         Passing & Movement   │   │
│ │         Hackney Downs        │   │
│ │                              │   │
│ │ 🟢 5:30  U12 Group (6/8)    │   │
│ │         Dribbling Skills     │   │
│ │         Hackney Downs        │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Needs Attention ────────────┐   │
│ │ 📋 2 sessions to complete    │   │
│ │ 💬 3 unread messages         │   │
│ │ 📩 1 pending booking         │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Recent Wins 🎉 ────────────┐   │
│ │ ⭐ New 5-star review from    │   │
│ │    Sarah M.                  │   │
│ │ 🏅 You awarded 4 badges     │   │
│ │    this week                 │   │
│ │ 📈 3 new families booked     │   │
│ │    this month                │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Quick Actions ──────────────┐   │
│ │ [+ Create Session]           │   │
│ │ [📩 Invite Athlete]          │   │
│ │ [📊 View Analytics]          │   │
│ │ [🔗 Share Profile]           │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Key differences from current**:
- Leads with EARNINGS (this is a business, not a hobby)
- Today's schedule front and center
- "Needs attention" replaces generic action buttons
- "Recent wins" celebrates good things happening (reviews, badges, new clients)
- Quick actions for the most common tasks
- Feels like a coach's cockpit, not an admin panel

## Task 5: Earnings Projection

**File**: `components/coach/earnings-projection.tsx`

On the earnings/analytics screen, show forward-looking projections:

```
┌─────────────────────────────────────┐
│ February Projection                 │
│                                     │
│ Confirmed:      £480 (12 sessions)  │
│ Pending:        £120 (3 sessions)   │
│ Projected:      £720 (18 sessions)  │
│                                     │
│ [bar chart showing weekly earnings] │
│                                     │
│ 💡 You're on track to earn 15%     │
│    more than January                │
│                                     │
│ Best session type: 1-on-1 (£40/hr) │
│ Busiest day: Saturday               │
│ Repeat rate: 78%                    │
└─────────────────────────────────────┘
```

Based on confirmed + pending bookings + historical weekly average.

## Task 6: Booking Confirmation Option (Action→Reaction)

**File**: Add to `services/booking-service.ts` + `components/coach/booking-request.tsx`

Coach can choose auto-confirm OR manual confirm for new bookings:

**Auto-confirm (default)**: Parent books → booking confirmed instantly → coach sees it in schedule.

**Manual confirm**: Parent books → booking goes to PENDING → coach gets notification:
```
┌─────────────────────────────────────┐
│ New booking request                 │
│                                     │
│ Sarah M. wants to book Jake for     │
│ 1:1 Training — Tue 4 Feb 4pm      │
│ Hackney Downs Park · £40           │
│                                     │
│ [✅ Confirm]  [Suggest Alternative] │
│ [Decline]                           │
└─────────────────────────────────────┘
```

**→ PARENT REACTION:**
- If manual confirm: Parent sees "Booking requested — waiting for coach to confirm"
- When coach confirms: "Booking confirmed! Tue 4pm with Coach Marcus" + [Add to Calendar]
- When coach suggests alternative: opens counter-offer flow
- When coach declines: "Coach Marcus can't do this time. [See Other Coaches] [Try Another Time]"
- If no response in 24h: auto-remind coach, parent sees "Still waiting for confirmation"

Setting lives in coach profile settings (Sprint 3 settings hub).

## Task 6b: Trial Conversion Tracking

**File**: Add to `services/analytics-service.ts`

Track and display:
- Total trial sessions offered
- Trial sessions booked
- Conversions (parent who did trial → booked regular session)
- Conversion rate
- Revenue from converted trial parents

Show in coach analytics:
```
Trial Sessions
├── 12 trials this month
├── 8 converted to regular (67%)
├── £640 revenue from converts
└── Avg 3.2 sessions per convert
```

## Task 7: Share Coach Profile Button

**File**: Add to `app/coach/[coachId]/index.tsx`

Share button visible on coach profile (for parents sharing with friends):

```
┌─────────────────────────────────────┐
│ [← Back]  Coach Marcus     [♡] [↗] │
│                                     │
│ (↗ = share button)                 │
└─────────────────────────────────────┘
```

- Native share sheet with coach's public profile link
- Custom share message: "Check out Coach Marcus on Clubroom — great football coach in Hackney!"
- Open Graph meta ensures preview card on WhatsApp/iMessage/etc.
- Also accessible from three-dot menu on coach card in search results

## Task 8: Review Response System (Action→Reaction)

**File**: `components/coach/review-response.tsx`

Coach can respond to any review publicly:
```
┌─────────────────────────────────────┐
│ ⭐⭐⭐⭐⭐ "Brilliant coach"       │
│ Sarah M. · 2 weeks ago              │
│ "My son's confidence has improved..." │
│                                      │
│ Your reply:                          │
│ "Thanks Sarah! Jake worked really   │
│  hard — looking forward to Tuesday" │
│                                      │
│ [Post Reply]                         │
└─────────────────────────────────────┘
```

- One reply per review (no back-and-forth)
- Reply visible on public profile
- For 1-2 star reviews: coach gets private prompt "We noticed a low review. Is there anything you'd like us to know?" (support channel, not visible to parent)
- **→ PARENT REACTION:** Parent gets notification "Coach Marcus replied to your review" → deep link to review

## Task 8b: Favourite Analytics for Coaches

**File**: Add to `components/coach/earnings-projection.tsx`

Coach sees anonymous favourite data in analytics:
```
┌─────────────────────────────────────┐
│ Profile Performance                 │
│                                     │
│ 👁️ 47 profile views this month     │
│ ❤️ 12 parents saved your profile   │
│ 📞 8 enquiries (messages)          │
│ 📅 5 bookings from discovery       │
│                                     │
│ Conversion: 10.6% view → booking   │
└─────────────────────────────────────┘
```

Anonymous counts only (no names). Helps coaches understand their visibility.

## Task 8c: Price Change Notification (Action→Reaction)

When coach updates their hourly rate:
- Parents with FUTURE bookings at old rate: notification "Coach Marcus has updated their rate to £50/hr. Your existing bookings remain at £40."
- Existing confirmed bookings are NOT repriced (honour the original rate)
- New bookings use new rate
- Coach warned before saving: "You have 3 upcoming bookings at £40/hr. These won't change. New bookings will be £50/hr."

## Task 9: Similar Coaches Section

**File**: `components/coach/similar-coaches.tsx`

At bottom of coach profile, show related coaches:

```
┌─────────────────────────────────────┐
│ Similar Coaches                     │
│                                     │
│ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │[foto]│ │[foto]│ │[foto]│       │
│ │Sarah │ │James │ │Emma  │       │
│ │⭐4.9 │ │⭐4.7 │ │⭐4.8 │       │
│ │£35/hr│ │£45/hr│ │£38/hr│       │
│ └──────┘ └──────┘ └──────┘       │
└─────────────────────────────────────┘
```

- Matching criteria: same area + similar specialties + similar price range
- Horizontal scroll
- Max 6 coaches
- Helps parents who don't find the right fit keep browsing
- Helps coaches by keeping users in the ecosystem

## Acceptance Criteria

- [ ] Public coach profile page accessible without login
- [ ] SEO meta tags and Open Graph for social sharing
- [ ] Coach can copy/share booking link + QR code
- [ ] Coach can create trial/taster session offering
- [ ] Trial limited to 1 per family
- [ ] Trial shows on public profile and in discovery
- [ ] Coach home redesigned with earnings, today's sessions, wins, and attention items
- [ ] Earnings projection shows confirmed + projected for current month
- [ ] Trial conversion rate tracked in analytics
- [ ] "Book Now" on public profile goes to booking flow (requires login)
- [ ] Share button on coach profile (parent-facing) opens native share sheet
- [ ] Similar coaches section at bottom of coach profile (horizontal scroll, max 6)
- [ ] Similar coaches matched by area + specialties + price range

## Files Changed

| File | Action |
|------|--------|
| `app/coach/[coachId]/public.tsx` | CREATE — public profile page |
| `app/coach/[id].tsx` | ENHANCE (849 lines exist) — add share button, similar coaches section |
| `components/coach/share-profile.tsx` | CREATE — share link + QR |
| `components/coach/similar-coaches.tsx` | CREATE — horizontal scroll recommendations |
| `components/coach/trial-session-editor.tsx` | CREATE — trial offering |
| `components/coach/earnings-projection.tsx` | CREATE — earnings forecast |
| `app/(tabs)/index.tsx` | REWRITE (coach view) — inspiring dashboard |
| `app/earnings.tsx` | ENHANCE (903 lines exist) — add projections, trial conversion (NOTE: `(tabs)/earnings.tsx` is 1-line stub — consolidate) |
| `app/analytics/dashboard.tsx` | ENHANCE (501 lines exist) — integrate earnings projections |
| `app/analytics/revenue.tsx` | ENHANCE (542 lines exist) — add trial tracking |
| `services/analytics-service.ts` | MODIFY — trial conversion tracking |
| `constants/types.ts` | ADD — TrialSession, CoachSlug types |

## New Types

```typescript
interface TrialOffering {
  id: string;
  coachId: string;
  enabled: boolean;
  trialPriceGbp: number;
  normalPriceGbp: number;
  duration: number; // minutes (typically 30)
  limitPerFamily: number; // typically 1
  description: string;
  totalOffered: number;
  totalConverted: number;
}

interface CoachPublicProfile {
  slug: string; // URL-safe: "marcus-williams"
  isPublic: boolean;
  seoTitle?: string;
  seoDescription?: string;
  coverPhotoUrl?: string;
}
```

## API Endpoints (add to API_README)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/coaches/:slug/public` | None | None | `{publicProfile}` |
| PUT | `/api/coaches/:id/trial-offering` | Coach | `{enabled, trialPrice, duration, description}` | `{offering}` |
| GET | `/api/coaches/:id/analytics/trials` | Coach | None | `{trialStats}` |
| GET | `/api/coaches/:id/analytics/projection` | Coach | None | `{projection}` |

## DB Tables

```sql
ALTER TABLE users ADD COLUMN slug VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN is_public_profile BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN cover_photo_url TEXT;

CREATE TABLE trial_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  trial_price_gbp DECIMAL(10,2) NOT NULL,
  normal_price_gbp DECIMAL(10,2) NOT NULL,
  duration INTEGER DEFAULT 30,
  limit_per_family INTEGER DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trial_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_offering_id UUID REFERENCES trial_offerings(id),
  parent_id UUID REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  converted BOOLEAN DEFAULT FALSE, -- did they book a regular session after?
  converted_booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trial_usages_parent ON trial_usages(trial_offering_id, parent_id);
```
