import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = 'http://localhost:8083';
const outDir = '/tmp/ui-story-shots-expanded';

const scenarios = [
  {
    role: 'coach',
    username: 'coach1',
    password: 'coach',
    routes: [
      { story: 'home', path: '/' },
      { story: 'schedule', path: '/schedule' },
      { story: 'athletes', path: '/athletes' },
      { story: 'feed', path: '/feed' },
      { story: 'messages', path: '/messages' },
      { story: 'bookings', path: '/bookings' },
      { story: 'settings', path: '/settings' },
      { story: 'club-settings', path: '/club/settings' },
      { story: 'create-session', path: '/sessions/create' },
      { story: 'rate-coach', path: '/rate-coach' },
      { story: 'my-progress', path: '/development/my-progress' },
      { story: 'availability-calendar', path: '/availability/calendar' },
      { story: 'discover-sessions', path: '/discover-sessions' },
      { story: 'group-sessions', path: '/group-sessions/index' },
      { story: 'session-invites', path: '/session-invites/index' },
      { story: 'session-invites-create', path: '/session-invites/create' },
    ],
  },
  {
    role: 'parent',
    username: 'parent1',
    password: 'user',
    routes: [
      { story: 'home', path: '/' },
      { story: 'children', path: '/children' },
      { story: 'feed', path: '/feed' },
      { story: 'messages', path: '/messages' },
      { story: 'bookings', path: '/bookings' },
      { story: 'settings', path: '/settings' },
      { story: 'favourites', path: '/favourites' },
      { story: 'book-coach', path: '/book-coach' },
      { story: 'child-progress', path: '/development/child-progress/user1' },
      { story: 'my-progress', path: '/development/my-progress' },
      { story: 'goals', path: '/goals' },
      { story: 'family', path: '/family' },
      { story: 'family-calendar', path: '/family/calendar' },
      { story: 'discover-sessions', path: '/discover-sessions' },
    ],
  },
  {
    role: 'athlete',
    username: 'user1',
    password: 'user',
    routes: [
      { story: 'home', path: '/' },
      { story: 'feed', path: '/feed' },
      { story: 'messages', path: '/messages' },
      { story: 'bookings', path: '/bookings' },
      { story: 'settings', path: '/settings' },
      { story: 'my-progress', path: '/development/my-progress' },
      { story: 'goals', path: '/goals' },
      { story: 'skills', path: '/skills' },
      { story: 'badges', path: '/badges' },
      { story: 'journal', path: '/athlete/journal' },
      { story: 'rate-coach', path: '/rate-coach' },
      { story: 'discover-sessions', path: '/discover-sessions' },
    ],
  },
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const summary = [];

for (const scenario of scenarios) {
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  const errors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console:${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => errors.push(`pageerror:${err.message}`));

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1200);

  const usernameInput = page.getByPlaceholder('e.g. coach');
  const passwordInput = page.getByPlaceholder('••••••••');

  if (await usernameInput.isVisible().catch(() => false)) {
    await usernameInput.fill(scenario.username);
    await passwordInput.fill(scenario.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForFunction(() => {
      try {
        return !!window.localStorage.getItem('auth_user');
      } catch {
        return false;
      }
    }, { timeout: 25000 });
    await page.waitForTimeout(1300);
  }

  for (const route of scenario.routes) {
    const routeErrorStart = errors.length;
    const target = `${baseUrl}${route.path}`;
    try {
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1000);

      const fileName = `${scenario.role}__${route.story}.png`;
      const fullPath = path.join(outDir, fileName);
      await page.screenshot({ path: fullPath, fullPage: false });

      summary.push({
        role: scenario.role,
        story: route.story,
        path: route.path,
        file: fullPath,
        status: 'ok',
        errors: errors.slice(routeErrorStart),
      });
    } catch (error) {
      summary.push({
        role: scenario.role,
        story: route.story,
        path: route.path,
        status: 'failed',
        error: String(error),
        errors: errors.slice(routeErrorStart),
      });
    }
  }

  await context.close();
}

await browser.close();
await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
