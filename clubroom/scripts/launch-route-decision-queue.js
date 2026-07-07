#!/usr/bin/env node
/* eslint-disable no-console */

const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REVIEWS_DIR = path.join(ROOT, 'reviews');

const CORE_VERDICTS = new Set([
  'COMMERCIAL-CORE',
  'DEVELOPMENT-CORE',
  'OPS-CORE',
  'PAID-CORE',
  'PROTECT',
  'TRUST-CORE',
]);

const DELETE_PATTERNS = [
  /app\/development\/badges\.tsx$/,
  /app\/review\/create\.tsx$/,
];

const DEMOTE_PATTERNS = [];

const IMPLEMENT_PATTERNS = [
  /app\/availability\//,
  /app\/book\//,
  /app\/booking\//,
  /app\/bookings\//,
  /app\/coach\//,
  /app\/coach-invites\.tsx$/,
  /app\/family\//,
  /app\/health\//,
  /app\/invites\.tsx$/,
  /app\/roster\//,
  /app\/session\//,
  /app\/session-invites\//,
  /app\/sessions\//,
  /app\/verification\//,
];

const KEEP_PATTERNS = [
  /app\/\+html\.tsx$/,
  /app\/_layout\.tsx$/,
  /app\/\(tabs\)\/_layout\.tsx$/,
  /app\/.*\/_layout\.tsx$/,
  /app\/settings\/(privacy-policy|terms)\.tsx$/,
];

function parseArgs(argv) {
  return {
    archive: argv.includes('--archive'),
    json: argv.includes('--json'),
    markdown: argv.includes('--markdown'),
    write: argv.includes('--write'),
  };
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function runPdosAudit() {
  const result = spawnSync(process.execPath, ['scripts/pdos-route-authority-audit.js', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 40 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(`${result.stdout || ''}\n${result.stderr || ''}`.trim());
  }

  return JSON.parse(result.stdout);
}

function matchesAny(file, patterns) {
  return patterns.some((pattern) => pattern.test(file));
}

function hasSensitiveRisk(route) {
  return route.riskFlags.includes('sensitive-read-audit-check');
}

function hasMoneyRisk(route) {
  return route.riskFlags.includes('money-hard-wall-check');
}

function recommendAction(route) {
  if (matchesAny(route.file, DELETE_PATTERNS)) {
    return 'delete';
  }

  if (matchesAny(route.file, DEMOTE_PATTERNS) || route.verdict === 'DEMOTE') {
    return 'demote';
  }

  if (matchesAny(route.file, KEEP_PATTERNS)) {
    return 'keep';
  }

  if (!route.needsDecision && !route.needsImplementation) {
    return 'keep';
  }

  if (matchesAny(route.file, IMPLEMENT_PATTERNS)) {
    return 'implement';
  }

  if (CORE_VERDICTS.has(route.verdict) || route.verdict === 'REVIEW') {
    return route.riskFlags.length > 0 || route.hasAuthorityImport ? 'implement' : 'keep';
  }

  return 'implement';
}

function priorityFor(route, action) {
  if (action === 'keep') return 'P3';
  if (action === 'delete' || action === 'demote') return 'P3';
  if (hasSensitiveRisk(route)) return 'P0';
  if (route.verdict === 'PAID-CORE' || route.verdict === 'TRUST-CORE' || route.verdict === 'PROTECT') {
    return 'P1';
  }
  if (hasMoneyRisk(route)) return 'P1';
  if (route.verdict === 'REVIEW' || route.verdict === 'COMMUNICATION-REVIEW') return 'P2';
  return 'P2';
}

function reasonFor(route, action) {
  if (action === 'delete') {
    return 'Retired standalone launch surface; remove route or hide it behind an explicit non-launch path.';
  }

  if (action === 'demote') {
    return 'Non-core or communication-adjacent surface; keep only if it supports staff-led operations, selected squad context, or booking/development proof.';
  }

  if (action === 'keep') {
    return 'Already classified as launch-compatible by the PDOS audit.';
  }

  if (hasSensitiveRisk(route)) {
    return 'Sensitive-read surface; prove backend authority, scoped visibility, and audit coverage before launch.';
  }

  if (hasMoneyRisk(route)) {
    return 'Money-state surface; live provider is deferred, but UI must not imply unsupported paid/refund success.';
  }

  if (route.riskFlags.length > 0) {
    return `Resolve route risks: ${route.riskFlags.join(', ')}.`;
  }

  return 'Confirm source-of-truth service, primary CTA, loading/error state, and role visibility.';
}

function buildDecisions(report) {
  return report.routes
    .map((route) => {
      const action = recommendAction(route);
      return {
        action,
        priority: priorityFor(route, action),
        reason: reasonFor(route, action),
        ...route,
      };
    })
    .sort((left, right) => left.file.localeCompare(right.file));
}

function buildQueue(decisions) {
  return decisions
    .filter(
      (route) =>
        route.needsDecision ||
        route.needsImplementation ||
        route.action === 'delete' ||
        route.action === 'demote',
    )
    .sort((left, right) => {
      const priorityCompare = left.priority.localeCompare(right.priority);
      if (priorityCompare !== 0) return priorityCompare;
      const actionCompare = left.action.localeCompare(right.action);
      if (actionCompare !== 0) return actionCompare;
      return left.file.localeCompare(right.file);
    });
}

function toDecisionRecord(item) {
  return {
    file: item.file,
    route: item.route,
    action: item.action,
    priority: item.priority,
    pdos: item.pdos,
    verdict: item.verdict,
    job: item.job,
    reason: item.reason,
    riskFlags: item.riskFlags,
    serviceImports: item.serviceImports,
    authorityEvidence: item.authorityEvidence ?? [],
    needsDecision: item.needsDecision,
    needsImplementation: item.needsImplementation,
  };
}

function summarize(queue) {
  const byAction = {};
  const byPriority = {};

  for (const item of queue) {
    byAction[item.action] = (byAction[item.action] ?? 0) + 1;
    byPriority[item.priority] = (byPriority[item.priority] ?? 0) + 1;
  }

  return {
    total: queue.length,
    byAction,
    byPriority,
  };
}

function toMarkdown(report) {
  const lines = [];

  lines.push('# Launch Route Decision Queue');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Routes classified: ${report.decisionSummary.total}`);
  lines.push(`Routes queued: ${report.summary.total}`);
  lines.push('');
  lines.push('## All Route Decisions');
  lines.push('');
  for (const [action, count] of Object.entries(report.decisionSummary.byAction).sort()) {
    lines.push(`- ${action}: ${count}`);
  }
  lines.push('');
  lines.push('## Queued Route Work');
  lines.push('');
  for (const [action, count] of Object.entries(report.summary.byAction).sort()) {
    lines.push(`- ${action}: ${count}`);
  }
  lines.push('');
  for (const [priority, count] of Object.entries(report.summary.byPriority).sort()) {
    lines.push(`- ${priority}: ${count}`);
  }
  lines.push('');
  lines.push('## Queue');
  lines.push('');

  for (const item of report.queue) {
    lines.push(
      `- [${item.priority}] ${item.action.toUpperCase()} ${item.file} (${item.verdict}, ${item.pdos})`,
    );
    lines.push(`  - Reason: ${item.reason}`);
    if (item.riskFlags.length > 0) {
      lines.push(`  - Risks: ${item.riskFlags.join(', ')}`);
    }
    if (item.serviceImports.length > 0) {
      lines.push(`  - Services: ${item.serviceImports.join(', ')}`);
    }
    if ((item.authorityEvidence ?? []).length > 0) {
      lines.push(`  - Evidence: ${item.authorityEvidence.join(', ')}`);
    }
  }

  lines.push('');
  lines.push('## Full Decision Matrix');
  lines.push('');
  lines.push('| Route file | Action | Priority | PDOS | Verdict | Risks | Evidence |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');

  for (const item of report.decisions) {
    lines.push(
      `| \`${item.file}\` | ${item.action} | ${item.priority} | ${item.pdos} | ${item.verdict} | ${item.riskFlags.join(', ') || '-'} | ${(item.authorityEvidence ?? []).join(', ') || '-'} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  const audit = runPdosAudit();
  const decisions = buildDecisions(audit);
  const queue = buildQueue(decisions);
  const report = {
    generatedAt,
    sourceAuditGeneratedAt: audit.generatedAt,
    sourceTotals: audit.totals,
    decisionSummary: summarize(decisions),
    summary: summarize(queue),
    decisions: decisions.map(toDecisionRecord),
    queue,
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (options.markdown) {
    console.log(toMarkdown(report));
    return;
  }

  let jsonPath = null;
  let markdownPath = null;

  if (options.write) {
    mkdirSync(REVIEWS_DIR, { recursive: true });
    const suffix = options.archive ? `-${timestamp()}` : '';
    jsonPath = path.join(REVIEWS_DIR, `launch-route-decisions${suffix}.json`);
    markdownPath = path.join(REVIEWS_DIR, `launch-route-decisions${suffix}.md`);
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(markdownPath, toMarkdown(report));
  }

  console.log('Launch route decision queue');
  console.log(`- routes classified: ${report.decisionSummary.total}`);
  for (const [action, count] of Object.entries(report.decisionSummary.byAction).sort()) {
    console.log(`- ${action}: ${count}`);
  }
  console.log(`- queued: ${report.summary.total}`);
  for (const [action, count] of Object.entries(report.summary.byAction).sort()) {
    console.log(`- queued ${action}: ${count}`);
  }
  for (const [priority, count] of Object.entries(report.summary.byPriority).sort()) {
    console.log(`- queued ${priority}: ${count}`);
  }
  if (markdownPath && jsonPath) {
    console.log(`- report: ${path.relative(ROOT, markdownPath)}`);
    console.log(`- json: ${path.relative(ROOT, jsonPath)}`);
  }
}

main();
