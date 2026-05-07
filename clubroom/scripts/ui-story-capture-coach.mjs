import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = 'http://localhost:8083';
const outDir = '/tmp/ui-story-shots-after';

const routes = [
  { story: 'coach-home', path: '/' },
  { story: 'coach-schedule', path: '/schedule' },
  { story: 'coach-athletes', path: '/athletes' },
  { story: 'coach-sessions-create', path: '/sessions/create' },
  { story: 'coach-club-settings', path: '/club/settings' },
];

await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 13'] });
const page = await context.newPage();
const summary = [];

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(err.message));

await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(1500);

const usernameInput = page.getByPlaceholder('e.g. coach');
if (await usernameInput.isVisible().catch(() => false)) {
  await usernameInput.fill('coach1');
  await page.getByPlaceholder('••••••••').fill('coach');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForFunction(() => {
    try {
      return !!window.localStorage.getItem('auth_user');
    } catch {
      return false;
    }
  }, { timeout: 20000 });
  await page.waitForTimeout(1200);
}

for (const route of routes) {
  const routeErrorStart = errors.length;
  const target = `${baseUrl}${route.path}`;
  try {
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(900);
    const file = path.join(outDir, `after__${route.story}.png`);
    await page.screenshot({ path: file, fullPage: true });
    summary.push({ route: route.path, file, status: 'ok', errors: errors.slice(routeErrorStart) });
  } catch (error) {
    summary.push({
      route: route.path,
      status: 'failed',
      error: String(error),
      errors: errors.slice(routeErrorStart),
    });
  }
}

await context.close();
await browser.close();
await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
