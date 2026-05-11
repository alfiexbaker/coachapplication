#!/usr/bin/env node
/* eslint-disable no-console */

const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { listFiles } = require('./file-scan-utils');

const BASELINE_PATH = 'scripts/api-boundary-audit-baseline.json';
const args = new Set(process.argv.slice(2));
const shouldUpdateBaseline = args.has('--update-baseline') || args.has('--write');

const UI_TARGETS = ['app', 'components', 'hooks'];
const APP_TARGETS = ['app', 'components', 'hooks', 'services'];
const API_TARGETS = ['apps/api/src'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

const TRUST_SENSITIVE_STORAGE_KEYS = new Set([
  'BOOKINGS',
  'BOOKING_SERIES',
  'CHILDREN_PROFILES',
  'CLUB_INVITE_CODES',
  'CLUB_MEMBERSHIPS',
  'CLUB_MEMBER_REMOVALS',
  'CLUB_MEMBERS',
  'CLUB_SQUADS',
  'CLUBS',
  'EMERGENCY_CACHE',
  'EMERGENCY_INFO',
  'FAMILY_ACCOUNTS',
  'FAMILY_BOOKINGS',
  'FAMILY_MEMBERS',
  'INVOICES',
  'SESSION_FEEDBACK',
  'SESSION_INVITES',
  'SESSION_JOURNAL',
  'SESSION_MEDIA',
  'SESSION_NOTES',
  'SESSION_OFFERINGS',
  'SESSION_RSVPS',
  'SESSION_TEMPLATES',
  'SESSION_VIDEOS',
]);

const DIRECT_STORAGE_WRAPPERS = new Set([
  'services/api-client.ts',
  'services/local-overlay-store.ts',
]);

function readSource(file) {
  return readFileSync(resolve(file), 'utf8');
}

function stripCommentsPreserveLines(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function lineNumberAt(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function lineAt(source, lineNumber) {
  return (source.split('\n')[lineNumber - 1] || '').trim().replace(/\s+/g, ' ');
}

function normalizeSnippet(value) {
  return value.trim().replace(/\s+/g, ' ').slice(0, 220);
}

function createFinding(rule, file, line, message, snippet) {
  const normalizedSnippet = normalizeSnippet(snippet);
  return {
    rule,
    file,
    line,
    message,
    snippet: normalizedSnippet,
    fingerprint: `${rule}|${file}|${normalizedSnippet}`,
  };
}

function addRegexFindings(findings, rule, file, source, regex, message, options = {}) {
  regex.lastIndex = 0;
  let match = regex.exec(source);
  while (match) {
    const start = match.index + (options.matchOffset ?? 0);
    if (!options.skip?.(source, match, start)) {
      const line = lineNumberAt(source, start);
      findings.push(createFinding(rule, file, line, message, lineAt(source, line)));
    }
    match = regex.exec(source);
  }
}

function uniqueFindings(findings) {
  const seen = new Set();
  const unique = [];
  for (const finding of findings) {
    if (seen.has(finding.fingerprint)) continue;
    seen.add(finding.fingerprint);
    unique.push(finding);
  }
  return unique.sort((a, b) =>
    `${a.rule}:${a.file}:${a.line}:${a.snippet}`.localeCompare(
      `${b.rule}:${b.file}:${b.line}:${b.snippet}`,
    ),
  );
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) {
    return { version: 1, allowedFindings: [] };
  }
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
}

function writeBaseline(findings) {
  const baseline = {
    version: 1,
    updatedAt: new Date().toISOString(),
    note: 'Legacy anti-slop findings allowed for now. New findings fail scripts/api-boundary-audit.js.',
    allowedFindings: findings.map(({ rule, file, snippet, fingerprint }) => ({
      rule,
      file,
      snippet,
      fingerprint,
    })),
  };
  writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
}

function collectFrontendRawFetchFindings() {
  const findings = [];
  for (const file of listFiles(UI_TARGETS, { extensions: SOURCE_EXTENSIONS })) {
    const source = stripCommentsPreserveLines(readSource(file));
    addRegexFindings(
      findings,
      'frontend-raw-fetch',
      file,
      source,
      /\bfetch\s*\(/g,
      'Move network access behind a service or hook adapter; UI code must not own raw fetch calls.',
      {
        skip: (content, _match, index) => content[index - 1] === '.',
      },
    );
  }
  return findings;
}

function collectLegacyApiPathFindings() {
  const findings = [];
  for (const file of listFiles(APP_TARGETS, { extensions: SOURCE_EXTENSIONS })) {
    const source = stripCommentsPreserveLines(readSource(file));
    addRegexFindings(
      findings,
      'legacy-api-path',
      file,
      source,
      /(['"`])[^'"`]*\/api\/[^'"`]*\1/g,
      'Use explicit /v1 service contracts for product data instead of legacy /api paths or generic storage bridges.',
    );
  }
  return findings;
}

function collectTrustStorageFindings() {
  const findings = [];
  const trustKeyPattern = [...TRUST_SENSITIVE_STORAGE_KEYS].sort().join('|');
  const storageKeyRegex = new RegExp(`\\bSTORAGE_KEYS\\.(${trustKeyPattern})\\b`, 'g');

  for (const file of listFiles(APP_TARGETS, { extensions: SOURCE_EXTENSIONS })) {
    const source = stripCommentsPreserveLines(readSource(file));

    if (!DIRECT_STORAGE_WRAPPERS.has(file)) {
      addRegexFindings(
        findings,
        'direct-async-storage',
        file,
        source,
        /\bAsyncStorage\.(getItem|setItem|removeItem|multiGet|multiSet|multiRemove)\s*\(/g,
        'Use apiClient/local overlay wrappers; direct AsyncStorage access bypasses runtime ownership rules.',
      );
    }

    storageKeyRegex.lastIndex = 0;
    let match = storageKeyRegex.exec(source);
    while (match) {
      const windowStart = Math.max(0, match.index - 180);
      const windowEnd = Math.min(source.length, match.index + 220);
      const nearby = source.slice(windowStart, windowEnd);
      const isApiClientStorageUse = /apiClient\.(get|set|remove)\s*(?:<[^>]+>)?\s*\(/.test(nearby);
      if (isApiClientStorageUse) {
        const line = lineNumberAt(source, match.index);
        findings.push(
          createFinding(
            'trust-sensitive-local-storage',
            file,
            line,
            'Trust-sensitive product data must be backend-owned in non-mock mode; local storage may only mirror authoritative writes.',
            lineAt(source, line),
          ),
        );
      }
      match = storageKeyRegex.exec(source);
    }
  }

  return findings;
}

function collectRouteLiteralFindings() {
  const findings = [];
  for (const file of listFiles(UI_TARGETS, { extensions: SOURCE_EXTENSIONS })) {
    const source = stripCommentsPreserveLines(readSource(file));
    const lines = source.split('\n');
    lines.forEach((line, index) => {
      if (!/\brouter\.(push|replace|navigate)\s*\(/.test(line)) return;
      if (!/['"`]\/(?!\/)/.test(line)) return;
      findings.push(
        createFinding(
          'route-literal',
          file,
          index + 1,
          'Use navigation/routes.ts helpers instead of hardcoded route strings.',
          line,
        ),
      );
    });
  }
  return findings;
}

function collectNativeAlertFindings() {
  const findings = [];
  for (const file of listFiles(UI_TARGETS, { extensions: SOURCE_EXTENSIONS })) {
    const source = stripCommentsPreserveLines(readSource(file));
    addRegexFindings(
      findings,
      'native-alert',
      file,
      source,
      /\bAlert\.(alert|prompt)\s*\(/g,
      'Use in-app alert/toast/action-sheet primitives; native alerts require an explicit exception tag.',
      {
        skip: (_content, _match, index) =>
          lineAt(source, lineNumberAt(source, index)).includes('native-alert-exception'),
      },
    );
  }
  return findings;
}

function apiDocsText() {
  const docs = [
    'docs/backend-api/UI_API_BILATERAL_ALIGNMENT.md',
    'docs/backend-api/ROUTE_INVENTORY_V1.md',
  ];
  return docs
    .filter((file) => existsSync(file))
    .map((file) => readSource(file))
    .join('\n');
}

function routeToV1Path(routePath) {
  if (routePath.startsWith('/v1/')) return routePath;
  if (routePath.startsWith('/')) return `/v1${routePath}`;
  return `/v1/${routePath}`;
}

function collectUntracedBackendRouteFindings() {
  const findings = [];
  const docs = apiDocsText();

  for (const file of listFiles(API_TARGETS, { extensions: ['.ts'] }).filter((candidate) =>
    candidate.endsWith('/routes.ts'),
  )) {
    const source = stripCommentsPreserveLines(readSource(file));
    const routeRegex = /\bapp\.(get|post|put|patch|delete)\(\s*(['"`])([^'"`]+)\2/g;
    let match = routeRegex.exec(source);
    while (match) {
      const method = match[1].toUpperCase();
      const routePath = match[3];
      const v1Path = routeToV1Path(routePath);
      const isTraced =
        docs.includes(`${method} ${v1Path}`) ||
        docs.includes(v1Path) ||
        docs.includes(`${method} ${routePath}`) ||
        docs.includes(routePath);
      if (!isTraced) {
        const line = lineNumberAt(source, match.index);
        findings.push(
          createFinding(
            'untraced-backend-route',
            file,
            line,
            'Document the endpoint in route inventory or UI/API bilateral alignment before treating it as production-ready.',
            `${method} ${v1Path}`,
          ),
        );
      }
      match = routeRegex.exec(source);
    }
  }

  return findings;
}

function collectRawPrismaHandlerFindings() {
  const findings = [];
  const routeFiles = listFiles(API_TARGETS, { extensions: ['.ts'] }).filter((candidate) =>
    candidate.endsWith('/routes.ts'),
  );

  for (const file of routeFiles) {
    const source = stripCommentsPreserveLines(readSource(file));
    addRegexFindings(
      findings,
      'raw-prisma-handler-return',
      file,
      source,
      /\b(reply\.send\(\s*|return\s+)(await\s+)?(app\.|ctx\.|db\.|prisma\.)?prisma\.[a-zA-Z0-9_]+\.(findMany|findUnique|findFirst|create|update|upsert)\b/g,
      'Route handlers must return serialized DTOs, not raw Prisma rows.',
    );
  }

  return findings;
}

function collectFindings() {
  return uniqueFindings([
    ...collectFrontendRawFetchFindings(),
    ...collectLegacyApiPathFindings(),
    ...collectTrustStorageFindings(),
    ...collectRouteLiteralFindings(),
    ...collectNativeAlertFindings(),
    ...collectUntracedBackendRouteFindings(),
    ...collectRawPrismaHandlerFindings(),
  ]);
}

function summarizeByRule(findings) {
  return findings.reduce((acc, finding) => {
    acc[finding.rule] = (acc[finding.rule] || 0) + 1;
    return acc;
  }, {});
}

function main() {
  const findings = collectFindings();

  if (shouldUpdateBaseline) {
    writeBaseline(findings);
    console.log(`Updated ${BASELINE_PATH} with ${findings.length} allowed legacy findings.`);
  }

  const baseline = loadBaseline();
  const allowed = new Set((baseline.allowedFindings || []).map((finding) => finding.fingerprint));
  const newFindings = findings.filter((finding) => !allowed.has(finding.fingerprint));
  const retiredFindings = (baseline.allowedFindings || []).filter(
    (finding) => !findings.some((current) => current.fingerprint === finding.fingerprint),
  );

  console.log('API Boundary Audit');
  console.log('==================');
  console.log(`Findings scanned : ${findings.length}`);
  console.log(`Allowed baseline : ${allowed.size}`);
  console.log(`New findings     : ${newFindings.length}`);
  console.log(`Retired baseline : ${retiredFindings.length}`);
  console.log('');
  console.log('Findings by rule:');
  const counts = summarizeByRule(findings);
  for (const rule of Object.keys(counts).sort()) {
    console.log(`- ${rule}: ${counts[rule]}`);
  }

  if (retiredFindings.length > 0 && !shouldUpdateBaseline) {
    console.log('');
    console.log(
      `Note: ${retiredFindings.length} baseline finding(s) no longer exist. Run \`node ./scripts/api-boundary-audit.js --update-baseline\` after reviewing the cleanup.`,
    );
  }

  if (newFindings.length > 0) {
    console.error('');
    console.error('Fail: new API/UI boundary violations detected.');
    for (const finding of newFindings.slice(0, 80)) {
      console.error(`- ${finding.rule}: ${finding.file}:${finding.line}`);
      console.error(`  ${finding.message}`);
      console.error(`  ${finding.snippet}`);
    }
    if (newFindings.length > 80) {
      console.error(`...and ${newFindings.length - 80} more.`);
    }
    process.exit(1);
  }

  console.log('');
  console.log('Pass: no new API/UI boundary violations detected.');
}

try {
  main();
} catch (error) {
  console.error('API boundary audit failed to run.');
  console.error(error);
  process.exit(1);
}
