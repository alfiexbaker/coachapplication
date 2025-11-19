# S1 MVP Core Experience

## Map & List Interactions
- **Dual-pane layout**: default state shows a vertically scrollable coach list paired with a map preview. Selecting a card pans/zooms map to that coach's coordinates and drops a highlighted pin. Hover/focus on a pin raises matching card in list.
- **Contextual detail tray**: tapping a map pin opens a half-height tray containing summary fields (name, sport focus, hourly rate range, review snippet) plus quick actions (favorite, share, book). Swiping up expands to the full Coach Profile page.
- **Route-aware state**: map/list selection persists when navigating between Home → Coach Profile → back, ensuring the previously focused coach remains highlighted.
- **Viewport filters**: when the user drags the map, a "Search this area" pill appears. Confirming refetches list results using the map bounds as a geo filter.
- **Pagination**: the list uses infinite scroll (20 results per fetch). Map pins only render for the currently loaded results to avoid clutter.

## Filter Schema
| Filter Group | Field | Type | Source | Notes |
| --- | --- | --- | --- | --- |
| Availability | `availability.startDate` / `availability.endDate` | ISO 8601 date | Booking calendar | Limits list/map to coaches with at least one open slot in range. |
| Location | `geo.boundingBox` | `{north, south, east, west}` floats | Map viewport | Applied when the user confirms "Search this area". |
| Location | `geo.radiusKm` & `geo.center` | `{lat, lng}` floats | User-set slider + device location | Used when search input contains a city/zip. |
| Sport | `sports` | array of enum ids | Multi-select chips | Supports hierarchical categories (e.g., Soccer → Goalkeeper). |
| Training Format | `formats` | array of enum ids | Toggle group | Examples: In-person, Virtual, Small group. |
| Skill Level | `skillLevels` | array of enum ids | Checkbox set | Youth, HS Varsity, Collegiate, Adult Rec, Pro Prep. |
| Price | `price.minUsd` / `price.maxUsd` | integers | Dual-handle slider | Currency normalized to USD for comparisons. |
| Ratings | `rating.min` | float | Slider | 0–5 in 0.5 increments. |
| Gender | `coachGender` | enum | Toggle | Optional for customers requesting specific representation. |
| Languages | `languages` | array of BCP-47 codes | Multi-select | Controls both list facet and profile badges. |

All filters serialize into a `CoachSearchParams` object passed to both list and map data queries to keep results consistent.

## CoachProfile API Fields

### Shared core fields
- `id`, `fullName`, `headline`, `sports[]`, `primarySport`, `city`, `state`, `distanceMiles`, `profilePhotoUrl`, `rating.average`, `rating.reviewCount`.

### Card (list/map preview) requirements
- `badges` (array): availability of background check, pro experience, verified credential.
- `priceRange` (`minUsd`, `maxUsd`, `unitLabel`): used for quick comparison.
- `sessionFormats[]`: subset of offered formats (icons on cards).
- `nextAvailability` (ISO datetime) to populate "Next slot" chip.
- `shortBio` (<=140 chars) truncated teaser.
- `ctaDeepLink` for booking action.

### Detail page requirements (superset of card fields)
- `galleryPhotos[]` + `introVideoUrl` for hero media.
- `coachingHistory[]`: org, role, years.
- `certifications[]`: issuing body, credentialId, issue/expiry dates.
- `trainingLocations[]`: name, address, lat/lng, indoor/outdoor flags.
- `curriculumHighlights` (rich text / markdown segments).
- `equipmentProvided` & `athleteRequirements` lists.
- `reviews[]`: reviewer first name/initial, sport, rating, text, createdAt.
- `packages[]`: title, description, sessionsIncluded, price, perSessionBreakdown.
- `insuranceAndBackground` block indicating verification timestamps.
- `contactOptions`: messaging endpoint, phone mask (if opted in).

## Loading & Empty States
- **Initial load**: show skeleton cards (image, title, price placeholders) plus dimmed map with animated shimmer markers. Filters button displays spinner inline to indicate query in-flight.
- **Pagination load**: insert a "Fetching more coaches…" row with progress indicator at bottom of list while pins fade in sequentially.
- **Map data fetch**: overlay subtle toast "Updating map" when bounds change, replaced by error toast if the request fails with retry CTA.
- **Empty results**: display an illustrated empty state with the message "No coaches match these filters" plus two suggested actions: (1) Clear filters button (resets to defaults), (2) Expand search radius (pre-populated slider). Map shows a neutral grid with no pins and encourages trying a nearby city.
- **Error state**: show inline alert bar above list with retry button; map shows a full-width snackbar when the tile layer fails.
- **Detail page sections**: each async sub-section (reviews, gallery) uses localized skeletons and gracefully handles zero-data cases (e.g., "Be the first to review Coach Maya!").
