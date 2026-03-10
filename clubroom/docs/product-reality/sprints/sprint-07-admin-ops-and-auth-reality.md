# Sprint 07 - Admin Ops And Auth Reality

## Objective

Close the largest production-truth gaps in auth and internal operations.

## Why This Sprint Exists

The frontend is increasingly strong, but the system is still not fully honest operationally because:

- API auth is placeholder-backed
- demo/mock runtime paths are still central
- no unified internal ops console exists
- staff role models are stronger in docs than in runtime product surfaces

## Scope

1. Define the minimum production-honest auth posture for this phase.
2. Decide how demo mode is allowed to coexist with release verification.
3. Define the minimum viable internal ops surface needed for launch honesty.
4. Align admin/runtime role language with actual available tooling.

## Acceptance Criteria

- release-significant checks do not silently rely on demo-first assumptions
- auth placeholder usage is explicitly contained and documented
- internal ops gaps are translated into clear launch prerequisites
- support/moderation/safeguarding capabilities are described in one realistic operational model

## Verification

- app auth/runtime checks
- API auth/runtime verification
- updated admin reality documentation

## Discussion Needed

- what minimum internal ops capability is required before launch claims are acceptable
- whether auth hardening is a gate for all other rollout decisions or a parallel track
