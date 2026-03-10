# Sprint 01 - Truth Guardrails And Audit Honesty

## Objective

Remove false confidence from the repo and make current planning inputs trustworthy.

## Why This Sprint Exists

Right now some repo-critical scripts depend on `rg`. In this environment:

- `audit:alerts` silently reports false zeroes
- `lint:ui-actions` fails
- `audit:ui` fails

That means the team can believe a surface is clean when the tool never really ran.

## Scope

1. Make repo-critical audit scripts fail loudly if required tooling is missing.
2. Replace `rg` dependencies in scripts where practical, or document/verify the dependency centrally.
3. Repair top-level doc references that point at missing files.
4. Publish one small "verified now" planning index that distinguishes:
   - fixed findings
   - stale findings
   - current open findings

## Acceptance Criteria

- `audit:alerts` cannot return false zeroes when required dependencies are absent.
- `lint:ui-actions` and `audit:ui` either run successfully in repo-default environments or fail with explicit dependency guidance.
- `README.md` no longer points at missing primary docs.
- this new planning folder remains aligned to current code, not old snapshots.

## Verification

- `npm run typecheck`
- `npm run audit:architecture`
- the repaired UI/audit scripts
- direct grep spot-check confirming the repaired script outputs match reality

## Non-Goals

- redesigning the product
- changing user-facing semantics

## Follow-On

This sprint unblocks every other sprint in this folder by making the repo's own confidence signals trustworthy again.
