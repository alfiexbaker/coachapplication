# Sprint 13 - Child Data, Medical Access, and High-Sensitivity Controls

## Goal
Harden access governance for child profiles, medical/emergency data,
SEN/observation data, and safeguarding-adjacent notes.

## Dependencies
- Sprints 00-12
- Existing trust services (`services/safety-service.ts`, `services/consent-service.ts`, `services/injury-service.ts`)

## Scope
- high-sensitivity data access console with explicit case/reason requirements
- sensitive-read policy layer for child medical/emergency/SEN domains
- just-in-time data access grants with strict expiry
- abnormal access detection (volume/time/context anomalies)
- mandatory periodic re-certification for privileged staff access

## Data Model (new)
- `sensitive_access_grants`
- `sensitive_access_reviews`
- `sensitive_read_events`
- `sensitive_access_anomalies`
- `sensitive_data_domains`

## API Contracts (examples)
- `POST /v1/admin/sensitive-access/grants`
- `POST /v1/admin/sensitive-access/grants/:id/revoke`
- `GET /v1/admin/sensitive-access/reviews`
- `GET /v1/admin/sensitive-read-events`
- `POST /v1/admin/sensitive-access/anomalies/:id/resolve`

## Security Notes
- sensitive reads require explicit policy scope + active justification
- short-lived grants only; no perpetual broad access
- automated alerts on unusual sensitive-read patterns
- full audit with reason code and case linkage for every sensitive read

## Test Gates
- grant expiry and revocation enforcement tests
- unauthorized sensitive-read deny tests
- anomaly detection threshold tests
- access review completion and stale-grant cleanup tests

## Exit Criteria
- high-sensitivity domains are protected by explicit, time-bound access controls
- sensitive data access is continuously monitored and reviewable

