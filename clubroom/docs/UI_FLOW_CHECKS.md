# UI Flow Checks

This runbook documents the `scripts/ui-flow-checks-50.mjs` Playwright runner.
It also documents chunk report merge behavior via `scripts/ui-flow-merge-reports.mjs`.

## Purpose

- Exercise role-based mobile-web routes (coach, parent, athlete).
- Capture route screenshots and diagnostics.
- Produce JSON/Markdown reports for local triage and CI gating.

## Quick Start

1. Start the web app:

```bash
npm run web -- --port 8083
```

2. In another terminal, list available flows:

```bash
npm run ui:flows:list
```

3. Run full check:

```bash
npm run ui:flows:run
```

4. Verify login/access only (recommended before full or core runs):

```bash
npm run ui:flows:preflight
```

## Common Commands

- Coach only:

```bash
npm run ui:flows:coach
```

- Parent only:

```bash
npm run ui:flows:parent
```

- Athlete only:

```bash
npm run ui:flows:athlete
```

- Coach core smoke suite:

```bash
npm run ui:flows:coach-core
```

- Parent core smoke suite:

```bash
npm run ui:flows:parent-core
```

- Athlete core smoke suite:

```bash
npm run ui:flows:athlete-core
```

- Trust/safety suite (raise concern, medical/emergency, injuries, journal):

```bash
npm run ui:flows:trust-core
```

- Chunked run (example: role `coach`, chunk size 10, run chunk 2):

```bash
node ./scripts/ui-flow-checks-50.mjs --roles=coach --chunk-size=10 --chunk-index=2
```

- Merge reports from chunked jobs:

```bash
npm run ui:flows:merge -- --input-dir=/tmp/ui-flow-checks-50 --output-dir=/tmp/ui-flow-checks-50-merged --fail-on=high
```

## CI-friendly Flags

- `--fail-on=none|high|medium`
  - `none`: never fail process exit code.
  - `high`: fail only on high severity findings.
  - `medium`: fail on medium or high findings.
- `--profile=<name>` / `--profiles=a,b`
  - `coach-core`, `parent-core`, `athlete-core`, `trust-core`, `pre-api-core`
- `--retries=N`: retry login/navigation transient failures.
- `--pause-ms=N`: control wait between steps for slower runners.
- `--out-dir=/path`: isolate artifacts per job.
- `--preflight-only`: run only login/access verification.
- `--skip-preflight`: skip preflight (not recommended for CI smoke).

Environment equivalents:

- `UI_BASE_URL`
- `UI_FLOW_OUT_DIR`
- `UI_FLOW_ROLES`
- `UI_FLOW_PROFILE`
- `UI_FLOW_PROFILES`
- `UI_FLOW_CHUNK_SIZE`
- `UI_FLOW_CHUNK_INDEX`
- `UI_FLOW_RETRIES`
- `UI_FLOW_PAUSE_MS`
- `UI_FLOW_FAIL_ON`
- `UI_FLOW_HEADED=1`

## Outputs

Default output dir:

```text
/tmp/ui-flow-checks-50
```

Generated artifacts:

- `preflight.json` and `preflight.md` (access/login readiness per role)
- `preflight.<role>.png` proof screenshots
- `report.json` and `report.md` (global run summary)
- `report.partial.json` (incremental in-progress snapshot)
- `report.<role>.json` and `report.<role>.md` (per-role summary)
- `report.<role>.chunk-X-of-Y.json` and `.md` (per-chunk summary)
- `<role>__<flow-id>.png` screenshots

Merged artifacts (from `ui-flow-merge-reports.mjs`):

- `report.merged.json` (deduped consolidated result set)
- `report.merged.md` (human-readable merged summary)

## Recommended CI Matrix

PR gate (bounded smoke):

- Job A: `npm run ui:flows:coach-core`
- Job B: `npm run ui:flows:parent-core`
- Job C: `npm run ui:flows:athlete-core`
- Job D: `npm run ui:flows:trust-core`

Set `--fail-on=high` for PR gating. Keep full role-chunk suites for scheduled/nightly runs.

## GitHub Actions Status

- Workflow: `.github/workflows/ui-flow-smoke.yml`
- PR + manual dispatch run parallel profile jobs: `coach-core`, `parent-core`, `athlete-core`, `trust-core`.
- Merge job consolidates artifacts and enforces `--fail-on=high`.
- Keep full chunked role matrix as optional nightly expansion if deeper diagnostics are needed.
