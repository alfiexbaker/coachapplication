import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.UI_BASE_URL || 'http://localhost:8083';
const outDir = '/tmp/ui-flow-checks-50';

const creds = {
  coach: { username: 'coach1', password: 'coach' },
  parent: { username: 'parent1', password: 'user' },
  athlete: { username: 'user1', password: 'user' },
};

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
    title: 'Coach opens booking rules',
    path: '/availability/scheduling-rules',
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
  { id: 'athlete_journal', role: 'athlete', title: 'Athlete opens journal', path: '/athlete/journal' },
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

async function login(page, role) {
  const { username, password } = creds[role];
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1000);

  const usernameInput = page.getByPlaceholder('e.g. coach');
  const passwordInput = page.getByPlaceholder('••••••••');

  if (!(await usernameInput.isVisible().catch(() => false))) {
    return;
  }

  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForFunction(
    () => {
      try {
        return Boolean(window.localStorage.getItem('auth_user'));
      } catch {
        return false;
      }
    },
    { timeout: 25000 },
  );
  await page.waitForTimeout(1200);
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

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const grouped = flows.reduce((acc, flow) => {
    if (!acc[flow.role]) acc[flow.role] = [];
    acc[flow.role].push(flow);
    return acc;
  }, {});

  const allResults = [];

  for (const [role, roleFlows] of Object.entries(grouped)) {
    const context = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await context.newPage();
    let currentFlowErrors = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') currentFlowErrors.push(`console:${msg.text()}`);
    });
    page.on('pageerror', (err) => currentFlowErrors.push(`pageerror:${err.message}`));

    await login(page, role);

    for (const flow of roleFlows) {
      currentFlowErrors = [];
      const actionErrors = [];
      const start = Date.now();

      try {
        await page.goto(`${baseUrl}${flow.path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        await page.waitForTimeout(900);

        for (const action of flow.actions ?? []) {
          // eslint-disable-next-line no-await-in-loop
          await runAction(page, action, actionErrors);
        }

        const metrics = await collectMetrics(page);
        const screenshotPath = path.join(outDir, flowFile(flow));
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const { severity, issues } = classify(currentFlowErrors, actionErrors, metrics);
        allResults.push({
          id: flow.id,
          role: flow.role,
          title: flow.title,
          path: flow.path,
          screenshot: screenshotPath,
          status: severity === 'high' ? 'failed' : 'ok',
          severity,
          issues,
          metrics,
          durationMs: Date.now() - start,
        });
      } catch (error) {
        allResults.push({
          id: flow.id,
          role: flow.role,
          title: flow.title,
          path: flow.path,
          status: 'failed',
          severity: 'high',
          issues: [...currentFlowErrors, ...actionErrors, `navigation_failed:${String(error)}`],
          durationMs: Date.now() - start,
        });
      }
    }

    await context.close();
  }

  await browser.close();

  const totals = {
    total: allResults.length,
    ok: allResults.filter((r) => r.status === 'ok').length,
    failed: allResults.filter((r) => r.status === 'failed').length,
    high: allResults.filter((r) => r.severity === 'high').length,
    medium: allResults.filter((r) => r.severity === 'medium').length,
    none: allResults.filter((r) => r.severity === 'none').length,
  };

  const report = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    totals,
    results: allResults,
  };

  const markdownLines = [
    '# UI Flow Check Report (50+)',
    '',
    `- Base URL: ${baseUrl}`,
    `- Generated: ${report.generatedAt}`,
    `- Total flows: ${totals.total}`,
    `- Failed: ${totals.failed}`,
    `- High: ${totals.high}`,
    `- Medium: ${totals.medium}`,
    '',
    '## High / Medium Findings',
    '',
  ];

  const findings = allResults.filter((r) => r.severity === 'high' || r.severity === 'medium');
  if (findings.length === 0) {
    markdownLines.push('- None');
  } else {
    for (const item of findings) {
      markdownLines.push(
        `- [${item.severity.toUpperCase()}] ${item.id} (${item.path}) :: ${item.issues.join(' | ')}`,
      );
    }
  }

  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, 'report.md'), `${markdownLines.join('\n')}\n`);
  console.log(JSON.stringify(totals, null, 2));
}

await main();
