# Booking detail database authority — read-only staging evidence

- Checked: 2026-08-01
- Environment guard: `EXPO_PUBLIC_ENV=staging`, `API_DATA_BACKEND=db`; production hints rejected.
- Method: read-only Prisma and Postgres catalog queries. No insert, update, delete, DDL, or production connection was used.
- Booking fixture: active `CONFIRMED` booking with one participant; no session note, feedback, or invoice rows.
- Schema: 58 of 58 migrations applied.

## Focused table posture

`Booking`, `BookingParticipant`, `SessionNote`, `SessionFeedback`, `Invoice`, and `AuditEvent` all have RLS enabled. None are forced-RLS, none has a row policy, and none grants table privileges to `PUBLIC`, `anon`, or `authenticated`. Fastify remains the data authority.

## Live cross-role audit proof

The strict five-role run produced four `booking.read` successes (assigned coach, parent, guardian, and participating athlete) and one denial (unrelated club admin). Guardian and parent requests share the API's `parent` acting-role classification, while the runtime evidence keeps their fixtures separate.

Every event has `sensitiveRead=true`. Success metadata contains only `status` and `participantCount`; denial metadata contains only `errorCode`. The focused unsafe-metadata-key count was zero.

Supabase MCP remains unavailable under `ENV-003`, so the configured staging Postgres path supplied this read-only evidence. The separate future-default-grant blocker `SEC-004` remains open.
