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
- `--retries=N`: retry login/navigation transient failures.
- `--pause-ms=N`: control wait between steps for slower runners.
- `--out-dir=/path`: isolate artifacts per job.

Environment equivalents:

- `UI_BASE_URL`
- `UI_FLOW_OUT_DIR`
- `UI_FLOW_ROLES`
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

- `report.json` and `report.md` (global run summary)
- `report.partial.json` (incremental in-progress snapshot)
- `report.<role>.json` and `report.<role>.md` (per-role summary)
- `report.<role>.chunk-X-of-Y.json` and `.md` (per-chunk summary)
- `<role>__<flow-id>.png` screenshots

Merged artifacts (from `ui-flow-merge-reports.mjs`):

- `report.merged.json` (deduped consolidated result set)
- `report.merged.md` (human-readable merged summary)

## Recommended CI Matrix

Run one role per job with chunking. Example:

- Job A: `--roles=coach --chunk-size=10 --chunk-index=1`
- Job B: `--roles=coach --chunk-size=10 --chunk-index=2`
- Job C: `--roles=parent --chunk-size=10 --chunk-index=1`
- Job D: `--roles=parent --chunk-size=10 --chunk-index=2`
- Job E: `--roles=athlete --chunk-size=10 --chunk-index=1`

Set `--fail-on=high` for PR gating by default.

## GitHub Actions Matrix

Workflow:

```text
.github/workflows/ui-flow-checks.yml
```

Behavior:

- Runs role/chunk jobs in parallel with `--fail-on=none` to collect full diagnostics.
- Uploads per-chunk artifacts for each matrix job.
- Runs a merge job that combines all chunk reports and enforces `--fail-on=high`.
- Publishes merged Markdown summary in the job summary and uploads merged artifacts.
