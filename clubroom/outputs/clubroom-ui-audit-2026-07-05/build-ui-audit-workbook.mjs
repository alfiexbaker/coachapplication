import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const outputDir = scriptDir;
const outputPath = path.join(outputDir, 'clubroom-ui-audit-2026-07-05.xlsx');
const inspectPath = path.join(outputDir, 'clubroom-ui-audit-2026-07-05.xlsx.inspect.ndjson');
const finalRouteSweepPath =
  process.env.ROUTE_SWEEP_REPORT ||
  '/tmp/clubroom-route-sweep-2026-07-07T124000Z-merged/route-sweep-report.json';
const copiedRouteSweepPath = path.join(outputDir, 'route-sweep-report-final.json');

const finalReports = [
  {
    role: 'coach',
    label: 'Coach',
    path: '/tmp/clubroom-goal-ui-flow-coach-rerun5-seed-2026-07-05T232100Z/report.json',
  },
  {
    role: 'parent',
    label: 'Parent',
    path: '/tmp/clubroom-goal-ui-flow-parent-rerun3-seed-2026-07-05T231400Z/report.json',
  },
  {
    role: 'athlete',
    label: 'Athlete',
    path: '/tmp/clubroom-goal-ui-flow-athlete-rerun6-seed-2026-07-05T231600Z/report.json',
  },
  {
    role: 'admin',
    label: 'Admin/Owner',
    path: '/tmp/clubroom-goal-ui-flow-admin-rerun3-seed-2026-07-05T232000Z/report.json',
  },
];

const fixes = [
  [
    'Athlete development route',
    'scripts/ui-flow-checks-50.mjs',
    'Replaced stale analytics path with /development/athlete/:athleteId and added unmatched-route detection.',
    'Athlete flow rerun clean.',
  ],
  [
    'Athlete API self-access',
    'apps/api/src/lib/authz.ts; apps/api/src/repositories/p0/trust-access-repository.ts',
    'Athlete self-access now resolves athlete.userId instead of assuming athlete id maps directly to user id.',
    'API route regression test added and passed.',
  ],
  [
    'Child profile API context',
    'services/child-service.ts; hooks/use-athlete-development.ts',
    'Child profile reads now use signed-in API context and development screens map child profiles before falling back to generic user lookup.',
    'Athlete and parent progress flows clean.',
  ],
  [
    'Progress dashboard resilience',
    'services/progress/progress-report-service.ts',
    'Optional progress subresources now fall back to empty models instead of blanking the dashboard when one endpoint is unavailable.',
    'Coach and athlete progress flows clean.',
  ],
  [
    'Club session assignee labels',
    'hooks/use-create-session.ts; app/sessions/create.tsx',
    'Club assignee chips now fall back to role labels instead of raw usr_ identifiers when user-name hydration is incomplete.',
    'Coach club-assigned create and existing-invite flows clean.',
  ],
  [
    'Walkthrough copy',
    'utils/demo-walkthrough.ts',
    'Removed visible "seeded" fixture wording from user-facing walkthrough cards.',
    'Admin owner dashboard rerun clean.',
  ],
  [
    'Route sweep harness',
    'outputs/clubroom-ui-audit-2026-07-05/route-sweep.mjs',
    'Added seed route IDs, browser fallback, per-route re-auth, retry handling, response capture, static-child matching, chunked resume support, and bounded browser shutdown.',
    'Final route sweep: 93/93 ok, 0 high, 0 medium.',
  ],
  [
    'Web modal focus handling',
    'hooks/use-focus-trap.ts',
    'Skipped native findNodeHandle focus work on web while preserving accessibility announcements.',
    'Modal-heavy route sweep paths clean.',
  ],
  [
    'Progress and roster render stability',
    'app/development/progress-loop.tsx; hooks/use-quick-rate.ts; components/progress-loop/*; components/ui/skeleton.tsx',
    'Stopped equal-array state churn, deferred closed bottom-sheet mounting, and used web-safe static renderers for Reanimated-heavy progress visuals.',
    'Progress-loop, group roster, and invites route sweep paths clean.',
  ],
  [
    'Public profile and event seed authority',
    'hooks/use-public-profile.ts; hooks/use-coach-detail.ts; services/coach-service.ts; hooks/use-create-event.ts; app/events/*',
    'Kept legacy coach-* fixture profiles local and pointed event list/create at the seed-backed Riverside club id.',
    'Public coach profile, events, and event create route sweep paths clean.',
  ],
  [
    'Account/support identifier copy',
    'utils/support-ref.ts; app/settings/*; hooks/use-account-settings.ts; hooks/use-help-screen.ts',
    'Replaced raw internal user ids in support surfaces with short support references.',
    'Settings account/help route sweep paths clean.',
  ],
  [
    'Nested action and image fallbacks',
    'components/discover/map-content.web.tsx; components/athlete/athlete-emergency-card.tsx; components/profile/edit-photo-section.tsx',
    'Removed nested pressable patterns from map/roster cards and suppressed dead demo CDN image requests in edit profile.',
    'Discover map, roster emergency, and edit profile route sweep paths clean.',
  ],
  [
    'RSVP and invoice display safety',
    'app/events/[id]/rsvp.tsx; components/invoices/*; services/invoice-template.ts',
    'Wrapped RSVP button labels in text components, used Button label props where appropriate, and replaced internal invoice party-id fallbacks with safe account labels.',
    'Targeted RSVP and invoice browser probes clean.',
  ],
  [
    'React compiler cleanup',
    'components/invoices/mark-paid-button.tsx; app/events/create.tsx',
    'Removed a try/finally clause from a component callback and rendered the event step switch as a named JSX component.',
    'React Doctor rerun exits cleanly with no compiler errors.',
  ],
  [
    'Legacy coach relationship boundary',
    'hooks/use-coach-detail.ts; hooks/use-public-profile.ts; components/coach/coach-detail-hero.tsx; app/coach/[id].tsx',
    'Kept legacy coach-* public profiles local and hid relationship actions that cannot complete against backend ids.',
    'Targeted coach profile probe clean with no invalid follow/block calls.',
  ],
  [
    'Invite and video route polish',
    'components/invite/invite-type-card.tsx; apps/api/src/modules/wave2plus/routes.ts',
    'Replaced raw squad id invite copy and allowed seed-backed media playback references while preserving db-mode storage enforcement.',
    'Invite and video paths clean in final route sweep.',
  ],
];

const validations = [
  [
    'TypeScript typecheck',
    'npm run typecheck',
    'Passed with no TypeScript errors.',
  ],
  [
    'App drill tests',
    'npm run test:drills',
    'Passed 65/65 drill service tests.',
  ],
  [
    'API regression',
    'NODE_ENV=test API_DATA_BACKEND=seed apps/api/node_modules/.bin/tsx --test apps/api/src/modules/wave2plus/routes.test.ts apps/api/src/plugins/error-handler.test.ts',
    'Passed 55/55 focused wave2plus and error-handler tests.',
  ],
  [
    'Coach finance API regression',
    'NODE_ENV=test API_DATA_BACKEND=seed apps/api/node_modules/.bin/tsx --test apps/api/src/modules/coach-club/routes.test.ts',
    'Passed 33/33 coach-club route tests including coach self invoice reads.',
  ],
  [
    'Invoice service API mode',
    'npm run test:compile && node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/invoice-service-api-mode.test.js',
    'Passed 1/1 service routing test for self-scoped coach invoice filters.',
  ],
  [
    'React Doctor diff scan',
    'PATH=<bundled-node>:$PATH /opt/homebrew/bin/npx react-doctor@latest --verbose --scope changed',
    'Passed with no compiler errors; score 91/100 with 18 maintainability warnings deferred as non-atomic follow-up.',
  ],
  [
    'Coach UI flows',
    finalReports[0].path,
    '35/35 clean against local seed-backed /v1 API.',
  ],
  [
    'Parent UI flows',
    finalReports[1].path,
    '22/22 clean against local seed-backed /v1 API.',
  ],
  [
    'Athlete UI flows',
    finalReports[2].path,
    '13/13 clean against local seed-backed /v1 API.',
  ],
  [
    'Admin/owner UI flows',
    finalReports[3].path,
    '1/1 clean against local seed-backed /v1 API.',
  ],
  [
    'Targeted browser probes',
    '/tmp/clubroom-targeted-probes-2026-07-07T112100Z/report.json; /tmp/clubroom-coach-legacy-probe-2026-07-07T113500Z/report.json',
    'RSVP, invoice, session completion, and legacy coach profile probes clean.',
  ],
  [
    'Touched route recheck',
    '/tmp/clubroom-route-sweep-touch-2026-07-07T122000Z-events/route-sweep-report.json; /tmp/clubroom-route-sweep-touch-2026-07-07T122000Z-invoice/route-sweep-report.json; /tmp/clubroom-route-sweep-touch-2026-07-07T122000Z-session/route-sweep-report.json',
    '6/6 touched routes clean after final React Doctor cleanup.',
  ],
  [
    'Remaining route closure',
    '/tmp/clubroom-route-sweep-missing-2026-07-07T124000Z-squad/route-sweep-report.json; /tmp/clubroom-route-sweep-missing-2026-07-07T124000Z-family/route-sweep-report.json; /tmp/clubroom-route-sweep-missing-2026-07-07T124000Z-manage/route-sweep-report.json',
    '3/3 previously unchecked route files clean.',
  ],
  [
    'Route sweep',
    finalRouteSweepPath,
    '93/93 route deep links clean; 0 failed, 0 high, 0 medium.',
  ],
];

const limitations = [
  [
    'Native iOS coverage',
    'Blocked',
    'Simulator boot/app install failed earlier in the audit, so final automated coverage is web/Expo Router via Playwright.',
  ],
  [
    'Runtime backend',
    'Local seed-backed API',
    '/v1 route surface was checked on port 4000 with API_DATA_BACKEND=seed using chunked sweeps and targeted reruns.',
  ],
  [
    'Route inventory',
    'Explicitly inventoried and swept',
    'The workbook lists all app route files and flags whether each route was covered by role flows, the route sweep, or remains a backlog item.',
  ],
  [
    'Visual standard',
    'Automated checks plus screenshots',
    'Flow checks scan horizontal overflow, nested buttons, unmatched routes, raw ids, raw service types, unavailable-state copy, internal seeded copy, and route-level console/page errors.',
  ],
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function toRoutePattern(filePath) {
  const relative = path.relative(path.join(repoRoot, 'app'), filePath).replaceAll(path.sep, '/');
  const withoutExt = relative.replace(/\.(tsx|ts|jsx|js)$/, '');
  const parts = withoutExt.split('/').filter(Boolean);
  const routeParts = [];
  for (const part of parts) {
    if (part.startsWith('(') && part.endsWith(')')) continue;
    if (part === '_layout') return null;
    if (part === '+html') return null;
    if (part === 'index') continue;
    if (part.startsWith('+')) {
      routeParts.push(part);
      continue;
    }
    if (part.startsWith('[...') && part.endsWith(']')) {
      routeParts.push(`*${part.slice(4, -1)}`);
      continue;
    }
    if (part.startsWith('[') && part.endsWith(']')) {
      routeParts.push(`:${part.slice(1, -1)}`);
      continue;
    }
    routeParts.push(part);
  }
  return `/${routeParts.join('/')}`.replace(/\/+/g, '/') || '/';
}

function patternToRegex(pattern) {
  const escaped = pattern
    .split('/')
    .map((segment) => {
      if (!segment) return '';
      if (segment.startsWith(':')) return '[^/]+';
      if (segment.startsWith('*')) return '.*';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${escaped}$`);
}

function routeSegments(value) {
  return String(value ?? '').split('?')[0].split('/').filter(Boolean);
}

function staticChildSegmentsByPrefix(routes) {
  const map = new Map();
  for (const route of routes) {
    const segments = routeSegments(route.pattern);
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment.startsWith(':') || segment.startsWith('*')) continue;
      const prefix = `/${segments.slice(0, index).join('/')}`;
      if (!map.has(prefix)) map.set(prefix, new Set());
      map.get(prefix).add(segment);
    }
  }
  return map;
}

function pathMatchesPattern(pattern, routePath, staticChildren) {
  const patternSegments = routeSegments(pattern);
  const pathSegments = routeSegments(routePath);
  let pathIndex = 0;
  for (let patternIndex = 0; patternIndex < patternSegments.length; patternIndex += 1) {
    const segment = patternSegments[patternIndex];
    if (segment.startsWith('*')) return true;
    const pathSegment = pathSegments[pathIndex];
    if (pathSegment === undefined) return false;
    if (segment.startsWith(':')) {
      const prefix = `/${pathSegments.slice(0, pathIndex).join('/')}`;
      if (staticChildren.get(prefix)?.has(pathSegment)) return false;
      pathIndex += 1;
      continue;
    }
    if (segment !== pathSegment) return false;
    pathIndex += 1;
  }
  return pathIndex === pathSegments.length;
}

function normalizeFlowPath(value) {
  return String(value ?? '').split('?')[0] || '/';
}

function issueText(issues) {
  if (!issues || issues.length === 0) return '';
  return issues.join(' | ');
}

function writeRows(sheet, rows) {
  if (rows.length === 0) return;
  const cols = Math.max(...rows.map((row) => row.length));
  const padded = rows.map((row) => [...row, ...Array(cols - row.length).fill(null)]);
  sheet.getRangeByIndexes(0, 0, padded.length, cols).values = padded;
}

function styleSheet(sheet, rows, widths = []) {
  if (rows.length === 0) return;
  const cols = Math.max(...rows.map((row) => row.length));
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
  const header = sheet.getRangeByIndexes(0, 0, 1, cols);
  header.format = {
    fill: '#12343B',
    font: { bold: true, color: '#FFFFFF' },
    wrapText: true,
  };
  const body = sheet.getRangeByIndexes(1, 0, Math.max(rows.length - 1, 1), cols);
  body.format = {
    wrapText: true,
    borders: {
      insideHorizontal: { style: 'thin', color: '#D9E2E7' },
    },
  };
  for (let col = 0; col < cols; col += 1) {
    const width = widths[col] ?? 18;
    sheet.getRangeByIndexes(0, col, Math.max(rows.length, 2), 1).format.columnWidth = width;
  }
}

function addConditionalSeverity(sheet, rowCount, severityColIndex) {
  if (rowCount <= 1) return;
  const range = sheet.getRangeByIndexes(1, severityColIndex, rowCount - 1, 1);
  range.conditionalFormats.add('containsText', {
    text: 'high',
    format: { fill: '#FEE2E2', font: { color: '#991B1B', bold: true } },
  });
  range.conditionalFormats.add('containsText', {
    text: 'medium',
    format: { fill: '#FEF3C7', font: { color: '#92400E', bold: true } },
  });
  range.conditionalFormats.add('containsText', {
    text: 'none',
    format: { fill: '#DCFCE7', font: { color: '#166534' } },
  });
}

function addCoverageFormatting(sheet, rowCount, coverageColIndex) {
  if (rowCount <= 1) return;
  const range = sheet.getRangeByIndexes(1, coverageColIndex, rowCount - 1, 1);
  range.conditionalFormats.add('containsText', {
    text: 'Direct flow',
    format: { fill: '#DCFCE7', font: { color: '#166534' } },
  });
  range.conditionalFormats.add('containsText', {
    text: 'Not directly checked',
    format: { fill: '#F3F4F6', font: { color: '#374151' } },
  });
}

const reportPayloads = [];
for (const report of finalReports) {
  const payload = await readJson(report.path);
  reportPayloads.push({ ...report, payload });
}
const routeSweepPayload = await readJson(finalRouteSweepPath);
await fs.copyFile(finalRouteSweepPath, copiedRouteSweepPath);

const flowRows = [
  [
    'Role',
    'Flow ID',
    'Title',
    'Path',
    'Status',
    'Severity',
    'Issues',
    'Attempts',
    'Duration ms',
    'Screenshot',
    'Report',
  ],
];
for (const report of reportPayloads) {
  for (const result of report.payload.results) {
    flowRows.push([
      report.label,
      result.id,
      result.title,
      result.path,
      result.status,
      result.severity,
      issueText(result.issues),
      result.attempts ?? null,
      result.durationMs ?? null,
      result.screenshot ?? '',
      report.path,
    ]);
  }
}

const flowPaths = flowRows.slice(1).map((row) => ({
  id: row[1],
  path: normalizeFlowPath(row[3]),
  regexPath: normalizeFlowPath(row[3]),
}));

const routeSweepRows = [
  [
    'Route pattern',
    'Source file',
    'Path',
    'Role',
    'Status',
    'Severity',
    'Issues',
    'Duration ms',
    'Current path',
    'Text preview',
    'Report',
  ],
];
for (const result of routeSweepPayload.results) {
  routeSweepRows.push([
    result.routePattern,
    result.sourceFile,
    result.path,
    result.role,
    result.status,
    result.severity,
    issueText(result.issues),
    result.durationMs ?? null,
    result.currentPath ?? '',
    result.textPreview ?? '',
    copiedRouteSweepPath,
  ]);
}

const routeSweepCoverage = routeSweepPayload.results.map((result) => ({
  pattern: result.routePattern,
  path: normalizeFlowPath(result.path),
  status: result.status,
  severity: result.severity,
}));

const routeFiles = (await walk(path.join(repoRoot, 'app')))
  .filter((file) => /\.(tsx|ts|jsx|js)$/.test(file))
  .filter((file) => !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'))
  .map((file) => {
    const pattern = toRoutePattern(file);
    return pattern
      ? {
          pattern,
          file: path.relative(repoRoot, file),
        }
      : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.pattern.localeCompare(b.pattern) || a.file.localeCompare(b.file));
const staticChildren = staticChildSegmentsByPrefix(routeFiles);

const routeRows = [
  ['Route pattern', 'Source file', 'Direct flow IDs', 'Route sweep paths', 'Coverage status', 'Notes'],
];
for (const route of routeFiles) {
  const matches = flowPaths.filter((flow) =>
    pathMatchesPattern(route.pattern, flow.path, staticChildren),
  );
  const sweepMatches = routeSweepCoverage.filter(
    (sweep) =>
      sweep.pattern === route.pattern ||
      pathMatchesPattern(route.pattern, sweep.path, staticChildren),
  );
  const directIds = matches.map((flow) => flow.id).join(', ');
  const sweepPaths = sweepMatches.map((sweep) => sweep.path).join(', ');
  const coverageStatus =
    matches.length > 0 && sweepMatches.length > 0
      ? 'Direct flow + route sweep'
      : matches.length > 0
        ? 'Direct flow'
        : sweepMatches.length > 0
          ? 'Route sweep'
          : 'Not directly checked';
  routeRows.push([
    route.pattern,
    route.file,
    directIds,
    sweepPaths,
    coverageStatus,
    coverageStatus === 'Not directly checked'
      ? 'Inventory item; add a seeded deep-link flow before claiming direct coverage.'
      : 'Visited by final Playwright flow suite and/or route sweep.',
  ]);
}

const workbook = Workbook.create();
const summary = workbook.worksheets.add('Summary');
const flowSheet = workbook.worksheets.add('Flow Checks');
const routeSweepSheet = workbook.worksheets.add('Route Sweep');
const routeSheet = workbook.worksheets.add('Route Inventory');
const fixSheet = workbook.worksheets.add('Fix Log');
const validationSheet = workbook.worksheets.add('Validation');
const limitationSheet = workbook.worksheets.add('Limitations');

const flowLastRow = flowRows.length;
const routeSweepLastRow = routeSweepRows.length;
const routeLastRow = routeRows.length;
const summaryRows = [
  ['Clubroom App UI Audit', null, null, null],
  ['Generated', new Date(), 'Base URL', 'http://localhost:8083'],
  ['Runtime', 'Expo web + local /v1 API', 'API backend', 'seed'],
  ['Metric', 'Value', 'Formula / Source', 'Notes'],
  ['Total checked flows', null, `=COUNTA('Flow Checks'!A2:A${flowLastRow})`, 'Role-based Playwright flows'],
  ['Route sweep checks', null, `=COUNTA('Route Sweep'!A2:A${routeSweepLastRow})`, 'Deep-link route sweep'],
  ['Total checked entries', null, `=B5+B6`, 'Flows plus route sweep entries'],
  ['High findings', null, `=COUNTIF('Flow Checks'!F2:F${flowLastRow},"high")+COUNTIF('Route Sweep'!F2:F${routeSweepLastRow},"high")`, 'Must be zero before release'],
  ['Medium findings', null, `=COUNTIF('Flow Checks'!F2:F${flowLastRow},"medium")+COUNTIF('Route Sweep'!F2:F${routeSweepLastRow},"medium")`, 'Should be triaged/fixed'],
  ['Clean flows', null, `=COUNTIF('Flow Checks'!F2:F${flowLastRow},"none")`, 'Severity none'],
  ['Clean route sweep checks', null, `=COUNTIF('Route Sweep'!F2:F${routeSweepLastRow},"none")`, 'Severity none'],
  ['Route files inventoried', null, `=COUNTA('Route Inventory'!A2:A${routeLastRow})`, 'Expo Router pages under app/'],
  ['Routes with role-flow coverage', null, `=COUNTIF('Route Inventory'!E2:E${routeLastRow},"Direct flow")+COUNTIF('Route Inventory'!E2:E${routeLastRow},"Direct flow + route sweep")`, 'Exact dynamic-pattern match'],
  ['Routes with route-sweep coverage', null, `=COUNTIF('Route Inventory'!E2:E${routeLastRow},"Route sweep")+COUNTIF('Route Inventory'!E2:E${routeLastRow},"Direct flow + route sweep")`, 'Deep-link sweep match'],
  ['Routes not directly checked', null, `=COUNTIF('Route Inventory'!E2:E${routeLastRow},"Not directly checked")`, 'Explicit follow-up backlog'],
  ['Final status', 'Clean checked flows and clean route sweep; inventory backlog is formula-driven', null, 'See Limitations sheet'],
];
writeRows(summary, summaryRows);
summary.getRange('A1:D1').merge();
summary.getRange('A1').values = [['Clubroom App UI Audit']];
summary.getRange('A5:A15').format = { font: { bold: true } };
summary.getRange('B5:B15').formulas = summaryRows.slice(4, 15).map((row) => [row[2]]);
styleSheet(summary, summaryRows, [28, 20, 44, 48]);
summary.getRange('A1:D1').format = {
  fill: '#0B1F2A',
  font: { bold: true, color: '#FFFFFF', size: 16 },
};
summary.getRange('B2').setNumberFormat('yyyy-mm-dd h:mm');

writeRows(flowSheet, flowRows);
styleSheet(flowSheet, flowRows, [16, 34, 42, 66, 12, 12, 54, 10, 12, 70, 72]);
addConditionalSeverity(flowSheet, flowRows.length, 5);
flowSheet.getRangeByIndexes(1, 7, flowRows.length - 1, 2).format = {
  numberFormat: '#,##0',
};

writeRows(routeSweepSheet, routeSweepRows);
styleSheet(routeSweepSheet, routeSweepRows, [42, 56, 66, 14, 12, 12, 64, 12, 52, 86, 72]);
addConditionalSeverity(routeSweepSheet, routeSweepRows.length, 5);
routeSweepSheet.getRangeByIndexes(1, 7, routeSweepRows.length - 1, 1).format = {
  numberFormat: '#,##0',
};

writeRows(routeSheet, routeRows);
styleSheet(routeSheet, routeRows, [42, 56, 46, 58, 26, 62]);
addCoverageFormatting(routeSheet, routeRows.length, 4);

const fixRows = [['Area', 'Files', 'Change', 'Recheck evidence'], ...fixes];
writeRows(fixSheet, fixRows);
styleSheet(fixSheet, fixRows, [28, 54, 76, 46]);

const validationRows = [['Check', 'Command / Evidence', 'Result'], ...validations];
writeRows(validationSheet, validationRows);
styleSheet(validationSheet, validationRows, [30, 86, 76]);

const limitationRows = [['Area', 'Status', 'Detail'], ...limitations];
writeRows(limitationSheet, limitationRows);
styleSheet(limitationSheet, limitationRows, [28, 28, 92]);

for (const sheet of workbook.worksheets.items) {
  const preview = await workbook.render({
    sheetName: sheet.name,
    autoCrop: 'all',
    scale: 1,
    format: 'png',
  });
  await fs.writeFile(
    path.join(outputDir, `${sheet.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const summaryInspect = await workbook.inspect({
  kind: 'table',
  range: 'Summary!A1:D16',
  include: 'values,formulas',
  tableMaxRows: 18,
  tableMaxCols: 6,
});
console.log(summaryInspect.ndjson);
const formulaErrors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 300 },
  summary: 'final formula error scan',
});
console.log(formulaErrors.ndjson);
await fs.writeFile(inspectPath, `${summaryInspect.ndjson}\n${formulaErrors.ndjson}\n`);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(JSON.stringify({ outputPath, flows: flowRows.length - 1, routes: routeRows.length - 1 }));
