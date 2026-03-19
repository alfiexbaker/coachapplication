# Last Step Handoff

Date: 2026-03-19

## What Was Just Done

1. Introduced a first-class `ClubActivity` read model in `constants/club-activity-types.ts` and `utils/club-activity-projections.ts`.
2. Reframed club-facing schedule surfaces so `ClubEvent` and club-linked `GroupSession` records are shown as one linked club activity list.
3. Added `components/club/ClubActivitiesPanel.tsx` and rewired both `hooks/use-club-hub.ts` and `hooks/use-club-detail.ts` to use unified club activities.
4. Added `groupSessionService.getClubActivitySessions()` so camps, clinics, trials, open sessions, and training can all participate in the same club-facing schedule model.
5. Updated training access language in the session creation and group-session detail flows so `club only`, `squad only`, and `club + outside athletes` are explicit behaviors rather than hidden invite-type trivia.
6. Updated the architecture docs to compare the old split model with the new club activity model.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/utils/club-activity-projections.test.js .tmp-tests/__tests__/services/group-session/session-scheduling-service.test.js` -> PASS (`13/13`)
- `git diff --check` -> PASS

## Current State

- Club pages no longer have to treat events and training as unrelated sections.
- `ClubActivity` is now the canonical read model for club-facing schedule UI.
- The meaningful distinction is now:
  - informational event
  - private club training
  - private squad training
  - club-linked training that also admits outsiders
- Pending session invites remain a separate personal workflow and are now labelled honestly instead of being presented as club events.
- The underlying source records are still split between `ClubEvent` and `GroupSession`; creation flows are still specialized even though the club-facing read model is unified.
- The worktree is expected to contain transient untracked audit artifacts under `docs/audits/`.

## Next Exact Action

1. Keep pushing `API-01`: align the broader session-invite read and acceptance model to backend authority.
2. After that, decide whether club activity creation should stay as separate event and training flows or move behind a first-class backend `ClubActivity` contract.
