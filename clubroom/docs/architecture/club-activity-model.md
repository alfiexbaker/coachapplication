# Club Activity Model

Validated: 2026-03-19
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

There was already a weak link:

- `SessionOffering` projects both events and group sessions into a shared discover/bookings shape
- that link happened late in UI code, not in the club domain model

That meant the club-facing experience still drifted into separate sections and separate language even when the underlying user intent was one thing: “what is this club doing next?”

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

And the club-facing surfaces now use that read model instead of pretending training and events are unrelated:

- `components/club/ClubActivitiesPanel.tsx`
- `components/club/ClubScheduleScreen.tsx`
- `hooks/use-club-hub.ts`
- `hooks/use-club-detail.ts`
- `hooks/use-club-schedule.ts`
- `app/club/[id]/schedule.tsx`
- `app/club/squad/[id]/schedule.tsx`

Important detail:

- pending personal session invites remain a separate workflow
- they are not club activities
- the club hub now labels them honestly instead of calling them “events”

## Current Limitations

This is a read-model unification first, not a full entity merge.

Still split today:

- event creation still goes through `/events/create`
- training creation still goes through `/group-sessions/create`
- match creation still goes through `/matches/create`
- backend contracts do not yet expose a single `ClubActivity` entity or backend-owned schedule list route

That is acceptable for now because:

- events and training still need different specialized creation fields
- the user-facing club schedule no longer needs to leak that storage split

## Build Rule

When adding new club-facing schedule UI:

1. start from `ClubActivity`
2. project from `ClubEvent`, `GroupSession`, and `Match`
3. only drop to event-specific, session-specific, or match-specific detail after the user opens the item

Do not create another parallel “activity card” model beside `ClubActivity` unless the domain meaning genuinely differs.
