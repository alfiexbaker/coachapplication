# Admin Sprint Docs (Security-First)

These docs define the internal admin/support roadmap for Clubroom workers.
They focus on customer support, downtime operations, moderation, fraud prevention,
verification review, and compliant data access.

## Current-State Audit Reference
- `docs/admin/ADMIN_OPERATIONS_REALITY_2026-03-03.md` maps this sprint plan
  to what is already implemented in routes/services/storage today.
- `docs/admin/sprints/SPRINTS_COMPLETE_PLAN.md` is the full ordered program
  across all admin domains.

## Admin Vision
Build one operations console that lets internal staff safely:
- help customers quickly
- handle incidents when parts of the site are down
- moderate harmful content and safeguarding concerns
- prevent abuse/fraud
- manage account controls (suspend/reactivate)
- manage team membership safely

## Non-Negotiable Security Invariants
Every admin sprint must enforce these:
- Least privilege by role (`support`, `moderator`, `risk_analyst`, `ops`, `security_admin`)
- MFA for all staff accounts
- Step-up auth for sensitive actions (suspend, break-glass, legal hold, irreversible ops)
- Full append-only audit events for sensitive reads and all writes
- No hard delete for safeguarding/payment/audit/security records
- Legal hold must block retention/deletion jobs
- Repository-level filters to prevent overfetch/data leakage
- Idempotency keys on sensitive state-changing endpoints

## Separate Audit Log Database Requirement
Admin systems must not depend on mutable app tables for compliance evidence.
Use a dedicated append-only audit data store:
- Operational DB: primary app + admin state
- Audit outbox/stream: immutable event envelope with hash chain
- Audit ledger DB: append-only, retention-managed, queryable by compliance/security
- Optional analytics replica: read-only derived views for dashboards

This architecture is implemented incrementally across Sprint 00 and Sprint 08.

## Sprint Sequence
- `sprint-00.md` admin foundation, role model, case model, audit architecture
- `sprint-01.md` staff identity, session security, and access controls
- `sprint-02.md` support console and user 360 (read-safe)
- `sprint-03.md` user lifecycle controls (suspend/reactivate) and team membership management
- `sprint-04.md` document verification operations workbench
- `sprint-05.md` moderation and safeguarding operations
- `sprint-06.md` fraud/abuse detection and risk operations
- `sprint-07.md` reliability + incident response tooling ("site down" workflows)
- `sprint-08.md` compliance, audit-ledger DB, retention, legal hold operations
- `sprint-09.md` hardening, red-team tests, and core launch gates
- `sprint-10.md` booking/revenue/financial operations
- `sprint-11.md` club and academy governance operations
- `sprint-12.md` community and messaging safety operations
- `sprint-13.md` child-data and high-sensitivity access controls
- `sprint-14.md` privacy rights and account lifecycle workflows
- `sprint-15.md` secrets/keys and supply-chain hardening
- `sprint-16.md` detection engineering, SOC workflows, continuous assurance
- `sprint-17.md` design excellence and operator experience (run early/in parallel)

## Common Gates For Every Sprint
- Contracts first (`zod` request/response and policy enums)
- Authz policies and repository filters merged before handlers
- Audit event coverage reviewed for all sensitive reads/writes
- Deny-path tests included (not only happy path)
- Idempotency and concurrency behavior validated
- Runbooks and escalation ownership updated
- UI/API traceability updated for changed routes

## Primary Capability Map
- Customer support: sprints 02, 03
- User suspension/team membership: sprint 03
- Document verification: sprint 04
- Moderation and safeguarding: sprint 05
- Abuse and fraud prevention: sprint 06
- Site down / reliability response: sprint 07
- Audit evidence and legal controls: sprint 08
- Financial and booking operations: sprint 10
- Club/academy governance operations: sprint 11
- Community and messaging safety operations: sprint 12
- Child medical/emergency/SEN access governance: sprint 13
- Privacy rights and deletion workflows: sprint 14
- Security platform hardening: sprint 15
- SOC and continuous assurance: sprint 16
- Design excellence and usability at scale: sprint 17

## Security Ceiling Controls
To run "as secure as we can", all admin deliveries should target:
- phishing-resistant MFA for staff identities
- zero-trust service identity between admin components
- JIT access grants for sensitive data domains
- two-person approval for high-impact actions
- immutable evidence trails for sensitive reads/writes
- automated detection + containment for privileged misuse
