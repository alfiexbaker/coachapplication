# Sprint 04 - Verification Operations Workbench

## Goal
Create internal tooling for document verification (ID, background check, credentials, insurance)
with queues, SLA tracking, and fraud-aware reviewer workflows.

## Dependencies
- Sprints 00-03
- Verification surfaces (`app/verification/**`)

## Scope
- verification queue (`PENDING`, `FAILED`, `EXPIRED`, `RESUBMIT_REQUIRED`, `ESCALATED`)
- reviewer case view with document viewer + extraction metadata + policy checklist
- reviewer actions: approve, reject, request resubmission, escalate
- expiry handling and proactive renewal task creation
- verification decision templates and mandatory reason codes

## Data Model (new)
- `verification_cases`
- `verification_case_documents`
- `verification_case_actions`
- `verification_sla_targets`

## API Contracts (examples)
- `GET /v1/admin/verifications/queue`
- `GET /v1/admin/verifications/:caseId`
- `POST /v1/admin/verifications/:caseId/approve`
- `POST /v1/admin/verifications/:caseId/reject`
- `POST /v1/admin/verifications/:caseId/request-resubmission`
- `POST /v1/admin/verifications/:caseId/escalate`

## Security Notes
- least-privilege data access in document viewer
- watermark and download controls for sensitive documents
- high-risk overrides require second reviewer approval
- all document views and decisions audited with reviewer identity

## Test Gates
- queue visibility matrix tests by role/team
- decision action policy tests (reason required, forbidden status transitions blocked)
- dual-review enforcement tests for override paths
- audit coverage tests for document reads and decisions

## Exit Criteria
- verification no longer depends on ad-hoc/manual review workflows
- SLA breach alerts and escalations are operational

