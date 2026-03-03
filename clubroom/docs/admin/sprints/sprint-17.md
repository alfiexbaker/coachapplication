# Sprint 17 - Design Excellence and Operator Experience (10/10 UX)

## Goal
Design the admin console to be exceptional in real-world operations:
fast to scan, hard to misuse, and clear under stress.

## Dependencies
- Sprints 00-02 (foundation, IAM, support shell)
- Can run in parallel with domain sprints once core routes/components exist

## Scope
- role-first information architecture (Support, Moderation, Risk, Ops, Compliance)
- command-center layout and queue ergonomics for high-volume triage
- case-detail blueprint (timeline, evidence, linked entities, action rail)
- high-signal visual system: severity, SLA, risk, and state patterns
- accessibility and readability pass (keyboard nav, color contrast, focus order, mobile/tablet)
- interaction safety patterns for privileged actions (confirmations, reason capture, step-up prompts)

## Design Deliverables
- navigation map and screen inventory
- low-fi + high-fi designs for core surfaces:
  - command center
  - queue/list views
  - case detail
  - user 360
  - verification review panel
  - incident timeline
- component spec sheet (table, filters, chips, status pills, action bars, evidence panels)
- empty/loading/error state standards
- content and microcopy guidelines for high-risk actions

## UX Quality Bar
- time-to-first-action under 60 seconds for trained staff
- no more than 2 clicks to triage and assign a new case
- primary case facts visible above the fold on desktop and tablet
- destructive/privileged actions impossible to execute without explicit confirmation path

## API/Data Contract Alignment
- list endpoints support server-side sorting/filtering/pagination for dense queues
- case detail endpoint returns full timeline blocks to avoid fragmented loading
- severity/SLA/risk fields standardized across modules for consistent UI semantics

## Security Notes
- sensitive values redacted by default with explicit reveal actions and audit hooks
- irreversible actions require typed confirmation + step-up auth trigger
- role-based UI affordances must mirror backend policy decisions (never UI-only)
- screenshots/export from sensitive panels gated by policy and watermarking rules

## Research and Validation
- scenario-based usability tests with support/moderation/risk operators
- stress test flows: outage mode, mass-report spike, urgent safeguarding escalation
- accessibility audit against WCAG 2.2 AA for core admin workflows

## Test Gates
- interaction tests for critical flows (triage, assign, suspend, verify, escalate)
- accessibility automation checks (focus traps, contrast, labels, semantics)
- responsiveness tests for key breakpoints (mobile, tablet, desktop)
- UX telemetry checks for navigation friction and action completion rates

## Exit Criteria
- core admin workflows meet defined speed and clarity targets
- design system and interaction patterns are documented and reusable
- operator feedback confirms the console is easy to use under high-pressure conditions

