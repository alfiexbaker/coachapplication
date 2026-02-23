# API Readiness Sprint Plan

**Generated**: 2026-02-23
**Based on**: Full codebase audit (8 parallel agents, 141 service files, 927 components, 174 test files)

---

## Sprint Overview

| Sprint | Duration | Focus | Files Touched |
|--------|----------|-------|---------------|
| **[Sprint 1](./SPRINT-1-BUG-FIXES.md)** | 3-4 days | Bug fixes & safety guards | ~25 files |
| **[Sprint 2](./SPRINT-2-DESIGN-TOKENS.md)** | 5-7 days | Design system token compliance | ~100 files |
| **[Sprint 3](./SPRINT-3-DATA-LAYER.md)** | 7-10 days | Data layer — shape for API | ~30 files |
| **[Sprint 4](./SPRINT-4-TEST-HARDENING.md)** | 5-7 days | Test coverage & error paths | ~80 new test files |
| **[Sprint 5](./SPRINT-5-ACCESSIBILITY-POLISH.md)** | 3-4 days | Accessibility & UX polish | ~40 files |
| **[Sprint 6](./SPRINT-6-API-BUILD.md)** | Ongoing | Build the actual API | New backend + client wiring |

**Total pre-API effort**: ~4-6 weeks (Sprints 1-5)

---

## Current Scores (from audit)

| Dimension | Score | After Sprints |
|-----------|-------|---------------|
| Service Layer | 9.5/10 | 9.5/10 (no changes needed) |
| Type Safety | 9/10 | 9.5/10 |
| UX / Screen States | 8.5/10 | 9.5/10 |
| Component Quality | 8/10 | 9/10 |
| Hooks / State Mgmt | 7.5/10 | 9/10 |
| Design System Compliance | 6/10 | 9.5/10 |
| Data Layer / API Readiness | 5.5/10 | 8.5/10 |
| Test Coverage | 6.5/10 | 8.5/10 |

---

## Execution Order

Sprints 1-2 can overlap (bugs + tokens are independent).
Sprint 3 depends on Sprint 1 (hook fixes affect data flow).
Sprint 4 can start alongside Sprint 3 (test infra is independent).
Sprint 5 can run last or in parallel with Sprint 4.
Sprint 6 starts only after 1-5 are complete.

```
Week 1-2:  [Sprint 1] + [Sprint 2 start]
Week 2-3:  [Sprint 2 finish] + [Sprint 3 start]
Week 3-4:  [Sprint 3] + [Sprint 4 start]
Week 4-5:  [Sprint 4 finish] + [Sprint 5]
Week 5+:   [Sprint 6: Build the API]
```
