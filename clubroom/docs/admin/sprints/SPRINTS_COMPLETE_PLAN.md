# Complete Admin Sprint Plan (Everything, Security-First)

Date: 2026-03-03

This plan covers the full internal admin program end-to-end, tied to real app behavior.

## Sequence Summary

| Sprint | Domain | Outcome |
|---|---|---|
| 00 | Foundation | Role model, policy engine, case model, audit architecture |
| 01 | Staff IAM | Staff identity, MFA, step-up auth, session controls |
| 02 | Support Core | Support queue + user 360 + safe search |
| 03 | Account & Team Controls | Suspend/reactivate/restrict users + team membership ops |
| 04 | Verification Ops | Reviewer workbench for ID/background/credentials/insurance |
| 05 | Moderation & Safeguarding | Content/safeguarding triage and action workflows |
| 06 | Fraud & Risk | Risk queue, anomaly scoring, containment actions |
| 07 | Reliability Ops | Site health + incident response + runtime controls |
| 08 | Compliance Core | Audit ledger DB + retention + legal hold |
| 09 | Core Hardening | Red-team, chaos tests, launch gates |
| 10 | Finance Ops | Booking/invoice disputes, reconciliation, adjustments |
| 11 | Org Governance | Club/academy role/invite/membership governance |
| 12 | Community Safety | Messaging/community moderation and appeals |
| 13 | Sensitive Data Governance | Child medical/emergency/SEN access controls |
| 14 | Privacy Rights | DSAR/export/deletion/rectification orchestration |
| 15 | Security Platform | Secrets, keys, service identity, supply-chain hardening |
| 16 | SOC & Continuous Assurance | Detections, investigations, containment, control assurance |
| 17 | Design Excellence | Operator-first IA, queue ergonomics, case UX, accessibility |

## Mandatory Security Gates (All Sprints)
- deny-by-default authorization
- least privilege with explicit scopes
- MFA + step-up for privileged actions
- append-only audit for sensitive reads and all writes
- no hard-delete for protected records
- legal-hold-aware retention/deletion controls
- idempotency + concurrency safety for state transitions
- negative/abuse-path tests before sprint exit
- UX/accessibility gates for operator-critical flows

## Exit Definition For The Program
The full sprint program is complete when:
- all admin actions are case-linked and policy-gated
- immutable audit evidence exists for every sensitive action
- staff roles and approvals are enforced across workflows
- privacy/compliance workflows are executable and test-covered
- SOC detections and incident runbooks are operational
