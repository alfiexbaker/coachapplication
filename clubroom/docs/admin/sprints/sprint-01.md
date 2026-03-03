# Sprint 01 - Staff Identity, Session Security, and Access Controls

## Goal
Secure worker access to admin surfaces using strong authentication, trusted session controls,
and least-privilege role assignment workflows.

## Dependencies
- Sprint 00
- Backend auth foundation (`docs/backend-api/sprints/sprint-01.md`, `sprint-02.md`)

## Scope
- staff SSO login integration + mandatory MFA
- secure session management (device/session inventory, revoke, timeout)
- acting-role requirement for multi-role staff users
- step-up auth challenge for risky actions
- access request and approval workflow for elevated roles

## Data Model (new)
- `staff_users`
- `staff_identities`
- `staff_sessions`
- `staff_stepup_challenges`
- `staff_access_requests`
- `staff_access_approvals`

## API Contracts (examples)
- `POST /v1/admin/auth/login`
- `POST /v1/admin/auth/mfa/verify`
- `GET /v1/admin/me/sessions`
- `POST /v1/admin/me/sessions/:id/revoke`
- `POST /v1/admin/me/step-up`
- `POST /v1/admin/access-requests`

## Security Notes
- session cookies/tokens marked secure + short TTL + rotation
- block sensitive endpoints unless recent step-up is valid
- role grants require dual approval for `security_admin` and break-glass capability
- full audit on role grants/revokes/session revocations

## Test Gates
- MFA bypass denial tests
- stale session/token replay tests
- step-up required tests for suspension/legal-hold/break-glass endpoints
- role-grant workflow tests (approve/deny/revoke)

## Exit Criteria
- no direct access to admin UI without MFA-backed staff session
- session inventory and revoke-all works for staff accounts
- policy-protected endpoints enforce step-up gates

