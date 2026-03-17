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
- placeholder settings/help actions
- duplicate operations entrypoints
- summary-heavy finance and family surfaces

If Clubroom keeps narrowing toward coordination plus marketplace trust, it is worth building.
If it keeps adding social/dashboard breadth around that core, it will feel busy rather than valuable.

## Verified Signals

Repo verification run during this pass:

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- targeted coach-conversion utility test -> PASS (`2/2`)
- `npm run audit:architecture` -> PASS
- `npm run ui:flows:coach-core` -> BLOCKED because `http://localhost:8083` was unreachable in local preflight
- API tests and API typecheck were not re-run in this slice

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
- `app/manage/index.tsx`: another operations index on top of stronger owner/manage destinations
- `app/community/index.tsx` and `app/community/[groupId].tsx`: community groups still sit as a social-product residue rather than a clear booking or coordination surface
- `app/payments/index.tsx`: pure redirect, not a real feature
- `hooks/use-help-screen.ts`: multiple "coming soon" actions
- `hooks/use-account-settings.ts`: lifecycle flows still contain placeholder semantics
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

- `README.md`: references docs that do not exist in this checkout
- `docs/newsprints/*` and `docs/product-reality/*` both act like active queues; keep `newsprints` as engineering execution and use this file for product-shape cleanup
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
- `VS-03` is now in progress:
  - feed is no longer a primary tab for coach, parent-like, athlete-like, or admin users
  - the main updates surface no longer merges friend-feed content into the booking-and-club runtime
  - coach detail and generic profile CTAs now use connection language instead of friend/follow wording
  - coach-owned profile content now reads like updates and network context rather than follower energy
  - community group routes still exist as secondary surfaces and remain the next cut in this track

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

- `IN PROGRESS` on 2026-03-18

Progress in this slice:

- removed feed from primary tab navigation so sessions, messages, and profile carry the main runtime weight
- reframed `Feed` as `Updates` with club-and-coach relationship copy instead of social-feed copy
- removed extra friend-feed merging from the main updates surface
- replaced follow/friend wording on coach detail and generic profiles with connection language
- kept community-group cleanup open rather than pretending the social residue is fully gone

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
