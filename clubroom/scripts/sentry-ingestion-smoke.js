#!/usr/bin/env node
/* global __dirname */

const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ENV_FILE = '.env.staging.local';
const DEFAULT_TIMEOUT_MS = 10000;

function parseArgs(argv) {
  const envFileArg = argv.find((arg) => arg.startsWith('--staging-env-file='));
  const timeoutArg = argv.find((arg) => arg.startsWith('--timeout-ms='));
  const timeoutMs = Number.parseInt(timeoutArg?.slice('--timeout-ms='.length) ?? '', 10);

  return {
    allowProduction: argv.includes('--allow-production'),
    envFile: envFileArg ? envFileArg.slice('--staging-env-file='.length) : DEFAULT_ENV_FILE,
    json: argv.includes('--json'),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS,
  };
}

function loadEnvFile(relativeOrAbsolutePath) {
  const absolutePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(ROOT, relativeOrAbsolutePath);

  if (!existsSync(absolutePath)) return false;

  for (const line of readFileSync(absolutePath, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }

  return true;
}

function hasValue(value) {
  return Boolean(String(value ?? '').trim());
}

function boolish(value) {
  return ['1', 'true', 'yes', 'on'].includes(
    String(value ?? '')
      .trim()
      .toLowerCase(),
  );
}

function isProductionEnvironment(environment) {
  return ['prod', 'production'].includes(environment.trim().toLowerCase());
}

function validateDsn(dsn) {
  let parsed;
  try {
    parsed = new URL(dsn);
  } catch {
    throw new Error('SENTRY_DSN must be a valid URL');
  }

  if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname || !parsed.username) {
    throw new Error('SENTRY_DSN is not a valid Sentry DSN');
  }
}

function safeErrorMessage(error, secrets) {
  let message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  for (const secret of secrets) {
    if (hasValue(secret)) message = message.split(secret).join('[redacted]');
  }
  return message;
}

function waitForSendResult(client, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Timed out waiting for Sentry ingestion response')),
      timeoutMs,
    );

    client.on('afterSendEvent', (event, response) => {
      clearTimeout(timeout);
      resolve({ eventId: event.event_id, statusCode: response.statusCode ?? null });
    });
  });
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const envFileLoaded = loadEnvFile(options.envFile);
  const dsn = String(process.env.SENTRY_DSN ?? '').trim();
  const environment = String(process.env.SENTRY_ENVIRONMENT ?? '').trim();
  const release = String(process.env.SENTRY_RELEASE ?? '').trim();

  if (!hasValue(dsn)) throw new Error('SENTRY_DSN is required');
  if (!hasValue(environment)) throw new Error('SENTRY_ENVIRONMENT is required');
  if (!hasValue(release)) throw new Error('SENTRY_RELEASE is required');
  validateDsn(dsn);

  if (
    isProductionEnvironment(environment) &&
    !options.allowProduction &&
    !boolish(process.env.SENTRY_SMOKE_ALLOW_PRODUCTION)
  ) {
    throw new Error(
      'Production Sentry smoke refused; pass --allow-production or set SENTRY_SMOKE_ALLOW_PRODUCTION=1 explicitly',
    );
  }

  const Sentry = await import('@sentry/node');
  Sentry.init({
    dsn,
    environment,
    release,
    sampleRate: 1,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    initialScope: {
      tags: {
        component: 'api',
        service: 'clubroom-api',
        smoke_test: 'sentry_ingestion',
      },
    },
  });

  const client = Sentry.getClient();
  if (!client) throw new Error('Sentry client did not initialize');

  const sendResultPromise = waitForSendResult(client, options.timeoutMs);
  const eventId = Sentry.captureMessage('Clubroom API Sentry ingestion smoke', 'info');
  const [flushed, sendResult] = await Promise.all([
    Sentry.flush(options.timeoutMs),
    sendResultPromise,
  ]);
  const eventIdMatches = sendResult.eventId === eventId;
  const accepted =
    flushed &&
    eventIdMatches &&
    sendResult.statusCode !== null &&
    sendResult.statusCode >= 200 &&
    sendResult.statusCode < 300;
  const result = {
    accepted,
    environment,
    envFileLoaded,
    eventId,
    eventIdMatches,
    eventIdPresent: /^[a-f0-9]{32}$/i.test(eventId),
    flushed,
    releaseConfigured: true,
    statusCode: sendResult.statusCode,
  };

  if (options.json) {
    console.log(JSON.stringify(result));
  } else {
    console.log(`Sentry ingestion smoke: ${accepted && result.eventIdPresent ? 'PASS' : 'FAIL'}`);
  }

  if (!accepted || !result.eventIdPresent) process.exitCode = 1;
}

run().catch((error) => {
  const message = safeErrorMessage(error, [process.env.SENTRY_DSN, process.env.SENTRY_AUTH_TOKEN]);
  console.error(JSON.stringify({ accepted: false, error: message }));
  process.exitCode = 1;
});
