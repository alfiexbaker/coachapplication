#!/usr/bin/env node
/* eslint-disable no-console */

const { existsSync, readFileSync } = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ENV_FILE = '.env.staging.local';
const DEFAULT_API_URL = 'http://127.0.0.1:4000';

function parseArgs(argv) {
  const envFileArg = argv.find((arg) => arg.startsWith('--staging-env-file='));
  const apiUrlArg = argv.find((arg) => arg.startsWith('--api-url='));
  return {
    json: argv.includes('--json'),
    requireReady: argv.includes('--require-ready'),
    envFile: envFileArg ? envFileArg.slice('--staging-env-file='.length) : DEFAULT_ENV_FILE,
    apiUrl: apiUrlArg ? apiUrlArg.slice('--api-url='.length) : null,
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

function isApiMode() {
  return String(process.env.EXPO_PUBLIC_USE_MOCK ?? 'true').trim().toLowerCase() === 'false';
}

function normalizeBaseUrl(rawUrl) {
  const url = new URL(rawUrl || DEFAULT_API_URL);
  if (url.hostname === 'localhost') {
    url.hostname = '127.0.0.1';
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

async function fetchReady(apiBaseUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${apiBaseUrl}/v1/ready`, {
      signal: controller.signal,
      headers: {
        accept: 'application/json',
      },
    });
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { raw: text.slice(0, 500) };
    }

    return {
      reachable: true,
      httpStatus: response.status,
      readinessStatus: payload?.status ?? null,
      checks: payload?.checks ?? null,
      issueCodes: Array.isArray(payload?.issues)
        ? payload.issues.map((issue) => issue.code ?? issue.check).filter(Boolean)
        : [],
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function printText(report) {
  console.log('API-mode runtime smoke');
  console.log(
    `- env file: ${report.envFile.loaded ? 'loaded' : 'not found'} ${report.envFile.path} (${report.envFile.keysLoaded} keys)`,
  );
  console.log(`- api mode: ${report.apiMode ? 'yes' : 'no'}`);
  console.log(`- api url: ${report.apiBaseUrl}`);
  if (report.ready.skipped) {
    console.log(`- skipped: ${report.ready.reason}`);
    console.log(`- result: ${report.status}`);
    return;
  }
  console.log(`- reachable: ${report.ready.reachable ? 'yes' : 'no'}`);
  if (report.ready.reachable) {
    console.log(`- http status: ${report.ready.httpStatus}`);
    console.log(`- readiness: ${report.ready.readinessStatus ?? 'unknown'}`);
    const issueCodes = report.ready.issueCodes ?? [];
    if (issueCodes.length > 0) {
      console.log(`- issues: ${issueCodes.join(', ')}`);
    }
  } else if (report.ready.error) {
    console.log(`- error: ${report.ready.error}`);
  }
  console.log(`- result: ${report.status}`);
  if (report.action) {
    console.log(`- action: ${report.action}`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const envFile = loadEnvFile(options.envFile);
  const apiMode = isApiMode();
  const apiBaseUrl = normalizeBaseUrl(
    options.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? process.env.API_URL ?? DEFAULT_API_URL,
  );

  const ready = apiMode
    ? await fetchReady(apiBaseUrl)
    : { reachable: true, skipped: true, reason: 'EXPO_PUBLIC_USE_MOCK is not false' };

  const status = !apiMode
    ? 'skipped'
    : !ready.reachable
      ? 'fail'
      : options.requireReady && ready.readinessStatus !== 'ready'
        ? 'fail'
        : 'pass';
  const action =
    status === 'fail' && !ready.reachable
      ? `Start the Fastify API before API-mode Expo: npm --prefix apps/api run dev`
      : status === 'fail'
        ? 'Fix /v1/ready issues before treating staging runtime as release-ready.'
        : null;

  const report = {
    generatedAt: new Date().toISOString(),
    envFile: {
      path: envFile.path,
      loaded: envFile.loaded,
      keysLoaded: envFile.keys.length,
    },
    apiMode,
    apiBaseUrl,
    requireReady: options.requireReady,
    ready,
    status,
    action,
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printText(report);
  }

  if (status === 'fail') {
    process.exitCode = 1;
  }
}

void main();
