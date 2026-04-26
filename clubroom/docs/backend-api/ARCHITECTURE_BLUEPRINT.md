# Architecture Blueprint (Backend, Codebase-Aligned)

## Purpose
Define the backend architecture for Clubroom in a way that maps directly to the existing frontend codebase structure and product spines.

## Current Codebase Signals This Must Respect
- Routes are file-based in `app/` and centralized via `navigation/routes.ts`
- Frontend logic is service-heavy (`services/**`) with domain split patterns already emerging
- `Result<T, ServiceError>` is the dominant error-handling pattern (`types/result.ts`)
- Soft delete + version fields already appear in service patterns (`services/base-service.ts`)
- Cross-domain events exist (`services/event-bus.ts`)
- Product spines are explicit in `docs/SOURCE_OF_TRUTH.md`

## Backend Shape: Modular Monolith
Use a modular monolith first. This scale does not justify microservices yet.

### Why modular monolith
- Shared authz and audit policies are easier to enforce centrally.
- Cross-spine flows (booking -> progress -> invoices -> notifications -> safeguarding) are common.
- Lower cost and lower operational load.
- Easier CI/CD and schema migration discipline.

## Planned Monorepo Layout (target)
The current repo is a single Expo app. Move toward this structure incrementally:

```text
apps/
  mobile/                  # current Expo app moved here later
  api/                     # Fastify + TypeScript backend
    src/
      app.ts
      server.ts
      plugins/
      modules/
      lib/
      jobs/
      workers/
packages/
  shared-contracts/        # zod schemas, DTOs, enums, error codes
  db/                      # Prisma schema, migrations, generated client
  authz/                   # policy evaluation, grants, scopes
  config/                  # env schemas + typed config
  test-utils/              # fixtures, auth token builders, helpers
```

## Domain Modules (map to product spines)
### 1. Identity + Access (cross-cutting)
- user provisioning
- roles
- sessions/devices
- grants/delegation
- authz evaluation
- audit/security events

### 2. Booking / Revenue spine
Maps primarily to current frontend services and routes such as:
- `services/booking-service.ts`
- `services/booking/*`
- `services/group-session-service.ts`
- `services/group-session/*`
- `services/invite/*`
- `services/invoice-service.ts`
- `services/earnings/*`
- `app/book/**`
- `app/(tabs)/bookings/**`
- `app/group-sessions/**`
- `app/(tabs)/earnings.tsx`

### 3. Development / Analytics spine
Examples in current codebase:
- `services/progress-service.ts`
- `services/progress/*`
- `services/video-service.ts`
- `services/drill-service.ts`
- `components/progress/**`, `components/drills/**`, `components/video/**`
- `app/development/**`, `app/videos/**`, `app/badges/**`

### 4. Community / Growth spine
Examples:
- `services/community/*`
- `services/social-feed-service.ts`
- `services/messaging-service.ts`
- `services/notification/*`
- `app/community/**`, `app/chat/**`, `app/(tabs)/messages.tsx`, `app/(tabs)/notifications.tsx`

### 5. Trust / Safety / Ops spine
Examples:
- `services/safety-service.ts`
- `services/verification-service.ts`
- `services/consent-service.ts`
- `app/verification/**`
- `app/child/[id]/medical.tsx`, `app/child/[id]/emergency.tsx`

## Request Lifecycle (security-first)
1. Request enters Fastify (request ID assigned/propagated)
2. JWT authn plugin validates access token
3. Session/device state validated (revoked? suspended?)
4. Route contract validation (`zod`)
5. Authz policy evaluation:
   - role
   - acting role
   - ownership/relationship
   - delegated grants / resource shares
   - consent / verification gates
6. Service layer executes transaction(s)
7. Audit events + outbox events written in same transaction where applicable
8. Response mapped through DTO serializer
9. Response validation (optional but recommended on critical routes)

## Command/Query and Event Boundaries
Keep explicit module APIs inside backend. Avoid directly calling repositories from route handlers.

Pattern:
- `routes` -> `controller`/`handler`
- `handler` -> `service` (business rules)
- `service` -> `repository` / Prisma queries
- `service` -> `audit writer` / `outbox writer`
- `service` returns domain result -> `serializer` -> HTTP response DTO

## Transactional Outbox (recommended from start)
Use an `outbox_events` table for async side-effects:
- notifications
- emails/SMS reminders
- malware scan jobs
- analytics/security event dispatch
- future webhooks

Why:
- avoids lost side effects on partial failures
- preserves auditability
- supports retries and observability

## Realtime (chat only, phase 1)
Keep chat correctness in Postgres first.

Recommended flow:
- message write transaction commits to `messages` + `message_receipts` + `audit_events`
- outbox event triggers realtime broadcast
- clients fall back to refresh/poll on missed events

## Data Access and Performance Strategy
Start simple and optimize where volume is real:
- Prisma CRUD for most modules
- targeted indexes on FK + status + time columns
- partition `audit_events` early (expected high write volume)
- consider partitioning `messages` after real usage data
- precompute/materialize heavy analytics later

## How Backend Modules Should Mirror Frontend Conventions
Frontend convention | Backend equivalent
--- | ---
`types/result.ts` `Result<T, ServiceError>` | service result objects + HTTP error mapper (`problem+json`)
`services/base-service.ts` soft delete + version | DB schema standard fields + optimistic concurrency
`services/event-bus.ts` typed events | outbox + domain event types (stable names)
`navigation/routes.ts` route constants | `/v1` route registry + endpoint inventory docs
`constants/storage-keys.ts` centralized keys | DB table/column/enum registry + contract registry

## Monorepo Migration Strategy (low-risk)
1. Add `docs/backend-api/` docs first (this pack)
2. Introduce workspace tooling without moving mobile app yet
3. Add `apps/api` and `packages/shared-contracts`, `packages/db`
4. Build backend in parallel while mobile still uses AsyncStorage mocks
5. Introduce API adapters behind current frontend services (feature-flagged)
6. Migrate by spine/flow (booking first, then family/trust, then progress/media, etc.)

## Hard Constraints in Architecture
- No automatic club-admin access to coach-private resources
- No hard delete for safeguarding/payment/audit history
- Sensitive reads are auditable (medical/SEN/private notes/safeguarding/payment details)
- All write endpoints support idempotency
- Conflict-prone updates support version checks
