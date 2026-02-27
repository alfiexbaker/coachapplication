# Sprint 10 - Safeguarding, Admin/Support Tools, Retention, and Legal Holds

## Goal
Implement trust/ops workflows (safeguarding, support, retention, deletion, legal hold) with strong auditability and no hard deletes for protected records.

## Dependencies
- Sprint 03 (medical/consent)
- Sprint 06 (financial immutability)
- Sprint 02 (authz/grants)

## Scope
- safeguarding incidents, parties, actions, attachments
- support/admin tool action logging
- break-glass session flow (disabled by default but implemented)
- retention policies and retention runs
- legal holds
- data deletion requests (soft-delete workflow)
- feature flags and environment controls (if not already added)

## Codebase Alignment Anchors
- `services/safety-service.ts`
- `services/safety-audit-service.ts`
- `services/data-retention-service.ts`
- `services/consent-service.ts`
- `app/verification/**`
- any safeguarding/report/concern flows (`services/concern-service.ts`, `services/report-service.ts`)
- settings/account deletion surfaces (`app/settings/**` if present)

## Tables / Schema
- `safeguarding_incidents`
- `safeguarding_incident_parties`
- `safeguarding_incident_actions`
- `safeguarding_incident_attachments`
- `support_actions`
- `admin_break_glass_sessions`
- `retention_policies`
- `retention_runs`
- `legal_holds`
- `data_deletion_requests`
- `feature_flags`
- `feature_flag_overrides`

## Endpoints (examples)
- `POST /v1/safeguarding/incidents`
- `GET /v1/safeguarding/incidents/:id`
- `POST /v1/safeguarding/incidents/:id/actions`
- `POST /v1/admin/break-glass/start`
- `POST /v1/admin/break-glass/:id/end`
- `POST /v1/admin/retention-runs` (internal)
- `POST /v1/me/data-deletion-requests`
- `POST /v1/me/data-deletion-requests/:id/cancel`

## AuthZ / Audit Notes
- safeguarding access is role + assignment + least privilege
- every safeguarding read/write is audited
- break-glass requires MFA + reason and is fully audited
- retention and deletion actions write audit events
- no hard delete for safeguarding/payment/audit records, even when deletion is requested

## Test Gates
- safeguarding case access matrix tests
- break-glass creation/expiry/denial tests
- legal hold blocks retention/deletion actions
- retention run dry-run vs execute behavior tests
- audit assertions on all admin/support actions

## Exit Criteria
- Trust/ops workflows are implemented with policy enforcement and retention controls
