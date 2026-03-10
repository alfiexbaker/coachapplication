# Sprint 02 - Organization Pyramid And Operating Model

## Objective

Define the first-class organization model for Clubroom before more booking, club, or coach tooling is built on top of the wrong assumptions.

## Why This Sprint Exists

The current product already has organization behavior, but not a settled organization architecture.

The real business need is:

- owner-led coaching companies
- multiple coaches under one business
- delegated operational control
- org-wide visibility
- org-owned scheduling and payments
- coach assignment and oversight

This is fundamental. It is not a later "club enhancement".

## Example To Design Around

- `Johnny's Coaching LTD` exists as the parent business
- Johnny owns it
- Johnny employs or contracts coaches
- Johnny can assign coaches to programs, squads, and sessions
- Johnny can see coach activity and completion
- Johnny can set standards, tasks, schedules, and commercial rules
- Johnny can manage revenue and payouts across the organization

## Scope

1. Define one first-class org concept for runtime product architecture.
2. Define the hierarchy:
   - Owner
   - Admin / Ops
   - Head Coach / Director
   - Coach
   - Assistant
3. Define visibility rules for each role.
4. Define assignment rules:
   - who owns the session
   - who delivers the session
   - who can reassign it
5. Define money rules:
   - who charges the family
   - who receives funds
   - who pays the coach
6. Define whether coaches can also operate independently while belonging to an org.
7. Define how current club and academy concepts map into the new model.

## Deliverables

1. A canonical org hierarchy doc.
2. A permission and visibility matrix.
3. A user-journey doc for owner, ops, head coach, coach, parent, and athlete.
4. A market-baseline doc showing what real org buyers already expect.
5. A commercial ownership model.
6. A migration view showing how current club and academy surfaces should evolve.

## Acceptance Criteria

- the team can explain the org model in one page without contradictions
- every org-owned session can answer:
  - who owns it
  - who delivers it
  - who gets paid
  - who can reassign it
  - who can see it
- current club and academy ambiguity is resolved at the planning level
- later sprints can build on this model without re-opening the base hierarchy

## Verification

- architecture review against current routes, services, and roles
- review against current code evidence:
  - `hooks/use-manage-bookings.ts`
  - `hooks/use-create-session.ts`
  - `services/academy-service.ts`
  - `services/club-service.ts`
  - `navigation/routes.ts`
- traceability against:
  - booking ownership
  - manage bookings
  - club settings
  - org posting
  - payouts and invoices
- stakeholder review before implementation starts

## Macro Decisions Required

1. Can a coach belong to multiple orgs and still run an independent book of business?
2. In the default org flow, does the organization own the money and pay coaches out?

Working premise already chosen:

- `academy` is not a separate runtime architecture for this planning cycle
- if it survives, it survives as label or org subtype, not as a second ghost product
