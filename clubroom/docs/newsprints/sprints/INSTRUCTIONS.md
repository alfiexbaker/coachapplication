# Sprint Workspace Instructions

Updated: 2026-03-11

## Startup Protocol

1. Read `CODEX.md`.
2. Read `docs/START_HERE.md`.
3. Read `docs/newsprints/sprints/BACKLOG.md`.
4. Read `docs/newsprints/sprints/laststep.md`.
5. Open one deep doc only if the backlog item requires it.

## Workspace Contract

- `BACKLOG.md` is the canonical active queue.
- `laststep.md` is the canonical handoff log.
- Do not create parallel trackers in random docs.
- Do not point backlog rows at deleted sprint packs.

## How To Execute An Item

1. Pick the highest-priority `NOW` or `OPEN` item.
2. Confirm the affected product spine and risk.
3. Implement the smallest reversible change.
4. Run the narrowest honest verification set.
5. Update `laststep.md` with:
   - what changed
   - what was verified
   - what remains risky
   - next exact action
6. Commit the completed slice.

## Minimum Verification Rule

- Run `npm run typecheck` when app TypeScript surface changes.
- Run `npm --prefix apps/api run typecheck` and `npm --prefix apps/api run test` for API work.
- Run targeted domain tests when a domain contract changes.
- If a repo-critical script depends on missing local tooling, treat it as blocked, not green.

## Done Means

1. Acceptance criteria are met.
2. The remaining docs still match the code.
3. Verification is run or explicitly blocked.
4. `BACKLOG.md` and `laststep.md` are updated if the current priority changed.
