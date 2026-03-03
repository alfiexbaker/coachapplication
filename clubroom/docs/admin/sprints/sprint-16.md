# Sprint 16 - Detection Engineering, SOC Workflows, and Continuous Assurance

## Goal
Operationalize continuous security monitoring and response for admin systems,
including SIEM-aligned detections, triage workflow, and control assurance.

## Dependencies
- Sprints 00-15

## Scope
- security detection catalog for admin abuse, privilege misuse, and anomaly patterns
- SOC triage queue and investigation workflow
- alert-to-case correlation with runbooks and containment actions
- continuous control checks (authz drift, stale grants, missing audits)
- executive risk dashboard and security KPI reporting

## Data Model (new)
- `security_detections`
- `security_alerts`
- `security_investigations`
- `security_containment_actions`
- `control_assurance_results`

## API Contracts (examples)
- `GET /v1/admin/security/alerts`
- `POST /v1/admin/security/alerts/:id/triage`
- `POST /v1/admin/security/investigations`
- `POST /v1/admin/security/containment-actions`
- `GET /v1/admin/security/control-assurance`

## Security Notes
- all privileged-action detections link to actor/session/request context
- containment actions (lock account, revoke grants, force re-auth) require step-up auth
- SOC actions are time-stamped, immutable, and tied to incident/case IDs
- periodic control assurance is mandatory before release windows

## Test Gates
- detection precision/recall validation on synthetic abuse scenarios
- SOC workflow tests (triage -> investigate -> contain -> resolve)
- containment rollback and recovery-path tests
- control-assurance gate tests for release readiness

## Exit Criteria
- admin security monitoring is active, actionable, and runbook-driven
- continuous assurance gates are enforced for ongoing operation

