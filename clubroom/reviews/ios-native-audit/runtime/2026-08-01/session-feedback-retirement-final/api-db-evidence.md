# ROUTE-013 API and database evidence

Environment: staging (`EXPO_PUBLIC_ENV=staging`, `API_DATA_BACKEND=db`). Production was not used. This slice made no API or database write.

## Live Fastify role matrix

`GET /v1/bookings/bok_48cc7cd5-098c-7e0d-833d-26cddbdf3abe` used real staging bearer sessions and the selected acting role.

| Actor | Acting authority | HTTP | Request ID | Result |
| --- | --- | ---: | --- | --- |
| Assigned coach | `coach` | 200 | `req_45d050b4-85e4-4a5c-b6f1-2105c6364354` | Completed booking returned |
| Family administrator | `parent` | 200 | `req_1ecbaf54-e330-4905-bb0d-e053cd3ce0b5` | Completed booking returned |
| Assigned guardian without access to this fixture | `parent` backend authority | 403 | `req_f076b34b-d7d6-4b04-9a7b-57df2a9e468b` | `AUTH_FORBIDDEN` |
| Participating athlete | `athlete` | 200 | `req_8890117c-5a05-42f4-8904-b8ad8a4134e7` | Completed booking returned |
| Club administrator without booking assignment | `club_admin` | 403 | `req_fd1dc700-784f-425c-a89d-bca483d9e47b` | `AUTH_FORBIDDEN` |

No credentials or bearer tokens are recorded in this evidence.

## Database result

- The booking remained `COMPLETED`, version 2, and not deleted.
- It had one active confirmed participant: the expected athlete with the fixture guardian relationship.
- It had zero active `SessionNote` rows before and after the route checks. Opening the completion or notes route did not complete the booking again and did not create feedback or notes.
- The five requests produced five `booking.read` sensitive-read audits: three `SUCCESS` and two `DENY`.
- Success metadata keys were limited to `participantCount` and `status`; deny metadata contained only `errorCode`.
- No cleanup was needed because this was a read-only proof.

## Supabase authority and RLS

Direct read-only catalogue inspection was used because the Supabase MCP remains unavailable under `ENV-003`.

- `Booking`, `BookingParticipant`, `SessionNote`, and `AuditEvent` all have RLS enabled.
- Those tables have zero client RLS policies and no current `anon` or `authenticated` table grants. Current grants are limited to `postgres` and `service_role`, matching the Fastify-authoritative architecture.
- The repository contains 58 Prisma migration directories.
- `SEC-004` remains open: 24 unsafe future default privileges exist for `supabase_admin`-owned objects created later in `public`—12 for `anon` and 12 for `authenticated`. The current database user cannot safely revoke the owning role's default privileges. This is not represented as fixed.

## Route/runtime proof

- The retired `/bookings/session-feedback` route and route helper are absent.
- An unfinished individual booking enters `/session/:bookingId/complete` without probing `/v1/group-sessions/:bookingId`.
- A completed booking has one coach notes action, which opens `/session-notes/:bookingId`.
- Family and athlete views are read-only; unrelated guardian and club-admin actors fail closed.
