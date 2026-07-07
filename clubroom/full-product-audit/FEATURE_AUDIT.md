# Clubroom Feature Audit

Date: 2026-07-07
Format: feature-by-feature product audit across coach, coach's boss, parent, child/athlete, FA/compliance, and best-standards perspectives.

## Rating Key

- `Core`: essential to the Clubroom paid-development loop.
- `Strong`: valuable, but only if finished against runtime authority.
- `Conditional`: useful when tied to booking, development proof, safety, coordination, or revenue.
- `Gimmick risk`: risks becoming noise unless repositioned or reduced.
- `Gap`: implementation or product truth is not mature enough yet.

## 1. Auth, Onboarding, And Role Access

What it does:

- Handles sign-in, account-type onboarding, coach/parent/athlete setup, route access, blocked tabs, token expiry, and current-user context.

Code paths inspected:

- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `components/auth/*`
- `hooks/use-auth.tsx`
- `hooks/use-onboarding.ts`
- `components/auth/route-access-gate.tsx`
- `services/auth-service.ts`
- `services/api-auth-context.ts`
- `apps/api/src/modules/auth/routes.ts`

Subfeatures:

- account type selection
- coach onboarding
- parent/guardian onboarding
- athlete/child onboarding
- auth profile updates
- route gates and hidden tabs
- token expiry handling
- blocked user settings

Perspectives:

- Coach: good because it separates coach setup from parent/athlete setup; bad if verification and coach profile setup are not clearly connected to getting bookable.
- Coach's boss: useful because role access can hide irrelevant surfaces; needs stronger club-role onboarding so staff know whether they are coach, head coach, admin, owner, or assistant.
- Parent: needs a calm path to add children, consent, medical context, and booking readiness without seeing coach-only admin.
- Child/athlete: should only see age-appropriate progress and schedule surfaces; direct messaging/community needs careful visibility.
- FA/compliance: role gating is essential but must stay default-deny and assignment-based.
- Best standards: route access exists, but the broad route set means access regression tests must stay current.

Verdict: `Core`. Keep, but make role identity and next action clearer.

## 2. Discovery, Search, Map, Public Coach Profiles, Favourites

What it does:

- Lets families find coaches/sessions, filter by location/focus/price/availability, inspect public profiles, favourite coaches, and enter booking.

Code paths inspected:

- `app/book-coach.tsx`
- `app/discover/map.tsx`
- `app/discover-sessions.tsx`
- `app/coach/[id].tsx`
- `app/coach/[coachId]/public.tsx`
- `app/favourites/index.tsx`
- `components/coach/*`
- `components/bookings/discover-*`
- `services/discover-service.ts`
- `services/coach-service.ts`
- `services/coach-offering-api.ts`
- `services/favourite-service.ts`
- `navigation/routes.ts`

Subfeatures:

- coach search
- map-first discovery
- coach cards
- public profile
- public offerings
- session discovery
- filters
- favourites
- reviews/proof
- message/book call to action

Perspectives:

- Coach: strong lead-generation value if availability, pricing, verification, and offerings are accurate.
- Coach's boss: useful for club-owned sessions only if organisation context and assigned delivery coach are visible.
- Parent: high value; this is where trust, price, distance, DBS/verification, availability, and child fit need to be obvious.
- Child/athlete: useful only if it helps find the right development environment, not if it becomes popularity browsing.
- FA/compliance: must not overstate verification or qualifications; public profile claims need evidence boundaries.
- Best standards: strong product fit, but map/search must not depend on stale local offerings in API mode.

Agent-specific risks:

- Parent pass: discovery must not rely on placeholder public profile data or synthetic filter counts; those undermine the core trust question, "Can I trust this adult with my child?"
- Best-standards pass: map/search should remain a booking entrypoint, not a browsing/social surface.

Verdict: `Core`. Favourites are `Conditional`: keep only as a way to rebook or compare trusted coaches.

## 3. Booking Flow

What it does:

- Guides a parent/athlete through selecting session type, schedule, details, review, confirmation, cancellation, and multi-week options.

Code paths inspected:

- `app/book/[coachId]/session-type.tsx`
- `app/book/[coachId]/schedule.tsx`
- `app/book/[coachId]/details.tsx`
- `app/book/[coachId]/review.tsx`
- `app/book/[coachId]/confirmation.tsx`
- `app/book/[coachId]/multi-week.tsx`
- `app/booking/[id]/cancel.tsx`
- `app/(tabs)/bookings/*`
- `components/bookings/*`
- `components/booking/*`
- `services/booking-service.ts`
- `services/booking/index.ts`
- `services/booking/booking-authority-service.ts`
- `services/multi-week-booking-service.ts`
- `services/recurring-booking-service.ts`
- `apps/api/src/modules/booking/routes.ts`

Subfeatures:

- session type selection
- child prefill
- schedule slot selection
- booking detail capture
- review and confirmation
- booking list/detail
- cancel and refund preview
- report problem
- booking notes
- linked invoices
- multi-week booking
- recurring booking

Perspectives:

- Coach: core revenue path; good when it prevents unverified availability and supports cancellation/rebooking.
- Coach's boss: needs organisation ownership and delivery-coach assignment to be explicit for club sessions.
- Parent: essential; value depends on clear price, refund/cancellation terms, child readiness, and confirmation truth.
- Child/athlete: benefits indirectly through predictable schedule and readiness checks.
- FA/compliance: must enforce DBS/verification and child safety gates before booking, not after.
- Best standards: strongest when every state is server-owned; generic booking updates already fail closed for unsupported API-mode fields, which is good.

Agent-specific risks:

- Parent pass: confirmation copy should not say "Booking Confirmed" while also implying the coach still needs to confirm within 24 hours.
- FA pass: child booking DBS/verification gates must exist server-side on `/v1/bookings`, not only in frontend/service logic.
- Parent pass: group/linked-session capacity and payment/refund state must not be placeholder truth.

Verdict: `Core`. Continue finishing API authority and edge-case states.

## 4. Session Invites, RSVP, And Existing-Session Add

What it does:

- Lets coaches invite athletes/parents into one-to-one or group sessions, accept/decline invites, RSVP, and add athletes to existing sessions.

Code paths inspected:

- `app/session-invites/index.tsx`
- `app/session-invites/[id].tsx`
- `app/session-invites/create.tsx`
- `app/session-invites/group.tsx`
- `app/sessions/create.tsx`
- `hooks/use-invite-session-flow.ts`
- `hooks/use-invites.ts`
- `services/invite/index.ts`
- `services/invite/session-invite-authority-service.ts`
- `services/invite/invite-rsvp-service.ts`
- `services/rsvp-service.ts`
- `services/invite/bulk-invite-service.ts`

Subfeatures:

- session invite create
- accept/decline
- recurring partial accept
- RSVP list/respond
- group invite flow
- bulk invite group read
- invite sharing links
- squad invite compatibility

Perspectives:

- Coach: useful for filling sessions without manual admin; friction appears if context fields are missing.
- Coach's boss: useful for club operations if invite ownership, staff permissions, and assigned coaches are enforced.
- Parent: good if accept/decline is simple and does not include confusing counter-offer behavior.
- Child/athlete: should not receive pressure-heavy invites without guardian context where age requires it.
- FA/compliance: invite actions need actor, target, athlete, and session context; placeholder labels are rightly rejected in API mode.
- Best standards: strong decision to remove counter-proposal complexity and fail closed on unresolved placeholders.

Verdict: `Strong`. Keep hardening squad invite role coverage and history/reporting, but squad-to-session invite creation now has backend authority.

## 5. Session Creation, Group Sessions, And Delivery Scheduling

What it does:

- Lets coaches and clubs create sessions, group sessions, one-off/recurring training, session rosters, registration, attendance, off-platform attendees, and cancellation instances.

Code paths inspected:

- `app/sessions/create.tsx`
- `app/group-sessions/index.tsx`
- `app/group-sessions/[id].tsx`
- `app/group-sessions/[id]/roster.tsx`
- `components/session/*`
- `components/group/*`
- `hooks/use-create-session.ts`
- `hooks/use-group-session.ts`
- `hooks/use-group-sessions.ts`
- `hooks/use-group-roster.ts`
- `services/group-session/index.ts`
- `services/group-session/group-session-authority-service.ts`
- `services/group-session-service.ts`

Subfeatures:

- create wizard
- one-to-one and group presets
- club/self acting mode
- assigned coach selection
- registration
- roster
- attendance
- off-platform attendee count
- recurring instance cancellation
- end recurring series

Perspectives:

- Coach: valuable if it reduces admin and prevents overbooking; bad if wizard complexity overwhelms quick session setup.
- Coach's boss: very valuable for staffing and delivery accountability.
- Parent: useful when it produces clear invitations and registration truth.
- Child/athlete: mostly downstream value through accurate rosters and attendance proof.
- FA/compliance: capacity, coach assignment, and attendance proof should be server-owned and auditable.
- Best standards: good direction because group sessions are API-owned and local registration mirrors are blocked in API mode.

Agent-specific risks:

- Coach pass: one creation flow currently carries too many modes; independent coach setup should not feel like club administration.
- Parent pass: registration payloads must not trust caller-supplied parent identity when auth can derive it.

Verdict: `Core`. Keep, but keep the wizard outcome-focused and role-specific.

## 6. Session Completion, Attendance, Feedback, Notes, Media

What it does:

- Lets coaches complete sessions, mark attendance, quick-rate athletes, save notes/feedback, attach media, award recognition, and open follow-up paths.

Code paths inspected:

- `app/session/[id]/complete.tsx`
- `app/session-notes/[bookingId].tsx`
- `app/(tabs)/bookings/session-feedback.tsx`
- `app/development/session/[sessionId].tsx`
- `components/session/*`
- `components/development/dev-session-*`
- `hooks/use-session-completion.ts`
- `hooks/use-quick-rate.ts`
- `hooks/use-session-media.ts`
- `hooks/use-session-note.ts`
- `services/progress/progress-feedback-service.ts`
- `services/media-service.ts`

Subfeatures:

- attendance
- quick rating
- skill ratings
- effort
- session notes
- parent/athlete visibility
- media upload
- no-show/completion edges
- recognition/achievement award
- completion summary

Perspectives:

- Coach: core value if it takes seconds after a session and produces parent-visible proof.
- Coach's boss: useful for standards and overdue-completion queues.
- Parent: high value when it explains what happened and what comes next.
- Child/athlete: high value if feedback is specific, positive, and age-appropriate.
- FA/compliance: attendance, media, and sensitive notes must have consent, visibility, audit, and retention boundaries.
- Best standards: some API-mode gaps remain around fabricated message threads and individual booking no-show/effort completion.

Agent-specific risks:

- Coach pass: detailed per-athlete API-mode feedback and completion-triggered message threads are still runtime gaps.
- FA pass: completion should eventually produce one authoritative session evidence bundle, not separate partial writes whose failures are only locally coordinated.

Verdict: `Core`. This is where Clubroom proves it is not a booking-only tool.

## 7. Progress, Goals, Skills, Analytics, Reports, Practice

What it does:

- Tracks athlete development through goals, milestones, skills, feedback history, reports, self-assessment, practice logs, practice tasks, challenge progress, player-card style summaries, and analytics.

Code paths inspected:

- `app/development/my-progress.tsx`
- `app/development/progress-loop.tsx`
- `app/development/session-history.tsx`
- `app/development/media-gallery.tsx`
- `app/development/child-progress/[childId].tsx`
- `components/progress/*`
- `components/analytics/*`
- `components/athlete/athlete-progress*`
- `hooks/use-my-progress.ts`
- `hooks/use-child-progress.ts`
- `hooks/use-progress-loop.ts`
- `hooks/use-athlete-development.ts`
- `services/progress/index.ts`
- `services/progress/progress-goals-service.ts`
- `services/progress/progress-skills-service.ts`
- `services/progress/progress-practice-task-service.ts`
- `services/progress/progress-practice-log-service.ts`
- `services/analytics/index.ts`

Subfeatures:

- goals
- milestones
- skill history
- radar/pentagon charts
- feedback timeline
- termly reports
- parent value summary
- media gallery
- self-assessment
- practice logs
- practice tasks and follow-up queues
- challenge counts
- player card and level-up ceremony

Perspectives:

- Coach: differentiates paid coaching from casual sessions; needs fast data entry and meaningful summaries.
- Coach's boss: helps monitor coach quality and athlete watchlists.
- Parent: core proof that money is producing development, not just attendance.
- Child/athlete: strong motivation if feedback is specific and not just points.
- FA/compliance: must avoid exposing coach-private feedback or sensitive notes outside assigned visibility.
- Best standards: high value, but private journal/challenge-derived counts need backend authority before they can be trusted.

Agent-specific risks:

- Athlete pass: progress can feel like a scoreboard when levels, streaks, rarity, and overall ratings lead over feedback.
- Athlete pass: child/teen language needs more dignity than labels like "Kid" in older-athlete contexts.
- Best-standards pass: every progress artifact should be traceable to session, coach, date, and evidence.

Verdict: `Core`. Keep player-card style motivation only where it is grounded in coach/session evidence.

## 8. Badges, Achievements, Recognition

What it does:

- Lets coaches award recognition to athletes, grouped by FA Four Corners categories and event/milestone families; shows awards in progress surfaces; supports share/feed/seen state and notifications.

Code paths inspected:

- `constants/badge-registry.ts`
- `services/badge-service.ts`
- `services/badge-definitions.ts`
- `hooks/use-badge-award.ts`
- `hooks/use-dev-badges.ts`
- `components/badges/*`
- `components/session/badges-step.tsx`
- `components/development/child-progress-badge-list.tsx`
- `components/user/home-screen-sections.tsx`
- `app/development/my-progress.tsx`
- `apps/api/src/modules/wave2plus/routes.ts`
- `__tests__/badges/*`
- `__tests__/services/badge-service-api-mode.test.ts`

Subfeatures:

- coach-awarded skill recognition
- FA Four Corners categories
- attendance milestone awards
- event achievements
- cooldown and override metadata
- parent seen state
- share to feed
- notification actions
- progress points and levels
- coach dev badge queue

Perspectives:

- Coach: useful as quick positive reinforcement; bad if it feels like admin after every session.
- Coach's boss: useful as standards evidence only if award frequency, category, and coach attribution can be reviewed.
- Parent: useful when it explains why the child improved; gimmicky if it only says "badge unlocked".
- Child/athlete: motivating if specific, fair, and not over-awarded.
- FA/compliance: must not imply official FA accreditation; audit and visibility boundaries matter.
- Best standards: real feature, not throwaway UI. Naming is the main product problem.

Agent-specific risks:

- Coach pass: "award badge" sounds less professional than "recognise".
- Parent pass: points and levels are weak unless the parent sees criteria and coach rationale.
- Athlete pass: rarity/scoreboard mechanics can become artificial.
- FA pass: "Achievement" can overclaim unless criteria, assessor, evidence, appeal/correction path, and consent are clear.
- Leadership pass: standards need evidence, not just badge counts.
- Best-standards pass: keep `BadgeAward` internally until a planned rename; do not let naming churn precede runtime truth.

Verdict: `Strong`, with `Gimmick risk` if not renamed/repositioned. Use `Achievements` for visible athlete/parent outcomes, `Recognition` for the coach action, and `Standards evidence` for leadership review.

## 9. Family Hub, Children, Guardian Sharing, Calendar, Recurring

What it does:

- Gives parents a family dashboard, child management, family calendar, recurring plans, guardian sharing, and child progress entry points.

Code paths inspected:

- `app/family/index.tsx`
- `app/family/calendar.tsx`
- `app/family/recurring.tsx`
- `app/family/sharing.tsx`
- `app/(tabs)/children.tsx`
- `app/(modal)/add-child.tsx`
- `app/(modal)/edit-child-profile.tsx`
- `hooks/use-child-context.tsx`
- `hooks/use-children-hub.ts`
- `hooks/use-family-calendar.ts`
- `hooks/use-family-recurring.ts`
- `hooks/use-family-sharing.ts`
- `services/family/index.ts`
- `services/child-service.ts`

Subfeatures:

- add/edit child
- child switcher
- child progress summary
- family calendar
- guardian invite/share
- recurring booking plans
- family spending/calendar/progress aggregation

Perspectives:

- Coach: indirectly useful because better family data reduces back-and-forth.
- Coach's boss: useful for club-family accountability, but only through governed membership/assignment.
- Parent: core. This is the parent operating surface.
- Child/athlete: depends on parent/guardian correctness and respectful representation.
- FA/compliance: guardian relationships, child identity, and medical access are trust-sensitive.
- Best standards: strong service direction through `services/family/index.ts`; avoid local storage authority outside mock mode.

Agent-specific risks:

- Parent pass: parents need clearer confirmation of who can see support, SEN, medical, and emergency details.
- Athlete pass: direct athlete accounts and parent-represented children need cleaner separation.

Verdict: `Core`. Needs constant privacy and guardian-access scrutiny.

## 10. Health, Medical, Emergency, SEN, Consent, Injuries

What it does:

- Stores and displays athlete medical information, emergency contacts, consent, SEN/support needs, injury logs, and coach-facing health views.

Code paths inspected:

- `app/health/index.tsx`
- `app/health/log.tsx`
- `app/health/injuries.tsx`
- `app/health/[id].tsx`
- `app/child/[id]/medical.tsx`
- `app/child/[id]/emergency.tsx`
- `app/roster/[athleteId]/health.tsx`
- `app/roster/[athleteId]/emergency.tsx`
- `app/roster/consents.tsx`
- `components/health/*`
- `components/child/*`
- `components/consent/*`
- `hooks/use-health-hub.ts`
- `hooks/use-injuries.ts`
- `hooks/use-medical-info.ts`
- `hooks/use-emergency-contacts.ts`
- `hooks/use-consents.ts`
- `services/family/family-health-service.ts`
- `services/safety-service.ts`
- `services/injury-service.ts`
- `services/consent-service.ts`

Subfeatures:

- medical conditions
- allergies
- medications
- emergency contacts
- SEN profile
- consent records
- injury log
- coach health view
- roster consent aggregation

Perspectives:

- Coach: essential before delivery, but should show only what is needed to safely coach.
- Coach's boss: needs confidence that staff cannot overreach into sensitive records.
- Parent: high trust value if clear, editable, and historically preserved.
- Child/athlete: must not feel exposed; visibility must match safety need.
- FA/compliance: one of the most sensitive domains. Needs default deny, assignment visibility, audit, and history.
- Best standards: backend direction is correct; coach roster consent aggregation still has API-mode gaps called out in docs.

Agent-specific risks:

- Parent pass: save failures must be visible, not only logged.
- FA pass: consent snapshots are needed at booking, media capture, and feed/share time.
- Athlete pass: child-progress surfaces must not expose medical/SEN/emergency detail to a child or teen account by accident.

Verdict: `Core`. Never treat as a gimmick or mock-first feature.

## 11. Coach Roster And Athlete Management

What it does:

- Gives coaches a roster of athletes, detail views, notes, health/emergency links, concern raising, and add-to-session actions.

Code paths inspected:

- `app/(tabs)/athletes.tsx`
- `app/roster/index.tsx`
- `app/roster/[athleteId]/index.tsx`
- `app/roster/[athleteId]/add-to-session.tsx`
- `app/roster/[athleteId]/raise-concern.tsx`
- `components/athlete/*`
- `components/roster/*`
- `hooks/use-athletes-screen.ts`
- `hooks/use-athlete-detail.ts`
- `services/roster-service.ts`

Subfeatures:

- roster list
- athlete profile
- private notes
- tags/status/focus
- remove/restore roster entry
- add athlete to session
- raise concern
- health/emergency access

Perspectives:

- Coach: core daily workspace.
- Coach's boss: useful only if private notes and roster visibility are bounded correctly.
- Parent: valuable if it improves continuity, risky if private notes become opaque or misused.
- Child/athlete: high impact; needs respectful tone and correction paths.
- FA/compliance: roster access must come from booking/assignment, not club membership alone.
- Best standards: strong API-mode roster authority and fail-closed reads are good.

Agent-specific risk:

- Coach pass: sensitive actions such as block family, remove athlete, and delete notes must remain clearly permissioned, reversible where appropriate, and separated from routine coach workflow.

Verdict: `Core`. Keep privacy boundaries strict.

## 12. Coach Profile, Availability, Scheduling, Templates, Travel

What it does:

- Lets coaches manage profile, offerings/templates, availability, blocked dates, scheduling rules, cancellation policy, travel radius, venue presets, and payment instructions.

Code paths inspected:

- `app/(tabs)/coach-profile.tsx`
- `app/(tabs)/availability.tsx`
- `app/availability/*`
- `app/settings/coaching.tsx`
- `app/settings/cancellation-policy.tsx`
- `app/settings/travel-radius.tsx`
- `components/coach/*`
- `hooks/use-coach-profile.ts`
- `hooks/use-availability-calendar.ts`
- `hooks/use-add-template.ts`
- `hooks/use-edit-template.ts`
- `hooks/use-coaching-settings.ts`
- `services/coach-profile-service.ts`
- `services/availability-service.ts`
- `services/session-template-service.ts`
- `services/scheduling-rules-service.ts`
- `services/coach-travel-service.ts`
- `services/coach-venue-service.ts`

Subfeatures:

- coach profile editing
- public profile metadata
- availability templates
- overrides/blocked dates
- session templates/offerings
- scheduling rules
- cancellation policy
- travel radius
- venue presets
- payment instructions

Perspectives:

- Coach: core setup surface; value depends on reducing booking friction.
- Coach's boss: needs delegated/non-self availability management for club staffing.
- Parent: sees the output as trust, availability, and clarity.
- Child/athlete: benefits through reliable sessions.
- FA/compliance: public claims and verification indicators must be evidence-backed.
- Best standards: good API ownership; venue presets correctly remain local convenience, not schedule authority.

Agent-specific risk:

- Coach pass: schedule should reliably join bookings, group sessions, events, and cancellations from backend authority; if availability is complete but session truth is empty, the coach "schedule" feels hollow.

Verdict: `Core`. Keep the setup path outcome-led: "be bookable" rather than "fill profile forms."

## 13. Verification And Trust Profile

What it does:

- Tracks email, phone, photo ID, background check/DBS, coaching credentials, and insurance. Uses verification status for trust and booking gates.

Code paths inspected:

- `app/verification/index.tsx`
- `app/verification/id.tsx`
- `app/verification/background.tsx`
- `app/verification/credentials.tsx`
- `app/verification/insurance.tsx`
- `components/verification/*`
- `hooks/use-verification-hub.ts`
- `hooks/use-id-verification.ts`
- `hooks/use-background-check.ts`
- `hooks/use-credentials.ts`
- `hooks/use-insurance-verification.ts`
- `services/verification-service.ts`

Subfeatures:

- verification overview
- identity document upload
- DBS/background evidence
- credentials
- insurance
- public trust indicator
- booking safety gate

Perspectives:

- Coach: improves search trust and booking conversion.
- Coach's boss: helps staff quality assurance.
- Parent: essential buying signal.
- Child/athlete: safety depends on it, even if not directly visible.
- FA/compliance: core. Never approve client-side; reviewer/admin approval routes still need dedicated backend authority.
- Best standards: strong that submissions create pending evidence and do not approve locally.

Agent-specific risks:

- FA pass: reviewer workflow, expiry jobs, rejection/appeal state, and server-side use of verification in booking/assignment gates are not optional for launch trust.
- Parent pass: public verification claims must be concrete and not degrade into placeholder trust data.

Verdict: `Core`. Finish approval/review contracts before real launch claims.

## 14. Clubs, Academy Compatibility, Squads, Members, Branding, Join Codes

What it does:

- Handles club creation/joining, club hub/detail, squads, members, roles, invite codes, branding, settings, and academy compatibility aliases.

Code paths inspected:

- `app/(tabs)/club-hub.tsx`
- `app/club/my-clubs.tsx`
- `app/club/create.tsx`
- `app/club/[id].tsx`
- `app/club/settings.tsx`
- `app/club/invite-members.tsx`
- `app/club/squad/[id].tsx`
- `app/club/squad/create.tsx`
- `app/(modal)/create-squad.tsx`
- `components/club/*`
- `components/squad/*`
- `hooks/use-club-hub.ts`
- `hooks/use-club-detail.ts`
- `hooks/use-club-settings.ts`
- `hooks/use-squad-detail.ts`
- `services/club-authority-service.ts`
- `services/club-service.ts`
- `services/squad-service.ts`
- `services/academy-service.ts`
- `contracts/club-governance.ts`

Subfeatures:

- club create
- join by code/link
- pending staff invite review
- club hub/feed
- club settings
- members and roles
- member removal/ban/undo
- squad create/update/archive
- squad members
- branding
- invite codes
- academy compatibility

Perspectives:

- Coach: useful for organisation-backed delivery and discoverability.
- Coach's boss: core workspace for operating a football organisation.
- Parent: valuable if it clarifies who owns sessions and standards.
- Child/athlete: useful through squads and team identity.
- FA/compliance: club membership must not grant sensitive data access by itself.
- Best standards: strong governance direction; compatibility aliases should not become a second product model.

Verdict: `Core` for club/squad operations. Academy compatibility is `Conditional` and should stay an alias unless product truth changes.

## 15. Leadership, Staffing, Owner Dashboard, Head-Coach Oversight, Standards

What it does:

- Gives owners/admin/head coaches operational command: unassigned sessions, staff health, awaiting-completion queues, watchlists, standards, tasks, support issues, finance summaries, and assignment controls.

Code paths inspected:

- `app/club/[clubId]/dashboard.tsx`
- `app/manage/bookings.tsx`
- `app/manage/head-coach.tsx`
- `hooks/use-club-dashboard.ts`
- `hooks/use-manage-bookings.ts`
- `hooks/use-head-coach-oversight.ts`
- `services/org-owner-dashboard-service.ts`
- `services/org-staffing-service.ts`
- `services/org-head-coach-service.ts`
- `apps/api/src/modules/coach-club/owner-dashboard.ts`
- `apps/api/src/modules/coach-club/staffing-console.ts`
- `apps/api/src/modules/coach-club/head-coach-oversight.ts`

Subfeatures:

- owner dashboard
- live operations priority action
- staffing console
- work assignment/reassignment
- coach health
- completion queue
- athlete watchlist
- head coach tasks
- standards create/toggle
- support issue surfacing
- finance summary

Perspectives:

- Coach: may feel like oversight pressure; good if expectations are clear.
- Coach's boss: one of the strongest differentiators in the app.
- Parent: indirectly valuable because it improves consistency and support resolution.
- Child/athlete: indirectly valuable because it catches lack of follow-up.
- FA/compliance: excellent direction if standards/tasks are auditable and permissioned.
- Best standards: high signal because mock owner dashboard composition is disabled in API mode.

Agent-specific risks:

- Leadership pass: staffing copy and backend policy must agree on whether head coaches can assign or reassign work.
- Leadership pass: standards need evidence links, version history, pass/fail criteria, and reviewer/action trails.

Verdict: `Core` for clubs. This is not a gimmick; it is the app's operations layer.

## 16. Club Schedule, Events, Matches, Attendance, Results

What it does:

- Projects club activity across group sessions, events, and matches; supports event CRUD/RSVP/attendance, match fixtures, player availability, lineup, status, and results.

Code paths inspected:

- `app/club/[id]/schedule.tsx`
- `app/club/[id]/activity/[activityId].tsx`
- `app/events/index.tsx`
- `app/events/create.tsx`
- `app/events/[id].tsx`
- `app/events/[id]/rsvp.tsx`
- `app/events/[id]/attendees.tsx`
- `app/matches/index.tsx`
- `app/matches/create.tsx`
- `app/matches/[id].tsx`
- `components/club/ClubScheduleScreen.tsx`
- `components/match/*`
- `hooks/use-club-schedule.ts`
- `hooks/use-create-event.ts`
- `hooks/use-event-detail.ts`
- `hooks/use-event-rsvp.ts`
- `hooks/use-event-attendees.ts`
- `hooks/use-create-match.ts`
- `hooks/use-match-detail.ts`
- `services/club-schedule-service.ts`
- `services/event/index.ts`
- `services/match-service.ts`

Subfeatures:

- unified club activity projection
- event create/update/publish/cancel
- event invite fan-out
- event RSVP
- event attendance/check-in
- match create/detail
- player invites/availability
- lineup
- match result
- squad schedule

Perspectives:

- Coach: useful for managing team context beyond private bookings.
- Coach's boss: core club operations if schedule is the single source of activity truth.
- Parent: useful for clarity and RSVP.
- Child/athlete: good for team belonging and match readiness.
- FA/compliance: event/match attendance and player invites need eligibility, assignment, and audit.
- Best standards: strong that club schedule projects existing records instead of inventing another view model.

Verdict: `Strong`. Keep because clubs need it; avoid letting matches turn the product into a general football social app.

## 17. Community, Feed, Posts, Comments, Groups, Messages

What it does:

- Supports feed posts, club/squad/community groups, post details, comments, likes, direct/group messages, message threads, group membership, invites, joins, and read state.

Code paths inspected:

- `app/(tabs)/feed.tsx`
- `app/(modal)/create-club-post.tsx`
- `app/(modal)/post-detail.tsx`
- `app/community/[groupId].tsx`
- `app/(tabs)/messages.tsx`
- `app/chat/[threadId].tsx`
- `components/social/*`
- `components/community/*`
- `components/messaging/*`
- `hooks/use-club-hub.ts`
- `hooks/use-messages.ts`
- `services/community/index.ts`
- `services/community-media-authority-service.ts`
- `services/community/community-group-service.ts`
- `services/community/community-messaging-service.ts`
- `services/social-feed-service.ts`
- `services/comment-service.ts`
- `services/messaging-service.ts`

Subfeatures:

- feed
- achievement posts
- event/session announcements
- comments
- reactions
- post detail
- community groups
- squad groups
- group members/roles
- join requests/invites
- direct messages
- group messages
- read receipts
- deletion/soft remove

Perspectives:

- Coach: useful for communication and retention; bad if it becomes a second social workload.
- Coach's boss: useful for club comms if moderation and role controls exist.
- Parent: useful for coordination, risky if noisy or unsafe.
- Child/athlete: can motivate belonging, but safeguarding and age boundaries are critical.
- FA/compliance: messaging/community must enforce membership, thread participation, deletion audit, and safeguarding reporting.
- Best standards: `Conditional`. Feed/groups must serve sessions, clubs, progress, or support. Generic social growth is out of mission.

Agent-specific risks:

- Parent and athlete passes: chat/community need stronger report-this-message paths.
- Athlete pass: direct athlete accounts must not be treated as `parent` senders.
- Best-standards pass: feed should behave like a governed activity log, not a social network.
- FA pass: minor visibility, moderation, message retention/deletion, and media-consent-at-posting need stronger evidence.

Verdict: `Conditional`. Keep tightly scoped to coordination, achievements, session/activity updates, and support.

## 18. Notifications, Preferences, Seen State

What it does:

- Shows notification lists, filters, read/dismiss/clear, preferences, quiet hours, muted coach/type state, badge/achievement actions, and tab unread counts.

Code paths inspected:

- `app/(tabs)/notifications.tsx`
- `app/settings/notifications/index.tsx`
- `app/settings/notifications/preferences.tsx`
- `components/notification/*`
- `components/ui/notification-bell.tsx`
- `hooks/use-notifications.ts`
- `hooks/use-notification-prefs.ts`
- `services/notification/index.ts`
- `services/notification-service.ts`
- `services/seen-service.ts`

Subfeatures:

- notification inbox
- unread counts
- mark read/handled
- dismiss/clear
- type filters
- mute type
- quiet hours
- badge/achievement action
- message badge auth gate
- local walkthrough seen state

Perspectives:

- Coach: useful if it surfaces booking/invite/payment/session actions, not noise.
- Coach's boss: needs escalation and staffing alerts.
- Parent: needs booking, child, payment, achievement, and safety updates.
- Child/athlete: should avoid overload and inappropriate adult actions.
- FA/compliance: notification actions must not become hidden authority for sensitive state.
- Best standards: good that backend notification reads/mutations exist; keep local seen state limited to UI dismissal.

Verdict: `Strong`, but reduce noise.

## 19. Money, Invoices, Earnings, Payment Instructions, Payouts

What it does:

- Manages invoices, invoice detail, hosted payment session start, manual receipts, reminders, coach earnings/reconciler, paid/owed/written-off sessions, payment instructions, payout methods, and withdrawals.

Code paths inspected:

- `app/invoices/index.tsx`
- `app/invoices/[id].tsx`
- `app/earnings.tsx`
- `app/(tabs)/earnings.tsx`
- `components/invoices/*`
- `components/earnings/*`
- `hooks/use-invoice-detail.ts`
- `hooks/use-session-payments.ts`
- `services/invoice-service.ts`
- `services/earnings/index.ts`
- `services/earnings/earnings-calculator-service.ts`
- `services/earnings/earnings-report-service.ts`
- `services/earnings/payout-service.ts`
- `services/coach-payment-instructions-service.ts`

Subfeatures:

- invoice list/detail
- invoice summary
- generate invoice
- payment session
- mark paid/manual receipt
- reminders
- earnings owed/paid/written off
- org vs independent revenue
- payment instructions
- payout method
- withdrawal

Perspectives:

- Coach: core business value; payment reminders and reconciliation reduce admin.
- Coach's boss: needs org/independent split and club-owned finance truth.
- Parent: needs clear receipts, payment state, and no fake "paid" success.
- Child/athlete: indirect value.
- FA/compliance: money transitions need backend authority, provider boundaries, and audit.
- Best standards: strong direction that client callbacks do not mark paid; provider-backed payouts remain simulated.

Agent-specific risks:

- Parent pass: simulated payment modal/state is a liability if a parent can interpret it as real money movement.
- FA pass: refund, payout, dispute, chargeback, KYC/KYB, and settlement evidence need provider-backed implementation before production finance claims.

Verdict: `Core`, with launch risk until real provider settlement/payout boundaries are ready.

## 20. Safety, Safeguarding, Reports, Blocks, Privacy, Data Rights

What it does:

- Supports report-problem paths, safeguarding incidents, concerns, support issues, blocked users, privacy settings, retention/data deletion reads, and trust operations.

Code paths inspected:

- `app/(tabs)/bookings/report-problem.tsx`
- `app/roster/[athleteId]/raise-concern.tsx`
- `app/settings/privacy.tsx`
- `app/settings/blocked-users.tsx`
- `components/bookings/booking-trust-card.tsx`
- `hooks/use-blocked-users-settings.ts`
- `hooks/use-block-user-action.ts`
- `services/trust/index.ts`
- `services/trust/safeguarding-service.ts`
- `services/concern-service.ts`
- `services/report-service.ts`
- `services/block-service.ts`
- `services/privacy-settings-service.ts`
- `apps/api/src/modules/trust-ops/routes.ts`

Subfeatures:

- booking problem report
- roster concern
- safeguarding incident create/read/action
- support issue notification
- block user
- privacy settings
- retention runs
- data deletion request reads

Perspectives:

- Coach: must be available but not encourage defensive admin.
- Coach's boss: needs visibility into unresolved support/safeguarding work without overexposing sensitive detail.
- Parent: critical trust feature.
- Child/athlete: critical safety feature.
- FA/compliance: core. Requires audit trail, role boundaries, escalation, and retention.
- Best standards: strong direction; concern list/status update still has API-mode contract gaps.

Agent-specific risks:

- FA pass: safeguarding incident actions need narrower welfare/admin permissions for escalation, closure, external authority contact, and case-state changes.
- Athlete pass: child-visible "I need help" entry points are not strong enough yet.
- Parent pass: privacy settings need clearer child-data implications, not only broad account toggles.

Verdict: `Core`. This is a trust product, not an optional support feature.

## 21. Settings, Account, Calendar Sync, Help, Legal

What it does:

- Handles account profile, settings hub, notification preferences, calendar sync, coaching settings, cancellation policy, travel radius, privacy, blocked users, help, terms, and privacy policy.

Code paths inspected:

- `app/settings/index.tsx`
- `app/settings/account.tsx`
- `app/settings/calendar-sync.tsx`
- `app/settings/coaching.tsx`
- `app/settings/cancellation-policy.tsx`
- `app/settings/travel-radius.tsx`
- `app/settings/privacy.tsx`
- `app/settings/help.tsx`
- `app/settings/terms.tsx`
- `app/settings/privacy-policy.tsx`
- `hooks/use-settings-hub.ts`
- `hooks/use-account-settings.ts`
- `hooks/use-calendar-sync.ts`
- `services/calendar-service.ts`
- `services/privacy-settings-service.ts`

Subfeatures:

- account details
- notification settings
- calendar sync
- coach settings
- cancellation policy
- travel radius
- privacy settings
- blocked users
- help/support
- legal pages

Perspectives:

- Coach: useful when it supports bookability and reduces admin.
- Coach's boss: mostly indirect.
- Parent: needs account, privacy, notification, and help clarity.
- Child/athlete: should only see age-appropriate account/privacy controls.
- FA/compliance: privacy/legal surfaces must match real data handling.
- Best standards: necessary, but keep settings from becoming a dumping ground.

Verdict: `Strong` as infrastructure, not a product differentiator.

## 22. Video, Uploads, Media Gallery, Annotations

What it does:

- Manages videos, upload sessions, malware-scan gating, video detail, share/delete, annotations, session media, and athlete media history.

Code paths inspected:

- `app/videos/[id].tsx`
- `app/videos/upload.tsx`
- `app/development/media-gallery.tsx`
- `components/video/*`
- `components/development/dev-session-media.tsx`
- `hooks/use-video-detail.ts`
- `hooks/use-video-upload.ts`
- `hooks/use-media-gallery.ts`
- `hooks/use-session-media.ts`
- `services/video-service.ts`
- `services/media-service.ts`

Subfeatures:

- upload init/complete
- video create/list/detail
- signed playback URL
- share/delete
- annotations
- session completion media
- athlete media gallery
- malware-scan gating
- consent/health checks

Perspectives:

- Coach: high value for proof and analysis, but time-consuming if upload flow is heavy.
- Coach's boss: useful evidence and quality review.
- Parent: high perceived value if consent and access are clear.
- Child/athlete: valuable learning artifact; can also be sensitive.
- FA/compliance: media consent and signed URLs are mandatory, not nice-to-have.
- Best standards: strong architecture because unscanned/unsafe media stays unavailable.

Agent-specific risks:

- Athlete and FA passes: media consent needs type-specific and share-time checks, not only broad "photo or video consent exists" logic.
- FA pass: consent withdrawal needs takedown and propagation evidence.

Verdict: `Strong`. Keep when linked to feedback/proof, not as generic media sharing.

## 23. Reviews, Ratings, Testimonials

What it does:

- Lets families review bookings/coaches and uses public proof in coach discovery/profile surfaces.

Code paths inspected:

- `app/review/[bookingId].tsx`
- `components/coach/coach-detail-reviews.tsx`
- `components/coach/coach-review-proof-summary.tsx`
- `services/review-sync-service.ts`
- `services/coach-service.ts`
- `services/discover-service.ts`

Subfeatures:

- booking review
- coach rating
- review quote display
- public profile proof
- discovery sorting/filtering proof

Perspectives:

- Coach: valuable if fair and tied to completed bookings.
- Coach's boss: useful quality signal, but should not replace standards/observed delivery.
- Parent: strong trust signal.
- Child/athlete: indirect.
- FA/compliance: must avoid fake/replayed reviews and handle safeguarding concerns separately.
- Best standards: good if backend-owned and linked to real booking completion.

Verdict: `Strong`. Keep as trust proof, not social vanity.

## 24. Trials, Offers, Payment Instructions, Commercial Settings

What it does:

- Supports trial sessions/offerings, club commercial settings, coach payment instructions, and business-context splits.

Code paths inspected:

- `components/coach/trial-*`
- `services/trial-service.ts`
- `services/coach-payment-instructions-service.ts`
- `components/club/settings-commercial-section.tsx`
- `hooks/use-club-settings.ts`
- `hooks/use-session-payments.ts`

Subfeatures:

- trial offering setup
- trial discovery preview
- commercial mode
- coach payment instructions
- org/independent filter

Perspectives:

- Coach: useful for conversion if not overcomplicated.
- Coach's boss: useful for commercial control.
- Parent: useful if pricing and trial terms are clear.
- Child/athlete: indirect.
- FA/compliance: must not blur paid/free eligibility or refund rules.
- Best standards: conditional; connect to booking/revenue or keep minimal.

Verdict: `Conditional`. Good if it helps first booking and clean revenue attribution.

## 25. Observability, Offline, Runtime Modes, Verification Scripts

What it does:

- Provides API-client runtime boundaries, mock/API compatibility, Sentry wiring, offline queue helpers, slice verification scripts, UI/action audits, API boundary audits, and release readiness checks.

Code paths inspected:

- `services/api-client.ts`
- `services/pre-api-live-mode-service.ts`
- `services/observability/sentry-service.ts`
- `services/offline-queue.ts`
- `hooks/useConnectionStatus.ts`
- `hooks/useOfflineQueue.ts`
- `package.json`
- `scripts/*audit*`
- `scripts/verify-slice.js`
- `apps/api/src/app.ts`
- `apps/api/src/plugins/auth-context.ts`

Subfeatures:

- mock/API mode split
- API boundary enforcement
- Sentry
- offline queue
- route/access audits
- UI action audits
- slice verification
- staging smoke
- release preflight

Perspectives:

- Coach: invisible unless it prevents data loss and broken sessions.
- Coach's boss: invisible but essential for reliability.
- Parent: invisible but essential for trust.
- Child/athlete: invisible but essential for privacy and progress integrity.
- FA/compliance: auditability and runtime authority are necessary.
- Best standards: this is the guardrail layer. It should stay sharp and automated.

Agent-specific recommendations:

- Best-standards pass: add a runtime-truth scorecard per core loop: fully API-backed, partially backed, or mock/demo-assisted.
- Best-standards pass: add one golden release gate for the paid-development loop: discover coach, book, invoice/pay, complete session, publish evidence, and parent sees summary.
- FA pass: add production-mode attestation and route-level deny audit reporting for sensitive paths.

Verdict: `Core` infrastructure.

## Cross-Feature Product Judgments

Enough, not gimmick:

- booking and registration
- completion and feedback
- family health/consent
- roster and child progress
- club staffing/owner/head-coach oversight
- invoices and reconciliation
- verification/safeguarding/privacy

Enough only if tightened:

- achievements/recognition
- video/media
- events/matches
- community/messaging/feed
- notifications
- reviews
- trials/commercial settings

Likely gimmick if not tied to the loop:

- badges as collectible decoration
- generic social feed
- follows/favourites without rebooking value
- level/player-card effects without evidence
- community groups without session, squad, club, or support purpose

## Priority Recommendations

1. Rename the product language:
   - "Award recognition" for the coach action.
   - "Achievements" for athlete/parent progress and feed language.
   - "Credentials" for coach qualifications.

2. Keep the paid-development loop as the product spine:
   - Every retained feature should support booking, delivery, development proof, trust, coordination, compliance, or revenue.

3. Launch-quality work should focus on:
   - API-mode gaps in sensitive domains.
   - role-specific action visibility.
   - no fake success in money, booking, or safety.
   - audit proof for sensitive reads and state changes.
   - report/problem escalation flows.
   - parent clarity around what changed for their child.

4. Product pruning should target:
   - generic social behaviors.
   - duplicate routes/actions.
   - demo-only or mock-only surfaces shown in live mode.
   - any achievement language that sounds official without proof.
