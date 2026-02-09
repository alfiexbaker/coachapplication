# Road to 100/100 — Sprint Plan

> **Current Score:** 62/100
> **Target Score:** 100/100
> **Quality Bar:** Million-pound Expo project. Stripe/Linear quality. Zero mediocrity.
> **Platform:** iOS + Android (Expo 54 / React Native 0.81)
> **API Status:** Pre-API. Services use AsyncStorage mock data. Prepare for real API.

---

## Score Breakdown

| Layer | Current | Target | Gap |
|-------|---------|--------|-----|
| Architecture | 95/100 | 100/100 | Minor |
| Screens | 48/100 | 100/100 | 130 screens >300 lines, 0 useScreen, 6 error states |
| Components | 54/100 | 100/100 | 195 components >250 lines |
| Test Coverage | 22/100 | 100/100 | ~56 services untested |
| **Overall** | **62/100** | **100/100** | |

---

## Phase 1: Mechanical Cleanup (Sprints 10-12)

Easy, parallelizable. Same find-and-replace pattern as Sprints 6-9.

| Sprint | Task | Files | Complexity |
|--------|------|-------|-----------|
| **10** | `useColorScheme` → `useTheme()` | ~390 | Low |
| **11** | Hex colors → theme tokens | ~88 | Low |
| **12** | `any` types → proper types | 14 | Low |

---

## Phase 2: Screen Decomposition (Sprints 13-18)

The CORE quality work. Every screen gets:
- Decomposed to **<250 lines** (extract sub-components)
- `useScreen()` hook for data loading
- **4 visual states**: loading → `LoadingState`, error → `ErrorState`, empty → `EmptyState`, success → content
- `Row`/`Column`/`Center`/`Spacer` layout primitives
- Pull-to-refresh on list screens
- `memo()` on FlatList items, `useCallback` on handlers

| Sprint | Scope | Screens | Biggest File | Doc |
|--------|-------|---------|-------------|-----|
| **13** | Session & Invite screens | 7 | session-invites/create.tsx (1552) | [SPRINT-13](./SPRINT-13-SESSION-SCREENS.md) |
| **14** | Tab screens | 16 | (tabs)/edit-profile.tsx (1388) | [SPRINT-14](./SPRINT-14-TAB-SCREENS.md) |
| **15** | Club & Academy screens | 15 | club/[id].tsx (972) | [SPRINT-15](./SPRINT-15-CLUB-SCREENS.md) |
| **16** | Coach, Booking, Matches | 18 | booking/[id]/cancel.tsx (1068) | [SPRINT-16](./SPRINT-16-COACH-BOOKING-SCREENS.md) |
| **17** | Development, Analytics, Events, Groups | 18 | development/athlete/[athleteId].tsx (983) | [SPRINT-17](./SPRINT-17-DEV-ANALYTICS-EVENTS.md) |
| **18** | Everything else (roster, drills, family, health, videos, goals, settings, etc.) | 56 | roster/[athleteId]/index.tsx (1076) | [SPRINT-18](./SPRINT-18-REMAINING-SCREENS.md) |

---

## Phase 3: Component Decomposition (Sprints 19-24)

Same quality standard as screens. Every component gets:
- Decomposed to **<250 lines** (extract sub-components)
- Proper memoization (`memo()`, `useCallback`, `useMemo`)
- `accessibilityLabel` on all interactive elements
- 44px minimum touch targets
- Theme tokens only (no raw values)

| Sprint | Scope | Components | Biggest File | Doc |
|--------|-------|-----------|-------------|-----|
| **19** | Coach components | 25 | week-pattern-grid.tsx (978) | [SPRINT-19](./SPRINT-19-COACH-COMPONENTS.md) |
| **20** | Auth, Discover, Parent, User | 18 | onboarding-screen.tsx (1208) | [SPRINT-20](./SPRINT-20-AUTH-DISCOVER-PARENT.md) |
| **21** | Session, Booking, Recurring, Negotiate | 22 | session-detail-modal.tsx (905) | [SPRINT-21](./SPRINT-21-SESSION-BOOKING-COMPONENTS.md) |
| **22** | Analytics, Progress, Health, Goals, Dev | 25 | enhanced-stats.tsx (728) | [SPRINT-22](./SPRINT-22-ANALYTICS-HEALTH-COMPONENTS.md) |
| **23** | Club, Community, Social, Event, Badges | 22 | ClubHeader.tsx (463) | [SPRINT-23](./SPRINT-23-CLUB-SOCIAL-EVENT-COMPONENTS.md) |
| **24** | Everything else (video, drills, safety, family, squad, etc.) | ~44 | squad-invite-modal.tsx (810) | [SPRINT-24](./SPRINT-24-REMAINING-COMPONENTS.md) |

---

## Phase 4: Test Coverage (Sprints 25-28)

Every service gets ok() + err() test paths. Node.js built-in test runner (`node --test`).

| Sprint | Scope | Services | Doc |
|--------|-------|---------|-----|
| **25** | Core services (club, child, follow, roster, notification, auth, etc.) | ~14 | [SPRINT-25](./SPRINT-25-CORE-SERVICE-TESTS.md) |
| **26** | Feature services (invite, squad, community, social, messaging, match, video) | ~12 | [SPRINT-26](./SPRINT-26-FEATURE-SERVICE-TESTS-1.md) |
| **27** | Feature services (analytics, skills, earnings, drill, event, badge) | ~12 | [SPRINT-27](./SPRINT-27-FEATURE-SERVICE-TESTS-2.md) |
| **28** | Remaining services (family, booking module, review, verification, coach, etc.) + final audit | ~14 | [SPRINT-28](./SPRINT-28-REMAINING-SERVICE-TESTS.md) |

---

## Execution Rules

1. **Read `CLAUDE.md` before every sprint** — it has the 17 architecture rules
2. **Read the existing file before editing** — understand context before changing
3. **TypeScript must compile clean after every sprint** — `npx tsc -p tsconfig.test.json`
4. **All 1760+ tests must pass after every sprint** — `node --require ./scripts/test-register.js --test .tmp-tests/**/*.test.js`
5. **Completed sprints**: move doc to `docs/sprints/CompletedSprints/` or `docs/completedSprints/`
6. **No API calls** — this is pre-API. Services use `apiClient` (AsyncStorage mock data)
7. **Zero mediocrity** — if a screen doesn't look like it belongs in a premium app, redo it

---

## Dependencies

```
Phase 1 (Sprints 10-12) → No dependencies, run in any order
Phase 2 (Sprints 13-18) → Run after Phase 1 (screens should have clean theme code first)
Phase 3 (Sprints 19-24) → Run after Phase 2 (components extracted from screens should be decomposed)
Phase 4 (Sprints 25-28) → Run after Phase 3 (services may be refactored during component work)
```
