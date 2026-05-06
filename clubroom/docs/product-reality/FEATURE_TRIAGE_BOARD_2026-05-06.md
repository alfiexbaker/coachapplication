# Feature Triage Board

Date: 2026-05-06
Scope: current Expo app route surface, excluding layouts and Expo boilerplate.
Route coverage: 179 routable product surfaces.

## Decision Vocabulary

- `USE`: keep for launch because it directly supports booking, delivery, trust, family coordination, coach revenue, or club operations.
- `NARROW`: keep the useful part, remove/de-emphasize clutter, duplicate summaries, or speculative depth.
- `MERGE`: keep the capability, but fold it into a stronger nearby workflow instead of keeping a standalone destination.
- `DELETE`: remove from launch and code unless a clear user journey proves it belongs.
- `POST-LAUNCH`: hide or demote until after deployment; do not let it block release.

## Product Bar

Launch Clubroom should feel like:

- book a football coach
- manage sessions, availability, invites, and earnings
- coordinate children, medical data, consent, and family calendar
- run clubs, squads, staffing, and schedules
- protect trust, safeguarding, and verification

Anything outside that bar needs to justify itself.

## Full Feature Inventory

| Area | Feature | Route coverage | Decision | Reason |
| --- | --- | --- | --- | --- |
| App shell | Role home and tab routing | `(tabs)/index.tsx`, `(tabs)/more.tsx`, `(tabs)/profile.tsx`, `(tabs)/settings.tsx` | USE | Core navigation shell. |
| App shell | Profile editing | `(tabs)/edit-profile.tsx` | USE | Required account/profile maintenance. |
| App shell | Notifications | `(tabs)/notifications.tsx` | USE | Operational follow-up surface. |
| App shell | Generic updates/feed | `(tabs)/feed.tsx` | NARROW | Keep as updates, not social feed. |
| Admin | Invite code management | `(tabs)/admin/invite-codes.tsx` | NARROW | Useful for controlled access, but not a broad admin product. |
| Family | Add child | `(modal)/add-child.tsx` | USE | Core parent onboarding and booking prerequisite. |
| Family | Edit child profile | `(modal)/edit-child-profile.tsx` | USE | Trust and family data maintenance. |
| Family | Edit child SEN/special needs | `(modal)/edit-child-sen.tsx` | USE | Trust-sensitive child context. |
| Social/update creation | Create personal post | `(modal)/create-post.tsx` | NARROW | Keep only if it supports coach/club updates; avoid generic social posting. |
| Social/update creation | Create club post | `(modal)/create-club-post.tsx` | USE | Club communication is relevant. |
| Club | Create squad modal | `(modal)/create-squad.tsx` | USE | Squad structure supports club operations. |
| Updates | Post detail | `(modal)/post-detail.tsx` | NARROW | Keep if updates remain; remove social-style dead actions. |
| Bookings | Booking list | `(tabs)/bookings/index.tsx` | USE | Core product. |
| Bookings | Booking detail | `(tabs)/bookings/[id].tsx` | USE | Core operational and trust workflow. |
| Bookings | Report booking problem | `(tabs)/bookings/report-problem.tsx` | USE | Trust and support-critical. |
| Bookings | Session feedback from booking | `(tabs)/bookings/session-feedback.tsx` | USE | Delivery follow-up and proof. |
| Bookings | Cancel booking | `booking/[id]/cancel.tsx` | USE | Required lifecycle action. |
| Bookings | Subscription/recurring booking upsell | `bookings/subscribe.tsx` | NARROW | Keep only if tied to real recurring booking value. |
| Booking flow | Coach search entry | `book-coach.tsx` | USE | Marketplace core. |
| Booking flow | Coach booking shell | `book/[coachId]/index.tsx` | USE | Marketplace core. |
| Booking flow | Session type | `book/[coachId]/session-type.tsx` | USE | Required booking choice. |
| Booking flow | Schedule selection | `book/[coachId]/schedule.tsx` | USE | Required booking choice. |
| Booking flow | Booking details | `book/[coachId]/details.tsx` | USE | Required booking data. |
| Booking flow | Booking review | `book/[coachId]/review.tsx` | USE | Required confirmation. |
| Booking flow | Booking confirmation | `book/[coachId]/confirmation.tsx` | USE | Required receipt/end state. |
| Booking flow | Multi-week booking | `book/[coachId]/multi-week.tsx` | NARROW | Useful if recurring plans stay, but can be simplified. |
| Coach ops | Schedule tab | `(tabs)/schedule.tsx` | USE | Core coach operations. |
| Coach ops | Availability tab | `(tabs)/availability.tsx` | USE | Core revenue control. |
| Coach ops | Add availability template | `availability/add-template.tsx` | USE | Core availability setup. |
| Coach ops | Edit availability template | `availability/edit-template.tsx` | USE | Core availability maintenance. |
| Coach ops | Block date | `availability/block-date.tsx` | USE | Required real-world scheduling. |
| Coach ops | Availability calendar | `availability/calendar.tsx` | USE | Core schedule visibility. |
| Coach ops | Earnings tab | `(tabs)/earnings.tsx`, `earnings.tsx` | USE | Coach business value. |
| Coach ops | Coach profile tab | `(tabs)/coach-profile.tsx` | NARROW | Keep storefront essentials, remove vanity/social weight. |
| Coach ops | Public coach profile | `coach/[coachId]/public.tsx`, `coach/[id].tsx` | USE | Conversion surface for booking. |
| Coach ops | Coach invite athlete | `coach/invite.tsx` | USE | Fits coach-to-athlete workflow. |
| Coach ops | Coach club invites | `coach-invites.tsx` | USE | Required club staffing/join flow. |
| Coach ops | Athletes tab | `(tabs)/athletes.tsx` | MERGE | Likely overlaps roster; keep capability, reduce duplicate destination. |
| Roster | Roster list | `(tabs)/roster.tsx`, `roster/index.tsx` | USE | Core coach/club management. |
| Roster | Athlete detail | `roster/[athleteId]/index.tsx` | USE | Core coach delivery context. |
| Roster | Add athlete to session | `roster/[athleteId]/add-to-session.tsx` | USE | Useful action bridge. |
| Roster | Roster emergency info | `roster/[athleteId]/emergency.tsx` | USE | Trust-sensitive, keep protected. |
| Roster | Roster health info | `roster/[athleteId]/health.tsx` | USE | Trust-sensitive, keep protected. |
| Roster | Raise concern | `roster/[athleteId]/raise-concern.tsx` | USE | Safeguarding-critical. |
| Roster | Consent dashboard | `roster/consents.tsx` | USE | Trust and compliance. |
| Family | Children tab | `(tabs)/children.tsx` | USE | Parent core. |
| Family | Child emergency | `child/[id]/emergency.tsx` | USE | Trust-sensitive, core. |
| Family | Child medical | `child/[id]/medical.tsx` | USE | Trust-sensitive, core. |
| Family | Child badges | `children/badges/[childId].tsx` | NARROW | Keep only if badges stay in development loop. |
| Family | Family overview | `family/index.tsx` | NARROW | Action gateway only, not dashboard clutter. |
| Family | Family calendar | `family/calendar.tsx` | USE | Strong family operating surface. |
| Family | Family recurring | `family/recurring.tsx` | USE | Useful for repeat bookings and family coordination. |
| Family | Family sharing | `family/sharing.tsx` | USE | Trust and guardian coordination. |
| Family | Family spending | `family/spending.tsx` | DELETE | You already called this out; low-action finance summary, not core. |
| Family | Legacy family redirects | `family/[legacy].tsx` | NARROW | Keep only as temporary redirects, then remove after release. |
| Messaging | Messages tab | `(tabs)/messages.tsx` | USE | Operational communication. |
| Messaging | Chat index/detail | `chat/index.tsx`, `chat/[threadId].tsx` | USE | Operational communication. |
| Club | Club hub tab | `(tabs)/club-hub.tsx` | USE | Club entry point. |
| Club | My clubs | `club/my-clubs.tsx` | USE | Club membership and switching. |
| Club | Club create/setup | `club/create.tsx`, `club/setup-complete.tsx` | USE | Org onboarding. |
| Club | Invite members | `club/invite-members.tsx` | USE | Club growth/staffing. |
| Club | Club settings | `club/settings.tsx` | USE | Org administration. |
| Club | Club detail | `club/[id].tsx` | USE | Club operating surface. |
| Club | Club dashboard | `club/[clubId]/dashboard.tsx` | USE | Owner/staff operations. |
| Club | Club calendar | `club/[clubId]/calendar.tsx` | MERGE | Fold into canonical club schedule if duplicate. |
| Club | Club schedule | `club/[id]/schedule.tsx` | USE | Core club coordination. |
| Club | Club activity resolver | `club/[id]/activity/[activityId].tsx` | USE | Keeps event/session/match routing coherent. |
| Club | Club member detail | `club/[clubId]/member/[memberId].tsx` | USE | Staff/member management. |
| Club | Club training schedule | `club/training-schedule.tsx` | USE | Club operations. |
| Club | Squad detail | `club/squad/[id].tsx` | USE | Team structure. |
| Club | Squad schedule | `club/squad/[id]/schedule.tsx` | USE | Team coordination. |
| Club | Squad create | `club/squad/create.tsx` | USE | Team setup. |
| Sessions | Create session | `sessions/create.tsx` | USE | Core coach delivery/revenue workflow. |
| Sessions | Complete session | `session/[id]/complete.tsx` | USE | Delivery and proof. |
| Sessions | Session RSVP | `session/[id]/rsvp.tsx` | USE | Operational attendance. |
| Sessions | Session notes | `session-notes/[bookingId].tsx` | USE | Coach follow-up and development proof. |
| Session invites | Invite list | `session-invites/index.tsx` | USE | Core session-fill workflow. |
| Session invites | Invite create | `session-invites/create.tsx` | USE | Core session-fill workflow. |
| Session invites | Invite detail | `session-invites/[id].tsx` | USE | Required for response/cancel/reminder. |
| Session invites | Group invite | `session-invites/group.tsx` | NARROW | Keep if it maps cleanly to group sessions; avoid separate invite world. |
| Group sessions | Group session list | `group-sessions/index.tsx` | USE | Club/team/training product. |
| Group sessions | Group session create | `group-sessions/create.tsx` | USE | Coach/club operations. |
| Group sessions | Group session detail | `group-sessions/[id].tsx` | USE | Operational session surface. |
| Group sessions | Group roster | `group-sessions/[id]/roster.tsx` | USE | Required for attendance/training. |
| Events | Event list | `events/index.tsx` | USE | Club coordination. |
| Events | Event create | `events/create.tsx` | USE | Club coordination. |
| Events | Event workspace | `events/[id].tsx` | USE | Launch-grade operational workspace. |
| Events | Event RSVP route | `events/[id]/rsvp.tsx` | MERGE | Keep only if it adds value beyond event workspace. |
| Events | Event attendees route | `events/[id]/attendees.tsx` | MERGE | Keep only if it adds value beyond event workspace. |
| Matches | Match list | `matches/index.tsx` | NARROW | Not a launch blocker; keep if club schedule needs it. |
| Matches | Match create | `matches/create.tsx` | NARROW | Not a launch blocker; simplify or hide if weak. |
| Matches | Match detail | `matches/[id].tsx` | NARROW | Keep only as club schedule detail support. |
| Invoices | Invoice list | `invoices/index.tsx` | USE | Revenue and payment trust. |
| Invoices | Invoice detail/payment | `invoices/[id].tsx` | USE | Revenue and payment trust. |
| Reviews | Rate coach | `rate-coach.tsx` | USE | Review proof and marketplace trust. |
| Reviews | Booking review | `review/[bookingId].tsx`, `review/create.tsx` | USE | Booking-linked proof. |
| Discovery | Discover sessions | `discover-sessions.tsx` | NARROW | Keep only if it converts to booking, not browsing for its own sake. |
| Discovery | Discover map | `discover/map.tsx` | USE | Centerpiece local coach/session discovery surface; keep and harden. |
| Discovery | Compare coaches | `compare/index.tsx`, `compare/[ids].tsx` | DELETE | Likely AI-added marketplace gimmick; booking search/profile can carry comparison. |
| Discovery | Favourites | `favourites/index.tsx` | NARROW | Keep only if it drives repeat booking. |
| Referrals | Referral invite | `referrals/invite.tsx` | DELETE | Growth gimmick unless referral program is real. |
| Development | My progress | `development/my-progress.tsx` | USE | Athlete value spine. |
| Development | Athlete progress | `development/athlete/[athleteId]/index.tsx` | USE | Coach/family development context. |
| Development | Child progress | `development/child-progress/[childId].tsx` | USE | Family development context. |
| Development | Session detail | `development/session/[sessionId].tsx` | USE | Delivery follow-up and proof. |
| Development | Session history | `development/session-history.tsx` | USE | Useful if concise. |
| Development | Progress loop | `development/progress-loop.tsx` | NARROW | Keep if it becomes simple and actionable. |
| Development | Results program | `development/results-program.tsx`, `results-program.tsx` | DELETE | Product-fluffy unless tied to real coaching plans. |
| Development | Media gallery | `development/media-gallery.tsx` | NARROW | Keep only if video/session proof stays central. |
| Development | Development badges | `development/badges.tsx`, `badges/index.tsx`, `(tabs)/badges.tsx` | NARROW | Badges can stay secondary, not primary product. |
| Development | Athlete special needs | `development/athlete/[athleteId]/special-needs.tsx` | USE | Trust-sensitive coaching context. |
| Development | Seed health | `development/seed-health.tsx` | DELETE | Sounds like internal/dev helper, not product. |
| Goals | Goals list/detail/create | `goals/index.tsx`, `goals/[id].tsx`, `goals/create.tsx` | NARROW | Keep only if linked to sessions/coaches, not generic self-improvement. |
| Drills | Drill library | `drills/index.tsx`, `drills/library.tsx`, `drills/[id].tsx` | NARROW | Useful if tied to coach assignments. |
| Drills | Drill create/assign | `drills/create.tsx`, `drills/assign.tsx` | NARROW | Keep for coaches only if assignment path is real. |
| Drills | Challenges | `drills/challenges.tsx`, `drills/create-challenge.tsx` | DELETE | Gamified niche surface; likely distraction. |
| Skills | Skills list/detail | `skills/index.tsx`, `skills/[category].tsx` | NARROW | Keep if it supports session feedback and progress. |
| Athlete | Athlete journal | `athlete/journal.tsx` | POST-LAUNCH | Personal journaling is not core launch. |
| Health | Health dashboard | `health/index.tsx` | USE | Trust and athlete care. |
| Health | Health detail/log/injuries | `health/[id].tsx`, `health/log.tsx`, `health/injuries.tsx` | USE | Trust-sensitive, keep if guarded. |
| Verification | Verification hub | `verification/index.tsx` | USE | Marketplace trust. |
| Verification | ID/background/credentials/insurance | `verification/id.tsx`, `verification/background.tsx`, `verification/credentials.tsx`, `verification/insurance.tsx` | USE | Coach trust gates. |
| Community | Private groups | `community/index.tsx`, `community/[groupId].tsx` | NARROW | Keep as club/team coordination only, not broad community. |
| Media | Video upload/detail | `videos/upload.tsx`, `videos/[id].tsx` | NARROW | Keep if tied to session proof; avoid standalone video product. |
| Profiles | Public user profile | `profile/[userId].tsx` | NARROW | Keep as identity/proof, avoid social profile sprawl. |
| Invites | General invites | `invites.tsx` | USE | Operational acceptance/review inbox. |
| Manage | Manage redirect | `manage/index.tsx`, `manage/[legacy].tsx` | NARROW | Keep temporarily for compatibility, remove after link audit. |
| Manage | Manage bookings | `manage/bookings.tsx` | USE | Coach/club operations if not duplicated by bookings tab. |
| Manage | Head coach console | `manage/head-coach.tsx` | USE | Club/staff operations. |
| Settings | Settings hub | `settings/index.tsx` | USE | Required account control. |
| Settings | Account | `settings/account.tsx` | USE | Required. |
| Settings | Appearance | `settings/appearance.tsx` | POST-LAUNCH | Nice-to-have; not core. |
| Settings | Calendar sync | `settings/calendar-sync.tsx` | USE | High value for scheduling if functional. |
| Settings | Cancellation policy | `settings/cancellation-policy.tsx` | USE | Coach business rules. |
| Settings | Coaching | `settings/coaching.tsx` | USE | Coach profile/settings. |
| Settings | Blocked dates | `settings/blocked-dates.tsx` | MERGE | Should live with availability, not as standalone clutter. |
| Settings | Blocked users | `settings/blocked-users.tsx` | USE | Safety/trust. |
| Settings | Help | `settings/help.tsx` | USE | Support handoff. |
| Settings | Smart slots | `settings/smart-slots.tsx` | NARROW | Keep only if it maps to real scheduling rules. |
| Settings | Travel radius | `settings/travel-radius.tsx` | USE | Coach marketplace operations. |
| Settings | Notifications | `settings/notifications/index.tsx`, `settings/notifications/preferences.tsx` | USE | Required communication control. |
| Settings | Privacy | `settings/privacy.tsx` | USE | Trust. |
| Settings | Privacy policy and terms | `settings/privacy-policy.tsx`, `settings/terms.tsx` | USE | Required legal/support surface. |
| Squads | Squad invite | `squads/[id]/invite.tsx` | USE | Club/team operations. |
| Analytics | Coach analytics dashboard | `analytics/dashboard.tsx` | POST-LAUNCH | Do not block launch; can be hidden. |
| Analytics | Revenue analytics | `analytics/revenue.tsx` | NARROW | Prefer earnings/invoices unless this is actionable. |
| Analytics | Retention analytics | `analytics/retention.tsx` | DELETE | SaaS-style filler, not launch-critical. |
| Analytics | Athlete analytics | `analytics/[athleteId].tsx`, `analytics/[athleteId]/goals.tsx` | NARROW | Merge into development/progress surfaces. |

## Immediate Delete Candidates

`PRUNE-01` deleted the clearest low-value launch cuts:

1. `family/spending.tsx`
2. `referrals/invite.tsx`
3. `compare/index.tsx` and `compare/[ids].tsx`
4. `drills/challenges.tsx` and `drills/create-challenge.tsx`
5. `development/seed-health.tsx`
6. `results-program.tsx` and `development/results-program.tsx`
7. `analytics/retention.tsx`

Remaining delete candidates for later pruning:

8. `athlete/journal.tsx` if athlete self-reflection is not a launch promise
9. `settings/appearance.tsx` if theme customization is not a launch promise

## Must Protect

Do not casually delete:

- booking flow
- booking detail/cancel/report/feedback
- availability and scheduling
- family calendar, recurring, child medical, emergency, consent, sharing
- roster, concerns, health, consent
- invoices, earnings, payment attempt flow
- verification
- club hub, club schedule, squads, staff/member flows
- discover map and local search
- sessions, group sessions, invites, attendance/session completion
- messages and notifications

## Suggested Review Order

1. Delete the immediate candidates above.
2. Merge duplicate destinations: family overview, blocked dates, club calendar vs schedule, event RSVP/attendees, analytics athlete vs development.
3. Narrow the social/community/discovery surfaces.
4. Re-run route and loading audits.
5. Re-score the reduced app against launch readiness.
