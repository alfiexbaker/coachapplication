# POC Mock Service Contract

> Date: 2026-02-11
> Status: ACTIVE
> Applies to: Foundation Phases 2-6 (POC mode)
> Stabilized in: `docs/sprints/CompletedSprints/SPRINT-46-POC-MOCK-SERVICE-STABILIZATION.md`

## Objective

Keep mock data for the POC while enforcing production-like architecture:

- Screens/hooks/components call services only.
- Services call `apiClient` only for persistence.
- No runtime imports from `mock-data` modules.
- Account fixtures stay linked across flows (`parent1`, `coach1`, `athlete1`).

## Single Switchover Rule

When moving to real backend, switch one environment flag:

- `EXPO_PUBLIC_USE_MOCK=true` -> mock mode (POC)
- `EXPO_PUBLIC_USE_MOCK=false` -> real API mode

No UI/hook/component rewrites should be required if service boundaries are respected.

## Canonical POC Accounts

Defined in `/Users/tubton/Desktop/coachapplication/clubroom/constants/poc-accounts.ts`:

- `user1`
- `parent1`
- `coach1` (alias-compatible with stored `coach-1`)
- `athlete1` (alias-compatible with `athlete-1` and seeded `child_tom`)

## Guardrails

Enforced by contract tests:

- `/Users/tubton/Desktop/coachapplication/clubroom/__tests__/contracts/poc-account-linkage.contract.test.ts`
- `/Users/tubton/Desktop/coachapplication/clubroom/__tests__/contracts/service-layer-mock-boundary.contract.test.ts`

These tests protect:

- Account-link integrity in mock mode.
- No direct runtime mock-data imports.
- Centralized storage access through `apiClient`.
