# Role Smoke Report (Clean State) - 2026-03-03

## Run Context
- App URL: `http://localhost:8083`
- Storage reset completed before run:
  - localStorage cleared
  - sessionStorage cleared
  - indexedDB databases deleted (where available)
  - cookies cleared
- Command:
  - `node ./scripts/ui-flow-checks-50.mjs --profiles=coach-core,parent-core,athlete-core --roles=coach,parent,athlete --out-dir=/tmp/ui-flow-checks-live-smoke-cleared --fail-on=high --retries=2`

## Result Summary
- Preflight: `3/3` roles passed
- Core smoke totals: `34/34` flows passed
- High severity failures: `0`
- Medium findings: `2` (console-only nested button hydration warning on home screens)
- Empty-route failures: `0`

## Artifacts
- `preflight.json`
- `preflight.md`
- `report.json`
- `report.md`
