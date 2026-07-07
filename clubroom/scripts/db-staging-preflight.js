#!/usr/bin/env node
/* eslint-disable no-console */

const { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PAYMENT_SIMULATION_SECRET = 'clubroom-simulated-payments-dev-secret';
const DEFAULT_ENV_FILE = '.env.staging.local';
const DEFAULT_DATABASE_CONNECTION_LIMIT = '1';
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

const FORBIDDEN_ENV_VALUES = [
  {
    key: 'API_PASSWORD_RESET_DEV_OUTBOX',
    value: 'true',
    severity: 'blocker',
    message: 'Password reset dev outbox must not be enabled for release-style staging.',
    action: 'Set API_PASSWORD_RESET_DEV_OUTBOX=false or leave it unset.',
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

function checkForbiddenEnvValue(rule) {
  const value = String(process.env[rule.key] ?? '').trim().toLowerCase();
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
    rlsDisabledTables: [],
    directRoleGrants: [],
  };
}

function buildSupabaseAccessPostureIssues(posture) {
  if (!posture.checked) {
    return [];
  }

  const issues = [];
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
      action:
        'Revoke direct anon/authenticated privileges and keep product data access behind the Fastify /v1 API unless a reviewed RLS policy explicitly allows it.',
      value: `${grant.grantee} ${grant.privilegeType} ${grant.objectType} ${grant.schemaName}.${grant.objectName}`,
    });
  }

  return issues;
}

async function checkSupabaseAccessPosture(prisma) {
  const rlsRows = await prisma.$queryRaw`
    SELECT schemaname AS "schemaName", tablename AS "tableName"
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity IS NOT TRUE
    ORDER BY tablename
  `;
  const grantRows = await prisma.$queryRaw`
    SELECT 'table' AS "objectType",
           table_schema AS "schemaName",
           table_name AS "objectName",
           grantee,
           privilege_type AS "privilegeType"
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
    UNION ALL
    SELECT lower(object_type) AS "objectType",
           object_schema AS "schemaName",
           object_name AS "objectName",
           grantee,
           privilege_type AS "privilegeType"
    FROM information_schema.role_usage_grants
    WHERE object_schema = 'public'
      AND object_type = 'SEQUENCE'
      AND grantee IN ('anon', 'authenticated')
    UNION ALL
    SELECT 'routine' AS "objectType",
           routine_schema AS "schemaName",
           routine_name AS "objectName",
           grantee,
           privilege_type AS "privilegeType"
    FROM information_schema.role_routine_grants
    WHERE routine_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
    ORDER BY "objectType", "schemaName", "objectName", grantee, "privilegeType"
  `;

  return {
    checked: true,
    rlsDisabledTables: rlsRows.filter(
      (row) => !RLS_EXEMPT_PUBLIC_TABLES.has(String(row.tableName ?? '')),
    ),
    directRoleGrants: grantRows,
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
      appliedRows
        .map((row) => String(row.migrationName ?? '').trim())
        .filter(Boolean),
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
        (column) => column.table === requiredColumn.table && column.column === requiredColumn.column,
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
      action: 'Run Prisma migrate deploy against the staging DATABASE_URL before release rehearsal.',
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
    lines.push('- SKIP database schema check; DATABASE_URL or API_DATA_BACKEND=db was not available.');
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
      lines.push(
        `- ${
          report.database.supabaseAccess.rlsDisabledTables.length === 0 ? 'PASS' : 'BLOCKER'
        } public table RLS enabled`,
      );
      lines.push(
        `- ${
          report.database.supabaseAccess.directRoleGrants.length === 0 ? 'PASS' : 'BLOCKER'
        } no direct anon/authenticated public grants`,
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
  buildSupabaseAccessPostureIssues,
  classifyDatabaseSchemaError,
  compactErrorValue,
};
