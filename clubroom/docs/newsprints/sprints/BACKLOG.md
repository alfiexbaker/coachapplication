# Sprint Backlog

Updated: 2026-04-17
Rule: active work only. Completed sprint rows are intentionally removed.

## Open Queue

| ID | Exactly what it does | Spine(s) | Status |
| -- | -------------------- | -------- | ------ |
| PROD-CUTOVER-01 | Move active community/media app reads off local compatibility storage and onto the now-authoritative `/v1` routes; delete non-mock local authority where the backend fully replaces it. | Trust/Safety/Ops + Development | READY |

## Execution Order

1. `PROD-CUTOVER-01`

## Sprint Intent

- Finish app-side production cutover on top of the db-backed `/v1` seams before introducing new feature sprint labels.
