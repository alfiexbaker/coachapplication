# Sprint 15 - Security Platform: Secrets, Keys, and Supply Chain Hardening

## Goal
Raise the security ceiling for admin systems via strong secrets/key management,
service authentication hardening, and supply-chain controls.

## Dependencies
- Sprints 00-14

## Scope
- centralized secret management and rotation policy for admin services
- encryption key hierarchy (application keys vs audit-ledger keys)
- mTLS/service identity for internal admin-control services
- dependency and artifact integrity checks in CI/CD
- signed release provenance for admin builds

## Data Model (new)
- `secret_rotation_events`
- `crypto_key_metadata`
- `service_identity_registry`
- `artifact_attestations`
- `security_baseline_exceptions`

## API Contracts (examples)
- `POST /v1/admin/security/secrets/rotate`
- `GET /v1/admin/security/keys`
- `POST /v1/admin/security/keys/:id/rotate`
- `GET /v1/admin/security/supply-chain/posture`
- `POST /v1/admin/security/exceptions`

## Security Notes
- split-key approach for operational DB encryption and audit-ledger encryption
- strict secret access by workload identity and least privilege
- blocked deployments on critical dependency vulnerabilities without exception approval
- all key/secret operations audited with two-person approval where required

## Test Gates
- key rotation functional and rollback tests
- secret lease expiry and revocation tests
- CI policy enforcement tests for vulnerable dependencies
- artifact provenance verification tests

## Exit Criteria
- secrets and keys are centrally governed and rotation-safe
- admin pipeline has enforceable supply-chain security controls

