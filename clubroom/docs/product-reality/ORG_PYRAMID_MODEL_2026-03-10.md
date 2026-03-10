# Org Pyramid Model

Date: 2026-03-10
Status: planning direction locked unless a later decision reopens it

## Core Thesis

Clubroom should treat an organization as a first-class operating entity, not as a decorative club page.

The right mental model is:

- `Johnny's Coaching LTD` is the commercial and operational parent
- Johnny owns the org
- Johnny can hire or assign coaches
- Johnny can see the work those coaches are doing
- Johnny can set programs, standards, schedules, pricing, and financial rules
- coaches deliver within that system according to their assigned scope

That is a pyramid:

- Org Owner
- Org Admin / Ops
- Head Coach / Program Director
- Staff Coach
- Assistant Coach
- Parents / Athletes as customers and participants, not staff

## What The Product Was Implicitly Doing Before

Before this discussion, the repo was in a hybrid state:

- `club` was the real org object in the shipped app
- `academy` existed in docs, route builders, and some service language
- there was no real `app/academy/*` route tree
- there was no first-class `ACADEMY_LEADER` runtime role
- org behavior was effectively "coach/admin accounts with club memberships and permissions"

So the app had org behavior, but not a settled org architecture.

## Working Direction

Use one org model.

Recommended shape:

- one core runtime concept: `organization`
- keep `club` as the default football-facing label in the UI if that fits the brand
- treat `academy` as a presentation label or org subtype only if commercially needed later
- do not maintain separate club and academy product architectures

## The Pyramid We Actually Need

### 1. Org Owner

Needs to:

- see everything in the org
- set pricing, payout rules, finance settings, and business policy
- control staff access
- assign coaches to programs, squads, and sessions
- oversee bookings, utilization, cancellations, and revenue
- approve or intervene in safeguarding, complaints, and customer issues

### 2. Org Admin / Ops

Needs to:

- manage day-to-day operations without full ownership powers
- view org-wide calendars, staff schedules, customer rosters, and payments
- create and manage sessions on behalf of the org
- reassign coaches when staffing changes
- handle membership, invites, and customer support

### 3. Head Coach / Program Director

Needs to:

- oversee a coaching area, age group, location, or program
- assign work to coaches
- review coach delivery quality and completion
- see athlete development, attendance, and safety context for their domain
- publish standards, practice plans, and development tasks

### 4. Staff Coach

Needs to:

- manage their own calendar and assigned sessions
- see only the athletes, squads, and parents they are responsible for
- complete sessions, notes, follow-up, and progress tasks
- access the org's playbook, standards, and assigned work

### 5. Assistant Coach

Needs to:

- view assigned sessions and limited athlete context
- support delivery and attendance
- avoid having access to money, staffing, or org-wide control

## First-Class Org Capabilities The Market Clearly Demands

These are not guesses. They are repeatedly visible in current competitor positioning and help docs:

- one platform for registration, scheduling, communication, and payments
- staff and role permissions
- org-wide financial visibility
- recurring and subscription billing
- team or program-level assignment
- coach oversight and planning
- credential and eligibility checks

Current examples from official sources:

- PlayMetrics emphasizes director oversight, season plans, practice plans, and tracking coach compliance with club philosophy:
  https://home.playmetrics.com/clubs/coaching-and-player-development
- TeamSnap ONE positions clubs around registration, payments, rostering, scheduling, communications, and financial reporting:
  https://www.teamsnap.com/
  https://www.teamsnap.com/for-business
- SportsEngine emphasizes club-wide registration, schedules, rosters, payment collection, reporting, and coach eligibility/background checks:
  https://www.sportsengine.com/organizations/clubs-and-associations
- Spond Club emphasizes recurring payments, group-targeted billing, outstanding payment tracking, and reporting:
  https://www.spond.com/en-us/collecting-payments/
  https://help.spond.com/club/en/articles/177554-payments-in-spond-club
- Upper Hand emphasizes instructor/staff management, access levels, payroll reporting, facility availability, and granular permissions:
  https://upperhand.com/
  https://help.upperhand.com/customize-staff-user-permissions

## What This Means For Clubroom

If Clubroom wants to compete for real football businesses, the org model has to support:

1. org-owned work
2. coach-assigned work
3. parent/athlete trust within an org umbrella
4. centralized money visibility
5. controlled delegation

That means the current "club hub + memberships + posting permissions" layer is not enough on its own.

## Current Finance Reality Vs Target Finance

Current shipped finance reality is still:

- invoice generation
- direct-to-coach payment instructions
- off-app payment tracking
- reconciler state such as owed, paid, and written off

Current shipped finance reality is not yet:

- real payment processor integration
- real org payout rails
- real platform-managed withdrawals

So when this document talks about org-owned money visibility or payout rules, treat that as target architecture and product definition, not as already-shipped runtime truth.

## Recommended Data Spine

The org should sit above:

- staff memberships
- programs
- squads / teams
- venues / locations
- session offerings
- bookings
- payout rules
- revenue ledgers
- compliance / verification state

Suggested hierarchy:

- Organization
- Program or Department
- Squad / Team / Cohort
- Session Offering / Session Template
- Scheduled Session
- Booking / Registration
- Payment / Payout / Invoice / Adjustment

## Recommended Visibility Spine

### Owner visibility

- full org-wide visibility
- all staff
- all customer relationships
- all bookings
- all payments and payouts
- all safeguarding escalations

### Head coach visibility

- full visibility within assigned programs or teams
- coach completion and follow-up within those scopes
- development and attendance summaries
- no unrestricted finance access unless granted

### Coach visibility

- assigned sessions
- assigned athletes and parents
- relevant medical/safety flags
- their own earnings or assigned payout view

### Assistant visibility

- assigned sessions and limited roster context
- no financial control
- limited or masked sensitive data unless policy requires otherwise

## Commercial Ownership

The owner should choose the commercial mode for the organization.

Recommended V1 rule:

- org chooses one commercial mode at org settings
- org-created sessions inherit that mode
- coaches may still run independent business outside the org
- no per-session commercial override in V1

Supported commercial modes:

### Mode A: Org-Owned

- parent pays the organization
- the organization pays the coach
- the owner can see revenue, margins, and payouts

### Mode B: Coach-Owned

- parent pays the coach directly
- the org acts as umbrella, network, or operating context
- the coach remains primary commercial owner

The key requirement is not just supporting both modes.

It is making the choice explicit in:

- booking review
- confirmation
- refunds
- support ownership
- coach earnings
- org reporting

For the full relationship model, see `ORG_RELATIONSHIP_MODEL_2026-03-10.md`.

## Product Principle

Org-owned work should always answer:

- who owns this customer relationship?
- who delivers the session?
- who gets paid?
- who can reassign it?
- who can see its notes, safety context, and performance?

If the system cannot answer those five questions cleanly, the org model is not ready.

## Immediate Planning Consequence

This should move near the top of the backlog.

Org model is not a later polish sprint. It governs:

- booking ownership
- session assignment
- coach oversight
- team operations
- finance design
- admin tooling
- customer trust

## Two Macro Decisions Still Needed

1. Can a coach belong to multiple organizations and sell independently at the same time?
2. In the default org flow, does the organization own the money and pay coaches out?
