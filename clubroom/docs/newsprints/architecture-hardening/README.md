# Architecture Hardening Sprint Track (Google-Grade Path)

**Created**: 2026-03-04  
**Purpose**: Move Clubroom from "strong but with red gates" to release-grade architecture with enforceable quality standards.

## Sprint Sequence

1. `sprint1-release-gates-and-baseline.md`
2. `sprint2-layering-and-decoupling-core-flows.md`
3. `sprint3-state-contracts-and-platform-integrity.md`
4. `sprint4-google-grade-readiness-and-operability.md`

## Why this order

1. Sprint 1 clears immediate blockers and establishes metric baselines.
2. Sprint 2 reduces coupling in high-risk user journeys (booking/discover/invite/club sessions).
3. Sprint 3 locks contracts so behavior is deterministic across paths.
4. Sprint 4 hardens reliability/security/operations for launch confidence.

## Metric Targets

| Metric | Baseline (2026-03-04) | Target after S1 | Target after S2 | Target after S3 | Target after S4 |
|---|---:|---:|---:|---:|---:|
| typecheck errors | 8 | 0 | 0 | 0 | 0 |
| safety test failures | 1 | 0 | 0 | 0 | 0 |
| component->service imports | 186 | <=186 (no regression) | <=150 | <=120 | <=100 |
| services->UI imports | 0 | 0 | 0 | 0 | 0 |
| hardcoded routes in router pushes | 0 | 0 | 0 | 0 | 0 |
| notification triggers without recipient | unknown baseline | 0 in touched paths | 0 in all booking/invite/event paths | 0 platform-wide | 0 platform-wide |

## Definition of "Google-Grade" in this track

1. Gates always green by default (`typecheck`, safety, release-core).
2. Layer boundaries are machine-enforced, not reviewer-enforced.
3. Critical contracts are typed and test-conformant.
4. Reliability is measured by SLOs with clear ownership.
5. Security/data cutover plans are concrete and executable.

