# Fundamental Product And Architecture Review

Date: 2026-03-10
Scope: second-pass review of product truth, architecture quality, finance realism, performance signals, and whether the app covers what it fundamentally needs to do.

## Straight Verdict

Clubroom is strong enough to keep building on.

It is not yet deep enough in the right places to claim the core business model is fully solved.

The app is strongest as:

- a coach operations product
- a parent booking and child-development product
- an athlete progress product

The app is not yet equally strong as:

- an owner-led coaching company operating system
- an org finance platform
- an internal operations and trust console

So the answer is:

- architecture: mostly good, with real structure
- product depth: good in coach/family/development, not yet deep enough in org/commercial ownership
- speed: probably acceptable for current feature breadth, but not yet proven by profiling
- fit: good for solo coach and club-like usage, not yet complete for `Johnny's Coaching LTD`-style hierarchy

## What Is Actually Strong

### 1. The app already has real product breadth

Verified earlier in this repo:

- `184` route files under `app/`
- `738` component files
- `173` hooks
- `138` services
- `203` tests

The product is not thin.

It already covers:

- coach schedule, session creation, roster, invite, follow-up, earnings/reconciler
- parent booking, family management, spending, child safety and progress
- athlete goals, badges, health, journal, and progress
- club membership, settings, posts, squads, and branded surfaces

### 2. Core architecture decisions are mostly right

Verified by current code and the architecture audit:

- route constants are centralized in `navigation/routes.ts`
- data access is centralized through `services/api-client.ts`
- services do not import UI or hooks
- hardcoded route pushes were not found in the current audit
- typed event-bus and shared service patterns exist

This is not a spaghetti app.

### 3. Core runtime gates are good

Previously verified in this checkout:

- `npm run typecheck` passed
- `npm run test:safety` passed
- `npm run gate:pre-api-placement` passed
- API typecheck and API tests passed
- coach-core UI flows passed

That matters because it means the repo still has engineering control despite the scale.

## What Is Not Right Yet

## P0: Financial Truth Is Still Mixed

The most important financial correction is this:

- current shipped money flow is not real payout infrastructure
- it is an invoice plus reconciler model with direct/off-app payment instructions

Evidence:

- `app/earnings.tsx` is explicitly a cash reconciliation screen
- `services/coach-payment-instructions-service.ts` says payment is made directly to the coach outside the app
- `services/earnings/payout-service.ts` is mock-backed
- `services/earnings/earnings-report-service.ts` is mock-backed
- `services/earnings/earnings-calculator-service.ts` says all payments are onsite and fees are zero

Implication:

- payout language must be treated as planning or future architecture, not current runtime truth
- org commercial-mode work must preserve current financial honesty while defining future org finance behavior

## P0: Org Commercial Ownership Is Not Yet In Runtime Data Model

The app already models delivery ownership partially:

- `actingAs`
- `clubId`
- `ownerCoachId`
- `assigneeCoachId`

Evidence:

- `constants/app-types.ts`
- `constants/session-types.ts`
- `hooks/use-create-session.ts`
- `components/bookings/booking-ownership-block.tsx`
- `app/book/[coachId]/review.tsx`

But it does not yet model:

- who the family is booking with
- who is billing owner
- who is refund owner
- who is support owner
- whether the session is org-owned commercially or coach-owned commercially

No current code evidence was found for:

- `Booked with`
- `Billed by`
- `commercialOwner`
- `supportOwner`

That is the central missing relationship.

## P0: The Org Pyramid Exists In Language More Than In Runtime Surface

The codebase already knows about:

- `OWNER`
- `ADMIN`
- `HEAD_COACH`
- `COACH`
- `ASSISTANT`

But there is still no first-class runtime surface for:

- org owner dashboard
- ops/admin dashboard
- head coach oversight dashboard
- staff management console
- program management console

The route tree has no real `app/org/*`, `app/organization/*`, `app/staff/*`, `app/program/*`, or `app/academy/*` surface.

What exists today is closer to:

- coach tools
- club settings
- club membership operations
- booking/session ownership controls

That is useful, but it is not yet a full org operating system.

## P1: Test And Audit Truth Still Has Gaps

Previously verified:

- `audit:ui` and `lint:ui-actions` depend on `rg`
- `audit:alerts` can false-green when `rg` is missing

Newly verified in this pass:

- `npm run test:invoices` fails because its glob is quoted in a way that prevents test discovery
- the underlying invoice tests do exist and pass when run directly:
  - `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/invoices/*.js`

Implication:

- some repo signals still say more about script quality than product quality
- this should be fixed before relying on financial test commands as release confidence

## P1: The Architecture Is Good, But Too Much Logic Still Lives In Very Large Files

Static file-size scan shows several high-risk monoliths:

- `app/development/progress-loop.tsx` `1723`
- `hooks/use-create-session.ts` `1418`
- `services/social-feed-service.ts` `1417`
- `hooks/use-progress-loop.ts` `1404`
- `app/sessions/create.tsx` `1388`
- `services/invite/session-invite-service.ts` `1325`
- `services/event-bus.ts` `1291`
- `hooks/use-session-detail-modal.ts` `1268`
- `services/injury-service.ts` `1166`
- `services/discover-service.ts` `1123`

This does not mean the architecture is bad.

It does mean:

- feature depth is accumulating faster than decomposition
- regression risk and onboarding cost are high in these areas
- performance bugs become harder to isolate when heavy screens and hooks stay monolithic

## P1: Component-Service Coupling Is Still Higher Than Ideal

Current architecture audit:

- `222` component-to-service imports
- `0` services importing UI
- `0` services importing hooks

This is much better than logic leaking downward from services into UI.

But it still means a lot of UI components are reaching into business services directly rather than through narrower hooks/view-model seams.

That is survivable, but it is a maintainability tax.

## P2: Demo-First Reality Still Touches Too Much Of The Product

Evidence:

- `services/auth-service.ts` defaults to mock unless env disables it
- `hooks/use-auth.tsx` still contains demo-user compatibility logic
- large numbers of services still have `MOCK_*` datasets
- API runtime still mounts `auth-placeholder`

Implication:

- local development convenience is high
- release-truth confidence is still weaker than it should be

## Is The Architecture Good?

Yes, structurally.

Reasons:

- clear layering exists
- no route-string chaos
- service layer is extensive and reusable
- there is test coverage and automated flow coverage
- the app shell and role-based navigation are disciplined

No, not completely.

Reasons:

- too many large files
- academy/club drift still bleeds through runtime and service naming
- some components call services directly
- script quality still causes false confidence in a few places

Best summary:

- good architecture base
- uneven product truth
- some large-file debt
- still a credible platform to harden rather than rewrite

## Is It Fast?

No definitive answer yet.

What I can say from current evidence:

Positive signs:

- service caches exist
- `useScreen()` provides consistent load-state structure
- large surfaces do use `useMemo`, `useCallback`, `FlatList`, and state segmentation in key places
- current core UI flow runner is green

Risk signs:

- several hot surfaces are very large and likely expensive to reason about
- `progress-loop`, `create-session`, `session detail`, and social feed are obvious candidates for render and interaction cost
- no actual on-device profiling evidence was gathered in this pass

So:

- probably fast enough to continue shipping
- not yet proven fast enough to claim performance is solved
- a profiling pass is still needed for top coach and org screens

## Is It Deep Enough For What The App Needs To Do?

### Deep enough today for:

- solo or small-team coach workflow
- parent booking and child progress visibility
- athlete development and health logging
- club-style membership and content surfaces

### Not deep enough yet for:

- owner-led coaching company operations
- explicit org commercial ownership
- org-wide staffing, cover, reassignment, and workload visibility
- org finance beyond reconciler tracking
- first-class head coach or ops dashboards
- internal staff operations with case management and auditability

## What The App Fundamentally Still Needs

1. A first-class org operating surface
   - owner, ops, head coach, coach, assistant views
2. Explicit commercial ownership model
   - booked with, billed by, refund owner, support owner
3. Honest finance language
   - current reconciler truth versus future payout architecture
4. Staff workload and reassignment tooling
   - not just membership and session creation
5. Org-level issue handling
   - support, complaints, safeguarding ownership
6. Better decomposition in the largest product areas
7. Profiling on the top coach and org screens
8. Fix repo confidence leaks
   - script false-greens and broken test command quoting

## Final Assessment

Clubroom is not a shallow app pretending to be a product.

It is a real product with good bones and strong coach/family/development depth.

The main weakness is not generic quality.

The main weakness is that the app has reached the point where org/commercial truth matters more than adding more surfaces.

If you keep building without resolving that truth, the product will get broader but less believable.

If you lock org relationship, financial honesty, and owner/head-coach operations next, the app is good enough architecturally to support that next phase.
