# Sprint 3: Coach Settings — Scheduling Rules + Cancellation Policy

## Goal

Coaches can configure how their booking system works. Parents can see the rules before booking. Every field in `CoachSchedulingRules` and `CancellationPolicy` gets a UI.

## User Stories This Sprint Fixes

| Role | Story | Current State |
|------|-------|---------------|
| **Coach** | I want buffer time between sessions so I'm not rushed | ❌ No UI — type exists |
| **Coach** | I want to set minimum booking notice (e.g., 24 hours) | ❌ No UI — type exists |
| **Coach** | I want to limit how far ahead people can book | ❌ No UI — type exists |
| **Coach** | I want to allow/block same-day bookings | ❌ No UI — type exists |
| **Coach** | I want to set my cancellation/refund policy | ❌ No UI — type exists |
| **Coach** | I want to set how far in advance parents can reschedule | ❌ No UI — type exists |
| **Parent** | I want to know the cancellation policy before I book | ❌ **Critical gap** |
| **Parent** | I want to know how much notice I need to cancel | ❌ Not displayed |

## Task 1: Coach Settings Hub

**File**: `app/settings/coaching.tsx`

A clean settings screen accessible from coach profile/settings:

```
┌─────────────────────────────────────┐
│ Coaching Settings                   │
│                                     │
│ ┌─ Scheduling ─────────────────┐   │
│ │ Buffer between sessions  15m │   │
│ │ Minimum notice          24h  │   │
│ │ Max advance booking     30d  │   │
│ │ Same-day bookings       Off  │   │
│ │ Allow rescheduling      On   │   │
│ │ Reschedule deadline     12h  │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Cancellation Policy ────────┐   │
│ │ Policy: Standard             │   │
│ │ 24h+ before: Full refund     │   │
│ │ 12-24h: 50% refund           │   │
│ │ <12h: No refund              │   │
│ │ [Edit Policy]                │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Travel & Location ─────────┐   │
│ │ Travel radius         10 mi │   │
│ │ Primary location     Set →  │   │
│ │ Additional venues    Add →  │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

**UI guidance**: Use toggle rows, stepper inputs, and segmented controls. No text fields unless necessary. Feel like iOS Settings — clean, scannable, tappable.

## Task 2: Scheduling Rules Editor

**File**: `components/coach/scheduling-rules-editor.tsx`

Individual controls for each rule:

| Field | Control Type | Range |
|-------|-------------|-------|
| `bufferMinutesDefault` | Stepper (5 min increments) | 0–60 min |
| `minimumAdvanceBookingHours` | Stepper (1h increments) | 0–72h |
| `maxAdvanceBookingDays` | Stepper (7-day increments) | 7–90 days |
| `allowSameDayBookings` | Toggle switch | On/Off |
| `allowRescheduling` | Toggle switch | On/Off |
| `rescheduleDeadlineHours` | Stepper (1h increments) | 1–48h |
| `maxConcurrentDefault` | Stepper (1 increments) | 1–5 |

Each control shows a helper line explaining what it does:
- Buffer: "Time between sessions to travel or prepare"
- Min notice: "How far ahead parents must book"
- etc.

**Save**: Auto-save on each change (debounced 500ms). Show a subtle "Saved" toast.

## Task 3: Cancellation Policy Editor

**File**: `components/coach/cancellation-policy-editor.tsx`

**Default policies** (pick one or customise):

| Policy | 24h+ | 12-24h | <12h |
|--------|------|--------|------|
| Flexible | Full refund | Full refund | 50% refund |
| Standard | Full refund | 50% refund | No refund |
| Strict | Full refund | No refund | No refund |
| Custom | Edit tiers... | | |

For MVP with cash-only payments, this is about setting expectations, not processing refunds. Display as: "If you cancel less than 12 hours before, you may still owe the full session fee."

**Custom policy editor**:
- Add/remove refund tiers
- Each tier: hours threshold + refund percentage + description
- Drag to reorder
- Preview: "This is what parents will see"

## Task 4: Display Policy on Booking Confirmation

**File**: `app/book-coach.tsx` (Step 4 — confirm) and `app/confirm-booking.tsx`

Before parent confirms, show:

```
┌─ Cancellation Policy ──────────────┐
│ 🔒 Standard Policy                 │
│                                     │
│ • 24h+ before: Full refund         │
│ • 12-24h before: 50% refund        │
│ • Less than 12h: No refund         │
│                                     │
│ By booking, you agree to this       │
│ cancellation policy.                │
└─────────────────────────────────────┘
```

## Task 5: Travel Radius Setting

**File**: `components/coach/travel-radius-picker.tsx`

- Slider: 1–50 miles (or km toggle)
- Map preview showing radius circle around coach's postcode
- Saves to `coach.travelRadius`

## Task 6: Enforce Scheduling Rules in Booking Flow

**File**: `app/book-coach.tsx` (availability step)

When showing available slots:
- Filter out slots that violate `minimumAdvanceBookingHours`
- Don't show dates beyond `maxAdvanceBookingDays`
- If `allowSameDayBookings` is off, hide today's slots
- Show buffer time as unavailable between existing bookings

## Acceptance Criteria

- [ ] Coach can set all 7 scheduling rules via clean UI controls
- [ ] Coach can pick a default policy or create custom cancellation tiers
- [ ] Coach can set travel radius with visual map preview
- [ ] Cancellation policy displays on booking confirmation screen
- [ ] Available slots respect scheduling rules (min notice, max advance, same-day, buffer)
- [ ] Settings auto-save with feedback toast
- [ ] All settings persist via `api-client.ts`

## Files Changed

| File | Action |
|------|--------|
| `app/settings/coaching.tsx` | CREATE — coach settings hub |
| `components/coach/scheduling-rules-editor.tsx` | CREATE |
| `components/coach/cancellation-policy-editor.tsx` | CREATE |
| `components/coach/travel-radius-picker.tsx` | CREATE |
| `app/book-coach.tsx` | MODIFY — show policy, enforce rules |
| `app/confirm-booking.tsx` | MODIFY — show policy |
| `services/scheduling-rules-service.ts` | MODIFY — migrate to api-client |
| `services/availability-service.ts` | MODIFY — enforce rules when generating slots |
