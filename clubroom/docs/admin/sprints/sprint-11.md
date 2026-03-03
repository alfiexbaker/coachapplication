# Sprint 11 - Club and Academy Governance Operations

## Goal
Consolidate organization/team controls into a secure governance workspace:
member lifecycle, role delegation, invite governance, and policy enforcement.

## Dependencies
- Sprints 00-10
- Existing org services (`services/club-service.ts`, `services/academy-service.ts`, `services/squad-service.ts`)

## Scope
- org governance queue (member bans, removals, role-change requests, invite abuse)
- delegated role management with hierarchy enforcement
- invite lifecycle controls (issue, revoke, expire, investigate suspicious usage)
- team membership provisioning/deprovisioning audit trail
- anti-abuse checks on rapid role/invite churn

## Data Model (new)
- `org_governance_cases`
- `org_role_change_requests`
- `org_invite_events`
- `org_membership_audit_events`
- `org_policy_violations`

## API Contracts (examples)
- `GET /v1/admin/orgs/queue`
- `POST /v1/admin/orgs/:orgId/members/:memberId/role-change-requests`
- `POST /v1/admin/orgs/:orgId/invites/:inviteId/revoke`
- `POST /v1/admin/orgs/:orgId/members/:memberId/suspend`
- `POST /v1/admin/orgs/:orgId/policies/evaluate`

## Security Notes
- no self-elevation and no same-level elevation allowed
- invite issuance/revocation actions require scoped permissions and case context
- privileged org actions audited with before/after role snapshots
- throttles on role changes and invite generation to limit abuse

## Test Gates
- role hierarchy invariant tests (owner/admin/head coach boundaries)
- self-escalation denial tests
- invite abuse detection tests (velocity, repeated failed joins)
- event/audit consistency tests for membership transitions

## Exit Criteria
- admins can govern clubs/academies with clear delegation boundaries
- org role and invite actions are abuse-resistant and auditable

