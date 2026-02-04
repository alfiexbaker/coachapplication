# 7B: Trial Sessions + Conversion Tracking

**Phase**: 2 — Differentiation
**Origin**: Sprint 7, Tasks 3, 6b
**Estimated scope**: 2 tasks, trial offering + analytics

## Goal

Coaches offer trial/taster sessions at a discount to attract new families. Conversion rate is tracked — coaches see which trials turn into regulars.

## Tasks

### Task 1: Trial / Taster Sessions

**File**: `components/coach/trial-session-editor.tsx`

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
└─────────────────────────────────────┘
```

**Rules**:
- One trial per family (tracked by parent ID)
- Shows on public profile with "TRIAL" badge
- Shows in discovery results with "Trial available" tag
- After trial, parent prompted: "How was it? Book your next session"
- Coach sees trial conversion rate in analytics

### Task 2: Trial Conversion Tracking

**File**: Add to `services/analytics-service.ts`

Track and display:
- Total trial sessions offered
- Trial sessions booked
- Conversions (parent who did trial → booked regular session)
- Conversion rate
- Revenue from converted trial parents

```
Trial Sessions
├── 12 trials this month
├── 8 converted to regular (67%)
├── £640 revenue from converts
└── Avg 3.2 sessions per convert
```

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
```

## Acceptance Criteria

- [ ] Coach can create trial/taster session offering
- [ ] Trial limited to 1 per family
- [ ] Trial shows on public profile and in discovery
- [ ] Trial conversion rate tracked in analytics
- [ ] Post-trial prompt: "Book your next session"

## Files Changed

| File | Action |
|------|--------|
| `components/coach/trial-session-editor.tsx` | CREATE |
| `services/analytics-service.ts` | MODIFY — trial conversion tracking |
| `app/analytics/revenue.tsx` | ENHANCE (542 lines exist) — add trial tracking |

## Dependencies

- **Blocks**: 8D (discovery shows trial badge)
- **Blocked by**: 7A (trial shows on public profile)
