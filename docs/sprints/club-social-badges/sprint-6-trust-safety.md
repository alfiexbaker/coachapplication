# Sprint 6: Trust, Safety & Operations

**Intent**: Keep Club Hub safe and trustworthy as social and booking loops deepen—visible verification, easy reporting, and notification controls that reassure parents while empowering admins.

## Why this matters
- Social surfaces can spiral without moderation; need clear incident paths and verification badges.
- Parents must feel in control of notifications and who can interact with their child.
- Operations (approvals, blocks) must be consistent across feed, chat, roster, and bookings to avoid loopholes.

## Primary user journeys (mocked)
- **Parent/Member** sees verification on club/coach profiles, can report a post/message/badge, and can tune notifications (mentions, badge awards, incidents).
- **Admin/Owner** reviews incidents, applies actions (mute, restrict posting, remove from club), and sees audit log.
- **Coach** receives safeguards prompts when posting badge/session to minors; acknowledges policies before posting.

## Build scope
- Trust surfaces: verification chip on club/coach headers; safeguarding ribbon on youth squads; policy acknowledgement inline on composers.
- Reporting flows: from feed card, chat drawer, badge detail; modal to select reason, attach screenshot, and see status/past reports.
- Notification center: per-role toggles for mentions, reactions, badge awards, incidents, and booking approvals; defaults on for parents/supporters.
- Incident inbox for admins: filtered list (pending/resolved), action buttons (mute, remove, restrict posting), and audit trail.

## Integration & constraints
- Reuse existing moderation/blocked-state UI from messaging; ensure blocked users see consistent messaging across feed/roster/chat/bookings.
- Verification status sourced from mock data; keep seam for backend while rendering chip and gating certain actions (e.g., unverified coaches cannot broadcast to All).
- Safeguarding prompts should not block flows but must record acknowledgement locally for analytics handoff in Sprint 7.

## Interlocks & FB-grade behaviors
- Report/block/mute appear on feed cards (Sprint 2), rosters (Sprint 3), services/bookings (Sprint 5), and badge views (Sprint 4) so users learn a single pattern.
- Club home (Sprint 1) surfaces verification chips and safety banners when risk is elevated to build trust quickly.
- Booking/offer flow (Sprint 5) pulls in waiver/consent reminders; badge issuance (Sprint 4) includes audit trails and reversible actions by moderators.
- Analytics (Sprint 7) collects abuse types, resolution time, and recurrence to tune prevention and escalation rules.

## Acceptance criteria
- Verification and safeguarding indicators render on club headers, roster rows, and composers.
- Reporting can be triggered from feed/chat/badge views with reason selection and status feedback; blocked-state UI is consistent.
- Notification settings persist locally and reflect defaults per role; incidents inbox shows actions with audit trails.
- Policy acknowledgements recorded when coaches post to youth squads; warnings appear before posting badge/session offers.
