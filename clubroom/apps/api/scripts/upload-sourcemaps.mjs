import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');
const distDir = path.join(apiRoot, 'dist');

if (!existsSync(distDir)) {
  console.error('Build output not found. Run `npm --prefix apps/api run build` before uploading sourcemaps.');
  process.exit(1);
}

const requiredEnv = ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_RELEASE'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required Sentry environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const sentryCli = process.env.SENTRY_CLI_EXECUTABLE || require.resolve('@sentry/cli/bin/sentry-cli');
const sentryEnv = {
  ...process.env,
  SENTRY_URL: process.env.SENTRY_URL || 'https://sentry.io/',
};

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
