# ROUTE-012 API and database evidence

Environment: staging (`EXPO_PUBLIC_ENV=staging`, `API_DATA_BACKEND=db`). Production was not used.

## Live Fastify role matrix

`POST /v1/safeguarding/incidents` used the canonical staging booking and athlete relationship with an exact `Clubroom ROUTE-012 staging audit 2026-08-01` marker.

| Actor | Acting authority | HTTP | Result |
| --- | --- | ---: | --- |
| Family administrator | `parent` | 201 | Incident created |
| Assigned guardian | `parent` backend authority | 201 | Incident created |
| Participating athlete | `athlete` | 201 | Incident created |
| Assigned coach | `coach` | 201 | Incident created; no self-notification |
| Club administrator | `club_admin` | 403 | `AUTH_FORBIDDEN`; no incident created |

The four accepted requests produced four distinct `safe_*` incidents. The denied request produced no incident. No credentials or tokens are recorded in this evidence.

## Database result

- Four marked incidents existed with the exact booking and participating athlete, category `other`, severity `MEDIUM`, status `OPEN`, and non-null reporter.
- Zero `SafeguardingIncidentAction` rows existed for the test incidents.
- Three `SUPPORT_UPDATE` notifications existed, one for each non-coach report. Each used `sourceType=safeguarding_incident`, the exact incident ID, and a matching deep link. Metadata keys were limited to `athleteId`, `bookingId`, `category`, `incidentId`, and `severity`.
- Four `safeguarding_incident.create` success audits and one deny audit existed. Success metadata keys were limited to `category`, `hasAthlete`, `hasBooking`, `notificationCount`, and `notificationStatus`; deny metadata added only `errorCode`.
- The booking was confirmed and not deleted. Its single active participant matched the supplied athlete and had an assigned guardian.

## Exact staging cleanup

After the readback, one transaction deleted exactly three notifications and four marked incidents. It refused cleanup unless the environment was staging DB, all four exact IDs matched the marker, and the incidents had zero actions. Post-cleanup incident count was zero. All five immutable audit events were retained and re-read successfully.

## Supabase authority and RLS

Direct read-only catalogue inspection was used because the Supabase MCP is unavailable under `ENV-003`.

- `Booking`, `BookingParticipant`, `SafeguardingIncident`, `SafeguardingIncidentAction`, `Notification`, and `AuditEvent` all have RLS enabled.
- Those tables have zero client RLS policies and no current `anon` or `authenticated` table grants. Current grants are limited to `postgres` and `service_role`, matching the Fastify-authoritative architecture.
- The repository contains 58 Prisma migration directories.
- `SEC-004` remains open: 24 unsafe future default privileges exist for `supabase_admin`-owned objects created later in `public` (12 for `anon`, 12 for `authenticated`). The current database user cannot safely revoke the owning role's default privileges. This is not represented as fixed.

## Automated authority checks

The focused Fastify suite proves unrelated booking-only actors are denied, a visible booking cannot be paired with a non-participant athlete, accepted reports route notifications, audit metadata is minimized, and a notification-routing failure cannot turn an already-saved incident into an apparent request failure. The latter records `safeguarding_incident.notification=ERROR` while returning the accepted incident once.
