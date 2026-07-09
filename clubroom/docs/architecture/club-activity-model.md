# Club Activity Model

Validated: 2026-07-08
Purpose: define how club events, training, and matches should link together in Clubroom instead of behaving like separate product worlds.

## Product Rule

At club level, the user should experience one `club activity` schedule, not one events product plus one training product.

A club activity can be:

- an informational event such as a presentation, fundraiser, meeting, or social
- a private training session for the club
- a private training session for a specific squad
- a club-linked training session that also admits outside athletes

The participation behavior can vary:

- `info only`
- `RSVP`
- `registration`
- `availability`

But the top-level concept exposed to club users is still `club activity`.

## Current Repo Reality

Today the source records are still split:

- `ClubEvent`
  - audience and RSVP first
  - lives under `constants/event-types.ts` and `services/event/index.ts`
- `GroupSession`
  - training and registration first
  - lives under `constants/session-types.ts` and `services/group-session/index.ts`
- `Booking`
  - commitment record created from direct booking or session registration
  - not the top-level club schedule object
- `Match`
  - availability, lineup, and result first
  - lives under `constants/event-types.ts` and `services/match-service.ts`

The previous weak link was that booking surfaces tried to make club events and coach sessions share one discover/bookings shape.

Current rule:

- `ClubEvent` projects into `ClubActivity` for club schedule and RSVP/info workflows
- `GroupSession` projects into both `ClubActivity` and `SessionOffering`
- `SessionOffering` is for bookable/registerable coach-session work, not club-event projection

That keeps the club-facing experience unified without pretending an informational club event is a coach session.

## Target Model

Use one read model for club-facing schedule surfaces:

- `ClubActivity`

With these meanings:

- `kind`
  - `informational`
  - `training`
  - `match`
- `accessScope`
  - `club`
  - `squad`
  - `public`
  - `mixed`
  - `private`
- `participationMode`
  - `none`
  - `rsvp`
  - `registration`
  - `availability`

Interpretation rules:

- `ClubEvent` remains the source for informational club events
  - event labels such as `Training Camp` or `Trial Day` do not turn an event into a coach session
- `GroupSession` remains the source for training-shaped club activities
- `Match` remains the source for fixtures and team selection workflows
- a club-linked `GroupSession` with `inviteType='OPEN'` is treated as `mixed` access
  - that means “club training that can also admit outsiders”
- a club-linked `GroupSession` with `inviteType='CLOSED'` is `club` access
- a squad-linked `GroupSession` with `inviteType='SQUAD_ONLY'` is `squad` access

## What Was Implemented

This repo now has a first-class club activity read model in:

- `constants/club-activity-types.ts`
- `utils/club-activity-projections.ts`
- `services/club-schedule-service.ts`
- `/v1/clubs/:clubId/schedule` and `/v1/clubs/:clubId/schedule/:activityId`

And the club-facing surfaces now use that read model instead of pretending training and events are unrelated:

- `components/club/ClubActivitiesPanel.tsx`
- `components/club/ClubScheduleScreen.tsx`
- `hooks/use-club-hub.ts`
- `hooks/use-club-detail.ts`
- `hooks/use-club-schedule.ts`
- `app/club/[id]/schedule.tsx`
- `app/club/squad/[id]/schedule.tsx`

Booking-facing session surfaces now keep the same source split:

- direct coach bookings stay direct booking/session records
- group sessions use the canonical `GroupSession` ID even when shown through a `SessionOffering` wrapper
- club events are not projected into bookable offerings

Creation entry points now preserve that same source context:

- club and team event buttons use `Routes.eventCreate({ clubId, clubName, squadId })`
- club and team training buttons use `Routes.sessionsCreateIntent(...)`
- club and team match buttons use `Routes.matchCreate({ clubId, clubName, squadId })`
- event creation resolves the signed-in user's real club context before loading squads or submitting
- match creation resolves the signed-in user's real club context before loading squads or submitting
- no normal event or match create path should silently fall back to a hardcoded club

Important detail:

- pending personal session invites remain a separate workflow
- they are not club activities
- the club hub now labels them honestly instead of calling them “events”

## Current Limitations

This is a read-model unification first, not a full entity merge.

Still split today:

- event creation still goes through `/events/create`, with club/squad context carried in route params
- training creation still goes through `/group-sessions/create`
- match creation still goes through `/matches/create`, with club/squad context carried in route params
- backend contracts expose a read-only `ClubActivity` schedule projection, not a merged writable `ClubActivity` entity

That is acceptable for now because:

- events, training, and matches still need different specialized creation fields
- the user-facing club schedule no longer needs to leak that storage split

## Build Rule

When adding new club-facing schedule UI:

1. start from `ClubActivity`
2. project from `ClubEvent`, `GroupSession`, and `Match`
3. only drop to event-specific, session-specific, or match-specific detail after the user opens the item
4. show the source family explicitly as `Event`, `Training session`, or `Match`
5. in booking discovery, assign each `GroupSession` to one section only: time-sensitive first, then club training, then open coach sessions
6. open coach sessions are discoverable to authenticated families, but the `My Sessions` tab remains limited to registered, owned, or club-relevant sessions
7. a `GroupSession` CTA registers through group-session authority; the direct booking wizard is only for direct coach offerings

Do not create another parallel “activity card” model beside `ClubActivity` unless the domain meaning genuinely differs.
