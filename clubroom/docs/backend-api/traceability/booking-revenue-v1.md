# Booking + Revenue V1 Traceability Matrix (UI <-> API <-> Data <-> AuthZ)

This is the first concrete bilateral traceability matrix. It ties real frontend booking/revenue routes/components/services to planned backend endpoints and database tables.

## Scope
Covers:
- booking wizard (parent/athlete)
- booking detail / cancel / reschedule
- group sessions + registration + waitlist
- invites + RSVP
- invoices + reconciler actions

## Key Frontend Anchors (confirmed in repo)
### Routes (`app/`)
- `app/book/[coachId]/index.tsx`
- `app/book/[coachId]/session-type.tsx`
- `app/book/[coachId]/schedule.tsx`
- `app/book/[coachId]/details.tsx`
- `app/book/[coachId]/review.tsx`
- `app/book/[coachId]/confirmation.tsx`
- `app/(tabs)/bookings/index.tsx`
- `app/(tabs)/bookings/[id].tsx`
- `app/booking/[id]/cancel.tsx`
- `app/group-sessions/index.tsx`
- `app/group-sessions/[id].tsx`
- `app/group-sessions/[id]/roster.tsx`
- `app/session/[id]/rsvp.tsx`
- `app/invites.tsx`
- `app/coach-invites.tsx`
- `app/(tabs)/earnings.tsx`
- `app/analytics/revenue.tsx`

### Components (`components/`)
- `components/ui/booking/booking-wizard.tsx`
- `components/ui/booking/session-type-selector.tsx`
- `components/ui/booking/calendar-picker.tsx`
- `components/ui/booking/time-slot-picker.tsx`
- `components/ui/booking/review-payment-sections.tsx`
- `components/group/waitlist-banner.tsx` (referenced in sprint docs)
- `components/invoices/*`

### Hooks / Services
- `hooks/use-booking-detail.ts`
- `hooks/use-booking-cancel.ts`
- `hooks/use-bookings.ts`
- `hooks/use-bookings-discover.ts`
- `hooks/use-group-session.ts`
- `hooks/use-group-sessions.ts`
- `hooks/use-event-rsvp.ts`
- `hooks/use-invites.ts`
- `services/booking-service.ts` + `services/booking/*`
- `services/group-session-service.ts` + `services/group-session/*`
- `services/invite/*`
- `services/event/*`
- `services/invoice-service.ts`
- `services/earnings/*`

## Bilateral Traceability Matrix
| Flow | UI route(s) | UI components/hooks/services | API endpoint(s) | DB tables | AuthZ + grant rules | Write safety | Audit events | UI states / error handling |
|---|---|---|---|---|---|---|---|---|
| Coach availability for booking wizard | `app/book/[coachId]/schedule.tsx` | `calendar-picker`, `time-slot-picker`, `services/availability-service.ts` | `GET /v1/coaches/:coachUserId/availability/slots` | `availability_templates`, `availability_overrides`, `scheduling_rules`, `bookings` (for occupancy) | public/eligible booking view; hidden blocked/internal notes | read only | optional read audit if sensitive flags included (usually no) | empty state for no slots; helper text when no date selected; stale slot errors handled on submit |
| Create booking (direct, parent/athlete) | `app/book/[coachId]/review.tsx`, `.../confirmation.tsx` | `booking-wizard`, `review-payment-sections`, `services/booking/booking-crud-service.ts` | `POST /v1/bookings` | `bookings`, `booking_participants`, `booking_objectives`, `booking_status_events`, `idempotency_keys`, `audit_events`, `outbox_events` | `parent` guardian of athlete OR `athlete` self OR coach manual create path; verification/consent gates as needed | `X-Idempotency-Key` required; transaction; version on dependent slot capacity if applicable | `booking.created` + status event + notifications outbox | handle validation, conflict (slot taken), authz deny, rate limit, retry-safe double submit |
| Booking detail read | `app/(tabs)/bookings/[id].tsx` | `hooks/use-booking-detail.ts`, `hooks/use-resolved-booking.ts` | `GET /v1/bookings/:bookingId` | `bookings`, `booking_participants`, `booking_change_requests`, `booking_status_events` | participants, guardian of participant athlete, owner coach; delegated club access only if explicit grant and scoped | n/a | optional `booking.read_sensitive` only if sensitive fields added | render role-based actions; permission denied vs not found split |
| Cancel booking | `app/booking/[id]/cancel.tsx`, `app/(tabs)/bookings/[id].tsx` | `hooks/use-booking-cancel.ts`, `services/booking/*` | `POST /v1/bookings/:bookingId/cancel` | `bookings`, `booking_status_events`, `booking_change_requests`, `invoices` (fee implications), `idempotency_keys` | participant/guardian/coach by policy + cancellation rule evaluation | idempotent write; conflict if status changed | `booking.cancelled`; invoice/reconciler audit if fee applied | 24h policy notice, deny within policy, conflict on already-cancelled, retry-safe confirm action |
| Reschedule request | `app/(tabs)/bookings/[id].tsx` -> messaging template flow | booking detail actions, messaging integration | `POST /v1/bookings/:bookingId/reschedule-request` | `booking_change_requests`, `audit_events`, `outbox_events` | participant/guardian/coach according to booking relationship | idempotent on repeated tap; conflict if booking terminal | `booking.reschedule_requested` | UI can route to chat; endpoint can create structured request and optionally prefill message payload |
| Group session list/detail | `app/group-sessions/index.tsx`, `app/group-sessions/[id].tsx` | `hooks/use-group-sessions.ts`, `hooks/use-group-session.ts`, `services/group-session/*` | `GET /v1/group-sessions`, `GET /v1/group-sessions/:id` | `group_sessions`, `group_session_registrations`, `waitlist_entries` | visibility by invite type / squad / club membership | n/a | none (standard reads) | full/empty/loading states; waitlist position shown if registered/waitlisted |
| Group session register | `app/group-sessions/[id].tsx` | `hooks/use-group-session.ts`, `services/group-session/session-registration-service.ts` | `POST /v1/group-sessions/:id/register` | `group_session_registrations`, `group_sessions`, `waitlist_entries`, `idempotency_keys` | parent for linked athlete, athlete self, coach/admin for manual registration (scoped) | idempotent; transaction-safe capacity check; conflict on stale status | `group_session.registered` / `waitlist.joined` | handle full capacity -> waitlist CTA, duplicate tap, already registered, deadline passed |
| Waitlist join/leave | `app/group-sessions/[id].tsx` + waitlist banner | `components/group/waitlist-banner.tsx` | `POST /v1/group-sessions/:id/waitlist`, `POST /v1/waitlist/:id/leave` | `waitlist_entries`, `group_sessions`, `idempotency_keys` | same as registration | idempotent | `waitlist.joined`, `waitlist.left` | return user position + total count to avoid UI-only guessing |
| Invite list and response | `app/invites.tsx`, `app/coach-invites.tsx` | `hooks/use-invites.ts`, `hooks/use-coach-invites.ts`, `services/invite/*` | `GET /v1/invites`, `POST /v1/invites/:inviteId/respond` | `invites`, `invite_targets`, `bookings` (on acceptance), `idempotency_keys` | sender/recipient scoped; accept only target user/guardian | idempotent; acceptance may trigger booking create path | `invite.responded`, `booking.created` (if accepted -> booking) | duplicate accept/decline safe, stale invite status, permission denied hidden as not found if safer |
| Event RSVP | `app/session/[id]/rsvp.tsx` and event flows | `hooks/use-event-rsvp.ts`, `services/event/event-rsvp-service.ts` | `POST /v1/events/:eventId/rsvp` | `club_events`, `event_rsvps`, `idempotency_keys` | event audience member only | idempotent | `event.rsvp.responded` | handle deadline passed, guest count validation, capacity/waitlist if enabled |
| Coach invoice list/revenue dashboard | `app/(tabs)/earnings.tsx`, `app/analytics/revenue.tsx` | `services/invoice-service.ts`, `services/earnings/*` | `GET /v1/coaches/me/invoices`, `GET /v1/coaches/me/invoices/summary` | `invoices`, `invoice_events`, `reconciler_entries` | coach self or delegated finance grant | n/a | financial reads optionally audited for sensitive access | filters, overdue badges, totals use server-calculated fields |
| Reconciler state transitions | earnings/reconciler UI | invoice/reconciler hooks/services | `POST /v1/invoices/:invoiceId/mark-paid|mark-unpaid|write-off|restore` | `invoices`, `invoice_events`, `reconciler_entries`, `idempotency_keys` | coach self / delegated finance only | idempotent; transaction updates invoice + event + reconciler | mandatory financial audit events | optimistic UI okay with rollback on conflict/deny |

## Contract Priorities (build first)
1. `CreateBookingRequest` / `BookingResponse`
2. `CancelBookingRequest` / `BookingStatusTransitionResponse`
3. `GroupSessionDetailResponse` + registration/waitlist responses (include user waitlist position)
4. `InviteResponseRequest`
5. `InvoiceResponse` + reconciler transition responses

## Known Risk Areas (from `docs/newsprints/` history)
- Booking double submit and idempotency gaps
- Parent actions missing on booking detail (role-conditioned UI/API parity)
- Waitlist position visibility (API should return position, not just total)
- Offline replay conflict handling for writes (design now, full sync later)
- Invoice status transition correctness and auditability

## Required API Guarantees for This Matrix
- Write endpoints above require idempotency keys
- Conflict-prone writes return `409` with current version/context
- Role + relationship + delegation checks at service layer and repository filters
- Audit all writes, plus sensitive reads if added to booking/financial views
- All DTOs use shared `zod` contracts
