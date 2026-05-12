#!/usr/bin/env node
/* eslint-disable no-console */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const flags = new Set(argv);
  return {
    app: flags.has('--app') || flags.has('--full'),
    api: flags.has('--api') || flags.has('--full'),
    ui: flags.has('--ui') || flags.has('--full'),
    flows: flags.has('--flows'),
    strictAgentic: flags.has('--strict-agentic'),
  };
}

function compactOutput(output) {
  return output.trim().split('\n').filter(Boolean).slice(-20).join('\n');
}

function runCheck(id, description, command, args) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    shell: false,
  });
  const durationMs = Date.now() - startedAt;
  const output = compactOutput(`${result.stdout || ''}\n${result.stderr || ''}`);

  return {
    id,
    description,
    durationMs,
    status: result.status === 0 ? 'pass' : 'fail',
    output,
  };
}

function npmCheck(id, description, script, extraArgs = []) {
  return runCheck(id, description, 'npm', ['run', script, '--', ...extraArgs]);
}

function printResult(result) {
  console.log(
    `${result.status.toUpperCase()} ${result.id} (${result.durationMs}ms) - ${result.description}`,
  );
  if (result.output) {
    console.log(result.output);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const checks = [];

  checks.push(npmCheck('audit:api-boundaries', 'frontend/API authority boundary ratchet', 'audit:api-boundaries'));
  checks.push(npmCheck('audit:alerts', 'native alert usage guardrail', 'audit:alerts'));
  checks.push(npmCheck('lint:ui-actions', 'dead action and icon-only action guardrail', 'lint:ui-actions'));
  checks.push(
    runCheck(
      'audit:agentic',
      'agentic readiness mapper without duplicated UI static checks',
      process.execPath,
      [
        'scripts/agentic-readiness-pipeline.js',
        '--skip-ui',
        ...(options.strictAgentic ? ['--strict'] : []),
      ],
    ),
  );

  if (options.ui) {
    checks.push(
      runCheck(
        'audit:ui:quality',
        options.flows ? 'UI quality pipeline with required browser flows' : 'UI quality pipeline static pass',
        process.execPath,
        [
          'scripts/ui-quality-pipeline.js',
          ...(options.flows ? ['--require-flows'] : ['--skip-flows']),
        ],
      ),
    );
  }

  if (options.app) {
    checks.push(npmCheck('typecheck', 'Expo app TypeScript surface', 'typecheck'));
    checks.push(npmCheck('test:compile', 'compiled app test surface', 'test:compile'));
  }

  if (options.api) {
    checks.push(
      runCheck('api:typecheck', 'Fastify API TypeScript surface', 'npm', [
        '--prefix',
        'apps/api',
        'run',
        'typecheck',
      ]),
    );
    checks.push(
      runCheck('api:test', 'Fastify API test suite', 'npm', [
        '--prefix',
        'apps/api',
        'run',
        'test',
      ]),
    );
  }

  checks.push(runCheck('git:diff-check', 'whitespace and patch formatting', 'git', ['diff', '--check']));

  console.log('AI slice verification');
  console.log(`- app gates: ${options.app ? 'yes' : 'no'}`);
  console.log(`- api gates: ${options.api ? 'yes' : 'no'}`);
  console.log(`- ui gates: ${options.ui ? 'yes' : 'no'}`);
  console.log(`- browser flows: ${options.flows ? 'required' : 'not required'}`);
  console.log('');

  for (const check of checks) {
    printResult(check);
    console.log('');
  }

  const failed = checks.filter((check) => check.status === 'fail');
  const passed = checks.length - failed.length;
  console.log(`Summary: ${passed} passed, ${failed.length} failed.`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
