# Sprint 04 - Coach Business Realism

## Objective

Make the coach experience read like a real coaching business platform, not a generic social app with booking attached.

## Why This Sprint Exists

Coach tooling is one of the strongest parts of the repo, but the product language and surface hierarchy still drift between:

- professional operations
- consumer discovery
- social feed mechanics

That weakens the product story.

## Coach Daily Loop To Optimize

1. Get discovered
2. Convert interest into booking
3. Manage schedule and session creation
4. Run sessions and collect follow-up actions
5. Maintain athlete/parent trust
6. Get paid and understand business health

## Scope

1. Audit coach home, coach profile, bookings, manage, progress-loop, earnings, and settings through the daily-loop lens.
2. Remove or down-rank consumer-social framing that weakens business credibility.
3. Make the top-level coach path coherent:
   - home
   - bookings/manage
   - session creation
   - progress/follow-up
   - earnings
4. Identify any key missing states that make the business story feel fake.

## Acceptance Criteria

- the coach experience can be described as one coherent operating loop
- primary coach CTAs support business outcomes first
- no high-traffic coach surface uses language that conflicts with the chosen relationship model
- the remaining "coach realism" gaps are documented as explicit product choices, not accidental drift

## Verification

- `npm run ui:flows:coach-core -- --fail-on=none`
- targeted smoke for coach profile, manage, sessions/create, earnings, and progress-loop
- review of copy and navigation hierarchy, not only tests

## Discussion Needed

- how much community/social remains top-level for coaches
- whether the product is primarily a marketplace, a coach OS, or a blended model
