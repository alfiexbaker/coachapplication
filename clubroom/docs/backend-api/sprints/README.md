# Backend Sprint Docs (Detailed)

These sprint docs convert the backend blueprint into an implementation sequence tied to the current Clubroom frontend codebase.

## How to use these docs
- Treat each sprint as a security-scoped delivery unit, not just a feature bucket.
- Update the sprint doc when scope moves, not only when code lands.
- For each endpoint/table added, update the bilateral UI/API mapping docs.

## Common gates for every sprint
- Shared contracts defined (`zod`)
- Authz decisions documented
- Audit coverage confirmed
- Idempotency on writes
- Negative tests added
- UI traceability updated

## Sprints
- `sprint-00.md` foundation + monorepo scaffolding
- `sprint-01.md` authn + sessions + audit skeleton
- `sprint-02.md` authz kernel + grants + repository filters
- `sprint-03.md` family/athlete/consent/medical/SEN
- `sprint-04.md` coach/club/scheduling/verification
- `sprint-05.md` bookings/group sessions/invites/events
- `sprint-06.md` invoices/reconciler
- `sprint-07.md` progress/development features
- `sprint-08.md` media/video secure upload pipeline
- `sprint-09.md` community/messaging/notifications
- `sprint-10.md` safeguarding/admin/retention/legal holds
- `sprint-11.md` hardening/performance/recovery/launch gates
- `sprint-12-marketplace-data-linking.md` linked fixture data + CSV round-trip + API cutover prep
- `sprint-13-wave-1-p0-endpoints.md` executed P0 endpoint wave implementation against linked fixtures
- `sprint-14-wave-2-4-endpoints.md` executed P1/P2/P3 endpoint waves with full role smoke coverage
