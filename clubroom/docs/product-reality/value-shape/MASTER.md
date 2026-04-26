# Value Shape Master

Updated: 2026-03-18
Purpose: make one canonical product-shape cleanup plan from the current value audit, code review, and docs triage.

## What This File Is

Use this file when deciding what to keep, cut, or sprint next.

Treat these files as source notes, not the final queue:

- `../VALUE_SHAPE_AUDIT.md`
- `../VALUE_SHAPE_BACKLOG.md`

## Straight Answer

Yes, Clubroom is building something useful.

The useful core is already visible in:

- booking detail and booking trust
- coach schedule, delivery, and earnings operations
- owner staffing and oversight
- family calendar, recurring plans, and trust-sensitive child coordination
- verification and safeguarding-adjacent trust signals

The weak part is not lack of features. It is too much product mass around the useful core:

- generic home dashboards
- social/feed/community weight
- duplicate operations entrypoints
- summary-heavy finance and family surfaces

If Clubroom keeps narrowing toward coordination plus marketplace trust, it is worth building.
If it keeps adding social/dashboard breadth around that core, it will feel busy rather than valuable.

## Verified Signals

Repo verification currently confirmed for this tracker:

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/verification-service.test.js` -> PASS (`3/3`)
- `npm --prefix apps/api run typecheck` -> PASS
- `npm run audit:architecture` -> PASS
- `npm run ui:flows:coach-core` -> BLOCKED because `http://localhost:8083` was unreachable in local preflight

Architecture audit output:

- route files: `187`
- component files: `737`
- reachable components: `724`
- non-reachable components: `13`
- component -> service imports: `220`
- services importing UI: `0`
- services importing hooks: `0`
- hardcoded routes: `0`
- `.ok` result-pattern drift: `28`
- services with `throw`: `4`

Documentation reality:

- there is no `.docs/` folder in this repo
- the retained docs live under `docs/`

## Product Verdict By Surface

### Strong And Worth Doubling Down On

These surfaces already show a believable product:

- `app/(tabs)/bookings/[id].tsx`: clear ownership, trust, billing, delivery, and follow-up language
- `app/(tabs)/bookings/index.tsx`: sessions are a real product center for both coaches and families
- `app/club/[clubId]/dashboard.tsx`: owner dashboard is specific, operational, and role-shaped
- `app/family/calendar.tsx`: strongest family surface because it organizes real weekly work
- `app/verification/index.tsx`: verification still matters because it supports booking trust and search conversion

### Weak Or Bloated

These surfaces currently dilute the core:

- `components/user/home-screen.tsx`: generic stats, streaks, badges, walkthrough, and club filler
- `app/family/index.tsx`: duplicated dashboard summaries before action
- `app/family/spending.tsx`: chart-first and low-action
- coach operations still need tighter prioritization, but the old `app/manage/index.tsx` bridge has now been reduced to a redirect instead of a standalone operations dashboard
- the standalone `app/payments/index.tsx` redirect has been removed; money work now belongs in earnings and invoice/reconciler surfaces
- `app/(tabs)/coach-profile.tsx` and `hooks/use-coach-profile.ts`: still belong below schedule, delivery, and earnings even after the language cleanup

## Docs Triage

### Canonical Now

These should remain the main retained docs:

- `docs/START_HERE.md`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/KNOWLEDGE_SPINE.md`
- `docs/architecture/service-ownership-map.md`
- `docs/trust/auth-and-permission-boundaries.md`
- `docs/ui/loading-error-empty-state-matrix.md`
- `docs/backend-api/README.md`
- `docs/newsprints/sprints/BACKLOG.md`
- this file

### Useful But Dated

Keep these, but do not plan directly from them without re-checking code:

- `docs/admin/ADMIN_OPERATIONS_REALITY_2026-03-03.md`
- the dated org/product-reality analysis files in `docs/product-reality/`

Reason:

- the structural thinking is still useful
- some counts, academy language, and runtime assumptions are no longer current

### Needs Refresh Or Demotion

- the removed `docs/product-reality/progress.md` and `docs/product-reality/sprints/*` queue had drifted from current repo truth; `docs/newsprints/*` is the only active execution queue and this file remains the product-shape cleanup reference
- generated `docs/audits/*` output from scripts should be treated as transient artifacts, not canonical planning docs

## Sprint Shape

## Current Progress

- `VS-01` is now landed:
  - parent-like users now land on the family calendar from the tab home
  - the first parent-like tab now reads `Family`
  - seeded family demo entry now starts at the real runtime home
  - the old parent-discover home surface was removed as dead code
  - `Family Dashboard` is now explicitly framed as `Family Overview`
- `VS-02` is now landed:
  - `Family Overview` is reduced to shortcuts, upcoming sessions, child progress entry, and trust context
  - family spending is now framed as `Spending Records` instead of a chart-led finance destination
  - dead family summary components were removed with the screen change
  - owner dashboard now routes straight into staffing, oversight, session launch, and invite work without bouncing through `/manage`
  - `/manage` remains only as a coach/head-coach bridge when the app does not know which club context to open first
- `VS-03` is now landed:
  - feed is no longer a primary tab for coach, parent-like, athlete-like, or admin users
  - the main updates surface no longer merges friend-feed content into the booking-and-club runtime
  - coach detail and generic profile CTAs now use connection language instead of friend/follow wording
  - coach-owned profile content now reads like updates and network context rather than follower energy
  - the old community hub now reads as a private groups surface for coordination work
  - public group discovery and join mechanics are no longer given product weight in the dedicated groups route
- `VS-04` is now landed:
  - help, account, privacy, and verification surfaces no longer pretend to complete actions that do not exist
  - password reset, lifecycle, and data-export requests now open support-assisted email flows instead of fake success toasts
  - email and phone verification status remain visible but are no longer presented as tappable in-app completion paths
  - verification status now resolves from the signed-in coach instead of the hardcoded demo account
- `VS-05` is now landed:
  - the insurance verification route now uses a dedicated hook instead of reaching directly into the service layer
  - the active account/help cleanup hooks are materially smaller than the placeholder-heavy versions they replaced
  - `README.md` now points only at current retained docs and no longer references deleted files

### VS-01 Relationship-First Entry And Family Spine

Status:

- `DONE` on 2026-03-17

Objective:

- route parent-like users to the family operating surface that matches their real job

Scope:

- make `Family Calendar` the primary parent home
- stop splitting parent identity between seeded role entry and generic `USER` home routing
- keep recurring, booking detail, and trust actions close to the family calendar

Acceptance:

- parent demo entry, runtime home routing, and family navigation tell the same story
- `Family Dashboard` becomes a thin gateway or stops being primary

### VS-02 Cut Duplicate Summary Surfaces

Status:

- `DONE` on 2026-03-17

Progress in this slice:

- removed family overview stats, recognition-first UI, and next-session spotlighting
- reduced family overview to action-first family entry points
- rewrote family spending into records plus child totals instead of charts and filters
- deleted the now-dead family chart and recognition components
- merged owner manage entry into dashboard links while keeping `/manage` as a minimal coach/head-coach bridge

Objective:

- remove summary UI that repeats information without improving decisions

Scope:

- reduce or remove family dashboard stats and recognition-first panels
- demote family spending from chart destination to contextual ledger/support view
- merge `Manage` into owner dashboard actions instead of keeping a second ops home

Acceptance:

- fewer top-level destinations
- less "overview before action"
- owner and family users reach real work in one step

### VS-03 Professionalize Discovery, Feed, And Relationships

Status:

- `DONE` on 2026-03-18

Progress in this slice:

- removed feed from primary tab navigation so sessions, messages, and profile carry the main runtime weight
- reframed `Feed` as `Updates` with club-and-coach relationship copy instead of social-feed copy
- removed extra friend-feed merging from the main updates surface
- replaced follow/friend wording on coach detail and generic profiles with connection language
- reframed the old `Community` route as a private `Groups` directory for coordination work
- removed public discovery/join framing from the dedicated groups hub
- cleaned group-versus-squad wording so club structure does not masquerade as generic community

Objective:

- make Clubroom read like a football coaching marketplace, not a social network

Scope:

- remove friend/friends semantics from profile, coach detail, and feed
- demote feed from center-stage navigation
- quarantine community groups from the core product path
- keep discovery only where it improves booking conversion or relationship expansion

Acceptance:

- coach relationships use professional conversion language
- feed/community are no longer core navigation weight for the main value story

### VS-04 Trust And Account Honesty

Status:

- `DONE` on 2026-03-18

Progress in this slice:

- replaced placeholder help actions with real support email and share flows
- made account password, pause, closure, and data-export actions support-assisted instead of fake completion toasts
- removed fake email and phone verification actions while keeping their status visible
- fixed verification loading so coach trust state resolves from the signed-in account instead of the hardcoded demo coach

Objective:

- make trust-sensitive surfaces honest about what is real, incomplete, or unavailable

Scope:

- replace help/settings placeholder toasts with real actions or remove the rows
- make account lifecycle copy and behavior honest
- keep verification prominent, but remove fake completion actions for email/phone if they are not real
- preserve safeguarding, blocking, and health visibility as explicit relationship controls

Acceptance:

- no trust-critical row implies a completed action when the action does not exist
- settings/help surfaces stop lowering confidence

### VS-05 Code-Health And Docs Integrity

Status:

- `DONE` on 2026-03-18

Progress in this slice:

- extracted the insurance verification view-model into a dedicated hook so the route no longer talks to the verification service directly
- shrank the active help/account cleanup hooks while removing placeholder lifecycle logic
- refreshed `README.md` to point only at current retained docs and removed deleted doc references
- kept app and API verification gates aligned so README and tracker claims are testable again

Objective:

- reduce the maintenance tax that makes product cleanup slower and riskier

Scope:

- split the biggest route/hook/service monoliths first
- reduce direct component -> service reach where a hook/view-model seam is clearer
- repair the shared-contract export break so API typecheck is honest again
- refresh stale doc entrypoints and stop relying on deleted references

Acceptance:

- app and API typecheck both pass again
- the largest active files start shrinking
- entrypoint docs match the real repo

## Decision Rule For Future Work

Keep a surface only if it clearly improves at least one of these:

- booking conversion
- family or club coordination
- delivery follow-up
- trust ownership
- revenue or operating clarity

If it mainly adds summary, social noise, or placeholder control panels, cut it, merge it, or demote it.
