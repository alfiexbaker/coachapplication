# Sprint 11 - Hardening, Performance, Recovery, and Launch Gates

## Goal
Prove production readiness: performance at target scale, recovery capability, observability, and security/operational gates.

## Dependencies
- Sprints 00-10

## Scope
- index review and query plan tuning
- table partitioning for `audit_events` (and others if needed)
- load tests for booking + messaging paths
- backup restore drill + PITR verification
- alerting and dashboards for critical error/security signals
- runbooks for incidents, auth outages, DB failover, queue backlogs
- final API/UI traceability review and gap list

## Scale Targets to Validate Against
- ~1,500 coaches
- ~30,000 parents/athletes total
- ~3,000 bookings/day
- ~50,000 messages/day
- startup-grade availability target (not 99.99)

## Focus Areas
- booking create/cancel/reschedule latency and correctness under retries
- group session registration capacity race handling
- messaging read/write throughput and thread isolation
- audit event write volume and partitioning
- retention cron safety and runtime bounds

## Security / Reliability Gates
- security event alerting verified (rate limits, authz denials, malware positives)
- audit coverage spot-check across all spines
- dependency/SAST/secrets scan thresholds pass
- production config review sign-off completed
- break-glass disabled by default in production (unless explicitly approved)

## UI/API Alignment Gates
- traceability matrix updated for all phase 1 endpoints
- unresolved UI route/API gaps documented explicitly
- error states verified for high-risk flows:
  - booking
  - family medical/SEN
  - invoices/reconciler
  - messaging
  - safeguarding

## Test Gates
- load tests with representative concurrency and retries
- PITR restore test documented and timed
- end-to-end smoke tests across all spines
- migration rollback rehearsal for recent schema changes
- chaos-style failure injection for one external dependency (auth/storage/notifications)

## Exit Criteria
- Launch readiness checklist signed off
- Recovery and observability proven, not assumed
- Remaining risks documented with owners and mitigation dates
