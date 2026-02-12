# Coach Club + Appointment Master Plan

## Status
- `Draft`
- Owner: Product + Engineering
- Scope: Coach role surfaces only

## Goal
Make coach operations feel immediate and obvious:
- Club management is always reachable.
- Session creation/invite actions run through one flow.
- The flow adapts by context (roster, schedule, group/manage, existing session).
- "Post/invite on behalf of club" is explicit and role-aware, not hidden.

## Non-Goals
- Rebuild parent booking funnel (`/book/*`) in this phase.
- Replace data models for all session entities in one pass.
- Add payment features.

## Anchor
This plan follows:
- `docs/SOURCE_OF_TRUTH.md`
- Product spines: Booking/Revenue + Community + Development + Trust/Ops
- Reuse-first rule from `AGENTS.md`

---

## 1) Current Problems (why it feels weird)

### 1.1 Flow sprawl
Coaches can start near-identical actions from many places:
- `/sessions/create`
- `/group-sessions/create`
- `/session-invites/create`
- `/session-invites/group`
- `/session-invites/squad`
- `/roster/[athleteId]/add-to-session`

Result:
- Coaches must choose tool before intent is clear.
- Different wizards collect overlapping fields in different orders.
- Same outcome (invite athletes to session) exists in multiple UIs.

### 1.2 Inconsistent creation logic across hooks
Core logic split across:
- `hooks/use-create-session.ts`
- `hooks/use-create-invite.ts`
- `hooks/use-create-group-session.ts`
- `hooks/use-invite-session-flow.ts` (legacy path)

Result:
- Similar fields and validations duplicated.
- Different defaults and labels for same concepts.
- Higher bug risk when one flow is patched but others are not.

### 1.3 Club management is not "always there"
- Coach tab config hides `/(tabs)/club-hub` (`app/(tabs)/_layout.tsx`).
- Management actions exist, but are buried:
  - Group screen manage tab: `app/community/[groupId].tsx`
  - Club settings: `app/club/settings.tsx`
  - Club hub header menu: `components/club/ClubHeader.tsx`

Result:
- Coaches ask "where do I manage club?"
- Control center is fragmented across unrelated surfaces.

### 1.4 "On behalf of club" is conceptually overloaded
Club post flow currently has:
- `feedType` (`PERSONAL|CLUB|BOTH`)
- `postAs` (`self|club`)
- `audience` (`club|squad`)

See:
- `app/(modal)/create-club-post.tsx`
- `hooks/use-create-club-post.ts`
- `components/social/club-post-selectors.tsx`

Result:
- Coaches can pick contradictory combinations.
- Intent ("who am I representing?") is not the first-class decision.

### 1.5 Duplicate rules entry points
Rules appear as:
- Inline modal in schedule availability (`components/coach/scheduling-rules-modal.tsx`)
- Standalone page (`app/availability/scheduling-rules.tsx`)

Result:
- "Scheduling rules vs booking rules" confusion.

---

## 2) North Star UX

## One command, context-aware
All coach session actions start from one orchestrator:
- `Create / Invite Session`
- It asks intent first, then only relevant inputs.

Primary intents:
1. `Book New Session`
2. `Add to Existing Session`

Secondary branch for `Book New Session`:
1. `1-to-1`
2. `Group Session`
3. `Invite-Only Group` (with immediate athlete selection)

Representation decision (club context):
1. `As Me`
2. `As Club` (if permission allows)

Audience decision:
1. `Selected Athletes`
2. `Squad`
3. `Club-wide` (where valid)

## Manage is always visible
Coach has a persistent management entry in high-frequency surfaces:
- Home (development)
- Schedule
- Group/Community
- Club feed

---

## 3) Proposed IA (Information Architecture)

## 3.1 Add a coach "Manage" destination
New dedicated route:
- `/manage` (coach-only shell)

Contents:
- Club Management
- Team/Squad Operations
- Invite and Membership Controls
- Posting Controls (including "post as club")
- Operational settings

Entry points:
- Home top actions (`components/coach/development-sections.tsx`)
- Schedule header action (`app/(tabs)/schedule.tsx`)
- Group manage tab (`components/community/group-manage-tab.tsx`)
- Club header menu (`components/club/ClubHeader.tsx`)

## 3.2 Consolidate creation entry points
Keep one canonical creation route:
- `/sessions/create`

Wrap legacy routes by redirect with prefilled params:
- `/session-invites/create` -> `/sessions/create?intent=invite`
- `/session-invites/group` -> `/sessions/create?intent=invite&scope=group`
- `/session-invites/squad` -> `/sessions/create?intent=invite&scope=squad`
- `/group-sessions/create` -> `/sessions/create?intent=new&type=group`
- `/roster/[athleteId]/add-to-session` stays, but only as launcher into same flow states.

## 3.3 Keep one rules surface
- Keep `Booking Rules` modal as canonical entry from schedule.
- Remove direct nav exposure of standalone scheduling rules page from coach primary flows.
- If standalone page remains for deep links, make it a wrapper over same component.

---

## 4) Unified Appointment Flow Design

## 4.1 Shared flow contract
Create one typed contract that every entry point passes:
- `source`: `schedule | roster | group_manage | club_manage | session_detail | manual`
- `intent`: `new | existing`
- `preselectedAthleteIds[]`
- `preselectedSessionId`
- `clubContextId`
- `actingAs`: `self | club`

## 4.2 Step map (single wizard)
1. `Intent`
   - Book New Session
   - Add to Existing Session
2. `Context`
   - Who is this for? (athletes/squad/club)
   - If launched from roster, athlete preselected and locked by default.
3. `Representation`
   - Post/invite as me or as club.
   - Only shown when coach has club posting/invite permissions.
4. `Session setup`
   - If `new`: type, schedule, capacity, pricing, visibility.
   - If `existing`: pick existing upcoming published session.
5. `Audience + invitations`
   - Select invitees now.
   - Include append-later toggle: "I will invite more athletes later."
6. `Review + send`
   - Single summary with source tag and acting-as label.

## 4.3 Explicit branch: Invite to Existing Session
Required fields:
- Existing session
- Invitees
- Acting-as
- Optional note

Behavior:
- Update offering invite metadata.
- Create invite records per parent grouping.
- Show RSVP state linkage in session detail.

## 4.4 Explicit branch: Make New Session
Required fields:
- Session type
- Date/time
- Duration
- Capacity
- Location
- Visibility (`OPEN|CLOSED|SQUAD_ONLY`)

Behavior:
- Create session/offering.
- Optional immediate invites in same submit transaction.
- If closed/invite-only, enforce invitee selection before finish.

---

## 5) "On Behalf of Club" Logic Spec

## 5.1 Decision order (must be this order)
1. Who am I representing? (`self` vs `club`)
2. Where does this publish? (`personal`, `club`, `both` only when valid)
3. Who should receive it? (`club`, `squad`, selected athletes)

## 5.2 Permission gates
If no club permission:
- Hide `As Club`.

If club selected but user lacks permission:
- Block submit with clear inline reason and action to request role.

## 5.3 Avoid contradictory states
Rules:
- `postAs=club` implies audience cannot be `personal-only`.
- `feedType=BOTH` only available when `postAs=self`.
- `invite on behalf of club` requires `clubContextId`.

---

## 6) Service + Data Architecture Plan

## 6.1 Add orchestration layer
Introduce:
- `services/coach/coach-appointment-orchestrator.ts`

Responsibilities:
- Validate context + permissions.
- Build normalized payload.
- Call downstream services in one sequence.
- Return one operation result object for UI.

## 6.2 Keep canonical booking creation path
Where booking must be created, use:
- `bookingService.createBooking()` only

No UI hook should write booking-like records directly.

## 6.3 Remove UI-level storage writes for core entities
Current hooks write directly to storage keys in places.
Migration target:
- UI hooks call orchestrator/service methods only.
- Services own persistence and side effects.

## 6.4 Event model
Emit one standard event chain:
- `SESSION_CREATED`
- `SESSION_INVITES_SENT`
- `SESSION_INVITE_FAILED` (with granular failure list)
- `SESSION_UPDATED_WITH_INVITEES`

---

## 7) UI Slimming Rules for this domain

Apply to every coach flow step:
- One dominant CTA.
- Maximum two secondary actions.
- No decorative helper paragraphs under each heading.
- Chips and cards only where they change a decision.
- Dense list rows with strong tap affordances.

For mobile:
- Keep vertical rhythm tight.
- Avoid stacked bulky hero cards before primary action.
- Use section headers only where needed.

---

## 8) Page-by-Page Action Plan (coach surfaces)

1. `app/(tabs)/index.tsx` + `components/coach/development-screen.tsx`
- Add persistent `Manage` access in header/actions.
- Keep notifications in top-right.
- Reduce quick-action count to highest-frequency ops.

2. `app/(tabs)/schedule.tsx` + `components/schedule/schedule-quick-actions.tsx`
- Replace split actions (`Send Invite`, `New Session`) with one `Create/Invite` launcher.
- Keep rules entry as `Booking Rules` only.

3. `app/(tabs)/athletes.tsx` + `components/roster/athlete-card.tsx`
- Preserve add-to-session shortcut.
- Ensure row press always opens profile.
- Keep add button purely for booking/invite intent.

4. `app/roster/[athleteId]/add-to-session.tsx`
- Keep exactly two options:
  - Book New Session
  - Add to Existing Session
- Route both through unified flow contract.

5. `app/sessions/create.tsx`
- Become canonical orchestrator wizard.
- Accept context params from all entry points.

6. `app/session-invites/create.tsx`, `app/session-invites/group.tsx`, `app/session-invites/squad.tsx`
- Convert to wrappers/redirects to canonical flow, then deprecate.

7. `app/group-sessions/create.tsx`
- Keep only if truly distinct product need remains.
- Otherwise redirect with `type=group` preset into canonical flow.

8. `app/community/[groupId].tsx` + `components/community/group-manage-tab.tsx`
- Keep manage tab.
- Add direct `Manage Club` entry and unified session launcher.

9. `app/(tabs)/club-hub.tsx` + `components/club/ClubHeader.tsx`
- Keep club ops, but mirror same manage destination.
- Avoid separate hidden management mental model.

10. `app/(modal)/create-club-post.tsx` + `hooks/use-create-club-post.ts`
- Reorder selector logic: representation first, distribution second, audience third.
- Keep event attachment option.

11. `app/club/settings.tsx`
- Keep as settings depth page from `/manage`.

12. `app/availability/scheduling-rules.tsx`
- Remove from main coach navigation pathways.
- Keep compatibility wrapper if needed.

---

## 9) Test Data Plan (coach 1)

Required seed state:
- `coach1` is:
  - Owner of one club
  - Editor/Admin in another club context
- At least one `existing published group session` with spare capacity
- At least one `invite-only session` with:
  - RSVP `going`
  - RSVP `maybe`
  - RSVP `cant_go`
- At least 6 athletes in roster across 3 parents
- At least 2 squads with overlapping athletes

Validation scenarios:
- Invite athlete from roster into existing session
- Create new invite-only group, add invitees now, append more later
- Switch acting-as between self and club and verify visibility/publish behavior

---

## 10) Delivery Phases

## Phase 0 - Instrument + map (1 day)
- Add analytics tags for all current entry points.
- Measure completion drop-offs.

## Phase 1 - IA + discoverability (1-2 days)
- Add `/manage`.
- Add management entry buttons from home/schedule/group/club surfaces.

## Phase 2 - Unified flow shell (2-3 days)
- Build context contract + intent step.
- Route existing entry points into unified shell.

## Phase 3 - Service orchestration (2-3 days)
- Create `coach-appointment-orchestrator`.
- Move direct storage writes out of UI hooks.

## Phase 4 - Remove legacy branches (1-2 days)
- Convert legacy invite/group screens into wrappers or delete.
- Keep deep-link compatibility.

## Phase 5 - polish + QA (2 days)
- Visual density pass.
- Mobile tap-target and contrast checks.
- End-to-end regression checklist.

---

## 11) Success Metrics

Product:
- Coach reaches club management in <= 2 taps from home.
- Appointment creation completion rate increases.
- Time-to-first-invite decreases.

Engineering:
- Number of active creation paths reduced to one canonical flow.
- Duplicate hooks for appointment creation removed/deprecated.
- No direct storage writes from UI for core appointment entities.

Support:
- Fewer "how do I invite/create/manage club" reports.

---

## 12) Risks + Mitigations

Risk: Route breakage from consolidation
- Mitigation: wrappers keep old URLs functional during migration.

Risk: Behavior drift between old and new flows
- Mitigation: snapshot tests per intent branch and shared payload builders.

Risk: Role permission regressions (self vs club)
- Mitigation: explicit permission matrix tests per role.

Risk: Scope creep
- Mitigation: keep this phase coach-only and booking/community surfaces only.

---

## 13) Immediate Next Build Ticket List

1. Create `/manage` screen shell and wire coach navigation entries.
2. Add `coach appointment context` type and route param parser.
3. Refactor `/sessions/create` to intent-first step.
4. Redirect `session-invites/*` routes into `/sessions/create` with context.
5. Implement `coach-appointment-orchestrator` service.
6. Refactor `use-create-session` and `use-create-invite` to call orchestrator.
7. Simplify club post selector order and state constraints.
8. Remove duplicate scheduling rules path from primary navigation.
9. Seed coach1 ownership/editor + RSVP test fixtures.

