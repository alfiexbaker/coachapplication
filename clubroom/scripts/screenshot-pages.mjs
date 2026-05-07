/**
 * Playwright script to screenshot all key pages of the Clubroom app.
 * Logs in via the demo credentials first, then navigates to each route.
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import path from 'path';

const BASE = 'http://localhost:8081';
const OUT = path.resolve('screenshots');

const ROUTES = [
  // Core tabs
  { path: '/', name: '01-home' },
  { path: '/schedule', name: '02-schedule' },
  { path: '/bookings', name: '03-bookings' },
  { path: '/athletes', name: '04-athletes' },
  { path: '/feed', name: '05-feed' },
  { path: '/roster', name: '06-roster' },
  { path: '/earnings', name: '07-earnings' },
  { path: '/wallet', name: '08-wallet' },
  { path: '/messages', name: '09-messages' },
  { path: '/notifications', name: '10-notifications' },
  { path: '/profile', name: '11-profile' },
  { path: '/more', name: '12-more' },
  { path: '/settings', name: '13-settings' },
  { path: '/coach-profile', name: '14-coach-profile' },
  { path: '/children', name: '16-children' },
  { path: '/club-hub', name: '17-club-hub' },
  { path: '/availability', name: '18-availability' },
  { path: '/edit-profile', name: '19-edit-profile' },
  // Discover
  { path: '/discover-sessions', name: '20-discover-sessions' },
  { path: '/discover/map', name: '21-discover-map' },
  // Development
  { path: '/development/badges', name: '22-dev-badges' },
  { path: '/development/my-progress', name: '23-dev-my-progress' },
  // Community
  { path: '/community', name: '24-community' },
  // Family
  { path: '/family', name: '28-family' },
  { path: '/family/calendar', name: '29-family-calendar' },
  // Group sessions
  { path: '/group-sessions', name: '32-group-sessions' },
  // Health
  { path: '/health', name: '33-health' },
  { path: '/health/injuries', name: '34-health-injuries' },
  // Matches & Events
  { path: '/matches', name: '35-matches' },
  { path: '/events', name: '36-events' },
  // Invoices & Packages
  { path: '/invoices', name: '37-invoices' },
  { path: '/packages', name: '38-packages' },
  // Favourites & Manage
  { path: '/favourites', name: '39-favourites' },
  { path: '/manage', name: '40-manage' },
  // Settings sub-pages
  { path: '/settings/account', name: '42-settings-account' },
  { path: '/settings/appearance', name: '43-settings-appearance' },
  { path: '/settings/notifications', name: '44-settings-notifications' },
  { path: '/settings/privacy', name: '45-settings-privacy' },
  // Verification
  { path: '/verification', name: '47-verification' },
  // Analytics
  { path: '/analytics/dashboard', name: '49-analytics' },
  // Session invites
  { path: '/session-invites', name: '50-session-invites' },
  // Book coach
  { path: '/book-coach', name: '52-book-coach' },
  // Recurring bookings
  { path: '/bookings/recurring', name: '53-bookings-recurring' },
  // Availability
  { path: '/availability/calendar', name: '54-availability-calendar' },
  // Chat
  { path: '/chat', name: '56-chat' },
  // Invites
  { path: '/invites', name: '57-invites' },
  // Sessions create
  { path: '/sessions/create', name: '58-sessions-create' },
];

async function run() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
  });

  // ── Step 1: Log in ──
  console.log('🔑 Logging in...');
  const loginPage = await context.newPage();
  await loginPage.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await loginPage.waitForTimeout(2000);

  // Fill in credentials
  const usernameInput = loginPage.locator('input[placeholder*="coach"], input[type="text"]').first();
  const passwordInput = loginPage.locator('input[type="password"], input[placeholder*="password" i]').first();

  await usernameInput.fill('coach1');
  await passwordInput.fill('coach');
  await loginPage.waitForTimeout(500);

  // Click login button
  const loginBtn = loginPage.getByText('Log in', { exact: true });
  await loginBtn.click();

  // Wait for navigation to complete
  await loginPage.waitForTimeout(5000);

  // Check if we're logged in by looking for non-login content
  const currentUrl = loginPage.url();
  console.log(`  After login: ${currentUrl}`);

  // Take a screenshot of the post-login state
  await loginPage.screenshot({ path: path.join(OUT, '00-post-login.png') });
  await loginPage.close();

  // ── Step 2: Screenshot all routes ──
  let successCount = 0;
  let failCount = 0;
  const failures = [];

  for (const route of ROUTES) {
    const page = await context.newPage();
    try {
      const url = `${BASE}${route.path}`;
      console.log(`📸 ${route.name} → ${url}`);

      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join(OUT, `${route.name}.png`),
        fullPage: false,
      });
      successCount++;
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message.split('\n')[0]}`);
      failures.push(route.name);
      failCount++;
      try {
        await page.screenshot({ path: path.join(OUT, `${route.name}-error.png`) });
      } catch {}
    }
    await page.close();
  }

  await browser.close();
  console.log(`\n✅ ${successCount} screenshots, ❌ ${failCount} failures`);
  if (failures.length > 0) console.log(`Failed: ${failures.join(', ')}`);
}

run().catch(console.error);
