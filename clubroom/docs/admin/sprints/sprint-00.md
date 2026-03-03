# Sprint 00 - Admin Foundation, Security Baseline, and Data Architecture

## Goal
Establish a secure foundation for all admin tooling: role model, permission model,
case model, and immutable audit architecture (including separate audit log database design).

## Dependencies
- `docs/SOURCE_OF_TRUTH.md`
- `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`
- `docs/backend-api/traceability/trust-ops-v1.md`

## Scope
- internal role catalog and permission matrix
- admin case lifecycle model (support/moderation/fraud/incident cases)
- policy engine contract for high-risk admin actions
- event schema for admin/support/security actions
- audit outbox + audit ledger DB technical design
- data classification and masking policy for sensitive fields

## Codebase Alignment Anchors
- `app/manage/**`
- `app/(tabs)/admin/**`
- `services/safety-audit-service.ts`
- `services/event-bus.ts`
- `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`

## Data Model (new)
- `staff_roles`
- `staff_role_permissions`
- `admin_cases`
- `admin_case_events`
- `admin_action_policies`
- `audit_event_outbox`
- `audit_integrity_anchors`

## API Contracts (examples)
- `GET /v1/admin/me/permissions`
- `GET /v1/admin/policies/actions`
- `POST /v1/admin/cases`
- `POST /v1/admin/cases/:id/events`
- `POST /v1/internal/audit/outbox/drain` (internal worker)

## Security Notes
- deny by default for all admin routes
- action policy check before business logic for privileged actions
- include request fingerprint and actor context in every audit event
- hash-chain audit payloads for tamper evidence

## Test Gates
- permission matrix tests for each staff role
- deny tests for missing scopes and cross-role overreach
- audit envelope validation tests (required fields cannot be omitted)
- outbox idempotency tests (at-least-once delivery without duplicate materialized events)

## Exit Criteria
- admin role/permission model is frozen and documented
- audit pipeline design approved, including separate audit ledger DB boundaries
- all admin routes scaffolded behind policy middleware

