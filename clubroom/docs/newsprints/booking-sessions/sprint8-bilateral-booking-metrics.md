# Sprint 8 Addendum: Bilateral Booking Metrics & Sub-Metrics

**Date**: 2026-03-04  
**Scope**: Booking/Revenue + Community/Growth + Development + Trust/Ops

## 1) Bilateral booking cases (complete matrix)

### A. Direct parent/athlete booking
- Parent -> Coach (for child)
- Athlete -> Coach (self)

### B. Invite-led booking
- Coach invite -> Parent accept (single slot)
- Coach invite -> Parent accept (recurring weeks)
- Parent counter -> Coach accept

### C. Club/org on-behalf booking
- Club-owned offering -> parent/athlete books
- Club invite sent by staff -> parent accepts -> assigned coach delivers
- Reassigned assignee coach before session

### D. Group/club session pathways
- Parent registers child into group session (auto-linked booking)
- Athlete self-registers into open group session
- Waitlist -> promoted -> booking linked

### E. Event/discover-origin booking
- Club event projected to offering -> parent/athlete books
- Open discover offering -> direct booking

### F. Recurring contract paths
- Direct recurring series create
- Invite recurring acceptance with partial weeks
- Series cancel/pause/partial completion

---

## 2) Where options must be shown

### Discover surfaces
- `Bookings > Discover`:
  - Pending invites (action required)
  - This-week offerings
  - Familiar coaches
  - Club sessions
  - Open sessions
- `Discover Sessions`:
  - Pending invites (same action-required state)
  - Search + skill/type filtered offerings

### Booking surfaces
- `Bookings > Upcoming/Past`:
  - Direct bookings
  - Recurring-generated bookings
  - Registered group/club sessions
  - Org-owned sessions relevant to viewer
- `Booking Detail`:
  - Payment status (no demo badge)
  - Coach review status
  - Ownership/audit (coach view)

### Invite surfaces
- `Session Invites list`
- Invite cards in discover surfaces
- Invite detail with accept/decline/counter

### Coach operating surfaces
- Assigned/owned/created org sessions in bookings
- Earnings reconciler for payment status follow-through

---

## 3) Funnel metrics by stage (with sub-metrics)

## Stage 0: Supply visibility
- `M0.1 Offerings Available`: count of visible offerings per user/day.
- `M0.2 Source Mix`: `% direct / event / group` offerings shown.
- `M0.3 Coach Coverage`: unique visible coaches per user/week.
- `M0.4 Club Coverage`: unique visible clubs per user/week.
- `M0.5 Invite Presence`: sessions with pending invite surfaced in discover.

## Stage 1: Discovery engagement
- `M1.1 Discover Open Rate`: users opening discover surfaces / active users.
- `M1.2 Invite Interaction Rate`: invite cards tapped per invite impression.
- `M1.3 Offering CTR`: offering taps / offering impressions.
- `M1.4 Find Coach CTR`: find-coach taps / discover sessions.
- `M1.5 Filter Usage`: skill/type/search filter usage rate.
- `M1.6 Zero-Result Rate`: filtered views with no results.

## Stage 2: Intent to book
- `M2.1 Session Type Select Rate`: select session type / offering tap.
- `M2.2 Drop at Type Step`: exits after type step / entrants.
- `M2.3 Message-vs-Book Split`: message coach taps vs continue taps.
- `M2.4 Source Intent Mix`: intents by source (`direct|event|group`).

## Stage 3: Schedule + details
- `M3.1 Slot Selection Rate`: slot selected / intent started.
- `M3.2 Slot Conflict Rate`: unavailable/conflict outcomes / slot attempts.
- `M3.3 Details Completion Rate`: details step complete / schedule entrants.
- `M3.4 Location Choice Mix`: coach preset vs my location vs neutral vs virtual.
- `M3.5 Time-to-Complete Details`: median step duration.

## Stage 4: Review/payment understanding
- `M4.1 Review Step Reach`: users reaching review step / flow starts.
- `M4.2 Payment Clarity Actions`: payment action taps (message coach/reconciler).
- `M4.3 Payment Ambiguity Flags`: help or abandon at review/payment.

## Stage 5: Booking submit
- `M5.1 Submit Success Rate`: successful bookings / submit attempts.
- `M5.2 Idempotency Duplicate Rate`: duplicate submits deduped / submits.
- `M5.3 Create Failure Rate`: failed create (validation/conflict/system) / submits.
- `M5.4 Median Create Latency`: submit -> booking created.
- `M5.5 Lineage Completeness`: bookings with `sessionSource` + entity linkage.

## Stage 6: Post-submit confirmation
- `M6.1 Confirmation View Rate`: booking detail opened after create.
- `M6.2 Coach Message Follow-up`: users messaging coach within 24h.
- `M6.3 Cancellation Early Rate`: cancels within first 24h of create.

## Stage 7: Invite lifecycle
- `M7.1 Pending->Accepted Conversion`
- `M7.2 Pending->Declined Rate`
- `M7.3 Counter Offer Rate`
- `M7.4 Counter Acceptance Rate`
- `M7.5 Invite->Booking Link Rate` (accepted invites that produce linked bookings)
- `M7.6 Invite Stale/Expire Rate`

## Stage 8: Recurring lifecycle
- `M8.1 Recurring Offer Take Rate`
- `M8.2 Weeks Accepted Ratio` (accepted weeks / proposed weeks)
- `M8.3 Series Completion Rate`
- `M8.4 Series Cancellation/Partial Rate`
- `M8.5 Recurring Lineage Integrity` (generated bookings keep series + source linkage)

## Stage 9: Group/club lifecycle
- `M9.1 Registration->Booking Link Rate`
- `M9.2 Waitlist Promotion Rate`
- `M9.3 Club Session Visibility Rate` (discover + bookings)
- `M9.4 Assignee Utilization` (sessions delivered by assignee vs owner)
- `M9.5 Reassignment Stability` (reassigned sessions with no participant churn)

## Stage 10: Trust and quality
- `M10.1 Double-booking Incidents`
- `M10.2 Safeguarding/DBS Booking Blocks`
- `M10.3 Payment Dispute Rate`
- `M10.4 Session No-Show Rate`
- `M10.5 Problem Report Rate per 1k bookings`

## Stage 11: Review loop
- `M11.1 Review Prompt Reach` (completed sessions eligible to review)
- `M11.2 Review Submit Rate`
- `M11.3 Review Latency` (session complete -> review submitted)
- `M11.4 Duplicate Review Prevention Hit Rate`
- `M11.5 Coach Rating Delta` over trailing 30 days

---

## 4) Required dimensions for every metric

- `role`: parent, athlete, coach, admin
- `actingAs`: self, club
- `source`: direct, event, group
- `surface`: discover_feed, discover_sessions, bookings_list, invite_detail, wizard_step
- `clubId` and `coachId`
- `inviteType`: open, closed, squad
- `deviceClass`: SE/small, standard, large
- `weekBucket`: ISO week

---

## 5) Coach scorecard (what coaches care about)

- Pipeline: visible demand -> booking intents -> confirmed bookings.
- Assignment health: owner vs assignee load, reassignment outcomes.
- Revenue ops: paid/awaiting/write-off split, reminder effectiveness.
- Quality: cancellations, no-shows, review volume and rating trend.

## 6) Parent scorecard (what parents care about)

- Discovery quality: relevant sessions shown, invite visibility.
- Booking reliability: success rate, conflict rate, time-to-book.
- Flexibility: counter-offer resolution rate, recurring acceptance control.
- Trust: clear payment instructions, cancellation transparency, problem resolution.

---

## 7) Spond-level integration acceptance checks

- Every pending invite appears in at least one discover surface and invites list.
- Club sessions appear in both discover and bookings when relevant.
- Source lineage is preserved across direct, invite, recurring, and group-generated bookings.
- Coach visibility includes `coachId`, `assigneeCoachId`, `ownerCoachId`, `createdByUserId` cases.
- Review submit feedback is short-lived and booking detail immediately reflects submitted state.

