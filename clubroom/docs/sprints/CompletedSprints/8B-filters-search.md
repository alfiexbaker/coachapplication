# 8B: Filter System + Search Suggestions

**Phase**: 2 — Differentiation
**Origin**: Sprint 8, Tasks 2, 6
**Estimated scope**: 2 tasks, discovery filtering + search UX

## Goal

Parents filter coaches by distance, price, age group, specialty, rating, availability. Search bar shows smart suggestions. Finding the right coach takes under 60 seconds.

## Tasks

### Task 1: Filter System

**File**: `components/discover/filter-bar.tsx` + `components/discover/filter-modal.tsx`

Persistent filter bar at top of discovery screens:

```
[Distance ▾] [Price ▾] [Age ▾]
[Specialty ▾] [Rating ▾] [More ▾]
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

### Task 2: Search Suggestions

**File**: `components/discover/search-suggestions.tsx`

When parent taps search bar:

```
Recent searches
  Goalkeeping coaches in Hackney
  1v1 training

Popular near you
  Dribbling coaches
  Saturday morning sessions
  Trial sessions in E8

Browse by area
  Hackney · Islington · Camden
  Tottenham · Stratford
```

## Acceptance Criteria

- [ ] Discovery has working filters (distance, price, age, specialty, rating, availability, trial, verified)
- [ ] Sort by: nearest, highest rated, lowest price, most reviewed
- [ ] Active filter badges shown with count, tappable to remove
- [ ] Search suggestions with recent searches and popular terms
- [ ] Filters persist across map/list toggle

## Files Changed

| File | Action |
|------|--------|
| `components/discover/filter-bar.tsx` | REBUILD |
| `components/discover/filter-modal.tsx` | REBUILD |
| `components/discover/search-suggestions.tsx` | CREATE |

## Dependencies

- **Blocks**: 8C (map uses same filters)
- **Blocked by**: 8A (discovery cards)
