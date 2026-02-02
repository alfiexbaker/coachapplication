# Sprint 8: Discovery That Actually Works

## Goal

Parents can find the right coach in under 60 seconds. Real filters, working map, featured coaches, trending in your area. This is the shop window — if discovery is weak, nothing else matters.

## Why This Matters

Currently: parent enters a postcode, sees a list. No filters, no map, no featured coaches, no recommendations. ClassForKids and OpenPlay have marketplaces with 100k+ monthly visitors. Spond has zero discovery. Our discovery needs to be 10x better than "enter a postcode."

## User Stories

| Role | Story |
|------|-------|
| **Parent** | I want to see coaches near me on a map so I can pick one close by |
| **Parent** | I want to filter by what my child needs (age group, skill level, specialty) |
| **Parent** | I want to filter by price so I find coaches in my budget |
| **Parent** | I want to see who's highest rated so I pick someone trusted |
| **Parent** | I want to see who has availability this week so I can book soon |
| **Parent** | I want to see featured/recommended coaches so I don't have to search blind |
| **Parent** | I want to see "trial available" so I can try before committing |
| **Parent** | I want to browse without knowing my postcode (use my GPS location) |
| **Parent** | I want to see coach specialties at a glance so I find the right fit |
| **Athlete** | I want to find a coach who works with my age/skill level |
| **Coach** | I want to appear in search results with my best foot forward |
| **Coach** | I want "trial available" to make me stand out in results |

## Task 1: Parent Home Screen Redesign

**File**: `app/(tabs)/index.tsx` (parent view) — REDESIGN

Replace the plain postcode search with an engaging discovery home:

```
┌─────────────────────────────────────┐
│ Hi Sarah 👋                         │
│ Find the perfect coach for Jake     │
│                                     │
│ [🔍 Search coaches, areas...]       │
│                                     │
│ ┌─ Upcoming Sessions ──────────┐   │
│ │ Tomorrow 4pm — Coach Marcus  │   │
│ │ Passing & Movement           │   │
│ │ Hackney Downs Park    [View] │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Pending Invites (2) ────────┐   │
│ │ Coach Marcus invited Jake    │   │
│ │ to a 1:1 session             │   │
│ │ [Accept] [View Details]      │   │
│ └──────────────────────────────┘   │
│                                     │
│ Featured Near You                   │
│ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │[foto]│ │[foto]│ │[foto]│       │
│ │Marcus│ │Sarah │ │James │       │
│ │⭐4.8 │ │⭐4.9 │ │⭐4.7 │       │
│ │£40/hr│ │£35/hr│ │£45/hr│       │
│ │TRIAL │ │      │ │TRIAL │       │
│ └──────┘ └──────┘ └──────┘       │
│                                     │
│ Coaches for Jake's Level            │
│ (Intermediate · Age 10)             │
│ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │ ...personalised recommendations │ │
│ └──────┘ └──────┘ └──────┘       │
│                                     │
│ Browse by Specialty                 │
│ [Dribbling] [Goalkeeping] [1v1]   │
│ [Passing] [Fitness] [Tactical]    │
│                                     │
│ [🗺️ Open Map View]                 │
└─────────────────────────────────────┘
```

**Key design decisions**:
- Upcoming sessions FIRST (parents with existing bookings see them immediately)
- Pending invites prominent (don't miss these)
- Featured coaches = horizontal scroll cards (like Uber Eats restaurants)
- Personalised recommendations based on child's age + skill level
- Browse by specialty = tap to filter
- Map view accessible but not default (most parents prefer scrolling)

## Task 2: Filter System

**File**: `components/discover/filter-bar.tsx` + `components/discover/filter-modal.tsx`

Persistent filter bar at top of discovery screens:

```
┌─────────────────────────────────────┐
│ [Distance ▾] [Price ▾] [Age ▾]    │
│ [Specialty ▾] [Rating ▾] [More ▾] │
└─────────────────────────────────────┘
```

**Filters**:

| Filter | Type | Options |
|--------|------|---------|
| Distance | Slider | 1-25 miles from location |
| Price | Range slider | £10-£100/hr |
| Age group | Multi-select | Under 7, 7-9, 10-12, 13-15, 16-18, Adult |
| Specialty | Multi-select | Dribbling, Passing, Shooting, Defending, Goalkeeping, Fitness, Tactical, 1v1, Team Play |
| Rating | Minimum | 3+, 4+, 4.5+ stars |
| Availability | Toggle | "Available this week" |
| Session type | Multi-select | 1-on-1, Small group, Team session |
| Trial available | Toggle | Show only coaches with trial sessions |
| Verified | Toggle | Show only verified coaches |

**Sort options**: Nearest, Highest rated, Lowest price, Most reviewed, Recently active

**Active filter badges**: Show count of active filters. Each badge tappable to remove.

## Task 3: Map View That Works

**File**: `app/discover/map.tsx` — REBUILD

Full-screen map with coach pins:

```
┌─────────────────────────────────────┐
│ [🔍 Search this area]              │
│                                     │
│        [MAP]                        │
│    📍         📍                    │
│         📍                          │
│              📍    📍               │
│    📍                               │
│                   📍                │
│                                     │
│ ┌──────────────────────────────┐   │
│ │ [Avatar] Coach Marcus        │   │
│ │ ⭐ 4.8 · £40/hr · 0.3 mi   │   │
│ │ Dribbling, Passing, 1v1     │   │
│ │ TRIAL AVAILABLE             │   │
│ │ Next: Tue 4 Feb 4pm         │   │
│ │ [View Profile] [Book Now]   │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

- Use device GPS for initial location (ask permission)
- Cluster pins when zoomed out
- Tap pin to show coach preview card (bottom sheet)
- Swipe between coaches on the bottom card
- "Search this area" button when map is panned
- Filter bar accessible as overlay on map
- Toggle to list view preserves active filters

## Task 4: Coach Discovery Card

**File**: `components/discover/coach-card.tsx` — REDESIGN

The card that represents a coach in search results:

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
│ "Brilliant with kids. My son's     │
│  confidence has improved so much"   │
│  — Sarah M.                        │
│                                     │
│ ┌─ Next Available ─────────────┐   │
│ │ Tue 4 Feb · 4:00pm          │   │
│ │ [Book Now]                   │   │
│ └──────────────────────────────┘   │
│                                     │
│ 🎁 TRIAL SESSION — £15            │
└─────────────────────────────────────┘
```

**Key elements**:
- Verification badge prominently shown
- Distance calculated from user location
- One-line review quote (best review)
- Next available slot with instant book
- Trial badge if available
- Specialties as tags

## Task 5: "Featured" and "Recommended" Logic

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

## Task 6: Search Suggestions

**File**: `components/discover/search-suggestions.tsx`

When parent taps search bar, show:

```
┌─────────────────────────────────────┐
│ 🔍 [                              ]│
│                                     │
│ Recent searches                     │
│   Goalkeeping coaches in Hackney    │
│   1v1 training                      │
│                                     │
│ Popular near you                    │
│   Dribbling coaches                 │
│   Saturday morning sessions         │
│   Trial sessions in E8              │
│                                     │
│ Browse by area                      │
│   Hackney · Islington · Camden     │
│   Tottenham · Stratford            │
└─────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] Parent home shows upcoming sessions, invites, featured coaches, personalised recommendations
- [ ] Discovery has working filters (distance, price, age, specialty, rating, availability, trial, verified)
- [ ] Map view shows coach pins with bottom-sheet preview
- [ ] Map uses device GPS for initial location
- [ ] Coach cards show verification, distance, rating, next available slot, trial badge
- [ ] "Featured Near You" shows verified, high-rated, active coaches
- [ ] "Recommended for [Child]" personalised by age/skill level
- [ ] Search suggestions with recent searches and popular terms
- [ ] Filters persist across map/list toggle
- [ ] Sort by: nearest, highest rated, lowest price, most reviewed

## Files Changed

| File | Action |
|------|--------|
| `app/(tabs)/index.tsx` | REWRITE (parent view) — discovery home |
| `app/discover/map.tsx` | REBUILD — working map with pins |
| `components/discover/coach-card.tsx` | REDESIGN |
| `components/discover/filter-bar.tsx` | REBUILD — real filters |
| `components/discover/filter-modal.tsx` | REBUILD — full filter options |
| `components/discover/search-suggestions.tsx` | CREATE |
| `components/discover/featured-coaches.tsx` | CREATE — horizontal scroll |
| `components/discover/recommended-coaches.tsx` | CREATE — personalised |
| `services/discover-service.ts` | REWRITE — filtering, scoring, search |
