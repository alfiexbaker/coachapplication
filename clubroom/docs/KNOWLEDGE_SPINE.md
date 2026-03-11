# Knowledge Spine

Validated: 2026-03-11
Purpose: give humans and agents a short read path into the real repo.

## Use This After `docs/START_HERE.md`

1. Read `docs/SOURCE_OF_TRUTH.md`
2. Read this file
3. Pick one domain doc, not the whole tree

## Domain Routing

Runtime mode and mock versus API behavior:
- `docs/architecture/runtime-modes.md`
- `docs/backend-api/PRE_API_LIVE_MODE_PLAYBOOK.md`

Canonical service ownership and entrypoints:
- `docs/architecture/service-ownership-map.md`

Core relationships and entity model:
- `docs/architecture/entity-relationship-map.md`

Club roles, permissions, delegation, and visibility:
- `contracts/club-governance.ts`
- `docs/architecture/club-relationship-rules.md`

Auth, authz, and trust boundaries:
- `docs/trust/auth-and-permission-boundaries.md`
- `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`

UI loading, empty, and error state expectations:
- `docs/ui/loading-error-empty-state-matrix.md`

API design and current route inventory:
- `docs/backend-api/README.md`
- `docs/backend-api/ROUTE_INVENTORY_V1.md`

Org and commercial-model analysis:
- `docs/product-reality/README.md`

Active implementation queue:
- `docs/newsprints/README.md`

## Deep Sources To Trust

- Product truth: `docs/SOURCE_OF_TRUTH.md`
- Club governance source: `contracts/club-governance.ts`
- Shared club contracts and policy: `packages/shared-contracts/src/club/contracts.ts`, `packages/shared-contracts/src/club/policy.ts`
- Backend architecture: `docs/backend-api/ARCHITECTURE_BLUEPRINT.md`
- Data model: `docs/backend-api/DATA_MODEL_AND_IDENTIFIERS.md`
- Authz and security: `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`

## Working Rules

- Do not read every linked doc by default.
- For club authority questions, use the executable governance source before prose.
- For API work, tie every decision back to real UI consumers.
- Update this spine when a canonical path or runtime contract changes.
