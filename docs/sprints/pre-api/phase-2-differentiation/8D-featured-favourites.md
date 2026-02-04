# 8D: Featured Coaches + Favourites

**Phase**: 2 — Differentiation
**Origin**: Sprint 8, Tasks 5, 7
**Estimated scope**: 2 tasks, discovery intelligence + saved coaches

## Goal

Parents see featured and recommended coaches without searching. Favourite coaches are saved with heart icon and appear on home screen.

## Tasks

### Task 1: "Featured" and "Recommended" Logic

**File**: `services/discover-service.ts`

**Featured** (top of home screen):
- Verified coaches with 4.5+ rating
- Active in last 7 days (has upcoming sessions)
- Within user's area
- Rotated to give all qualifying coaches exposure

**Recommended for your child**:
- Matches child's age range (coach.ageMin/ageMax vs child.age)
- Matches child's skill level
- Matches child's position/specialty interests
- Higher weight for coaches with similar-aged athletes in roster

**Sort scoring** (for default "Best match" sort):
```
score = (rating * 30) + (distance_proximity * 25) + (availability_soon * 20) + (review_count * 15) + (verified * 10)
```

### Task 2: Favourites / Saved Coaches

**File**: `components/discover/favourite-button.tsx` + `services/favourite-service.ts`

Heart icon on coach cards and profile:

Tap heart → fills red with scale pop animation → coach saved.

**My Saved Coaches** section on parent home:
```
Saved Coaches (3)
┌──────┐ ┌──────┐ ┌──────┐
│Marcus│ │Sarah │ │James │
│♥     │ │♥     │ │♥     │
└──────┘ └──────┘ └──────┘
```

- Heart button on: coach cards (list), coach profile page, map bottom sheet card
- Saved coaches show different pin on map (heart icon)
- Saved coach list accessible from parent home
- Toggle: tap again to unsave with confirm

## Acceptance Criteria

- [ ] "Featured Near You" shows verified, high-rated, active coaches
- [ ] "Recommended for [Child]" personalised by age/skill level
- [ ] Featured coaches rotated for fair exposure
- [ ] Favourite button on coach cards + profile, heart fills with animation
- [ ] Saved coaches section on parent home
- [ ] Saved coaches show distinct pin on map

## Files Changed

| File | Action |
|------|--------|
| `components/discover/featured-coaches.tsx` | CREATE |
| `components/discover/recommended-coaches.tsx` | CREATE |
| `components/discover/favourite-button.tsx` | CREATE |
| `services/discover-service.ts` | MODIFY — scoring + featured logic |
| `services/favourite-service.ts` | ENHANCE (296 lines exist) |
| `app/favourites/index.tsx` | ENHANCE (269 lines exist) |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 8A (discovery cards), 7B (trial badge on featured)
