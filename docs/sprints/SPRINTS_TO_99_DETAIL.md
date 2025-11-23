# Execution Detail to Reach 9.9/10 Readiness
**Scope:** Frontend-only, mock data. Build from existing navigation/components; avoid inventing new flows when an extension exists. Capture API assumptions inline for backend follow-up.
**Audience:** AI implementers who need file-level guidance to ship UI completeness and depth across the 4 product spines.

---

## How to use this plan
- Anchor to `docs/SOURCE_OF_TRUTH.md` (roles/spines) and `docs/POC_GAP_CHECK.md` (what is missing).
- For each sprint, start with existing screens in `clubroom/app/` and components in `clubroom/components/`. Only create a new component when reuse or extension fails.
- Keep mock data colocated (e.g., `clubroom/data/`) and typed so backend swap is one adapter away.
- Record assumptions in comments next to mock services and in `docs/technical/api_assumptions.md` (to be created when backend starts).

---

## Sprint 1 (Core UX & UI Polish) — Make every surface feel real
**Goal:** UI polish, consistent patterns, and exhaustive states so later features snap in without redesign.
**Key principle:** Expand existing primitives (cards, lists, tabs) rather than adding bespoke layouts.

### Priority stories & file targets
1. **Discovery polish**
   - Extend `clubroom/app/(tabs)/index.tsx` to add filter modal, sort, search, and map toggle.
   - Reuse card component from discovery list; add skeletons and empty states.
   - Capture selection state in a shared hook `clubroom/hooks/useCoachFilters.ts` for reuse in parent/coach discovery contexts.
2. **Bookings list/detail depth**
   - Enhance `clubroom/app/(tabs)/bookings.tsx` with status tabs, badges, and actions per status.
   - Add detail screen `clubroom/app/booking/[id].tsx` showing breakdown, location mini-map (mock), and CTAs (message, cancel, add to calendar).
   - Build shared booking badge component `clubroom/components/booking/status-badge.tsx` to reuse in cards and detail.
3. **Messaging UX**
   - Upgrade `clubroom/app/(tabs)/messages.tsx` with unread badges, typing indicator mock, attachment buttons, and long-press actions.
   - Update `clubroom/app/chat/[threadId].tsx` to support reactions and message status (sent/delivered/seen) with mock delays.
4. **Profiles & settings**
   - Expand `clubroom/app/(tabs)/profile.tsx` to branch by role and surface stats, services, certifications, and children for parents.
   - Add `clubroom/app/settings.tsx` for account/preferences; ensure navigation entry points from profile.
5. **Onboarding & safety**
   - Create `clubroom/app/onboarding/` stack with role selection, permission prompts, and safety banners.
   - Gate messaging until booking confirmed (toggle in mock data) to enforce safeguarding intent.

### Acceptance checklist
- Every list/screen has loading, empty, error, and populated states.
- Role segmentation is visible on profile and navigation (user/parent/coach/admin).
- Discovery and bookings share card primitives; no duplicate card code.
- Messaging supports attachments (image/doc), reactions, delete, and reports (mock only).

---

## Sprint 2 (Booking Flow & Real-time Sheen) — Complete journeys without backend
**Goal:** End-to-end booking wizard with availability, payments UI, notifications, and earnings—all backed by deterministic mocks.
**Key principle:** Centralize booking state machines and notification logic so future backend only swaps data layer.

### Priority stories & file targets
1. **Booking wizard completion**
   - Use `clubroom/app/book/[coachId]/` stack: session-type → schedule → details → review → confirmation.
   - Centralize state in `clubroom/store/booking-flow.ts` (Zustand/Context) with types for session type, slots, pricing, and objectives.
   - Ensure back/next navigation and validation gates per step.
2. **Availability builder**
   - Enhance `clubroom/app/(tabs)/availability.tsx` with weekly grid, recurring templates, overrides, and blackout dates.
   - Extract shared slot component `clubroom/components/availability/time-slot.tsx`; reuse in schedule step.
3. **Notifications & messaging simulation**
   - Add `clubroom/services/notification-service.ts` with CRUD over AsyncStorage; drive badges on bookings/messages tabs.
   - Simulate real-time chat updates with optimistic sends and delivery/seen ticks using `setTimeout` in `clubroom/services/messaging-service.ts`.
4. **Payments UI (mock)**
   - Build `clubroom/app/payment/methods.tsx` and `.../add-card.tsx` with card brand display, validation, and saved card list (mock data only).
   - Show payment breakdown on review/confirmation screens with platform fee chip.
5. **Earnings dashboard (coach)**
   - Create `clubroom/app/earnings.tsx` showing mock balances, transactions, and optional chart using existing card components.
6. **Cancellations & policy**
   - Add `clubroom/app/booking/[id]/cancel.tsx` to show policy, capture reason, and update booking state in store.
7. **Calendar export**
   - Wire `expo-calendar` gated by mock permission prompts; add “Add to Calendar” buttons on confirmation and booking detail.

### Acceptance checklist
- Booking flow functions offline with deterministic mock data and can be replayed via deep links.
- Booking states (pending/confirmed/completed/cancelled) render consistently across list, detail, and notifications.
- Notifications badge counts update when actions fire (e.g., booking confirmed, message received, notes added).
- Payments/earnings flows are UI-complete, clearly marked as mock/no-real-charges.

---

## Sprint 3 (Social + Development Hub) — Community + measurable progress
**Goal:** Rich social posting plus development analytics tied to bookings/objectives, all discoverable via existing navigation.
**Key principle:** Reuse feed cards and booking detail to avoid parallel UI for posts or progress.

### Priority stories & file targets
1. **Social feed depth**
   - Extend `clubroom/components/social/post-card.tsx` to support hashtags, edit/delete, share-to-group, reactions, and comment threading (mock data).
   - Update `clubroom/app/(tabs)/index.tsx` (feed tab) to surface filters by hashtag, following, and groups/organisations.
   - Add `clubroom/app/groups/[groupId]/feed.tsx` for group/organisation posting with member-only toggle.
2. **Follow + discovery**
   - Implement follow/unfollow interactions on coach/user profiles using `clubroom/store/social.ts` mock store.
   - Add suggestion rail (“Coaches near you”, “Trending hashtags”) to feed.
3. **Development hub**
   - Create `clubroom/app/development/index.tsx` as parent-friendly dashboard: radar of core attributes, recent clips, objectives timeline.
   - Build `clubroom/components/development/objective-card.tsx` and `.../progress-timeline.tsx` to reuse inside bookings detail.
   - Allow attaching drills/media to objectives and pinning “focus areas” (scanning, first touch, etc.).
4. **Session notes integration**
   - Connect session notes from `clubroom/app/session-notes/[bookingId].tsx` to booking detail and development hub; include attachments and skill sliders.
5. **Achievements & evidence vault**
   - Add achievements carousel (mock) to user profile and development hub.
   - Create evidence vault screen `clubroom/app/development/evidence.tsx` for clips/PDFs/scout notes with tagging (age band, position).

### Acceptance checklist
- Posts support edit/delete/share-to-group; group feeds inherit post-card UI.
- Objectives appear in booking creation, booking detail, and development hub with consistent chips.
- Development visuals (radar/timeline) use mock data but represent skill deltas from session notes.
- Follow relationships update feed filtering and suggestions immediately (mock store-driven).

---

## Sprint 4 (Teams, Admin, Trust/Ops) — Organisation-grade polish
**Goal:** Organisation/team management, safeguarding UX, and admin oversight using existing shells.
**Key principle:** Extend team/org primitives before creating new flows; everything should sit inside current tab structure.

### Priority stories & file targets
1. **Organisation pages (teams/schools)**
   - Create `clubroom/app/org/[orgId]/index.tsx` showing branding, facilities, staff roster, and services; reuse coach cards.
   - Add staff management modals for invite/role change/kick in `clubroom/components/org/staff-list.tsx`.
   - Reserved partner slots shown on booking wizard when user has org code (mock flag).
2. **Group management**
   - Enhance `clubroom/app/groups/[groupId]/members.tsx` with invite via code/link, role labels, and remove/kick actions.
   - Add resource library tab `clubroom/app/groups/[groupId]/resources.tsx` reusing upload/view components from evidence vault.
3. **Safeguarding & consent surfaces**
   - Add consent toggles (photo/video, chaperone required, messaging quiet hours) in `clubroom/app/settings.tsx` and per-booking review step.
   - Implement incident/report flow `clubroom/app/report.tsx` with category, description, evidence upload, and status chips.
4. **Admin panel depth**
   - Expand `clubroom/app/(tabs)/admin.tsx` to list verification queues (DBS, FA badges), dispute flags, and content moderation (posts/reviews).
   - Add filters/status chips and action modals (approve/decline/request info) using shared card components.
5. **Platform search + notification preferences**
   - Add global search overlay accessible from top nav; reuse discovery cards for coaches/orgs/posts.
   - Add notification preferences per type in `clubroom/app/settings.tsx` linked to notification service mocks.

### Acceptance checklist
- Organisation and group flows share card components with discovery/profile; no bespoke layouts.
- Consent/reporting surfaces are reachable from settings and booking detail.
- Admin actions mutate mock data stores and reflect in badges/lists immediately.
- Global search spans coaches, orgs, posts using existing card templates.

---

## Cross-sprint quality bar (apply every week)
- **States:** Every new screen has loading/empty/error/success states and mock data fixtures checked into `clubroom/data/`.
- **Instrumentation:** Log assumed API payloads in comments next to mock services; prefer typed adapters for future backend.
- **Reusability:** Extract shared primitives (badges, chips, cards) into `clubroom/components/` before duplicating code.
- **Accessibility:** Ensure touch targets ≥44px, semantic labels for screen readers, and high-contrast themes.
- **De-risking:** Note any nav or data model assumptions in the sprint PR summary for backend alignment.
