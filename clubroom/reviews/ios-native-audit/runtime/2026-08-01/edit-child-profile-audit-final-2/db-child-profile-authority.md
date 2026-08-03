# Child-profile database authority — read-only staging evidence

- Target: staging database only; no write or destructive statement was issued.
- Migration preflight: 57/57 migrations applied.
- Focused relations: `Family`, `FamilyMembership`, `GuardianChildLink`, `Athlete`, and `AuditEvent`.
- Every focused relation has row-level security enabled and not forced.
- `PUBLIC`, `anon`, and `authenticated` have no current relation grants on the focused objects.
- No direct RLS policies exist on the focused objects; the Fastify service boundary remains authoritative.
- `service_role` retains trusted relation privileges and must never be shipped in a client bundle.
- The connected `postgres` principal cannot change `supabase_admin` default privileges.
- Release posture remains blocked by `SEC-004`: 25 unsafe future-object default-grant findings owned by `supabase_admin`. Current child-profile objects passed; future defaults did not.
- Supabase MCP remains unavailable in this task (`ENV-003`), so the catalog was queried through the configured read-only staging database path instead.

Evidence commands:

- `npm run audit:db:stage -- --json`
- `node --env-file=.env.staging.local --import ./apps/api/node_modules/tsx/dist/loader.mjs outputs/ios-native-audit-edit-child-profile/query-db-authority.mjs`
