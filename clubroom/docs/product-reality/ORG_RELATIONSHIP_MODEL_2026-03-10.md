# Org Relationship Model

Date: 2026-03-10
Status: planning rule for org relationship clarity
Purpose: make the key org relationships explicit so Clubroom does not build confusing ownership, payment, and trust flows.

## Why This Exists

The hard part is not only hierarchy.

The hard part is relationship clarity.

When a parent books through an organization, the product must answer:

- who do they believe they are booking with
- who delivers the session
- who gets the money
- who can reassign the work
- who is responsible if something goes wrong
- who can see the child and family data

If those answers are not explicit, the org model will feel fake and unsafe.

## The Five Relationships Clubroom Must Model

### 1. Membership Relationship

This answers:

- who belongs to the org
- what role they have
- what permissions they hold

Examples:

- Johnny is `Owner` of `Johnny's Coaching LTD`
- Sarah is a `Coach`
- Dan is an `Assistant`

This is about hierarchy and permissions, not money.

### 2. Delivery Relationship

This answers:

- who is actually delivering the session
- who is assisting
- who can be reassigned

Examples:

- the org owns the session, but Sarah delivers it
- Dan assists on the same session

This is about staffing and delivery, not customer ownership.

### 3. Commercial Relationship

This answers:

- who owns the customer relationship
- who charges the family
- who owes the refund
- who pays the coach

This is the relationship the owner is actually deciding.

### 4. Trust And Supervision Relationship

This answers:

- who can see the child, parent, and athlete data
- who can see injuries, restrictions, and safeguarding context
- who can intervene in complaints or session problems

This should follow assignment, scope, and org role.

### 5. Identity Relationship

This answers:

- what the parent sees on the booking screen
- whose brand the session sits under
- who support requests and complaints are routed to

If the identity relationship is unclear, families will not trust the flow.

## Decision

Clubroom should let the `Owner` choose the commercial mode for the organization.

But the system must still be strict about what that means.

## Current Financial Truth

This is important:

- Clubroom does not currently have real in-app payment processing or real payout rails in the shipped product flow
- current finance behavior is primarily invoice plus direct-to-coach payment instructions plus reconciler state
- current payout and withdrawal service surfaces are mock/demo infrastructure, not production-truth money movement

Current code evidence:

- `app/earnings.tsx` is explicitly a cash reconciliation screen
- `services/coach-payment-instructions-service.ts` says payment is made directly to the coach outside the app
- `services/earnings/payout-service.ts` and `services/earnings/earnings-report-service.ts` are still mock-backed

So:

- `Org-Owned` and `Coach-Owned` are currently planning and architecture rules
- they are not yet a shipped payment-processor capability
- any future org finance build must preserve this distinction between current truth and target state

## Recommended V1 Rule

Use an org-level commercial setting.

The org owner chooses one default commercial mode for the organization:

1. `Org-Owned`
2. `Coach-Owned`

Coaches may still run independent business outside the org.

That means:

- a coach can belong to multiple orgs
- a coach can also run non-org sessions independently
- org sessions and independent sessions must be clearly separated

## Important Constraint

Do not allow accidental ambiguity inside the same org in V1.

Recommended V1 rule:

- every org has one commercial mode
- org-created sessions inherit that mode
- independent coach sessions sit outside the org
- no per-session commercial override in V1

Reason:

- it keeps parent trust clear
- it keeps finance logic tractable
- it keeps reporting and refunds understandable
- it avoids building a hybrid mess too early

If hybrid org behavior is needed later, it should be an explicit advanced mode, not a default.

## Commercial Modes

### Mode A: Org-Owned

Meaning:

- the parent books the organization
- the organization receives the money
- the organization assigns the coach
- the organization owes refunds and support resolution
- the coach sees payout/credit, not primary customer revenue

Parent mental model:

- "I am booking `Johnny's Coaching LTD`"
- "Coach Sarah is delivering my session"

Best for:

- owner-led coaching companies
- multi-coach programs
- businesses that want centralized reporting and payout control

### Mode B: Coach-Owned

Meaning:

- the parent books the coach directly
- the coach receives the money
- the org provides the umbrella, network, visibility, or operating support
- the coach is primary commercial owner
- the org has limited commercial visibility relative to org-owned mode

Parent mental model:

- "I am booking Coach Sarah"
- "`Johnny's Coaching LTD` is the organization she works within"

Best for:

- looser collectives
- marketplace-style networks
- coaches who maintain their own customer books

## What The Owner Is Actually Choosing

When the owner sets the org commercial mode, they are choosing:

1. who the family pays
2. who appears as merchant or billing owner
3. who owes refunds
4. whether coach earnings show as payouts or direct revenue
5. how reassignment works when a coach changes
6. how reporting is grouped

This is not a cosmetic setting.

It is a foundational business rule.

## Explicit Product Copy Needed

The UI should always tell the family the relationship clearly.

### In Org-Owned Mode

Booking review and confirmation should say things like:

- `Booked with Johnny's Coaching LTD`
- `Delivered by Coach Sarah`
- `Billing and refunds handled by Johnny's Coaching LTD`

### In Coach-Owned Mode

Booking review and confirmation should say things like:

- `Booked with Coach Sarah`
- `Part of Johnny's Coaching LTD`
- `Billing handled by Coach Sarah`

## What We Need To Make This Real

### 1. Data Model

We need explicit fields for:

- `organization.commercialMode`
- `organization.billingOwnerType`
- `organization.supportOwnerType`
- `session.organizationId`
- `session.deliveryCoachId`
- `session.commercialOwnerType`
- `session.commercialOwnerId`
- `booking.bookedWithType`
- `booking.bookedWithId`
- `booking.supportOwnerId`
- `booking.refundOwnerId`

### 2. Permissions

We need rules for:

- who can change org commercial mode
- who can create org-owned sessions
- who can reassign delivery coach
- who can see org-wide revenue
- who can see coach payout detail

### 3. Booking UX

We need booking screens to show:

- booked with
- delivered by
- billed by
- refund owner
- support contact

### 4. Coach UX

We need coach surfaces to distinguish:

- `Org Assignments`
- `Independent Sessions`
- `Org Payouts`
- `Independent Revenue`

Otherwise earnings and responsibility will blur together.

### 5. Owner And Ops UX

We need owner and ops surfaces for:

- org schedule operations
- staffing and reassignment
- org revenue and payouts
- issue handling and customer ownership

### 6. Reporting

We need reporting to separate:

- org-owned revenue
- coach-owned revenue
- coach payouts from org-owned work
- independent coach earnings outside org work

### 7. Trust Rules

We need data visibility to follow both:

- assignment
- org responsibility

Example:

- a reassigned coach should gain the needed session context
- a removed coach should lose access when no longer responsible

## Recommended Build Sequence

1. Add explicit org commercial-mode planning and copy rules.
2. Add data-contract fields for commercial ownership.
3. Make booking review/confirmation state the relationship clearly.
4. Split coach earnings between org payouts and independent revenue.
5. Add owner/org finance and staffing views.
6. Only after that, consider advanced hybrid org modes.

## Important Language Rule

Until real money rails exist, avoid implying that Clubroom currently performs actual payouts.

Current-truth language should use terms like:

- `payment tracking`
- `reconciliation`
- `owed`
- `paid`
- `written off`
- `billing owner`
- `refund responsibility`

Future-state architecture can still use:

- `payout obligations`
- `org-owned revenue`
- `coach payouts`

But those should be clearly marked as target-state finance behavior, not already shipped money movement.

## Working Product Rule

Every session should be able to answer these seven questions:

1. Which organization, if any, does this belong to?
2. Who created it?
3. Who delivers it?
4. Who does the family believe they are booking with?
5. Who gets the money?
6. Who owes support and refunds?
7. Who can see and manage it?

If the system cannot answer those clearly, the relationship model is not ready.
