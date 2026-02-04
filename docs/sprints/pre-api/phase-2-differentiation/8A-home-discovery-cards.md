# 8A: Parent Home + Discovery Cards

**Phase**: 2 — Differentiation
**Origin**: Sprint 8, Tasks 1, 4, 4b
**Estimated scope**: 3 tasks, parent-facing discovery

## Goal

Parent home screen is an engaging discovery experience. Coach cards show everything a parent needs at a glance. "Next available" slot is always fresh.

## Tasks

### Task 1: Parent Home Screen Redesign

**File**: `app/(tabs)/index.tsx` (parent view) — REDESIGN

```
┌─────────────────────────────────────┐
│ Hi Sarah                            │
│ Find the perfect coach for Jake     │
│                                     │
│ [Search coaches, areas...]          │
│                                     │
│ ┌─ Upcoming Sessions ──────────┐   │
│ │ Tomorrow 4pm — Coach Marcus  │   │
│ │ Hackney Downs Park    [View] │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Pending Invites (2) ────────┐   │
│ │ Coach Marcus invited Jake    │   │
│ │ [Accept] [View Details]      │   │
│ └──────────────────────────────┘   │
│                                     │
│ Featured Near You                   │
│ [Marcus ⭐4.8] [Sarah ⭐4.9] ...  │
│                                     │
│ Coaches for Jake's Level            │
│ [personalised recommendations]      │
│                                     │
│ Browse by Specialty                 │
│ [Dribbling] [Goalkeeping] [1v1]   │
│                                     │
│ [Open Map View]                     │
└─────────────────────────────────────┘
```

### Task 2: Coach Discovery Card

**File**: `components/discover/coach-card.tsx` — REDESIGN

```
┌─────────────────────────────────────┐
│ [Avatar]  Coach Marcus Williams     │
│           ⭐ 4.8 (23 reviews)      │
│           ✓ Verified                │
│                                     │
│ 📍 0.3 miles · Hackney Downs       │
│ 💰 From £40/hour                   │
│                                     │
│ [Dribbling] [Passing] [1v1 Skills] │
│                                     │
│ "Brilliant with kids..." — Sarah M. │
│                                     │
│ Next Available: Tue 4 Feb 4pm      │
│ [Book Now]                          │
│                                     │
│ TRIAL SESSION — £15                 │
└─────────────────────────────────────┘
```

Verification badge, distance, review quote, next available, trial badge, specialties as tags.

### Task 3: Next Available Slot — Always Fresh (Action→Reaction)

Coach cards show "Next: Tue 4 Feb 4pm" — this MUST stay current:
- When coach changes availability → recalculate next available
- When a slot gets booked → next available moves to next open slot
- When a booking is cancelled → freed slot may become new "next available"
- Implementation: `discover-service.ts` subscribes to availability/booking change events
- Fallback: "Available this week" if exact slot can't be computed

## Acceptance Criteria

- [ ] Parent home shows upcoming sessions, invites, saved coaches, featured, recommendations
- [ ] Coach cards show verification, distance, rating, next available, trial badge
- [ ] Next available slot auto-updates when availability/bookings change
- [ ] Browse by specialty taps filter discovery results

## Files Changed

| File | Action |
|------|--------|
| `app/(tabs)/index.tsx` | REWRITE (parent view) |
| `components/discover/coach-card.tsx` | REDESIGN |
| `services/discover-service.ts` | MODIFY — next available tracking |

## Dependencies

- **Blocks**: 8B (filter system sits on top of discovery)
- **Blocked by**: 1A (api-client)
