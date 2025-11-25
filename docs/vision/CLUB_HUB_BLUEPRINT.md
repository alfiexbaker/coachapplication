# Club Hub Blueprint

A concise blueprint for the Club Hub so clubs (owner/admin), coaches, and students/parents share one coherent workspace without adding parallel systems.

## Goals
- **Single home for club operations** across community, bookings, development, and trust so tabs stay lean (4–5 per role).
- **Role-aware IA**: Owner/Admin > Head Coach > Coach > Student/Parent with clear permissions and post-as options.
- **Reuse existing spines** instead of inventing new flows; surface club context inside current tabs (School, Messages, Bookings, Profile).

## Roles & hierarchy
- **Club Owner/Admin**: Manage club profile, staff, squads/classes, payouts, policies, and badges/awards. Can post as club or self.
- **Head Coach**: Operates squads/classes, manages availability/services for the club, can message/post on behalf of the club for assigned groups.
- **Coach**: Runs assigned sessions, logs notes/objectives, messages squads/classes and parents (post-as self). Limited pricing/payout control.
- **Student & Parent**: View schedule, objectives, badges, messages; can book and pay. Parents manage multiple students.

## Navigation placement (keep 4–5 tabs)
- **Owner/Admin**: Tabs = School (club home), Bookings, Messages, Profile (with payouts/settings). Deep links for roster/squads inside School.
- **Head Coach/Coach**: Tabs = Calendar, Bookings, Messages, Profile. Club home surfaces in Bookings/Calendar headers; School becomes a deep link, not a tab.
- **Student/Parent**: Tabs unchanged (Home/Bookings/Messages/Profile) but club posts/badges appear in Home + Messages.

## Core functionality mapped to spines
### Community & Growth
- Club announcements hub (club feed) with filters: All, Squads, Classes, Badge updates. Post-as toggle (club vs self), attachments, mentions.
- Group chats by type: **Club**, **Squad**, **Class**, **Staff** with member counts and badges; threaded replies optional later.
- Badge hub: issue/view badges & awards per squad or player; shows in profiles and chat rows.
- Discovery cards for club programs/services reused in Home/School; shareable invites and QR for squads.

### Booking, Availability & Revenue
- Club-wide services (private, small group, class, camp) with ownership set to club; coaches assigned per service.
- Shared availability templates per squad/coach; facility calendars to avoid clashes (reuse availability builder).
- Approval workflows: owner/head coach approves services and schedule changes; auto-sync to bookings.
- Pricing, discounts, and bundles per squad/class; payouts routed to club with coach splits (config in Profile > Payouts).
- Attendance list per session with quick status + note links (ties to session notes hook).

### Development & Analytics
- Squad/class roster with objectives and streaks; highlight "needs attention" (no note, low rating, missed session).
- Session notes and objectives per booking already exist—add squad context and badge issuance shortcut from notes screen.
- Evidence vault: media + coach feedback per player; badge triggers display here and in chats.
- Progress dashboards: squad rollups for owners/head coaches; player view for parents/students.

### Trust, Safety & Operations
- Role/permission matrix: edit club profile, approve coaches, manage payouts, issue badges, post-as-club, create squads/classes.
- Onboarding & verification: upload docs, safeguarding checks, consent tracking for minors (parent-scoped).
- Incident logging and flags surfaced in squad roster and chat headers; audit trail for approvals and badge issuances.

## Integration notes (to avoid tech debt)
- **Reuse Messages**: extend thread types (club/squad/class/staff) and post-as metadata already seeded; avoid a new chat system.
- **Reuse School/Bookings**: expose club home inside School tab for owners; for coaches, surface club context inside Calendar/Bookings headers and detail sheets instead of a new tab.
- **Data shape**: align mocks with `Club`, `Squad`, `Membership`, `Badge`, `Announcement`, and `Thread` entities so API handoff is painless. Keep IDs stable across chats/bookings/rosters.
- **Permissions first**: gate buttons by role to prevent UI divergence; share guard helpers across tabs.
- **Progressive delivery**: start with read-only club home + group chats; add booking controls and badge issuance next, then payouts/approvals.

## Near-term deliverable slices
1) **Club home shell**: Club profile card + squads list + quick links (Announcements, Messages, Services). Owners see edit; coaches see assigned squads.
2) **Group chat polish**: Filters for club/squad/class/staff threads, post-as toggle, badge chips in rows, and member list drawer.
3) **Squad roster panel**: Attendance + objectives + note/badge shortcuts; integrate with existing session notes hook and rating flags.
4) **Service/availability alignment**: Service owner=club, coach assignment picker, shared availability templates per squad with conflict hints.
5) **Badge hub MVP**: Issue/view badges from roster or chat, store in evidence vault, reflect in profile and messages.
