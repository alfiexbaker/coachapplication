# Sprint 14 - Privacy Rights, Account Lifecycle, and Data Subject Workflows

## Goal
Operationalize privacy rights processing (DSAR/export/rectification/deletion)
with legal-hold-aware controls and strict SLA tracking.

## Dependencies
- Sprints 00-13
- Compliance foundations from Sprint 08

## Scope
- privacy requests queue (access, correction, deletion, restriction, portability)
- request orchestration across user, booking, messaging, and trust domains
- legal hold and policy blockers surfaced in request workflow
- secure export package generation and delivery
- closure evidence bundle for each privacy request

## Data Model (new)
- `privacy_requests`
- `privacy_request_tasks`
- `privacy_request_evidence`
- `privacy_export_packages`
- `privacy_sla_breaches`

## API Contracts (examples)
- `GET /v1/admin/privacy/requests`
- `POST /v1/admin/privacy/requests/:id/start`
- `POST /v1/admin/privacy/requests/:id/complete`
- `POST /v1/admin/privacy/requests/:id/reject`
- `POST /v1/admin/privacy/exports`

## Security Notes
- export packages encrypted at rest and in transit, short-lived download links
- deletion requests blocked automatically by legal holds and protected-entity policy
- privacy request actions require identity verification confidence checks
- complete audit evidence required before closure

## Test Gates
- end-to-end DSAR workflow tests with cross-domain data pulls
- legal-hold block tests for deletion requests
- export package access/expiry tests
- SLA breach alert tests and escalation flow coverage

## Exit Criteria
- privacy rights workflows are executable, compliant, and auditable
- no deletion/export action bypasses policy or legal-hold constraints

