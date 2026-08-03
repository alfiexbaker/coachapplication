# Start Here

Validated: 2026-07-15
Purpose: give humans and agents the smallest correct starting context for Clubroom.

## Read Order

1. `docs/SOURCE_OF_TRUTH.md`
2. `docs/KNOWLEDGE_SPINE.md`
3. exactly one task-specific deep doc
4. `docs/APP_REPORT.md` only for broad PM/project-status work

Do not read the whole `docs/` tree unless the task is explicitly research-heavy.

## Fast Reality Check

- This is an Expo app with a real Fastify API under `apps/api`.
- Clubroom V1 product truth is DB/API-backed: use Fastify `/v1` plus the `db` backend for real product data.
- Normal app runtime is API-first; retained mock branches are test-only compatibility paths, not live product authority.
- Do not add new mock/demo product data paths unless the exception is explicit, temporary, non-authoritative, and has a `/v1` or provider cutover target.
- Club permissions and delegation now have executable truth in `contracts/club-governance.ts`.
- The main unfinished seams are remaining API/db cutover, broader grant coverage, provider-backed money movement, and route/test drift.
- Old audit dumps, dated product-reality packs, sprint stacks, and completed handoff reports were intentionally removed.

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

- `docs/backend-api/README.md`
- `docs/backend-api/ROUTE_INVENTORY_V1.md`

Broad project status / PM report:

- `docs/APP_REPORT.md`

## Rules

- Prefer executable truth over prose when both exist.
- Prefer current retained docs over old dated notes.
- If a doc contradicts current code, fix the doc or remove it.
- For non-trivial AI implementation slices, use `docs/templates/AI_TASK_PACKET.md` only when it prevents ambiguity, then verify with the narrowest matching `npm run verify:slice*` command.
