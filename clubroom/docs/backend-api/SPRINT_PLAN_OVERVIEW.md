# Backend Sprint Plan Overview (Security-First)

## Scope
This plan translates the approved architecture into buildable sprints for a new backend API while preserving existing Clubroom frontend behavior.

## Constraints Baked In
- REST + typed contracts (`zod`)
- Postgres + Prisma
- Fastify + TypeScript
- Auth0 authn + API-owned authz
- Delegated club access only (no automatic club admin access to coach-private data)
- Coach-to-coach private note access by explicit share only
- No hard delete for safeguarding/payment/audit records
- Global append-only audit trail + retention + legal hold
- Chat realtime only in phase 1
- Offline sync later (writes sync-safe now)

## Sprint Sequence
- `Sprint 00`: Backend foundation and monorepo scaffolding
- `Sprint 01`: Authn, sessions/devices, user provisioning, audit skeleton
- `Sprint 02`: Authz kernel (RBAC + grants + repository filters)
- `Sprint 03`: Family/athlete/consent/medical/SEN
- `Sprint 04`: Coach/club/scheduling/verification
- `Sprint 05`: Bookings, group sessions, invites, RSVPs, events
- `Sprint 06`: Invoices + reconciler (no in-app payments)
- `Sprint 07`: Progress, notes, goals, skills, badges, drills
- `Sprint 08`: Media/video/annotations + secure upload pipeline
- `Sprint 09`: Community, messaging, notifications, referrals
- `Sprint 10`: Safeguarding, admin/support, retention/legal holds
- `Sprint 11`: Hardening, performance, recovery, launch gates

## Delivery Principles (all sprints)
- Contracts first, handlers second
- Authz before controller logic
- Audit coverage for writes + sensitive reads
- Negative tests required
- UI-to-API traceability updated
- No unbounded list endpoints
- Idempotency on writes

## Detailed Sprint Docs
See `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/sprints/` for per-sprint scope, tables, endpoints, authz notes, test gates, and exit criteria.
