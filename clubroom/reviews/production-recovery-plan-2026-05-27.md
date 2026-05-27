# Clubroom Production Recovery Plan

Date: 2026-05-27
Purpose: explain exactly where Clubroom is, where the current sprint plan is drifting, and what to do next to reach an App Store ready production release.

This is a review artifact, not a new canonical tracker. The canonical active sprint queue remains `docs/newsprints/sprints/BACKLOG.md`.

## Executive Status

Clubroom is a serious staging product, not a production product yet.

The architecture direction is good:

- Expo app as the primary user surface.
- Real Fastify API under `apps/api`.
- `/v1` routes for many launch-critical flows.
- Shared contracts and executable club governance.
- JWT runtime auth.
- Sentry wiring for app and API.
- A meaningful verification pipeline.

The production risk is not a lack of features. The risk is unresolved truth ownership:

- some launch paths are backend-authoritative;
- some paths still use local storage mirrors;
- some paths still use legacy `/api/*`;
- some sprint docs say one thing while handoff work is happening under a different sprint id;
- staging/prod env is not provisioned enough to rehearse honestly.

## Current Evidence

Commands run on 2026-05-27:

- `npm run verify:slice` -> pass, but only static slice gates.
- `npm run audit:api-boundaries` -> pass with baseline debt still present.
- `node ./scripts/pdos-route-authority-audit.js` -> 154 routes, 90 need decision.
- `node ./scripts/db-staging-preflight.js` -> blocked, 12 blockers, 2 warnings.
- `npm --prefix apps/api run release:preflight` -> fail on production env/storage/Sentry readiness.
- Earlier review validation in this thread: `npm run verify:slice:full` passed, while actual CI gates `npm run lint` and `npm run format:check` failed.

Current boundary debt:

- 256 baselined API/UI boundary findings.
- 102 legacy `/api/*` findings.
- 147 trust-sensitive local-storage findings.
- 5 route literal findings.
- 2 frontend raw fetch findings.

Current staging/prod blockers:

- `API_DATA_BACKEND` not set for staging db mode.
- `DATABASE_URL` missing.
- `API_JWT_SECRET`, `API_JWT_ISSUER`, and `API_JWT_AUDIENCE` missing.
- payment return origins missing.
- simulated payment secret still default.
- object storage config missing.
- Sentry DSN/release not production configured.

## Where The Current Sprints Are Going Wrong

### 1. The active backlog and handoff do not agree

`BACKLOG.md` lists `PROD-API-01` as open, then jumps to PDOS route/product sprints.

`laststep.md` says the team is continuing `PROD-API-02` repeatedly.

The production matrix defines `PROD-API-02` through `PROD-API-09`, but the active backlog does not expose those as first-class current sprint rows.

Impact:

- agents and humans cannot tell whether `PROD-API-02` is official current work or hidden matrix work;
- progress is happening, but the canonical queue is not the same as the handoff;
- this makes the project feel more confusing than it is.

Fix:

- update `BACKLOG.md` so `PROD-API-02` through `PROD-API-09` are the visible current production hardening queue;
- keep PDOS as product classification, not the immediate release execution sequence.

### 2. The sprint order mixes release blockers with product polish

The backlog order is:

1. `OBS-RUNTIME-01`
2. `PROD-API-01`
3. `UX-QA-01`
4. `PDOS-*`

That reads as if observability, API authority, UI QA, and PDOS product decisions are separate lanes. For release readiness, they are not separate. A flow is not done unless backend authority, UI linkup, observability, and release gate proof all exist.

Impact:

- product routes can keep getting improved while staging is still blocked;
- UI quality can pass static checks while production env/release rehearsal is impossible;
- API slices can land without removing enough frontend/local authority.

Fix:

- run release work by P0 journey, not by document category.
- each sprint slice must close API authority plus UI linkup plus evidence.

### 3. `verify:slice` is useful, but can look greener than reality

`npm run verify:slice` currently passes.

But:

- it does not run app typecheck unless `--app`;
- it does not run API tests unless `--api`;
- it does not run CI lint or Prettier format;
- it warns on DB staging and PDOS route decisions without failing.

Impact:

- a local slice can report green while CI or release readiness remains red.

Fix:

- keep `verify:slice` for small guardrails;
- add a release gate command for production work that includes app gates, API gates, lint, format, db staging preflight, release preflight, and API boundary audit.

### 4. The docs still describe some stale or contradictory realities

Examples:

- `START_HERE.md` still lists `CHATGPT.md` under API work, while `CHATGPT.md` is deleted in the current worktree.
- `SOURCE_OF_TRUTH.md` says old audit dumps were deleted and should not be resurrected, but `docs/audits/` is currently untracked.
- `BACKLOG.md` says current active work is `PROD-API-01`; `laststep.md` says current work is `PROD-API-02`.

Impact:

- agents can follow the rules and still arrive at inconsistent starting points.

Fix:

- do one doc-sync slice before more broad implementation:
  - reconcile `BACKLOG.md` with `laststep.md`;
  - remove stale `CHATGPT.md` references or restore the file intentionally;
  - decide whether untracked `docs/audits/` should be deleted or moved to `reviews/`.

### 5. Product breadth is still tempting the team away from release truth

The PDOS plan is valuable, but it is broad. The release blocker is not "more PDOS polish"; it is the paid-development loop being fully backend-authoritative:

discover -> offer -> readiness -> booking/registration -> payment -> delivery -> attendance -> proof -> review/rebook -> compliance evidence.

Impact:

- too many routes still need decisions;
- the team can improve isolated surfaces without proving the production loop.

Fix:

- ignore non-loop features until the loop rehearses in db-backed staging.

## Exact Current State By Area

### Green enough to build on

- Fastify `/v1` runtime exists.
- Runtime auth is JWT-backed.
- Production server disables header auth override.
- Booking create/list/detail/cancel/reopen/complete have much stronger backend proof than before.
- Group-session registration/payment/cancellation/attendance has improved backend authority.
- Booking-linked reviews now have a backend write path and non-mock UI submission path.
- Video/uploads have a `/v1` shape.
- Sentry code wiring exists.
- Static route loading coverage exists for all 154 app routes.
- Native `Alert.alert` audit is clean.

### Yellow, not release-safe

- API boundary baseline still carries 256 allowed findings.
- 90 routes still need product/source-of-truth decisions.
- Local mirrors remain too broad.
- Coach profile review reads still need full `/v1` linkup.
- Rebook context authority is not fully closed.
- Invite repository ownership/idempotency is not fully extracted.
- Media upload finalization/malware scan enforcement is not fully closed.
- Club admin operations and events/RSVP/schedule still carry seed/legacy risk.
- Guardian sharing backend authority is not fully proven.
- Earnings/payouts/withdrawals are not production money authority.
- Production analytics plan is not yet formalized.

### Red, blocks release

- Staging preflight blocked by missing env and object storage.
- Production release preflight fails.
- CI lint fails.
- Format check fails across many files.
- API package install/workspace health is inconsistent.
- App Store privacy/legal/data-safety work is not started.
- No end-to-end db-backed production rehearsal has passed.

## Recovery Plan

### Phase 0: Stop The Confusion

Goal: make the project status obvious to humans and agents.

Work:

1. Reconcile `BACKLOG.md` and `laststep.md`.
2. Promote `PROD-API-02` through `PROD-API-09` into the active queue.
3. Mark PDOS items as classification/product hardening, not the immediate execution lane.
4. Remove stale `CHATGPT.md` references or restore it intentionally.
5. Move/delete untracked audit docs so old audit dumps do not come back under `docs/`.

Done when:

- a new contributor can read `BACKLOG.md` and know the next release slice without reading old handoff archaeology.

Verification:

- `git diff --check`
- `npm run verify:slice`

### Phase 1: Make Local And CI Truth Match

Goal: no more "slice green, CI red" confusion.

Work:

1. Fix lint errors.
2. Run Prettier or intentionally narrow format scope.
3. Fix API workspace/package install state.
4. Add API typecheck/test to CI.
5. Decide whether `verify:slice:full` or a new `verify:release-readiness` is the mandatory pre-release gate.

Done when:

- `npm run lint` passes.
- `npm run format:check` passes or is intentionally replaced.
- API dependency health is explainable.
- CI runs API tests.

Verification:

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run test:compile`
- `npm --prefix apps/api run typecheck`
- `npm --prefix apps/api run test`

### Phase 2: Provision Staging And Observability

Goal: make release rehearsal possible.

Work:

1. Provision staging Postgres.
2. Set API staging env:
   - `API_DATA_BACKEND=db`
   - `DATABASE_URL`
   - `API_JWT_SECRET`
   - `API_JWT_ISSUER`
   - `API_JWT_AUDIENCE`
   - payment return allowlist
   - unique simulation secret
3. Provision private object storage.
4. Configure app and API Sentry DSNs.
5. Set explicit `SENTRY_RELEASE`.
6. Confirm API source-map upload and Expo source-map upload.
7. Confirm app starts in API mode only while API is reachable.

Done when:

- `/v1/ready` is ready or only degraded for an intentional known reason.
- staging smoke can run against real API/db/storage.

Verification:

- `node ./scripts/db-staging-preflight.js`
- `npm --prefix apps/api run release:preflight`
- `curl http://127.0.0.1:4000/v1/ready`
- Sentry issue list review

### Phase 3: Close P0 Authority Gaps

Goal: no production-critical journey depends on local/mock/legacy truth.

Work in this order:

1. Health/injury/emergency readiness:
   - route injury service through `/v1/athletes/*`;
   - remove non-mock local emergency info authority;
   - audit sensitive reads.
2. Coach supply/storefront:
   - profile writes;
   - offering writes;
   - verification document authority;
   - discover/profile/book wizard agreement.
3. Invites and rebook:
   - full invite repository ownership;
   - idempotency for every write;
   - rebook context authority.
4. Media/proof:
   - upload finalization;
   - malware scan enforcement;
   - no media available before scan result.
5. Club ops:
   - club create/member/squad/branding authority;
   - schedule/event/RSVP backend ownership;
   - remove hardcoded club context.
6. Money:
   - remove or backend-own payouts/withdrawals;
   - keep simulated hosted provider clearly isolated;
   - define Stripe/SMS/2FA launch decision.
7. Community/messaging/notifications:
   - backend-own writes or hide/defer them for launch.

Done when:

- `npm run audit:api-boundaries` keeps shrinking.
- no launch-critical path requires `/api/*` or local product truth in non-mock mode.

Verification:

- `npm run verify:slice:api` for API slices.
- `npm run verify:slice:app` for UI linkups.
- role/deny tests for every trust-sensitive path.
- `npm run audit:api-boundaries`.

### Phase 4: Define Analytics Without Leaking Trust Data

Goal: production analytics is useful without collecting sensitive content.

Work:

1. Define event taxonomy:
   - signup;
   - coach go-live;
   - discover/search/profile view;
   - booking start/create/cancel/reopen;
   - invoice/payment/refund;
   - group registration;
   - attendance/completion;
   - review/rebook;
   - safeguarding create metadata only.
2. Decide analytics tools.
3. Add consent/opt-out behavior.
4. Add backend business-event table for critical money/booking events.
5. Make analytics payload rules explicit:
   - no medical free text;
   - no safeguarding details;
   - no child notes;
   - no chat content;
   - no payment details.

Done when:

- product dashboards answer activation, conversion, payment, retention, and operational failure questions.

Verification:

- event payload review;
- store privacy/data safety draft;
- Sentry plus product analytics test events in staging.

### Phase 5: App Store Readiness

Goal: submit only after staging proves the release loop.

Work:

1. App Store Connect and Play Console records.
2. Privacy policy, terms, support, safeguarding, refund/cancellation docs.
3. Account deletion/export process.
4. Store data disclosures for Apple and Google.
5. Demo accounts for each role.
6. Screenshots and review notes.
7. TestFlight/internal Play testing.
8. Staged rollout plan.

Done when:

- store metadata and privacy answers match the real SDK/data behavior.
- app review can exercise the product without mock/demo shortcuts.

Verification:

- TestFlight build.
- internal Play track.
- production-like API environment.
- Sentry clean review.

## Corrected Sprint Order

Use this execution order until production rehearsal passes:

1. `DOC-SYNC-01`: reconcile backlog/handoff/current matrix.
2. `CI-01`: make local CI gates green and add API checks to CI.
3. `OBS-RUNTIME-01`: finish Sentry/runtime smoke with real API reachable.
4. `STAGE-ENV-01`: provision staging DB, object storage, JWT, Sentry, payment allowlist.
5. `PROD-API-02`: finish booking/review/rebook authority and mirror cleanup.
6. `PROD-API-03`: health, injury, emergency, consent, guardian sharing.
7. `PROD-API-04`: coach supply, verification, storefront/discover truth.
8. `PROD-API-05`: group sessions/camps/attendance/proof.
9. `PROD-API-06`: invoice/payment/refund/payout decision.
10. `PROD-API-08`: club ops, schedule, staff, compliance evidence.
11. `ANALYTICS-01`: product analytics and safe event taxonomy.
12. `STORE-01`: legal/privacy/store submission package.
13. `PROD-API-09`: full staging production rehearsal.
14. `RELEASE-01`: TestFlight/internal Play, then staged rollout.

## What Not To Do Next

- Do not start broad PDOS polish before staging is provisioned.
- Do not submit to stores while mock/demo paths can appear.
- Do not treat `verify:slice` as a release signal.
- Do not add another planning doc under `docs/`.
- Do not expand features until the paid-development loop is backend-authoritative.
- Do not add analytics events that include sensitive free text.

## One-Sentence Reality

Clubroom has the right skeleton and a lot of real backend authority, but the team is currently losing clarity because the active sprint queue, handoff log, release gates, and production env reality are not aligned around one measurable release path.
