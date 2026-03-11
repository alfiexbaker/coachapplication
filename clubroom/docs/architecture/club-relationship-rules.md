# Club Relationship Rules

Validated: 2026-03-11
Purpose: provide one short canonical rules file for how club actors relate to each other, what they do, what they can do, and what data they can see.

## Canonical Sources

- `contracts/club-governance.ts`
- `packages/shared-contracts/src/club/contracts.ts`
- `packages/shared-contracts/src/club/policy.ts`
- `docs/product-reality/ORG_RELATIONSHIP_MODEL_2026-03-10.md`
- `docs/product-reality/ORG_PERMISSION_AND_VISIBILITY_MATRIX_2026-03-10.md`
- `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`
- `docs/SOURCE_OF_TRUTH.md`

Read the shared contract first when you need executable role logic. Use this doc to understand intent and product rules, not to re-derive permission code by hand.

## Actors

- `Owner`
- `Admin / Ops`
- `Head Coach / Director`
- `Coach`
- `Assistant`
- `Parent / Guardian`
- `Athlete`

## Five Relationship Layers

Every club feature must answer these separately:

1. membership
2. delivery
3. commercial ownership
4. trust and supervision
5. identity shown to the family

Do not collapse these into one generic "club access" rule.

## Role Meaning

### Owner

- owns the organization setup and operating model
- can see org-wide business state
- does not lose oversight because work is delegated

### Admin / Ops

- runs staffing, bookings, operations, and support workflows
- can see operational detail needed to solve problems
- should not automatically see every coach-private note

### Head Coach / Director

- oversees delivery quality, assignments, and program-level progress
- can see athlete and coach performance within scope
- should not automatically own finance controls

### Coach

- delivers assigned work
- sees assigned athletes, guardians, sessions, and relevant safety context
- should not see unrelated customers or unrelated org finances

### Assistant

- supports assigned sessions only
- gets only the minimum operational and safety context needed
- is narrower than coach by default

### Parent / Guardian

- books, reviews, consents, and manages child context
- only sees their family and explicitly shared contexts

### Athlete

- sees self-owned progress and session context
- does not gain club-wide visibility from being in a squad or program

## Hard Rules

1. Default deny.
2. Assignment controls visibility.
3. Commercial mode controls finance visibility.
4. Club membership alone does not grant coach-private, medical, safeguarding, or finance access.
5. Access is not transitive.
6. Multi-role users must act in an explicit role for sensitive actions.
7. Assistant access is narrower than coach access unless explicitly widened.
8. Sensitive child data is need-to-know, not role-wide by default.
9. Reassignment changes future delivery visibility; it should not silently preserve unrelated historical access.
10. Every grant, override, escalation, and sensitive read should be auditable.

## Club Membership Rules

- Membership tells you who belongs to the org.
- Membership does not by itself decide who delivers a session.
- Membership does not by itself decide who gets paid.
- Membership does not by itself decide who can read sensitive child data.

## Delivery Rules

- The assigned deliverer sees the session, athlete context, and necessary safety context.
- Assistants only see assigned-session context.
- Unassigned coaches do not inherit visibility because they are in the same club.

## Commercial Rules

Clubroom needs one explicit commercial mode per org in V1:

- `Org-Owned`
- `Coach-Owned`

Rule:

- org-created sessions inherit the org commercial mode
- independent coach sessions stay outside the org
- no silent hybrid behavior inside the same org

## Family-Facing Identity Rules

Families must always be able to tell:

- who they are booking with
- who will deliver
- who handles billing and refunds
- who support issues route to

If the UI cannot answer those clearly, the club flow is wrong.

## Visibility Rules By Area

### Finance

- `Owner`: org-wide
- `Admin / Ops`: org-wide if operationally granted
- `Head Coach`: limited, only if explicitly needed
- `Coach`: own earnings or payout context only
- `Assistant`: none

### Athlete Development

- `Owner`: summary-level, not automatic private coaching detail
- `Admin / Ops`: operationally limited
- `Head Coach`: within scope
- `Coach`: assigned athletes
- `Assistant`: assigned-session minimum only

### Medical and Safeguarding

- `Owner` and `Admin / Ops`: only when operationally necessary
- `Head Coach`: within scope and only as needed
- `Coach`: assigned athletes and only the required safe-delivery context
- `Assistant`: minimal need-to-know only

## What Must Never Be Implicit

- club member -> full athlete history
- club member -> all coach notes
- head coach -> all payouts
- assistant -> full medical history
- parent booking through org -> unclear billing owner
- coach leaving org -> lingering access without explicit rule

## Build Checklist For Club Features

Before shipping a club feature, answer:

1. Who owns the customer relationship?
2. Who delivers the work?
3. Which club role can view it?
4. Which role can change it?
5. What child or family data becomes visible?
6. Is that visibility assignment-based or org-wide?
7. What changes when the assigned coach changes?
8. What does the parent think is happening?

## Use This File For

- club booking flows
- org staffing and reassignment
- club dashboards
- role-based visibility and permissions
- parent-facing org booking copy

## Do Not Use This File For

- exact backend schema details
- exact API route contracts
- sprint history

For those, use the linked canonical sources.
