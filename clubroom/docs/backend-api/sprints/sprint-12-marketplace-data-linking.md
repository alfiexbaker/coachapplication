# Sprint 12 - Marketplace Data Linking, CSV Round-Trip, and API Cutover Prep

## Goal
Make API integration execution-ready with one linked, database-like test-data backbone across all four product spines, plus a practical CSV round-trip workflow.

## Why this sprint exists
Sprints 00-11 define architecture and implementation sequence. This sprint operationalizes integration:
- one deterministic data pack used by backend, tests, and integration QA
- clear data lineage from UI flows -> services -> API routes -> tables
- one switch to enable/disable marketplace seeding

## Dependencies
- Sprints 00-11 docs and route ownership gates
- `docs/SOURCE_OF_TRUTH.md`
- `docs/backend-api/UI_API_BILATERAL_ALIGNMENT.md`
- `packages/db/prisma/schema.prisma`

## Scope
- deliver linked test data for API-facing entities (identity, family, coach/club, booking/revenue, development/media, community, trust/ops)
- provide per-table CSV exports + linked JSON source + manifest + summary
- support CSV edits and safe write-back into linked JSON
- fail fast on broken references
- expose seed mode in API meta route for runtime visibility

## Deliverables
- generator script:
  - `/Users/tubton/Desktop/coachapplication/clubroom/scripts/marketplace-seed-kit.mjs`
- generated data pack:
  - `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/`
- runbook:
  - `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/README.md`
- command surface:
  - `npm run seed:marketplace:generate`
  - `npm run seed:marketplace:validate`
  - `npm run seed:marketplace:write-back`
- one-switch control:
  - `API_MARKETPLACE_SEED_ENABLED` (seed artifact generation)
  - `API_DATA_BACKEND` (API runtime source toggle: `seed|db`)

## Sprint Plan (Execution Sequence)

## Sprint 12.0 - Fixture Backbone
- freeze the seed dataset contract and table order
- generate deterministic IDs and linked rows
- output linked JSON + CSV + manifest + summary
- gate: validation passes with zero FK/link errors

## Sprint 12.1 - Booking/Revenue Spine Linkage
- map booking/invoice/reconciler tables to API modules and routes
- verify data hits all booking statuses and invoice states used by UI
- gate: booking and invoice API tests run only on generated linked fixtures

## Sprint 12.2 - Development/Media Spine Linkage
- align session notes, goals, assessments, badges, drills, videos, annotations
- ensure visibility boundaries represented in seed data
- gate: progress/media endpoint tests cover private/public note variants

## Sprint 12.3 - Community/Growth Spine Linkage
- align groups/posts/comments/reactions/threads/notifications
- ensure club and thread scopes are represented
- gate: membership-scoped authz checks pass against fixture dataset

## Sprint 12.4 - Trust/Ops Spine Linkage
- align safeguarding/audit/security/retention/legal hold tables
- include realistic open + resolved incident states
- gate: trust-ops route tests verify audit and retention expectations

## Sprint 12.5 - Cutover Controls and De-risking
- wire API adapters to consume fixture-backed persistence in dev
- keep AsyncStorage demo flows isolated behind existing flags
- enforce one-step disable using `API_DATA_BACKEND=db`
- gate: smoke flows pass with seed on and seed off

## Acceptance Criteria
- linked data exists for all API-priority domains and passes validation
- CSV edits can be written back and revalidated in one command
- API meta endpoint surfaces seed mode state
- UI/API bilateral mapping references fixture entities for each spine
- disabling seed mode is a one-variable change

## Risks and Mitigations
- risk: CSV manual edits break links
  - mitigation: mandatory `seed:marketplace:validate` gate
- risk: fixture drift from schema changes
  - mitigation: treat `manifest.json` + validation as contract and update in same PR as schema changes
- risk: mixed mock + API assumptions in UI
  - mitigation: keep fixture IDs stable and map flows by canonical route owner docs

## Exit Criteria
- teams can run a single command to generate realistic full-stack fixture data
- teams can edit fixtures in CSV and safely write back
- API implementation sprints can proceed with consistent, spine-complete data
