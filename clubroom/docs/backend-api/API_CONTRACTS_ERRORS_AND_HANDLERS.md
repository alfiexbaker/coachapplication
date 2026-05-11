# API Contracts, Error Handling, and Handler Standards

## Purpose

Prevent payload drift, handler inconsistency, and hidden backend/frontend mismatches.

This file defines how Clubroom API endpoints should be specified and implemented so that:

- frontend DTO shapes stay stable
- errors are predictable and actionable
- idempotency/conflict handling is built in
- authz and audit are not forgotten in handlers

## API Style

- REST only (phase 1)
- Versioned path prefix: `/v1`
- Typed request/response schemas via shared `zod`
- JSON responses for success
- `application/problem+json` for errors (recommended)

## Contract Source of Truth

All public request/response DTOs must live in a shared contracts package (planned), e.g.:

- `packages/shared-contracts/src/{domain}/...`

Store:

- request schemas (`zod`)
- response schemas (`zod`)
- enums/statuses
- error codes
- pagination schemas
- filter/sort schemas

### No shape drift rule

No endpoint may return raw Prisma rows directly.
Always map through a serializer to a response DTO schema.

## Data Format Rules (stability)

### Timestamps

- Response format: ISO-8601 UTC strings
- Request format for date-times: ISO-8601 strings (UTC or timezone-aware)
- Never return locale strings (`26/02/2026`, `2:30 PM`) in API payloads

### Money

- integer minor units only
- include explicit currency code (`GBP`)
- no floats in API DTOs for money

### IDs

- string IDs with stable prefixes (see `DATA_MODEL_AND_IDENTIFIERS.md`)
- never infer entity type from unvalidated ID prefixes alone; validate ownership/resource existence

### Enums

- shared enum definitions only
- reject unknown enum values during request validation

## Endpoint Design Standards

### Production authority bar

No `/v1` endpoint is production-ready until it has all of these:

- request and response schemas
- serializer from persistence model to DTO
- explicit authn and acting-role handling
- authz policy with repository-level list filters
- idempotency or version checks for unsafe writes
- audit events for writes and sensitive reads
- predictable error mapping to frontend `ServiceErrorCode`
- tests for success, validation failure, forbidden access, and the main conflict/race path
- at least one traced UI consumer in `UI_API_BILATERAL_ALIGNMENT.md`

If the route touches children, medical, safeguarding, payments, refunds, attendance, media, club roles, grants, or private coach data, missing any item above is a release blocker.

### Reads

- `GET /v1/...`
- cursor pagination for list endpoints
- filtering and sorting defined in schema (whitelist fields)
- repository filters enforce authz scope

### Writes

- `POST`, `PATCH`, `DELETE` (soft delete for most resources)
- require `X-Idempotency-Key` for non-idempotent writes
- require version checks for conflict-prone updates
- emit audit events for all writes

### Conflict handling

Use optimistic concurrency:

- include `version` in editable resource responses
- client sends `If-Version` (or body `version`) on update
- server returns `409 CONFLICT` when stale
- include current version and conflict summary in error payload when safe

## Error Taxonomy (map to frontend `ServiceErrorCode`)

Frontend currently uses `types/result.ts` with:

- `NOT_FOUND`
- `VALIDATION`
- `NETWORK`
- `STORAGE`
- `UNAUTHORIZED`
- `CONFLICT`
- `RATE_LIMITED`
- `UNKNOWN`

Backend should expose a richer internal taxonomy, but map cleanly to these categories for mobile clients.

### Recommended API error code families (stable strings)

- `AUTH_INVALID_TOKEN`
- `AUTH_SESSION_REVOKED`
- `AUTH_FORBIDDEN`
- `AUTH_ROLE_REQUIRED`
- `AUTH_GRANT_REQUIRED`
- `VALIDATION_FAILED`
- `RESOURCE_NOT_FOUND`
- `VERSION_CONFLICT`
- `IDEMPOTENCY_REPLAY`
- `RATE_LIMITED`
- `CONSENT_REQUIRED`
- `VERIFICATION_REQUIRED`
- `MALWARE_SCAN_PENDING`
- `MALWARE_DETECTED`
- `LEGAL_HOLD_BLOCKED`
- `INTERNAL_ERROR`

### Error response shape (problem+json example)

```json
{
  "type": "https://api.clubroom.local/errors/version-conflict",
  "title": "Version conflict",
  "status": 409,
  "code": "VERSION_CONFLICT",
  "detail": "Booking was updated by another action.",
  "requestId": "req_...",
  "resource": { "type": "booking", "id": "bok_...", "currentVersion": 7 }
}
```

## Handler Template (what every endpoint handler should do)

Use this order consistently.

1. Validate request contract
2. Resolve authn context (`user_id`, roles, session)
3. Resolve acting role
4. Call authz policy (including grants and hard gates)
5. Resolve idempotency key or version guard for unsafe writes
6. Execute service logic (transaction if needed)
7. Apply repository filters for list/read queries before records leave persistence
8. Write audit + outbox events
9. Serialize response DTO
10. Validate response DTO for critical endpoints
11. Return HTTP response

## Service Layer Standards

- Services own business rules and authz-aware operations
- Handlers should not contain complex business logic
- Repositories should not contain policy decisions beyond authz filters passed in
- Services return typed result objects and throw only for truly unexpected failures (caught and mapped centrally)
- Production services must not fall back to seed stores, route-local memory, or frontend local storage when the endpoint is declared db-backed.
- Compatibility seed behavior must be explicit, environment-gated, and impossible to enable accidentally in production.

## Idempotency (required on write endpoints)

### Where required

- booking create/cancel/reopen
- RSVP responses
- invite accept/decline
- mark paid/unpaid/write-off/restore
- drill assignment completion submissions
- upload session finalization

### Behavior

- Store key by (`user_id`, route fingerprint, idempotency key)
- Return original response for safe replay
- Reject conflicting same-key different-payload usage
- Expire old keys by policy (e.g., 24-72h depending on route)

## Predictable Failure Checklist (pre-mortem)

Before shipping an endpoint, explicitly test/handle:

- invalid payload shape
- unknown enum values
- unauthorized/forbidden user
- missing grant
- stale version conflict
- duplicate submit (same idempotency key)
- race conditions (capacity/roster/waitlist)
- soft-deleted referenced record
- missing consent / expired verification
- rate limit exceeded
- object upload not scanned yet
- downstream provider timeout/failure

## Sorting and Filtering Standards

Define sortable/filterable fields per endpoint contract. Do not accept arbitrary field names.

For example, list endpoints should expose:

- `sortBy`: one of whitelisted enum values
- `sortDirection`: `asc|desc`
- `cursor`
- `limit` with sensible max

Always specify stable tie-breakers (usually `id` or `created_at`) to avoid pagination duplicates.

## How to Keep Frontend and API Formats Aligned

- Shared contracts package is the source of truth
- Frontend adapters convert HTTP responses -> frontend `Result<T, ServiceError>` shape
- Add contract snapshot tests for key DTOs (booking, family medical, invoice, session notes)
- Add CI contract diff check: breaking changes require explicit version bump or migration plan
- Track endpoint consumers in `UI_API_BILATERAL_ALIGNMENT.md`
