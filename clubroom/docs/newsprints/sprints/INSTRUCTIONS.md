# Sprint Workspace Instructions

Updated: 2026-03-05

## 1) Startup Protocol (mandatory each task)

1. Read `CODEX.md`.
2. Read `docs/SOURCE_OF_TRUTH.md`.
3. Read this workspace in order:
   - `docs/newsprints/sprints/BACKLOG.md`
   - `docs/newsprints/sprints/laststep.md`
   - relevant source sprint docs linked in backlog rows

## 2) Workspace Contract

- `DONE.md` is the entrypoint only.
- `BACKLOG.md` is the canonical planned-work queue.
- `REVIEW_MATRIX_2026-03-05.md` is the qualitative truth table for current sprint quality/status.
- `laststep.md` is the handoff log for the next execution pass.

Do not create parallel trackers.

## 3) How To Execute A Sprint Item

1. Pick the highest-priority `OPEN` item from `BACKLOG.md`.
2. Confirm scope against Source of Truth spines (Community, Booking/Revenue, Development, Trust/Ops).
3. Implement smallest reversible change with existing architecture/UI patterns.
4. Run only relevant verification gates (minimum below).
5. Update `laststep.md` with:
   - date/time
   - what changed
   - command results
   - known blockers
   - exact next action
6. Commit atomically with conventional commit format.

## 4) Minimum Verification Gates

- Always:
  - `npm run typecheck`
  - `npm run lint:ui-actions`
  - `npm run audit:alerts`
  - `npm run audit:ui`
- For Trust/Ops or route ownership changes:
  - `npm run test:safety`
  - `npm run gate:pre-api-placement`
- For UI flow/runtime reliability changes:
  - `npm run ui:flows:preflight` (requires local runtime)

If a gate cannot run, document exactly why in `laststep.md`.

## 5) Definition Of Done For Any Sprint Closeout

1. Acceptance criteria in source sprint doc are met.
2. No architecture/UI policy violations are introduced.
3. Required gates are green, or blocker is formally documented with owner + expiry.
4. `BACKLOG.md` and `laststep.md` are updated to reflect new state.
5. Changes are committed.

## 6) Doc Update Rules

- Update `BACKLOG.md` when priority, status, or scope changes.
- Update `REVIEW_MATRIX_2026-03-05.md` when quality status materially changes.
- Keep historical detail in source sprint docs; keep this folder operational and concise.
