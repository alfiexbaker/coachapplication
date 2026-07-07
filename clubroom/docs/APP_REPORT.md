# Clubroom App Report

Generated: 2026-07-03
Role: project-manager / documentation cleanup pass

## Executive Summary

Clubroom has a real product core and a real backend, but the old docs made the repo look more confused than the code is. The app is now best understood as an Expo football-development OS backed by a Fastify `/v1` API, with mock compatibility still present and API/db cutover still incomplete.

The main docs problem was not missing documentation. It was too much historical prose: dated audits, stale product-reality packs, sprint stacks, and handoff reports competing with current code. Those packs were removed from `docs/`; this report replaces them as the broad PM snapshot.

Current cleanup themes:

- stale documentation removed from `docs/`
- stale untracked `memory/` notes and old untracked review packs removed
- explicit booking confirm lifecycle added across `/v1`, contracts, frontend service bridge, OpenAPI, and route docs
- staging smoke and UI-flow scripts aligned with current API/runtime constraints
- local agent artifacts ignored
- launch route decision queue moved behind an executable audit command

Recent committed slices:

- `4ef22bd fix(booking): add explicit confirm lifecycle`
- `8274bd0 fix(api): constrain staging smoke db pool`
- `221b592 test(ui): align flow checks with api seeds`
- `e0970cc fix(api): archive club audit action`
- `ed60d8b docs(pm): refresh app report cleanup status`
- `fa9eea4 fix(club): preserve api user ids in authority mapping`
- `25d0576 fix(club): preserve invite creator api ids`

## Code Reality Checked

Repository shape sampled from current filesystem:

- Expo route files under `app/`: `154`
- component files under `components/`: `786`
- service files under `services/`: `154`
- API source files under `apps/api/src`: `71`
- test files under `__tests__`: `220`
- API route modules registered by `apps/api/src/app.ts`: auth, health, meta, identity, family-athlete, coach-club, booking, trust-ops, and wave2plus
- backend fixture dataset used by code: `docs/backend-api/test-data/marketplace/linked-dataset.json`

Tracked baseline is much smaller than the filesystem because the worktree still contains a large untracked app/test expansion:

- tracked app files: `10`
- tracked component files: `10`
- tracked service files: `47`
- tracked API source files: `42`
- tracked test files: `15`
- remaining untracked files after this pass: `1581`

Core runtime seams verified by file inspection:

- `services/api-client.ts` blocks generic server-owned storage in API mode and keeps only explicit client-local keys local.
- `navigation/routes.ts` is the route helper source.
- `apps/api/src/app.ts` registers all runtime API modules under `/v1`.
- `apps/api/src/plugins/auth-context.ts` is the auth-context boundary.
- `apps/api/src/lib/authz.ts` is the shared backend authz helper layer.
- `packages/db/prisma/schema.prisma` is the executable database model.
- `/v1/bookings/:bookingId/confirm` is now an explicit lifecycle route; generic API-mode booking updates still fail closed unless they map to a named lifecycle contract.

## What Is Working

- The product has a clear football-only spine: discovery, booking/registration, delivery, payment, proof, rebook, and compliance evidence.
- The app has broad role coverage for coach, parent, athlete, and club operations.
- The backend is not fake scaffolding: `/v1` route modules, auth/session runtime, db/seed modes, API tests, release preflight, and readiness checks exist.
- The service layer is large but meaningfully consolidated around `apiClient`, domain facades, storage-key constants, route helpers, and `Result`-style service errors.
- Sensitive domains have the right architectural direction: backend authority, audit events, assignment-based visibility, no transitive club access, and explicit permission surfaces.
- There are useful verification scripts: `verify:slice`, app/API typechecks, API tests, UI action audits, API boundary audits, staging preflight, and smoke checks.
- `npm run verify:slice:app` now passes after tracking the app test compile config and aligning it with the ES2023 array APIs already used by the app.
- `npm run launch:route-decisions` writes the current route implementation queue to `reviews/launch-route-decisions.md` and `reviews/launch-route-decisions.json`.
- Booking confirmation now has assigned-coach API authority, idempotency/version handling, status-event audit proof, frontend service bridge, and generated OpenAPI coverage.

## Main Risks

- The worktree is currently very noisy: `1581` files remain untracked after the completed cleanup commits and removal of stale local prose. Commit discipline matters or review will become impossible.
- Most remaining untracked files are not prose docs. They are app/components/tests/services/packages, so they need code review and validation, not blanket deletion.
- Some worktree drift remains. The stale root invite tests carrying old `COUNTERED` scenarios were deleted, split invite service coverage is now tracked, the booking facade/split modules are tracked, and the stale untracked booking CRUD/search suites were deleted.
- Project agent setup is now narrower: MCP config is explicit for Codex/Cursor/VS Code, the repo-specific `react-doctor` skill is tracked once under `.agents`, and duplicate local Claude/editor files were removed.
- API cutover is broad but not complete. Mock compatibility and local mirrors still exist by design, so every sensitive change needs runtime-mode scrutiny.
- Money flows are still simulated behind backend provider boundaries. That is acceptable for product rehearsal, not for real provider launch.
- Route count and component count are high enough that dead controls, duplicate actions, and stale route helpers can hide unless audits keep running.
- `docs/backend-api/test-data` mixes executable fixtures and documentation. It stays for now because code imports it, but long term the fixture pack belongs under a clearer non-doc path.
- The full UI flow suite was not rerun during this documentation pass.

## Documentation Cleanup

Removed from `docs/`:

- stale audit dumps
- dated product-reality analysis packs
- old sprint/newsprint stacks
- completed agent handoff reports
- duplicate backend feature/system reports
- old smoke artifacts
- local generated test-account text

Removed from the untracked worktree in this pass:

- `memory/` local lint/sprint/last-step notes
- old untracked `reviews/README.md`, dated codebase audit pack, and dated production recovery plan

Kept under `reviews/`:

- tracked executable audit outputs: architecture hardening, reachability JSON/CSV, and launch route decisions

Kept as canonical:

- `docs/START_HERE.md`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/KNOWLEDGE_SPINE.md`
- `docs/APP_REPORT.md`
- `docs/architecture/*`
- `docs/trust/auth-and-permission-boundaries.md`
- `docs/ui/loading-error-empty-state-matrix.md`
- `docs/backend-api/README.md`
- `docs/backend-api/ROUTE_INVENTORY_V1.md`
- `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`
- `docs/backend-api/DATA_MODEL_AND_IDENTIFIERS.md`
- `docs/backend-api/ARCHITECTURE_BLUEPRINT.md`
- `docs/backend-api/API_CONTRACTS_ERRORS_AND_HANDLERS.md`
- `docs/backend-api/test-data/marketplace` because code/tests use the fixture dataset
- `docs/AI_DEVELOPMENT_PIPELINE.md` and `docs/templates/AI_TASK_PACKET.md`

## AI Development Setup

Use fewer, sharper skills. A giant skill library becomes another token sink.

Keep using:

- `ponytail`: forces deletion, YAGNI, and smallest safe diffs.
- `clubroom-backend-navigator`: best repo-specific workflow for tracing UI to service to `/v1` to authz to repository.
- `react-doctor`: run on React changes before commit when UI code changes.
- `native-data-fetching`: use for network/data-fetching changes.
- `react-native-testing`: use when touching React Native component tests.
- `react-native-best-practices`: use for performance/jank work.
- `security-best-practices`, `security-threat-model`, and `security-ownership-map`: use only for explicit security work, not every feature.
- `sentry`: use when investigating production/runtime errors.
- `playwright`, `agent-device`, and `dogfood`: use for real UI behavior checks.
- `supabase` and `supabase-postgres-best-practices`: use for db/schema/RLS/Supabase work.
- `openai-docs`: use for current Codex/OpenAI product guidance.

Worth adding or wiring tightly:

- Mandatory: Supabase MCP for database/auth/RLS/storage/migration/seed/schema truth for project `oucxazyrimujqmakxfiv`.
- Mandatory: Sentry MCP for production/runtime error triage, release health, crash investigation, and regression checks.
- OpenAI Docs MCP for current OpenAI/Codex docs.
- Context7 MCP for current third-party library docs when current package docs are needed.
- Playwright or Chrome DevTools MCP for browser/UI inspection.
- GitHub plugin/MCP for PR comments, issues, checks, and review threads.
- Figma MCP only when implementing from actual designs.
- Linear or Notion connectors only if those systems contain active product truth.

Worth creating as repo skills, in this order:

- `clubroom-runtime-truth-doctor`: read the required docs, trace code before prose, and return a runtime-path map plus the narrow validation command.
- `clubroom-doc-pruner`: classify docs as canonical, executable artifact, stale review, local note, or delete; never create a new doc when an existing canonical doc should be updated.
- `clubroom-route-contract-auditor`: compare `docs/backend-api/ROUTE_INVENTORY_V1.md`, generated OpenAPI, Fastify routes, frontend services, and tests.
- `clubroom-seed-fixture-auditor`: validate `docs/backend-api/test-data/marketplace` as executable fixture data and flag stale seed IDs used by UI flow scripts.
- `clubroom-ui-flow-verifier`: run targeted Playwright/agent-device flows by role, capture route/action failures, and summarize only actionable breakage.

Do not add:

- a generic "AI project manager" skill that just writes more plans
- a new sprint-doc generator
- per-feature documentation templates unless the feature changes runtime truth
- tools that duplicate local scripts already in `package.json`

OpenAI docs used for this recommendation:

- [Agent Skills](https://developers.openai.com/codex/skills)
- [Customization](https://developers.openai.com/codex/concepts/customization)
- [Model Context Protocol](https://developers.openai.com/codex/mcp)
- [AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Rules](https://developers.openai.com/codex/rules)
- [Hooks](https://developers.openai.com/codex/hooks)
- [Subagents](https://developers.openai.com/codex/subagents)
- [Plugins](https://developers.openai.com/codex/plugins)
- [Best practices](https://developers.openai.com/codex/learn/best-practices)

## Next PM Slices

1. Classify the remaining untracked worktree into three buckets: real source/tests to commit, local/tool files to ignore, stale drift to delete.
2. Use `reviews/launch-route-decisions.md` as the route implementation queue; rerun `npm run launch:route-decisions` after each route cleanup slice.
3. Move executable fixture data out of `docs/` in a dedicated later slice, with import/test path updates.
4. Rehearse API mode end to end with Fastify running, then burn down only failures backed by runtime evidence.

## PM Verdict

The app is not slop by architecture. The risk is accumulated mass: too many screens, old local compatibility paths, stale tests, and docs that used to reward reading history instead of checking runtime truth.

The fix is simple: keep docs thin, make code the source of truth, run the narrow checks, and delete every stale plan as soon as it stops driving real work.
