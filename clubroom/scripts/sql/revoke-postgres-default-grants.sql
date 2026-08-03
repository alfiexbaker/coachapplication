-- Harden future objects created by the Prisma migration role.
--
-- This script is separate from revoke-supabase-default-grants.sql because the
-- normal staging connection can alter postgres-owned defaults but cannot alter
-- defaults owned by supabase_admin.

BEGIN;

DO $$
BEGIN
  IF NOT pg_has_role(current_user, 'postgres', 'USAGE') THEN
    RAISE EXCEPTION
      'Current role % cannot alter postgres default privileges.',
      current_user;
  END IF;
END $$;

-- service_role is intentionally excluded: it is a trusted server credential
-- audited separately by db-staging-preflight.js.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated, PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated, PUBLIC;

DO $$
DECLARE
  remaining_default_grants integer;
BEGIN
  WITH owner_role AS (
    SELECT oid
    FROM pg_roles
    WHERE rolname = 'postgres'
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
      'postgres still has % effective public-schema default grants after remediation.',
      remaining_default_grants;
  END IF;
END $$;

COMMIT;
