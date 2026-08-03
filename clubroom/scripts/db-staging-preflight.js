#!/usr/bin/env node
/* eslint-disable no-console */

const {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  mkdirSync,
} = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PAYMENT_SIMULATION_SECRET = 'clubroom-simulated-payments-dev-secret';
const DEFAULT_ENV_FILE = '.env.staging.local';
const DEFAULT_DATABASE_CONNECTION_LIMIT = '1';
const DEFAULT_SUPABASE_DATA_API_TIMEOUT_MS = 10_000;
const SUPABASE_DATA_API_DISABLED_ERROR_CODE = 'UNAUTHORIZED_INVALID_API_KEY_TYPE';
const PRISMA_CLIENT_PATH = path.join(ROOT, 'packages/db/node_modules/@prisma/client');
const RLS_EXEMPT_PUBLIC_TABLES = new Set(['_prisma_migrations']);

const REQUIRED_ENV = [
  {
    key: 'API_DATA_BACKEND',
    expected: 'db',
    severity: 'blocker',
    message: 'API must run against the Prisma database backend for staging.',
  },
  {
    key: 'DATABASE_URL',
    severity: 'blocker',
    message: 'Staging Postgres connection string is required.',
  },
  {
    key: 'DB_PREFLIGHT_SUPABASE_URL',
    severity: 'blocker',
    message: 'Supabase project URL is required to verify the public Data API boundary.',
  },
  {
    key: 'DB_PREFLIGHT_SUPABASE_PUBLISHABLE_KEY',
    severity: 'blocker',
    message:
      'An active Supabase publishable key is required to verify the public Data API boundary.',
  },
  {
    key: 'API_JWT_SECRET',
    severity: 'blocker',
    message: 'JWT signing secret is required for non-mock auth.',
    minLength: 16,
  },
  {
    key: 'API_JWT_ISSUER',
    severity: 'blocker',
    message: 'JWT issuer must be explicit for staging clients.',
  },
  {
    key: 'API_JWT_AUDIENCE',
    severity: 'blocker',
    message: 'JWT audience must be explicit for staging clients.',
  },
  {
    key: 'API_PAYMENT_ALLOWED_RETURN_ORIGINS',
    severity: 'blocker',
    message: 'Hosted payment return origins must be allowlisted even while simulated.',
  },
  {
    key: 'API_PAYMENT_PROVIDER',
    expected: 'simulated',
    severity: 'blocker',
    message:
      'Payment and payout provider must be explicitly simulated until real provider adapters and webhooks are implemented.',
  },
  {
    key: 'API_PAYMENT_SIMULATION_SECRET',
    severity: 'blocker',
    message: 'Simulated payment provider secret must not use the dev default.',
    notValue: DEFAULT_PAYMENT_SIMULATION_SECRET,
  },
  {
    key: 'API_TRUST_PROXY',
    severity: 'warning',
    message:
      'Set API_TRUST_PROXY explicitly for the staging deployment so rate limits use the correct client IP model.',
  },
  {
    key: 'S3_ENDPOINT',
    severity: 'blocker',
    message: 'Object storage endpoint is required for signed uploads.',
  },
  {
    key: 'S3_BUCKET_PRIVATE',
    severity: 'blocker',
    message: 'Private object storage bucket is required for video/proof.',
  },
  {
    key: 'S3_REGION',
    severity: 'blocker',
    message: 'Object storage region is required.',
  },
  {
    key: 'S3_ACCESS_KEY_ID',
    severity: 'blocker',
    message: 'Object storage access key is required.',
  },
  {
    key: 'S3_SECRET_ACCESS_KEY',
    severity: 'blocker',
    message: 'Object storage secret key is required.',
  },
  {
    key: 'SENTRY_DSN',
    severity: 'warning',
    message: 'Sentry should be configured before deployment rehearsal.',
  },
  {
    key: 'SENTRY_RELEASE',
    severity: 'warning',
    message: 'Sentry release should be set to the deployed build identifier.',
    notValue: 'clubroom-api@development',
  },
];

const REQUIRED_FILES = [
  {
    path: 'packages/db/prisma/schema.prisma',
    severity: 'blocker',
    message: 'Prisma schema must exist.',
  },
  {
    path: 'packages/db/prisma/migrations/migration_lock.toml',
    severity: 'blocker',
    message: 'Checked-in Prisma migration lock must exist.',
  },
  {
    path: 'apps/api/src/lib/ops-runtime.ts',
    severity: 'blocker',
    message: 'API release/readiness guardrails must exist.',
  },
  {
    path: 'apps/api/scripts/release-preflight.ts',
    severity: 'blocker',
    message: 'API release preflight script must exist.',
  },
];

const SECRET_FILE_RULES = [
  '.env.local',
  '.env.staging.local',
  'docs/backend-api/test-data/TEST_ACCOUNTS.local.txt',
  'docs/backend-api/test-data/TEST_ACCOUNTS.staging.local.txt',
].map((filePath) => ({
  path: filePath,
  severity: 'blocker',
  message: 'Local secret artifacts must be owner-readable only.',
}));

const FORBIDDEN_ENV_VALUES = [
  {
    key: 'API_PASSWORD_RESET_DEV_OUTBOX',
    value: 'true',
    severity: 'blocker',
    message: 'Password reset dev outbox must not be enabled for release-style staging.',
    action: 'Set API_PASSWORD_RESET_DEV_OUTBOX=false or leave it unset.',
  },
  {
    key: 'API_PASSWORD_RESET_TOKEN_RESPONSE',
    value: '1',
    severity: 'blocker',
    message: 'Password reset token responses must not be enabled for release-style staging.',
    action: 'Unset API_PASSWORD_RESET_TOKEN_RESPONSE; token echo is test/dev-outbox only.',
  },
];

const REQUIRED_DB_COLUMNS = [
  {
    table: 'CommunityGroup',
    column: 'groupType',
    migration: '20260704004500_community_group_squad_link',
    message: 'Community group type column must exist for /v1/community-groups in db mode.',
  },
  {
    table: 'CommunityGroup',
    column: 'squadId',
    migration: '20260704004500_community_group_squad_link',
    message: 'Community group squad link column must exist for private squad community groups.',
  },
];

function parseArgs(argv) {
  const envFileArg = argv.find((arg) => arg.startsWith('--staging-env-file='));
  return {
    json: argv.includes('--json'),
    markdown: argv.includes('--markdown'),
    write: argv.includes('--write'),
    strict: argv.includes('--strict'),
    envFile: envFileArg ? envFileArg.slice('--staging-env-file='.length) : DEFAULT_ENV_FILE,
  };
}

function loadEnvFile(relativeOrAbsolutePath) {
  const absolutePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(ROOT, relativeOrAbsolutePath);
  if (!existsSync(absolutePath)) {
    return { path: relativeOrAbsolutePath, loaded: false, keys: [] };
  }

  const keys = [];
  const content = readFileSync(absolutePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    keys.push(key);
    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }

  return { path: relativeOrAbsolutePath, loaded: true, keys };
}

function maskValue(key, value) {
  if (!value) return '';
  if (/dsn|secret|token|password|url|key/i.test(key)) {
    if (value.length <= 8) return '********';
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }
  return value;
}

function hasValue(value) {
  return Boolean(String(value ?? '').trim());
}

function compactErrorValue(error) {
  const value = error instanceof Error ? error.message : String(error);
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(' ');
}

function classifyDatabaseSchemaError(error) {
  const value = compactErrorValue(error);
  if (/EMAXCONNSESSION|max clients reached in session mode|pool_size/i.test(value)) {
    return {
      id: 'db:schema-check:session-pool-exhausted',
      message:
        'Could not validate staging database schema because the Supabase session pool is exhausted.',
      action:
        'Stop local staging API/dev servers holding DATABASE_URL sessions, wait for Supabase to release idle sessions, or rerun against the transaction pooler with a low connection_limit.',
      value,
    };
  }

  return {
    id: 'db:schema-check',
    message: 'Could not validate staging database schema against checked-in Prisma migrations.',
    action:
      'Verify DATABASE_URL points at the staging database and that Prisma can read migration metadata.',
    value,
  };
}

function configurePreflightDatabaseUrl() {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) {
    return;
  }

  try {
    const databaseUrl = new URL(rawDatabaseUrl);
    if (!databaseUrl.searchParams.has('connection_limit')) {
      databaseUrl.searchParams.set(
        'connection_limit',
        process.env.DB_PREFLIGHT_DATABASE_CONNECTION_LIMIT ?? DEFAULT_DATABASE_CONNECTION_LIMIT,
      );
    }
    if (!databaseUrl.searchParams.has('pool_timeout')) {
      databaseUrl.searchParams.set('pool_timeout', '30');
    }
    process.env.DATABASE_URL = databaseUrl.toString();
    process.env.PRISMA_CLIENT_ENGINE_TYPE = process.env.PRISMA_CLIENT_ENGINE_TYPE ?? 'binary';
  } catch {
    // Existing env validation reports invalid DATABASE_URL values.
  }
}

function checkEnvRule(rule) {
  const value = process.env[rule.key];
  const present = hasValue(value);
  const issues = [];

  if (!present) {
    issues.push({
      id: `env:${rule.key}`,
      status: rule.severity,
      message: rule.message,
      action: `Set ${rule.key}.`,
      value: '',
    });
    return issues;
  }

  if (rule.expected && value !== rule.expected) {
    issues.push({
      id: `env:${rule.key}`,
      status: rule.severity,
      message: `${rule.key} should be ${rule.expected}, currently ${value}.`,
      action: `Set ${rule.key}=${rule.expected}.`,
      value: maskValue(rule.key, value),
    });
  }

  if (rule.notValue && value === rule.notValue) {
    issues.push({
      id: `env:${rule.key}`,
      status: rule.severity,
      message: `${rule.key} is still using a forbidden default value.`,
      action: `Set ${rule.key} to an environment-specific secret.`,
      value: maskValue(rule.key, value),
    });
  }

  if (rule.minLength && value.length < rule.minLength) {
    issues.push({
      id: `env:${rule.key}`,
      status: rule.severity,
      message: `${rule.key} is shorter than ${rule.minLength} characters.`,
      action: `Set a stronger ${rule.key}.`,
      value: maskValue(rule.key, value),
    });
  }

  return issues;
}

function checkFileRule(rule) {
  const absolutePath = path.join(ROOT, rule.path);
  if (existsSync(absolutePath)) return [];

  return [
    {
      id: `file:${rule.path}`,
      status: rule.severity,
      message: rule.message,
      action: `Restore or create ${rule.path}.`,
      value: '',
    },
  ];
}

function checkSecretFileMode(rule) {
  const absolutePath = path.isAbsolute(rule.path) ? rule.path : path.join(ROOT, rule.path);
  if (!existsSync(absolutePath)) return [];

  const mode = statSync(absolutePath).mode & 0o777;
  if ((mode & 0o077) === 0) return [];

  return [
    {
      id: `file-mode:${rule.path}`,
      status: rule.severity,
      message: rule.message,
      action: `Run chmod 600 ${rule.path}.`,
      value: `0o${mode.toString(8).padStart(3, '0')}`,
    },
  ];
}

function checkForbiddenEnvValue(rule) {
  const value = String(process.env[rule.key] ?? '')
    .trim()
    .toLowerCase();
  if (value !== rule.value) {
    return [];
  }
  return [
    {
      id: `env:${rule.key}`,
      status: rule.severity,
      message: rule.message,
      action: rule.action,
      value: maskValue(rule.key, process.env[rule.key] ?? ''),
    },
  ];
}

function hasCompleteSmtpPasswordResetConfig() {
  return (
    hasValue(process.env.API_PASSWORD_RESET_SMTP_HOST) &&
    hasValue(process.env.API_PASSWORD_RESET_SMTP_USERNAME) &&
    hasValue(process.env.API_PASSWORD_RESET_SMTP_PASSWORD) &&
    hasValue(process.env.API_PASSWORD_RESET_EMAIL_FROM)
  );
}

function hasCompleteBrevoPasswordResetConfig() {
  return (
    hasValue(process.env.API_PASSWORD_RESET_BREVO_API_KEY) &&
    hasValue(process.env.API_PASSWORD_RESET_EMAIL_FROM)
  );
}

function checkPasswordResetDeliveryEnv() {
  if (
    hasValue(process.env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL) ||
    hasCompleteBrevoPasswordResetConfig() ||
    hasCompleteSmtpPasswordResetConfig()
  ) {
    return [];
  }

  return [
    {
      id: 'env:API_PASSWORD_RESET_EMAIL_DELIVERY',
      status: 'blocker',
      message: 'Password reset email delivery provider is required for release-style staging.',
      action:
        'Set API_PASSWORD_RESET_EMAIL_WEBHOOK_URL, API_PASSWORD_RESET_BREVO_API_KEY with API_PASSWORD_RESET_EMAIL_FROM, or complete API_PASSWORD_RESET_SMTP_* settings.',
      value: '',
    },
  ];
}

function getMigrationNames() {
  const migrationsDir = path.join(ROOT, 'packages/db/prisma/migrations');
  if (!existsSync(migrationsDir)) return [];

  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{14,}/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function getMigrationCount() {
  return getMigrationNames().length;
}

function getToolStatus() {
  const tools = [
    ['api tsx', 'apps/api/node_modules/.bin/tsx'],
    ['root tsc', 'node_modules/.bin/tsc'],
    ['prettier', 'node_modules/.bin/prettier'],
    ['expo', 'node_modules/.bin/expo'],
  ];

  return tools.map(([name, relativePath]) => ({
    name,
    path: relativePath,
    present: existsSync(path.join(ROOT, relativePath)),
  }));
}

function shouldCheckDatabaseSchema() {
  return process.env.API_DATA_BACKEND === 'db' && hasValue(process.env.DATABASE_URL);
}

function emptySupabaseAccessPosture() {
  return {
    checked: false,
    dataApi: emptySupabaseDataApiPosture(),
    databasePrincipal: emptyDatabasePrincipal(),
    rlsDisabledTables: [],
    directRoleGrants: [],
    defaultRoleGrants: [],
    serviceRoleDirectGrantCount: 0,
    serviceRoleDefaultGrants: [],
    securityDefinerFunctions: [],
  };
}

function emptySupabaseDataApiPosture() {
  return {
    checked: false,
    disabledForPublicClients: false,
    endpoint: null,
    statusCode: null,
    errorCode: null,
    reason: 'not-configured',
  };
}

function emptyDatabasePrincipal() {
  return {
    checked: false,
    currentUser: null,
    sessionUser: null,
    databaseName: null,
    schemaName: null,
    canAlterSupabaseAdminDefaultPrivileges: false,
    canAlterPostgresDefaultPrivileges: false,
  };
}

function defaultGrantRemediationAction(posture, ownerRole = 'supabase_admin') {
  const isPostgresOwner = ownerRole === 'postgres';
  const script = isPostgresOwner
    ? 'scripts/sql/revoke-postgres-default-grants.sql'
    : 'scripts/sql/revoke-supabase-default-grants.sql';
  const base = isPostgresOwner
    ? `Apply ${script} as the staging migration role, then rerun this preflight.`
    : `Use the Supabase Data API default-privileges control or apply ${script} from a context with supabase_admin USAGE, then rerun this preflight.`;
  const principal = posture.databasePrincipal;
  if (!principal?.checked) {
    return base;
  }

  const currentUser = principal.currentUser ?? 'unknown';
  const canAlter = isPostgresOwner
    ? principal.canAlterPostgresDefaultPrivileges
    : principal.canAlterSupabaseAdminDefaultPrivileges;
  const capability = canAlter ? 'can' : 'cannot';
  return `${base} Current database role ${currentUser} ${capability} alter ${ownerRole} default privileges.`;
}

function buildSupabaseAccessPostureIssues(posture) {
  if (!posture.checked) {
    return [];
  }

  const issues = [];
  const dataApi = posture.dataApi ?? emptySupabaseDataApiPosture();
  const dataApiDisabled = dataApi.checked && dataApi.disabledForPublicClients;
  if (!dataApiDisabled) {
    issues.push({
      id: 'db:data-api-public-client-boundary',
      status: 'blocker',
      message:
        'Supabase Data API access is enabled for public clients or could not be verified as disabled.',
      action:
        'Disable the Supabase Data API for public clients, configure the strict preflight URL and publishable key, then rerun this check.',
      value: `reason=${dataApi.reason ?? 'unknown'}, status=${dataApi.statusCode ?? 'none'}, code=${dataApi.errorCode ?? 'none'}`,
    });
  }

  for (const table of posture.rlsDisabledTables) {
    issues.push({
      id: `db:rls:${table.schemaName}.${table.tableName}`,
      status: 'blocker',
      message: `Public table ${table.schemaName}.${table.tableName} does not have RLS enabled.`,
      action:
        'Enable row level security or move the table out of the exposed public schema before release rehearsal.',
      value: `${table.schemaName}.${table.tableName}`,
    });
  }

  for (const grant of posture.directRoleGrants) {
    issues.push({
      id: `db:direct-grant:${grant.grantee}:${grant.objectType}:${grant.schemaName}.${grant.objectName}:${grant.privilegeType}`,
      status: 'blocker',
      message: `Role ${grant.grantee} has direct ${grant.privilegeType} on ${grant.objectType} ${grant.schemaName}.${grant.objectName}.`,
      action: `${defaultGrantRemediationAction(posture)} Or otherwise revoke direct anon/authenticated/PUBLIC privileges, unless a reviewed RLS policy explicitly allows direct access.`,
      value: `${grant.grantee} ${grant.privilegeType} ${grant.objectType} ${grant.schemaName}.${grant.objectName}`,
    });
  }

  for (const grant of posture.defaultRoleGrants) {
    issues.push({
      id: `db:default-grant:${grant.ownerRole}:${grant.grantee}:${grant.objectType}:${grant.schemaName}:${grant.privilegeType}`,
      status: dataApiDisabled ? 'warning' : 'blocker',
      message: `Future ${grant.objectType} objects created by ${grant.ownerRole} in ${grant.schemaName} would grant ${grant.privilegeType} to ${grant.grantee}.`,
      action: dataApiDisabled
        ? `Keep the Supabase Data API disabled for public clients and retain the strict launch probe. ${defaultGrantRemediationAction(posture, grant.ownerRole)}`
        : defaultGrantRemediationAction(posture, grant.ownerRole),
      value: `${grant.ownerRole} -> ${grant.grantee} ${grant.privilegeType} future ${grant.objectType} in ${grant.schemaName}`,
    });
  }

  const serviceRoleDirectGrantCount = posture.serviceRoleDirectGrantCount ?? 0;
  const serviceRoleDefaultGrantCount = posture.serviceRoleDefaultGrants?.length ?? 0;
  if (serviceRoleDirectGrantCount > 0 || serviceRoleDefaultGrantCount > 0) {
    issues.push({
      id: 'db:trusted-service-role-authority',
      status: 'warning',
      message:
        'Supabase service_role retains direct or future public-schema privileges outside the Fastify API.',
      action:
        'Keep the service-role key out of all client bundles, confirm no product path uses the Data API directly, and explicitly accept or revoke this trusted integration authority before production.',
      value: `direct=${serviceRoleDirectGrantCount}, future=${serviceRoleDefaultGrantCount}`,
    });
  }

  for (const fn of posture.securityDefinerFunctions ?? []) {
    issues.push({
      id: `db:security-definer:${fn.signature}`,
      status: 'blocker',
      message: `Security-definer function ${fn.signature} is in the exposed public schema.`,
      action:
        'Move the function to a private schema, revoke direct public execution, and keep any trigger dependency on the same function object.',
      value: `${fn.signature} owned by ${fn.owner}`,
    });
  }

  return issues;
}

async function checkSupabaseDataApiPosture({
  projectUrl = process.env.DB_PREFLIGHT_SUPABASE_URL,
  publishableKey = process.env.DB_PREFLIGHT_SUPABASE_PUBLISHABLE_KEY,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_SUPABASE_DATA_API_TIMEOUT_MS,
} = {}) {
  const result = emptySupabaseDataApiPosture();
  if (!hasValue(projectUrl) || !hasValue(publishableKey) || typeof fetchImpl !== 'function') {
    result.reason = 'missing-config';
    return result;
  }

  let endpoint;
  try {
    const baseUrl = new URL(projectUrl);
    if (baseUrl.protocol !== 'https:') {
      result.reason = 'invalid-project-url';
      return result;
    }
    endpoint = new URL('/rest/v1/', baseUrl).toString();
    result.endpoint = endpoint;
  } catch {
    result.reason = 'invalid-project-url';
    return result;
  }

  try {
    const response = await fetchImpl(endpoint, {
      headers: {
        accept: 'application/json',
        apikey: publishableKey,
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    result.checked = true;
    result.statusCode = response.status;

    if (response.status !== 401) {
      result.reason = 'public-client-request-not-rejected';
      return result;
    }

    const responseText = (await response.text()).slice(0, 4096);
    let body = {};
    try {
      body = JSON.parse(responseText);
    } catch {
      body = {};
    }
    const headerCode = response.headers.get('sb-error-code');
    const bodyCode = typeof body.code === 'string' ? body.code : null;
    const message = [body.message, body.hint]
      .filter((value) => typeof value === 'string')
      .join(' ');
    result.errorCode = headerCode || bodyCode;
    result.disabledForPublicClients =
      result.errorCode === SUPABASE_DATA_API_DISABLED_ERROR_CODE &&
      /only (?:secret|the service_role) api keys? can be used for this endpoint/i.test(message);
    result.reason = result.disabledForPublicClients
      ? 'public-client-keys-rejected'
      : 'unexpected-rejection';
    return result;
  } catch {
    result.reason = 'probe-failed';
    return result;
  }
}

async function checkDatabasePrincipal(prisma) {
  const rows = await prisma.$queryRaw`
    SELECT current_user AS "currentUser",
           session_user AS "sessionUser",
           current_database() AS "databaseName",
           current_schema() AS "schemaName",
           pg_has_role(current_user, 'supabase_admin', 'USAGE') AS "canAlterSupabaseAdminDefaultPrivileges",
           pg_has_role(current_user, 'postgres', 'USAGE') AS "canAlterPostgresDefaultPrivileges"
    LIMIT 1
  `;
  const row = rows[0] ?? {};
  return {
    checked: true,
    currentUser: String(row.currentUser ?? '') || null,
    sessionUser: String(row.sessionUser ?? '') || null,
    databaseName: String(row.databaseName ?? '') || null,
    schemaName: String(row.schemaName ?? '') || null,
    canAlterSupabaseAdminDefaultPrivileges: row.canAlterSupabaseAdminDefaultPrivileges === true,
    canAlterPostgresDefaultPrivileges: row.canAlterPostgresDefaultPrivileges === true,
  };
}

async function checkSupabaseAccessPosture(prisma) {
  const dataApi = await checkSupabaseDataApiPosture();
  const databasePrincipal = await checkDatabasePrincipal(prisma);
  const rlsRows = await prisma.$queryRaw`
    SELECT schemaname AS "schemaName", tablename AS "tableName"
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity IS NOT TRUE
    ORDER BY tablename
  `;
  const grantRows = await prisma.$queryRaw`
    WITH relation_objects AS (
      SELECT CASE WHEN relation.relkind = 'S' THEN 'sequence' ELSE 'table' END AS "objectType",
             namespace.nspname AS "schemaName",
             relation.relname AS "objectName",
             relation.relowner AS "ownerOid",
             relation.relacl AS "objectAcl",
             CASE
               WHEN relation.relkind = 'S' THEN 'S'::"char"
               ELSE 'r'::"char"
             END AS "aclKind"
      FROM pg_class relation
      JOIN pg_namespace namespace
        ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
    ),
    relation_grants AS (
      SELECT object."objectType",
             object."schemaName",
             object."objectName",
             COALESCE(grantee_role.rolname, 'PUBLIC') AS grantee,
             exploded.privilege_type AS "privilegeType"
      FROM relation_objects object
      CROSS JOIN LATERAL aclexplode(
        COALESCE(object."objectAcl", acldefault(object."aclKind", object."ownerOid"))
      ) exploded
      LEFT JOIN pg_roles grantee_role
        ON grantee_role.oid = exploded.grantee
    ),
    routine_grants AS (
      SELECT 'routine' AS "objectType",
             namespace.nspname AS "schemaName",
             routine.oid::regprocedure::text AS "objectName",
             COALESCE(grantee_role.rolname, 'PUBLIC') AS grantee,
             exploded.privilege_type AS "privilegeType"
      FROM pg_proc routine
      JOIN pg_namespace namespace
        ON namespace.oid = routine.pronamespace
      CROSS JOIN LATERAL aclexplode(
        COALESCE(routine.proacl, acldefault('f', routine.proowner))
      ) exploded
      LEFT JOIN pg_roles grantee_role
        ON grantee_role.oid = exploded.grantee
      WHERE namespace.nspname = 'public'
    )
    SELECT *
    FROM (
      SELECT * FROM relation_grants
      UNION ALL
      SELECT * FROM routine_grants
    ) grants
    WHERE grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
    ORDER BY "objectType", "schemaName", "objectName", grantee, "privilegeType"
  `;
  const defaultGrantRows = await prisma.$queryRaw`
    WITH owner_roles AS (
      SELECT oid, rolname
      FROM pg_roles
      WHERE rolname IN ('postgres', 'supabase_admin')
    ),
    object_types("objectTypeCode", "objectType") AS (
      VALUES
        ('r'::"char", 'table'),
        ('S'::"char", 'sequence'),
        ('f'::"char", 'routine')
    ),
    public_namespace AS (
      SELECT oid
      FROM pg_namespace
      WHERE nspname = 'public'
    ),
    effective_default_acls AS (
      SELECT owner_role.rolname AS "ownerRole",
             object_type."objectType",
             COALESCE(
               global_default.defaclacl,
               acldefault(object_type."objectTypeCode", owner_role.oid)
             ) || COALESCE(schema_default.defaclacl, '{}'::aclitem[]) AS acl
      FROM owner_roles owner_role
      CROSS JOIN object_types object_type
      CROSS JOIN public_namespace namespace
      LEFT JOIN pg_default_acl global_default
        ON global_default.defaclrole = owner_role.oid
       AND global_default.defaclobjtype = object_type."objectTypeCode"
       AND global_default.defaclnamespace = 0
      LEFT JOIN pg_default_acl schema_default
        ON schema_default.defaclrole = owner_role.oid
       AND schema_default.defaclobjtype = object_type."objectTypeCode"
       AND schema_default.defaclnamespace = namespace.oid
    )
    SELECT DISTINCT effective."ownerRole",
           'public' AS "schemaName",
           effective."objectType",
           COALESCE(grantee_role.rolname, 'PUBLIC') AS grantee,
           exploded.privilege_type AS "privilegeType"
    FROM effective_default_acls effective
    CROSS JOIN LATERAL aclexplode(effective.acl) exploded
    LEFT JOIN pg_roles grantee_role
      ON grantee_role.oid = exploded.grantee
    WHERE COALESCE(grantee_role.rolname, 'PUBLIC')
      IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
    ORDER BY "ownerRole", "objectType", grantee, "privilegeType"
  `;
  const securityDefinerRows = await prisma.$queryRaw`
    SELECT p.oid::regprocedure::text AS signature,
           namespace.nspname AS "schemaName",
           routine_owner.rolname AS owner
    FROM pg_proc p
    JOIN pg_namespace namespace
      ON namespace.oid = p.pronamespace
    JOIN pg_roles routine_owner
      ON routine_owner.oid = p.proowner
    WHERE namespace.nspname = 'public'
      AND p.prosecdef IS TRUE
    ORDER BY signature
  `;

  return {
    checked: true,
    dataApi,
    databasePrincipal,
    rlsDisabledTables: rlsRows.filter(
      (row) => !RLS_EXEMPT_PUBLIC_TABLES.has(String(row.tableName ?? '')),
    ),
    directRoleGrants: grantRows.filter((row) => row.grantee !== 'service_role'),
    defaultRoleGrants: defaultGrantRows.filter((row) => row.grantee !== 'service_role'),
    serviceRoleDirectGrantCount: grantRows.filter((row) => row.grantee === 'service_role').length,
    serviceRoleDefaultGrants: defaultGrantRows.filter((row) => row.grantee === 'service_role'),
    securityDefinerFunctions: securityDefinerRows,
  };
}

async function checkDatabaseSchema() {
  const checkedInMigrations = getMigrationNames();
  const result = {
    checked: false,
    status: 'skipped',
    requiredMigrations: checkedInMigrations.length,
    appliedMigrations: 0,
    missingMigrations: [],
    requiredColumns: REQUIRED_DB_COLUMNS.map((column) => ({
      ...column,
      present: false,
    })),
    supabaseAccess: emptySupabaseAccessPosture(),
    issues: [],
  };

  if (!shouldCheckDatabaseSchema()) {
    return result;
  }

  result.checked = true;

  if (!existsSync(PRISMA_CLIENT_PATH)) {
    result.status = 'blocked';
    result.issues.push({
      id: 'db:prisma-client',
      status: 'blocker',
      message: 'Package-local Prisma client is required for staging schema validation.',
      action: 'Run package dependency install and prisma generate before release rehearsal.',
      value: '',
    });
    return result;
  }

  let prisma;
  try {
    const { PrismaClient } = require(PRISMA_CLIENT_PATH);
    prisma = new PrismaClient();

    const appliedRows = await prisma.$queryRaw`
      SELECT migration_name AS "migrationName"
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL
    `;
    const appliedNames = new Set(
      appliedRows.map((row) => String(row.migrationName ?? '').trim()).filter(Boolean),
    );
    result.appliedMigrations = appliedNames.size;
    result.missingMigrations = checkedInMigrations.filter((name) => !appliedNames.has(name));

    for (const requiredColumn of REQUIRED_DB_COLUMNS) {
      const rows = await prisma.$queryRaw`
        SELECT column_name AS "columnName"
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = ${requiredColumn.table}
          AND column_name = ${requiredColumn.column}
        LIMIT 1
      `;
      const present = rows.length > 0;
      const entry = result.requiredColumns.find(
        (column) =>
          column.table === requiredColumn.table && column.column === requiredColumn.column,
      );
      if (entry) entry.present = present;
    }
    result.supabaseAccess = await checkSupabaseAccessPosture(prisma);
  } catch (error) {
    const classifiedError = classifyDatabaseSchemaError(error);
    result.status = 'blocked';
    result.issues.push({
      id: classifiedError.id,
      status: 'blocker',
      message: classifiedError.message,
      action: classifiedError.action,
      value: classifiedError.value,
    });
    return result;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }

  for (const migrationName of result.missingMigrations) {
    result.issues.push({
      id: `db:migration:${migrationName}`,
      status: 'blocker',
      message: `Checked-in migration ${migrationName} has not been applied to the staging database.`,
      action:
        'Run Prisma migrate deploy against the staging DATABASE_URL before release rehearsal.',
      value: '',
    });
  }

  for (const column of result.requiredColumns.filter((entry) => !entry.present)) {
    result.issues.push({
      id: `db:column:${column.table}.${column.column}`,
      status: 'blocker',
      message: column.message,
      action: `Apply migration ${column.migration} to the staging database.`,
      value: '',
    });
  }
  result.issues.push(...buildSupabaseAccessPostureIssues(result.supabaseAccess));

  result.status = result.issues.some((issue) => issue.status === 'blocker') ? 'blocked' : 'ready';
  return result;
}

async function buildReport(envFileLoad) {
  const database = await checkDatabaseSchema();
  const issues = [
    ...REQUIRED_ENV.flatMap(checkEnvRule),
    ...checkPasswordResetDeliveryEnv(),
    ...FORBIDDEN_ENV_VALUES.flatMap(checkForbiddenEnvValue),
    ...REQUIRED_FILES.flatMap(checkFileRule),
    ...SECRET_FILE_RULES.flatMap(checkSecretFileMode),
    ...database.issues,
  ];
  const migrationCount = getMigrationCount();
  const toolStatus = getToolStatus();
  const missingTools = toolStatus.filter((tool) => !tool.present);

  if (migrationCount === 0) {
    issues.push({
      id: 'prisma:migrations',
      status: 'blocker',
      message: 'No checked-in Prisma migration directories were found.',
      action: 'Create and commit baseline migrations before staging DB cutover.',
      value: '0',
    });
  }

  for (const tool of missingTools) {
    issues.push({
      id: `tool:${tool.name}`,
      status: 'warning',
      message: `${tool.name} binary was not found at ${tool.path}.`,
      action: 'Install dependencies or use the package-local binary path.',
      value: '',
    });
  }

  const blockers = issues.filter((issue) => issue.status === 'blocker');
  const warnings = issues.filter((issue) => issue.status === 'warning');

  return {
    generatedAt: new Date().toISOString(),
    envFile: {
      path: envFileLoad.path,
      loaded: envFileLoad.loaded,
      keysLoaded: envFileLoad.keys.length,
    },
    status: blockers.length > 0 ? 'blocked' : warnings.length > 0 ? 'ready-with-warnings' : 'ready',
    migrationCount,
    database,
    tools: toolStatus,
    env: REQUIRED_ENV.map((rule) => ({
      key: rule.key,
      status: hasValue(process.env[rule.key]) ? 'set' : 'missing',
      value: maskValue(rule.key, process.env[rule.key] ?? ''),
    })),
    issues,
    summary: {
      blockers: blockers.length,
      warnings: warnings.length,
    },
  };
}

function toMarkdown(report) {
  const lines = [];

  lines.push('# DB Staging Preflight');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(
    `Env file: ${report.envFile.loaded ? 'loaded' : 'not found'} ${report.envFile.path} (${report.envFile.keysLoaded} keys)`,
  );
  lines.push(`Status: ${report.status}`);
  lines.push(`Prisma migrations: ${report.migrationCount}`);
  lines.push(
    `Database schema: ${report.database.checked ? report.database.status : 'skipped'} (${report.database.appliedMigrations}/${report.database.requiredMigrations} migrations applied)`,
  );
  lines.push('');
  lines.push('## Issues');
  lines.push('');

  if (report.issues.length === 0) {
    lines.push('- None.');
  } else {
    for (const issue of report.issues) {
      lines.push(`- ${issue.status.toUpperCase()} ${issue.id}: ${issue.message}`);
      if (issue.action) lines.push(`  Action: ${issue.action}`);
    }
  }

  lines.push('');
  lines.push('## Database Schema');
  lines.push('');
  if (!report.database.checked) {
    lines.push(
      '- SKIP database schema check; DATABASE_URL or API_DATA_BACKEND=db was not available.',
    );
  } else {
    lines.push(
      `- ${report.database.status.toUpperCase()} applied migrations: ${report.database.appliedMigrations}/${report.database.requiredMigrations}`,
    );
    if (report.database.missingMigrations.length > 0) {
      for (const migrationName of report.database.missingMigrations) {
        lines.push(`- BLOCKER missing migration: ${migrationName}`);
      }
    }
    for (const column of report.database.requiredColumns) {
      lines.push(
        `- ${column.present ? 'PASS' : 'BLOCKER'} column ${column.table}.${column.column}`,
      );
    }
    if (report.database.supabaseAccess.checked) {
      const dataApi = report.database.supabaseAccess.dataApi;
      lines.push(
        `- ${
          dataApi?.checked && dataApi.disabledForPublicClients ? 'PASS' : 'BLOCKER'
        } Supabase Data API public-client boundary: ${dataApi?.reason ?? 'not-checked'}`,
      );
      const principal = report.database.supabaseAccess.databasePrincipal;
      if (principal?.checked) {
        lines.push(
          `- DB principal: current_user=${principal.currentUser ?? 'unknown'}, session_user=${
            principal.sessionUser ?? 'unknown'
          }, database=${principal.databaseName ?? 'unknown'}, schema=${
            principal.schemaName ?? 'unknown'
          }, supabase_admin_default_privilege_fix=${
            principal.canAlterSupabaseAdminDefaultPrivileges
              ? 'can-apply'
              : 'needs-privileged-context'
          }`,
        );
      }
      lines.push(
        `- ${
          report.database.supabaseAccess.rlsDisabledTables.length === 0 ? 'PASS' : 'BLOCKER'
        } public table RLS enabled`,
      );
      lines.push(
        `- ${
          report.database.supabaseAccess.directRoleGrants.length === 0 ? 'PASS' : 'BLOCKER'
        } no direct anon/authenticated/PUBLIC public grants`,
      );
      lines.push(
        `- ${
          report.database.supabaseAccess.defaultRoleGrants.length === 0 ? 'PASS' : 'BLOCKER'
        } no anon/authenticated/PUBLIC default grants for future public objects`,
      );
      lines.push(
        `- ${
          report.database.supabaseAccess.securityDefinerFunctions.length === 0 ? 'PASS' : 'BLOCKER'
        } no security-definer functions in exposed public schema`,
      );
    } else {
      lines.push('- SKIP Supabase public schema RLS/grant posture check.');
    }
  }

  lines.push('');
  lines.push('## Tooling');
  lines.push('');
  for (const tool of report.tools) {
    lines.push(`- ${tool.present ? 'PASS' : 'WARN'} ${tool.name}: ${tool.path}`);
  }

  lines.push('');
  lines.push('## Required Staging Env');
  lines.push('');
  for (const entry of report.env) {
    lines.push(
      `- ${entry.status.toUpperCase()} ${entry.key}${entry.value ? `=${entry.value}` : ''}`,
    );
  }

  return `${lines.join('\n')}\n`;
}

function writeReport(report) {
  const reviewsDir = path.join(ROOT, 'reviews');
  mkdirSync(reviewsDir, { recursive: true });
  writeFileSync(
    path.join(reviewsDir, 'db-staging-preflight.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  writeFileSync(path.join(reviewsDir, 'db-staging-preflight.md'), toMarkdown(report));
}

function printText(report) {
  console.log('DB staging preflight');
  console.log(
    `- env file: ${report.envFile.loaded ? 'loaded' : 'not found'} ${report.envFile.path} (${report.envFile.keysLoaded} keys)`,
  );
  console.log(`- status: ${report.status}`);
  console.log(`- migrations: ${report.migrationCount}`);
  console.log(
    `- database schema: ${report.database.checked ? report.database.status : 'skipped'} (${report.database.appliedMigrations}/${report.database.requiredMigrations} migrations applied)`,
  );
  const principal = report.database.supabaseAccess.databasePrincipal;
  const dataApi = report.database.supabaseAccess.dataApi;
  if (report.database.supabaseAccess.checked) {
    console.log(
      `- Supabase Data API public-client boundary: ${
        dataApi?.checked && dataApi.disabledForPublicClients ? 'disabled' : 'unverified'
      } (${dataApi?.reason ?? 'not-checked'})`,
    );
  }
  if (principal?.checked) {
    console.log(
      `- DB principal: current_user=${principal.currentUser ?? 'unknown'}, session_user=${
        principal.sessionUser ?? 'unknown'
      }, supabase_admin default fix: ${
        principal.canAlterSupabaseAdminDefaultPrivileges ? 'can apply' : 'needs privileged context'
      }`,
    );
  }
  console.log(`- blockers: ${report.summary.blockers}`);
  console.log(`- warnings: ${report.summary.warnings}`);

  for (const issue of report.issues) {
    console.log(`${issue.status.toUpperCase()} ${issue.id}: ${issue.message}`);
    if (issue.action) console.log(`  Action: ${issue.action}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const envFileLoad = loadEnvFile(options.envFile);
  configurePreflightDatabaseUrl();
  const report = await buildReport(envFileLoad);

  if (options.write) {
    writeReport(report);
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (options.markdown) {
    console.log(toMarkdown(report));
  } else {
    printText(report);
  }

  if (options.strict && report.summary.blockers > 0) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  REQUIRED_ENV,
  buildSupabaseAccessPostureIssues,
  checkSupabaseDataApiPosture,
  checkEnvRule,
  checkSecretFileMode,
  classifyDatabaseSchemaError,
  compactErrorValue,
};
