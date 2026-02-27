# Booking & Sessions Sprint 4: Club Delegation and Employer Operations

**Goal**: Enable club owners/admins/head coaches to create and assign sessions for coaches, run recurring programs on behalf of the club, and get one operational view of booking health.

**Priority**: P0 - Club operations readiness
**Effort**: 12 engineer-days
**Dependencies**: Sprint 3 (interaction spine consolidation)

---

## Role Interaction Model (Target)

### Who does what
- `OWNER`: full club booking control, assigns coaches, sees all club booking operations.
- `ADMIN`: same as owner except owner-protected governance actions.
- `HEAD_COACH`: creates/assigns sessions, manages recurring blocks, monitors coach load.
- `COACH`: executes assigned sessions, edits own availability, manages athlete outcomes.
- `ASSISTANT/MEMBER`: view-only or limited operational actions based on explicit permissions.

### Club-master operational questions this sprint must answer
- What is unassigned vs assigned today?
- Which coach owns each upcoming session?
- Which recurring programs are healthy vs failing?
- Which bookings were created on behalf of club vs self?
- Where are cancellations, no-shows, and waitlist pressure accumulating?

---

## Condensed Club Booking Routes (Target)

1. `Manage` -> `Club Booking Console` (single employer entry).
2. `Create Session` from console with explicit actor and assignee.
3. `Assign Coach` before publish (required for club-owned sessions).
4. `Publish + Invite` (new or existing session path, same engine).
5. `Operations View` (day board + backlog + risk queue).
6. `Coach Execution` in their own Schedule/Bookings with "Assigned by club" context.

---

## Item 401: Club Booking Console (Single Employer Entry)

**Files**:
- `app/manage/index.tsx`
- `app/manage/bookings.tsx` (new)
- `hooks/use-manage-bookings.ts` (new)
- `navigation/routes.ts`

**Problem**: club operations are fragmented across `manage`, `sessions/create`, `session-invites`, and club pages with no single assignment-centric workflow.

**Prompt**:
```text
Build a dedicated Club Booking Console as the canonical employer entry for booking operations.

Requirements:
1. Add a new manage route for booking ops with sections: Create, Assign, Monitor.
2. Include "Acting as" selector (self vs club) and "Assign to coach" selector before session creation.
3. Surface pending actions: unassigned sessions, invite responses, counter-offers, cancellations.
4. Route all create/invite actions from console through existing canonical session intent flow.
5. Keep current Manage cards as shortcuts, not parallel workflows.
```

**Acceptance Criteria**:
- [ ] Club owners/admins/head coaches can run booking ops from one route.
- [ ] Acting-as and assign-coach choices are explicit before publish.
- [ ] Existing manage links resolve to console-backed actions.
- [ ] No duplicate employer create flows are introduced.

---

## Item 402: Session Ownership and Assignment Data Contract

**Files**:
- `constants/types.ts`
- `constants/session-types.ts`
- `services/booking/booking-crud-service.ts`
- `services/multi-week-booking-service.ts`
- `services/recurring-booking-service.ts`
- `services/group-session/*`

**Problem**: session ownership and "created on behalf of" metadata are inconsistent, making delegation and reporting unreliable.

**Prompt**:
```text
Define and enforce a booking/session ownership contract for club delegation.

Requirements:
1. Add ownership fields to booking/session records:
   - `ownerCoachId`
   - `createdByUserId`
   - `createdByRole`
   - `actingAs` (`self` | `club`)
   - `clubId` (when applicable)
2. Ensure all booking creation paths populate these fields.
3. Keep one write contract: route direct creation through `bookingService.createBooking()`;
   internal generated flows must attach ownership metadata consistently.
4. Update type-safe mappers and list views so these fields are visible for filtering.
```

**Acceptance Criteria**:
- [ ] Every new booking/session has consistent ownership metadata.
- [ ] Club-created sessions are distinguishable from coach-self-created sessions.
- [ ] Multi-week and recurring generated bookings preserve ownership lineage.
- [ ] Type errors enforce ownership fields where required.

---

## Item 403: Assign-to-Coach Flow in Session Creation

**Files**:
- `app/sessions/create.tsx`
- `hooks/use-create-session.ts`
- `components/session/create-details-step.tsx`
- `services/academy-service.ts` (permission checks)

**Problem**: owners can choose "on behalf of club" in some invite contexts, but cannot reliably create sessions assigned to a specific coach inside one flow.

**Prompt**:
```text
Add coach assignment into the canonical create session flow for club-capable roles.

Requirements:
1. When user has club booking permission, show assignee picker in create flow.
2. Require assignee before publish for club-owned sessions.
3. Respect academy/club permissions (`CREATE_SESSIONS`, `POST_AS_ACADEMY`).
4. Show clear ownership summary in review step: "Created by X on behalf of Y, assigned to Z".
5. Reuse existing club selection component patterns (no duplicate UI model).
```

**Acceptance Criteria**:
- [ ] Eligible club roles can assign a session to another coach.
- [ ] Ineligible roles do not see assignment controls.
- [ ] Review/confirmation clearly states owner and assignee.
- [ ] Assigned coach sees session in Schedule and Bookings surfaces.

---

## Item 404: Recurring Programs for Club-Owned Sessions

**Files**:
- `hooks/use-create-session.ts`
- `services/recurring-booking-service.ts`
- `services/multi-week-booking-service.ts`
- `services/invite/session-invite-service.ts`

**Problem**: recurring setup is fragmented (subscribe, multi-week, invite-recurring, create-recurring), and club-owned delegation is not first-class.

**Prompt**:
```text
Unify recurring setup for club-owned and coach-owned sessions under one recurrence model.

Requirements:
1. Support recurring creation with explicit owner/assignee metadata.
2. Align invite acceptance recurring behavior with same series model.
3. Provide one recurring status view for active/paused/cancelled program health.
4. Keep explicit guardrails for unsupported combinations and provide immediate alternatives.
5. Avoid introducing a second recurring wizard.
```

**Acceptance Criteria**:
- [ ] Club-assigned recurring sessions can be created and managed end-to-end.
- [ ] Recurring series entries are visible with ownership and assignee context.
- [ ] Invite-based recurring acceptance aligns with standard series behavior.
- [ ] Unsupported recurrence/invite combos are blocked with actionable guidance.

---

## Item 405: Club Master Operations View (Day + Risk + Accountability)

**Files**:
- `app/club/[clubId]/dashboard.tsx`
- `app/club/[clubId]/calendar.tsx`
- `hooks/use-club-dashboard.ts`
- `hooks/use-club-calendar.ts`
- `app/(tabs)/bookings/index.tsx`
- `hooks/use-bookings.ts`

**Problem**: club dashboards are not booking-operations aware, and there is no consolidated employer visibility for assigned sessions and booking risk.

**Prompt**:
```text
Add booking operations surfaces for club masters.

Requirements:
1. Add "Today" board for club-managed sessions: assigned coach, status, check-in readiness.
2. Add risk queue: cancellation-window risk, waitlist pressure, unconfirmed bookings.
3. Add attribution tags in lists/cards: "Assigned by Club", "Coach-owned", "Recurring Program".
4. Ensure club-created bookings appear in day-level club calendar and assigned coach day schedule.
5. Provide filters by coach, squad, and ownership type.
```

**Acceptance Criteria**:
- [ ] Club owners/admin/head coaches can see operational booking health in one dashboard.
- [ ] Club-created sessions appear in both club day view and assigned coach day view.
- [ ] Booking lists support filtering by ownership/assignee.
- [ ] Risk signals are visible before sessions fail (not post-mortem only).

---

## Validation Plan (both sprints)

- Extend `scripts/ui-flow-checks-50.mjs` with:
  - coach manage -> club booking console route
  - assign-to-coach create flow
  - club-created session visibility in coach schedule/bookings
  - parent booking flow regression checks
- Add targeted tests for ownership metadata propagation in:
  - direct booking creation
  - invite acceptance
  - recurring generation
  - multi-week series creation

