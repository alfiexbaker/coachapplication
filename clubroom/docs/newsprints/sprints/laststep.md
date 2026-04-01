# Last Step Handoff

Date: 2026-04-01

## What Was Just Done

1. Brought the stale sprint handoff back in line with the real repo history after the March 19 gap.
2. Landed the March 23-29 booking and launch-support slices that were missing from the written handoff:
   - session detail now closes past-booking actions correctly and links into post-session review
   - club detail separates `Schedule` from `Updates`, and home/schedule surfaces now show event commitments while gating walkthrough hints more honestly
   - family add-child intake is shorter, notifications use attention-based badges, and the booking flow now shows coach offerings earlier, reduces wizard flicker, restores offering-aware schedule locking, and runs through one provider boundary
3. Centralized self-versus-child profile eligibility in `hooks/use-child-context.tsx` so Home, Health, Injuries, and Progress all read the same allow-self capability.
4. Fixed a cross-account leakage risk by resetting self-profile capability immediately when the signed-in account changes instead of waiting for async settings reload.
5. Added focused subject-option coverage and ignored generated `.playwright-cli/` local artifacts.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/utils/profile-subject.test.js .tmp-tests/__tests__/services/booking-self-setting-service.test.js .tmp-tests/__tests__/child-context/reconcile-children.test.js` -> PASS (`34/34`)

## Current State

- The booking wizard is materially cleaner than the old handoff suggests: coach offerings are surfaced earlier, offering catalog helpers are separated from draft prefill, schedule locking respects the chosen offering again, and the wizard no longer owns duplicate self-book setting logic on Home.
- The latest local profile-scope slice is committed; the worktree is no longer carrying that unfinished self/child eligibility drift.
- The active backend gap is no longer broad family/medical CRUD. Those areas already have substantial `/v1` coverage. The remaining high-risk booking seam is the session-invite inbox/detail/acceptance and the wider invite-mediated booking-change path.
- Production identity is still scaffold-first. Dev bearer sessions work locally, but real session controls and backend authz integration are still not finished.

## Next Exact Action

1. Continue `API-01` at the session-invite seam.
2. Start with read and action authority for `app/session-invites/index.tsx` and `app/session-invites/[id].tsx`, then move the remaining accept/change behavior behind `/v1`.
