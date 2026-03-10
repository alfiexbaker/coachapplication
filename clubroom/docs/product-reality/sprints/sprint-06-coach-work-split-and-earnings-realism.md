# Sprint 06 - Coach Work Split And Earnings Realism

## Objective

Separate org-assigned coaching work from independent coach work in schedule, bookings, and money language.

## Why This Sprint Exists

Coaches can belong to orgs and still run independent work. If those two books of business are mixed together, the product will stay commercially confusing.

## Scope

1. Split coach-facing work into:
   - org assignments
   - independent sessions
2. Split coach money views into:
   - org credits / payout due later
   - independent direct revenue
3. Update session creation and manage flows so the coach always knows whether they are acting:
   - for self
   - for the org
4. Keep money copy honest:
   - org-owned mode is not real payout rails yet
   - use reconciler language until payment rails exist
5. Identify any coach-facing labels that still read like consumer social rather than business operations.

## Acceptance Criteria

- coaches can tell which work belongs to the org and which belongs to them
- org-owned work does not appear as direct coach-owned revenue
- independent work does not appear inside org payout/credit totals
- acting-as context is visible in the main coach operating loop

## Verification

- targeted earnings and bookings tests
- coach flow smoke
- `npm run ui:flows:coach-core -- --fail-on=none`

## Output

At the end of this sprint, a coach can answer:

- "Is this my customer and my money, or am I delivering work for the organization?"
