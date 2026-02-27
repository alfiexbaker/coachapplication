# Tech Stack (Cheap + Secure Baseline)

This file documents the recommended backend stack for Clubroom, optimized for:
- low operational cost in phase 1
- strong security defaults
- UK/EU data handling
- future growth without re-platforming too early

## Approved Core Stack
- API: `Fastify` + `TypeScript`
- Contracts: shared `zod` schemas (same monorepo)
- Database: `Postgres`
- ORM: `Prisma`
- AuthN: `Auth0` (EU/UK-friendly tenant configuration)
- AuthZ: implemented in Clubroom API (RBAC + delegated grants + resource-scoped sharing)
- Object storage: S3-compatible private buckets (EU region), signed URLs only
- Background work: app worker process + cron jobs (same codebase)
- Observability: structured logs + metrics + alerts (startup-grade)

## Why this stack fits Clubroom
- Frontend is TypeScript-heavy already -> TypeScript backend keeps contracts and enums aligned.
- Product has high trust/safeguarding needs -> Postgres + explicit authz model + audit trail is safer than ad-hoc serverless functions.
- Scale target (1,500 coaches / 30,000 parents+athletes / 3,000 bookings/day / 50,000 messages/day) fits a modular monolith.
- Existing frontend service patterns (`Result`, typed events, soft delete, versioning) map well to REST + Prisma + Postgres.

## Cost-Conscious Deployment Topology (Phase 1)
Start simple but secure:
1. One API service container (`apps/api`)
2. One worker process (same image/codebase) for cron/async jobs
3. Managed Postgres with PITR enabled
4. Private object storage (S3-compatible) in EU region
5. Auth0 tenant for authn
6. TLS termination + WAF/reverse proxy (platform or CDN/proxy)

### Keep costs low without cutting security
- Prefer one API service + one worker over microservices.
- Use Postgres for transactional outbox + job scheduling initially (avoid Redis on day one unless needed).
- Use object storage + signed URLs instead of proxying large file uploads through the API.
- Use platform-managed TLS and secrets.
- Partition only high-volume tables first (`audit_events`, maybe `messages`) when needed, not preemptively everywhere.

### Do not cut these corners
- No shared long-lived API keys in mobile app
- No public upload buckets
- No hard delete for safeguarding/payment/audit records
- No unaudited admin access/impersonation
- No skipping PITR on the primary database

## Authentication and Tokens (Auth0 + API-side session control)
### Token model
- Access token: short-lived JWT (recommended 5-15 min)
- Refresh token: rotated, revocable, tied to device/session
- Session registry: store `jti`, `user_id`, device info, issued/last seen, revoked state in Postgres

### Mobile auth flow (Expo app)
- Authorization code + PKCE (OIDC)
- Store refresh/session tokens in secure storage on device (not AsyncStorage)
- Access token attached to API requests in `Authorization: Bearer <token>`

### API validation requirements
- Verify JWT signature via JWKS
- Verify `iss`, `aud`, `exp`, `iat`
- Map Auth0 `sub` to local `users.auth_provider_subject`
- Check local session state (revoked / user suspended / token epoch invalidation)

### Multi-role support
A single user may be any combination of:
- `coach`
- `parent`
- `athlete`
- `club_admin`
- `staff/support` (internal)

Require explicit acting role on sensitive endpoints when ambiguity matters (`X-Acting-Role`).

## Data and Storage Choices
### Postgres
Use Postgres as system of record for all business entities and compliance/audit data.

Standards:
- UTC timestamps (`timestamptz`)
- optimistic concurrency (`version bigint`)
- soft delete (`deleted_at`, `deleted_by`) for mutable records
- append-only tables for audit/safeguarding/financial state history

### Object Storage (media/docs)
Use private buckets only. Store metadata in Postgres (`media_objects`).

Required controls:
- signed upload URLs
- signed download URLs
- upload session binding to expected resource/user
- malware scan pipeline with quarantine state before publish
- file type allowlists and size limits per feature

## Contracts and Type Safety
Store shared contracts in a monorepo package (example name: `packages/shared-contracts`):
- request DTO schemas
- response DTO schemas
- enums (statuses, roles, visibility)
- error codes
- pagination/filter schemas

Generate/OpenAPI from these contracts (optional but recommended) for internal docs and client validation.

## API Runtime Practices
- Fastify route schema hooks for request/response validation
- strict JSON payload limits by endpoint class
- structured logging with request ID correlation
- rate limiting by IP + user + endpoint class
- explicit route registration by module (no magic auto-load if it hides authz/audit decisions)

## Prisma + SQL Practices
- Prisma for most CRUD and transactional flows
- allow raw SQL only for:
  - advanced reporting queries
  - partition maintenance
  - bulk jobs
  - performance-critical cases with documented benchmarks
- Never return Prisma models directly to API clients; always map through DTO serializers

## Messaging / Realtime (Phase 1)
- Real-time scope: chat typing + message delivery/read updates only
- Persist messages in Postgres first; realtime transport is secondary
- If realtime temporarily degrades, polling/inbox refresh should still preserve correctness

## Payments (Phase 1 and Future)
Phase 1:
- no in-app payments
- direct-to-coach payment instructions + reminders + reconciler state
- invoices and reconciler actions are audited and append-only via event tables

Future-ready requirements now:
- keep `invoices`, `invoice_events`, `reconciler_entries` clean and immutable enough to integrate payment provider webhooks later
- use idempotency keys on invoice/reconciler writes

## Recommended Monorepo Tooling (low friction)
Because this repo is not yet a monorepo, keep migration pragmatic:
- package manager workspaces (`pnpm` recommended, but can start with npm workspaces)
- one repo CI pipeline with path-based jobs later
- shared TS configs and ESLint config package after API scaffolding exists

## Environment and Secrets
Required env categories:
- database
- auth0 issuer/audience/client ids
- object storage credentials + bucket names
- signing URL TTL settings
- malware scan integration settings (if external service)
- email/SMS providers (for reminders/notifications)
- logging/monitoring DSNs

Rules:
- validate all env at boot with `zod`
- no `EXPO_PUBLIC_*` style secrets for backend-only values
- no secrets in logs
- rotate credentials on schedule and after incidents
