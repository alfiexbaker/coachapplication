# Knowledge Spine

Validated: 2026-03-11
Purpose: give humans and agents a short, canonical read path into the repo without duplicating the deeper source docs.

## Read Order

1. `docs/SOURCE_OF_TRUTH.md`
2. `docs/KNOWLEDGE_SPINE.md`
3. Read one domain doc for the task, not all of them by default:
   - `docs/architecture/runtime-modes.md`
   - `docs/architecture/service-ownership-map.md`
   - `docs/architecture/entity-relationship-map.md`
   - `docs/architecture/club-relationship-rules.md`
   - `docs/trust/auth-and-permission-boundaries.md`
   - `docs/ui/loading-error-empty-state-matrix.md`

## Deep Sources To Trust

- Product truth: `docs/SOURCE_OF_TRUTH.md`
- Backend architecture: `docs/backend-api/ARCHITECTURE_BLUEPRINT.md`
- Data model: `docs/backend-api/DATA_MODEL_AND_IDENTIFIERS.md`
- AuthZ and security: `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`
- Pre-API runtime: `docs/backend-api/PRE_API_LIVE_MODE_PLAYBOOK.md`
- Org relationship model: `docs/product-reality/ORG_RELATIONSHIP_MODEL_2026-03-10.md`
- Org permission model: `docs/product-reality/ORG_PERMISSION_AND_VISIBILITY_MATRIX_2026-03-10.md`

## What This Spine Covers

- Which runtime mode the app is really in
- Which service entrypoints are canonical today
- How the core data relationships fit together
- How club roles, ownership, and visibility are supposed to work
- Where auth, authz, and trust boundaries are enforced today
- Which loading, error, and empty-state patterns are the UI default

## Validation Notes

- The repo guidance mentions top-level `services/invite-service.ts` and `services/family-service.ts`, but those files are not present in the current tree.
- The validated unified entrypoints are `services/invite/index.ts` and `services/family/index.ts`.
- The backend package is real and testable, but auth is still scaffolded and not yet aligned with the frontend auth client.

## How To Use This

- Start here when you need fast repo context.
- Do not load every linked doc for every task. Pick the one domain map that matches the work.
- Drop into the linked deep docs when you need exact contracts or sprint history.
- Update these spine files when repo reality changes, especially when a canonical import path or runtime contract changes.
