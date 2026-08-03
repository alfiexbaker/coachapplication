import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(apiRoot, '../..');
const distDir = path.join(apiRoot, 'dist');
const LOCAL_SENTRY_ENV_KEYS = new Set([
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG',
  'SENTRY_API_PROJECT',
  'SENTRY_PROJECT',
  'SENTRY_RELEASE',
  'SENTRY_URL',
]);

const inheritedEnvKeys = new Set(
  Object.entries(process.env)
    .filter(([, value]) => Boolean(value?.trim()))
    .map(([key]) => key),
);

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (
      !match ||
      !LOCAL_SENTRY_ENV_KEYS.has(match[1]) ||
      inheritedEnvKeys.has(match[1])
    ) {
      continue;
    }

    const value = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    if (value) process.env[match[1]] = value;
  }
}

loadEnvFile(path.join(repoRoot, '.env.staging.local'));
loadEnvFile(path.join(repoRoot, '.env.local'));

if (!existsSync(distDir)) {
  console.error('Build output not found. Run `npm --prefix apps/api run build` before uploading sourcemaps.');
  process.exit(1);
}

const sentryProject = process.env.SENTRY_API_PROJECT || process.env.SENTRY_PROJECT;
const requiredEnv = ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_RELEASE'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (!sentryProject) missingEnv.push('SENTRY_API_PROJECT (or SENTRY_PROJECT)');

if (missingEnv.length > 0) {
  console.error(`Missing required Sentry environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const sentryCli = process.env.SENTRY_CLI_EXECUTABLE || require.resolve('@sentry/cli/bin/sentry-cli');
const sentryEnv = { ...process.env, SENTRY_PROJECT: sentryProject };

function runSentryCli(args) {
  const result = spawnSync(sentryCli, args, {
    cwd: apiRoot,
    env: sentryEnv,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error('Failed to run sentry-cli.', result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runSentryCli(['sourcemaps', 'inject', distDir]);
runSentryCli([
  'sourcemaps',
  'upload',
  '--release',
  process.env.SENTRY_RELEASE,
  '--url-prefix',
  'app:///',
  '--strip-prefix',
  apiRoot,
  '--validate',
  '--wait',
  distDir,
]);
