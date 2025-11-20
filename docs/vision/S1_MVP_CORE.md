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
| Football Focus | `footballFocus` | array of enum ids | Multi-select chips | Limited to football-specific focuses (e.g., Dribbling, Passing, Defending, Goalkeeping). |
| Training Format | `formats` | array of enum ids | Toggle group | Examples: In-person, Virtual, Small group. |
| Skill Level | `skillLevels` | array of enum ids | Checkbox set | Youth, HS Varsity, Collegiate, Adult Rec, Pro Prep. |
| Price | `price.minUsd` / `price.maxUsd` | integers | Dual-handle slider | Currency normalized to USD for comparisons. |
| Ratings | `rating.min` | float | Slider | 0–5 in 0.5 increments. |
| Gender | `coachGender` | enum | Toggle | Optional for customers requesting specific representation. |
| Languages | `languages` | array of BCP-47 codes | Multi-select | Controls both list facet and profile badges. |

All filters serialize into a `CoachSearchParams` object passed to both list and map data queries to keep results consistent.

## Football-first UI blueprint
- **Player-facing surfaces**
  - Home hero alternates between "Next session" tile and a carousel of football drills with imagery (cones, mini-goals) so the UI immediately signals the sport focus.
  - Session history cards stack chronologically with color-coded skill tags (Dribbling = orange, Passing = teal, Defending = navy, Goalkeeping = green) and subtle timeline connectors to reinforce progress.
  - Objective badges remain visible in booking detail, session recap, and chat composer, allowing quick tap-to-edit interactions without modals for minor tweaks.
  - Achievements ("First hat-trick", "Beat the cone maze") appear as sticker overlays to drive repeat engagement for younger players.
- **Parent-facing surfaces**
  - Multi-child switcher lives in the global app bar; when a child is selected the background gradient shifts to that child's accent color so parents always know whose context they are editing.
  - Dashboard tiles for "Action items" (confirm attendance, update objectives, unread messages) include inline CTA buttons to reduce navigation hops.
  - Booking flow summary rows highlight pitch type (indoor turf, outdoor grass) and weather callouts for the selected service, giving parents assurance they picked the right format.
  - Messaging inbox groups threads by coach or school with quick filter chips (All / Needs reply / Upcoming session) to keep busy families organized.
- **Coach-facing surfaces**
  - Coach home features a "School identity" card (logo, tagline, facility photo) that doubles as a shortcut to edit branded assets or invite staff.
  - Availability builder uses a light-on-dark pitch grid motif so football coaches feel at home, while service cards feature icons for 1:1, group, or clinics.
  - Player insight drawer sits beside each booking with last three objectives, session notes, and ability to pin warm-up plans into chat.
  - Messaging view surfaces read receipts plus safe quick reactions (✔️ Confirmed, 🕒 Running late, 🧠 Homework sent) aligned with safeguarding guidance.
- **Shared navigation**
  - Bottom nav uses role-aware tabs but reserves a persistent floating "Message" button anywhere a relationship exists.
  - Coach discovery, booking detail, and payment preview screens reuse the same typographic scale to keep mental load low even as users switch roles.
  - Dark mode palette leans on stadium-inspired deep blues with neon accents to maintain a football aesthetic while preserving accessibility contrast.

## CoachProfile API Fields

### Shared core fields
- `id`, `fullName`, `headline`, `footballFocus[]`, `primaryFocus`, `city`, `state`, `distanceMiles`, `profilePhotoUrl`, `rating.average`, `rating.reviewCount`.

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
- `positionSpecialties[]`: offense/defense unit plus positional notes (e.g., Left Wing, Center Back) to reinforce football-first discovery.
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

## Player Session History & Objectives (New Pillar)
- **Objective capture in booking**
  - Parents (or older players) can tag each booking with up to three objectives selected from curated football skill families: Dribbling, Passing, Defending, Goalkeeping, Conditioning, and "Custom note".
  - Objectives surface directly beneath the service selector so the coach can preview the training goals before accepting the slot.
- **Progress journal UI**
  - Each completed session produces a card in the player's "Session History" tab containing coach, date, location, skill tags, and highlights.
  - Coaches can add quick metrics (1–5 confidence, rep counts) and short notes; parents/players can update objectives post-session to reflect progress.
  - Timeline filter chips (`All`, `Dribbling`, `Passing`, `Defending`, etc.) allow families to focus on specific growth areas.
- **Objective editing**
  - Post-booking, objectives can be edited from the booking detail view via "Update Goals". Changes notify the coach asynchronously and the history keeps a changelog (timestamp + actor).

## API surface (football-first data contracts)
| Domain | Endpoint | Method | Purpose | Key request fields | Key response fields |
| --- | --- | --- | --- | --- | --- |
| Search | `/api/football/coaches` | `GET` | Fetch paginated coach list + map pins honoring `CoachSearchParams`. | Query params mirror filter schema. | `results[]`, `mapPins[]`, `nextCursor`. |
| Coach profile | `/api/football/coaches/{id}` | `GET` | Retrieve full coach + school info. | Path `id`. | `coach`, optional `school`, `services[]`, `reviews[]`. |
| Booking | `/api/football/bookings` | `POST` | Create booking request with objectives + selected athlete. | `athleteId`, `serviceId`, `slotId`, `objectives[]`, `notes`, `paymentIntentId?`. | `bookingId`, `status`, `paymentRequired`. |
| Booking state | `/api/football/bookings/{id}` | `PATCH` | Update status (confirm, cancel, reschedule) or objectives. | `status`, `objectives[]?`, `cancelReason?`, `rescheduleSlotId?`. | Updated booking payload + timeline delta. |
| Session history | `/api/football/athletes/{athleteId}/sessions` | `GET` | List completed sessions with notes/metrics. | Query `focus`, `cursor`. | `sessions[]` each with `objectives`, `coachSummary`, `metrics`. |
| Objectives | `/api/football/bookings/{id}/objectives` | `PUT` | Idempotent update of up to three objectives per booking. | `objectives[]`, `customNote?`. | Echo of saved objectives + audit info. |
| Messaging | `/api/football/messages` | `POST` | Send message in an existing thread (coach ↔ parent). | `threadId`, `body`, `attachments[]`, `context.bookingId`. | `messageId`, `deliveredAt`. |
| Messaging threads | `/api/football/messages/threads` | `GET` | List threads for current user segmented by persona. | Query `persona`, `needsReply`. | `threads[]` with `latestMessage`, `unreadCount`, `pinnedObjectives`. |
| Schools | `/api/football/schools` | `POST/GET` | Create or fetch school identity packages for coaches. | `name`, `branding`, `locations[]`. | `schoolId`, `coaches[]`, `services[]`. |
| Athletes | `/api/football/athletes` | `POST/GET` | Create/manage multi-child profiles. | `fullName`, `birthYear`, `dominantFoot`, `positions[]`. | `athleteId`, `linkedParentId`, `skillFocus`. |

- **Auth and persona context**: every request carries `x-persona` header (`player`, `parent`, `coach`) for policy enforcement. Multi-child flows also require `x-athlete-id` when scoping bookings or messages.
- **Objective taxonomy**: API enumerates `FOOTBALL_OBJECTIVES` (Dribbling, Passing, Defending, Goalkeeping, Conditioning, Custom) to sync with UI chips; schema includes `icon` references to ensure consistency.
- **Error modeling**: domain errors use structured codes (`BOOKING_SLOT_TAKEN`, `OBJECTIVE_LIMIT_REACHED`, `PAYMENT_METHOD_REQUIRED`) with localized copy hints supplied in payload for immediate UI display.
- **Realtime hooks**: booking state and messaging endpoints publish WebSocket events on `/ws/updates` so the UI can animate status changes without polling, especially critical for confirming urgent sessions.

## Always-on Messaging Layer
- **Access**
  - Message CTA available anywhere a relationship exists (after booking or explicit coach follow) with floating button on booking detail and session history entries.
  - Conversation list segmented by role: Parents see a combined inbox for each child; coaches see threads grouped by family/team.
- **UI**
  - Thread screen shows pinned objectives for quick context plus shortcuts to share session summaries or attachments (video, drill PDF placeholders).
  - Unread badges surface on coach/parent nav tabs; quick replies ("Running late", "Confirm location") reduce typing friction.
- **Notifications**
  - Push + email triggered on new message, with quiet hours preference per user.

## Role-specific Navigation & Surfaces
- **Player (youth) mode**
  - Lightweight home focusing on "My next session", progress streaks, and achievements tied to objectives completion.
- **Parent mode**
  - Multi-child switcher anchored in the top app bar; each child has distinct discovery history, bookings, objectives, and session logs.
  - Parent dashboard surfaces outstanding actions (confirm attendance, update objectives, unread messages) with contextual badges.
- **Coach mode**
  - Maintains operations tools plus "School" identity card summarizing facilities, coaches on staff, and branded assets (see below).

## Coach School Identity Extensions
- Coaches can optionally create or join a "School" (e.g., "Tom's School of Football") that bundles:
  - Shared branding: logo, cover photo, tagline, and training locations.
  - Roster management: invite assistant coaches, assign which services they deliver, and expose school-level availability.
  - Showcase modules on profile: school hero, testimonials, highlight reels, and upcoming camps specifically for that school.
  - Discovery filter hook: parents can filter by school name or toggle "Show Schools Only" for bundled offerings.

## Parent & Player Data Modeling Enhancements
- **Multi-child support**
  - Parent accounts store an array of `athletes[]` with profile photo, birth year, dominant foot, and preferred positions.
  - Booking forms require selecting the athlete up front; session history and objectives are scoped per athlete.
- **Football-first metadata**
  - Athlete profile collects skill priorities (dribbling, passing, defending) and highlights them in booking requests.
  - Coach search chips expose "Age Band" and "Side of ball" (Attack, Midfield, Defense, Goalkeeper) to tighten the football focus.

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

## Payments readiness plan
- **UI commitments (already in Sprint 1)**
  - Booking confirmation includes a "Payment" step with transparent pricing, taxes/fees disclosure, and a placeholder "Card on file" summary that currently states "Secure payments launching soon".
  - Parent dashboard surfaces "Upcoming charges" chips for packages or subscriptions, even if final collection happens manually, so families trust the pricing.
  - Coach profile cards show `priceRange` plus per-session breakdown and a "Pay via app" badge once Stripe Connect is enabled; until then the badge is gray with tooltip "Payments rolling out".
- **API scaffolding**
  - `paymentIntentId` field is optional on booking creation but flows through the timeline to keep references stable once Stripe integration lands.
  - `/api/payments/methods` (GET/POST) placeholder endpoints allow saving the intent to add cards later without breaking existing clients.
  - Booking status machine enforces `paymentStatus` sub-state (`unpaid`, `auth_pending`, `captured`, `refunded`) so once the gateway is ready we can toggle enforcement via config.
- **Stripe Connect rollout (Sprint 4 target)**
  - Coaches link a Stripe Express account via OAuth (`/api/payments/stripe/link`) surfaced as a banner inside Coach settings and the School identity card.
  - Parents add cards using Stripe Elements embedded in the confirmation modal; success returns a `paymentMethodId` saved against the family profile for reuse.
  - When booking, client creates a PaymentIntent via backend, attaches the saved method, and sets `transfer_group` referencing the coach or school; post-session, the system captures and schedules a payout respecting safeguarding buffers.
- **Refunds & safeguards**
  - Cancellation flows map reason codes to refund percentages (e.g., >24h full refund, <24h coach must approve) and store them with audit notes for compliance.
  - Disputes trigger automated messaging to both parties and flag the booking in the admin console; UI displays "Refund under review" badge.
- **Analytics & incentives**
  - Payments pipeline emits events (`PaymentMethodAdded`, `PaymentCaptured`, `PayoutSent`) tied to objectives completion to create future loyalty perks (e.g., "Complete 5 dribbling sessions, unlock 10% off").

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
