# Sprint 06 - Fraud and Abuse Risk Operations

## Goal
Detect and respond to abuse patterns (account abuse, booking abuse, document fraud,
payment anomalies) with a dedicated risk queue and action framework.

## Dependencies
- Sprints 00-05
- Security event model from `AUTHZ_AUDIT_AND_SECURITY.md`

## Scope
- risk signal ingestion (velocity, device, IP, behavior anomalies)
- risk score model and severity buckets
- linked-account graph view for investigators
- risk action set: hold, challenge, restrict feature, escalate, clear
- fraud playbooks and reason taxonomies

## Data Model (new)
- `risk_signals`
- `risk_cases`
- `risk_case_links`
- `risk_actions`
- `blocked_identifiers`

## API Contracts (examples)
- `GET /v1/admin/risk/queue`
- `GET /v1/admin/risk/cases/:id`
- `POST /v1/admin/risk/cases/:id/actions`
- `POST /v1/admin/risk/identifiers/block`
- `POST /v1/admin/risk/identifiers/unblock`

## Security Notes
- risk decisions with user impact require step-up auth
- false-positive mitigation: limited-duration holds + mandatory review windows
- all risk actions linked to case ID and audited
- rate limits on internal tooling APIs to prevent bulk misuse

## Test Gates
- scoring threshold behavior tests
- action policy tests for hold/release/restrict paths
- denial-path tests for unauthorized risk actions
- regression tests for false-positive rollback flows

## Exit Criteria
- risk analysts can triage and resolve abuse from one queue
- user-impacting risk controls are reversible, audited, and policy-bound

