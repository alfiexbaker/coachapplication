# Coach profile API and database evidence

Date: 2026-08-01
Environment: staging only
Production mutations: none

## Live Fastify role matrix

The current route implementation was started on temporary port `4010` against the staging database. The process was stopped after the read-only matrix completed.

| Role | HTTP result | Request ID |
| --- | --- | --- |
| Coach | 200 | `req_8b62ef38-2a60-440a-b96c-5d3dffde7222` |
| Parent | 404 | `req_54a9afc2-b489-4ae7-b60a-c5972a1b49b4` |
| Guardian | 404 | `req_923fcacd-55a7-487d-a4f6-906b42519ef2` |
| Athlete | 404 | `req_0c177863-287e-40e9-9b8c-0265392bea91` |
| Platform admin | 404 | `req_1aec8f8b-8427-43ec-8816-75c848458811` |

The coach response contained exactly `profile`, `seedVersion`, and `requestId` at the top level. It did not serialize coach locations, availability templates, availability overrides, scheduling rules, or cancellation-policy rules.

## AuditEvent readback

The five request IDs above matched five `coach_profile.read` events:

- coach: `SUCCESS`, `sensitiveRead=true`
- parent: `DENY`, `sensitiveRead=true`, error code `RESOURCE_NOT_FOUND`
- guardian: `DENY`, `sensitiveRead=true`, error code `RESOURCE_NOT_FOUND`
- athlete: `DENY`, `sensitiveRead=true`, error code `RESOURCE_NOT_FOUND`
- platform admin: `DENY`, `sensitiveRead=true`, error code `RESOURCE_NOT_FOUND`

No coach-profile write was made during this proof.

## Supabase posture

Direct read-only catalogue inspection confirmed RLS is enabled on:

- `CoachProfile`
- `CoachLocation`
- `AvailabilityTemplate`
- `AvailabilityOverride`
- `SchedulingRule`
- `CancellationPolicyRule`
- `AuditEvent`

None of those seven tables currently grants table privileges to `anon` or `authenticated`. Fastify remains the client authority. The separate owner-level finding `SEC-004` remains open: `supabase_admin` has 24 unsafe future public-schema default privileges that the current database user cannot alter.

Supabase MCP was unavailable in this task (`ENV-003`), so this evidence uses the configured staging Prisma connection for read-only inspection. No credential or private profile value was printed or retained.

## Sentry

The configured Sentry token reached the `tubton/react-native` issue endpoint over verified TLS and received HTTP 403. `ENV-004` therefore remains open; no claim is made about current unresolved issues.
