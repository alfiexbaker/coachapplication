# 3A: Settings Hub + Scheduling Rules

**Phase**: 1 — Foundation
**Origin**: Sprint 3, Tasks 1, 2, 6
**Estimated scope**: 3 tasks, coach scheduling config + enforcement

## Goal

Coaches configure their scheduling rules via clean UI. Rules are enforced in the booking flow — parents can't book outside the coach's parameters.

## Tasks

### Task 1: Coach Settings Hub

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

### Task 2: Scheduling Rules Editor

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

Each control shows a helper line explaining what it does.

**Save**: Auto-save on each change (debounced 500ms). Show a subtle "Saved" toast.

### Task 3: Enforce Scheduling Rules in Booking Flow

**File**: `app/book-coach.tsx` (availability step)

When showing available slots:
- Filter out slots that violate `minimumAdvanceBookingHours`
- Don't show dates beyond `maxAdvanceBookingDays`
- If `allowSameDayBookings` is off, hide today's slots
- Show buffer time as unavailable between existing bookings

## Acceptance Criteria

- [ ] Coach can set all 7 scheduling rules via clean UI controls
- [ ] Settings auto-save with feedback toast
- [ ] All settings persist via `api-client.ts`
- [ ] Available slots respect scheduling rules (min notice, max advance, same-day, buffer)

## Files Changed

| File | Action |
|------|--------|
| `app/settings/coaching.tsx` | CREATE (integrate with existing `app/availability/scheduling-rules.tsx` 602 lines) |
| `components/coach/scheduling-rules-editor.tsx` | ENHANCE existing — extract reusable component |
| `app/book-coach.tsx` | MODIFY — enforce rules in slot display |
| `services/scheduling-rules-service.ts` | MODIFY — migrate to api-client |

## Dependencies

- **Blocks**: 3B (cancellation needs settings hub)
- **Blocked by**: 1A (api-client)
