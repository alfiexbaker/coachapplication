# ROUTE-096 — session-invite inbox authority

## Scope

`/invites` is the recipient inbox for session invites.

## Runtime path

`InvitesScreen` → `useInvites` → `sessionInviteService` →
`GET /v1/invites?parentUserId=:actor`, then
`POST /v1/invites/:inviteId/respond` for accept or decline. The Fastify
repository filters the list and authorises each response against the actor.

## Fixes verified

1. Decline now checks its returned `Result`. A failed write leaves the inbox in
   place with an error rather than silently refreshing as though it declined.
2. The recipient card now has exactly one decision: `Accept` or `Decline`.
   Social RSVP controls and their dead `Maybe` inbox tab were removed; RSVP
   stays on the dedicated non-recipient/detail flows.
3. Expired pending invitations now appear in `History`, and confirmation copy
   is direct: `Booking confirmed.`

## Cross-role boundaries

- The API only lists a recipient's own invite rows and rejects a foreign invite
  read or response.
- The recipient inbox cannot create a social RSVP mutation.
- Owner reminder and cancellation controls are isolated to the invite detail
  route and remain backend-authorised.

## Verification

- Root type-check and test compilation: passed.
- Inbox, detail, payment, service, and RSVP contracts: 29/29 passed.
- Fastify core authority suite with the local seed backend: 46/46 passed.
- Target lint: passed.
- React Doctor reports only the separate protected `use-group-session`
  compiler diagnostic; no invite-inbox diagnostic remains.

## Limitation

Native post-fix interaction is blocked by `ENV-009` (CoreSimulator XPC hangs
while installing the built development client). No production or staging
invite, database audit, Sentry event, or third-party state was changed.
