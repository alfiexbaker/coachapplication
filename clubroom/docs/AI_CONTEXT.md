# AI Context Pack

**Last Updated**: 2026-02-11  
**Purpose**: Fast, accurate starting context for future AI turns.

## Read Order

| Priority | Doc | Why |
|---|---|---|
| 1 | `docs/SOURCE_OF_TRUTH.md` | Product vision, roles, spines, operating constraints |
| 2 | `docs/COACH_PARENT_FUNCTIONALITY_ATLAS.md` | Route-level functionality map and current feature gaps |
| 3 | `docs/USER-STORIES.md` | Delivery backlog and sprint-level feature status |
| 4 | `docs/sprints/INDEX.md` | Sprint archive and reference docs |
| 5 | `docs/sprints/Foundation/POC-MOCK-SERVICE-CONTRACT.md` | Mock-service boundary rules and switchover contract |

## Live Code Snapshot

| Metric | Value |
|---|---|
| Route files (`app/**/*.tsx`) | 197 |
| Non-layout route files | 188 |
| Component files (`components/**/*.tsx`) | 952 |
| Service files (`services/**/*.ts`) | 126 |
| Hook files (`hooks/**/*.ts`) | 165 |
| Test files (`__tests__/**/*.ts`) | 143 |
| App screens >300 LOC | 25 |
| Components >250 LOC | 76 |
| Hooks >200 LOC | 61 |
| Services >300 LOC | 69 |
| Raw hex literals (`#xxxxxx`) in app/components/hooks/services/constants | 313 |
| `TODO`/`FIXME`/`HACK`/`XXX` markers (non-test) | 13 |
| Type suppression comments (`@ts-ignore`/`@ts-expect-error`) | 1 |
| `as unknown as Href` casts in `navigation/routes.ts` | 0 |

## Gate Snapshot (Latest Local Run)

| Gate | Result |
|---|---|
| `npm ci --dry-run` | PASS |
| `npm run format:check` | PASS |
| `npx expo lint -- --max-warnings 0` | PASS |
| `npm run typecheck -- --noEmit` | PASS |
| `npm test` | PASS (2/2) |
| Core-flow runtime pass (`bookings` + `invite` + `family` + `community` + `offline`) | PASS (272/272) |

## Architecture Reality

| Area | Current State | Risk |
|---|---|---|
| Service boundary | Strong (`apiClient`, `Result<T, ServiceError>`, event bus) | Low |
| Route typing | Strong; unsafe casts retired in route builders | Low |
| UI composition | Many oversized components/screens/hooks | High |
| Permissions | Mostly service-driven, but route-level checks are not uniformly centralized | Medium |
| Test gates | Strong local quality gates | Medium (no E2E role-flow coverage) |
| Documentation consistency | Improving but historical tracker numbers can drift | Medium |

## Non-Negotiable Rules

- Screen/hook/component layers must read/write through services only.
- Services must read/write through `apiClient` only.
- Keep mock mode contract valid (`EXPO_PUBLIC_USE_MOCK`) until backend cutover.
- Preserve linked POC identities (`parent1`, `coach1`, `athlete1`, `user1`) for deterministic cross-flow tests.

## Historical Tracker Caveat

Foundation phase trackers are retained as historical execution artifacts. Some raw counts in closed trackers may not match current code after subsequent changes.  
For live architecture/readiness calls, use this file plus current gate runs.
