import { getPrismaClient } from '../../packages/db/src/index.ts';

const prisma = getPrismaClient();
const athleteId = 'ath_7df7ec13-e136-7525-985f-dec069fc983f';

try {
  const objects = await prisma.$queryRaw`
    SELECT
      c.relname AS "tableName",
      c.relrowsecurity AS "rlsEnabled",
      c.relforcerowsecurity AS "rlsForced"
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'Family',
        'FamilyMembership',
        'GuardianChildLink',
        'Athlete',
        'ChildSenTag',
        'AuditEvent'
      )
    ORDER BY c.relname
  `;
  const grants = await prisma.$queryRaw`
    WITH objects AS (
      SELECT
        c.relname AS "tableName",
        c.relowner AS "ownerOid",
        c.relacl AS "objectAcl",
        CASE WHEN c.relkind = 'S' THEN 'S'::"char" ELSE 'r'::"char" END AS "aclKind"
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname IN (
          'Family',
          'FamilyMembership',
          'GuardianChildLink',
          'Athlete',
          'ChildSenTag',
          'AuditEvent'
        )
    ),
    grants AS (
      SELECT
        o."tableName",
        COALESCE(r.rolname, 'PUBLIC') AS grantee,
        x.privilege_type AS privilege
      FROM objects o
      CROSS JOIN LATERAL
        aclexplode(COALESCE(o."objectAcl", acldefault(o."aclKind", o."ownerOid"))) x
      LEFT JOIN pg_roles r ON r.oid = x.grantee
    )
    SELECT *
    FROM grants
    WHERE grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
    ORDER BY "tableName", grantee, privilege
  `;
  const policies = await prisma.$queryRaw`
    SELECT
      tablename AS "tableName",
      policyname AS "policyName",
      roles,
      cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'Family',
        'FamilyMembership',
        'GuardianChildLink',
        'Athlete',
        'ChildSenTag',
        'AuditEvent'
      )
    ORDER BY tablename, policyname
  `;
  const principal = await prisma.$queryRaw`
    SELECT
      current_user AS "currentUser",
      pg_has_role(current_user, 'supabase_admin', 'USAGE')
        AS "canAlterSupabaseAdminDefaults"
  `;
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
    select: {
      id: true,
      version: true,
      disabilitiesJson: true,
      specialNeedsJson: true,
      communicationNotes: true,
      behavioralNotes: true,
      senTags: {
        where: { deletedAt: null },
        select: { tag: true, priority: true, isCritical: true },
        orderBy: [{ priority: 'desc' }, { tag: 'asc' }],
      },
    },
  });

  console.log(
    JSON.stringify(
      {
        objects,
        directClientGrants: grants.filter((grant) => grant.grantee !== 'service_role'),
        trustedServiceRoleGrantCount: grants.filter((grant) => grant.grantee === 'service_role')
          .length,
        policies,
        principal,
        athleteAfterInterceptedUiPatch: athlete,
      },
      (_, value) => (typeof value === 'bigint' ? value.toString() : value),
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
