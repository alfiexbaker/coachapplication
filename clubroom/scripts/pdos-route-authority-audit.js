#!/usr/bin/env node
/* eslint-disable no-console */

const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { listFiles } = require('./file-scan-utils');
const { resolveLoadingRouteEntry } = require('../navigation/loading-route-manifest');

const ROOT = path.resolve(__dirname, '..');

const ROUTE_RULES = [
  {
    match:
      /app\/discover\/map\.tsx|app\/book-coach\.tsx|app\/coach\/|app\/\(\tabs\)\/coach-profile\.tsx|app\/favourites\//,
    pdos: 'PDOS-03',
    verdict: 'PROTECT',
    personas: ['parent', 'coach', 'club'],
    job: 'storefront, trust, follow, and booking entry',
  },
  {
    match: /app\/book\/|app\/group-sessions\/|app\/sessions\/create\.tsx|app\/session-invites\//,
    pdos: 'PDOS-04',
    verdict: 'PAID-CORE',
    personas: ['parent', 'coach', 'club', 'child'],
    job: 'paid product selection, booking, registration, invite, or package setup',
  },
  {
    match:
      /app\/\(\tabs\)\/feed\.tsx|app\/\(modal\)\/create-club-post\.tsx|app\/\(modal\)\/post-detail\.tsx|app\/community\/|app\/profile\//,
    pdos: 'PDOS-02',
    verdict: 'COMMUNICATION-REVIEW',
    personas: ['parent', 'coach', 'club'],
    job: 'staff-led communication, coach homepage, comments, or operational messaging',
  },
  {
    match: /app\/matches\/|match/i,
    pdos: 'PDOS-02',
    verdict: 'DEMOTE',
    personas: ['club', 'coach', 'parent'],
    job: 'hidden/selected squad schedule context only',
  },
  {
    match:
      /app\/club\/|app\/\(tabs\)\/club-hub\.tsx|app\/squads\/|app\/events\/|app\/\(modal\)\/create-squad\.tsx/,
    pdos: 'PDOS-10',
    verdict: 'OPS-CORE',
    personas: ['club', 'coach', 'parent', 'compliance'],
    job: 'club activity operations, schedule, squads, staff-led updates, and evidence',
  },
  {
    match: /app\/manage\//,
    pdos: 'PDOS-05',
    verdict: 'OPS-CORE',
    personas: ['club', 'coach', 'compliance'],
    job: 'staff authority, assignment, and operations control',
  },
  {
    match: /app\/booking\/|app\/\(\tabs\)\/bookings|app\/bookings\//,
    pdos: 'PDOS-06',
    verdict: 'PAID-CORE',
    personas: ['parent', 'coach', 'child'],
    job: 'booking lifecycle, readiness, cancellation, receipt, and session state',
  },
  {
    match: /app\/family\/|app\/\(tabs\)\/children\.tsx|app\/roster\/|app\/development\/athlete\//,
    pdos: 'PDOS-06',
    verdict: 'TRUST-CORE',
    personas: ['parent', 'coach', 'club', 'child', 'compliance'],
    job: 'child readiness, roster, medical, consent, emergency, and trust context',
  },
  {
    match: /app\/session\/|app\/session-notes\//,
    pdos: 'PDOS-07',
    verdict: 'OPS-CORE',
    personas: ['coach', 'parent', 'child', 'club'],
    job: 'delivery, attendance, completion, and feedback entry',
  },
  {
    match: /app\/development\/|app\/videos\/|app\/review\//,
    pdos: 'PDOS-08',
    verdict: 'DEVELOPMENT-CORE',
    personas: ['parent', 'coach', 'child'],
    job: 'development proof, video, review, rebook, and next work',
  },
  {
    match: /app\/invoices\/|app\/earnings\.tsx|app\/\(\tabs\)\/earnings\.tsx/,
    pdos: 'PDOS-09',
    verdict: 'COMMERCIAL-CORE',
    personas: ['parent', 'coach', 'club', 'compliance'],
    job: 'invoice, payment state, reconciliation, and earnings',
  },
  {
    match: /app\/\(tabs\)\/settings\.tsx|app\/settings\//,
    pdos: 'PDOS-01',
    verdict: 'OPS-CORE',
    personas: ['parent', 'coach', 'club'],
    job: 'account, communication, trust, and operating settings',
  },
];

const SERVICE_IMPORT_PATTERN =
  /from ['"]@\/services\/([^'"]+)['"]|from ['"]\.\.\/services\/([^'"]+)['"]|from ['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g;
const HOOK_IMPORT_PATTERN = /from ['"]@\/hooks\/([^'"]+)['"]/g;

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
    markdown: argv.includes('--markdown'),
    write: argv.includes('--write'),
    strict: argv.includes('--strict'),
  };
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function routePathFromFile(file) {
  return file
    .replace(/^app\//, '/')
    .replace(/\/index\.tsx$/, '')
    .replace(/\.tsx$/, '')
    .replace(/\(tabs\)\//g, '')
    .replace(/\(modal\)\//g, 'modal/');
}

function classifyRoute(file) {
  const rule = ROUTE_RULES.find((candidate) => candidate.match.test(file));
  if (rule) return rule;

  return {
    pdos: 'PDOS-01',
    verdict: 'REVIEW',
    personas: ['unknown'],
    job: 'needs explicit product decision',
  };
}

function extractMatches(content, pattern) {
  const matches = [];
  let match;

  while ((match = pattern.exec(content))) {
    matches.push(match[1] || match[2] || match[3]);
  }

  pattern.lastIndex = 0;
  return matches;
}

function getRiskFlags(content) {
  const flags = [];

  if (/AsyncStorage|localStorage/.test(content)) flags.push('local-storage-authority-check');
  if (/Alert\.(alert|prompt)|from ['"]react-native['"][\s\S]*Alert/.test(content))
    flags.push('native-alert-check');
  if (/fetch\s*\(/.test(content)) flags.push('direct-fetch-check');
  if (/ActivityIndicator/.test(content)) flags.push('spinner-check');
  if (/router\.(push|replace)\(\s*['"`]/.test(content)) flags.push('route-literal-check');
  if (/TODO|FIXME|mock|placeholder/i.test(content)) flags.push('stale-placeholder-check');
  if (/commentsEnabled|comment/i.test(content) && /post|feed/i.test(content))
    flags.push('comment-control-check');
  if (/refund|void|writeOff|write-off|markPaid|MARKED_PAID/i.test(content))
    flags.push('money-hard-wall-check');
  if (/medical|consent|emergency|safeguard/i.test(content))
    flags.push('sensitive-read-audit-check');

  return flags;
}

function auditRoute(file) {
  const absolutePath = path.join(ROOT, file);
  const content = readFileSync(absolutePath, 'utf8');
  const classification = classifyRoute(file);
  const loading = resolveLoadingRouteEntry(file);
  const serviceImports = uniq(extractMatches(content, SERVICE_IMPORT_PATTERN));
  const hookImports = uniq(extractMatches(content, HOOK_IMPORT_PATTERN));
  const riskFlags = getRiskFlags(content);

  return {
    file,
    route: routePathFromFile(file),
    pdos: classification.pdos,
    verdict: classification.verdict,
    personas: classification.personas,
    job: classification.job,
    loadingStrategy: loading?.strategy ?? 'missing',
    loadingOwner: loading?.owner ?? 'missing',
    serviceImports,
    hookImports,
    riskFlags,
    hasAuthorityImport: serviceImports.length > 0,
    needsDecision:
      classification.verdict === 'REVIEW' ||
      riskFlags.includes('local-storage-authority-check') ||
      riskFlags.includes('direct-fetch-check') ||
      riskFlags.includes('money-hard-wall-check') ||
      riskFlags.includes('sensitive-read-audit-check'),
  };
}

function buildReport() {
  const routeFiles = listFiles(['app'], { extensions: ['.tsx'] });
  const routes = routeFiles.map(auditRoute);
  const byPdos = {};
  const byVerdict = {};

  for (const route of routes) {
    byPdos[route.pdos] = (byPdos[route.pdos] ?? 0) + 1;
    byVerdict[route.verdict] = (byVerdict[route.verdict] ?? 0) + 1;
  }

  const decisionRoutes = routes.filter((route) => route.needsDecision);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      routes: routes.length,
      needsDecision: decisionRoutes.length,
      byPdos,
      byVerdict,
    },
    routes,
  };
}

function toMarkdown(report) {
  const lines = [];

  lines.push('# PDOS Route Authority Audit');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Routes: ${report.totals.routes}`);
  lines.push(`Needs decision: ${report.totals.needsDecision}`);
  lines.push('');
  lines.push('## Summary By Sprint');
  lines.push('');
  for (const [pdos, count] of Object.entries(report.totals.byPdos).sort()) {
    lines.push(`- ${pdos}: ${count}`);
  }
  lines.push('');
  lines.push('## Summary By Verdict');
  lines.push('');
  for (const [verdict, count] of Object.entries(report.totals.byVerdict).sort()) {
    lines.push(`- ${verdict}: ${count}`);
  }
  lines.push('');
  lines.push('## Decision Queue');
  lines.push('');

  const decisionRoutes = report.routes.filter((route) => route.needsDecision);
  if (decisionRoutes.length === 0) {
    lines.push('- None.');
  } else {
    for (const route of decisionRoutes) {
      lines.push(`- ${route.file} -> ${route.pdos} / ${route.verdict} / ${route.job}`);
      if (route.riskFlags.length > 0) {
        lines.push(`  Risks: ${route.riskFlags.join(', ')}`);
      }
      if (route.serviceImports.length > 0) {
        lines.push(`  Services: ${route.serviceImports.join(', ')}`);
      }
    }
  }

  lines.push('');
  lines.push('## Full Route Matrix');
  lines.push('');
  lines.push('| Route file | PDOS | Verdict | Loading | Job | Risks |');
  lines.push('| --- | --- | --- | --- | --- | --- |');

  for (const route of report.routes) {
    lines.push(
      `| \`${route.file}\` | ${route.pdos} | ${route.verdict} | ${route.loadingStrategy} | ${route.job} | ${route.riskFlags.join(', ') || '-'} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

function writeReport(report) {
  const reviewsDir = path.join(ROOT, 'reviews');
  mkdirSync(reviewsDir, { recursive: true });
  writeFileSync(
    path.join(reviewsDir, 'pdos-route-authority-audit.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  writeFileSync(path.join(reviewsDir, 'pdos-route-authority-audit.md'), toMarkdown(report));
}

function printText(report) {
  console.log('PDOS route authority audit');
  console.log(`- routes: ${report.totals.routes}`);
  console.log(`- needsDecision: ${report.totals.needsDecision}`);
  console.log('');
  console.log('By PDOS:');
  for (const [pdos, count] of Object.entries(report.totals.byPdos).sort()) {
    console.log(`- ${pdos}: ${count}`);
  }
  console.log('');
  console.log('By verdict:');
  for (const [verdict, count] of Object.entries(report.totals.byVerdict).sort()) {
    console.log(`- ${verdict}: ${count}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport();

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

  if (options.strict && report.totals.needsDecision > 0) {
    process.exitCode = 1;
  }
}

main();
