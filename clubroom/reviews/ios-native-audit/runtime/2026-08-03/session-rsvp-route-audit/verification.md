# ROUTE-121 — group-session RSVP authority

## Scope

`/session/[id]/rsvp` for coach attendance summary and parent/athlete response.

## Runtime path

`RSVPScreen` → `groupSessionService` and `rsvpService` →
`GET /v1/group-sessions/:sessionId/rsvps`,
`GET /v1/group-sessions/:sessionId/rsvps/counts`, and
`PATCH /v1/session-rsvps/:rsvpId/respond` → Fastify group-session repository
and audited RSVP authority.

## Fixes verified

1. The screen now checks `rsvpService.respond()`'s `Result`. A failure stays
   on the RSVP surface with an error; it no longer displays confirmation or
   navigates back optimistically.
2. The confirmation reflects the returned backend status, not only the tapped
   status.
3. RSVP requires a real session and scheduled occurrence. A missing or invalid
   schedule produces a truthful error rather than invented title, location, or
   future date data.

## Cross-role boundaries

- Coaches receive the attendance summary.
- A parent or athlete may read and respond only to their own RSVP.
- The repository filters a non-staff session list to the actor's rows and
  rejects a foreign RSVP id; Fastify records read/respond success, deny, and
  error outcomes.

## Verification

- Root type-check: passed.
- Root test compilation: passed.
- RSVP screen and service contracts: 22/22 passed, including API-mode failure
  handling that does not fall back to local RSVP storage.
- Fastify booking/group suite: 51/51 passed, including RSVP db-mode fail-closed
  tests before fixture reads or writes.
- React Doctor reported the screen's pre-existing large-component warning only;
  no new compiler error was introduced. The separate protected
  `use-group-session` compiler diagnostic remains out of this slice.

## Limitation

Native post-fix interaction is blocked by `ENV-009` (CoreSimulator XPC hangs
while installing the built development client). No production or staging RSVP,
database audit, Sentry event, or third-party state was changed.
