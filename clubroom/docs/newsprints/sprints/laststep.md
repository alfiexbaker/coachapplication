# Last Step Handoff

Date: 2026-04-23

## What Was Just Done

1. Hardened the shared loading foundation in `hooks/use-screen.ts` and `hooks/use-screen-core.ts` so routes can retain truthful snapshots by logical `dataKey`, distinguish the requested frame from the currently visible frame, and avoid showing dependency-change section skeletons when the requested frame is already cached.
2. Rebuilt the home/profile hot path in `hooks/use-home-screen.ts` and `components/user/home-screen.tsx` around a single keyed page frame. Home now keeps one committed profile frame mounted, acknowledges profile switches inline, swaps to the next frame atomically when ready, and reverts global profile context if a retained-frame switch fails instead of leaving the UI and context out of sync.
3. Fixed `app/community/[groupId].tsx` so group dependency changes no longer leak stale manage authority in the pending skeleton. Group detail now uses the shared requested-frame check and only skeletonizes when the next group frame is genuinely unresolved.
4. Updated `docs/ui/loading-error-empty-state-matrix.md` and this handoff so the canonical loading contract reflects the requested-vs-visible frame distinction before `UI-LOAD-04` starts.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `npm run ui:flows:coach-core` -> BLOCKED (`base_url_unreachable: TypeError: fetch failed` against `http://localhost:8083`)
- `npm run ui:flows:parent-core` -> BLOCKED (`base_url_unreachable: TypeError: fetch failed` against `http://localhost:8083`)
- `git diff --check` -> PASS

## Current State

- Home and community now honor the anti-flicker contract more strictly: home commits profile switches as one page frame instead of letting chrome outrun data, and group detail no longer shows stale manage affordances while the next group is unresolved.
- The shared screen-state foundation now supports keyed retained frames, so later slices can preserve or hydrate the requested truthful frame instead of guessing based on any visible success state.
- The remaining premium-risk gap is still honest live rehearsal: the role UI checks could not run because the expected local app server on `http://localhost:8083` was unavailable during this step.

## Next Exact Action

1. Start `UI-LOAD-04` and warm the profile, roster, compare, and segmented detail surfaces so tab and pane switches stop blanking, hero chrome stays mounted during refresh, and pane-specific placeholders replace generic detail loaders.

## Priority Note

Date: 2026-04-22

- The social slice is now closed in code, so the next slice should spend zero time reworking feed/messages/community loading and all of its time applying the same standard to profile, roster, compare, and segmented detail panes.
- `navigation/loading-route-manifest.js` remains the route owner map; later loading slices should update their owned route entries as behavior changes instead of editing prose only.
- `scripts/loading-route-coverage-audit.js` remains the route-closure gate; if a route becomes async without a specific non-static rule, that is a defect.
- Premium review remains unchanged: reject any profile or roster path that shows a blank intermediate frame, pane jump, mismatched placeholder geometry, duplicated loading affordance, or a loading treatment that adds scroll cost.
