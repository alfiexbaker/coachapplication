# Start Here

Validated: 2026-03-11
Purpose: give humans and agents the smallest correct starting context for Clubroom.

## Read Order

1. `CODEX.md`
2. `docs/SOURCE_OF_TRUTH.md`
3. `docs/KNOWLEDGE_SPINE.md`
4. One task-specific deep doc

Do not read the whole `docs/` tree unless the task is explicitly research-heavy.

## Fast Reality Check

- This is an Expo app with a real Fastify API under `apps/api`.
- The app still supports mock and pre-API runtime paths.
- Club permissions and delegation now have executable truth in `contracts/club-governance.ts`.
- The main unfinished seam is auth alignment between frontend and API.
- Old audit dumps and dead sprint packs were intentionally removed.

## Pick The Right Deep Doc

Club roles and permissions:
- `contracts/club-governance.ts`
- `docs/architecture/club-relationship-rules.md`

Runtime modes and mock versus API behavior:
- `docs/architecture/runtime-modes.md`

Service ownership and canonical entrypoints:
- `docs/architecture/service-ownership-map.md`

Data model and entity relationships:
- `docs/architecture/entity-relationship-map.md`

Auth, trust, and permissions:
- `docs/trust/auth-and-permission-boundaries.md`
- `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`

UI state behavior:
- `docs/ui/loading-error-empty-state-matrix.md`

API work:
- `CHATGPT.md`
- `docs/backend-api/README.md`
- `docs/backend-api/ROUTE_INVENTORY_V1.md`

Org/commercial/product-model decisions:
- `docs/product-reality/README.md`

Active implementation and next steps:
- `docs/newsprints/README.md`

## Rules

- Prefer executable truth over prose when both exist.
- Prefer current retained docs over old dated notes.
- If a doc contradicts current code, fix the doc or remove it.
- For non-trivial AI implementation slices, use `docs/templates/AI_TASK_PACKET.md` and verify with the narrowest matching `npm run verify:slice*` command.
