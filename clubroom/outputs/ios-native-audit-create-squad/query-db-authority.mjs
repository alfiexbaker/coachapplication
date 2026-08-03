import { getPrismaClient } from '../../packages/db/src/index.ts';

const prisma = getPrismaClient();

try {
  const objects = await prisma.$queryRawUnsafe(
    'SELECT c.relname AS "tableName", c.relrowsecurity AS "rlsEnabled", ' +
      'c.relforcerowsecurity AS "rlsForced" FROM pg_class c ' +
      'JOIN pg_namespace n ON n.oid = c.relnamespace ' +
      "WHERE n.nspname = 'public' AND c.relname IN ('Squad', 'AuditEvent') " +
      'ORDER BY c.relname',
  );
  const grants = await prisma.$queryRawUnsafe(
    'WITH objects AS (' +
      'SELECT c.relname AS "tableName", c.relowner AS "ownerOid", ' +
      'c.relacl AS "objectAcl", CASE WHEN c.relkind = \'S\' THEN \'S\'::"char" ' +
      'ELSE \'r\'::"char" END AS "aclKind" FROM pg_class c ' +
      'JOIN pg_namespace n ON n.oid = c.relnamespace ' +
      "WHERE n.nspname = 'public' AND c.relname IN ('Squad', 'AuditEvent')" +
      '), grants AS (' +
      'SELECT o."tableName", COALESCE(r.rolname, \'PUBLIC\') AS grantee, ' +
      'x.privilege_type AS privilege FROM objects o CROSS JOIN LATERAL ' +
      'aclexplode(COALESCE(o."objectAcl", acldefault(o."aclKind", o."ownerOid"))) x ' +
      'LEFT JOIN pg_roles r ON r.oid = x.grantee' +
      ") SELECT * FROM grants WHERE grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC') " +
      'ORDER BY "tableName", grantee, privilege',
  );
  const policies = await prisma.$queryRawUnsafe(
    'SELECT tablename AS "tableName", policyname AS "policyName", roles, cmd ' +
      "FROM pg_policies WHERE schemaname = 'public' " +
      "AND tablename IN ('Squad', 'AuditEvent') ORDER BY tablename, policyname",
  );
  const principal = await prisma.$queryRawUnsafe(
    'SELECT current_user AS "currentUser", ' +
      "pg_has_role(current_user, 'supabase_admin', 'USAGE') AS \"canAlterSupabaseAdminDefaults\"",
  );

  console.log(JSON.stringify({ objects, grants, policies, principal }, null, 2));
} finally {
  await prisma.$disconnect();
}
