# UI Product/API QA - 2026-07-05

## Scope

Audited the Expo app in API mode against the local Fastify V1 API and the Expo web server:

- App: `http://localhost:8083`
- API: `http://127.0.0.1:4000/v1/ready`
- Viewport: Playwright iPhone 13 web profile
- Coverage: 71 role routes across coach, parent, athlete, and admin

This was not a native iOS/Android device dogfood pass. It is a web-rendered route and API connection pass.

## Changes Made

- Hardened `scripts/ui-flow-checks-50.mjs` so a route is not counted clean when it silently falls back to login.
- Added medium-severity product-state detection for raw internal IDs, raw service type labels, seeded/demo copy, and the booking-review `Coach unavailable` dead end.
- Fixed API-mode logout client behavior in `services/auth-service.ts` by sending a valid `{}` JSON body and accepting `204 No Content`.
- Reduced parent-route API overfetch by loading light child profiles in global child context and loading trust-sensitive medical/emergency/consent data only on screens that need it.
- Added short read-through caches/deduping for family emergency info, user-scoped child squad memberships, and API booking list reads.

## Validation

- `npm run typecheck` passed.
- `npm run audit:ui:quality` passed.
- `node ./scripts/ui-flow-checks-50.mjs --roles=parent --out-dir=/tmp/ui-flow-checks-parent-http-status` passed.
- `node ./scripts/ui-flow-checks-50.mjs --roles=admin --pause-ms=3000 --out-dir=/tmp/ui-flow-admin-settled-check` passed.

Latest full flow summary from `/tmp/ui-flow-checks-50/report.json`:

- Total flows: 71
- OK: 71
- Failed: 0
- High severity: 0
- Medium severity: 17

## Current Findings

### P1 - User-facing raw IDs and enum labels

Several live API screens render internal IDs or raw enum names instead of product copy. Examples:

- Coach home: `one_to_one with ath_...`
- Parent home/bookings/calendar: `ath_...` and raw service labels
- Squad and club-assigned create flows: `sqd_...`, `clb_...`, `usr_...`
- Earnings/messages: raw service type labels
- Athlete analytics: raw athlete ID in screen content

Fix direction: add display-name/service-label mappers at the service/view-model boundary and make the flow checker fail on these once cleaned.

### P1 - Intermittent API fetch errors still appear in UI flows

The final suite stayed green at route level, but the harness captured medium-severity console errors from API fetches, including athlete home progress loading. A prior parent-focused pass also exposed session invite API loading errors from settings.

Fix direction: trace the failing endpoints with the new `response:<status>:<method>:<url>` flow output and make each screen show a useful inline state instead of logging noisy background failures.

### P1 - Booking review can dead-end on API coach IDs

`/book/:coachId/review` can show `Coach unavailable` for a V1 coach user ID. The current public API has offerings and reviews, but no public coach profile route equivalent to `GET /v1/coaches/:coachId/profile`, so some booking/profile surfaces still stitch API offerings to local coach-directory data.

Fix direction: add a public, permission-safe coach profile endpoint or make the booking review derive enough coach display data from the selected offering/draft.

### P1 - Owner dashboard is still demo/walkthrough-first

With a longer settled check, owner dashboard still shows seeded/demo walkthrough copy. For live, this should be an operational cockpit first: today/this week sessions, unassigned work, staff workload, overdue completions, finance exceptions, safeguarding/support flags, and invite/roster health.

### P1 - Recurring bookings need a real data story

The recurring route renders and the service layer has pause/resume/cancel concepts, but the visible parent recurring screen is still an empty state in the seeded API pass.

Live-ready recurring needs: weekly plans, generated occurrences, skip one week, pause/resume/cancel, coach reassignment, owner visibility, parent cash/bank payment handling, and audit history.

### P2 - Native mobile pass still outstanding

The web/iPhone route pass is useful, but it does not replace native QA. Before live, run agent-device dogfood on iOS and Android for gestures, keyboard behavior, safe areas, navigation stacks, and native rendering differences.

## Readiness Read

The API cutover is structurally in a good place: service boundaries exist, V1 route coverage is broad, route ownership audits pass, and the app no longer has high-severity route failures in the 71-flow suite.

It is not live-polished yet. The main remaining work is product truth: replacing raw backend identifiers, completing the booking/profile data connection, making recurring bookings operational, and turning owner/admin views from seeded walkthroughs into real management surfaces.
