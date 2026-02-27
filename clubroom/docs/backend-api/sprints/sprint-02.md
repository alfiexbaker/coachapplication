# Sprint 02 - AuthZ Kernel, Delegated Grants, and Repository Filters

## Goal
Implement the authorization core: RBAC + delegated permissions + resource-scoped grants + repository filter helpers.

## Dependencies
- Sprint 01

## Scope
- `packages/authz` policy engine
- Permission/scope catalog
- `access_grants` and `access_grant_scopes`
- Grant create/read/revoke endpoints (internal or limited admin/owner use)
- Repository filter primitives for scoped list queries
- Sensitive read audit helper wrappers

## Tables / Schema
- `access_grants`
- `access_grant_scopes`
- `audit_events` extensions (action/resource fields finalized)
- `admin_break_glass_sessions` (scaffold only, disabled by default)

## Endpoints
- `POST /v1/access-grants`
- `GET /v1/access-grants`
- `POST /v1/access-grants/:grantId/revoke`
- internal policy evaluation debug endpoint optional (non-prod only)

## AuthZ / Audit Notes
This sprint implements the hard rules:
- club admin access to coach-private resources is delegated only
- coach-to-coach private note access is explicit share only
- grants are revocable and non-transitive
- grant actions are always audited

## UI/API Alignment Checks
Map likely UI surfaces for future sharing/delegation features:
- `app/family/sharing.tsx`
- `components/family/sharing-*`
- coach/club admin panels (`app/(tabs)/club-hub.tsx`, `components/admin/*`, `components/community/*`)

## Test Gates
- grant create/revoke/expiry behavior
- authz positive + deny cases across roles
- repository list filtering tests (no overfetch)
- sensitive read audit helper usage tests

## Exit Criteria
- Reusable authz kernel is available before domain endpoints arrive
- Delegation and sharing rules are enforceable and test-covered
