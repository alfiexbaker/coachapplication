# 7C: Coach Dashboard + Earnings + Reviews + Similar Coaches

**Phase**: 2 — Differentiation
**Origin**: Sprint 7, Tasks 4, 5, 6, 8, 8b, 8c, 9
**Estimated scope**: 7 tasks, coach business intelligence

## Goal

Coach home is an inspiring business dashboard. Earnings projections. Manual booking confirmation. Review responses. Price change notifications. Similar coaches for discovery. This is the coach's cockpit.

## Tasks

### Task 1: Coach Dashboard Redesign

**File**: `app/(tabs)/index.tsx` (coach view) — REDESIGN

```
┌─────────────────────────────────────┐
│ Good morning, Marcus                │
│                                     │
│ ┌─ This Week ──────────────────┐   │
│ │  £320        8          4.9  │   │
│ │  earned    sessions    rating │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Today's Sessions ───────────┐   │
│ │ 4:00  Jake B. (1:1)         │   │
│ │ 5:30  U12 Group (6/8)       │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Needs Attention ────────────┐   │
│ │ 2 sessions to complete       │   │
│ │ 3 unread messages            │   │
│ │ 1 pending booking            │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Recent Wins ────────────────┐   │
│ │ ⭐ New 5-star review         │   │
│ │ 3 new families booked        │   │
│ └──────────────────────────────┘   │
│                                     │
│ [+ Create Session] [Share Profile] │
└─────────────────────────────────────┘
```

Leads with EARNINGS. Today's schedule front and center. "Needs attention" for actionable items.

### Task 2: Earnings Projection

**File**: `components/coach/earnings-projection.tsx`

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
│ Best session type: 1-on-1 (£40/hr) │
│ Busiest day: Saturday               │
│ Repeat rate: 78%                    │
└─────────────────────────────────────┘
```

### Task 3: Booking Confirmation Option (Action→Reaction)

Coach can choose auto-confirm OR manual confirm for new bookings:

**Auto-confirm (default)**: Parent books → booking confirmed instantly.

**Manual confirm**: Parent books → booking goes to PENDING → coach gets notification:
```
┌─────────────────────────────────────┐
│ New booking request                 │
│                                     │
│ Sarah M. wants to book Jake for     │
│ 1:1 Training — Tue 4 Feb 4pm      │
│                                     │
│ [Confirm]  [Suggest Alternative]    │
│ [Decline]                           │
└─────────────────────────────────────┘
```

**Parent Reaction:**
- Manual confirm: "Booking requested — waiting for coach to confirm"
- Coach confirms: "Booking confirmed!" + [Add to Calendar]
- Coach suggests alternative: opens counter-offer flow
- Coach declines: "Coach Marcus can't do this time. [See Other Coaches]"
- No response in 24h: auto-remind coach

### Task 4: Review Response System (Action→Reaction)

**File**: `components/coach/review-response.tsx`

Coach can respond to any review publicly:
- One reply per review (no back-and-forth)
- Reply visible on public profile
- For 1-2 star reviews: private support prompt
- **Parent Reaction:** "Coach Marcus replied to your review" → deep link

### Task 5: Favourite Analytics for Coaches

Anonymous favourite data in analytics:
```
Profile Performance
├── 47 profile views this month
├── 12 parents saved your profile
├── 8 enquiries (messages)
├── 5 bookings from discovery
└── Conversion: 10.6% view → booking
```

### Task 6: Price Change Notification (Action→Reaction)

When coach updates hourly rate:
- Parents with FUTURE bookings: "Coach updated rate to £50/hr. Your existing bookings remain at £40."
- Existing confirmed bookings NOT repriced
- Coach warned: "You have 3 upcoming bookings at £40/hr. These won't change."

### Task 7: Similar Coaches Section

**File**: `components/coach/similar-coaches.tsx`

At bottom of coach profile, horizontal scroll of related coaches:
- Matching criteria: same area + similar specialties + similar price range
- Max 6 coaches
- Helps parents keep browsing if not the right fit

## Acceptance Criteria

- [ ] Coach home redesigned with earnings, sessions, wins, attention items
- [ ] Earnings projection shows confirmed + projected for current month
- [ ] Manual booking confirmation option with parent notification flow
- [ ] Coach can reply to reviews publicly, parent notified
- [ ] Anonymous favourite analytics (views, saves, conversion)
- [ ] Price changes notify affected parents, existing bookings honoured
- [ ] Similar coaches section on coach profile (horizontal scroll, max 6)

## Files Changed

| File | Action |
|------|--------|
| `app/(tabs)/index.tsx` | REWRITE (coach view) |
| `components/coach/earnings-projection.tsx` | CREATE |
| `components/coach/booking-request.tsx` | CREATE |
| `components/coach/review-response.tsx` | CREATE |
| `components/coach/similar-coaches.tsx` | CREATE |
| `app/earnings.tsx` | ENHANCE (903 lines exist) |
| `app/analytics/dashboard.tsx` | ENHANCE (501 lines exist) |
| `services/booking-service.ts` | MODIFY — manual confirm |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 6D (needs AWAITING_CONFIRMATION type), 7A (public profile)
