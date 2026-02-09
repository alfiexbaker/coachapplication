# 8C: Airbnb-Quality Map Experience

**Phase**: 2 — Differentiation
**Origin**: Sprint 8, Tasks 3, 8
**Estimated scope**: 1 large task, the full MAP_EXPERIENCE.md spec

## Goal

The map is Airbnb-quality. Price-pill pins, bidirectional linking, bottom sheet carousel, GPS, clustering, progressive loading. See `MAP_EXPERIENCE.md` for the full 23K-word spec.

## Tasks

### Task 1: Full Map Implementation

**File**: `app/discover/map.tsx` + many components

Key implementation summary:
- **react-native-maps** replacing the current grid-based MapView
- **Price-pill pins** (not dots) — `£40/hr` on white pill, selected goes dark
- **@gorhom/bottom-sheet** with 3 snap points: collapsed, card carousel, full list
- **Bidirectional linking**: tap pin → card scrolls, swipe card → map pans
- **"Search this area"** button after 600ms of no movement
- **GPS first**, postcode fallback, pulsing blue dot
- **Clustering** with supercluster, tap to zoom
- **Progressive loading**: skeleton pins → real pins with staggered fade
- **Filter ↔ map sync**: pins fade in/out in real-time when filters change

See `MAP_EXPERIENCE.md` for the full spec including all components, files, gestures, performance targets, and acceptance criteria.

## Acceptance Criteria

- [ ] Map renders with react-native-maps (real tiles, real zoom, real pan)
- [ ] Coach pins show price per hour (price-pill pins)
- [ ] Pin selection highlights pin + shows card in bottom sheet
- [ ] Swiping card carousel moves map to corresponding coach
- [ ] "Search this area" appears after pan
- [ ] Map uses device GPS for initial location, postcode fallback
- [ ] Clustering at 3+ coaches within 500m
- [ ] Saved coaches show distinct pin on map (heart icon)
- [ ] 60fps with 50 pins on screen

## Files Changed

| File | Action |
|------|--------|
| `app/discover/map.tsx` | REWRITE |
| `components/discover/MapView.tsx` | REWRITE — react-native-maps |
| `components/discover/CoachMarker.tsx` | REWRITE — price-pill pins |
| `components/discover/ClusterMarker.tsx` | CREATE |
| `components/discover/MapBottomSheet.tsx` | CREATE |
| `components/discover/CoachCardCarousel.tsx` | CREATE |
| `components/discover/SearchThisArea.tsx` | CREATE |
| `components/discover/MapSearchHeader.tsx` | CREATE |
| `components/discover/UserLocationMarker.tsx` | CREATE |
| `components/discover/SkeletonPins.tsx` | CREATE |
| `services/discover-service.ts` | REWRITE — bounds search + clustering |
| `services/geocoding-service.ts` | CREATE |
| `hooks/useMapCoaches.ts` | CREATE |
| `hooks/useUserLocation.ts` | CREATE |

## Dependencies

- **Blocks**: Nothing (the map is self-contained)
- **Blocked by**: 8B (uses same filter system)
