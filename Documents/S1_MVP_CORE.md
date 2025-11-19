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

## Booking Flow Specification (Pillar 2)
- **State machine**
  - `Available` → `Pending` (parent submits slot) → `Confirmed` (coach auto-accept or manual) → `Completed` or `Cancelled`.
  - `Cancelled` requires metadata (`actor`, `reasonCode`, `refundEligible`).
  - `NoShow` sub-state logged if attendance not confirmed within 12 hours post-slot.
- **Service selection UI**
  - Services grouped by format (1:1, Group, Virtual) with pill toggles; each card shows duration, price, and capacity.
  - Selecting a service loads a **calendar strip** (7-day horizontal) plus **slot list** (chips per start time). Disabled slots show reason (booked, cutoff passed, coach hold).
- **Confirmation screen**
  - Summarizes child, coach, location map preview, cancellation window, reminders toggle, payment placeholder.
  - CTA labels: `Confirm Booking` (parents) / `Save Changes` (coaches editing).
- **Notifications**
  - Push + email for booking request, confirmation, 24h reminder, 2h reminder, and cancellation/reschedule.
  - Notification payload fields: `bookingId`, `slotStart`, `coachName`, `childName`, `deepLink`.
- **Booking details page**
  - Timeline of status changes, attachments (future), quick actions (message, reschedule, cancel), and attendance toggle.

## Coach Operations (Pillar 3)
- **Availability builder**
  - Weekly template: grid (columns days, rows 30-min increments) with drag-to-create blocks; supports repeating rules (e.g., Tue/Thu 16:00-18:00).
  - Overrides: one-off slot addition/removal, plus `Block time` modal for vacations or personal time.
  - Capacity controls: numeric stepper per slot; group sessions decrease `capacityRemaining` on booking.
- **Service Management**
  - Fields: `title`, `format`, `durationMinutes`, `priceUsd`, `maxAthletes`, `locationType`, `description`, `equipmentProvided`.
  - Draft vs. published state; drafts hidden from discovery but editable.
- **Booking management dashboard**
  - Calendar (agenda + week view) that color-codes statuses; tapping entry opens booking detail with ability to mark attendance or cancel.
  - Attendance flow: coach marks `present/absent`; triggers parent confirmation push.
  - Cancellation policy config: default 24h cutoff; show countdown badges on bookings approaching cutoff.
- **Calendar sync placeholder**
  - Toggle surfaces explanation (“Coming soon: Google/Apple Calendar sync”); store preference flag for future integration.

## MVP Scope Checklist
- **Included**
  - Invite links with role context.
  - Auth (email + OTP or password) and role selection.
  - Coach onboarding wizard (profile basics, services, availability).
  - Parent discovery + booking as described above.
  - Booking lists for both roles (upcoming, past) with filter chips (status, child, coach).
  - Basic settings (profile photo, notifications, logout) and support link.
- **Deferred (but placeholders ready)**
  - Payments UI elements labelled "Coming soon" with tooltip referencing Stripe rollout.
  - Messaging entry points disabled until S2; show locked badge after booking with explanatory copy.
  - Verification badges grayed out; copy states "Verification in progress".
  - Reviews, performance timeline, and social feed tabs hidden behind feature flags.

## Iteration Notes
- Every flow must annotate decisions in-line (Decision:, Alt:, Impact:) to keep track of future revisit points.
- Collect analytics events for MVP KPIs: `CoachProfileViewed`, `BookingInitiated`, `BookingConfirmed`, `AvailabilitySlotCreated`.
