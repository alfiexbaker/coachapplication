# Player-support database authority — read-only staging evidence

- Target: staging database only; no write or destructive statement was issued.
- Migration preflight: 57/57 migrations applied.
- Focused relations: `Family`, `FamilyMembership`, `GuardianChildLink`, `Athlete`, `ChildSenTag`, and `AuditEvent`.
- Every focused relation has row-level security enabled and not forced.
- `PUBLIC`, `anon`, and `authenticated` have no current relation grants on the focused objects.
- No direct RLS policies exist on the focused objects; the Fastify service boundary remains authoritative.
- `service_role` retains trusted relation privileges and must never be shipped in a client bundle.
- The connected `postgres` principal cannot change `supabase_admin` default privileges.
- Release posture remains blocked by `SEC-004`: 25 unsafe future-object default-grant findings owned by `supabase_admin`. Current player-support objects passed; future defaults did not.
- Before and after the intercepted UI failure, the staging athlete remained version `1` with empty detailed support JSON and null guidance notes. The deliberate 503 caused no database write.
- The same read exposed a live legacy `ChildSenTag` for ADHD while detailed support JSON was absent. The API now projects that legacy row into the support response so it is visible and retained by the next authorised save.
- Supabase MCP remains unavailable in this task (`ENV-003`), so the catalog was queried through the configured read-only staging database path instead.

Evidence commands:

- `npm run audit:db:stage -- --json`
- `node --env-file=.env.staging.local --import ./apps/api/node_modules/tsx/dist/loader.mjs outputs/ios-native-audit-edit-child-support/query-db-authority.mjs`
