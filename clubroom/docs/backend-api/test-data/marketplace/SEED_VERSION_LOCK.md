# Marketplace Seed Version Lock

- Locked version: `2026-03-03-marketplace-v2-edge-coverage`
- Locked on: `2026-03-03`
- Scope: `89` tables, `974` linked rows
- Canonical files:
  - `linked-dataset.json`
  - `manifest.json`
  - `summary.json`
  - `entity-endpoint-map.csv`

## Lock Policy
- Treat this version as the baseline fixture contract for pre-REST integration.
- Do not mutate table shape or semantics without version bump.
- CSV content edits are allowed if they pass validation and keep referential integrity.

## How to Bump
1. Update dataset version in `/Users/tubton/Desktop/coachapplication/clubroom/scripts/marketplace-seed-kit.mjs`.
2. Regenerate + validate + write back:
   - `npm run seed:marketplace:generate`
   - `npm run seed:marketplace:validate`
   - `npm run seed:marketplace:write-back`
3. Update this lock file with new version/date and row/table totals.
