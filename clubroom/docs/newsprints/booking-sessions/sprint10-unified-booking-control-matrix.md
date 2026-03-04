# Booking & Sessions Sprint 10: Unified Booking Control Matrix

**Date**: 2026-03-04
**Status**: Execution report (implemented + gaps)
**Scope**: Parent/Athlete booking, Coach delivery, Club admin operations, Notifications, Retention loop

## 1) What was fixed immediately

1. Session cards no longer show `+N off-platform` text.
2. Off-platform participants are still included in filled slot counts (`headcount/max`) automatically.
3. Event notifications now target recipients by club membership + audience + squad scope (instead of broad sends).
4. Notification list/count now respect `recipientId` filtering in the UI hook.
5. Offering-led booking now hard-locks preset venue in details step when offering already defines location.
6. Squad event creation now persists `squadIds` so cancellation notifications stay squad-scoped.

## 2) Canonical user perspectives (end-to-end)

## Parent / Athlete

Goal:
- Find relevant session quickly.
- Book with minimal re-entry.
- Track what is booked, what changed, and what to do next.

Working path:
1. Entry from map, discover card, invite, coach card, or session detail.
2. Resolver at `/book/[coachId]/index.tsx` preloads draft from offering when possible.
3. Wizard skips steps when data is known (offering/date/time/location/child).
4. Confirm creates booking through canonical write service.
5. Booking appears in sessions list and detail.

## Coach (independent)

Goal:
- Fill sessions, keep schedule stable, reduce churn.

Working path:
1. Create/publish sessions via create stack.
2. Track bookings and attendance in sessions + detail modal.
3. Manage capacity (including off-platform attendance) without breaking parent display.
4. Receive invite/booking/review notifications addressed to coach identity.

## Club Admin / Head Coach

Goal:
- Create or assign sessions on behalf of club with clean ownership and delivery responsibility.

Working path:
1. Create session/event with club lineage fields.
2. Assign/reassign delivery coach.
3. Notify target audience (club, squad, audience segment).
4. Confirm sessions/events are visible in parent discovery + booking surfaces where relevant.

## 3) Booking entry-path matrix (same vs different)

| Entry path | First UI | Same core booking stack? | Prefill quality | Main divergence | Status |
|---|---|---|---|---|---|
| Find on map (`discover_map`) | Map card -> `/book/[coachId]` | Yes | Medium (coach-level unless offering resolved) | Can still start at type step if no deterministic offering | Partial |
| Discover offering card | Offering card -> `/book/[coachId]?offeringId=...` | Yes | High | Minimal divergence | Good |
| Discover coach card | Coach card -> `/book/[coachId]` with preferred offering fallback | Yes | Medium-high | May land on type step depending offering resolution | Partial |
| Invite acceptance | Invite detail action-first | No (bypasses wizard by design) | High | Fast accept path, not step wizard | Intentional difference |
| OfferedByClub | Same wizard | Yes | High | Ownership labels can be inconsistent in review/confirmation | Partial |
| Recurring single-week | Same wizard | Yes | Medium-high | Recurring date resolution can fallback to schedule | Partial |
| Recurring multi-week | `/book/[coachId]/multi-week` | Shared model, different screen | High | Separate week-picker UX | Intentional difference |
| Group session registration | Group session detail route | Adjacent path (registration first) | High for group | Not always routed through normal wizard | Intentional difference |

## 4) Control ownership matrix (who controls what)

| Capability | Parent/Athlete | Coach | Club Admin |
|---|---|---|---|
| Select session offering | Yes | N/A | N/A |
| Select child/self booking target | Yes | N/A | N/A |
| Override offered venue | No when offering has preset venue | Can define venue at creation | Can define venue at creation |
| Session capacity | View | Manage own/assigned sessions | Manage club sessions |
| Off-platform attendee count | No | Yes (manage UI) | Yes (if manager role) |
| Booking create write | Indirect via wizard/accept | Indirect via invite ops | Indirect for org flows |
| Invite send/respond | Respond | Send/manage | Send/manage at org scope |
| Club event audience target | View/respond | Create/publish if permitted | Create/publish + audience/squad scope |
| Ownership/assignee fields | View only | View/manage where permitted | Primary control owner |

## 5) Club event notifications coverage

Current behavior:
1. Event creation stores draft only.
2. Publishing + `inviteClub(eventId)` sends notifications to active members filtered by event audience.
3. `inviteSquads(eventId, squadIds)` updates event squad scope and notifies only matching squad members.
4. Event cancellation sends notifications to the originally scoped audience (including squad scope when present).
5. Squad-event bulk invite creation now stores `squadIds` so cancel path remains correctly scoped.

Coverage answer:
- Yes, club events are wired to show in notifications with recipient targeting.
- Remaining dependency: downstream callers must invoke publish/invite actions consistently.

## 6) Is every option covered?

Covered now:
1. Discover offering -> wizard prefill.
2. Discover coach -> fallback prefill logic.
3. Session detail modal -> routes into full wizard (not one-click book).
4. Invite accept -> canonical booking creation path.
5. Off-platform count absorbed into capacity display.
6. Club event notifications with audience/squad targeting.

Still partial/gaps:
1. Map booking entry still coach-first; not always offering-first.
2. Club ownership context is not always explicit enough on review/confirmation.
3. Invite path remains a separate UI contract (fast action), which is correct but visually different.
4. Notification role scoping still depends on consistent `recipientId` population in every trigger path.

## 7) Retention, ease-of-use, tracking, tidy-up loop

## Retention loop stages

1. Find
- Metrics: discover impressions, map pin taps, filter usage, zero-result rate.

2. Decide
- Metrics: offering card CTR, invite action rate, wizard step-1 continue rate.

3. Book
- Metrics: schedule pick success, detail completion rate, review-to-confirm rate, submit success/failure.

4. Attend
- Metrics: attendance completion, no-show rate, cancellation timing.

5. Reflect
- Metrics: review submit rate, review latency, coach feedback visibility.

6. Rebook
- Metrics: repeat booking within 7/30 days, recurring conversion, drop-off after first completed booking.

## Required sub-metrics (minimum)

1. Flow source dimensions:
- `source`: map, discover_feed, discover_sessions, invite_detail, session_detail_modal, recurring.

2. Role dimensions:
- `role`: parent, athlete, coach, admin.
- `actingAs`: self, club.

3. Ownership dimensions:
- `coachId`, `ownerCoachId`, `assigneeCoachId`, `clubId`.

4. Outcome dimensions:
- `status`: success, validation_fail, conflict_fail, abandoned.
- `step`: type, schedule, details, review, confirm.

## Tidy-up after booking (must be deterministic)

1. Booking created -> appears in `My Sessions` with correct source/ownership labels.
2. Invite linked -> pending invite state removed or marked handled.
3. Notifications reflect outcome for relevant parties only.
4. Session detail reflects capacity changes and review state promptly.
5. Cancellation path has waitlist/recovery handling where applicable.

## 8) Devil’s advocate checks (failure probes)

1. If parent changes active child mid-flow, does draft stay valid and scoped?
2. If offering fills between review and confirm, does conflict handling keep trust (no silent fail)?
3. If club reassigns coach after booking, does booking detail show clear delivery owner?
4. If event created for squads only, can cancellation accidentally notify whole club? (fixed by storing squad IDs + squad-aware recipient resolution)
5. If notification is created without recipient, does it leak across users? (needs stricter platform policy over time)

## 9) Next implementation set (priority)

## P0
1. Make map booking entry offering-aware (pass deterministic `offeringId` when available).
2. Add ownership block to booking review/confirmation for `actingAs='club'`.
3. Add telemetry for every booking step transition and failure code.

## P1
1. Unify invite success feedback with wizard visual language (in-app sheet, not abrupt redirect only).
2. Standardize notification trigger contract so all user-facing notifications require `recipientId`.
3. Add explicit source chip in wizard header (`Map`, `Discover`, `Invite`, `Club`, `Recurring`).

## P2
1. Consolidate recurring and standard review visuals into one reusable summary component.
2. Expand automated tests for ownership matrix (`coachId` vs `ownerCoachId` vs `assigneeCoachId`).

## 10) Acceptance bar for “booking is right”

Booking system is considered correct only when:
1. Every entry path uses canonical state + write authority.
2. Known context is prefilled and non-essential steps are skipped.
3. Ownership and control are explicit and auditable.
4. Notification targeting is recipient-safe and audience-correct.
5. Post-booking lifecycle (tracking, review, rebook, tidy-up) is measured and stable.
