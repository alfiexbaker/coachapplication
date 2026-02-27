# Booking & Sessions Sprint 3: Interaction Spine Consolidation

**Goal**: Collapse duplicate booking/create/invite entry points into one predictable interaction spine, remove small-screen dead-ends, and make role-based flows explicit for coach, parent, and athlete users.

**Priority**: P0 - Core interaction reliability
**Effort**: 10 engineer-days
**Dependencies**: Sprint 1 (broken logic), Sprint 2 (UX polish)

---

## Interaction Audit: Current Booking Touchpoints

### Coach and club-side creation touchpoints
- `/sessions/create` - canonical create/invite hub (`choose` -> `new` or `existing`)
- `/group-sessions/create` - redirect alias into `/sessions/create?intent=new&preset=group`
- `/session-invites/create` - redirect alias into `/sessions/create?intent=existing`
- `/session-invites/group` - redirect alias into `/sessions/create?intent=existing&source=group_manage`
- `/coach/invite` - redirect alias into `/sessions/create?intent=existing&athleteIds=...`
- `/roster/[athleteId]/add-to-session` - preselect athlete then branch to `new` or `existing`
- `/manage` - separate cards that still route into the same create entry
- `/(tabs)/bookings` (coach pills: Direct/Group) - both route into `sessions/create` with different params
- `/(tabs)/schedule` quick action - routes to `sessions/create?intent=new`
- `ScheduleDayDetail -> onCreateSession` - routes to `sessions/create?intent=existing&date=...`
- `/(tabs)/athletes` shortcut - routes to `sessions/create?intent=existing`

### Parent and athlete booking touchpoints
- `/book-coach` discovery feed
- `/book/[coachId]/session-type`
- `/book/[coachId]/schedule`
- `/book/[coachId]/details`
- `/book/[coachId]/review`
- `/book/[coachId]/confirmation`
- `/book/[coachId]/multi-week` (parallel recurring path)
- Invite acceptance (`/session-invites/[id]`) also creates bookings and bypasses parts of wizard UX

### Booking management touchpoints
- `/(tabs)/bookings` (sessions/discover)
- `/(tabs)/bookings/[id]` detail and actions
- `/booking/[id]/cancel`
- `/bookings/[id]/counter`
- `/bookings/subscribe` recurring setup
- `/session-invites/*` invitation lifecycle

**Observed interaction problems**:
- Same intent appears in many route aliases; users re-learn the same task from different entry points.
- "Direct" and "Group" start the same flow with weak differentiation, so recurrence and invite behavior is unclear.
- Mobile modal/action reachability regresses on small screens (iPhone SE class).
- On-behalf-of-club behavior exists in invite surfaces but is inconsistent in create/booking surfaces.

---

## Target Interaction Spine (single source of truth)

1. `Intent`: Create new, Add to existing, Book coach, or Respond to invite.
2. `Session Mode`: Direct, Small Group, Group, Camp (clear constraints shown immediately).
3. `Schedule`: Single, recurring, or multi-week with one recurrence model.
4. `Participants + Ownership`: athlete/child selection, invite scope, posting actor (`self` vs `club`).
5. `Review`: summary, cancellation policy, pricing, and guardrails.
6. `Commit`: one write path + deterministic success destination.

---

## Item 301: Canonical Intent Router and Alias Cleanup

**Files**:
- `navigation/routes.ts`
- `app/sessions/create.tsx`
- `app/group-sessions/create.tsx`
- `app/session-invites/create.tsx`
- `app/session-invites/group.tsx`
- `app/coach/invite.tsx`
- `app/roster/[athleteId]/add-to-session.tsx`
- `app/manage/index.tsx`

**Problem**: Many aliases push different params into the same flow, producing inconsistent defaults and copy.

**Prompt**:
```text
Create a single typed intent contract for session creation and invite workflows.

Requirements:
1. Introduce a canonical intent payload type in routes (intent/source/preset/athlete/date/offering).
2. Force all aliases and entry cards to call one helper (`Routes.sessionsCreateIntent(...)`) with complete context.
3. Remove ad-hoc `router.push({ pathname: Routes.SESSIONS_CREATE, params: ... })` patterns.
4. In `app/sessions/create.tsx`, normalize params once and derive initial mode from normalized intent only.
5. Add source telemetry labels for every entry point to support UI flow checks.
6. Keep old deep links functional via redirects, but prevent duplicate UX forks.
```

**Acceptance Criteria**:
- [ ] All create/invite aliases pass through one typed intent helper.
- [ ] `sessions/create` has one normalization function for incoming context.
- [ ] No duplicate branching logic for equivalent intents.
- [ ] Legacy aliases still work but route into canonical behavior.
- [ ] UI flow checks still pass for all role flows touching `sessions/create`.

---

## Item 302: Direct vs Group UX Differentiation with Recurrence Clarity

**Files**:
- `hooks/use-create-session.ts`
- `components/session/create-details-step.tsx`
- `components/session/create-schedule-step.tsx`
- `components/session/create-review-step.tsx`

**Problem**: Direct and group appear to be separate actions, but users land in nearly identical behavior; recurrence constraints are discovered too late.

**Prompt**:
```text
Make session mode differences explicit at step 1 and enforce recurrence constraints early.

Requirements:
1. Add a mode explainer block for each session type with: participant model, invite model, recurrence support.
2. If a selected combination is invalid (e.g. recurring + closed invite), block next step and show immediate actionable guidance.
3. Show a recurrence summary chip in schedule and review: "Once", "Weekly", "Biweekly", "Monthly".
4. Add a deterministic fallback action when unsupported combinations are selected.
5. Reuse existing components/tokens; do not introduce parallel wizards.
```

**Acceptance Criteria**:
- [ ] Direct, small-group, group, and camp have distinct interaction copy and constraints.
- [ ] Recurrence limitations are surfaced before submit, not at final create.
- [ ] Unsupported combinations cannot proceed silently.
- [ ] Review step reflects final recurrence and invite policy choices.

---

## Item 303: Reuse One Map-Based Location Picker Everywhere

**Files**:
- `components/availability/day-editor-venue-section.tsx`
- `components/session/create-schedule-step.tsx`
- `components/invite/*` (location-related step)
- `utils/location-presets.ts`

**Problem**: location capture behavior is fragmented; users want the same searchable map modal and saved locations everywhere.

**Prompt**:
```text
Standardize location selection by reusing the existing map-based picker and shared presets.

Requirements:
1. Expose one reusable location picker entry component (with map search + saved preset support).
2. Use this component in day editor, session create schedule, and invite slot setup.
3. Persist new places to `STORAGE_KEYS.SAVED_LOCATIONS` using existing preset utilities.
4. Keep labels consistent (no duplicate "Add location" variants with different behavior).
5. Maintain backward compatibility for existing text/manual location values.
```

**Acceptance Criteria**:
- [ ] Day editor, create session, and invite flows all open the same map-based picker.
- [ ] New saved locations appear immediately in each flow.
- [ ] No duplicated location modal implementations remain.
- [ ] Existing stored locations continue to parse/display correctly.

---

## Item 304: Small-Screen Modal Reachability Contract

**Files**:
- `components/coach/day-editor-sheet.tsx`
- `components/earnings/coach-payment-instructions-card.tsx`
- `components/*` modal/sheet forms with bottom actions

**Problem**: users on small devices cannot reliably reach Save/Confirm actions.

**Prompt**:
```text
Introduce a standard modal/sheet layout contract so primary actions are always reachable.

Requirements:
1. Build a shared "scroll body + fixed action rail" scaffold component for forms in sheets/modals.
2. Apply to booking-adjacent forms first (day editor, payment instructions, any booking form sheet).
3. Ensure keyboard-safe behavior (`keyboardShouldPersistTaps`, bottom inset padding).
4. Add iPhone SE viewport checks in UI flow runs for these screens.
```

**Acceptance Criteria**:
- [ ] Save/Confirm buttons are always reachable on iPhone SE dimensions.
- [ ] Modal body scrolls independently from fixed footer actions.
- [ ] No regressions in keyboard behavior or tap handling.

---

## Item 305: Explicit Route Access Matrix for Booking Surfaces

**Files**:
- `app/(tabs)/_layout.tsx`
- `scripts/ui-flow-checks-50.mjs`

**Problem**: booking route access can regress silently by role (example: coach route restrictions).

**Prompt**:
```text
Replace implicit hidden/allowed behavior with an explicit role-to-route access matrix.

Requirements:
1. Define route access policy by role for booking surfaces (`bookings`, `sessions/create`, `session-invites`, `manage`).
2. Keep tab visibility separate from route access permission.
3. Add UI flow checks that assert route access outcomes for coach/parent/athlete.
4. Ensure restricted routes redirect cleanly with no flashing unauthorized content.
```

**Acceptance Criteria**:
- [ ] Access rules are data-driven and readable in one place.
- [ ] Coach can access intended booking routes even when tab-hidden.
- [ ] UI flow checks catch future role-route regressions.
- [ ] Redirect behavior is deterministic and safe.

