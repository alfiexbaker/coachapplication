# Backend Test Data

Purpose: fixture data used by API tests, seed-mode runtime, and db import helpers.

## Live Fixture Pack

Keep this path stable until a dedicated fixture directory migration is done:

- `docs/backend-api/test-data/marketplace/linked-dataset.json`
- `docs/backend-api/test-data/marketplace/csv/*.csv`
- `docs/backend-api/test-data/marketplace/manifest.json`
- `docs/backend-api/test-data/marketplace/summary.json`
- `docs/backend-api/test-data/marketplace/SEED_VERSION_LOCK.md`
- `docs/backend-api/test-data/marketplace/entity-endpoint-map.csv`

Code imports `linked-dataset.json` directly from this path, including API route tests and db import scripts. Do not move it in a docs cleanup slice.

## Runtime Switches

- `API_MARKETPLACE_SEED_ENABLED=1` enables seed artifact generation.
- `API_DATA_BACKEND=seed|db` selects API runtime data source.
- API tests explicitly use `NODE_ENV=test API_DATA_BACKEND=seed`.
- Non-test API runtime defaults toward `db`.

## Commands

From repo root:

```bash
npm run seed:marketplace:generate
npm run seed:marketplace:validate
npm run seed:marketplace:write-back
```

Targeted practice-task import:

```bash
CLUBROOM_IMPORT_PRACTICE_TASKS=1 npm --prefix packages/db run practice-tasks:import
```

Local demo credential aid:

```bash
npm run test-accounts:write
```

That command writes ignored fixture-derived credentials to `TEST_ACCOUNTS.local.txt`. Do not commit generated credentials.

Live staging demo credential reset:

```bash
npm run db:test-accounts:reset:staging
```

That command resets `@clubroom.demo` DB credentials, verifies salted scrypt hashes and at least one attached coach account, and writes ignored DB-derived credentials to `TEST_ACCOUNTS.staging.local.txt`.

## Move Later

This is executable fixture data, not documentation. A later migration should move it out of `docs/` and update all import/test paths in the same commit.
