# QA-093 — map location authority

## Scope

Native athlete `/discover/map` under the local development mock. No location permission was accepted and no production or staging state was changed.

## Finding

The map requested foreground GPS permission immediately on entry and then attempted to center on device location. The selected search area is the authoritative discovery intent; automatic GPS can move the map away from the coaches currently displayed. The actual simulator showed the native map and the platform prompt in `before-autoprompt.png`.

## Fix

Initialize the map from `filters.location`. Location permission is now requested only by the labelled location/recenter control. If it is denied or unavailable the selected search area remains on screen and the user receives an inline explanation.

## Verification

- `npm run typecheck` — passed.
- `npm run test:compile` — passed.
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/discover/map-location-permission.test.js` — passed (1/1).
- Focused ESLint and `git diff --check` — passed.
- The contract asserts that there is no mount `useEffect`, the selected filter coordinates define `initialRegion`, and the permission call is owned by the explicit location action.

## Native retest limitation

After the original prompt was intentionally left unresolved, the local iPhone 16 Pro Max simulator was rebooted to clear it. Its SpringBoard remained on the iOS boot spinner, so a post-fix native screenshot is pending. This is a local simulator limitation, not a passed native result; no after screenshot is claimed.

## External systems

The map screen loaded local mock data only. No Fastify request, Supabase query or mutation, audit-event write, Sentry event, or location permission acceptance occurred. Semantic native traversal remains unavailable under ENV-006.
