# The Map Experience — Airbnb-Quality Coach Discovery

> This replaces Sprint 8 Task 3 with a full specification.
> The map is not a feature. It's the shop window. It must be exceptional.

## Why Airbnb-Level

Airbnb's map is the gold standard because it solves the same problem we solve: **spatial discovery of people/places with rich context.** Parents choosing a coach is like travelers choosing a home — location matters, but so does trust, price, availability, and vibe. We steal every pattern that applies.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    MapScreen                      │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │              SearchHeader                    │ │
│  │  [← Back] [🔍 Search...] [☰ List] [♡]     │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │           FilterChipBar                      │ │
│  │  [Price ▾] [Distance ▾] [Rating ▾]         │ │
│  │  [Age ▾] [Trial ✓] [Available ✓]           │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │                                               │ │
│  │              MapView                          │ │
│  │    (react-native-maps + custom markers)       │ │
│  │                                               │ │
│  │      [£40]        [£35]                      │ │
│  │              [£45]                            │ │
│  │   [3]                    [£30]               │ │
│  │          [£50]                               │ │
│  │                     [£40]                    │ │
│  │                                               │ │
│  │         [ Search this area ]                  │ │
│  │                                               │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │         BottomSheet (snap points)             │ │
│  │  ┌──────────────────────────────────────┐   │ │
│  │  │        CoachCardCarousel             │   │ │
│  │  │  ← [Card 1] [Card 2] [Card 3] →     │   │ │
│  │  └──────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## The Pin System — Price-First, Two-Tier

Stolen directly from Airbnb. Pins show **price**, not just location dots.

### Full Pins (high relevance)
```
┌─────────┐
│  £40/hr │   ← White rounded pill, dark text
└────┬────┘
     ▼        ← Small pointer triangle
```
- White background, dark text, subtle shadow
- Shows per-hour rate
- Given to coaches with relevance score in top 60% of viewport
- Selected state: dark background, white text, scale 1.1

### Mini Pins (lower relevance)
```
  ●    ← Small 12px circle, grey fill
```
- Coaches outside top 60% by relevance score
- Expand to full pin on tap or zoom in
- Prevents visual overload in dense areas

### Cluster Pins
```
┌─────┐
│  7  │   ← Circle with count, brand colour background
└─────┘
```
- Shown when 3+ coaches within ~500m at current zoom
- Tap to zoom into cluster bounds
- Animate: cluster explodes into individual pins

### Pin States

| State | Appearance | Trigger |
|-------|-----------|---------|
| Default | White pill, dark text | Initial load |
| Selected | Dark pill, white text, scale 1.1 | Tap pin OR swipe to card |
| Visited | Grey pill, muted text | Coach profile already viewed this session |
| Trial | White pill + green "TRIAL" badge below | Coach has trial offering |
| Favourite | White pill + small red heart top-right | Parent has favourited |

### Pin Relevance Scoring
```
relevanceScore = (
  (rating * 25) +
  (distanceProximity * 30) +     // closer = higher
  (availabilitySoon * 20) +       // next slot within 48h = bonus
  (reviewCount * 10) +
  (verified * 10) +
  (trialAvailable * 5)
)

if (relevanceScore >= viewport70thPercentile) → full pin
else → mini pin
```

Recalculated on every viewport change. Pins animate between full/mini states.

## The Bottom Sheet — Three Snap Points

Using `@gorhom/bottom-sheet` with three detents:

### Collapsed (default) — 80px
```
┌─────────────────────────────────────┐
│ ─── drag handle ───                  │
│ 12 coaches nearby                    │
└─────────────────────────────────────┘
```
- Shows result count only
- Maximum map visibility
- Default state when no pin selected

### Card View (on pin tap) — 200px
```
┌─────────────────────────────────────┐
│ ─── drag handle ───                  │
│                                     │
│ ┌─────┐ Coach Marcus Williams      │
│ │     │ ⭐ 4.8 (23) · ✓ Verified  │
│ │ 📸  │ 📍 0.3 mi · Hackney Downs │
│ │     │ £40/hr                      │
│ └─────┘                             │
│ [Dribbling] [Passing] [1v1]        │
│ 🎁 TRIAL — £15                     │
│ Next: Tue 4 Feb · 4pm              │
│                                     │
│ [View Profile]     [Book Now]       │
│                                     │
│  ←  ● ○ ○ ○ ○  →  (card dots)     │
└─────────────────────────────────────┘
```
- Horizontal card carousel (FlatList, pagingEnabled)
- Swiping cards animates map to centre on that coach's pin
- Tapping a different pin scrolls carousel to that card
- Card shows: photo, name, rating, verified, distance, price, specialties, trial badge, next available, book CTA
- "Book Now" goes directly to booking wizard with coach + next slot pre-selected

### Full List (pull up) — 85% screen height
```
┌─────────────────────────────────────┐
│ ─── drag handle ───                  │
│                                     │
│ [🔍 Search coaches...]              │
│                                     │
│ 12 results · Sorted by: Best match  │
│                                     │
│ ┌──────────────────────────────┐   │
│ │ Full coach card (same as     │   │
│ │ list view cards)             │   │
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ Full coach card              │   │
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ Full coach card              │   │
│ └──────────────────────────────┘   │
│ ...                                 │
└─────────────────────────────────────┘
```
- Full scrollable list view overlaid on map
- Map visible behind (blurred or dimmed)
- Pull down to return to card view
- Sort picker accessible here
- Same coach cards as list discovery view

## Bidirectional Pin ↔ Card Linking

This is what makes it feel magical:

### Pin tap → Card
1. User taps a pin
2. Pin animates to selected state (dark, scale 1.1) — 200ms spring
3. Bottom sheet snaps to card view (200px) — 300ms spring
4. Carousel scrolls to matching coach card — 250ms ease
5. Map animates to centre pin in upper 60% of screen (leave room for sheet)

### Card swipe → Pin
1. User swipes carousel to next card
2. Previous pin deselects (shrinks, goes white) — 150ms
3. New pin selects (grows, goes dark) — 200ms spring
4. Map pans to centre new pin — 400ms ease-in-out
5. Both animations happen simultaneously

### Pin tap on already-selected
1. Navigate to full coach profile

### Implementation
```typescript
// Shared state between map and carousel
const selectedCoachId = useSharedValue<string | null>(null);
const carouselIndex = useSharedValue(0);

// When pin tapped
const onPinPress = (coachId: string, index: number) => {
  selectedCoachId.value = coachId;
  carouselRef.current?.scrollToIndex({ index, animated: true });
  mapRef.current?.animateToRegion(getRegionForCoach(coachId), 400);
  bottomSheetRef.current?.snapTo(1); // card view
};

// When carousel swiped
const onCarouselSnap = (index: number) => {
  const coach = visibleCoaches[index];
  selectedCoachId.value = coach.id;
  mapRef.current?.animateToRegion(getRegionForCoach(coach.id), 400);
};
```

## "Search This Area" — Manual Trigger

NOT auto-search on pan (too expensive, too jarring on mobile).

### Behaviour
1. User pans or zooms the map
2. After 600ms of no movement, a floating button fades in at top centre:
   ```
   ┌──────────────────────┐
   │ 🔍 Search this area  │
   └──────────────────────┘
   ```
3. Button has subtle shadow + white background + brand border
4. Tap → loading spinner replaces text → fetch coaches in viewport bounds
5. New pins animate in (fade + scale from 0.5 to 1.0, staggered 30ms each)
6. Old pins that are no longer relevant fade out (200ms)
7. Button disappears
8. Bottom sheet updates result count

### Viewport Bounds API
```typescript
// On button press
const bounds = await mapRef.current?.getMapBoundaries();
const coaches = await discoverService.searchInBounds({
  northEast: bounds.northEast,
  southWest: bounds.southWest,
  filters: activeFilters,
  limit: 50,
});
```

### Rate Limiting
- Debounce viewport changes: 600ms
- Maximum fetch frequency: once per 2 seconds
- Maximum coaches per viewport: 50 (paginated)
- Show "Zoom in to see more coaches" if viewport is too large

## GPS + Location Flow

### First Launch — Permission Request
```
┌─────────────────────────────────────┐
│                                     │
│         📍                          │
│                                     │
│   Find coaches near you             │
│                                     │
│   We use your location to show      │
│   coaches in your area. You can     │
│   also search by postcode.          │
│                                     │
│   [Use My Location]                 │
│                                     │
│   [Enter Postcode Instead]          │
│                                     │
└─────────────────────────────────────┘
```

### Permission Granted
1. Get current coordinates via `expo-location`
2. Centre map on user location
3. Show blue dot pulsing at user position
4. Fetch coaches within default 10km radius
5. User location marker:
   ```
   ┌───┐
   │ ● │  ← Blue dot with pulsing ring (Reanimated loop)
   └───┘
   ```

### Permission Denied
1. Show postcode input field at top of map
2. Centre map on last known location (or London default: 51.5074, -0.1278)
3. Geocode postcode to coordinates when entered
4. Subtle banner: "Enable location for better results" with settings link
5. Never ask again during the same session

### Postcode → Coordinates
```typescript
// Use expo-location geocoding
const geocode = async (postcode: string): Promise<{lat: number, lng: number}> => {
  const results = await Location.geocodeAsync(postcode);
  if (results.length === 0) throw new Error('Invalid postcode');
  return { lat: results[0].latitude, lng: results[0].longitude };
};
```

### Coach Geocoding (background)
- Coaches enter their postcode/area during profile setup (Sprint 10 onboarding)
- Server geocodes to lat/lng and stores in `users.location` (PostGIS POINT)
- Re-geocode if coach updates their area
- For mock data: assign realistic London coordinates to each mock coach

## Filter ↔ Map Real-Time Sync

When a filter changes, the map updates immediately without a separate search action.

### Behaviour
1. User taps a filter chip (e.g., "Price: £20-£40")
2. Filter modal opens with current values
3. User adjusts → "Apply" pressed
4. Modal closes
5. Pins that no longer match **fade out** (150ms, scale to 0.8)
6. Pins that newly match **fade in** (200ms, scale from 0.5, staggered 20ms)
7. Bottom sheet result count updates
8. Filter chip shows active state (filled background)
9. If no results in current viewport: show "No coaches match. Try adjusting filters" in bottom sheet

### Filter Persistence
- Filters persist across: map ↔ list toggle, back navigation, app background
- Stored in React context (not async storage for speed)
- Reset button clears all filters with confirm dialog
- Active filter count shown on filter icon everywhere

### Filter Chip Bar on Map
```
┌─────────────────────────────────────────┐
│ [£20-40 ✕] [4+ ★ ✕] [Trial ✓] [+3]  │
└─────────────────────────────────────────┘
```
- Horizontal scroll
- Active filters show as removable chips
- "+3" badge for overflow filters
- Tap chip to remove that filter
- Tap "+3" to open full filter modal
- Semi-transparent background so map shows through

## Map Loading Strategy

### Progressive Loading (feel fast)
1. **Instant** (0ms): Map tiles render (cached from OS map SDK)
2. **Fast** (0-200ms): User location blue dot appears
3. **Loading** (200-800ms): Skeleton pins appear at approximate positions (grey circles, no data)
4. **Complete** (800ms+): Skeleton pins morph into real pins with prices (scale + fade)

### Skeleton Pins
```
  ◌    ← 16px grey circle with shimmer animation
```
- 8-12 skeleton pins placed in a realistic spread around viewport centre
- Shimmer animation (left-to-right wave, 1.5s loop)
- Replaced by real pins when data arrives
- If data arrives fast (<300ms), skip skeleton entirely

### Error State (network failure)
```
┌─────────────────────────────────────┐
│                                     │
│         [MAP still visible]         │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Couldn't load coaches       │  │
│  │  Check your connection       │  │
│  │  [Retry]                     │  │
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```
- Map tiles still show (cached)
- Error banner overlaid on bottom sheet
- Retry button
- Existing pins stay if previously loaded (stale data better than no data)

## Clustering Logic

### When to Cluster
- 3+ coaches within **500m** at current zoom level
- Recalculate on every zoom change
- Use supercluster algorithm (pre-computed spatial index)

### Cluster Behaviour
1. **Zoomed out**: Show cluster circle with count
2. **Tap cluster**: Animate zoom to show all coaches in cluster (fitToCoordinates with padding)
3. **Zoom animation**: 400ms ease-in-out
4. **Cluster splits**: Cluster circle morphs into individual pins (scale out + spread)
5. **Zoom out**: Individual pins converge back into cluster (reverse animation)

### Cluster Pin Design
```
┌─────┐
│  7  │  ← Brand primary colour circle, white text, size proportional to count
└─────┘
```
- Size: 36px (3-5 coaches), 44px (6-15), 52px (16+)
- On press: scale 0.95 feedback, then zoom
- Show price range on hover/long-press: "£30-£55/hr"

## Map ↔ List Toggle

Seamless switch preserving all state.

### Toggle Button
```
Top-right of search header:
  List view: [☰] (three lines icon)
  Map view:  [🗺️] (map icon)
```

### Transition Animation
- Map → List: Map shrinks upward while list fades in from below (300ms)
- List → Map: List slides down while map expands from top (300ms)
- During transition: filter bar stays fixed (doesn't animate)
- Shared element: filter bar, search header, result count

### State Preserved
- Active filters ✓
- Sort order ✓
- Scroll position in list ✓
- Selected coach (highlighted in both views) ✓
- Viewport bounds (list shows same coaches as current map view) ✓

## Gestures

| Gesture | Action |
|---------|--------|
| Single tap on map | Deselect current pin, collapse bottom sheet |
| Single tap on pin | Select pin, show card |
| Double tap on map | Zoom in one level, centred on tap point |
| Pinch | Zoom in/out |
| Pan | Move map viewport |
| Long press on map | Show coordinates (debug only) |
| Swipe bottom sheet down | Collapse to count view |
| Swipe bottom sheet up | Expand to full list |
| Swipe card carousel | Navigate between coaches |

### Gesture Conflict Resolution
- Bottom sheet gestures take priority over map gestures in sheet area
- `pointerEvents="box-none"` on GestureHandlerRootView
- Map receives gestures only in the map area (above bottom sheet)
- When bottom sheet is at full height, map gestures disabled

## Performance Targets

| Metric | Target |
|--------|--------|
| Map load (cached tiles) | < 300ms |
| First pins visible | < 800ms |
| Pin tap → card shown | < 150ms |
| Card swipe → map pan | < 100ms (start), < 400ms (complete) |
| Filter apply → pins update | < 300ms |
| Search this area → new pins | < 1000ms |
| Cluster tap → zoom | < 400ms |
| 50 pins rendering | < 16ms per frame (60fps) |

## Libraries

| Concern | Library | Why |
|---------|---------|-----|
| Map rendering | `react-native-maps` | Native performance, Google/Apple maps |
| Bottom sheet | `@gorhom/bottom-sheet` v5 | Best RN bottom sheet, snap points, gestures |
| Gestures | `react-native-gesture-handler` v2 | Required by bottom sheet + carousel |
| Animations | `react-native-reanimated` v3 | Already in project, smooth 60fps |
| Clustering | `supercluster` | Fast spatial indexing, used by Mapbox/Airbnb |
| Location | `expo-location` | Already in Expo project |
| Geocoding | `expo-location` geocodeAsync | Postcode → coordinates |
| Carousel | Horizontal FlatList + pagingEnabled | Native scrolling, no extra dependency |

## Files

| File | Action |
|------|--------|
| `app/discover/map.tsx` | REWRITE — full map screen with bottom sheet |
| `components/discover/MapView.tsx` | REWRITE — replace grid with react-native-maps |
| `components/discover/CoachMarker.tsx` | REWRITE — price pill pins |
| `components/discover/ClusterMarker.tsx` | CREATE — cluster circles |
| `components/discover/MapBottomSheet.tsx` | CREATE — three-snap-point sheet |
| `components/discover/CoachCardCarousel.tsx` | CREATE — horizontal swipe cards |
| `components/discover/SearchThisArea.tsx` | CREATE — floating search button |
| `components/discover/MapSearchHeader.tsx` | CREATE — search + toggle + filter |
| `components/discover/UserLocationMarker.tsx` | CREATE — pulsing blue dot |
| `components/discover/SkeletonPins.tsx` | CREATE — loading placeholder pins |
| `services/geocoding-service.ts` | CREATE — postcode → coordinates |
| `services/discover-service.ts` | MODIFY — add searchInBounds, relevance scoring |
| `hooks/useMapCoaches.ts` | CREATE — fetch + filter + cluster logic |
| `hooks/useUserLocation.ts` | CREATE — GPS permission + position |

## Acceptance Criteria

- [ ] Map renders with react-native-maps (real tiles, real zoom, real pan)
- [ ] Coach pins show price per hour (full pins) or dots (mini pins)
- [ ] Pin selection highlights pin + shows card in bottom sheet
- [ ] Swiping card carousel moves map to corresponding coach
- [ ] Tapping pin scrolls carousel to corresponding card
- [ ] "Search this area" appears after pan, fetches new coaches on tap
- [ ] GPS permission asked once, postcode fallback if denied
- [ ] User location shown as pulsing blue dot
- [ ] Clusters form at 3+ coaches within 500m, tap to zoom in
- [ ] Filters apply in real-time (pins fade in/out)
- [ ] Filter state persists across map ↔ list toggle
- [ ] Bottom sheet has 3 snap points (collapsed, card, full list)
- [ ] Skeleton pins shown during loading
- [ ] 60fps maintained with 50 pins on screen
- [ ] Map → list toggle preserves filters, sort, and selected coach
- [ ] Visited coaches show grey pins
- [ ] Trial-available coaches show green badge on pin
- [ ] Error state shows retry with map tiles still visible
- [ ] "No coaches match" state when filters exclude everything
- [ ] Double-tap to zoom works
