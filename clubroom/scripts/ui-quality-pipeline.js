#!/usr/bin/env node
/* eslint-disable no-console */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASE_URL = 'http://localhost:8083';

function parseArgs(argv) {
  const flags = new Set(argv);
  return {
    baseUrl: process.env.UI_BASE_URL || DEFAULT_BASE_URL,
    requireFlows: flags.has('--require-flows') || process.env.UI_QUALITY_REQUIRE_FLOWS === '1',
    skipFlows: flags.has('--skip-flows') || process.env.UI_QUALITY_SKIP_FLOWS === '1',
  };
}

function formatOutput(output) {
  return output.trim().split('\n').filter(Boolean).slice(-12).join('\n');
}

function runNodeCheck(id, description, script, env = {}) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  const durationMs = Date.now() - startedAt;
  const output = formatOutput(`${result.stdout || ''}\n${result.stderr || ''}`);

  return {
    id,
    description,
    status: result.status === 0 ? 'pass' : 'fail',
    durationMs,
    output,
  };
}

async function canReach(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function printResult(result) {
  const label = result.status.toUpperCase();
  console.log(`${label} ${result.id} (${result.durationMs}ms) - ${result.description}`);
  if (result.output) {
    console.log(result.output);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const results = [];

  console.log('UI quality pipeline');
  console.log(`- baseUrl: ${options.baseUrl}`);
  console.log(`- requireFlows: ${options.requireFlows ? 'yes' : 'no'}`);

  results.push(
    runNodeCheck('ui-actions', 'dead action and native popup lint', 'scripts/lint-ui-actions.js'),
  );
  results.push(runNodeCheck('ui-layout', 'static UI layout risk audit', 'scripts/audit-ui.js'));
  results.push(
    runNodeCheck(
      'loading-routes',
      'loading route ownership and static mismatch audit',
      'scripts/loading-route-coverage-audit.js',
    ),
  );

  if (options.skipFlows) {
    results.push({
      id: 'ui-flows',
      description: 'browser flow suite',
      status: options.requireFlows ? 'fail' : 'skip',
      durationMs: 0,
      output: '--skip-flows was set.',
    });
  } else if (await canReach(options.baseUrl)) {
    results.push(
      runNodeCheck('ui-flows', 'browser flow suite', 'scripts/ui-flow-checks-50.mjs', {
        UI_BASE_URL: options.baseUrl,
      }),
    );
  } else {
    results.push({
      id: 'ui-flows',
      description: 'browser flow suite',
      status: options.requireFlows ? 'fail' : 'skip',
      durationMs: 0,
      output: `App server not reachable at ${options.baseUrl}. Start Expo web on that URL or set UI_BASE_URL.`,
    });
  }

  console.log('');
  for (const result of results) {
    printResult(result);
  }

  const failed = results.filter((result) => result.status === 'fail');
  const skipped = results.filter((result) => result.status === 'skip');

  console.log('');
  console.log(
    `Summary: ${results.length - failed.length - skipped.length} passed, ${failed.length} failed, ${skipped.length} skipped.`,
  );

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
