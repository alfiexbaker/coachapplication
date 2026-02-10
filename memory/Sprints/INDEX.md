# Sprint Plan — All Categories to 80/100

**Goal**: Every audit category >= 80/100. Pre-API hardening.
**Method**: 17 sprints across 4 phases. Each sprint = 1 agent. Within each phase, all agents run in parallel with ZERO file overlap.

## Current Scores → Target

| Category | Current | Target | Delta | Phase |
|----------|---------|--------|-------|-------|
| Screen Layer | 35 | 80 | +45 | Phase 2 |
| Testing | 30 | 80 | +50 | Phase 1 |
| Infrastructure/CI | 45 | 80 | +35 | Phase 1 |
| Performance | 50 | 80 | +30 | Phase 4 |
| Accessibility | 55 | 80 | +25 | Phase 4 |
| Service Layer | 62 | 80 | +18 | Phase 1 |
| Component Layer | 70 | 80 | +10 | Phase 3 |
| Architecture | 88 | — | ✓ | — |
| Design System | 85 | — | ✓ | — |
| Type Safety | 92 | — | ✓ | — |
| Navigation | 95 | — | ✓ | — |
| Offline | 20 | DEFERRED | — | Post-API |

## Phase Overview

### PHASE 1 — Foundation (6 agents, parallel safe)
All touch DIFFERENT directories. Zero overlap.

| Sprint | File | Scope | Files |
|--------|------|-------|-------|
| P1-CI | `P1-CI-INFRASTRUCTURE.md` | Config files only | ~8 |
| P1-SVC | `P1-SERVICE-HARDENING.md` | services/ only | ~20 |
| P1-T-A | `P1-TESTS-A.md` | .tmp-tests/ (analytics, booking, community, counter-offer, earnings) | 13 new |
| P1-T-B | `P1-TESTS-B.md` | .tmp-tests/ (event, family, favourite, group-session) | 13 new |
| P1-T-C | `P1-TESTS-C.md` | .tmp-tests/ (invite, invoice, messaging, notification) | 13 new |
| P1-T-D | `P1-TESTS-D.md` | .tmp-tests/ (package → wallet) | 18 new |

**Dependency**: P1-CI must update tsconfig.test.json BEFORE test agents compile. Run P1-CI first (2 min), then launch P1-T-A through P1-T-D.

### PHASE 2 — Screens (5 agents, parallel safe)
Each agent owns specific app/ subdirectories. Zero overlap.

| Sprint | File | Scope | Screens |
|--------|------|-------|---------|
| P2-A | `P2-SCREENS-A.md` | app/(tabs)/ + app/(modal)/ | 26 |
| P2-B | `P2-SCREENS-B.md` | app/booking*/ + roster/ + session*/ + earnings + rate-coach + review + invites | 18 |
| P2-C | `P2-SCREENS-C.md` | app/events/ + family/ + goals/ + health/ + group-sessions/ | 20 |
| P2-D | `P2-SCREENS-D.md` | app/settings/ + verification/ + videos/ + skills/ | 22 |
| P2-E | `P2-SCREENS-E.md` | app/favourites/ + invoices/ + matches/ + packages/ + payment/ + referrals/ + squads/ | 14 |

**Can run parallel with Phase 1** — screens (app/) don't overlap with services/ or .tmp-tests/.

### PHASE 3 — Components (3 agents, parallel safe)
Each agent owns specific components/ subdirectories. Zero overlap.

| Sprint | File | Scope | Components |
|--------|------|-------|------------|
| P3-A | `P3-COMPONENTS-A.md` | components/analytics/ through components/coach/ | 14 |
| P3-B | `P3-COMPONENTS-B.md` | components/club/ through components/health/ | 20 |
| P3-C | `P3-COMPONENTS-C.md` | components/goals/ through components/z/ | 20 |

**Can run parallel with Phase 2** — components/ doesn't overlap with app/.

### PHASE 4 — Polish (3 agents, parallel safe)
Cross-cutting work. Runs AFTER Phases 2+3 complete.

| Sprint | File | Scope | Items |
|--------|------|-------|-------|
| P4-A11Y | `P4-ACCESSIBILITY.md` | app/ + components/ (labels only, no structural changes) | ~400 labels |
| P4-PERF | `P4-PERFORMANCE.md` | hooks/ + specific files (expo-image, ScrollView) | ~30 files |
| P4-SPACING | `P4-SPACING-TOKENS.md` | components/ (hardcoded gap/margin/padding → Spacing.*) | ~100 files |

## Execution Order

```
Phase 1 (P1-CI first, then P1-SVC + P1-T-A/B/C/D)
    ↕ parallel
Phase 2 (P2-A + P2-B + P2-C + P2-D + P2-E)
    ↕ parallel
Phase 3 (P3-A + P3-B + P3-C)
    ↓ wait for P2+P3 to finish
Phase 4 (P4-A11Y + P4-PERF + P4-SPACING)
```

**Total agents**: 17
**Max concurrent**: 11 (Phase 1 + Phase 2 running together)
**Estimated score after all phases**: 85-90/100 across all categories

## Quality Gates (per phase)

**Phase 1**: `npx tsc -p tsconfig.test.json` passes. All new tests pass. Zero `throw new` in services.
**Phase 2**: `grep -r "useScreen" app/ | wc -l` >= 170. Zero screens without LoadingState+ErrorState+EmptyState.
**Phase 3**: Zero `-sections.tsx` files over 300 lines. All decomposed files < 200 lines.
**Phase 4**: `grep -r "accessibilityLabel" | wc -l` >= 900. Zero RN Image imports. Zero hooks > 400 lines.
