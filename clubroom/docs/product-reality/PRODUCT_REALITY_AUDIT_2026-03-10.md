# Product Reality Audit

Date: 2026-03-10
Scope: current repo state verified against code, targeted checks, and current runtime gates

## Executive Verdict

Clubroom is now a strong pre-production app with broad feature coverage, but the remaining risk is no longer "basic functionality missing everywhere".

The remaining risk is product-truth drift:

- some parts of the system are real and solid
- some parts are still demo-first or scaffold-first
- some parts use the wrong mental model for a coaching marketplace
- some internal quality scripts now give false confidence because the toolchain they expect is not present

The planning priority should shift from generic hardening to:

1. remove false confidence
2. fix trust-boundary inconsistencies
3. decide the product's real social and organizational model
4. tighten coach-business realism

## Verified Current Health

Verified on 2026-03-10:

- `npm run typecheck` -> PASS
- `npm run test:safety` -> PASS (`73/73`)
- `npm run gate:pre-api-placement` -> PASS (`13/13`)
- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`26/26`)
- `npm run ui:flows:coach-core -- --fail-on=none` -> PASS (`11/11`, `0` medium, `0` high)
- `npm run audit:architecture` -> PASS, fresh report generated

Important caveat:

- `npm run lint:ui-actions` and `npm run audit:ui` currently fail in this environment because their scripts require `rg` and `ripgrep` is not installed.
- `npm run audit:alerts` currently reports false zeroes for the same reason because it catches the `rg` failure and silently returns `0`.

Direct source checks instead show:

- native `Alert.*`: `0`
- `uiFeedback.alert(...)`: `88`
- `uiFeedback.showToast(...)`: `405`
- `uiFeedback.choose(...)`: `7`

This is a process problem, not just a local shell annoyance. It means some quality gates can currently lie.

## Current Architecture Snapshot

Current codebase size in this checkout:

- route files under `app/`: `184`
- routable surfaces excluding layouts and `+html`: `174`
- components: `738`
- hooks: `173`
- services: `138`
- test files: `203`

Fresh architecture audit (`docs/audits/architecture-hardening-report-2026-03-10.md`) reports:

- reachable components: `726`
- non-reachable components: `12`
- component imports services: `222`
- services importing UI/hooks: `0`
- hardcoded route pushes: `0`
- `.ok` result-pattern drift: `28`
- services with `throw`: `4`

The structure is fundamentally good. The remaining risk is not total architectural collapse. It is uneven truth and high coupling in some presentation layers.

## Stale Findings To Retire

These older findings should not be carried into new planning without re-verification:

1. `discover-sessions` provider crash
   - older audits were correct at the time
   - current `app/_layout.tsx` wraps the authenticated stack in `BookingFlowProvider`
   - the old "top-level route outside provider" finding is stale

2. Notification settings entry route was previously miswired
   - current `app/settings/notifications/index.tsx` re-exports `./preferences`
   - the persisted screen is now the main route

3. Privacy settings were previously described as local-only
   - current `hooks/use-privacy-settings.ts` uses `privacySettingsService`
   - current `services/privacy-settings-service.ts` persists values

4. Cancellation policy UI was previously behind service capability
   - current `app/settings/cancellation-policy.tsx` uses `useCancellationPolicySettings`
   - the settings surface is now connected to the real policy model

5. Club settings were previously called mostly fake
   - current `hooks/use-club-settings.ts` calls real service methods for details, invite codes, branding, and delete
   - current `services/social-feed-service.ts` implements those mutations

This matters because stale backlog poison is one of the fastest ways to waste engineering time.

## Current "Not Right" Findings

### P0: Audit And Tooling Truth Is Broken

#### 1. Some quality scripts currently fail or lie when `rg` is missing

Why it matters:

- the team can think UI and alert audits are green when they are not even running properly
- planning confidence becomes unreliable

Evidence:

- `scripts/audit-alert-usage.js` shells out to `rg` and returns `0` on failure
- `scripts/lint-ui-actions.js` shells out to `rg` and fails hard without it
- `scripts/audit-ui.js` shells out to `rg` and fails hard without it

Required response:

- make these scripts fail loudly when dependencies are missing
- or remove the `rg` dependency from repo-critical gates

### P1: Product Model And Trust Gaps

#### 2. Coach relationship language is wrong for a coaching marketplace

Why it matters:

- the product currently mixes professional coach-following with consumer "friend" language
- that weakens trust, positioning, and UX clarity

Evidence:

- `hooks/use-coach-detail.ts` labels the primary coach connection action as `Add Friend`
- `app/profile/[userId].tsx` uses `Send Friend Request` / `Friends`
- `services/follow-service.ts` models mutual follows as "friends"
- `app/(tabs)/feed.tsx` merges a `friendFeed` into the main feed

Current reality:

- the app has a social graph
- the app does not have a settled professional relationship model
- coach surfaces currently read like a social network, not a coaching business platform

#### 3. Blocking is not integrated with the social graph

Why it matters:

- users can block someone for messaging/booking/search purposes
- but the follow/friend layer still exists outside that trust boundary

Evidence:

- `services/block-service.ts` is enforced in:
  - `services/booking/booking-crud-service.ts`
  - `services/messaging-service.ts`
  - `services/user-service.ts`
- `services/follow-service.ts` never references `blockService`
- no current follow-request codepath severs or rejects existing follow/friend links because of a block

Current reality:

- "blocked" means different things in different subsystems
- that is not acceptable if trust and safeguarding are core product claims

#### 4. Club vs academy is still undecided in the product model

Why it matters:

- organizational users need one coherent mental model
- the repo still hints at a separate academy product surface without actually shipping one

Evidence:

- `navigation/routes.ts` still defines `ACADEMY_CREATE`, `ACADEMY_JOIN`, and dynamic `academy(...)` route builders
- there is no `app/academy/*` route tree
- there is no first-class `ACADEMY_LEADER` role in runtime auth
- current org behavior is effectively "club membership layered onto coach/admin accounts"

Current reality:

- the codebase partially models academy as a first-class concept
- the shipped app does not

#### 5. Account lifecycle semantics are still only partially honest

Why it matters:

- account deletion, deactivation, and password change are high-trust flows
- fake-success messaging here is worse than an explicit "not available yet"

Evidence:

- `hooks/use-account-settings.ts`
  - password change -> toast only
  - deactivate account -> success toast + logout
  - delete account -> local request record only
- some account update flows are now real:
  - email update persists through `userService.updateUserProfile(...)`
  - phone update persists through `userService.updateUserProfile(...)`

Current reality:

- the screen mixes real account updates with placeholder lifecycle actions
- this needs explicit product copy and real state transitions

#### 6. Coach shared-health review exists in service logic but not in product surfaces

Why it matters:

- a coach working with minors and parents needs a clear, intentional view of shared injuries and recovery constraints
- right now that capability is implied more by the service layer than by the routed UI

Evidence:

- `services/injury-service.ts` exposes `getAthleteInjuries(...)`
- grep across `app/`, `components/`, and `hooks/` shows no routed surface using it

Current reality:

- athlete/parent health exists as a product flow
- coach health review is still not first-class

#### 7. Demo/default runtime still weakens product-truth testing

Why it matters:

- the app can look "green" while still relying on demo users and mock-first auth behavior

Evidence:

- `hooks/use-auth.tsx` still embeds large demo-user state
- `services/auth-service.ts` defaults to mock mode unless `EXPO_PUBLIC_USE_MOCK === 'false'`
- API runtime still uses `apps/api/src/plugins/auth-placeholder.ts`

Current reality:

- the product is strong in local/demo mode
- it is not yet honest enough by default for release-grade auth confidence

### P2: Process And Documentation Drift

#### 8. Docs and entrypoints drift from the actual repo

Evidence:

- `README.md` references `docs/ROADMAP.md` and `docs/USER-STORIES.md`
- those files do not exist in this checkout

Impact:

- onboarding confidence drops
- planning starts from stale or missing references

#### 9. Architecture debt is now about precision, not foundation

Evidence:

- `222` component -> service imports
- `12` unreachable components
- `28` `.ok` drifts
- `4` service files still containing `throw`

Impact:

- not a launch blocker by itself
- but it increases regression risk and makes product-truth cleanup slower

## What Already Feels Believable

These areas now look materially more real than the older audits suggest:

- role-based app shell and route ownership
- booking creation path
- safety suite and trust regression coverage
- club settings persistence
- privacy settings persistence
- notification preferences persistence
- cancellation-policy editing
- coach-core runtime path

The new sprint plan should preserve these gains and stop re-litigating already-fixed issues.

## Planning Consequence

The next planning layer should not be organized by random feature buckets.

It should be organized by product truth:

1. audit honesty and release confidence
2. relationship model and social graph
3. coach-business realism
4. family trust and shared health
5. club/academy organizational model
6. account lifecycle truth
7. admin/auth/runtime reality
