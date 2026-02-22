/**
 * Captures full-page and sectional screenshots of the my-progress screen
 * for all three roles: coach, parent, athlete.
 *
 * Usage: node scripts/screenshot-progress.mjs [--headed]
 *
 * Prerequisites: Expo web running on http://localhost:8083
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.UI_BASE_URL || 'http://localhost:8083';
const OUT_DIR = '/tmp/progress-screenshots';
const HEADED = process.argv.includes('--headed');

const CREDS = {
  coach: { username: 'coach1', password: 'coach' },
  parent: { username: 'parent1', password: 'user' },
  athlete: { username: 'user1', password: 'user' },
};

/**
 * Scroll the Expo web scroll container (not window).
 * Expo renders inside a div with overflow:scroll/auto.
 */
async function scrollContainer(page, y) {
  await page.evaluate((scrollY) => {
    // Expo web uses a scrollable container — find the deepest scrollable element
    const candidates = document.querySelectorAll('[data-testid="scroll-view"], [class*="ScrollView"]');
    if (candidates.length > 0) {
      candidates[0].scrollTop = scrollY;
      return;
    }
    // Fallback: find any element with overflow scroll/auto that has scroll height
    const all = document.querySelectorAll('*');
    let best = null;
    let bestHeight = 0;
    for (const el of all) {
      const style = getComputedStyle(el);
      if (
        (style.overflowY === 'scroll' || style.overflowY === 'auto') &&
        el.scrollHeight > el.clientHeight &&
        el.scrollHeight > bestHeight
      ) {
        best = el;
        bestHeight = el.scrollHeight;
      }
    }
    if (best) {
      best.scrollTop = scrollY;
    } else {
      window.scrollTo(0, scrollY);
    }
  }, y);
  await page.waitForTimeout(400);
}

async function login(page, creds) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  const usernameInput = page.getByPlaceholder('e.g. coach');
  if (await usernameInput.isVisible().catch(() => false)) {
    await usernameInput.fill(creds.username);
    await page.getByPlaceholder('••••••••').fill(creds.password);
    const loginBtn = page.getByRole('button', { name: 'Log in', exact: true }).first();
    if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click();
    } else {
      await page.getByPlaceholder('••••••••').press('Enter');
    }
    await page.waitForTimeout(3000);
  }
}

async function main() {
  const { chromium, devices } = await import('playwright');
  await fs.mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: !HEADED });
  const iphone = devices['iPhone 14'];
  const routePath = '/development/my-progress';

  for (const [role, creds] of Object.entries(CREDS)) {
    console.log(`\n--- ${role.toUpperCase()} ---`);

    // Light mode
    const lightCtx = await browser.newContext({ ...iphone, colorScheme: 'light' });
    const page = await lightCtx.newPage();
    await login(page, creds);

    console.log(`  Navigating to ${routePath}...`);
    await page.goto(`${BASE_URL}${routePath}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(3000);

    // 1. Viewport (above the fold)
    await page.screenshot({ path: path.join(OUT_DIR, `${role}__viewport.png`) });
    console.log(`  Saved: ${role}__viewport.png`);

    // 2. Full page
    await page.screenshot({
      path: path.join(OUT_DIR, `${role}__full.png`),
      fullPage: true,
    });
    console.log(`  Saved: ${role}__full.png`);

    // Only scroll for athlete (the one with content)
    if (role === 'athlete') {
      // 3. Scroll to pentagon area
      await scrollContainer(page, 500);
      await page.screenshot({ path: path.join(OUT_DIR, `${role}__scroll-500.png`) });
      console.log(`  Saved: ${role}__scroll-500.png`);

      // 4. Scroll to coach card area
      await scrollContainer(page, 1000);
      await page.screenshot({ path: path.join(OUT_DIR, `${role}__scroll-1000.png`) });
      console.log(`  Saved: ${role}__scroll-1000.png`);

      // 5. Scroll further down
      await scrollContainer(page, 1500);
      await page.screenshot({ path: path.join(OUT_DIR, `${role}__scroll-1500.png`) });
      console.log(`  Saved: ${role}__scroll-1500.png`);

      // 6. Scroll to bottom
      await scrollContainer(page, 2500);
      await page.screenshot({ path: path.join(OUT_DIR, `${role}__scroll-2500.png`) });
      console.log(`  Saved: ${role}__scroll-2500.png`);

      // 7. Far bottom
      await scrollContainer(page, 4000);
      await page.screenshot({ path: path.join(OUT_DIR, `${role}__scroll-4000.png`) });
      console.log(`  Saved: ${role}__scroll-4000.png`);
    }

    await lightCtx.close();

    // Dark mode
    const darkCtx = await browser.newContext({ ...iphone, colorScheme: 'dark' });
    const darkPage = await darkCtx.newPage();
    await login(darkPage, creds);

    await darkPage.goto(`${BASE_URL}${routePath}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await darkPage.waitForTimeout(3000);

    await darkPage.screenshot({
      path: path.join(OUT_DIR, `${role}__dark-full.png`),
      fullPage: true,
    });
    console.log(`  Saved: ${role}__dark-full.png`);

    if (role === 'athlete') {
      await darkPage.screenshot({ path: path.join(OUT_DIR, `${role}__dark-viewport.png`) });
      console.log(`  Saved: ${role}__dark-viewport.png`);

      await scrollContainer(darkPage, 500);
      await darkPage.screenshot({ path: path.join(OUT_DIR, `${role}__dark-scroll-500.png`) });
      console.log(`  Saved: ${role}__dark-scroll-500.png`);

      await scrollContainer(darkPage, 1000);
      await darkPage.screenshot({ path: path.join(OUT_DIR, `${role}__dark-scroll-1000.png`) });
      console.log(`  Saved: ${role}__dark-scroll-1000.png`);
    }

    await darkCtx.close();
  }

  await browser.close();
  console.log(`\nAll screenshots saved to: ${OUT_DIR}`);
  const files = await fs.readdir(OUT_DIR);
  console.log(`Total files: ${files.length}`);
  files.forEach((f) => console.log(`  ${f}`));
}

main().catch((error) => {
  console.error('Screenshot script failed:', error);
  process.exit(1);
});
