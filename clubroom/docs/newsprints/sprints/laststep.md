# Last Step Handoff

Date: 2026-04-22

## What Was Just Done

1. Completed `UI-LOAD-03` by moving the social, home, messaging, and community hot paths onto the shared anti-flicker loading system: `app/(tabs)/index.tsx`, `app/(tabs)/feed.tsx`, `app/(tabs)/messages.tsx`, `app/community/index.tsx`, `app/community/[groupId].tsx`, `app/(modal)/post-detail.tsx`, `app/(modal)/create-post.tsx`, `app/(modal)/create-club-post.tsx`, `components/user/home-screen.tsx`, `components/coach/profile-tab-posts.tsx`, `hooks/use-home-screen.ts`, `hooks/use-messages.ts`, `hooks/use-community-hub.ts`, and `hooks/use-post-detail.ts` now keep stable shell chrome mounted and stop falling back to generic reset-heavy loading.
2. Added warm-first route adoption for feed, messages, and community hub plus section-scoped loading for group detail and post detail so revisits preserve truthful frames, only unresolved sections skeletonize, and submit-only composer flows acknowledge work inline instead of with dead spinners.
3. Tightened the home-screen data path so profile-context changes now commit as one coherent frame instead of leaking partially swapped sections during load, and the loading matrix plus sprint queue now reflect that the social slice is closed.
4. Updated the active sprint queue in `docs/newsprints/sprints/BACKLOG.md` and this handoff so the next slice starts from `UI-LOAD-04`.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `npm run ui:flows:coach-core` -> BLOCKED (`base_url_unreachable: TypeError: fetch failed` against `http://localhost:8083`)
- `npm run ui:flows:parent-core` -> BLOCKED (`base_url_unreachable: TypeError: fetch failed` against `http://localhost:8083`)
- `git diff --check` -> PASS

## Current State

- Feed, messages, community, home, post detail, and coach-post composer surfaces now use a consistent retained-frame loading language: no generic full-screen list resets on warmed paths, no mixed spinner-plus-skeleton viewports, and no redirect blank between composer entry and club-post handoff.
- Home now preserves shell truth while profile-specific sections resolve, feed and messages keep stable tab chrome visible during revisit/refresh, and post/community detail routes skeletonize only the unresolved thread/chat section instead of wiping the whole screen.
- The remaining premium-risk gap is still honest route-flow rehearsal: the role UI checks could not run because the expected local app server on `http://localhost:8083` was unavailable during this slice.

## Next Exact Action

1. Start `UI-LOAD-04` and warm the profile, roster, compare, and segmented detail surfaces so tab and pane switches stop blanking, hero chrome stays mounted during refresh, and pane-specific placeholders replace generic detail loaders.

## Priority Note

Date: 2026-04-22

- The social slice is now closed in code, so the next slice should spend zero time reworking feed/messages/community loading and all of its time applying the same standard to profile, roster, compare, and segmented detail panes.
- `navigation/loading-route-manifest.js` remains the route owner map; later loading slices should update their owned route entries as behavior changes instead of editing prose only.
- `scripts/loading-route-coverage-audit.js` remains the route-closure gate; if a route becomes async without a specific non-static rule, that is a defect.
- Premium review remains unchanged: reject any profile or roster path that shows a blank intermediate frame, pane jump, mismatched placeholder geometry, duplicated loading affordance, or a loading treatment that adds scroll cost.
