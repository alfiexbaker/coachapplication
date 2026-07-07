# AI Task Packet

Use this for non-trivial AI implementation slices.

## Goal

One sentence outcome:

## User-Facing Behavior

What changes for coach, parent, athlete, club, or internal operator:

## Product Spine

Choose one or more:

- Community and Growth
- Booking, Availability and Revenue
- Development and Analytics
- Trust, Safety and Operations

## Relevant Context

Required read path:

- `CODEX.md`
- `docs/START_HERE.md`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/KNOWLEDGE_SPINE.md`

Task-specific deep source:

- TBD

Current runtime truth being relied on:

- TBD

## Scope

Files likely involved:

- TBD

Explicitly out of scope:

- TBD

## Constraints

Architecture and product rules that must hold:

- data access stays behind `services/api-client.ts`
- route ownership stays behind `navigation/routes.ts`
- storage keys come from `constants/storage-keys.ts`
- service errors use `Result<T, ServiceError>`
- club authority uses `contracts/club-governance.ts`
- no new mock-first ownership for trust-sensitive data
- no native `Alert.alert` or `Alert.prompt` in normal product flows

Additional constraints:

- TBD

## Trust And Permission Risks

Sensitive data or roles touched:

- TBD

Deny paths or audit events required:

- TBD

## Plan

1. TBD
2. TBD
3. TBD

## Validation

Narrowest honest command:

```bash
npm run verify:slice
```

Additional targeted checks:

- TBD

## AI Self-Review

Before commit, confirm:

- no parallel flow was introduced
- no trust-sensitive local authority was added
- permission and visibility logic defaults deny
- UI actions have one intent and no dead controls
- validation covers the changed surface

## Done When

- requested behavior is implemented
- relevant verification has run or a blocker is stated
- docs still match runtime truth
- diff has been reviewed for permission, UI, and regression risk
- one atomic commit exists for the slice
