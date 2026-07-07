import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const baseUrl = process.env.UI_BASE_URL || 'http://localhost:8083';
const outDir = process.env.ROUTE_SWEEP_OUT_DIR || '/tmp/clubroom-route-sweep-2026-07-05T233500Z';
const defaultChromeExecutable = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let forcedBrowserExit = false;

const creds = {
  coach: { username: 'amelia.shaw@clubroom.demo', password: 'coach' },
  parent: { username: 'olivia.barton@clubroom.demo', password: 'user' },
  athlete: { username: 'alex.barton@clubroom.demo', password: 'user' },
  admin: { username: 'clara.finch@clubroom.demo', password: 'admin' },
};

const seedIds = {
  athleteId: 'ath_7df7ec13-e136-7525-985f-dec069fc983f',
  childId: 'ath_7df7ec13-e136-7525-985f-dec069fc983f',
  userId: 'usr_65972cc3-8f9b-7199-b867-7df5b7faf34b',
  coachId: 'usr_65972cc3-8f9b-7199-b867-7df5b7faf34b',
  publicCoachId: 'coach-1',
  memberId: 'usr_197727c3-a2c5-7868-8c57-72b09c97a1d6',
  clubId: 'clb_4ee614a0-62ee-73ff-9328-0f74a326c2c1',
  squadId: 'sqd_9640510a-e7cb-7575-a2a7-649ac28b5ee2',
  bookingId: 'bok_f993aa3d-e029-7c1f-8871-4eaa75c41ce4',
  cancelBookingId: 'bok_654fdfa8-58fd-7bfc-9567-35fdb38556c2',
  eventId: 'evt_2b479bfb-0ade-7bb7-814a-b94aa8725388',
  activityId: 'club_activity:club_event:evt_2b479bfb-0ade-7bb7-814a-b94aa8725388',
  communityGroupId: 'grp_ebb2d231-f5f3-7af8-9bda-32dc5cf5fde0',
  groupId: 'grp_ebb2d231-f5f3-7af8-9bda-32dc5cf5fde0',
  groupSessionId: 'gse_9f4bc127-c419-7567-bb8b-1a64cf2ec962',
  sessionId: 'gse_9f4bc127-c419-7567-bb8b-1a64cf2ec962',
  invoiceId: 'invc_1a167462-100c-7508-b16c-091c1e76850e',
  inviteId: 'inv_78278060-ab10-77ae-8079-0738f085430d',
  matchId: 'match_1',
  videoId: 'vid_36dd0de1-ef61-76e8-865c-bdfaf55d0f28',
  availabilityTemplateId: 'avt_4603aff6-ec68-759a-9b68-9e19af98cc52',
};

const finalReportPaths = [
  '/tmp/clubroom-goal-ui-flow-coach-rerun5-seed-2026-07-05T232100Z/report.json',
  '/tmp/clubroom-goal-ui-flow-parent-rerun3-seed-2026-07-05T231400Z/report.json',
  '/tmp/clubroom-goal-ui-flow-athlete-rerun6-seed-2026-07-05T231600Z/report.json',
  '/tmp/clubroom-goal-ui-flow-admin-rerun3-seed-2026-07-05T232000Z/report.json',
];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
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
    if (part === '_layout' || part === '+html') return null;
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

function concretePath(pattern) {
  if (pattern === '/availability/edit-template') {
    return `/availability/edit-template?id=${encodeURIComponent(seedIds.availabilityTemplateId)}`;
  }
  const segments = pattern.split('/');
  const concrete = [];
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    if (!segment) continue;
    if (segment.startsWith('*')) return null;
    if (!segment.startsWith(':')) {
      concrete.push(segment);
      continue;
    }
    const name = segment.slice(1);
    const previous = concrete[concrete.length - 1] ?? '';
    if (name === 'coachId' && segments[i + 1] === 'public') {
      concrete.push(seedIds.publicCoachId);
    } else if (seedIds[name]) {
      concrete.push(seedIds[name]);
    } else if (name === 'id' && previous === 'book') {
      concrete.push(seedIds.coachId);
    } else if (name === 'id' && previous === 'booking') {
      concrete.push(segments[i + 1] === 'cancel' ? seedIds.cancelBookingId : seedIds.bookingId);
    } else if (name === 'id' && previous === 'bookings') {
      concrete.push(seedIds.bookingId);
    } else if (name === 'id' && previous === 'club') {
      concrete.push(seedIds.clubId);
    } else if (name === 'id' && previous === 'squad') {
      concrete.push(seedIds.squadId);
    } else if (name === 'id' && previous === 'squads') {
      concrete.push(seedIds.squadId);
    } else if (name === 'id' && previous === 'group-sessions') {
      concrete.push(seedIds.groupSessionId);
    } else if (name === 'id' && previous === 'events') {
      concrete.push(seedIds.eventId);
    } else if (name === 'id' && previous === 'invoices') {
      concrete.push(seedIds.invoiceId);
    } else if (name === 'id' && previous === 'matches') {
      concrete.push(seedIds.matchId);
    } else if (name === 'id' && previous === 'session') {
      concrete.push(seedIds.groupSessionId);
    } else if (name === 'id' && previous === 'session-invites') {
      concrete.push(seedIds.inviteId);
    } else if (name === 'id' && previous === 'videos') {
      concrete.push(seedIds.videoId);
    } else if (name === 'id' && previous === 'coach') {
      concrete.push(seedIds.publicCoachId);
    } else if (name === 'id' && previous === 'health') {
      concrete.push(seedIds.athleteId);
    } else if (name === 'id' && previous === 'chat') {
      concrete.push('thread_group_offering_u15_pressing');
    } else if (name === 'legacy' && previous === 'family') {
      concrete.push('index');
    } else if (name === 'legacy' && previous === 'manage') {
      concrete.push('bookings');
    } else {
      return null;
    }
  }
  return `/${concrete.join('/')}`;
}

function chooseRole(routePath) {
  if (routePath.includes('/special-needs')) return 'coach';
  if (
    routePath === '/bookings/subscribe' ||
    routePath === '/bookings/session-feedback' ||
    routePath.startsWith('/booking/') ||
    routePath.startsWith('/review/') ||
    routePath.startsWith('/session-notes/') ||
    (routePath.startsWith('/events/') && routePath.endsWith('/rsvp')) ||
    (routePath.startsWith('/session/') && routePath.endsWith('/rsvp'))
  ) return 'parent';
  if (routePath.startsWith('/admin') || routePath.includes('/dashboard')) return 'admin';
  if (routePath.includes('/member/')) return 'admin';
  if (
    routePath.startsWith('/family') ||
    routePath.startsWith('/children') ||
    routePath.startsWith('/child') ||
    routePath.startsWith('/edit-child') ||
    routePath.startsWith('/add-child') ||
    routePath.startsWith('/book/')
  ) {
    return 'parent';
  }
  if (routePath.startsWith('/health') || routePath.startsWith('/development/athlete')) {
    return 'athlete';
  }
  return 'coach';
}

function normalizeFlowPath(value) {
  return String(value ?? '').split('?')[0] || '/';
}

async function login(page, role) {
  const { username, password } = creds[role];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(800);
    const usernameInput = page.getByPlaceholder('e.g. coach');
    if (!(await usernameInput.isVisible().catch(() => false))) return;
    try {
      await usernameInput.fill(username);
      const passwordInput = page.getByPlaceholder('••••••••');
      await passwordInput.fill(password);
      await passwordInput.press('Enter');
      await usernameInput.waitFor({ state: 'hidden', timeout: 45000 });
      await page.waitForTimeout(1200);
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
      await page.waitForTimeout(1000);
    }
  }
}

async function resolveBrowserExecutable() {
  const candidate = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || defaultChromeExecutable;
  return fs.access(candidate).then(() => candidate).catch(() => null);
}

async function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function closeContext(context) {
  await withTimeout(context.close(), 5000, 'browser context close').catch((error) => {
    console.warn(JSON.stringify({ warning: String(error) }));
  });
}

async function closeBrowser(browser) {
  await withTimeout(browser.close(), 5000, 'browser close').catch((error) => {
    console.warn(JSON.stringify({ warning: String(error) }));
    forcedBrowserExit = true;
    if (typeof browser.process === 'function') {
      browser.process()?.kill('SIGKILL');
    }
  });
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const visibleText = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
    const issues = [];
    if (/\b(?:usr|ath|clb|sqd)_[0-9a-f][0-9a-f-]{6,}\b/i.test(visibleText)) issues.push('copy:raw_internal_identifier_visible');
    if (/\b(?:one_to_one|small_group|group_session)\b/i.test(visibleText)) issues.push('copy:raw_service_type_visible');
    if (/\bCoach unavailable\b/i.test(visibleText)) issues.push('state:coach_unavailable_visible');
    if (/\bseeded\b/i.test(visibleText)) issues.push('copy:seeded_demo_copy_visible');
    if (/\bUnmatched Route\b/i.test(visibleText) || /\bPage could not be found\b/i.test(visibleText)) issues.push('route:unmatched_route_visible');
    const overflow = Math.max(
      (document.documentElement?.scrollWidth || 0) - window.innerWidth,
      (document.body?.scrollWidth || 0) - window.innerWidth,
      0,
    );
    return {
      issues,
      nestedButtons: document.querySelectorAll('button button').length,
      horizontalOverflow: Math.round(overflow),
      textPreview: visibleText.slice(0, 220),
      path: window.location.pathname,
    };
  });
}

function renderedExpectedMissingState(metrics) {
  const text = metrics?.textPreview ?? '';
  return /\b(not found|unavailable|could not be loaded|could not be found|could not be located|no longer available|unable to load|failed to load|may have been removed|has expired|already been handled|missing [a-z ]*id|missing [a-z ]*context)\b/i.test(text);
}

function isExpectedMissingConsole(issue) {
  return (
    /^response:(404|403):/i.test(issue) ||
    /status of 404 \(Not Found\)/i.test(issue) ||
    /status of 403 \(Forbidden\)/i.test(issue) ||
    /^console:Error data:/i.test(issue) ||
    /^console:(Stack|Message):/i.test(issue) ||
    /^console:\[ERROR\].*Failed to (load|get)/i.test(issue) ||
    /\b(resource_not_found|not found|not_found)\b/i.test(issue) ||
    /\bFailed to load .* via API\b/i.test(issue) ||
    /\bFailed to load .* via \/v1\b/i.test(issue) ||
    /\bFailed to load .* through API authority\b/i.test(issue) ||
    /\bFailed to get .* via API\b/i.test(issue)
  );
}

await fs.mkdir(outDir, { recursive: true });

const flowReports = await Promise.all(
  finalReportPaths.map((file) => fs.readFile(file, 'utf8').then(JSON.parse)),
);
const coveredPaths = flowReports
  .flatMap((report) => report.results)
  .map((result) => normalizeFlowPath(result.path));

const routeFiles = (await walk(path.join(repoRoot, 'app')))
  .filter((file) => /\.(tsx|ts|jsx|js)$/.test(file))
  .filter((file) => !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'))
  .map((file) => {
    const pattern = toRoutePattern(file);
    return pattern ? { pattern, file: path.relative(repoRoot, file) } : null;
  })
  .filter(Boolean);

const staticChildren = staticChildSegmentsByPrefix(routeFiles);

const candidates = routeFiles
  .filter((route) => !route.pattern.startsWith('/+'))
  .filter((route) => !coveredPaths.some((flowPath) => pathMatchesPattern(route.pattern, flowPath, staticChildren)))
  .map((route) => ({ ...route, concretePath: concretePath(route.pattern) }))
  .filter((route) => route.concretePath !== null)
  .map((route) => ({ ...route, role: chooseRole(route.concretePath) }))
  .sort((a, b) => a.concretePath.localeCompare(b.concretePath));

const routeSweepStart = Number.parseInt(process.env.ROUTE_SWEEP_START ?? '0', 10);
const routeSweepLimit = Number.parseInt(
  process.env.ROUTE_SWEEP_LIMIT ?? String(candidates.length),
  10,
);
const selectedCandidates = candidates.slice(routeSweepStart, routeSweepStart + routeSweepLimit);

const executablePath = await resolveBrowserExecutable();
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const contexts = {};
const results = [];
try {
  for (const role of Object.keys(creds)) {
    const context = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await context.newPage();
    await login(page, role);
    contexts[role] = { context, page };
  }

  for (const route of selectedCandidates) {
    const { page } = contexts[route.role];
    const errors = [];
    page.removeAllListeners('console');
    page.removeAllListeners('requestfailed');
    page.removeAllListeners('pageerror');
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (/^Failed to load resource: the server responded with a status of \d+ \(/i.test(text)) return;
      errors.push(`console:${text}`);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`response:${response.status()}:${response.url()}`);
    });
    page.on('requestfailed', (request) => {
      const failure = request.failure()?.errorText;
      if (failure && failure !== 'net::ERR_ABORTED') errors.push(`requestfailed:${failure}:${request.url()}`);
    });
    page.on('pageerror', (error) => errors.push(`pageerror:${error.message}`));

    let metrics = null;
    let status = 'ok';
    let severity = 'none';
    const startedAt = Date.now();
    try {
      await login(page, route.role);
      await page.goto(`${baseUrl}${route.concretePath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1200);
      await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});
      const loginVisible = await page.getByPlaceholder('e.g. coach').isVisible().catch(() => false);
      metrics = await collectMetrics(page);
      if (loginVisible) errors.push('auth:login_form_visible_after_navigation');
      if (metrics.nestedButtons > 0) errors.push(`ui:nested_buttons:${metrics.nestedButtons}`);
      if (metrics.horizontalOverflow > 6) errors.push(`ui:horizontal_overflow:${metrics.horizontalOverflow}px`);
      errors.push(...metrics.issues);
      if (renderedExpectedMissingState(metrics)) {
        const filtered = errors.filter((issue) => !isExpectedMissingConsole(issue));
        errors.splice(0, errors.length, ...filtered);
      }
      if (errors.includes('route:unmatched_route_visible') || errors.some((issue) => issue.startsWith('auth:'))) {
        status = 'failed';
        severity = 'high';
      } else if (errors.length > 0) {
        severity = 'medium';
      }
    } catch (error) {
      status = 'failed';
      severity = 'high';
      errors.push(`navigation_failed:${String(error)}`);
    }
    const issues = Array.from(new Set(errors));
    const result = {
      routePattern: route.pattern,
      sourceFile: route.file,
      path: route.concretePath,
      role: route.role,
      status,
      severity,
      issues,
      currentPath: metrics?.path ?? '',
      durationMs: Date.now() - startedAt,
      textPreview: metrics?.textPreview ?? '',
    };
    results.push(result);
    console.log(JSON.stringify(result));
  }
} finally {
  for (const entry of Object.values(contexts)) await closeContext(entry.context);
  await closeBrowser(browser);
}

const totals = {
  total: results.length,
  ok: results.filter((result) => result.status === 'ok').length,
  failed: results.filter((result) => result.status === 'failed').length,
  high: results.filter((result) => result.severity === 'high').length,
  medium: results.filter((result) => result.severity === 'medium').length,
  none: results.filter((result) => result.severity === 'none').length,
};
await fs.writeFile(path.join(outDir, 'route-sweep-report.json'), JSON.stringify({ baseUrl, totals, results }, null, 2));
console.log(
  JSON.stringify(
    {
      outDir,
      totals,
      candidates: candidates.length,
      selected: selectedCandidates.length,
      start: routeSweepStart,
      limit: routeSweepLimit,
    },
    null,
    2,
  ),
);
if (forcedBrowserExit) {
  process.exit(0);
}
