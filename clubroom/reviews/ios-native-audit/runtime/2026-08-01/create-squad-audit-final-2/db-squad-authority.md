# Squad database authority — 2026-08-01

Target: staging database loaded from `.env.staging.local`.

Method: read-only Prisma catalog queries. No `INSERT`, `UPDATE`, `DELETE`, DDL, or production connection was used.

## Migration and global posture

- `npm run audit:db:stage`
- 57/57 checked-in migrations applied.
- The global preflight remains blocked by the existing 25 unsafe future default grants owned by `supabase_admin` (`SEC-004`). The connected `postgres` principal cannot alter those defaults.

## Current `Squad` and `AuditEvent` objects

- Row-level security: enabled on both tables.
- Forced RLS: false on both tables because the Fastify database owner is the backend authority.
- `anon`: no current table grants.
- `authenticated`: no current table grants.
- `PUBLIC`: no current table grants.
- Direct RLS policies: none. With direct client grants revoked, access is through the Fastify authority boundary.
- `service_role`: retains table privileges. This is the existing trusted-integration warning from the global preflight and must remain out of every client bundle.

The isolated `POST /v1/clubs/:clubId/squads` proof separately confirms that ordinary members are denied, authorized staff can create the stored name and level, unsupported fields are rejected before persistence, and both permission and validation denials produce redacted `DENY` audit events.

Supabase MCP remains unavailable in this task (`ENV-003`), so the configured read-only database connection supplied the catalog evidence.
