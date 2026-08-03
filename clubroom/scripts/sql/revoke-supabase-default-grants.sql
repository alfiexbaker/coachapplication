-- Privileged remediation for Supabase default privileges in the exposed public schema.
--
-- Run this only from a SQL context that can alter defaults for supabase_admin,
-- for example a Supabase MCP/Dashboard context with supabase_admin membership.
-- Prisma migrations normally run as the database connection role and may not be
-- allowed to change another role's default privileges.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    RAISE EXCEPTION 'Role supabase_admin does not exist in this database.';
  END IF;

  IF NOT pg_has_role(current_user, 'supabase_admin', 'USAGE') THEN
    RAISE EXCEPTION
      'Current role % cannot use supabase_admin; use the Supabase Data API default-privileges control or a privileged support context.',
      current_user;
  END IF;
END $$;

-- Existing objects in public must not be directly readable/callable through
-- anon/authenticated/PUBLIC. Product access belongs behind Fastify /v1.
-- service_role is intentionally excluded: it is a trusted server credential
-- audited separately by db-staging-preflight.js.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated, PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public
  FROM anon, authenticated, PUBLIC;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public
  FROM anon, authenticated, PUBLIC;

-- Global defaults cover all schemas. This is required for routine EXECUTE grants
-- because PostgreSQL's built-in PUBLIC function default is global, not schema-local.
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
  REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated, PUBLIC;

-- Schema-local defaults cover prior schema-scoped grants for future public objects.
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated, PUBLIC;

DO $$
DECLARE
  remaining_default_grants integer;
BEGIN
  WITH owner_role AS (
    SELECT oid
    FROM pg_roles
    WHERE rolname = 'supabase_admin'
  ),
  object_types(object_type_code) AS (
    VALUES ('r'::"char"), ('S'::"char"), ('f'::"char")
  ),
  public_namespace AS (
    SELECT oid
    FROM pg_namespace
    WHERE nspname = 'public'
  ),
  effective_acls AS (
    SELECT COALESCE(
             global_default.defaclacl,
             acldefault(object_type.object_type_code, owner_role.oid)
           ) || COALESCE(schema_default.defaclacl, '{}'::aclitem[]) AS acl
    FROM owner_role
    CROSS JOIN object_types object_type
    CROSS JOIN public_namespace namespace
    LEFT JOIN pg_default_acl global_default
      ON global_default.defaclrole = owner_role.oid
     AND global_default.defaclobjtype = object_type.object_type_code
     AND global_default.defaclnamespace = 0
    LEFT JOIN pg_default_acl schema_default
      ON schema_default.defaclrole = owner_role.oid
     AND schema_default.defaclobjtype = object_type.object_type_code
     AND schema_default.defaclnamespace = namespace.oid
  )
  SELECT count(*)
  INTO remaining_default_grants
  FROM effective_acls
  CROSS JOIN LATERAL aclexplode(effective_acls.acl) exploded
  LEFT JOIN pg_roles grantee_role
    ON grantee_role.oid = exploded.grantee
  WHERE COALESCE(grantee_role.rolname, 'PUBLIC')
    IN ('anon', 'authenticated', 'PUBLIC');

  IF remaining_default_grants > 0 THEN
    RAISE EXCEPTION
      'supabase_admin still has % effective public-schema default grants after remediation.',
      remaining_default_grants;
  END IF;
END $$;

COMMIT;
