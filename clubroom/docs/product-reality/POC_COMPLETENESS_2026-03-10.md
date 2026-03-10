# POC Completeness Review

Date: 2026-03-10
Purpose: define what still needs to exist for Clubroom to count as a complete, believable POC for an owner-led coaching organization.

## Straight Answer

Yes, there had to be more.

The current org sprint spine is necessary, but it is not enough by itself to produce a complete POC.

The org core gets Clubroom to:

- a believable org model
- believable commercial ownership
- believable staffing and oversight
- believable coach and family trust

But a complete POC also needs:

- org setup
- program and recurring offer setup
- operational communications
- owner reporting
- a polished demoable golden path

Without those, the product might be architecturally right while still not feeling complete in a live walkthrough.

## Definition Of Complete POC

For this repo, a complete POC means you can credibly demo:

1. an owner creates or configures an org
2. the owner invites staff and sets the org commercial mode
3. the org creates programs, sessions, and recurring offers
4. work is assigned and reassigned across staff
5. a family discovers, books, and understands who owns the relationship
6. a coach delivers the work and sees the right business context
7. a head coach supervises quality and follow-up
8. the owner sees the business state in one place
9. notifications and handoffs make operational changes believable
10. the demo data and flows tell one coherent story

## What The Current Plan Already Covers

Covered by the current org-core sprint spine:

- org commercial rule
- booking relationship truth
- staffing and reassignment
- head coach oversight
- coach work separation
- family trust and support ownership

These are the core operating model.

## What Was Missing For Complete POC

### 1. Org Setup And Onboarding

The owner needs a believable first-run path:

- create org
- set branding
- set commercial mode
- invite staff
- define first operating defaults

Without this, the product looks like an already-configured sandbox rather than a real system.

### 2. Programs, Packages, And Recurring Registration

Real coaching businesses do not only sell one-off sessions.

A believable POC needs:

- programs or cohorts
- recurring schedules
- capacity and waitlist behavior
- parent-facing registration choices that match the org model

### 3. Communications And Handoffs

Org products fail fast when reassignments, cancellations, and support routing do not communicate clearly.

A complete POC needs:

- role-aware notifications
- family communication on staff changes
- clear thread ownership after operational changes

### 4. Owner Reporting And Org View

Johnny needs to see:

- staffing load
- org bookings
- outstanding issues
- finance state under current reconciler truth

Without this, the owner cannot actually "see everything" the way you described.

### 5. Golden-Path Demo Readiness

Even a strong architecture does not equal a complete POC unless the app can be walked end-to-end cleanly.

That requires:

- seeded orgs and staff roles
- seeded families and athletes
- coherent demo bookings and reassignment examples
- stable role entry points
- a punch-list of rough edges that would break the demo

## Mandatory For POC vs Later

### Mandatory for complete POC

- PR-03 through PR-07
- PR-11 through PR-15
- PR-16 through PR-20

### Important, but can follow the first complete POC

- PR-08 relationship model cleanup
- PR-09 account/auth/admin-ops honesty
- PR-10 org naming and academy cleanup

Those still matter.

They are not the shortest path to a complete `Johnny's Coaching LTD` demo.

## Practical Rule

The org-core sprints make the product believable.

The POC-completion sprints make the product complete enough to show confidently.
