import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = 'http://localhost:8083';
const outDir = '/tmp/ui-story-shots';

const scenarios = [
  {
    role: 'coach',
    username: 'coach1',
    password: 'coach',
    routes: [
      { story: 'coach-home', path: '/' },
      { story: 'coach-schedule', path: '/schedule' },
      { story: 'coach-athletes', path: '/athletes' },
      { story: 'coach-sessions-create', path: '/sessions/create' },
      { story: 'coach-rate', path: '/rate-coach' },
      { story: 'coach-club-settings', path: '/club/settings' },
      { story: 'coach-dev-progress', path: '/development/my-progress' },
    ],
  },
  {
    role: 'parent',
    username: 'parent1',
    password: 'user',
    routes: [
      { story: 'parent-home', path: '/' },
      { story: 'parent-children', path: '/children' },
      { story: 'parent-book-coach', path: '/book-coach' },
      { story: 'parent-child-progress', path: '/development/child-progress/user1' },
      { story: 'parent-favourites', path: '/favourites' },
      { story: 'parent-settings', path: '/settings' },
    ],
  },
  {
    role: 'athlete',
    username: 'user1',
    password: 'user',
    routes: [
      { story: 'athlete-home', path: '/' },
      { story: 'athlete-progress', path: '/development/my-progress' },
      { story: 'athlete-rate-coach', path: '/rate-coach' },
      { story: 'athlete-settings', path: '/settings' },
    ],
  },
];

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const device = devices['iPhone 13'];

const summary = [];

for (const scenario of scenarios) {
  const context = await browser.newContext({ ...device });
  const page = await context.newPage();
  const errors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console:${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => errors.push(`pageerror:${err.message}`));

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

  const usernameInput = page.getByPlaceholder('e.g. coach');
  const passwordInput = page.getByPlaceholder('••••••••');

  if (await usernameInput.isVisible().catch(() => false)) {
    await usernameInput.fill(scenario.username);
    await passwordInput.fill(scenario.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForTimeout(1800);
  }

  for (const route of scenario.routes) {
    const routeErrorStart = errors.length;
    const target = `${baseUrl}${route.path}`;
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(1400);

    const fileName = `${scenario.role}__${route.story}.png`;
    const fullPath = path.join(outDir, fileName);
    await page.screenshot({ path: fullPath, fullPage: true });

    summary.push({
      role: scenario.role,
      story: route.story,
      path: route.path,
      file: fullPath,
      errors: errors.slice(routeErrorStart),
    });
  }

  await context.close();
}

await browser.close();
await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(`Captured ${summary.length} screenshots to ${outDir}`);
