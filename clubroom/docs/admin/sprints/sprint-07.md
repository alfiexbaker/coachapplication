# Sprint 07 - Reliability and Incident Response Console

## Goal
Enable operations staff to respond when parts of the platform are down,
including incident creation, coordination, and customer communication.

## Dependencies
- Sprints 00-06
- Observability and service health feeds

## Scope
- live service health dashboard (API latency, error rates, queue backlogs)
- incident lifecycle (`OPEN`, `MITIGATING`, `MONITORING`, `RESOLVED`)
- role assignment (incident commander, communications lead, ops lead)
- runbook linking and timeline notes
- customer status communication templates and status-page hooks

## Data Model (new)
- `ops_incidents`
- `ops_incident_updates`
- `ops_incident_assignments`
- `ops_runbook_links`

## API Contracts (examples)
- `GET /v1/admin/ops/health`
- `POST /v1/admin/ops/incidents`
- `PATCH /v1/admin/ops/incidents/:id`
- `POST /v1/admin/ops/incidents/:id/updates`
- `POST /v1/admin/ops/incidents/:id/assign`

## Security Notes
- incident tools limited to ops/security roles
- protected runtime controls (feature flags/kill switches) require step-up auth
- command actions must include reason and incident ID
- all incident updates are auditable and immutable once posted

## Test Gates
- incident state transition tests
- permission tests for command actions and feature-flag operations
- timeline integrity tests (no silent edits)
- health endpoint degradation tests and fallback behavior

## Exit Criteria
- internal teams can detect, coordinate, and communicate outages from one place
- risky runtime controls are gated and auditable

