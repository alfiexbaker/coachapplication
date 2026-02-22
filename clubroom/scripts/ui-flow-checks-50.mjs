import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.UI_BASE_URL || 'http://localhost:8083';
const defaultOutDir = process.env.UI_FLOW_OUT_DIR || '/tmp/ui-flow-checks-50';
const failLevels = ['none', 'high', 'medium'];
let chromium = null;
let devices = null;

const creds = {
  coach: { username: 'coach1', password: 'coach' },
  parent: { username: 'parent1', password: 'user' },
  athlete: { username: 'user1', password: 'user' },
};

async function ensurePlaywrightLoaded() {
  if (chromium && devices) {
    return;
  }

  try {
    const playwright = await import('playwright');
    chromium = playwright.chromium;
    devices = playwright.devices;
  } catch (error) {
    throw new Error(
      `Playwright is required to run UI flow checks. Install it with "npm install --save-dev playwright". ${String(error)}`,
    );
  }
}

/**
 * Flow actions are intentionally minimal and resilient:
 * - We never hard-fail on optional actions.
 * - We gather route-level UI diagnostics and screenshots for every flow.
 */
const flows = [
  // Coach flows
  { id: 'coach_home', role: 'coach', title: 'Coach opens dashboard', path: '/' },
  { id: 'coach_schedule', role: 'coach', title: 'Coach opens schedule', path: '/schedule' },
  { id: 'coach_athletes', role: 'coach', title: 'Coach opens athletes', path: '/athletes' },
  { id: 'coach_feed', role: 'coach', title: 'Coach opens feed', path: '/feed' },
  { id: 'coach_messages', role: 'coach', title: 'Coach opens messages', path: '/messages' },
  { id: 'coach_bookings', role: 'coach', title: 'Coach opens bookings', path: '/bookings' },
  { id: 'coach_settings', role: 'coach', title: 'Coach opens settings', path: '/settings' },
  {
    id: 'coach_progress',
    role: 'coach',
    title: 'Coach opens development progress',
    path: '/development/my-progress',
  },
  { id: 'coach_goals', role: 'coach', title: 'Coach opens goals', path: '/goals' },
  { id: 'coach_badges', role: 'coach', title: 'Coach opens achievements', path: '/badges' },
  { id: 'coach_skills', role: 'coach', title: 'Coach opens skill trees', path: '/skills' },
  {
    id: 'coach_discover_sessions',
    role: 'coach',
    title: 'Coach opens discover sessions',
    path: '/discover-sessions',
  },
  {
    id: 'coach_availability_calendar',
    role: 'coach',
    title: 'Coach opens availability calendar',
    path: '/availability/calendar',
  },
  {
    id: 'coach_availability_rules',
    role: 'coach',
    title: 'Coach opens cancellation policy',
    path: '/settings/cancellation-policy',
  },
  {
    id: 'coach_group_sessions',
    role: 'coach',
    title: 'Coach opens group sessions',
    path: '/group-sessions/index',
  },
  {
    id: 'coach_group_sessions_create',
    role: 'coach',
    title: 'Coach opens create group session',
    path: '/group-sessions/create',
  },
  {
    id: 'coach_create_invite_entry',
    role: 'coach',
    title: 'Coach opens create/invite hub',
    path: '/sessions/create',
  },
  {
    id: 'coach_make_appointment',
    role: 'coach',
    title: 'Coach starts booking a new appointment',
    path: '/sessions/create',
    actions: [{ type: 'clickButton', name: 'Book New Session', required: true }],
  },
  {
    id: 'coach_invite_existing',
    role: 'coach',
    title: 'Coach starts invite-to-existing flow',
    path: '/sessions/create',
    actions: [{ type: 'clickButton', name: 'Add to Existing Session', required: true }],
  },
  {
    id: 'coach_session_invites',
    role: 'coach',
    title: 'Coach opens invite inbox',
    path: '/session-invites/index',
  },
  {
    id: 'coach_session_invites_create_redirect',
    role: 'coach',
    title: 'Coach hits invite redirect',
    path: '/session-invites/create',
  },
  { id: 'coach_club_settings', role: 'coach', title: 'Coach opens club settings', path: '/club/settings' },
  { id: 'coach_club_create', role: 'coach', title: 'Coach opens create club', path: '/club/create' },
  {
    id: 'coach_squad_create',
    role: 'coach',
    title: 'Coach opens create squad',
    path: '/club/squad/create',
  },
  {
    id: 'coach_squad_detail',
    role: 'coach',
    title: 'Coach opens squad detail',
    path: '/club/squad/squad_u15',
  },
  {
    id: 'coach_add_member_to_squad',
    role: 'coach',
    title: 'Coach opens add-member panel inside squad',
    path: '/club/squad/squad_u15',
    actions: [{ type: 'clickButton', name: 'Add', required: true }],
  },
  {
    id: 'coach_squad_invite_screen',
    role: 'coach',
    title: 'Coach opens squad invite screen',
    path: '/squads/squad_u15/invite',
  },
  {
    id: 'coach_manage',
    role: 'coach',
    title: 'Coach opens management hub',
    path: '/manage',
  },
  {
    id: 'coach_club_invite_members',
    role: 'coach',
    title: 'Coach opens club invite members',
    path: '/club/invite-members',
  },
  { id: 'coach_rate', role: 'coach', title: 'Coach opens rate screen', path: '/rate-coach' },

  // Parent flows
  { id: 'parent_home', role: 'parent', title: 'Parent opens dashboard', path: '/' },
  { id: 'parent_children', role: 'parent', title: 'Parent opens children', path: '/children' },
  { id: 'parent_feed', role: 'parent', title: 'Parent opens feed', path: '/feed' },
  { id: 'parent_messages', role: 'parent', title: 'Parent opens messages', path: '/messages' },
  { id: 'parent_bookings', role: 'parent', title: 'Parent opens bookings', path: '/bookings' },
  { id: 'parent_settings', role: 'parent', title: 'Parent opens settings', path: '/settings' },
  { id: 'parent_family', role: 'parent', title: 'Parent opens family dashboard', path: '/family' },
  {
    id: 'parent_family_calendar',
    role: 'parent',
    title: 'Parent opens family calendar',
    path: '/family/calendar',
  },
  {
    id: 'parent_family_spending',
    role: 'parent',
    title: 'Parent opens family spending',
    path: '/family/spending',
  },
  {
    id: 'parent_discover_sessions',
    role: 'parent',
    title: 'Parent opens discover sessions',
    path: '/discover-sessions',
  },
  { id: 'parent_favourites', role: 'parent', title: 'Parent opens favourites', path: '/favourites' },
  { id: 'parent_book_coach', role: 'parent', title: 'Parent opens find coach', path: '/book-coach' },
  {
    id: 'parent_progress',
    role: 'parent',
    title: 'Parent opens my progress',
    path: '/development/my-progress',
  },
  {
    id: 'parent_child_progress',
    role: 'parent',
    title: 'Parent opens child progress',
    path: '/development/child-progress/user1',
  },
  { id: 'parent_goals', role: 'parent', title: 'Parent opens goals', path: '/goals' },
  { id: 'parent_skills', role: 'parent', title: 'Parent opens skills', path: '/skills' },
  { id: 'parent_badges', role: 'parent', title: 'Parent opens achievements', path: '/badges' },
  { id: 'parent_rate', role: 'parent', title: 'Parent opens rate coach', path: '/rate-coach' },
  { id: 'parent_book_flow_start', role: 'parent', title: 'Parent opens book flow home', path: '/book/coach1' },
  {
    id: 'parent_book_flow_type',
    role: 'parent',
    title: 'Parent opens session-type step',
    path: '/book/coach1/session-type',
  },
  {
    id: 'parent_book_flow_schedule',
    role: 'parent',
    title: 'Parent opens schedule step',
    path: '/book/coach1/schedule',
  },
  {
    id: 'parent_book_flow_details',
    role: 'parent',
    title: 'Parent opens details step',
    path: '/book/coach1/details',
  },
  {
    id: 'parent_book_flow_review',
    role: 'parent',
    title: 'Parent opens review step',
    path: '/book/coach1/review',
  },
  {
    id: 'parent_book_flow_confirmation',
    role: 'parent',
    title: 'Parent opens confirmation step',
    path: '/book/coach1/confirmation',
  },

  // Athlete flows
  { id: 'athlete_home', role: 'athlete', title: 'Athlete opens dashboard', path: '/' },
  { id: 'athlete_feed', role: 'athlete', title: 'Athlete opens feed', path: '/feed' },
  { id: 'athlete_messages', role: 'athlete', title: 'Athlete opens messages', path: '/messages' },
  { id: 'athlete_bookings', role: 'athlete', title: 'Athlete opens bookings', path: '/bookings' },
  { id: 'athlete_settings', role: 'athlete', title: 'Athlete opens settings', path: '/settings' },
  {
    id: 'athlete_progress',
    role: 'athlete',
    title: 'Athlete opens my progress',
    path: '/development/my-progress',
  },
  { id: 'athlete_goals', role: 'athlete', title: 'Athlete opens goals', path: '/goals' },
  { id: 'athlete_skills', role: 'athlete', title: 'Athlete opens skills', path: '/skills' },
  { id: 'athlete_badges', role: 'athlete', title: 'Athlete opens achievements', path: '/badges' },
  {
    id: 'athlete_analytics',
    role: 'athlete',
    title: 'Athlete opens analytics view',
    path: '/analytics/user1',
  },
  { id: 'athlete_rate', role: 'athlete', title: 'Athlete opens rate coach', path: '/rate-coach' },
  {
    id: 'athlete_discover_sessions',
    role: 'athlete',
    title: 'Athlete opens discover sessions',
    path: '/discover-sessions',
  },
  { id: 'athlete_favourites', role: 'athlete', title: 'Athlete opens favourites', path: '/favourites' },
  { id: 'athlete_find_coach', role: 'athlete', title: 'Athlete opens find coach', path: '/book-coach' },
  { id: 'athlete_chat_list', role: 'athlete', title: 'Athlete opens chat list', path: '/chat/index' },
];

function flowFile(flow) {
  return `${flow.role}__${flow.id}.png`;
}

const allowedRoles = Object.keys(creds);

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseNonNegativeInt(value, flagName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flagName} must be a non-negative integer.`);
  }
  return parsed;
}

function parsePositiveInt(value, flagName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer.`);
  }
  return parsed;
}

function parseCliOptions(argv) {
  const envFailOn = (process.env.UI_FLOW_FAIL_ON || 'high').toLowerCase();
  if (!failLevels.includes(envFailOn)) {
    throw new Error(
      `UI_FLOW_FAIL_ON must be one of: ${failLevels.join(', ')} (received "${envFailOn}")`,
    );
  }

  const options = {
    outDir: defaultOutDir,
    roles: [],
    chunkSize:
      process.env.UI_FLOW_CHUNK_SIZE !== undefined
        ? parseNonNegativeInt(process.env.UI_FLOW_CHUNK_SIZE, 'UI_FLOW_CHUNK_SIZE')
        : 0,
    chunkIndex:
      process.env.UI_FLOW_CHUNK_INDEX !== undefined
        ? parsePositiveInt(process.env.UI_FLOW_CHUNK_INDEX, 'UI_FLOW_CHUNK_INDEX')
        : null,
    retries:
      process.env.UI_FLOW_RETRIES !== undefined
        ? parseNonNegativeInt(process.env.UI_FLOW_RETRIES, 'UI_FLOW_RETRIES')
        : 1,
    headless: process.env.UI_FLOW_HEADED === '1' ? false : true,
    listOnly: false,
    helpOnly: false,
    failOn: envFailOn,
    pauseMs:
      process.env.UI_FLOW_PAUSE_MS !== undefined
        ? parseNonNegativeInt(process.env.UI_FLOW_PAUSE_MS, 'UI_FLOW_PAUSE_MS')
        : 900,
  };

  if (process.env.UI_FLOW_ROLES) {
    options.roles.push(...parseList(process.env.UI_FLOW_ROLES));
  }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.helpOnly = true;
      continue;
    }
    if (arg === '--list') {
      options.listOnly = true;
      continue;
    }
    if (arg === '--headed') {
      options.headless = false;
      continue;
    }
    if (arg.startsWith('--roles=')) {
      options.roles.push(...parseList(arg.slice('--roles='.length)));
      continue;
    }
    if (arg.startsWith('--role=')) {
      options.roles.push(arg.slice('--role='.length).trim().toLowerCase());
      continue;
    }
    if (arg.startsWith('--out-dir=')) {
      options.outDir = arg.slice('--out-dir='.length).trim();
      continue;
    }
    if (arg.startsWith('--chunk-size=')) {
      options.chunkSize = parseNonNegativeInt(arg.slice('--chunk-size='.length), '--chunk-size');
      continue;
    }
    if (arg.startsWith('--chunk-index=')) {
      options.chunkIndex = parsePositiveInt(arg.slice('--chunk-index='.length), '--chunk-index');
      continue;
    }
    if (arg.startsWith('--retries=')) {
      options.retries = parseNonNegativeInt(arg.slice('--retries='.length), '--retries');
      continue;
    }
    if (arg.startsWith('--pause-ms=')) {
      options.pauseMs = parseNonNegativeInt(arg.slice('--pause-ms='.length), '--pause-ms');
      continue;
    }
    if (arg.startsWith('--fail-on=')) {
      options.failOn = arg.slice('--fail-on='.length).trim().toLowerCase();
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const uniqueRoles = Array.from(new Set(options.roles));
  const invalidRole = uniqueRoles.find((role) => !allowedRoles.includes(role));
  if (invalidRole) {
    throw new Error(`Invalid role "${invalidRole}". Allowed roles: ${allowedRoles.join(', ')}`);
  }
  if (!failLevels.includes(options.failOn)) {
    throw new Error(`--fail-on must be one of: ${failLevels.join(', ')}`);
  }

  return {
    ...options,
    roles: uniqueRoles.length > 0 ? uniqueRoles : [...allowedRoles],
  };
}

function usageText() {
  return [
    'UI flow checks (50+) options:',
    '',
    '  --help, -h                 Show help and exit',
    '  --list                     Show available roles/flow counts and exit',
    '  --roles=coach,parent       Run only specific roles',
    '  --role=coach               Add one role (repeatable)',
    '  --chunk-size=10            Split each role into chunks of N flows',
    '  --chunk-index=2            Run only chunk N (1-based) for selected role(s)',
    '  --retries=1                Retry login and flow navigation failures N times',
    '  --pause-ms=900             Wait between navigation/action steps in ms',
    '  --fail-on=high             Exit non-zero on: none | high | medium',
    '  --out-dir=/tmp/path        Output directory for screenshots/reports',
    '  --headed                   Run browser headed (not headless)',
    '',
    'Environment overrides:',
    '  UI_BASE_URL                Base URL (default: http://localhost:8083)',
    '  UI_FLOW_OUT_DIR            Output directory',
    '  UI_FLOW_ROLES              Comma-separated roles',
    '  UI_FLOW_CHUNK_SIZE         Chunk size',
    '  UI_FLOW_CHUNK_INDEX        Chunk index (1-based)',
    '  UI_FLOW_RETRIES            Retry count',
    '  UI_FLOW_PAUSE_MS           Pause duration',
    '  UI_FLOW_FAIL_ON            none | high | medium',
    '  UI_FLOW_HEADED=1           Headed mode',
  ].join('\n');
}

function splitIntoChunks(items, chunkSize) {
  if (chunkSize <= 0 || chunkSize >= items.length) {
    return [items];
  }

  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function buildTotals(results) {
  return {
    total: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    failed: results.filter((r) => r.status === 'failed').length,
    high: results.filter((r) => r.severity === 'high').length,
    medium: results.filter((r) => r.severity === 'medium').length,
    none: results.filter((r) => r.severity === 'none').length,
  };
}

function buildReport(results, meta = {}) {
  return {
    baseUrl,
    generatedAt: new Date().toISOString(),
    meta,
    totals: buildTotals(results),
    results,
  };
}

function shouldFailRun(totals, failOn) {
  if (failOn === 'none') {
    return { shouldFail: false, reason: '' };
  }
  if (failOn === 'high') {
    const shouldFail = totals.high > 0;
    return {
      shouldFail,
      reason: shouldFail ? `high severity findings detected (${totals.high})` : '',
    };
  }
  const mediumOrHigher = totals.high + totals.medium;
  const shouldFail = mediumOrHigher > 0;
  return {
    shouldFail,
    reason: shouldFail
      ? `medium-or-higher findings detected (high=${totals.high}, medium=${totals.medium})`
      : '',
  };
}

function buildMarkdown(report, title) {
  const markdownLines = [
    `# ${title}`,
    '',
    `- Base URL: ${report.baseUrl}`,
    `- Generated: ${report.generatedAt}`,
    `- Total flows: ${report.totals.total}`,
    `- Failed: ${report.totals.failed}`,
    `- High: ${report.totals.high}`,
    `- Medium: ${report.totals.medium}`,
  ];

  if (report.meta.roles?.length) {
    markdownLines.push(`- Roles: ${report.meta.roles.join(', ')}`);
  }
  if (report.meta.chunkSize) {
    markdownLines.push(`- Chunk size: ${report.meta.chunkSize}`);
  }
  if (report.meta.chunkIndex !== undefined && report.meta.chunkIndex !== null) {
    markdownLines.push(`- Chunk index: ${report.meta.chunkIndex}`);
  }
  if (report.meta.retries !== undefined) {
    markdownLines.push(`- Retries: ${report.meta.retries}`);
  }

  markdownLines.push('', '## High / Medium Findings', '');

  const findings = report.results.filter((r) => r.severity === 'high' || r.severity === 'medium');
  if (findings.length === 0) {
    markdownLines.push('- None');
  } else {
    for (const item of findings) {
      markdownLines.push(
        `- [${item.severity.toUpperCase()}] ${item.id} (${item.path}) :: ${item.issues.join(' | ')}`,
      );
    }
  }

  return `${markdownLines.join('\n')}\n`;
}

async function writeReportFiles(report, outDir, stem, title) {
  await fs.writeFile(path.join(outDir, `${stem}.json`), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, `${stem}.md`), buildMarkdown(report, title));
}

async function writePartialReport(allResults, options) {
  const partial = buildReport(allResults, {
    roles: options.roles,
    chunkSize: options.chunkSize || undefined,
    chunkIndex: options.chunkIndex,
    retries: options.retries,
  });
  await fs.writeFile(path.join(options.outDir, 'report.partial.json'), JSON.stringify(partial, null, 2));
}

async function login(page, role) {
  const { username, password } = creds[role];
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1000);

  const usernameInput = page.getByPlaceholder('e.g. coach');
  const passwordInput = page.getByPlaceholder('••••••••');

  if (!(await usernameInput.isVisible().catch(() => false))) {
    return;
  }

  await usernameInput.fill(username);
  await passwordInput.fill(password);

  const loginButtonByRole = page.getByRole('button', { name: 'Log in', exact: true }).first();
  const loginButtonByText = page.getByText('Log in', { exact: true }).first();
  if (await loginButtonByRole.isVisible().catch(() => false)) {
    await loginButtonByRole.click();
  } else if (await loginButtonByText.isVisible().catch(() => false)) {
    await loginButtonByText.click();
  } else {
    await passwordInput.press('Enter');
  }

  await page.waitForFunction(
    () => {
      try {
        const localKeys = [
          'auth_user',
          '@auth_user',
          '@clubroom:auth_user',
          '@react-native-async-storage/auth_user',
        ];
        const hasAuthKey = localKeys.some((key) => Boolean(window.localStorage.getItem(key)));
        const loginFieldPresent = Boolean(document.querySelector('input[placeholder="e.g. coach"]'));
        return hasAuthKey || !loginFieldPresent;
      } catch {
        return false;
      }
    },
    undefined,
    { timeout: 45000 },
  );
  await page.waitForTimeout(1200);
}

async function loginWithRetry(page, role, retries) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      await login(page, role);
      return attempt;
    } catch (error) {
      lastError = error;
      if (attempt <= retries) {
        await page.waitForTimeout(800 * attempt);
      }
    }
  }
  throw lastError;
}

async function runAction(page, action, actionErrors) {
  try {
    if (action.type === 'clickButton') {
      await page.getByRole('button', { name: action.name }).first().click();
      await page.waitForTimeout(700);
      return;
    }

    if (action.type === 'clickText') {
      await page.getByText(action.text).first().click();
      await page.waitForTimeout(700);
      return;
    }

    if (action.type === 'wait') {
      await page.waitForTimeout(action.ms ?? 700);
      return;
    }
  } catch (error) {
    const message = `action_failed:${action.type}:${String(error)}`;
    if (action.required) {
      actionErrors.push(message);
    }
  }
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const viewportWidth = window.innerWidth;
    const horizontalOverflow = Math.max(
      (html?.scrollWidth || 0) - viewportWidth,
      (body?.scrollWidth || 0) - viewportWidth,
      0,
    );

    // Native web hydration safety: nested button controls are invalid.
    const nestedButtons = document.querySelectorAll('button button').length;

    return {
      viewportWidth,
      horizontalOverflow: Math.round(horizontalOverflow),
      nestedButtons,
    };
  });
}

function classify(flowErrors, actionErrors, metrics) {
  const issues = [];
  let severity = 'none';

  if (actionErrors.length > 0) {
    issues.push(...actionErrors);
    severity = 'high';
  }

  if (flowErrors.length > 0) {
    issues.push(...flowErrors);
    if (severity !== 'high') severity = 'medium';
  }

  if (metrics.nestedButtons > 0) {
    issues.push(`ui:nested_buttons:${metrics.nestedButtons}`);
    if (severity !== 'high') severity = 'medium';
  }

  if (metrics.horizontalOverflow > 6) {
    issues.push(`ui:horizontal_overflow:${metrics.horizontalOverflow}px`);
    if (severity !== 'high') severity = 'medium';
  }

  return { severity, issues };
}

async function runFlowWithRetry(page, flow, options, currentFlowErrors) {
  const start = Date.now();
  let lastError = null;
  let lastIssues = [];

  for (let attempt = 1; attempt <= options.retries + 1; attempt += 1) {
    currentFlowErrors.length = 0;
    const actionErrors = [];

    try {
      await page.goto(`${baseUrl}${flow.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(options.pauseMs);

      for (const action of flow.actions ?? []) {
        // eslint-disable-next-line no-await-in-loop
        await runAction(page, action, actionErrors);
      }

      const metrics = await collectMetrics(page);
      const screenshotPath = path.join(options.outDir, flowFile(flow));
      await page.screenshot({ path: screenshotPath, fullPage: false });
      const { severity, issues } = classify(currentFlowErrors, actionErrors, metrics);

      return {
        id: flow.id,
        role: flow.role,
        title: flow.title,
        path: flow.path,
        screenshot: screenshotPath,
        status: severity === 'high' ? 'failed' : 'ok',
        severity,
        issues,
        metrics,
        attempts: attempt,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      lastError = error;
      lastIssues = [...currentFlowErrors, ...actionErrors, `navigation_failed:${String(error)}`];
      if (attempt <= options.retries) {
        // Short backoff to ride out transient bundling/network hiccups in local/CI.
        // eslint-disable-next-line no-await-in-loop
        await page.waitForTimeout(1200 * attempt);
      }
    }
  }

  return {
    id: flow.id,
    role: flow.role,
    title: flow.title,
    path: flow.path,
    status: 'failed',
    severity: 'high',
    issues: lastIssues.length > 0 ? lastIssues : [`navigation_failed:${String(lastError)}`],
    attempts: options.retries + 1,
    durationMs: Date.now() - start,
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.helpOnly) {
    console.log(usageText());
    return;
  }
  await fs.mkdir(options.outDir, { recursive: true });

  const grouped = flows.reduce((acc, flow) => {
    if (!acc[flow.role]) acc[flow.role] = [];
    acc[flow.role].push(flow);
    return acc;
  }, {});

  if (options.listOnly) {
    const byRole = Object.fromEntries(
      allowedRoles.map((role) => [role, grouped[role] ? grouped[role].length : 0]),
    );
    console.log(
      JSON.stringify(
        {
          baseUrl,
          availableRoles: allowedRoles,
          selectedRoles: options.roles,
          totalFlows: flows.length,
          flowsByRole: byRole,
        },
        null,
        2,
      ),
    );
    return;
  }

  await ensurePlaywrightLoaded();
  const browser = await chromium.launch({ headless: options.headless });
  const allResults = [];
  const roleSummaries = [];

  try {
    for (const role of options.roles) {
      const roleFlows = grouped[role] ?? [];
      const chunks = splitIntoChunks(roleFlows, options.chunkSize);

      if (options.chunkIndex !== null && options.chunkIndex > chunks.length) {
        roleSummaries.push({
          role,
          skipped: true,
          reason: `chunk_index_out_of_range (${options.chunkIndex} > ${chunks.length})`,
        });
        continue;
      }

      const chunkIndices =
        options.chunkIndex === null ? chunks.map((_, index) => index) : [options.chunkIndex - 1];

      const roleResults = [];

      for (const chunkIdx of chunkIndices) {
        const chunkFlows = chunks[chunkIdx] ?? [];
        if (chunkFlows.length === 0) continue;

        const context = await browser.newContext({ ...devices['iPhone 13'] });
        const page = await context.newPage();
        let currentFlowErrors = [];

        page.on('console', (msg) => {
          if (msg.type() === 'error') currentFlowErrors.push(`console:${msg.text()}`);
        });
        page.on('pageerror', (err) => currentFlowErrors.push(`pageerror:${err.message}`));

        let loginError = null;
        let loginAttempts = 0;
        try {
          loginAttempts = await loginWithRetry(page, role, options.retries);
        } catch (error) {
          loginError = error;
        }

        const chunkResults = [];

        if (loginError) {
          for (const flow of chunkFlows) {
            const failed = {
              id: flow.id,
              role: flow.role,
              title: flow.title,
              path: flow.path,
              status: 'failed',
              severity: 'high',
              issues: [`login_failed:${String(loginError)}`],
              attempts: loginAttempts || options.retries + 1,
              durationMs: 0,
            };
            chunkResults.push(failed);
            roleResults.push(failed);
            allResults.push(failed);
          }
        } else {
          for (const flow of chunkFlows) {
            // eslint-disable-next-line no-await-in-loop
            const result = await runFlowWithRetry(page, flow, options, currentFlowErrors);
            chunkResults.push(result);
            roleResults.push(result);
            allResults.push(result);
            // eslint-disable-next-line no-await-in-loop
            await writePartialReport(allResults, options);
          }
        }

        await context.close();

        const chunkLabel = `chunk-${chunkIdx + 1}-of-${chunks.length}`;
        const chunkReport = buildReport(chunkResults, {
          roles: [role],
          role,
          chunkIndex: chunkIdx + 1,
          chunkSize: options.chunkSize || roleFlows.length,
          retries: options.retries,
          pauseMs: options.pauseMs,
        });
        await writeReportFiles(
          chunkReport,
          options.outDir,
          `report.${role}.${chunkLabel}`,
          `UI Flow Check Report (${role}, ${chunkLabel})`,
        );
      }

      const roleReport = buildReport(roleResults, {
        roles: [role],
        role,
        chunkSize: options.chunkSize || roleFlows.length,
        chunkIndex: options.chunkIndex,
        retries: options.retries,
        pauseMs: options.pauseMs,
      });
      await writeReportFiles(roleReport, options.outDir, `report.${role}`, `UI Flow Check Report (${role})`);

      roleSummaries.push({
        role,
        totals: roleReport.totals,
      });
    }
  } finally {
    await browser.close();
  }

  const report = buildReport(allResults, {
    roles: options.roles,
    chunkSize: options.chunkSize || undefined,
    chunkIndex: options.chunkIndex,
    retries: options.retries,
    pauseMs: options.pauseMs,
    failOn: options.failOn,
    outDir: options.outDir,
  });

  await writeReportFiles(report, options.outDir, 'report', 'UI Flow Check Report (50+)');
  const failDecision = shouldFailRun(report.totals, options.failOn);
  console.log(
    JSON.stringify(
      {
        totals: report.totals,
        roles: roleSummaries,
        failOn: options.failOn,
        shouldFail: failDecision.shouldFail,
        failReason: failDecision.reason || undefined,
        outDir: options.outDir,
      },
      null,
      2,
    ),
  );
  if (failDecision.shouldFail) {
    process.exitCode = 1;
  }
}

await main();
