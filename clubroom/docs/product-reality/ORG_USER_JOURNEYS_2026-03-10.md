# Org User Journeys

Date: 2026-03-10
Purpose: think through the org model as real users would live it, not only as roles and entities.

## 1. Owner Journey: `Johnny's Coaching LTD`

Johnny needs to answer:

- how busy is the business this week
- which coaches are fully assigned, underused, or overloaded
- which sessions are unassigned or at risk
- how much money came in
- what still needs payout or follow-up
- whether any parent, safety, or staffing issue needs intervention

Johnny should land on:

- org-wide schedule and staffing view
- org revenue and payout snapshot
- coach activity and completion snapshot
- unresolved operational alerts

What feels wrong today:

- org control is split between `club` and `academy` language
- session assignment flows still carry `academyService` assumptions
- there is no first-class owner console above the coach-level experience

## 2. Admin / Ops Journey

Ops needs to answer:

- which families are booked where
- which coaches are delivering what
- where cover is needed
- who owes money or needs a refund
- which invite, roster, or membership problem is blocking delivery

Ops should land on:

- bookings and schedule operations view
- staffing and assignment view
- family and roster support tools
- payment-state and exception queue

What feels wrong today:

- the app has management capability, but not yet as a clean org-operations surface
- money ownership is still ambiguous
- some settings and support actions are scattered across club and coach surfaces

## 3. Head Coach / Director Journey

Head Coach needs to answer:

- are coaches following the program standards
- which athletes or squads need attention
- which sessions still need notes or follow-up
- whether a coach needs support, cover, or intervention

Head Coach should land on:

- program schedule and staff delivery view
- athlete progress and attendance summaries inside assigned scope
- coach completion and coaching-quality signals
- assigned tasks, standards, or playbook entry points

What feels wrong today:

- `HEAD_COACH` exists in the code, but the product does not yet give that role a distinct operating surface
- tasking and quality oversight are implied, not first-class

## 4. Coach Journey

Coach needs to answer:

- what am I delivering today
- who am I coaching
- what do I need to know before the session
- what follow-up is expected after the session
- what have I earned or been credited for my work

Coach should land on:

- assigned schedule
- athlete roster for assigned work
- session preparation context
- quick completion and follow-up actions
- payout or earnings view tied to assigned work

What feels wrong today:

- coach tooling is strong, but some relationship copy still reads like social networking
- org-owned versus self-owned work is not explained clearly enough

## 5. Parent Journey In An Org Context

Parent needs to answer:

- am I booking this coach or this organization
- who is responsible if the assigned coach changes
- where do payments go
- who can see my child's information
- who should I contact if something goes wrong

Parent should see:

- a clear org identity
- the delivering coach for each session
- payment ownership and refund responsibility
- who has access to the child in that org context

What feels wrong today:

- org ownership and coach assignment rules are not explicit in the booking story
- relationship language is still partly social rather than professional

## 6. Athlete Journey In An Org Context

Athlete needs to answer:

- who is coaching me
- what squad or program I am in
- what I need to work on
- which adults in the org can see my progress and health context

Athlete should see:

- assigned coach and org context
- progress path inside the program
- clear trust boundaries around sharing and visibility

What feels wrong today:

- development tooling is strong
- visibility rules across org hierarchy are not yet explicit in product language

## Screens The Org Model Must Eventually Produce

### Owner / Admin

- Org Home
- Staff
- Schedule Ops
- Revenue And Payouts
- Customer And Booking Issues
- Safeguarding / Escalations

### Head Coach

- Program Dashboard
- Coach Oversight
- Athlete Watchlist
- Standards / Tasks

### Coach

- My Assignments
- My Sessions
- My Athletes
- My Follow-Up
- My Earnings Or Payouts

## Reality Check

The current repo is already strong enough to support parts of these flows.

What it does not yet have is a settled top-down org experience that tells each role:

- what they own
- what they can see
- what they are accountable for
- how money and responsibility flow
