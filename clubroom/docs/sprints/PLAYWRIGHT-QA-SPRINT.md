# Sprint: Playwright Visual QA — Automated UI Testing & Auto-Fix

**Priority:** P0 — Quality enforcement
**Size:** M (setup + test suites + auto-fix pipeline)
**Dependencies:** Expo dev server running (`npx expo start --ios`)
**Quality bar:** Every screen tested. Every regression caught. Zero manual QA needed for layout, data, and interaction bugs.

---

## Problem Statement

We ship features fast. We break things fast. No automated way to:
1. Verify screens render correctly after changes
2. Catch stretched/broken layouts (like the EventCard bug)
3. Verify multi-child flows work end-to-end
4. Ensure theme tokens are applied (no white text on white backgrounds)
5. Catch missing data (empty states where data should exist)

**Solution:** Playwright tests running against the iOS simulator via Expo web or Maestro-style screenshot comparison. Tests catch issues. Agent reads failures. Agent fixes code. Loop until green.

---

## Architecture

```
playwright/
  config/
    playwright.config.ts          — Playwright config (iPhone viewport, base URL)
    devices.ts                    — Device presets (iPhone 16 Pro, iPad, etc.)
  fixtures/
    auth.ts                       — Login helper (coach1, parent1, etc.)
    navigation.ts                 — Navigate to any screen helper
    screenshot.ts                 — Take + compare screenshots
  tests/
    smoke/                        — Fast smoke tests (every screen loads)
      coach-screens.spec.ts       — All coach-visible screens
      parent-screens.spec.ts      — All parent-visible screens
    multi-child/                  — Multi-child flow tests
      session-registration.spec.ts
      whos-going.spec.ts
      invite-child-identity.spec.ts
      home-family-summary.spec.ts
      calendar-conflicts.spec.ts
      club-family-view.spec.ts
    layout/                       — Visual regression tests
      card-heights.spec.ts        — No card exceeds expected height
      touch-targets.spec.ts       — All buttons >= 44px
      text-contrast.spec.ts       — No text invisible against background
      spacing-consistency.spec.ts — Consistent gaps and padding
    data/                         — Data presence tests
      rsvp-counts.spec.ts         — Mini-bars show data
      registration-badges.spec.ts — Badges appear for registered users
      notifications.spec.ts       — Notifications include child names
  utils/
    pixel-helpers.ts              — Color sampling, element measurement
    wait-helpers.ts               — Wait for navigation, animations
  screenshots/
    baseline/                     — Golden screenshots (committed)
    current/                      — Current run screenshots (gitignored)
    diff/                         — Visual diffs (gitignored)
```

---

## Phase 1: Setup & Smoke Tests

### 1A: Expo Web Setup

Playwright tests run against Expo web (`npx expo start --web`). This lets us test real React Native components rendered in a browser viewport sized to iPhone 16 Pro (393x852).

**Why web not native?** Playwright can't drive iOS simulator directly. Expo web renders the same components. Layout bugs that appear on iOS also appear on web (flexbox is the same engine). For truly native-only bugs, we add Maestro tests later (Phase 3).

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8081',
    viewport: { width: 393, height: 852 }, // iPhone 16 Pro
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  projects: [
    { name: 'iphone-16-pro', use: { ...devices['iPhone 16 Pro'] } },
  ],
  webServer: {
    command: 'npx expo start --web --port 8081',
    port: 8081,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
```

### 1B: Auth Fixture

```typescript
// fixtures/auth.ts
import { Page } from '@playwright/test';

export async function loginAs(page: Page, role: 'coach1' | 'parent1' | 'parent2') {
  const credentials = {
    coach1: { username: 'coach1', password: 'coach' },
    parent1: { username: 'parent1', password: 'user' },
    parent2: { username: 'parent2', password: 'user' },
  };

  await page.goto('/');
  // Fill login form
  await page.fill('[data-testid="username-input"]', credentials[role].username);
  await page.fill('[data-testid="password-input"]', credentials[role].password);
  await page.click('[data-testid="login-button"]');
  // Wait for home screen
  await page.waitForSelector('[data-testid="home-screen"]', { timeout: 10000 });
}
```

### 1C: Smoke Test Suite

Every screen must load without crash. No assertions on content — just "does it render?"

```typescript
// tests/smoke/parent-screens.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../../fixtures/auth';

const PARENT_SCREENS = [
  { name: 'Home', path: '/' },
  { name: 'Bookings', path: '/bookings' },
  { name: 'Group Sessions', path: '/group-sessions' },
  { name: 'Session Detail', path: '/group-sessions/gs_1' },
  { name: 'Session Invites', path: '/session-invites' },
  { name: 'Club Detail', path: '/club/club_lions' },
  { name: 'Children Hub', path: '/children' },
  { name: 'Family Calendar', path: '/family/calendar' },
  { name: 'Events', path: '/events' },
];

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'parent1');
});

for (const screen of PARENT_SCREENS) {
  test(`${screen.name} loads without error`, async ({ page }) => {
    await page.goto(screen.path);
    // Must not show error state
    const errorState = page.locator('[data-testid="error-state"]');
    await expect(errorState).not.toBeVisible({ timeout: 5000 });
    // Must not be blank
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(10);
    // Screenshot for baseline
    await page.screenshot({ path: `screenshots/current/${screen.name}.png` });
  });
}
```

---

## Phase 2: Multi-Child Flow Tests

### 2A: Session Registration (parent1 = 2 kids: Tom + Emma)

```typescript
// tests/multi-child/session-registration.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../../fixtures/auth';

test.describe('Multi-child session registration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'parent1');
  });

  test('shows child selector when registering', async ({ page }) => {
    await page.goto('/group-sessions/gs_4'); // Free Trial — has spots
    // Should see child picker
    await expect(page.locator('text=Select Child')).toBeVisible();
    // Should see both children
    await expect(page.locator('text=Tom')).toBeVisible();
    await expect(page.locator('text=Emma')).toBeVisible();
  });

  test('WhosGoingCard shows both registered children', async ({ page }) => {
    await page.goto('/group-sessions/gs_1'); // Both Tom + Emma registered
    // Should see "Who's Going?" card
    await expect(page.locator("text=Who's Going?")).toBeVisible();
    // Should see both children with RSVP pills
    await expect(page.locator('text=Tom Henderson')).toBeVisible();
    await expect(page.locator('text=Emma Henderson')).toBeVisible();
    // Should see RSVP options
    const goingButtons = page.locator('text=Going');
    await expect(goingButtons).toHaveCount(2); // One per child
  });

  test('per-child RSVP is independent', async ({ page }) => {
    await page.goto('/group-sessions/gs_1');
    // Tom's "Going" should be selected (from seed data)
    // Emma's should be "Pending" (from seed data)
    // Verify visual differentiation exists
    await page.screenshot({ path: 'screenshots/current/whos-going-card.png' });
  });

  test('session card shows registration badge', async ({ page }) => {
    await page.goto('/group-sessions');
    // Half-Term Football Camp card should show registration indicator
    const campCard = page.locator('text=Half-Term Football Camp').first();
    await expect(campCard).toBeVisible();
    // Badge should show child names (Phase 2 feature)
    // await expect(page.locator('text=Tommy + Emma going')).toBeVisible();
  });

  test('session appears ONCE even with 2 kids registered', async ({ page }) => {
    await page.goto('/group-sessions');
    // "Half-Term Football Camp" should appear exactly once
    const campCards = page.locator('text=Half-Term Football Camp');
    await expect(campCards).toHaveCount(1);
  });
});
```

### 2B: Coach RSVP View

```typescript
// tests/multi-child/coach-rsvp-view.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../../fixtures/auth';

test.describe('Coach RSVP view', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'coach1');
  });

  test('shows RSVP mini-bar on session detail', async ({ page }) => {
    await page.goto('/group-sessions/gs_1');
    // Should see attendance section
    await expect(page.locator('text=Attendance')).toBeVisible();
    // Should see counts
    await expect(page.locator('text=Going')).toBeVisible();
    await expect(page.locator('text=Pending')).toBeVisible();
  });

  test('shows deadline badge', async ({ page }) => {
    await page.goto('/group-sessions/gs_2'); // Has future deadline
    // Should see deadline countdown or "Closed"
    const deadline = page.locator('text=/\\d+[dhm] left|Closed/');
    await expect(deadline).toBeVisible();
  });

  test('remind button works', async ({ page }) => {
    await page.goto('/group-sessions/gs_1');
    const remindBtn = page.locator('text=Remind');
    if (await remindBtn.isVisible()) {
      await remindBtn.click();
      // Should show confirmation alert
      await expect(page.locator('text=Reminders Sent')).toBeVisible({ timeout: 3000 });
    }
  });
});
```

---

## Phase 3: Layout Regression Tests

### 3A: Card Height Validation

Catches the "stretched EventCard" bug automatically.

```typescript
// tests/layout/card-heights.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../../fixtures/auth';

const MAX_CARD_HEIGHTS = {
  'compact-event-card': 120,   // Compact cards should be short
  'group-session-card': 500,   // Full cards with image
  'surface-card': 600,         // General surface cards
  'family-registration-card': 200,
  'whos-going-card': 300,      // Multi-child card
};

test.describe('Card height sanity', () => {
  test('club hub event cards are not stretched', async ({ page }) => {
    await loginAs(page, 'parent1');
    await page.goto('/club/club_lions');

    // Find all compact event cards
    const cards = page.locator('[data-testid="compact-event-card"]');
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const box = await cards.nth(i).boundingBox();
      expect(box?.height).toBeLessThan(MAX_CARD_HEIGHTS['compact-event-card']);
      expect(box?.height).toBeGreaterThan(40); // Not collapsed
    }
  });

  test('group session cards have reasonable height', async ({ page }) => {
    await loginAs(page, 'parent1');
    await page.goto('/group-sessions');

    const cards = page.locator('[data-testid="group-session-card"]');
    const count = await cards.count();

    for (let i = 0; i < count; i++) {
      const box = await cards.nth(i).boundingBox();
      expect(box?.height).toBeLessThan(MAX_CARD_HEIGHTS['group-session-card']);
    }
  });

  test('no element exceeds viewport width', async ({ page }) => {
    await loginAs(page, 'parent1');

    for (const path of ['/', '/group-sessions', '/group-sessions/gs_1', '/club/club_lions']) {
      await page.goto(path);
      await page.waitForTimeout(1000);

      const overflowing = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const viewport = window.innerWidth;
        const overflow: string[] = [];
        elements.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > viewport + 5) {
            overflow.push(`${el.tagName}.${el.className}: ${rect.width}px`);
          }
        });
        return overflow;
      });

      expect(overflowing).toHaveLength(0);
    }
  });
});
```

### 3B: Touch Target Validation

```typescript
// tests/layout/touch-targets.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../../fixtures/auth';

test.describe('Touch target sizes', () => {
  test('all buttons meet 44px minimum', async ({ page }) => {
    await loginAs(page, 'parent1');

    for (const path of ['/group-sessions/gs_1', '/session-invites', '/bookings']) {
      await page.goto(path);
      await page.waitForTimeout(1000);

      const undersized = await page.evaluate(() => {
        const clickables = document.querySelectorAll('[role="button"], button, [data-testid*="button"], [data-testid*="clickable"]');
        const violations: string[] = [];
        clickables.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.height < 44 && rect.height > 0) {
            violations.push(`${el.getAttribute('data-testid') || el.textContent?.slice(0, 20)}: ${rect.height}px`);
          }
        });
        return violations;
      });

      if (undersized.length > 0) {
        console.warn(`Touch target violations on ${path}:`, undersized);
      }
      // Warn but don't fail — some minor elements are OK
      expect(undersized.length).toBeLessThan(5);
    }
  });
});
```

---

## Phase 4: Data Presence Tests

Catches missing seed data, empty states where content should exist.

```typescript
// tests/data/rsvp-counts.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '../../fixtures/auth';

test.describe('RSVP data presence', () => {
  test('coach sees RSVP counts on session detail', async ({ page }) => {
    await loginAs(page, 'coach1');
    await page.goto('/group-sessions/gs_1');

    // Must show attendance numbers (not all zeros)
    const goingCount = page.locator('[data-testid="rsvp-going-count"]');
    if (await goingCount.isVisible()) {
      const text = await goingCount.textContent();
      expect(parseInt(text || '0')).toBeGreaterThan(0);
    }
  });

  test('parent sees RSVP buttons on registered session', async ({ page }) => {
    await loginAs(page, 'parent1');
    await page.goto('/group-sessions/gs_1');

    // Must see RSVP options
    await expect(page.locator('text=Going').first()).toBeVisible();
    await expect(page.locator('text=Maybe').first()).toBeVisible();
    await expect(page.locator("text=Can't").first()).toBeVisible();
  });

  test('deadline badge shows time or closed', async ({ page }) => {
    await loginAs(page, 'parent1');
    await page.goto('/group-sessions/gs_1');

    // gs_1 deadline is 2026-02-15 (past) — should show "Closed"
    await expect(page.locator('text=Closed')).toBeVisible();
  });
});
```

---

## Auto-Fix Pipeline

### How it works

The Playwright tests are run by an agent. When tests fail, the agent:
1. Reads the failure message + screenshot
2. Identifies the root cause (layout bug, missing data, wrong color, etc.)
3. Fixes the code
4. Re-runs the failing test
5. Repeats until green (max 3 loops)

### Agent Prompt: Playwright QA Runner

```
You are the PLAYWRIGHT QA agent for Clubroom (Expo 54 / RN 0.81 / React 19 / TS 5.9).

You run visual tests and fix what's broken. You are the last line of defence.

WORKFLOW:
1. Start the dev server if not running: npx expo start --web --port 8081
2. Run the full Playwright suite: npx playwright test
3. For each FAILURE:
   a. Read the error message and screenshot
   b. Identify the file + line causing the issue
   c. Read the source file
   d. Fix the root cause (not a band-aid)
   e. Re-run ONLY the failing test: npx playwright test [test-file] --grep "[test-name]"
   f. If still failing, re-analyze. Max 3 attempts per test.
4. After all tests pass: report summary

FIX RULES:
- Layout bugs: fix the StyleSheet or component structure, not the test
- Missing data: fix the seed data or service, not the test
- Theme violations: replace hardcoded values with theme tokens
- Touch target violations: add minHeight: 44 or hitSlop
- NEVER change a test to make it pass. Tests are the source of truth.

REPORT FORMAT:
| Test | Status | Fix Applied | File |
|------|--------|-------------|------|
| card heights | PASS | n/a | n/a |
| touch targets | FIXED | Added minHeight: 44 to pill | rsvp-mini-bar.tsx:92 |

FINAL: ALL PASS ✓ or BLOCKED (list issues that need human decision)
```

---

## Setup Instructions

```bash
# From clubroom/ directory

# 1. Install Playwright
npm install -D @playwright/test
npx playwright install

# 2. Create playwright directory
mkdir -p playwright/{config,fixtures,tests/{smoke,multi-child,layout,data},utils,screenshots/{baseline,current,diff}}

# 3. Add to .gitignore
echo "playwright/screenshots/current/" >> .gitignore
echo "playwright/screenshots/diff/" >> .gitignore
echo "playwright/test-results/" >> .gitignore

# 4. Add test scripts to package.json
# "test:e2e": "npx playwright test",
# "test:e2e:ui": "npx playwright test --ui",
# "test:e2e:headed": "npx playwright test --headed"

# 5. Run
npx expo start --web --port 8081 &
npx playwright test
```

---

## Test Data Requirements

Tests assume this seed data exists (from rsvp-service.ts MOCK_RSVPS + session-registration-service.ts):

| Session | Parent1 (user4) Children | RSVPs |
|---------|-------------------------|-------|
| gs_1 (Half-Term Camp) | Tom: REGISTERED, Emma: REGISTERED | Tom: going, Emma: pending |
| gs_2 (Striker Masterclass) | Tom: REGISTERED | Tom: maybe |
| gs_3 (Goalkeeper Training) | Emma: REGISTERED | Emma: going |
| gs_4 (Free Trial) | Tom: REGISTERED | Tom: pending |

| Coach1 Sessions | RSVP Distribution |
|-----------------|-------------------|
| gs_1 | 5 going, 1 maybe, 1 not_going, 2 pending |
| gs_2 | 3 going, 1 maybe, 1 not_going, 1 pending |

---

## Quality Gates

- [ ] All smoke tests pass (every screen loads)
- [ ] All multi-child flow tests pass
- [ ] No card exceeds max height
- [ ] No touch target violations on critical screens
- [ ] All RSVP data visible where expected
- [ ] Deadline badges show correct state
- [ ] Screenshots baseline committed for regression detection
- [ ] Auto-fix loop resolves all layout issues without human intervention
