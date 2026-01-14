# Coach Discovery System

> Advanced coach search and matching with location-based discovery, smart filtering, and personalized recommendations.

---

## Overview

The Coach Discovery system helps parents and athletes find the perfect coaching match through location-aware search, comprehensive filtering, and intelligent suggestions based on preferences and booking history.

### Key Features

| Feature | Description |
|---------|-------------|
| Postcode Search | Find coaches within a configurable radius |
| Advanced Filters | Price, rating, distance, skills, formats, languages |
| Map View | Visual coach discovery with location markers |
| Suggestions | AI-powered recommendations based on history |
| Recent Searches | Quick access to previous queries |
| Real-time Availability | Shows next available slot per coach |

---

## Discovery Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   DISCOVER COACHES                          │
├─────────────────────────────────────────────────────────────┤
│  [🔍 Search by postcode...     ]  [📍] [⚙️ Filters]         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ COACH CARD                                           │  │
│  │ ┌────┐                                               │  │
│  │ │ MT │  Marcus Thompson          ⭐ 4.8 (42 reviews)│  │
│  │ └────┘  2.3 miles • Striker Coach                   │  │
│  │                                                      │  │
│  │  [🕐 Tomorrow at 10:00]                              │  │
│  │                                                      │  │
│  │  [Finishing] [Dribbling] [1-on-1]                   │  │
│  │                                                      │  │
│  │                                £45-65/session  →     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ SUGGESTED FOR YOU                                    │  │
│  │ "Based on Alex's focus on finishing skills"         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### CoachSearchFilters

```typescript
interface CoachSearchFilters {
  query?: string;              // Text search
  location?: {
    lat: number;
    lng: number;
  };
  distance?: number;           // Radius in km
  priceMin?: number;
  priceMax?: number;
  rating?: number;             // Minimum rating
  focuses?: FootballObjective[];  // Skill focuses
  formats?: TrainingFormat[];  // Session formats
  languages?: string[];
  gender?: 'Male' | 'Female' | 'Any';
  verified?: boolean;
  sortBy?: 'relevance' | 'distance' | 'rating' | 'price_low' | 'price_high' | 'reviews';
}
```

### CoachSearchResult

```typescript
interface CoachSearchResult {
  coach: CoachProfile;
  relevanceScore: number;      // 0-100 ranking score
  distanceKm?: number;
  matchedTerms?: string[];     // Highlighted search matches
}
```

### CoachSearchResponse

```typescript
interface CoachSearchResponse {
  results: CoachSearchResult[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  filterOptions: FilterOptions;  // Available filter values with counts
}
```

### SuggestedCoach

```typescript
interface SuggestedCoach {
  coach: CoachProfile;
  reason: 'highly_rated' | 'nearby' | 'popular' | 'new' | 'similar_booking';
  reasonText: string;
  confidence: number;          // 0-1 suggestion confidence
}
```

### FilterOptions

```typescript
interface FilterOptions {
  sports: FilterOption[];
  focuses: FilterOption[];
  languages: FilterOption[];
  genders: FilterOption[];
  verificationLevels: FilterOption[];
  formats: FilterOption[];
  priceRange: { min: number; max: number };
  ratingDistribution: { rating: number; count: number }[];
  totalCount: number;
}

interface FilterOption {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
}
```

---

## Search Algorithm

### Relevance Scoring

The discovery service uses a multi-factor relevance algorithm:

```typescript
function calculateRelevanceScore(coach, filters, distanceKm): number {
  let score = 50;  // Base score

  // Rating boost (up to 25 points)
  score += coach.rating.average * 5;

  // Review count boost (up to 10 points)
  score += Math.min(coach.rating.reviewCount / 10, 10);

  // Distance penalty (up to -20 points)
  if (distanceKm !== undefined) {
    score -= Math.min(distanceKm / 5, 20);
  }

  // Verification boost
  if (coach.badges?.some(b => b.label === 'Verified')) {
    score += 10;
  }

  // Query match boost
  if (filters.query) {
    if (coach.fullName.includes(query)) score += 15;
    if (coach.footballFocuses.some(f => f.includes(query))) score += 10;
  }

  return clamp(score, 0, 100);
}
```

### Text Search

Full-text search across multiple coach profile fields:

```typescript
const searchableFields = [
  'fullName',
  'shortBio',
  'bio',
  'city',
  'state',
  'footballFocuses',
  'languages'
];
```

### Distance Calculation

Uses Haversine formula for accurate distance between coordinates:

```typescript
function calculateDistance(lat1, lng1, lat2, lng2): number {
  const R = 6371;  // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = sin(dLat/2)² + cos(lat1) * cos(lat2) * sin(dLng/2)²;
  const c = 2 * atan2(√a, √(1-a));
  return R * c;
}
```

---

## Sort Options

| Sort | Description |
|------|-------------|
| `relevance` | Multi-factor score (default) |
| `distance` | Nearest first |
| `rating` | Highest rated first |
| `price_low` | Cheapest first |
| `price_high` | Most expensive first |
| `reviews` | Most reviewed first |

---

## Screens & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/(tabs)/discover` | ParentDiscoverScreen | Main discovery tab |
| `/discover-sessions` | DiscoverSessionsScreen | Browse available sessions |
| `/coach/[id]` | CoachProfileScreen | View coach details |
| `/book-coach` | BookCoachScreen | Start booking flow |

---

## Discovery Service

**File:** `services/discover-service.ts`

### Core Methods

```typescript
const discoverService = {
  // Search with filters
  searchCoaches(filters, page, pageSize): Promise<CoachSearchResponse>;

  // Location-based search
  getCoachesNearLocation(lat, lng, radiusKm): Promise<CoachSearchResult[]>;

  // Get filter options with counts
  getFilterOptions(currentFilters): Promise<FilterOptions>;

  // Personalized suggestions
  getSuggestedCoaches(userId): Promise<SuggestedCoach[]>;

  // Recent searches
  getRecentSearches(): Promise<string[]>;
  clearRecentSearches(): Promise<void>;

  // Single coach lookup
  getCoachById(coachId): Promise<CoachProfile | null>;

  // Map data
  getAllCoaches(): Promise<CoachProfile[]>;

  // Filter helpers
  countCoaches(filters): Promise<number>;
  hasActiveFilters(filters): boolean;
  getActiveFilterCount(filters): number;
}
```

---

## UI Components

### Map Preview
**File:** `components/discover/map-preview.tsx`

Visual map showing coach locations:
- Interactive markers for each coach
- Cluster markers for dense areas
- Tap to view coach card
- Current location indicator

### Coach Card
Displays coach summary in search results:
- Profile photo/avatar
- Name and specializations
- Rating with review count
- Distance from search location
- Price range
- Next available slot
- Skill focus tags

### Filter Sheet
Bottom sheet with all filter controls:
- Price range slider
- Rating stars selection
- Skill focus checkboxes
- Format toggles
- Language selection
- Verification level filter

---

## Suggestions Engine

The suggestion system provides personalized coach recommendations:

### Suggestion Categories

| Reason | Logic |
|--------|-------|
| `highly_rated` | Top coaches by average rating |
| `nearby` | Closest by distance |
| `popular` | Most reviews |
| `new` | Recently joined platform |
| `similar_booking` | Based on past bookings |

### Example Suggestions

```typescript
const suggestions = [
  {
    coach: marcusThompson,
    reason: 'highly_rated',
    reasonText: 'Highly rated with 4.9 stars',
    confidence: 0.9
  },
  {
    coach: sarahWilliams,
    reason: 'nearby',
    reasonText: 'Only 1.2 miles away',
    confidence: 0.85
  }
];
```

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `clubroom.discover.recentSearches` | Recent search queries (max 10) |

---

## API Contracts

### Search Coaches

```http
GET /api/coaches/search
Query: ?query=striker&lat=51.5&lng=-0.1&radius=10&minRating=4&page=1
Response: CoachSearchResponse
```

### Get Filter Options

```http
GET /api/coaches/filters
Query: ?query=striker
Response: FilterOptions
```

### Get Suggestions

```http
GET /api/users/:userId/suggested-coaches
Response: SuggestedCoach[]
```

---

## Integration Points

### With Availability Service
- Shows next available slot on coach cards
- Real-time availability check before booking

### With Booking Service
- Seamless transition to booking wizard
- Pre-fills coach and child selection

### With Review Service
- Displays aggregated ratings
- Shows verified booking badge

### With Verification Service
- Filters by verification level
- Shows trust badges on coach cards

---

## File References

| Purpose | Path |
|---------|------|
| Service | `services/discover-service.ts` |
| Parent Screen | `components/parent/discover-screen.tsx` |
| Map Component | `components/discover/map-preview.tsx` |
| Types | `constants/types.ts` |
| Test Suite | `__tests__/discover/discover-service.test.ts` |
