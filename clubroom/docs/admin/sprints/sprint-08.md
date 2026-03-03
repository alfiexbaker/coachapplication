# Sprint 08 - Compliance Operations, Audit Ledger DB, Retention, and Legal Holds

## Goal
Operationalize compliance workflows with an immutable, queryable audit ledger database,
and legal-hold-aware retention/deletion controls.

## Dependencies
- Sprints 00-07
- Backend Sprint 10 trust/retention primitives

## Scope
- production audit event ingestion into dedicated audit ledger DB
- evidence query tooling for compliance/security investigations
- retention policy management and execution controls
- legal hold creation/release workflows
- deletion request orchestration with legal hold blockers
- audit export packages for regulated investigations

## Data Model (new)
- `audit_ledger_events` (separate audit DB)
- `audit_ledger_partitions`
- `compliance_export_jobs`
- `retention_policy_versions`
- `legal_hold_cases`

## API Contracts (examples)
- `GET /v1/admin/audit/events`
- `POST /v1/admin/audit/export-jobs`
- `POST /v1/admin/retention/runs`
- `POST /v1/admin/legal-holds`
- `POST /v1/admin/legal-holds/:id/release`
- `GET /v1/admin/deletion-requests`

## Security Notes
- audit ledger DB is append-only; no update/delete capability for app roles
- strict separation of duties between ops staff and compliance/security admins
- legal holds automatically block retention and deletion execution
- export jobs are encrypted, short-lived, and access-logged

## Test Gates
- end-to-end audit ingestion consistency tests (outbox -> ledger)
- legal-hold blocking tests for retention/deletion runs
- export authorization and expiration tests
- partition retention boundary and backfill tests

## Exit Criteria
- separate audit ledger DB is in use for compliance queries
- legal hold and retention controls are enforced with policy test coverage
- deletion workflows cannot bypass legal/policy constraints

