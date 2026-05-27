#!/usr/bin/env node
/* eslint-disable no-console */

const { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PAYMENT_SIMULATION_SECRET = 'clubroom-simulated-payments-dev-secret';
const DEFAULT_ENV_FILE = '.env.staging.local';

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

function getMigrationCount() {
  const migrationsDir = path.join(ROOT, 'packages/db/prisma/migrations');
  if (!existsSync(migrationsDir)) return 0;

  return readdirSync(migrationsDir, { withFileTypes: true }).filter((entry) => {
    return entry.isDirectory() && /^\d{14,}/.test(entry.name);
  }).length;
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

function buildReport(envFileLoad) {
  const issues = [...REQUIRED_ENV.flatMap(checkEnvRule), ...REQUIRED_FILES.flatMap(checkFileRule)];
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
  console.log(`- blockers: ${report.summary.blockers}`);
  console.log(`- warnings: ${report.summary.warnings}`);

  for (const issue of report.issues) {
    console.log(`${issue.status.toUpperCase()} ${issue.id}: ${issue.message}`);
    if (issue.action) console.log(`  Action: ${issue.action}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const envFileLoad = loadEnvFile(options.envFile);
  const report = buildReport(envFileLoad);

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

main();
