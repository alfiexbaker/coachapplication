# Staging Supabase and Sentry posture — 2026-08-02

Scope: read-only staging verification. No production target and no database, storage, Sentry, or Supabase control-plane mutation was attempted.

| Area | Result |
| --- | --- |
| Database schema | 59/59 checked-in migrations are applied; both required `CommunityGroup` columns exist. |
| Current public schema | No public table without RLS; no current `anon`/`authenticated`/`PUBLIC` direct grants; no `SECURITY DEFINER` function in the exposed `public` schema. |
| Future-object safety | **Release blocked:** 25 `supabase_admin` default privileges would grant future public routines, sequences, or tables to `PUBLIC`, `anon`, or `authenticated`. The connected `postgres` role cannot alter that owner's defaults. |
| Trusted service role | Warning: `service_role` retains 1,008 direct and 24 future public-schema privileges. It must remain server-only and outside all client bundles. |
| Supabase MCP | The configured endpoint is reachable (`401` without OAuth), but no Supabase MCP tools are exposed to this task. |
| Sentry | The task shell has no `SENTRY_AUTH_TOKEN`, org, or project, so no issue/event query was attempted. The repository has a configured runtime DSN but that is not API read authority. |

Verification: `node scripts/db-staging-preflight.js --json`; MCP reachability check only. The preflight uses Prisma read-only catalog queries and disconnects afterward.

Required external follow-up: an authorised Supabase owner/control-plane context must revoke the `supabase_admin` future defaults, then rerun the same read-only preflight. A Sentry token with `project:read`, `event:read`, and `org:read` must be configured locally to inspect issues.
