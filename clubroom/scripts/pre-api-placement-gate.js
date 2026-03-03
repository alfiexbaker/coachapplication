#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = process.cwd();

function readFile(relativePath) {
  const absolute = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolute)) {
    return null;
  }
  return fs.readFileSync(absolute, 'utf8');
}

const checks = [
  {
    id: 'messages_find_coaches_uses_discover',
    description: 'Messages empty-state find coach routes to discover map.',
    pass: () => {
      const file = readFile('app/(tabs)/messages.tsx');
      return Boolean(file && file.includes('router.push(Routes.DISCOVER_MAP)'));
    },
  },
  {
    id: 'settings_tab_redirects_to_settings_hub',
    description: 'Settings tab redirects to canonical /settings hub.',
    pass: () => {
      const file = readFile('app/(tabs)/settings.tsx');
      return Boolean(file && file.includes('<Redirect href={Routes.SETTINGS_INDEX} />'));
    },
  },
  {
    id: 'no_more_route_callers',
    description: 'No user CTA uses Routes.MORE or /(tabs)/more.',
    pass: () => {
      const files = [
        'app/(tabs)/messages.tsx',
        'components/coach/profile-quick-actions.tsx',
        'app/settings/index.tsx',
        'components/social/feed-filters-sections.tsx',
      ];
      const content = files.map(readFile).join('\n');
      return !content.includes('Routes.MORE') && !content.includes('/(tabs)/more');
    },
  },
  {
    id: 'more_tab_alias_redirect_present',
    description: 'Legacy /(tabs)/more route is an explicit alias to /settings.',
    pass: () => {
      const file = readFile('app/(tabs)/more.tsx');
      return Boolean(file && file.includes('<Redirect href={Routes.SETTINGS_INDEX} />'));
    },
  },
  {
    id: 'settings_legal_routes_wired',
    description: 'Support/legal rows navigate to help/terms/privacy-policy routes.',
    pass: () => {
      const settingsHub = readFile('app/settings/index.tsx');
      const privacy = readFile('app/settings/privacy.tsx');
      return Boolean(
        settingsHub &&
          settingsHub.includes('Routes.SETTINGS_HELP') &&
          settingsHub.includes('Routes.SETTINGS_TERMS') &&
          settingsHub.includes('Routes.SETTINGS_PRIVACY_POLICY') &&
          privacy &&
          privacy.includes('Routes.SETTINGS_TERMS') &&
          privacy.includes('Routes.SETTINGS_PRIVACY_POLICY'),
      );
    },
  },
  {
    id: 'verification_row_wired',
    description: 'Settings account verification row routes to /verification.',
    pass: () => {
      const file = readFile('app/settings/index.tsx');
      return Boolean(file && file.includes('router.push(Routes.VERIFICATION)'));
    },
  },
  {
    id: 'one_to_one_raise_concern_present',
    description: '1:1 session feedback includes Raise Concern CTA with roster concern route.',
    pass: () => {
      const file = readFile('app/development/session/[sessionId].tsx');
      return Boolean(
        file &&
          file.includes('Routes.rosterAthleteConcern') &&
          file.includes('Raise Concern'),
      );
    },
  },
  {
    id: 'health_entrypoints_present',
    description: 'Health route is reachable from key athlete/parent surfaces.',
    pass: () => {
      const userHome = readFile('components/user/home-screen-sections.tsx');
      const parentDiscover = readFile('components/parent/discover-screen.tsx');
      const childProgress = readFile('app/development/child-progress/[childId].tsx');
      return Boolean(
        userHome &&
          parentDiscover &&
          childProgress &&
          userHome.includes('Routes.HEALTH') &&
          parentDiscover.includes('Routes.HEALTH') &&
          childProgress.includes('Routes.HEALTH'),
      );
    },
  },
  {
    id: 'family_entrypoints_present',
    description: 'Parent discover surface links to family dashboard/calendar/spending.',
    pass: () => {
      const file = readFile('components/parent/discover-screen.tsx');
      return Boolean(
        file &&
          file.includes('Routes.FAMILY') &&
          file.includes('Routes.FAMILY_CALENDAR') &&
          file.includes('Routes.FAMILY_SPENDING'),
      );
    },
  },
  {
    id: 'bookings_insights_entrypoints_removed',
    description: 'Bookings screen does not expose deprecated objectives/statistics routes.',
    pass: () => {
      const file = readFile('app/(tabs)/bookings/index.tsx');
      return Boolean(
        file &&
          !file.includes('Routes.BOOKINGS_OBJECTIVES') &&
          !file.includes('Routes.BOOKINGS_STATISTICS'),
      );
    },
  },
  {
    id: 'roster_alias_redirect_present',
    description: 'Legacy roster tab redirects to canonical athletes tab.',
    pass: () => {
      const file = readFile('app/(tabs)/roster.tsx');
      return Boolean(file && file.includes('<Redirect href={Routes.ATHLETES} />'));
    },
  },
  {
    id: 'club_hub_unrestricted_for_user_parent',
    description: 'Route access policy no longer restricts club-hub for USER/PARENT.',
    pass: () => {
      const file = readFile('constants/route-access.ts');
      if (!file) {
        return false;
      }
      const userLineMatch = file.match(/USER:\s*\[([^\]]*)\]/);
      const parentLineMatch = file.match(/PARENT:\s*\[([^\]]*)\]/);
      if (!userLineMatch || !parentLineMatch) {
        return false;
      }
      return !userLineMatch[1].includes("'club-hub'") && !parentLineMatch[1].includes("'club-hub'");
    },
  },
  {
    id: 'more_unrestricted_alias_access',
    description: 'Route access policy does not block /(tabs)/more alias route.',
    pass: () => {
      const file = readFile('constants/route-access.ts');
      if (!file) {
        return false;
      }
      const roleLines = ['COACH', 'USER', 'PARENT', 'ADMIN', 'DEFAULT'].map((role) =>
        file.match(new RegExp(`${role}:\\s*\\[([^\\]]*)\\]`)),
      );
      if (roleLines.some((match) => !match)) {
        return false;
      }
      return roleLines.every((match) => match && !match[1].includes("'more'"));
    },
  },
];

const results = checks.map((check) => {
  let ok = false;
  let error = null;
  try {
    ok = check.pass();
  } catch (err) {
    ok = false;
    error = err instanceof Error ? err.message : String(err);
  }
  return {
    id: check.id,
    description: check.description,
    ok,
    error,
  };
});

const failed = results.filter((result) => !result.ok);

console.log('Pre-API placement gate');
for (const result of results) {
  console.log(`- ${result.ok ? 'PASS' : 'FAIL'} ${result.id}: ${result.description}`);
  if (result.error) {
    console.log(`  error: ${result.error}`);
  }
}

const summary = {
  total: results.length,
  pass: results.length - failed.length,
  fail: failed.length,
};

console.log(`Summary: ${summary.pass}/${summary.total} passed`);

if (failed.length > 0) {
  process.exitCode = 1;
}
