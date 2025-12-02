# Sprint 5: Club Services, Availability & Booking Alignment

**Intent**: Let coaches sell and schedule directly to club groups so discovery → post → booking is seamless. When a coach offers a session to a squad/class, parents and players should immediately see and book through the same club surfaces.

## Why this matters
- Revenue loop: service offer in feed → booking CTA → roster-aware scheduling → objectives logged. Must feel native, not bolted on.
- Parents want group-aware booking ("book for U12 Red"), not hunting for the right service in a generic list.
- Coaches need to avoid double-entry; services/availability should be club-owned with clear coach assignment and facility conflicts.

## Primary user journeys (mocked)
- **Coach** creates a club-owned service (clinic/camp/team session), selects eligible squads/classes, assigns coaches, and posts offer to those groups.
- **Parent/Player** sees the offer in feed/Announcements, taps booking CTA, picks slot (pre-filtered to that squad), confirms objectives, and sees it appear in Bookings with club context.
- **Owner/Admin** oversees schedule: approvals queue, conflict warnings (facility/coach), and quick edits to assignments.

## Build scope
- Service management UI scoped to club: owner=club, coach assignment picker, squad eligibility, location/facility selector, capacity, price (mock), recurrence.
- Availability alignment: reuse availability builder for assigned coaches; conflict hints when overlapping with personal services or facility slots.
- Offer posting: from service card or feed composer template; auto-attaches squad scope and booking CTA payload.
- Booking cards with club context: show squad badge/name, objectives, notes, and quick actions (message coach, reschedule/cancel if role allows).

## Integration & constraints
- Booking CTA must reuse existing booking flow but pre-filtered by squad/service; ensure context pill persists across steps.
- Approvals should surface in club home/coach view with existing booking states (requested/confirmed/past) and keep objective requirement intact.
- Mock payment data only; wire data seams for Stripe later but keep UI parity (price, capacity, slots left).

## Interlocks & FB-grade behaviors
- Feed offers (Sprint 2) and roster shortcuts (Sprint 3) prefill squad and attendee context; completed bookings post back as updates to keep threads alive.
- Badge suggestions (Sprint 4) trigger after session completion and surface in feed/home; attendance feeds back into roster chips.
- Trust controls (Sprint 6) block suspended users from booking and include consent/waiver reminders in the CTA flow.
- Analytics (Sprint 7) captures click-through, drop-off, and conversion by squad/offer type to inform ranking and nudges.

## Acceptance criteria
- Coaches can create/edit club-owned services with squad eligibility and coach assignment; conflicts hinted using mock data.
- Service offers can be posted to feed/Announcements with booking CTA that opens pre-filtered booking flow for that squad.
- Parents/players can book from offer, see club context on booking cards, and manage/reschedule with proper permissions.
- Approvals/requests visible to owners/head coaches; objective entry enforced; loading/error/empty states covered.
