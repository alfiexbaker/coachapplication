# 9B: Session Plan Templates + Drill Library

**Phase**: 3 — Competitive Edge
**Origin**: Sprint 9, Tasks 4, 5
**Estimated scope**: 2 tasks, coach content library

## Goal

Coaches get 30+ pre-built session plans and a searchable drill library with video demos. Drills can be assigned to players directly.

## Tasks

### Task 1: Session Plan Templates

**File**: `app/sessions/plan-templates.tsx` + `components/coach/session-plan-picker.tsx`

Pre-built session plans coaches can use or customise:

**Templates included** (football-specific):

| Category | Plans |
|----------|-------|
| Dribbling | Fundamentals, 1v1 Skills, Close Control, Speed Dribbling |
| Passing | Short Passing, Long Passing, Passing Under Pressure, Combination Play |
| Shooting | Finishing Basics, Volleys & Half-Volleys, Shooting from Distance, 1v1 with Keeper |
| Defending | Tackling, Positioning, Pressing, 1v1 Defending |
| Goalkeeping | Shot Stopping, Distribution, Positioning, Crosses |
| Fitness | Speed & Agility, Endurance, Change of Direction |
| Tactical | Small-Sided Games, Team Shape, Set Pieces, Counter-Attack |

Each plan:
- Age-group appropriate (U7-U9, U10-U12, U13-U15, U16+)
- Timed warmup / main / cooldown sections
- Equipment list
- Coaching points per activity
- Can be used as-is or customised and saved

### Task 2: Drill Library with Video

**File**: `app/drills/library.tsx` — ENHANCE

Searchable drill library:

```
┌─────────────────────────────────────┐
│ Drill Library                       │
│ [Search drills...]                  │
│                                     │
│ [All] [Warmup] [Technique]         │
│ [Fitness] [Tactical] [Cooldown]    │
│                                     │
│ ┌──────────────────────────────┐   │
│ │ [▶ video thumbnail]          │   │
│ │ Cone Weave Dribbling         │   │
│ │ Technique · 10 min · Beginner│   │
│ │ Cones needed                 │   │
│ │ [Assign to Player] [Add to   │   │
│ │  Session Plan]               │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

- Pre-loaded drill database (30-50 football drills)
- Video demo for each (placeholder URLs for now, real videos later)
- Filter by category, difficulty, duration, equipment needed
- Coach can assign drills directly to players from library
- Coach can add drills to a session plan

## New Types

```typescript
interface SessionPlanTemplate {
  id: string;
  title: string;
  ageGroup: 'U7-U9' | 'U10-U12' | 'U13-U15' | 'U16+' | 'ALL';
  focus: string;
  duration: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  warmup: PlanActivity;
  mainActivities: PlanActivity[];
  cooldown: PlanActivity;
  equipment: string[];
  coachingPoints: string[];
  isSystem: boolean;
}

interface PlanActivity {
  title: string;
  duration: number;
  description: string;
  coachingPoints?: string[];
  diagram?: string;
}
```

## Acceptance Criteria

- [ ] 30+ session plan templates categorised by age group and focus
- [ ] Drill library with 30+ drills, filterable by category/difficulty/equipment
- [ ] Coaches can assign drills to players from library
- [ ] Coaches can add drills to session plans

## Files Changed

| File | Action |
|------|--------|
| `app/sessions/plan-templates.tsx` | CREATE |
| `components/coach/session-plan-picker.tsx` | CREATE |
| `app/drills/library.tsx` | ENHANCE (440 lines exist) |
| `app/drills/assign.tsx` | ENHANCE (736 lines exist) |
| `constants/session-plan-templates.ts` | CREATE — 30+ football plans |
| `constants/drill-library.ts` | CREATE — 30+ football drills |

## Dependencies

- **Blocks**: 9C (challenges reference drill library)
- **Blocked by**: 1A (api-client)
