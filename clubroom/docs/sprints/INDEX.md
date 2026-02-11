# Sprints Index

> **Active work:** Functionality execution from `../USER-STORIES.md` and `../ROADMAP.md`
> **Foundation status:** Complete (Phases 1-5 closed, Sprint 46 POC stabilization closed)
> **Live metrics + route atlas:** `../AI_CONTEXT.md` and `../COACH_PARENT_FUNCTIONALITY_ATLAS.md`

---

## Foundation/ — Closed Trackers

Foundation docs remain as reference trackers and contracts. Completed sprint files were moved to `CompletedSprints/` to reduce execution noise.
Raw counts inside older closed trackers are historical snapshots; use `../AI_CONTEXT.md` for current code metrics.

| File | Status | Duration | What |
|------|--------|----------|------|
| `PHASE-2-DATA-ACCESS.md` | COMPLETE | ~1.5 weeks | 70 mock-data imports → services, UserService, remove denormalized fields |
| `PHASE-2-EXECUTION-PLAY.md` | COMPLETE | ~1.5 weeks | Repo-validated Phase 2 sequencing, risk controls, and quality gates |
| `PHASE-2-LIVE-TRACKER.md` | COMPLETE | Rolling | Exact 70-file migration checklist with per-item status tracking |
| `PHASE-3-SCREEN-INFRASTRUCTURE.md` | COMPLETE | ~1.5 weeks | `useScreen` migration and screen infra hardening |
| `PHASE-3-LIVE-TRACKER.md` | COMPLETE | Rolling | Exact 189-screen migration checklist with per-screen status and wave mapping |
| `PHASE-4-UI-CONSISTENCY.md` | COMPLETE | ~1 week | Component decomposition + consistency hardening |
| `PHASE-4-PROGRESS.md` | COMPLETE | — | Progress tracker for Phase 4 migration batches |
| `PHASE-5-TEST-COVERAGE.md` | COMPLETE | ~1.5 weeks | 70%+ service coverage, strict test typing, runtime gates |
| `PHASE-5-LIVE-TRACKER.md` | COMPLETE | Rolling | Phase 5 wave + gate tracker |
| `POC-MOCK-SERVICE-CONTRACT.md` | ACTIVE | Ongoing | POC mock-service operating contract with one-flag switchover |
| `SPRINT-9-TODO-AFTER.md` | — | — | Parking lot for post-foundation work |
| `INDEX.md` | — | — | This overview |

---

## CompletedSprints/ (24 files)

All verified done. Historical reference only.

| File | What |
|------|------|
| `REFACTOR-PLAN.md` | Master refactoring plan — Phases 1-5 (95/100 arch) |
| `REFACTOR-STATUS.md` | Post-refactor audit snapshot |
| `SPRINT-3-REVIEW.md` | Booking lifecycle — 1581/1581 tests |
| `SPRINT4-FIX-PLAN.md` | Quality fixes — 78/78 items |
| `SPRINT6-SHADOWS-CLEANUP.md` | Shadows.light → Shadows[scheme] — 7/7 files |
| `SPRINT7-TOUCHABLE-OPACITY.md` | TouchableOpacity → Pressable — 52/52 files |
| `SPRINT8-COLORS-LIGHT.md` | Colors.light → dynamic colors — ~216 files |
| `SPRINT9-FONTWEIGHT-CLEANUP.md` | fontWeight → Typography tokens — 17 files |
| `PHASE-1-SERVICE-HARDENING.md` | Foundation Phase 1 complete — services hardened for Result<T>/apiClient/events |
| `SPRINT-43-PHASE-3-WAVE-1.md` | Phase 3 kickoff and Wave 1 completion record |
| `SPRINT-44-PHASE-4-WAVE-1.md` | Phase 4 kickoff and Wave 1 completion record |
| `SPRINT-45-PHASE-5-WAVE-1.md` | Phase 5 kickoff and wave closure record |
| `SPRINT-46-POC-MOCK-SERVICE-STABILIZATION.md` | POC mock-service stabilization closeout |
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

## Reference/ (14 files)

Architecture and analysis docs. Not sprint instructions. Read when planning backend or new features.

| File | Purpose |
|------|---------|
| `API_README.md` | 22 domains, ~62 DB tables |
| `SOFTWARE_DESIGN_DOCUMENT.md` | V1.0 system architecture |
| `DATA_ARCHITECTURE.md` | Pre-API data schema |
| `DB_MODEL_NOTES.md` | Database model notes |
| `COMPETITIVE_ANALYSIS.md` | Spond/Heja/TeamSnap breakdown |
| `FEATURE_BILATERAL_AUDIT.md` | Every interaction mapped bilaterally |
| `GAPS_AUDIT.md` | 14 gap categories identified |
| `MAP_EXPERIENCE.md` | Airbnb-quality map spec |
| `BOOKING-SYSTEM.md` | Booking flow architecture |
| `BADGE-ACHIEVEMENT-SYSTEM.md` | Badge/achievement system design |
| `CLUB-ORGANIZATION-SYSTEM.md` | Club management architecture |
| `MESSAGING-SYSTEM.md` | Messaging system design |
| `PROFILE-SYSTEM.md` | Profile system architecture |
| `REVIEW-SYSTEM.md` | Review/rating system design |

---

## Deleted

| What | Why |
|------|-----|
| `Road-To-100/` (19 files) | Conflicting plan — sprints 10-28 overlapped with Foundation phases |
| `Todo/` (13 files) | Feature sprints — all in USER-STORIES.md, not relevant until Foundation done |
| `Todo/SCREEN-DECOMPOSITION/` (4 files) | Completed — 107 files decomposed |
| `Evaluation/` near-complete sprints (10 files) | Overlapped with Foundation phases |
| `Evaluation/5A-loading-error-empty-states.md` | Superseded by Foundation Phase 3 |
| `Evaluation/SPRINT_READINESS_AUDIT.md` | Superseded by 2026-02-09 code quality audit |
| Previous deletions (18 files) | See git history — old/duplicate docs |
