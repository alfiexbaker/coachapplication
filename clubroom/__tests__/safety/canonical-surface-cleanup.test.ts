import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

describe('Canonical surface cleanup', () => {
  it('keeps legacy tab surfaces as explicit alias redirects', () => {
    const settingsAlias = readSource('app/(tabs)/settings.tsx');
    const rosterAlias = readSource('app/(tabs)/roster.tsx');
    const moreAlias = readSource('app/(tabs)/more.tsx');

    assert.ok(
      settingsAlias.includes('<Redirect href={Routes.SETTINGS_INDEX} />'),
      'Settings tab must alias to canonical /settings hub',
    );
    assert.ok(
      rosterAlias.includes('<Redirect href={Routes.ATHLETES} />'),
      'Legacy roster tab must alias to canonical athletes surface',
    );
    assert.ok(
      moreAlias.includes('<Redirect href={Routes.SETTINGS_INDEX} />'),
      'Legacy more tab must alias to canonical settings hub',
    );
  });

  it('wires verification and legal/support routes from canonical settings hub', () => {
    const settingsHub = readSource('app/settings/index.tsx');
    const privacyScreen = readSource('app/settings/privacy.tsx');

    assert.ok(
      settingsHub.includes('router.push(Routes.VERIFICATION)'),
      'Settings hub must include a direct verification entry',
    );
    assert.ok(
      settingsHub.includes('Routes.SETTINGS_HELP') &&
        settingsHub.includes('Routes.SETTINGS_TERMS') &&
        settingsHub.includes('Routes.SETTINGS_PRIVACY_POLICY'),
      'Settings hub must expose help + legal entry points',
    );
    assert.ok(
      privacyScreen.includes('Routes.SETTINGS_TERMS') &&
        privacyScreen.includes('Routes.SETTINGS_PRIVACY_POLICY'),
      'Privacy screen must keep legal routing options',
    );
  });

  it('does not block the /(tabs)/more alias in tab access policy', () => {
    const routeAccess = readSource('constants/route-access.ts');
    assert.equal(routeAccess.includes("'more'"), false, 'Restricted tab routes must not include more');
  });

  it('removes deprecated unreachable roster/settings fragments', () => {
    const retiredFiles = [
      'components/roster/roster-filter-chips.tsx',
      'components/roster/roster-list.tsx',
      'components/roster/roster-quick-actions.tsx',
      'components/roster/roster-search-bar.tsx',
      'components/roster/roster-selection-bar.tsx',
      'components/settings/settings-account-section.tsx',
      'components/settings/settings-alerts-section.tsx',
      'components/settings/settings-nav-hub.tsx',
      'components/settings/settings-notification-toggles.tsx',
      'components/settings/settings-payments-section.tsx',
      'components/settings/settings-preferences-section.tsx',
      'components/settings/settings-privacy-section.tsx',
      'components/settings/settings-profile-card.tsx',
      'components/settings/settings-sign-out-section.tsx',
      'components/settings/settings-support-section.tsx',
      'components/analytics/enhanced-stat-card.tsx',
      'components/analytics/enhanced-stats.tsx',
      'components/analytics/goal-progress-sections.tsx',
      'components/analytics/goal-progress.tsx',
      'components/analytics/mini-sparkline.tsx',
      'components/analytics/skill-category-group.tsx',
      'components/analytics/skill-progress-bar.tsx',
      'components/analytics/skill-progress-item.tsx',
      'components/analytics/skill-summary-card.tsx',
      'components/analytics/stats-metrics.tsx',
      'components/analytics/stats-row.tsx',
      'components/parent/dev-badges-tab.tsx',
      'components/parent/dev-child-selector.tsx',
      'components/parent/dev-goals-tab.tsx',
      'components/parent/dev-profile-card.tsx',
      'components/parent/dev-progress-tab.tsx',
      'components/parent/development-screen.tsx',
      'components/user/find-coach-screen-sections.tsx',
      'components/user/find-coach-screen.tsx',
    ];

    for (const retiredFile of retiredFiles) {
      assert.equal(exists(retiredFile), false, `${retiredFile} should be retired from canonical UI`);
    }
  });
});
