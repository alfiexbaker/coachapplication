# Pre-API Canonical Route Ownership (Sprint 3)

**Date:** 2026-03-01  
**Status:** Active, enforced via `npm run gate:pre-api-placement`

## Canonical Ownership Map

| Route cluster | Canonical surface | Owner spine | Legacy/alias surface | Enforcement |
|---|---|---|---|---|
| Settings/Profile | `/settings` (`app/settings/index.tsx`) | Trust/Ops | `/(tabs)/settings` | `/(tabs)/settings` redirects to `Routes.SETTINGS_INDEX` |
| Legacy More tab | `/settings` (`app/settings/index.tsx`) | Trust/Ops | `/(tabs)/more` | `/(tabs)/more` redirects to `Routes.SETTINGS_INDEX` and is not route-blocked |
| Coach roster | `/(tabs)/athletes` | Community + Development | `/(tabs)/roster` | `/(tabs)/roster` redirects to `Routes.ATHLETES` |
| Club hub for non-coach roles | `/(tabs)/club-hub` (deep-link only) | Community | none | USER/PARENT no longer restricted in `constants/route-access.ts` |
| Trust concern reporting | `/roster/[athleteId]/raise-concern` | Trust/Ops | none | Group and 1:1 completion flows route to same concern path |
| Health/injury | `/health` + child medical/emergency routes | Trust/Ops | none | Parent/athlete primary surfaces include health entry points |

## Retired Component Surfaces

The following non-reachable components were retired in Sprint 3 to remove duplicate UI ownership:

- `components/roster/roster-filter-chips.tsx`
- `components/roster/roster-list.tsx`
- `components/roster/roster-quick-actions.tsx`
- `components/roster/roster-search-bar.tsx`
- `components/roster/roster-selection-bar.tsx`
- `components/settings/settings-account-section.tsx`
- `components/settings/settings-alerts-section.tsx`
- `components/settings/settings-nav-hub.tsx`
- `components/settings/settings-notification-toggles.tsx`
- `components/settings/settings-payments-section.tsx`
- `components/settings/settings-preferences-section.tsx`
- `components/settings/settings-privacy-section.tsx`
- `components/settings/settings-profile-card.tsx`
- `components/settings/settings-sign-out-section.tsx`
- `components/settings/settings-support-section.tsx`

Additional chain retired after converting `/(tabs)/more` to alias-only behavior:

- `components/analytics/enhanced-stat-card.tsx`
- `components/analytics/enhanced-stats.tsx`
- `components/analytics/goal-progress-sections.tsx`
- `components/analytics/goal-progress.tsx`
- `components/analytics/mini-sparkline.tsx`
- `components/analytics/skill-category-group.tsx`
- `components/analytics/skill-progress-bar.tsx`
- `components/analytics/skill-progress-item.tsx`
- `components/analytics/skill-summary-card.tsx`
- `components/analytics/stats-metrics.tsx`
- `components/analytics/stats-row.tsx`
- `components/parent/dev-badges-tab.tsx`
- `components/parent/dev-child-selector.tsx`
- `components/parent/dev-goals-tab.tsx`
- `components/parent/dev-profile-card.tsx`
- `components/parent/dev-progress-tab.tsx`
- `components/parent/development-screen.tsx`
- `components/user/find-coach-screen-sections.tsx`
- `components/user/find-coach-screen.tsx`

## Gate + Test Coverage

- Placement gate checks canonical route ownership and alias redirects: `scripts/pre-api-placement-gate.js`
- Contract tests validate aliases and retirement state: `__tests__/safety/canonical-surface-cleanup.test.ts`
