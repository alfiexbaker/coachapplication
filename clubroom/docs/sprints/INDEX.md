# Sprints Index

> **Last reorganized:** 2026-02-08
> **Active planning docs:** `../ROADMAP.md` + `../USER-STORIES.md`

---

## CompletedSprints/ (19 files)

All work verified done with passing tests.

| File | What It Was |
|------|-------------|
| `REFACTOR-PLAN.md` | Master refactoring plan — Phases 1-5 COMPLETE (95/100 arch) |
| `REFACTOR-STATUS.md` | Post-refactor audit snapshot |
| `SPRINT-3-REVIEW.md` | Booking lifecycle — 1581/1581 tests, 0 FAILs |
| `SPRINT4-FIX-PLAN.md` | Quality fixes — 78/78 items, 144/144 tests |
| `SPRINT6-SHADOWS-CLEANUP.md` | Shadows.light → Shadows[scheme] — 7/7 files |
| `SPRINT7-TOUCHABLE-OPACITY.md` | TouchableOpacity → Pressable — 52/52 files |
| `SPRINT8-COLORS-LIGHT.md` | Colors.light → dynamic colors — ~216 files, 10 parallel agents |
| `SPRINT9-FONTWEIGHT-CLEANUP.md` | fontWeight → Typography tokens — 17 files, 19 edits |
| `1A-api-client-service-pattern.md` | API client + 59 services migrated |
| `1B-fix-broken-flows.md` | Invite→booking + counter-offer→booking |
| `1C-offline-support.md` | Offline banner + action queue |
| `3A-settings-hub-scheduling.md` | All 7 scheduling rules + auto-save |
| `5B-onboarding-checklists.md` | Coach + parent checklists |
| `6A-auth-service-context.md` | JWT auth + demo mode + refresh |
| `6B-api-contracts-mock-toggle.md` | API contracts (1,584 lines) + error types |
| `6D-type-fixes-bilateral.md` | All bilateral fields added |
| `7B-trials-conversion.md` | Trial service + conversion tracking |
| `8B-filters-search.md` | 9 filters, sort, search suggestions |
| `10A-onboarding-flows.md` | Coach + parent welcome flows |

---

## Todo/ (13 files)

Work still needed. Ordered by priority (high impact first).

| File | Status | What's Left |
|------|--------|-------------|
| `8C-map-experience.md` | 40% | Airbnb-quality map polish (price pins, clustering, 60fps) |
| `9C-video-challenges.md` | 40% | **Screens missing entirely** — create challenges.tsx |
| `9D-reports-journal-goals.md` | 60% | **Journal screen missing** — create journal.tsx |
| `10C-smart-notifications-reminders.md` | 40% | **reminder-service.ts missing** |
| `10D-polish-empty-states-coach-status.md` | 50% | **coach-status.tsx missing** |
| `4A-club-branding-dashboard.md` | 40% | Colour picker, image upload, live preview |
| `4B-feed-academy-welcome.md` | 60% | Academy differentiation incomplete |
| `4C-communication.md` | 50% | Message pinning, photo sharing, read receipts |
| `2B-parent-reactions-attendance.md` | 70% | Review prompt needs wiring |
| `3C-travel-blocked-dates-suggestions.md` | 60% | Map preview + smart suggestions missing |
| `5C-polish-accessibility.md` | 50% | WCAG AA pass incomplete |
| `5D-safety-settings-seen.md` | 60% | Seen indicators missing everywhere |
| `9A-visual-progress.md` | 60% | Radar chart animation needed |

---

## Evaluation/ (26 files)

### Near-complete micro-sprints (85-95%)

Need a final decision: ship as-is or finish the last 5-10%.

| File | Status | What's Left |
|------|--------|-------------|
| `2A-session-lifecycle-core.md` | 90% | Badge integration polish |
| `2C-group-rsvp-calendar.md` | 95% | Minor polish |
| `3B-cancellation-noshow.md` | 90% | Edge cases |
| `5A-loading-error-empty-states.md` | 85% | Apply to remaining screens |
| `6C-notifications-deep-linking.md` | 95% | Minor |
| `7A-public-profile-sharing.md` | 95% | Minor |
| `7C-dashboard-earnings-reviews.md` | 90% | Price notifications missing |
| `8A-home-discovery-cards.md` | 95% | Minor |
| `8D-featured-favourites.md` | 95% | Minor |
| `9B-session-plans-drills.md` | 90% | Video demo placeholders |
| `10B-celebrations.md` | 95% | Minor |

### Reference docs

Sprint planning and analysis docs kept for context.

| File | Purpose |
|------|---------|
| `COMPETITIVE_ANALYSIS.md` | Spond/Heja/TeamSnap breakdown |
| `FEATURE_BILATERAL_AUDIT.md` | Every interaction mapped bilaterally |
| `GAPS_AUDIT.md` | 14 gap categories identified |
| `MAP_EXPERIENCE.md` | Full Airbnb-quality map spec (needed for 8C) |
| `API_README.md` | 22 domains, ~62 DB tables |
| `SPRINT_READINESS_AUDIT.md` | Sprint readiness assessment |

### Feature system docs (pre-API planning)

| File | Purpose |
|------|---------|
| `BOOKING-SYSTEM.md` | Booking flow architecture |
| `BADGE-ACHIEVEMENT-SYSTEM.md` | Badge/achievement system design |
| `CLUB-ORGANIZATION-SYSTEM.md` | Club management architecture |
| `MESSAGING-SYSTEM.md` | Messaging system design |
| `PROFILE-SYSTEM.md` | Profile system architecture |
| `REVIEW-SYSTEM.md` | Review/rating system design |

### Architecture reference (backend planning)

| File | Purpose |
|------|---------|
| `SOFTWARE_DESIGN_DOCUMENT.md` | V1.0 system architecture overview |
| `DATA_ARCHITECTURE.md` | Pre-API data schema planning |
| `DB_MODEL_NOTES.md` | Database model notes for backend |

---

## Deleted (slop)

| What | Why |
|------|-----|
| `SPRINT5-FIX-PLAN.md` | Header said "COMPLETE" but 0/26 items done — superseded by Sprint 6-9 |
| `clubroom/docs/SPRINT4-FIX-PLAN.md` | Exact duplicate of CompletedSprints copy |
| `docs/sprints/pre-api/STATUS.md` | Outdated (Feb 5), superseded by ROADMAP.md |
| 10 original sprint overview files | Duplicated by the micro-sprint files in phase folders |
| `docs/UI_STANDARDS.md` | Outdated, contradicts current theme.ts tokens |
| `clubroom/docs/sprints/` | Empty directory |
| `clubroom/docs/completedSprints/` | Replaced by Sprints/CompletedSprints/ |
| Root `docs/` directory | Emptied — kept docs moved to clubroom/docs/ |
| `OLD-DOCS-INDEX.md` | References moved/deleted files — useless |
| `TEAM_HUB_PLAN.md` | 7 lines, content in badge system docs already |
| `facebook_parity.md` | Superseded by GAPS_AUDIT + COMPETITIVE_ANALYSIS |
| `FOOTBALL_ROLE_FEATURES.md` | Generic role matrix, all in USER-STORIES now |
| `S1_MVP_CORE.md` | Original MVP doc, superseded by USER-STORIES |
| `S_DESIGN_PRONG.md` | Old design strategy, superseded by CLAUDE.md pipeline |
| `CLUB_HUB_BLUEPRINT.md` | Old blueprint, feature is built |
| `DASHBOARD_REQUIREMENTS.md` | Old requirements, feature is built |
| `PRE-API-INDEX.md` | Old sprint overview, superseded by INDEX.md |
| `COMPREHENSIVE-ANALYSIS.md` | Superseded by ROADMAP + USER-STORIES |
| `FEATURE_GAPS.md` | Superseded by GAPS_AUDIT (newer version) |
| `REVIEW_USER_STORIES_API_READINESS.md` | Old readiness audit, superseded |
