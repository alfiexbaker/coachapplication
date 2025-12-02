# Sprint 3: Membership, Rosters & Roles

**Intent**: Make membership management feel intentional and safe—clear role power, fast invites/approvals, and visible attendance/flags—so clubs stay high-signal like curated FB Groups rather than spammy open rooms.

## Why this matters
- Role clarity reduces friction and abuse; members know who can approve sessions, issue badges, or moderate posts.
- Parents need transparency on who interacts with their child; coaches need quick ways to group athletes (squads/classes) for offers.
- Strong roster UX feeds engagement (targeted posts, badge issuance) and booking conversion (squad-based scheduling).

## Primary user journeys (mocked)
- **Owner/Admin** views roster per squad/class, sees role chips and status (active/pending/blocked), sends invites via code/QR/share link, and approves join requests.
- **Coach** filters roster by squad, takes attendance, flags follow-ups, and promotes/demotes roles (where permitted).
- **Parent/Player** requests to join a squad, tracks pending state, and sees who the coaches/admins are.

## Build scope
- Roster panel per squad/class with: avatar, role chip, attendance/flag chips, and action menu (message, issue badge, view profile).
- Invite flows: generate share links/QR/codes; pending join requests with approve/deny and audit trail chip (who approved, when).
- Role matrix surfaced inline: Owner, Admin, Head Coach, Coach, Athlete, Parent/Guardian, Supporter; tooltips for capabilities.
- Local moderation controls: mute member, hide post, block from club; reflect in feed/threads.

## Integration & constraints
- Permissions must gate all downstream actions (posting, issuing badges, editing services). Centralize guard usage across feed/roster/chat.
- Attendance/flag chips should reuse existing objective/notes patterns for consistency and analytics continuity.
- Keep squad context sticky so offers/badges created from roster inherit the correct group scope by default.

## Interlocks & FB-grade behaviors
- Role matrix feeds feed composer targeting (Sprint 2), badge issuance visibility (Sprint 4), and service eligibility (Sprint 5) so experiences stay coherent.
- Roster presence indicators mirror FB Groups' "active now" to make clubs feel alive; data comes from messaging presence for consistency.
- Trust tooling (Sprint 6) escalates reports based on roles; blocked users disappear from rosters, feed, and booking eligibility.
- Telemetry (Sprint 7) tracks join/leave/role changes and their impact on engagement and bookings.

## Acceptance criteria
- Roster UI shows roles, attendance/flags, and action menus with correct enable/disable states per role matrix.
- Invite/join flows render pending/approved states with toasts and audit info; share link/QR/code flows mocked end-to-end.
- Moderation actions (mute/hide/block) update feed/threads state locally and surface blocked messaging.
- Squad context persists into downstream actions (issue badge, post, offer session).
