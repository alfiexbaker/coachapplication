#!/usr/bin/env node
/* eslint-disable no-console */

const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REVIEWS_DIR = path.join(ROOT, 'reviews');
const STAGING_ENV_PATH = path.join(ROOT, '.env.staging.local');
const DEFAULT_UI_BASE_URL = 'http://localhost:8083';
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:4000';
const DEFAULT_API_RATE_LIMIT_MAX = '1200';
const DEFAULT_DATABASE_CONNECTION_LIMIT = '5';
const DEFAULT_DATABASE_POOL_TIMEOUT = '30';
const DEFAULT_UI_FLOW_CHUNK_SIZE = '10';
const DEFAULT_UI_FLOW_PAUSE_MS = '1200';

const ADVISORY_GATES = [];

const REQUIRED_GATES = [
  {
    id: 'worktree-strict',
    description: 'Version-control hygiene gate for product, API, test, docs, and generated source',
    command: 'npm',
    args: ['run', 'audit:worktree:strict'],
  },
  {
    id: 'verify-slice-full',
    description: 'Full static, app, API, and baseline quality gate',
    command: 'npm',
    args: ['run', 'verify:slice:full'],
  },
  {
    id: 'agentic-readiness',
    description: 'DB staging, route authority, and UI static readiness mapper',
    command: 'npm',
    args: ['run', 'audit:agentic'],
  },
  {
    id: 'db-stage-strict',
    description: 'Strict staging database/env preflight',
    command: 'npm',
    args: ['run', 'audit:db:stage:strict'],
  },
  {
    id: 'password-reset-webhook-smoke',
    description: 'Configured password reset email delivery provider accepts the release payload',
    command: 'npm',
    args: ['run', 'smoke:password-reset-webhook'],
  },
  {
    id: 'api-mode-strict-smoke',
    description: 'API-mode readiness smoke against the configured Fastify API',
    command: 'npm',
    args: ['run', 'smoke:api-mode:strict'],
    needsApiServer: true,
  },
  {
    id: 'staging-smoke',
    description: 'DB-backed staging product smoke',
    command: 'npm',
    args: ['run', 'smoke:staging'],
  },
  {
    id: 'ui-flows',
    description: 'Launch UI browser flow suite',
    command: 'npm',
    args: ['run', 'ui:flows:run'],
    needsApiServer: true,
    needsWebServer: true,
  },
];

const DEFERRED_ITEMS = [
  {
    id: 'live-payment-provider-cutover',
    status: 'deferred',
    note: 'Live payment provider integration is intentionally excluded from the go-live blocker set. Money-state safety, cancellation/refund hard walls, and simulated/manual payment honesty remain launch gates.',
  },
];

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    noApiServer: argv.includes('--no-api-server'),
    noWebServer: argv.includes('--no-web-server'),
    apiBaseUrl:
      argv
        .find((arg) => arg.startsWith('--api-base-url='))
        ?.split('=')
        .slice(1)
        .join('=') ||
      process.env.API_URL ||
      process.env.EXPO_PUBLIC_API_URL ||
      DEFAULT_API_BASE_URL,
    uiBaseUrl:
      argv
        .find((arg) => arg.startsWith('--ui-base-url='))
        ?.split('=')
        .slice(1)
        .join('=') ||
      process.env.UI_BASE_URL ||
      DEFAULT_UI_BASE_URL,
  };
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function compact(output) {
  return output.trim().split('\n').filter(Boolean).slice(-40).join('\n');
}

function appendOutput(output, note) {
  return [output, note].filter(Boolean).join('\n');
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

let stagingEnvCache = null;
function readStagingEnv() {
  if (stagingEnvCache) {
    return stagingEnvCache;
  }

  const values = {};
  try {
    const content = readFileSync(STAGING_ENV_PATH, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) continue;
      values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // The API process still reports missing/invalid env through its normal startup path.
  }

  stagingEnvCache = values;
  return values;
}

function withLaunchDatabaseUrl(env) {
  const rawDatabaseUrl = env.DATABASE_URL ?? readStagingEnv().DATABASE_URL;
  if (!rawDatabaseUrl) {
    return env;
  }

  try {
    const databaseUrl = new URL(rawDatabaseUrl);
    if (!databaseUrl.searchParams.has('connection_limit')) {
      databaseUrl.searchParams.set(
        'connection_limit',
        env.LAUNCH_READINESS_DATABASE_CONNECTION_LIMIT ?? DEFAULT_DATABASE_CONNECTION_LIMIT,
      );
    }
    if (!databaseUrl.searchParams.has('pool_timeout')) {
      databaseUrl.searchParams.set(
        'pool_timeout',
        env.LAUNCH_READINESS_DATABASE_POOL_TIMEOUT ?? DEFAULT_DATABASE_POOL_TIMEOUT,
      );
    }
    return {
      ...env,
      DATABASE_URL: databaseUrl.toString(),
      PRISMA_CLIENT_ENGINE_TYPE: env.PRISMA_CLIENT_ENGINE_TYPE ?? 'binary',
    };
  } catch {
    return env;
  }
}

function runGate(gate, dryRun, extraEnv = {}) {
  if (dryRun) {
    return {
      ...gate,
      status: 'skip',
      durationMs: 0,
      output: 'Dry run: command was not executed.',
      fullOutput: 'Dry run: command was not executed.',
    };
  }

  const startedAt = Date.now();
  const result = spawnSync(gate.command, gate.args, {
    cwd: ROOT,
    env: {
      ...process.env,
      ...extraEnv,
    },
    encoding: 'utf8',
    maxBuffer: 40 * 1024 * 1024,
    shell: false,
  });
  const durationMs = Date.now() - startedAt;
  const rawOutput = `${result.stdout || ''}\n${result.stderr || ''}`;

  return {
    ...gate,
    status: result.status === 0 ? 'pass' : 'fail',
    exitCode: result.status,
    durationMs,
    output: compact(rawOutput),
    fullOutput: rawOutput.trim(),
  };
}

async function canReach(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.status < 500;
  } catch {
    return false;
  }
}

async function canReachApi(apiBaseUrl) {
  const probe = await probeApi(apiBaseUrl);
  return probe.ok;
}

async function probeApi(apiBaseUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/v1/ready`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        accept: 'application/json',
      },
    });
    clearTimeout(timeout);
    return {
      ok: response.status > 0,
      rateLimitMax: Number.parseInt(response.headers.get('ratelimit-limit') ?? '', 10) || null,
    };
  } catch {
    return { ok: false, rateLimitMax: null };
  }
}

function parsePort(url) {
  try {
    return new URL(url).port || (new URL(url).protocol === 'https:' ? '443' : '80');
  } catch {
    return '8083';
  }
}

function parseHostname(url, fallback = '127.0.0.1') {
  try {
    return new URL(url).hostname || fallback;
  } catch {
    return fallback;
  }
}

function startExpoWebServer(uiBaseUrl, apiBaseUrl) {
  const port = parsePort(uiBaseUrl);
  const logs = [];
  const child = spawn('npm', ['run', 'web', '--', '--port', port], {
    cwd: ROOT,
    env: {
      ...process.env,
      BROWSER: 'none',
      CI: '1',
      EXPO_NO_TELEMETRY: '1',
      EXPO_PUBLIC_API_URL: apiBaseUrl,
      API_URL: apiBaseUrl,
      UI_BASE_URL: uiBaseUrl,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const collect = (chunk) => {
    const text = chunk.toString();
    logs.push(text);
    if (logs.length > 60) logs.splice(0, logs.length - 60);
  };

  child.stdout.on('data', collect);
  child.stderr.on('data', collect);

  return { child, logs };
}

function startApiServer(apiBaseUrl) {
  const logs = [];
  const apiPort = parsePort(apiBaseUrl);
  const apiHost = parseHostname(apiBaseUrl);
  const env = withLaunchDatabaseUrl({
    ...process.env,
    API_HOST: process.env.API_HOST ?? apiHost,
    API_PORT: process.env.API_PORT ?? apiPort,
    API_URL: apiBaseUrl,
    EXPO_PUBLIC_API_URL: apiBaseUrl,
    API_RATE_LIMIT_MAX: process.env.API_RATE_LIMIT_MAX ?? DEFAULT_API_RATE_LIMIT_MAX,
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'error',
    CI: '1',
  });
  const child = spawn('npm', ['run', 'api:dev:staging'], {
    cwd: ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const collect = (chunk) => {
    const text = chunk.toString();
    logs.push(text);
    if (logs.length > 80) logs.splice(0, logs.length - 80);
  };

  child.stdout.on('data', collect);
  child.stderr.on('data', collect);

  return { child, logs };
}

async function waitForWebServer(uiBaseUrl, managedServer) {
  const timeoutMs = Number(process.env.LAUNCH_READINESS_WEB_TIMEOUT_MS || 120000);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canReach(uiBaseUrl)) {
      return { ok: true, detail: `UI server reachable at ${uiBaseUrl}.` };
    }

    if (managedServer.child.exitCode !== null) {
      return {
        ok: false,
        detail: `Managed Expo web server exited before ${uiBaseUrl} became reachable.\n${managedServer.logs.join('')}`,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return {
    ok: false,
    detail: `Timed out waiting ${timeoutMs}ms for Expo web at ${uiBaseUrl}.\n${managedServer.logs.join('')}`,
  };
}

async function waitForApiServer(apiBaseUrl, managedServer) {
  const timeoutMs = Number(process.env.LAUNCH_READINESS_API_TIMEOUT_MS || 120000);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await canReachApi(apiBaseUrl)) {
      return { ok: true, detail: `API server reachable at ${apiBaseUrl}/v1/ready.` };
    }

    if (managedServer.child.exitCode !== null) {
      return {
        ok: false,
        detail: `Managed staging API server exited before ${apiBaseUrl}/v1/ready became reachable.\n${managedServer.logs.join('')}`,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return {
    ok: false,
    detail: `Timed out waiting ${timeoutMs}ms for staging API at ${apiBaseUrl}/v1/ready.\n${managedServer.logs.join('')}`,
  };
}

async function stopManagedServer(managedServer) {
  if (!managedServer || managedServer.child.exitCode !== null) return;

  managedServer.child.kill('SIGTERM');
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (managedServer.child.exitCode === null) managedServer.child.kill('SIGKILL');
      resolve();
    }, 5000);

    managedServer.child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function prepareApiServer(gate, options) {
  if (!gate.needsApiServer || options.dryRun || options.noApiServer) {
    return {
      managedServer: null,
      setupOutput:
        gate.needsApiServer && options.noApiServer ? 'Managed API server startup disabled.' : '',
      setupFailed: null,
    };
  }

  const probe = await probeApi(options.apiBaseUrl);
  if (probe.ok) {
    const expectedRateLimit = parsePositiveInt(
      process.env.API_RATE_LIMIT_MAX,
      Number(DEFAULT_API_RATE_LIMIT_MAX),
    );
    if (probe.rateLimitMax !== null && probe.rateLimitMax < expectedRateLimit) {
      const detail = [
        `Existing API server at ${options.apiBaseUrl} reports ratelimit-limit=${probe.rateLimitMax}.`,
        `Launch UI flows require API_RATE_LIMIT_MAX>=${expectedRateLimit}.`,
        'Stop the stale API server or rerun launch readiness with --api-base-url on a free port.',
      ].join('\n');
      return {
        managedServer: null,
        setupOutput: detail,
        setupFailed: {
          ...gate,
          status: 'fail',
          exitCode: 1,
          durationMs: 0,
          output: compact(detail),
          fullOutput: detail,
        },
      };
    }

    return {
      managedServer: null,
      setupOutput: `Using existing API server at ${options.apiBaseUrl}.`,
      setupFailed: null,
    };
  }

  const managedServer = startApiServer(options.apiBaseUrl);
  const readiness = await waitForApiServer(options.apiBaseUrl, managedServer);

  if (!readiness.ok) {
    await stopManagedServer(managedServer);
    return {
      managedServer: null,
      setupOutput: readiness.detail,
      setupFailed: {
        ...gate,
        status: 'fail',
        exitCode: 1,
        durationMs: 0,
        output: compact(readiness.detail),
        fullOutput: readiness.detail,
      },
    };
  }

  return {
    managedServer,
    setupOutput: readiness.detail,
    setupFailed: null,
  };
}

async function prepareWebServer(gate, options) {
  if (!gate.needsWebServer || options.dryRun || options.noWebServer) {
    return {
      managedServer: null,
      setupOutput:
        gate.needsWebServer && options.noWebServer ? 'Managed UI server startup disabled.' : '',
      setupFailed: null,
    };
  }

  if (await canReach(options.uiBaseUrl)) {
    return {
      managedServer: null,
      setupOutput: `Using existing UI server at ${options.uiBaseUrl}.`,
      setupFailed: null,
    };
  }

  const managedServer = startExpoWebServer(options.uiBaseUrl, options.apiBaseUrl);
  const readiness = await waitForWebServer(options.uiBaseUrl, managedServer);

  if (!readiness.ok) {
    await stopManagedServer(managedServer);
    return {
      managedServer: null,
      setupOutput: readiness.detail,
      setupFailed: {
        ...gate,
        status: 'fail',
        exitCode: 1,
        durationMs: 0,
        output: compact(readiness.detail),
        fullOutput: readiness.detail,
      },
    };
  }

  return {
    managedServer,
    setupOutput: readiness.detail,
    setupFailed: null,
  };
}

async function runRequiredGate(gate, options) {
  const preparedApi = await prepareApiServer(gate, options);
  if (preparedApi.setupFailed) {
    return preparedApi.setupFailed;
  }

  const preparedWeb = await prepareWebServer(gate, options);
  if (preparedWeb.setupFailed) {
    await stopManagedServer(preparedApi.managedServer);
    return preparedWeb.setupFailed;
  }

  try {
    const result = runGate(gate, options.dryRun, {
      API_URL: options.apiBaseUrl,
      EXPO_PUBLIC_API_URL: options.apiBaseUrl,
      UI_BASE_URL: options.uiBaseUrl,
      ...(gate.id === 'ui-flows'
        ? {
            UI_FLOW_CHUNK_SIZE: process.env.UI_FLOW_CHUNK_SIZE ?? DEFAULT_UI_FLOW_CHUNK_SIZE,
            UI_FLOW_PAUSE_MS: process.env.UI_FLOW_PAUSE_MS ?? DEFAULT_UI_FLOW_PAUSE_MS,
            UI_FLOW_RETRIES: process.env.UI_FLOW_RETRIES ?? '1',
          }
        : {}),
    });

    const setupOutput = [preparedApi.setupOutput, preparedWeb.setupOutput]
      .filter(Boolean)
      .join('\n');
    if (setupOutput) {
      result.output = compact(appendOutput(setupOutput, result.fullOutput || result.output));
      result.fullOutput = appendOutput(setupOutput, result.fullOutput);
    }

    return result;
  } finally {
    await stopManagedServer(preparedWeb.managedServer);
    await stopManagedServer(preparedApi.managedServer);
  }
}

function toMarkdown(report) {
  const lines = [];

  lines.push('# Launch Readiness Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Status: ${report.status}`);
  lines.push(`Required gates: ${report.summary.passed} passed, ${report.summary.failed} failed`);
  lines.push(
    `Advisory gates: ${report.summary.advisoryPassed} passed, ${report.summary.advisoryFailed} failed`,
  );
  lines.push(`API base URL: ${report.apiBaseUrl}`);
  lines.push(`UI base URL: ${report.uiBaseUrl}`);
  lines.push('');
  lines.push('## Deferred Items');
  lines.push('');
  for (const item of report.deferredItems) {
    lines.push(`- ${item.id}: ${item.note}`);
  }
  lines.push('');
  lines.push('## Advisory Gates');
  lines.push('');

  for (const gate of report.advisoryGates) {
    lines.push(`### ${gate.id}`);
    lines.push('');
    lines.push(`- Status: ${gate.status}`);
    lines.push(`- Command: \`${[gate.command, ...gate.args].join(' ')}\``);
    lines.push(`- Duration: ${gate.durationMs}ms`);
    if (gate.output) {
      lines.push('');
      lines.push('```text');
      lines.push(gate.output);
      lines.push('```');
    }
    lines.push('');
  }

  lines.push('## Required Gates');
  lines.push('');

  for (const gate of report.gates) {
    lines.push(`### ${gate.id}`);
    lines.push('');
    lines.push(`- Status: ${gate.status}`);
    lines.push(`- Command: \`${[gate.command, ...gate.args].join(' ')}\``);
    lines.push(`- Duration: ${gate.durationMs}ms`);
    if (gate.output) {
      lines.push('');
      lines.push('```text');
      lines.push(gate.output);
      lines.push('```');
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const advisoryResults = [];
  const requiredResults = [];

  console.log('Launch readiness runner');
  console.log(`- dryRun: ${options.dryRun ? 'yes' : 'no'}`);
  console.log('- live payment provider cutover: deferred');
  console.log(`- api base url: ${options.apiBaseUrl}`);
  console.log(`- ui base url: ${options.uiBaseUrl}`);
  console.log('');

  for (const gate of ADVISORY_GATES) {
    console.log(`ADVISORY ${gate.id} - ${gate.description}`);
    const result = runGate(gate, options.dryRun);
    advisoryResults.push(result);
    console.log(`${result.status.toUpperCase()} ${gate.id} (${result.durationMs}ms)`);
    if (result.output) {
      console.log(result.output);
    }
    console.log('');
  }

  for (const gate of REQUIRED_GATES) {
    console.log(`RUN ${gate.id} - ${gate.description}`);
    const result = await runRequiredGate(gate, options);
    requiredResults.push(result);
    console.log(`${result.status.toUpperCase()} ${gate.id} (${result.durationMs}ms)`);
    if (result.output) {
      console.log(result.output);
    }
    console.log('');
  }

  const failed = requiredResults.filter((result) => result.status === 'fail');
  const passed = requiredResults.filter((result) => result.status === 'pass');
  const skipped = requiredResults.filter((result) => result.status === 'skip');
  const advisoryFailed = advisoryResults.filter((result) => result.status === 'fail');
  const advisoryPassed = advisoryResults.filter((result) => result.status === 'pass');
  const report = {
    generatedAt,
    status:
      failed.length === 0 && skipped.length === 0
        ? 'ready'
        : failed.length > 0
          ? 'blocked'
          : 'dry-run',
    apiBaseUrl: options.apiBaseUrl,
    uiBaseUrl: options.uiBaseUrl,
    deferredItems: DEFERRED_ITEMS,
    summary: {
      passed: passed.length,
      failed: failed.length,
      skipped: skipped.length,
      advisoryPassed: advisoryPassed.length,
      advisoryFailed: advisoryFailed.length,
    },
    advisoryGates: advisoryResults,
    gates: requiredResults,
  };

  mkdirSync(REVIEWS_DIR, { recursive: true });
  const stamp = timestamp();
  const jsonPath = path.join(REVIEWS_DIR, `launch-readiness-${stamp}.json`);
  const markdownPath = path.join(REVIEWS_DIR, `launch-readiness-${stamp}.md`);
  const latestJsonPath = path.join(REVIEWS_DIR, 'launch-readiness.json');
  const latestMarkdownPath = path.join(REVIEWS_DIR, 'launch-readiness.md');
  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  const markdown = toMarkdown(report);
  writeFileSync(markdownPath, markdown);
  writeFileSync(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(latestMarkdownPath, markdown);

  console.log('Launch readiness summary');
  console.log(`- status: ${report.status}`);
  console.log(`- passed: ${passed.length}`);
  console.log(`- failed: ${failed.length}`);
  console.log(`- skipped: ${skipped.length}`);
  console.log(`- advisory failed: ${advisoryFailed.length}`);
  console.log(`- report: ${path.relative(ROOT, markdownPath)}`);
  console.log(`- json: ${path.relative(ROOT, jsonPath)}`);
  console.log(`- latest report: ${path.relative(ROOT, latestMarkdownPath)}`);

  if (failed.length > 0 || (!options.dryRun && skipped.length > 0)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
