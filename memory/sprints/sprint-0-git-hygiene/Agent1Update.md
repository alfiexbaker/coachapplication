# Sprint 0 — Git Hygiene
## Agent 1: Full Commit + Safety Setup

**Status**: NOT_STARTED
**Priority**: BLOCKER — nothing else runs until this is done

---

## Objective
Commit all 420 orphaned files with meaningful, feature-grouped commits. Set up basic git safety so this never happens again.

## Context
- 145 unstaged modifications to tracked files
- 275 untracked new files never committed
- Last 5 commits: "h", "last night", "d", "j", "d" — zero useful history
- One disk corruption = months of work lost

## Tasks

- [ ] **1. Audit .gitignore** — Verify no secrets (.env, credentials), build artifacts, or node_modules would be committed
- [ ] **2. Stage by feature area** — Group files logically, NOT `git add -A`:
  - [ ] `components/academy/` + `hooks/use-academy-*.ts` → "Add academy feature components and hooks"
  - [ ] `components/analytics/` + `hooks/use-analytics-*.ts` → "Add analytics components and hooks"
  - [ ] `components/athlete/` + `hooks/use-athlete-*.ts` → "Add athlete management components and hooks"
  - [ ] `components/availability/` + `hooks/use-availability-*.ts` + `hooks/use-*-template.ts` → "Add availability components and hooks"
  - [ ] `components/badges/` + `hooks/use-badges-*.ts` + `hooks/use-child-badges.ts` → "Add badge components and hooks"
  - [ ] `components/booking/` + `hooks/use-booking-*.ts` + `hooks/use-confirm-*.ts` → "Add booking components and hooks"
  - [ ] `components/child/` + `hooks/use-add-child.ts` + `hooks/use-medical-*.ts` + `hooks/use-emergency-*.ts` → "Add child management components and hooks"
  - [ ] `components/club/` + `hooks/use-club-*.ts` + `hooks/use-member-*.ts` + `hooks/use-training-*.ts` → "Add club components and hooks"
  - [ ] `components/coach/` + `hooks/use-coach-*.ts` + `hooks/use-public-*.ts` + `hooks/use-scheduling-*.ts` → "Add coach components and hooks"
  - [ ] `components/community/` + `hooks/use-community-*.ts` + `hooks/use-carpool.ts` → "Add community components and hooks"
  - [ ] `components/development/` + `hooks/use-dev-*.ts` + `hooks/use-special-needs.ts` + `hooks/use-child-progress.ts` → "Add development tracking components and hooks"
  - [ ] `components/discover/` + `hooks/use-discover-*.ts` → "Add discover components and hooks"
  - [ ] `components/drills/` + `hooks/use-drill-*.ts` + `hooks/use-drills-*.ts` → "Add drills components and hooks"
  - [ ] `components/earnings/` + `hooks/use-earnings.ts` → "Add earnings components and hooks"
  - [ ] `components/event/` + `hooks/use-event-*.ts` + `hooks/use-create-event.ts` + `hooks/use-attendees.ts` → "Add event components and hooks"
  - [ ] `components/family/` + `hooks/use-family-*.ts` → "Add family components and hooks"
  - [ ] `components/goals/` + `hooks/use-goal-*.ts` + `hooks/use-goals-*.ts` → "Add goals components and hooks"
  - [ ] `components/group/` + `hooks/use-group-*.ts` → "Add group session components and hooks"
  - [ ] `components/health/` + `hooks/use-health-*.ts` + `hooks/use-injuries.ts` → "Add health tracking components and hooks"
  - [ ] `components/invite/` + `hooks/use-invites.ts` + `hooks/use-coach-invites.ts` → "Add invite components and hooks"
  - [ ] `components/match/` + `hooks/use-match-*.ts` + `hooks/use-matches-*.ts` + `hooks/use-create-match.ts` → "Add match components and hooks"
  - [ ] `components/negotiate/` + `hooks/use-negotiate.ts` + `hooks/use-counter-*.ts` → "Add negotiation components and hooks"
  - [ ] `components/progress/` + `hooks/use-my-progress.ts` → "Add progress components and hooks"
  - [ ] `components/promo/` + `hooks/use-promo-*.ts` + `hooks/use-wallet-*.ts` → "Add promo and wallet components and hooks"
  - [ ] `components/review/` + `hooks/use-rate-coach.ts` → "Add review components and hooks"
  - [ ] `components/roster/` + `hooks/use-consents.ts` → "Add roster components and hooks"
  - [ ] `components/safety/` + `hooks/use-emergency-access.ts` → "Add safety components and hooks"
  - [ ] `components/settings/` + `hooks/use-*-settings.ts` + `hooks/use-appearance.ts` + `hooks/use-help-*.ts` + `hooks/use-notification-*.ts` + `hooks/use-calendar-sync.ts` → "Add settings components and hooks"
  - [ ] `components/skills/` + `hooks/use-skill-*.ts` + `hooks/use-skills-*.ts` → "Add skills components and hooks"
  - [ ] `components/social/` + `hooks/use-create-post.ts` + `hooks/use-create-club-post.ts` + `hooks/use-post-detail.ts` → "Add social components and hooks"
  - [ ] `components/squad/` + `hooks/use-squad-*.ts` + `hooks/use-create-squad.ts` → "Add squad components and hooks"
  - [ ] `components/verification/` + `hooks/use-verification*.ts` + `hooks/use-credentials.ts` + `hooks/use-background-*.ts` + `hooks/use-id-*.ts` → "Add verification components and hooks"
  - [ ] `components/video/` + `hooks/use-video-*.ts` + `hooks/use-videos-*.ts` → "Add video components and hooks"
  - [ ] Remaining modified `app/` screens → "Update screens with hook extraction and decomposition"
  - [ ] `services/concern-service.ts` + `utils/contact-actions.ts` → "Add concern service and contact utilities"
  - [ ] Modified services + constants → "Update services, event bus, and constants"
  - [ ] `app/athlete/` + `app/drills/challenges.tsx` + `app/drills/create-challenge.tsx` + `app/roster/[athleteId]/raise-concern.tsx` → "Add athlete journal, drill challenges, and concern screens"
  - [ ] `docs/` changes → "Update roadmap and sprint documentation"
  - [ ] `memory/` files → "Add project memory and audit files"
- [ ] **3. Verify no secrets** — Scan staged files for API keys, tokens, passwords
- [ ] **4. Run git log** — Confirm all commits are clean

## Rules
- NEVER `git add -A` or `git add .`
- Stage specific files/directories per commit
- Each commit message: imperative mood, describes WHAT was added/changed
- If unsure about a file, skip it and flag as blocker

## Files Modified
_None yet_

## Blockers
_None_

## Completion Criteria
- [ ] All 420 files committed in logical groups
- [ ] Zero uncommitted changes in `git status`
- [ ] No secrets in commit history
- [ ] `git log --oneline -20` shows meaningful messages
