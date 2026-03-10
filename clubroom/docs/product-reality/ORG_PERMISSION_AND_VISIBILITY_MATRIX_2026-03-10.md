# Org Permission And Visibility Matrix

Date: 2026-03-10
Purpose: define what each org role should be able to do and see in the first-class org model.

## Roles

- Owner
- Admin / Ops
- Head Coach / Director
- Coach
- Assistant

## Permission Matrix

| Capability | Owner | Admin / Ops | Head Coach / Director | Coach | Assistant |
|---|---|---|---|---|---|
| View org dashboard | Yes | Yes | Yes | Limited | No |
| Edit org profile, settings, branding | Yes | Yes | Limited | No | No |
| Manage staff and invites | Yes | Yes | Limited | No | No |
| Create org sessions | Yes | Yes | Yes | Yes if granted | No |
| Assign coach to session | Yes | Yes | Yes | No | No |
| Reassign coach to session | Yes | Yes | Yes | No | No |
| Set org pricing rules | Yes | Yes if granted | No | No | No |
| Override coach pricing for org-owned work | Yes | Yes if granted | No | No | No |
| View org-wide revenue and balances | Yes | Yes | Limited | No | No |
| Manage coach payouts | Yes | Yes | No | No | No |
| View program-level attendance and completion | Yes | Yes | Yes | Assigned only | Assigned only |
| View athlete medical or injury flags | Yes if necessary | Yes if operationally necessary | Yes within scope | Assigned only | Limited, need-to-know only |
| View safeguarding escalations | Yes | Yes | Limited within scope | No | No |
| Post as organization | Yes | Yes | Yes | Yes if granted | No |
| See own work queue | Yes | Yes | Yes | Yes | Yes |

## Visibility Rules

### Owner

Should see:

- org-wide sessions and bookings
- all staff and permissions
- all org-owned customers
- revenue, payout obligations, and outstanding balances
- escalations, complaints, and safeguarding cases

Should not lose visibility because work is delegated.

### Admin / Ops

Should see:

- the operating picture of the business
- calendars, bookings, staffing, and payment state
- enough customer and staff detail to solve operational problems

Should not automatically see every sensitive coaching note if it is not operationally required.

### Head Coach / Director

Should see:

- all coaches, squads, and athletes in assigned programs
- coach completion and follow-up quality
- athlete development summaries within scope
- injury or restriction context needed for safe delivery

Should not automatically see full finance or payout controls.

### Coach

Should see:

- assigned sessions and schedule
- assigned athletes and parents
- operational safety context for those athletes
- session notes, development history, and follow-up actions
- own earnings or payout summary if relevant

Should not see unrelated staff, unrelated customers, or org-wide financial reporting.

### Assistant

Should see:

- assigned sessions
- attendance expectations
- limited athlete context needed for safe delivery

Should not see:

- org finance
- staffing controls
- unrestricted medical history
- org-wide notes or reports

## Operating Rules

1. Assignment controls visibility.
2. Org ownership controls financial visibility.
3. Safety context should be granted on a need-to-know basis.
4. Coaching quality oversight belongs above the individual coach.
5. Assistant access should default to narrower than coach access.

## Product Consequence

If Clubroom cannot enforce these distinctions cleanly, it will feel like a single-user app pretending to be an org platform.
