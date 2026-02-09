# Foundation Sprints — API-Ready Hardening

> **Purpose:** Get every layer of the codebase to production quality before connecting a real API.
> **Prerequisite:** Screen Decomposition Sprint COMPLETE (107 files)

---

## Why Foundation First

The audit found:
- Architecture: 8/10 — strong service layer, Result<T>, event bus, typed routes
- Screen layer: 4/10 — 175/180 screens without useScreen(), 164 without error states
- Data access: 3/10 — 70 files bypass services and import mock-data directly
- Test coverage: 3/10 — 31% services tested, zero wallet/auth/E2E tests

Building features on this foundation means every feature inherits the debt. Fix the foundation, then every feature sits on solid ground.

---

## Phases

| Phase | Sprint Doc | What |
|-------|-----------|------|
| **1** | `PHASE-1-SERVICE-HARDENING.md` | Every service returns Result<T>, uses apiClient, has logger, emits events |
| **2** | `PHASE-2-DATA-ACCESS.md` | 70 mock-data imports → service calls. UserService. Remove denormalized fields. |
| **3** | `PHASE-3-SCREEN-INFRASTRUCTURE.md` | Enhance useScreen(). Migrate 175 screens. 4 visual states everywhere. |
| **4** | `PHASE-4-UI-CONSISTENCY.md` | Decompose oversized components. Pressable→Clickable. flexDirection→Row. Tokens. |
| **5** | `PHASE-5-TEST-COVERAGE.md` | 70%+ service coverage. strict:true. Critical path tests. |

## Execution Order

Phases MUST run in order. Each phase depends on the previous:
- Phase 2 needs Phase 1 (services must return Result<T> before screens can consume them)
- Phase 3 needs Phase 2 (screens need data flowing through services before useScreen() migration)
- Phase 4 needs Phase 3 (screens must be structurally correct before UI polish)
- Phase 5 needs Phase 1-4 (test the final code, not code that's about to change)

## After Foundation

When all 5 phases pass their quality gates:
- `USE_MOCK` flip is the ONLY change needed for real API
- Every screen handles network errors with retry
- Every data access goes Screen → Hook → Service → apiClient
- Service coverage ≥70%
- 0 screens >250 lines, 0 components >250 lines

Then resume feature work from ROADMAP.md and USER-STORIES.md.

## Tracking

After each phase completes:
1. Update this INDEX with ✅
2. Move completed phase doc to `../CompletedSprints/`
3. Update `memory/LastStep.md`
