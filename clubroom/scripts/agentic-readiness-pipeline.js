#!/usr/bin/env node
/* eslint-disable no-console */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const flags = new Set(argv);
  return {
    write: flags.has('--write'),
    strict: flags.has('--strict'),
    skipUi: flags.has('--skip-ui'),
  };
}

function compactOutput(output) {
  return output.trim().split('\n').filter(Boolean).slice(-18).join('\n');
}

function parseJsonOutput(output) {
  try {
    return JSON.parse(output.trim());
  } catch {
    return null;
  }
}

function summarizeMap(values) {
  return Object.entries(values ?? {})
    .sort()
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

function interpretDbReport(output) {
  const report = parseJsonOutput(output);
  if (!report) return null;

  const status = report.status === 'ready' ? 'pass' : 'warn';
  return {
    status,
    output: [
      `DB staging status: ${report.status}`,
      `migrations: ${report.migrationCount}`,
      `blockers: ${report.summary?.blockers ?? 0}`,
      `warnings: ${report.summary?.warnings ?? 0}`,
    ].join('\n'),
  };
}

function interpretPdosReport(output) {
  const report = parseJsonOutput(output);
  if (!report) return null;

  const needsDecision = report.totals?.needsDecision ?? 0;
  return {
    status: needsDecision > 0 ? 'warn' : 'pass',
    output: [
      `routes: ${report.totals?.routes ?? 0}`,
      `needsDecision: ${needsDecision}`,
      `byPdos: ${summarizeMap(report.totals?.byPdos)}`,
      `byVerdict: ${summarizeMap(report.totals?.byVerdict)}`,
    ].join('\n'),
  };
}

function runCheck(id, description, args, interpretOutput) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  const durationMs = Date.now() - startedAt;
  const rawOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
  const interpreted = interpretOutput?.(rawOutput);

  return {
    id,
    description,
    durationMs,
    status: result.status === 0 ? (interpreted?.status ?? 'pass') : 'fail',
    output: interpreted?.output ?? compactOutput(rawOutput),
  };
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
  const writeFlag = options.write ? ['--write'] : [];
  const strictFlag = options.strict ? ['--strict'] : [];

  const checks = [
    runCheck(
      'db-stage',
      'DB staging env and release blocker preflight',
      ['scripts/db-staging-preflight.js', ...writeFlag, ...strictFlag, '--json'],
      interpretDbReport,
    ),
    runCheck(
      'pdos-routes',
      'PDOS route/data-authority matrix',
      ['scripts/pdos-route-authority-audit.js', ...writeFlag, ...strictFlag, '--json'],
      interpretPdosReport,
    ),
  ];

  if (!options.skipUi) {
    checks.push(
      runCheck('ui-quality', 'UI interaction quality static pipeline', [
        'scripts/ui-quality-pipeline.js',
        '--skip-flows',
      ]),
    );
  }

  console.log('Agentic readiness pipeline');
  console.log(`- write: ${options.write ? 'yes' : 'no'}`);
  console.log(`- strict: ${options.strict ? 'yes' : 'no'}`);
  console.log('');

  for (const check of checks) {
    printResult(check);
    console.log('');
  }

  const failed = checks.filter((check) => check.status === 'fail');
  const warned = checks.filter((check) => check.status === 'warn');
  const passed = checks.filter((check) => check.status === 'pass');
  console.log(
    `Summary: ${passed.length} passed, ${warned.length} warned, ${failed.length} failed.`,
  );

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
