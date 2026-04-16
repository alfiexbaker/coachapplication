# Marketplace Test Data Kit (CSV + Linked JSON)

## Purpose
This kit gives you API-ready, relational test data that looks like a real Clubroom marketplace:
- coaches offering sessions
- real families and athletes in clubs/squads
- bookings/invoices/progress/community/trust-ops linked together

Generated artifacts live in:
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/linked-dataset.json`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/csv/*.csv`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/manifest.json`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/summary.json`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/SEED_VERSION_LOCK.md`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/entity-endpoint-map.csv`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/endpoint-priority-plan.md`
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/smoke/2026-03-03/` (clean-state role smoke artifacts)

Current pack coverage:
- 89 tables
- 974 linked rows
- deterministic IDs with backend prefix strategy (`usr_`, `ath_`, `bok_`, etc.)
- locked fixture baseline: `2026-03-03-marketplace-v2-edge-coverage`
- endpoint map status: `85 implemented` + `4 deferred internal-only`

## Seed Kit On/Off (Generator + CSV Write-Back)
Single switch for seed artifact generation:
- `API_MARKETPLACE_SEED_ENABLED`

Examples:
- On: `API_MARKETPLACE_SEED_ENABLED=1`
- Off: `API_MARKETPLACE_SEED_ENABLED=0`

When `API_MARKETPLACE_SEED_ENABLED=0`, the seed kit script exits without changing files.

## API Runtime Backend Switch
Single switch for API runtime data source:
- `API_DATA_BACKEND=seed|db`

Examples:
- Seed runtime on: `API_DATA_BACKEND=seed`
- Seed runtime off (DB cutover mode): `API_DATA_BACKEND=db`

When `API_DATA_BACKEND=db`, seed-only `/v1` endpoints return `503 SERVICE_UNAVAILABLE`. Core auth, family, booking, invoice, trust, schedule, and upload seams already have db-backed runtime paths; the remaining seed-only routes need separate migration or retirement before full db-backed production cutover.

## Commands
From repo root:

```bash
npm run seed:marketplace:generate
npm run seed:marketplace:validate
npm run seed:marketplace:write-back
```

Direct CLI (custom output folder):

```bash
API_MARKETPLACE_SEED_ENABLED=1 node ./scripts/marketplace-seed-kit.mjs generate --out ./tmp/marketplace
API_MARKETPLACE_SEED_ENABLED=1 node ./scripts/marketplace-seed-kit.mjs validate --out ./tmp/marketplace
API_MARKETPLACE_SEED_ENABLED=1 node ./scripts/marketplace-seed-kit.mjs write-back --out ./tmp/marketplace
```

## CSV Workflow (Exact Flow)
1. Generate baseline:
```bash
npm run seed:marketplace:generate
```
2. Edit any file under:
- `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/csv/`
3. Write edits back into linked JSON + regenerate manifest/summary:
```bash
npm run seed:marketplace:write-back
```
4. Validate referential links:
```bash
npm run seed:marketplace:validate
```

Validation now enforces semantic edge coverage too (not just FK integrity), including:
- parent with kids and parent with no kids
- club-linked member and standalone member account
- multi-coach offering/availability diversity
- paid and outstanding invoice coverage for payment path simulation

## How Linking Works
- The script builds cross-table references first, then validates FK-like links before writing.
- `write-back` re-parses CSV using `manifest.json` type hints so JSON/arrays/booleans/numbers round-trip safely.
- If a CSV edit breaks references (for example, an unknown `athleteId`), validation fails immediately.

## API Integration Notes
- `apps/api` now exposes `marketplaceSeedEnabled` and `apiDataBackend` in `/v1/meta/version`.
- simulated payments path is available via:
  - `POST /v1/invoices/:invoiceId/payments` (payer/admin only)
- Env schema includes:
  - `API_MARKETPLACE_SEED_ENABLED`
  - `API_DATA_BACKEND`
  - `API_MARKETPLACE_SEED_OUTPUT_DIR`
- Seed-to-endpoint mapping for all 89 tables:
  - `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/entity-endpoint-map.csv`
  - includes `priority_tier`, `priority_order`, and `implementation_wave` columns
  - rollout sequence is summarized in:
    `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/test-data/marketplace/endpoint-priority-plan.md`
- App runtime can run a pre-REST live simulation mode (mock + seeded + pulse activity):
  - see `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/PRE_API_LIVE_MODE_PLAYBOOK.md`
  - live seed debug screen: `/development/seed-health`

Use this pack as the canonical fixture source while implementing Sprint 03-10 API modules and bilateral UI/API mapping.
