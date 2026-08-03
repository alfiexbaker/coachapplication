# ROUTE-115 — session-invite detail authority

## Scope

`/session-invites/[id]` for an invite recipient's response and an invite
owner's cancellation or reminder actions.

## Runtime path

`SessionInviteDetailScreen` → `sessionInviteService` and
`inviteRsvpService` → `GET /v1/invites/:inviteId`, invite response and
owner-action Fastify routes, and invite RSVP reads. The Fastify repository is
the authority for recipient and owner access and records invite audit events.

## Fixes verified

1. API mode no longer falls back to a cached invite or embedded RSVP snapshot
   after a live read failure. A revoked or unavailable invite therefore stays
   unavailable rather than displaying stale sensitive detail.
2. Decline now checks the returned `Result`. A failed response stays on the
   detail surface with an error and does not navigate away as though it worked.
3. Reminder failures use error feedback. Confirmation copy is direct: `Invite
   accepted.`, `Invite declined.`, and `Reminder sent.`

## Cross-role boundaries

- Only the intended recipient may accept or decline their invite.
- Only the invite owner may cancel or send a reminder.
- Invite RSVP reads and submissions remain backend-authorised; API-mode UI
  does not substitute local snapshot data if those reads fail.

## Verification

- Root type-check: passed.
- Root test compilation: passed.
- Invite screen and service contracts: 28/28 passed, including API-mode cache
  and decline-failure boundaries.
- Fastify core route suite with the local seed backend: 46/46 passed.
- Target lint: passed.
- React Doctor reports the screen's pre-existing large-component warning only.
  The separate protected `use-group-session` compiler diagnostic remains out of
  this slice.

## Limitation

Native post-fix interaction is blocked by `ENV-009` (CoreSimulator XPC hangs
while installing the built development client). No production or staging
invite, database audit, Sentry event, or third-party state was changed.
