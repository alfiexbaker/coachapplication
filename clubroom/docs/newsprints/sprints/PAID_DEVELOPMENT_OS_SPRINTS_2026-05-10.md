# Paid Development OS Deployment Sprints

Date: 2026-05-10
Purpose: turn Clubroom from a broad football/social product into the operating system for paid football development, then drive it to deployment readiness.

## Product Thesis

Clubroom should make it easier to sell, book, deliver, prove, pay for, and repeat football development.

If a route, button, card, service, or entity does not help one of those jobs, it is not a launch feature. It is deleted, fenced, or demoted.

The centre of gravity is not football content. It is a paid development loop:

1. Find a trusted coach or club activity.
2. Choose a real paid product: `1-to-1`, `Group Session`, `Holiday Camp`, or a paid block of those sessions.
3. Confirm child readiness and permissions.
4. Book or register with backend truth.
5. Pay or understand payment state.
6. Attend safely.
7. Receive proof of development.
8. Review, rebook, follow the coach, or continue in a block.
9. Give owners/admins audit evidence that the operation was safe and legitimate.

## Persona Contract

| Persona                                   | They care if Clubroom does this                                                                                                                             | Product must not do this                                                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| School owner / head coach / administrator | Sell `1-to-1`, `Group Session`, and `Holiday Camp` products; assign coaches; control staff permissions; track attendance; reconcile money; export evidence. | Force them into local-only staff assignment, duplicate schedules, or unverifiable payment/attendance records.           |
| Coach                                     | See assigned work, player context, safety essentials, delivery tasks, completion flow, feedback/proof, next work, and money owed/earned.                    | Make them maintain separate booking, group, note, feedback, video, and rebook worlds.                                   |
| Parent / payer / booker                   | Trust the coach, understand offer/price/availability, book safely, pay clearly, see child progress, and know what to do next.                               | Show fake availability, fake paid state, vague reviews, hidden safety requirements, or success before backend creation. |
| Child / athlete                           | Get safer sessions, clearer feedback, proof of improvement, homework/next work, and a route to keep progressing.                                            | Turn them into content inventory or gamification without session-linked value.                                          |
| FA / government / compliance              | Need exportable evidence: staff eligibility, consent, emergency readiness, attendance, safeguarding actions, sensitive reads, and finance audit.            | Become a fake regulator portal. Build evidence/export, not broad compliance theatre.                                    |

## Clarified Product Decisions

- Visible UK launch products are `1-to-1`, `Group Session`, and `Holiday Camp`.
- `Block` is a packaging and scheduling layer, not a fourth product. A block can contain multiple `1-to-1` or `Group Session` occurrences with shared payment, attendance, and proof.
- Feed is core if it is staff-led operational communication. Parents can comment/reply when comments are enabled, but parents cannot create top-level posts.
- Coach pages are core. They are both public storefronts and private relationship pages for followers/customers.
- Coach posts can exist on the coach page. They do not become global feed posts unless the user follows the coach, has booked the coach, or belongs to a linked club/squad/session audience.
- Club posts must explicitly be posted as the club. If a coach belongs to a club, composer UI must force `Post as Coach` versus `Post as Club` when both are possible.
- `Follow` is the launch word. It means saved coach plus coach updates plus fast rebooking context; it must not become vanity follower-count mechanics.
- Base accounts are `User` and `Coach`. Club permissions live inside the club.
- Club staff roles are `Admin` and `Coach`. Remove `Moderator`.
- Session assignment roles are `Lead Coach` and `Support Coach`; support coach is assignment context, not a separate account type.
- Club admin has broad club operational and sensitive access. Coaches have broad operational access for club work, but sensitive child/medical/safeguarding reads must still be scoped by club/session/squad relationship and audited.
- Refunds are high-risk money operations: require registered-number SMS/2FA code, refund reason, permission check, and audit event.
- Map shows nearby bookable openings/providers. Independent coach openings go straight to coach/session booking; club-owned openings route into club land first, then the coach/session inside that club.
- A coach can belong to multiple clubs. First confirmed booking or registration owns the slot.

## Feature Verdicts

| Surface / feature             | Owner/admin | Coach  | Parent | Child    | Compliance   | Verdict              | Launch rule                                                                                                                     |
| ----------------------------- | ----------- | ------ | ------ | -------- | ------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Discover Map                  | Indirect    | Yes    | Yes    | Indirect | Safety proof | `PROTECT`            | Core storefront. Must show trust, offer, price, slot, and bookability truth.                                                    |
| Coach homepage / storefront   | Yes         | Yes    | Yes    | Indirect | Safety proof | `PROTECT`            | Public storefront plus follower/customer updates. Must lead with trust, offers, reviews, and availability.                      |
| Single-session booking        | Yes         | Yes    | Yes    | Yes      | Yes          | `PAID-CORE`          | Backend-created on review step, never on confirmation click.                                                                    |
| Group Session / Holiday Camp  | Yes         | Yes    | Yes    | Yes      | Yes          | `PAID-CORE`          | Same paid product family as one-to-one sessions, not a separate world.                                                          |
| Blocks                        | Yes         | Yes    | Yes    | Yes      | Yes          | `PACKAGING`          | Multi-session package over `1-to-1` or `Group Session`, not a separate launch product type.                                     |
| Club/team schedule            | Yes         | Yes    | Yes    | Yes      | Yes          | `OPS-CORE`           | Chronological commitment surface for training, holiday camps, events, and hidden/selected matches.                              |
| Events                        | Yes         | Maybe  | Maybe  | Maybe    | Maybe        | `DEMOTE`             | Keep only as operational schedule workspaces. No standalone event product.                                                      |
| Matches / results             | Low         | Low    | Low    | Low      | No           | `DEMOTE/DELETE`      | Keep only inside club/team schedule if required. No primary results destination.                                                |
| Staff-led feed / updates      | Yes         | Yes    | Yes    | Indirect | Audit maybe  | `COMMUNICATION-CORE` | Staff posts only; parent comments/replies only when enabled; operational, club, squad, session, and coach relationship updates. |
| Community groups              | Maybe       | Maybe  | Maybe  | Maybe    | Safety       | `DEMOTE`             | Keep private squad/team logistics only. Remove generic community/group product framing.                                         |
| Coach following               | Indirect    | Yes    | Yes    | Indirect | No           | `KEEP/FENCE`         | Follow means updates plus rebooking context, not vanity counts.                                                                 |
| Likes/share                   | Low         | Low    | Low    | Low      | No           | `DELETE/FENCE`       | Replace with acknowledge, RSVP, reply, book, pay, review, or rebook.                                                            |
| Comments/replies              | Yes         | Yes    | Yes    | Maybe    | Audit maybe  | `KEEP/FENCE`         | Parent replies allowed where staff enable them; staff can turn comments off per post.                                           |
| Family / child records        | Yes         | Scoped | Yes    | Yes      | Yes          | `TRUST-CORE`         | Backend-authoritative; readiness summary only where broad reads are unsafe.                                                     |
| Medical / consent / emergency | Yes         | Scoped | Yes    | Yes      | Yes          | `TRUST-CORE`         | Assignment controls visibility. Every sensitive read is auditable.                                                              |
| Safeguarding                  | Yes         | Scoped | Maybe  | Yes      | Yes          | `TRUST-CORE`         | Default deny by account role; club admin and assigned/related coach access must be audited.                                     |
| Attendance                    | Yes         | Yes    | Yes    | Yes      | Yes          | `OPS-CORE`           | Append/update backend records. Absences are retained, not deleted.                                                              |
| Session notes / feedback      | Yes         | Yes    | Yes    | Yes      | Audit        | `DEVELOPMENT-CORE`   | Session-linked and visibility-scoped. Private notes never leak.                                                                 |
| Video / proof                 | Yes         | Yes    | Yes    | Yes      | Consent      | `DEVELOPMENT-CORE`   | Must link to booking/group session and athlete before it claims development value.                                              |
| Badges                        | Low         | Maybe  | Maybe  | Maybe    | No           | `FENCE`              | Keep only session-linked recognition. Remove generic gamification.                                                              |
| Reviews                       | Yes         | Yes    | Yes    | Indirect | Audit        | `PAID-CORE`          | Booking-linked, one review per eligible booking/reviewer.                                                                       |
| Invoices / payment attempts   | Yes         | Yes    | Yes    | Indirect | Yes          | `COMMERCIAL-CORE`    | No fake paid state. Backend confirmation or audited manual/refund override only.                                                |
| Analytics                     | Yes         | Yes    | No     | Indirect | Maybe        | `MERGE`              | Fold revenue into earnings; development insight into proof/progress. No vanity dashboard.                                       |
| Compliance exports            | Yes         | Maybe  | Maybe  | Indirect | Yes          | `DEPLOYMENT-CORE`    | Export evidence, not raw global admin dumps.                                                                                    |

## Canonical Data Flows

### Discovery To Booking

`User searches` -> `CoachProfile` -> `CoachVerification` -> `CoachingOffering` -> `AvailabilitySlot` -> `BookingDraft` -> `Booking` -> `Invoice/PaymentAttempt`

Hard rule:

- Public discovery may expose safe summaries only.
- Map, profile, session-type, review, and backend booking must agree on price, availability, eligibility, and bookability.
- If the backend would reject the booking, the UI must show the reason before the final CTA where possible.

### Group / Holiday Camp / Block Registration

`GroupSession` -> `scheduleJson / recurringSeriesId` -> `GroupSessionRegistration` -> `AttendanceRecord` -> `Invoice/PaymentAttempt` -> `SessionNote/Feedback/Proof`

Hard rule:

- `Group Session` and `Holiday Camp` are one paid product family.
- `Block` wraps repeated `1-to-1` or `Group Session` occurrences; it does not create a separate delivery world.
- They may use different source entities, but the UI language and payment/delivery/proof loop must be consistent.
- Actual athlete identities are required before registration, not just participant counts.

### Feed And Coach Page Communication

`Staff author` -> `post owner` -> `audience` -> `post` -> `comments setting` -> `feed/profile/squad/session surface` -> `reply/acknowledge/RSVP/book/rebook`

Hard rule:

- Top-level posts are staff-only: club admin, club coach with permission, or coach posting on their own coach page.
- Parents can comment/reply only where comments are enabled.
- Comments are text-only at launch unless a later sprint explicitly adds media moderation.
- Post owner controls destination: coach-owned post routes to coach page, club-owned post routes to club page, squad post routes to squad context, session post routes to session context.
- Feed aggregation is relationship-based: followed coach, booked coach, club membership, squad membership, session registration, booking, and safety/payment notification.
- No parent-created top-level feed posts.

### School Operations And Assignment

`ClubMembership` -> `capability` -> `paid activity` -> `lead/support staff assignment` -> `coach queue` -> `delivery` -> `AuditEvent`

Hard rule:

- Owner/admin/head coach can assign work if policy allows.
- Coach can manage assigned work.
- There is no `Moderator` role.
- `Support Coach` is a session assignment, not a global account role.
- Support coach access is support-scoped unless explicitly widened.
- Every reassignment or sensitive visibility expansion is audited.

### Child Readiness And Trust

`Family` -> `GuardianChildLink` -> `Athlete` -> `medical / consent / emergency / safeguarding summary` -> `readiness result` -> `booking or attendance gate`

Hard rule:

- Booking should not require broad medical reads.
- Use narrow readiness summaries where possible.
- Club admin can see club-sensitive data by policy.
- Club coaches see sensitive essentials through club, squad, session, or booking relationship, with audit.
- Account-level `Coach` status alone does not grant access to child-private, medical, safeguarding, or finance data.

### Delivery To Development Proof

`Booking or GroupSessionRegistration` -> `AttendanceRecord` -> `SessionNote` -> `SessionFeedback` -> `AthleteSkillAssessment / BadgeAward / Video` -> `Review` -> `Rebook / Continue plan`

Hard rule:

- Absent athletes do not receive development movement.
- Private coach notes stay private.
- Parent/athlete proof must be session-linked.
- Rebook preserves safe context: coach, athlete, offer, objectives, readiness, and payment policy.

### Money And Reconciliation

`Booking or Registration` -> `InvoiceLineItem` -> `Invoice` -> `PaymentAttempt` -> `InvoiceEvent` -> `ReconcilerEntry` -> `owner/coach view` -> `export`

Hard rule:

- Client never marks a hosted payment paid.
- Simulated provider state must be labelled as simulated unless live provider cutover is complete.
- Refunds and manual overrides require permission, registered-number SMS/2FA code, reason, and audit event.
- Group session, holiday camp, and block money cannot be left as registration flags only.

### Compliance Evidence

`Attendance / staff verification / consent / medical access / safeguarding / invoice / payment / audit` -> `club-scoped export` -> `redaction` -> `AuditEvent`

Hard rule:

- Build evidence and exports, not a pretend regulator portal.
- Normal club admins must not see raw global audit data.
- Exports themselves are sensitive reads and must be audited.

## Interaction Quality Baseline

Every sprint inherits these rules:

- One action, one intent.
- No duplicate CTAs for the same job.
- Do not show an action the user cannot complete.
- Disabled actions need a reason if the reason is not obvious.
- Every async action needs immediate pending feedback and a recovery path.
- Confirmation screens only show success after backend success.
- Errors must say what failed, what was preserved, and what the user can do next.
- No native/browser popups in normal product flows.
- Icon-only actions require accessibility labels.
- If a route has loaded once, refresh must not blank the whole screen.
- Sensitive operations must show scoped copy: who can see this, who will be notified, what is recorded.

## Sprint Execution Order

`UX-QA-01` continues as a cross-cutting quality gate. The deployment product sprints are:

1. `PDOS-01` Route Verdict And Interaction Contract
2. `PDOS-02` Staff-Led Feed And Results Discipline
3. `PDOS-03` Discovery, Storefront, And Trust
4. `PDOS-04` Unified Paid Session Product Family
5. `PDOS-05` School Staff Authority And Assignment
6. `PDOS-06` Booking, Registration, And Child Readiness Truth
7. `PDOS-07` Delivery, Attendance, And Coach Console
8. `PDOS-08` Development Proof, Video, Review, And Rebook
9. `PDOS-09` Money Operating Layer
10. `PDOS-10` Club Activity OS And Compliance Exports
11. `PDOS-11` Production Rehearsal And Release Blocker Burn-Down

Why this order:

- First remove ambiguity, protect the feed as staff-led communication, and cut dead results/social weight.
- Then make the buyer path truthful.
- Then make paid products, assignment, and booking real.
- Then harden delivery, proof, money, and compliance.
- Only then run production rehearsal.

## `PDOS-01` Route Verdict And Interaction Contract

Objective:

- Every route and major component must have a launch job, persona, source of truth, data entity, primary CTA, and keep/demote/delete verdict.

Start state:

- The route tree is broad and historically AI-expanded.
- Some routes already have loading contracts, but product purpose is not equally explicit.
- Social/results/profile/community surfaces still exist around the core OS.

End result:

- A route scorecard exists and matches `navigation/routes.ts`, `navigation/loading-route-manifest.js`, and the app route tree.
- Every retained route has a specific job in the paid-development loop.
- Every `DELETE` route is either removed, unreachable, or scheduled in `PDOS-02`.

Personas served:

- All personas indirectly. This sprint prevents low-quality surface area from stealing engineering and QA time.

Data mapping:

- `route` -> `persona` -> `job` -> `entity` -> `service` -> `/v1 or mock-only` -> `primary CTA` -> `loading/action contract` -> `verdict`

Touch first:

- `docs/product-reality/FEATURE_TRIAGE_BOARD_2026-05-06.md`
- `navigation/routes.ts`
- `navigation/loading-route-manifest.js`
- `app/`
- `scripts/ui-quality-pipeline.js`

Hard acceptance:

- No active launch route is unclassified.
- No route is kept because it already exists.
- Every route that creates, changes, pays, shares, or reads sensitive data has an authority service and error path named.
- Every retained route has one primary action or a clear read-only reason.
- The scorecard flags local-only authority in non-mock mode as a blocker.

Verification:

- `node ./scripts/loading-route-coverage-audit.js`
- `node ./scripts/ui-quality-pipeline.js`
- `git diff --check`

Deployment blocker:

- Any active route with unclear purpose, unclear authority, or unclear permission boundary blocks release rehearsal.

## `PDOS-02` Staff-Led Feed And Results Discipline

Objective:

- Keep the feed and coach homepage as core communication surfaces, while removing or demoting features that make Clubroom feel like a generic social platform or team-results tracker.

Start state:

- Match/result routes, recent result home modules, generic profile/follow surfaces, post reactions, and generic community affordances still exist.
- The feed is not yet hard enough about staff-only posting, audience ownership, and comment controls.

End result:

- The launch app contains disciplined communication: staff-led club updates, coach homepage updates, booking/session coordination, private squad/team logistics, verified reviews, development proof, and safety/payment notifications.

Personas served:

- Owner/admin: less noise around real commitments.
- Coach: has a real homepage and update channel without creating a global social network.
- Parent: stays up to date through club, squad, session, and followed-coach updates.
- Child: receives development proof, not content pressure.
- Compliance: fewer uncontrolled sharing paths.

Touch first:

- `app/matches/*`
- `components/match/*`
- `app/(tabs)/feed.tsx`
- `components/social/*`
- `services/social-feed-service.ts`
- `app/profile/[userId].tsx`
- `app/community/[groupId].tsx`
- `app/(modal)/post-detail.tsx`
- `app/(modal)/create-club-post.tsx`
- home recent-results modules
- `navigation/routes.ts`

Interaction contract:

- Top-level feed posts are staff-only.
- Parent comments/replies are allowed when staff enable comments on the post.
- Staff can turn comments off per post.
- Coach-owned posts route to coach page; club-owned posts route to club page; squad/session posts route to the right operational context.
- Replace loose social actions with operational actions: acknowledge, RSVP, attendance, reply, book, pay, review, rebook, message assigned party, raise concern.

Hard acceptance:

- No primary route promotes scores, vanity social feed, vanity following, or parent personal posting.
- No parent top-level post creation remains in the launch route tree.
- Coach homepage posting is retained, but does not become global feed spam.
- Likes/share are removed or fenced from paid-development flows; comments/replies are retained only with staff-controlled comment settings.
- Club/squad updates remain only where permission-scoped and operational.
- Any deleted route has its route builder, nav entry, loading manifest entry, and dead imports removed.

Verification:

- `node ./scripts/loading-route-coverage-audit.js`
- `node ./scripts/audit-ui.js`
- `node ./scripts/lint-ui-actions.js`
- `npm run typecheck`
- `git diff --check`

Deployment blocker:

- Any result/social surface reachable from primary navigation without an operational, club, squad, session, coach-homepage, or followed-coach purpose.

## `PDOS-03` Discovery, Storefront, And Trust

Objective:

- Make Discover Map and coach profiles convert parents into safe paid bookings quickly and honestly.

Start state:

- Discover/profile surfaces show useful coach information but still risk local/stale price, availability, verification, and offering truth.

End result:

- Every coach card/profile explains why a parent should trust and book: verified identity, safeguarding/DBS summary where relevant, qualification/first-aid summary, reviews from real bookings, from-price, next slot, venue/access, and clear bookability.

Personas served:

- Parent: can decide fast and safely.
- Coach: gets qualified leads.
- Owner/admin: club-owned offerings can surface with correct brand and staff.
- Child: gets matched to age/skill/safety-appropriate sessions.
- Compliance: public verification is safe summary only, not raw documents.

Data mapping:

- `GET /v1/public/coaches/search` or equivalent -> public coach summary
- `CoachProfile` -> public storefront
- `FollowedCoach` or equivalent -> update subscription plus rebooking context
- `CoachVerification` -> safe verification summary
- `CoachingOffering` -> price/from-price and product cards
- `AvailabilityTemplate/Override` -> next bookable slot
- `SessionFeedback/Review` -> verified proof
- `FollowedCoach` or existing favourite storage -> update subscription plus repeat-booking shortlist

Touch first:

- `app/discover/map.tsx`
- `components/discover/*`
- `services/discover-service.ts`
- `app/coach/[coachId]/public.tsx`
- `app/coach/[id].tsx`
- `hooks/use-public-profile.ts`
- `components/coach/*profile*`
- `utils/coach-profile-offerings.ts`
- `services/favourite-service.ts`

Interaction contract:

- Book CTA appears only when the coach has a bookable offer and safe eligibility.
- Unverified/unavailable/full states show why booking is blocked and what can happen next.
- Follow action is labelled as a relationship utility: updates plus fast rebooking context, not vanity popularity.

Hard acceptance:

- Map, list, profile, and booking entry agree on price/from-price and next slot.
- Non-mock public price and availability do not come from local storage.
- Unsafe/unverified/unavailable coaches cannot show a live booking CTA without a visible explanation.
- Reviews shown as proof are booking-linked or clearly marked as not yet verified.
- Followed coaches show name, photo, rating/proof, from-price, next slot, latest relevant update, and primary rebook action.

Verification:

- `npm run typecheck`
- `node ./scripts/ui-quality-pipeline.js`
- relevant Discover/profile UI flow when available
- `git diff --check`

Deployment blocker:

- Public discovery/offering API cannot provide trust, price, availability, and bookability summaries.

## `PDOS-04` Unified Paid Session Product Family

Objective:

- Make `1-to-1`, `Group Session`, `Holiday Camp`, and paid blocks feel like one product family.

Start state:

- Group sessions and holiday camps are closer to backend-authoritative.
- One-off offerings and coach-created sessions can still rely on local `SESSION_OFFERINGS`.
- Booking, group registration, invites, recurring plans, and club schedule are split in language and authority.

End result:

- Users understand the difference between `1-to-1`, `Group Session`, `Holiday Camp`, and `Block`, but all share one commercial/delivery language: price, capacity, age/skill fit, location, schedule, owner, assigned staff, attendance, payment, proof.

Personas served:

- Owner/admin: can package and sell sessions, holiday camps, and blocks.
- Coach: can create/run assigned paid products.
- Parent: can compare formats without learning separate systems.
- Child: gets sessions matched to age, level, and objectives.
- Compliance: rosters, payment, attendance, and proof are linked.

Data mapping:

- `CoachingOffering` = what is sold for one-to-one and coach products.
- `Booking` + `BookingParticipant` = one-to-one commitment.
- `GroupSession` + `GroupSessionRegistration` = group session and holiday camp enrollment.
- `RecurringSeries` or `scheduleJson` = repeated block delivery for launch.
- `ClubActivity` = schedule read projection across events, training, and matches.
- `InvoiceLineItem` = commercial representation.

Touch first:

- `app/sessions/create.tsx`
- `hooks/use-create-session.ts`
- `app/book/[coachId]/session-type.tsx`
- `app/book/[coachId]/review.tsx`
- `app/group-sessions/*`
- `app/session-invites/*`
- `services/booking/*`
- `services/group-session/*`
- `services/invite/index.ts`
- `apps/api/src/modules/booking/routes.ts`
- `apps/api/src/modules/wave2plus/routes.ts`
- `packages/db/prisma/schema.prisma`

Interaction contract:

- Product selection answers: who runs it, who owns it, who can attend, what it costs, where/when it happens, what happens after booking, and what payment means.
- Do not ask users to choose between internal implementation concepts.

Hard acceptance:

- Coach setup writes backend in non-mock for every paid session type.
- Parent can book/register without local offering dependency.
- Existing-session invites link to the same backend entity they invite into.
- Club/team schedule create buttons preserve `clubId`, `squadId`, acting role, and assignee context.
- Late, attended, absent, excused, and no-show states are either persisted or not offered.
- No separate “group world” exists outside the paid session spine.

Verification:

- `npm run typecheck`
- `npm --prefix apps/api run typecheck`
- targeted API tests for booking and group session create/register
- targeted UI flows for one-to-one booking and group registration
- `git diff --check`

Deployment blocker:

- Any non-mock paid product create path that writes only to local storage.

## `PDOS-05` School Staff Authority And Assignment

Objective:

- Give school owners/admins/head coaches real control over who runs paid activity, without overexposing sensitive data.

Start state:

- Club governance contracts exist, but some app flows still use broad role checks, local staffing state, legacy academy assumptions, or user-role shortcuts.

End result:

- Owner/admin/head coach/coach permissions are enforced consistently in UI and API, and paid work can be assigned/reassigned to lead/support coaches with audit history.

Personas served:

- Owner/admin: assigns work and supervises quality.
- Head coach: oversees delivery without full finance/safeguarding overreach.
- Coach: gets a clear assigned-work queue.
- Parent/child: know who is responsible.
- Compliance: assignment and sensitive access are evidenced.

Data mapping:

- `ClubMembership.role` -> `capability` from `contracts/club-governance.ts`
- `AccessGrant` -> explicit sensitive access where needed
- `Booking.coachUserId / GroupSession.coachUserId` -> lead delivery owner
- `Lead Coach / Support Coach` -> explicit assignment record or policy-backed field
- `AuditEvent` -> assignment, reassignment, denial, sensitive read

Touch first:

- `contracts/club-governance.ts`
- `packages/shared-contracts/src/club/*`
- `apps/api/src/lib/authz.ts`
- `services/club-authority-service.ts`
- `services/org-staffing-service.ts`
- `hooks/use-manage-bookings.ts`
- `app/manage/head-coach.tsx`
- `app/manage/bookings.tsx`
- `app/club/[clubId]/dashboard.tsx`
- `app/club/[clubId]/member/[memberId].tsx`

Interaction contract:

- Assignment controls show only eligible staff.
- Reassignment requires a reason and explains who is notified.
- Support coach actions are scoped to the assigned session unless policy explicitly grants more.
- UI disabled state must match API denial state.

Hard acceptance:

- No paid-ops flow depends on `/api/academies`.
- UI and API agree on owner/admin/head coach/coach permissions.
- Owner/admin/head coach can assign work to eligible coaches when policy allows.
- Support coach cannot create, reassign, refund, or read unrelated sensitive data unless explicitly granted and assigned.
- Every reassignment writes an audit event.
- API tests cover each role and assignment state for create, assign, reassign, roster read, sensitive read, refund, and deny paths.

Verification:

- `npm run typecheck`
- `npm --prefix apps/api run test`
- targeted authz/API tests
- `node ./scripts/ui-quality-pipeline.js`
- `git diff --check`

Deployment blocker:

- UI grants an action the API denies, or API allows an action the UI/policy says is forbidden.

## `PDOS-06` Booking, Registration, And Child Readiness Truth

Objective:

- Make final booking/registration success mean a backend commitment exists, with child readiness and safety requirements checked.

Start state:

- Some booking confirmation copy can imply success before backend creation.
- Child selector may not show readiness.
- Existing children can reach booking without visible consent/medical/emergency readiness.
- Group registration can be capacity/payment truth but still needs stronger child identity and readiness gates.

End result:

- Review step owns final submission. Confirmation is a receipt for a real booking or registration ID. Every selected minor has readiness checked before final commit.

Personas served:

- Parent: does not lose or fake a booking.
- Coach/owner: receives valid commitments.
- Child: only attends with required safety context.
- Compliance: readiness checks and denials are auditable.

Data mapping:

- `BookingDraft` -> `CreateBookingCommand`
- `GroupRegistrationDraft` -> `CreateRegistrationCommand`
- `Athlete` -> `BookingSafetyReadiness`
- `ChildMedicalRecord / ChildConsent / ChildEmergencyContact` -> readiness summary
- `CoachVerification` -> eligibility for minor delivery
- `BookingStatusEvent` -> lifecycle truth

Touch first:

- `context/booking-flow-context.tsx`
- `app/book/[coachId]/review.tsx`
- `app/book/[coachId]/confirmation.tsx`
- `components/bookings/child-selector.tsx`
- `hooks/use-child-context.tsx`
- `services/child-service.ts`
- `services/family/family-health-service.ts`
- `services/booking/booking-authority-service.ts`
- `services/group-session/session-registration-service.ts`
- `apps/api/src/modules/booking/routes.ts`
- `apps/api/src/modules/family-athlete/routes.ts`

Interaction contract:

- `Place booking` or `Register` shows pending state, prevents duplicate taps, and returns to the same review state on recoverable failure.
- Confirmation cannot render success without a real backend ID.
- Readiness blockers say exactly what is missing and route to the right child/family edit surface.

Hard acceptance:

- Leaving confirmation never loses a booking.
- Duplicate final taps are idempotent.
- Stale price, stale capacity, unavailable slot, missing consent, missing emergency contact, and failed coach eligibility render inline on review.
- No raw medical detail is shown on booking review.
- Multi-child and group registrations require all selected children to pass readiness.
- Readiness checks and sensitive denials are audited.

Verification:

- `npm run typecheck`
- `npm --prefix apps/api run test`
- booking UI flow
- group registration UI flow
- `git diff --check`

Deployment blocker:

- Confirmation can imply success before backend commit, or minor booking can proceed without readiness truth.

## `PDOS-07` Delivery, Attendance, And Coach Console

Objective:

- Give coaches one workflow per assigned session: prepare, deliver, mark attendance, add feedback/proof, set next work, raise concern if needed, and close the loop.

Start state:

- Useful delivery pieces exist but are scattered across booking detail, completion, notes, legacy feedback, development session editor, progress loop, and group roster.
- Some completion/attendance writes are local or delete absence evidence.

End result:

- The coach console is the operational daily workspace, and attendance is backend truth for `1-to-1`, `Group Session`, `Holiday Camp`, and block occurrences.

Personas served:

- Coach: less admin, clearer delivery.
- Owner/head coach: can supervise attendance and completion.
- Parent/child: receive timely proof and safety status.
- Compliance: attendance register is exportable.

Data mapping:

- `assigned activity` -> `coach queue`
- `BookingParticipant / GroupSessionRegistration` -> roster
- `AttendanceRecord` -> status, recorder, timestamp, reason
- `SessionNote / SessionFeedback` -> delivery notes
- `SafeguardingIncident` -> concern path
- `AuditEvent` -> edits, sensitive reads, concerns

Touch first:

- `app/(tabs)/bookings/[id].tsx`
- `components/bookings/booking-coach-view.tsx`
- `app/session/[id]/complete.tsx`
- `hooks/use-session-completion.ts`
- `app/group-sessions/[id]/roster.tsx`
- `services/group-session/session-registration-service.ts`
- `services/progress/progress-feedback-service.ts`
- `services/trust/safeguarding-service.ts`
- `apps/api/src/repositories/p0/group-session-repository.ts`

Interaction contract:

- Coach sees one next action for each delivery state.
- Attendance edit explains whether parent is notified and whether audit history is kept.
- Concern escalation is separate from normal feedback.
- Private coach note and parent-visible note are visibly distinct.

Hard acceptance:

- Completing a booking or group occurrence in non-mock writes to `/v1`.
- Attendance retains `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`, and `NO_SHOW`; absence is not deletion.
- Per-athlete group feedback is separate and idempotent.
- Absent athletes do not receive progress movement.
- Parent/athlete visibility obeys `coach_only` vs shared state.
- Private coach notes never leak.
- Head coach sees scoped block and holiday-camp attendance, not unrelated child-sensitive data.

Verification:

- `npm run typecheck`
- `npm --prefix apps/api run test`
- targeted delivery/completion UI flow
- `git diff --check`

Deployment blocker:

- Attendance or completion remains local-only in non-mock mode.

## `PDOS-08` Development Proof, Video, Review, And Rebook

Objective:

- Every completed paid session should produce a visible outcome and a next commitment.

Start state:

- Progress, completion media, reviews, saved coaches, recurring plans, and rebook can still be partly local, weakly linked, or weakly prefilled.

End result:

- Completed session shows one outcome card: what happened, what improved, next work, shared proof, review CTA, saved coach/rebook/continue-plan CTA.

Personas served:

- Coach: proves value and drives repeat work.
- Parent: understands what they paid for.
- Child: sees improvement and next practice.
- Owner/admin: quality proof and retention.
- Compliance: proof respects consent and visibility.

Data mapping:

- `AttendanceRecord` -> completion eligibility
- `SessionNote` -> coach note
- `SessionFeedback` -> parent/athlete-facing feedback
- `AthleteSkillAssessment / AthleteBadge` -> session-linked development movement
- `PracticeTask` -> next work
- `Video / VideoShare / VideoAnnotation` -> proof media
- `Review` -> booking-linked public proof
- `Booking previousBookingId / offer context` -> rebook draft

Touch first:

- `components/bookings/booking-parent-view.tsx`
- `components/bookings/booking-delivery-outcome-card.tsx`
- `hooks/use-booking-detail.ts`
- `app/review/[bookingId].tsx`
- `services/review-sync-service.ts`
- `app/videos/upload.tsx`
- `hooks/use-video-upload.ts`
- `services/video-service.ts`
- `services/progress/*`
- `services/favourite-service.ts`
- `services/recurring-booking-service.ts`

Interaction contract:

- Outcome card does not pretend feedback exists if coach did not add it.
- Review is available only after completed paid booking and only once per eligible reviewer.
- Rebook preselects coach, athlete, offer/session type, objectives, and safety context.
- Video sharing names exact recipients and fails safely if no linked family context exists.

Hard acceptance:

- Completed paid sessions show proof or explicit `No feedback added yet`.
- Review requires completed booking and backend persistence.
- Coach profile proof uses verified booking-linked reviews.
- Completion upload carries `bookingId` or `groupSessionId` plus athlete IDs.
- Standalone upload is coach-private unless linked.
- Parent/athlete progress only shows explicitly shared proof.
- Rebook handles unavailable offers and stale safety requirements.
- Production progress screens do not seed demo data.

Verification:

- `npm run typecheck`
- `npm --prefix apps/api run test`
- video/progress/review targeted checks
- parent booking outcome UI flow
- `git diff --check`

Deployment blocker:

- Reviews, proof, video sharing, or recurring/rebook stay local-only in non-mock mode.

## `PDOS-09` Money Operating Layer

Objective:

- Bookings, registrations, invoices, payment attempts, reminders, and reconciliation must tell one honest financial story.

Start state:

- Invoice APIs exist mainly for bookings.
- Group registrations can carry payment markers without full ledger mapping.
- Some owner/reconciler views synthesize or seed-update state.
- Live provider cutover is not complete.

End result:

- Every paid commitment has invoice lines, invoice status, payment attempt state, reconciler state, and owner/coach/payer views that agree.

Personas served:

- Owner/admin: knows what was sold, paid, overdue, voided, or written off.
- Coach: knows earnings and outstanding money.
- Parent: knows amount owed and next action.
- Compliance: payment, refund, and manual overrides are exportable.

Data mapping:

- `Booking / GroupSessionRegistration` -> `InvoiceLineItem`
- `Invoice` -> payer, coach, athlete, product snapshot
- `PaymentAttempt` -> hosted provider attempt
- `InvoiceEvent` -> sent, paid, failed, voided, written off, reminded
- `PaymentReminder` -> communication evidence
- `ReconcilerEntry` -> internal finance workflow

Touch first:

- `services/invoice-service.ts`
- `hooks/use-invoice-detail.ts`
- `components/invoices/*`
- `components/bookings/booking-info-cards.tsx`
- `app/invoices/*`
- `app/(tabs)/earnings.tsx`
- `app/earnings.tsx`
- `services/group-session/session-registration-service.ts`
- `apps/api/src/modules/wave2plus/routes.ts`

Interaction contract:

- Parent always sees amount owed, due date, payment state, and next action.
- Coach/owner never sees synthetic non-mock invoices as real.
- Manual payment action requires permission, reason, and clear audit copy.
- Simulated provider state is labelled if live provider is not active.

Hard acceptance:

- No synthetic invoices in non-mock mode.
- `SENT` invoice owned by payer shows `Pay now` from booking detail and invoice detail.
- Paid, processing, failed, void, overdue, direct-pay, and manual-override states are distinct.
- Client never marks hosted payment as paid.
- Group session, holiday camp, and block registrations have invoice/payment status, not only `paidAt`.
- Mark-paid/unpaid/write-off/void/refund update backend truth, require registered-number SMS/2FA where money moves back, and audit.
- Owner/admin can export ledger and reconciliation report.

Verification:

- `npm run typecheck`
- `npm --prefix apps/api run test`
- invoice/payment UI flows
- release preflight if env is available
- `git diff --check`

Deployment blocker:

- Fake paid state, seed-backed reconciliation in production mode, or no clear business decision between live provider and explicit off-platform/direct-pay launch.

## `PDOS-10` Club Activity OS And Compliance Exports

Objective:

- Make club operations about paid activity coordination, staff-led communication, and evidence, not a loose club website.

Start state:

- Club schedule exists and `ClubActivity` projects events/group sessions/matches.
- Club hub/detail pages still risk content/feed-first framing.
- Compliance data exists in pieces but no club-scoped export product is complete.

End result:

- Clubs run squads, staff, paid sessions, holiday camps, attendance, capacity, waitlists, family communication, safeguarding, finance, and compliance evidence from operational surfaces.

Personas served:

- Owner/admin: runs the school.
- Head coach: supervises block, group, and holiday-camp delivery.
- Coach/support coach: sees assigned work and safety essentials.
- Parent/child: receives relevant schedule, payment, proof, and updates.
- Compliance: can evidence what happened.

Data mapping:

- `Club` -> `ClubMembership` -> `Squad`
- `ClubActivity` -> schedule read projection
- `GroupSession / ClubEvent / Match` -> activity source records
- `GroupSessionRegistration / BookingParticipant` -> roster
- `AttendanceRecord` -> register
- `SafeguardingIncident` -> incident timeline
- `AuditEvent / SecurityEvent` -> access and action trail
- `Invoice / PaymentAttempt / ReconcilerEntry` -> finance evidence

Touch first:

- `app/(tabs)/club-hub.tsx`
- `hooks/use-club-hub.ts`
- `app/club/[id].tsx`
- `app/club/[id]/schedule.tsx`
- `app/club/[id]/activity/[activityId].tsx`
- `app/club/[clubId]/dashboard.tsx`
- `app/club/squad/[id].tsx`
- `services/club-schedule-service.ts`
- `services/club-authority-service.ts`
- `apps/api/src/modules/coach-club/schedule.ts`
- `apps/api/src/repositories/p0/trust-access-repository.ts`

Interaction contract:

- Club pages lead with commitments, paid activities, staff, squads, safety, and money before content.
- Event creation starts from schedule context.
- Operational updates explain target audience and visibility.
- Export actions show scope, redaction, and audit notice.

Hard acceptance:

- Club pages lead with commitments, staff-led feed, paid activities, squads, safety, and money in that order.
- Events are schedule workspaces, not standalone products.
- Attendance registers are exportable by club/squad/activity/date.
- Staff verification and role assignment can be exported by authorized users.
- Consent/medical access logs and safeguarding incident timelines are club-scoped and redacted.
- Raw global audit dumps are not exposed to normal club admins.
- Exports are CSV/JSON at minimum, deterministic, paginated/jobbed where needed, and audited.

Verification:

- `npm run typecheck`
- `npm --prefix apps/api run test`
- club owner/admin UI flow
- compliance/export targeted tests
- `git diff --check`

Deployment blocker:

- No exportable evidence for attendance, finance, safeguarding, or sensitive-data access.

## `PDOS-11` Production Rehearsal And Release Blocker Burn-Down

Objective:

- Run the real release path and leave only honest external provisioning blockers.

Start state:

- App and API are feature-rich but backend cutover is still incomplete across some non-mock paths.
- Release gate is intentionally red without production env, DB, storage, and payment-provider config.

End result:

- The app and API run against the non-mock/db-backed path.
- Every core paid-development journey is either green or has a named env/provider blocker.
- No local-only trust, money, booking, attendance, proof, or social drift remains in launch paths.

Core journeys:

- Parent finds coach on map -> views trusted profile -> selects offer -> child readiness passes -> books -> sees invoice/payment state.
- Parent registers child for group session, holiday camp, or block -> capacity/payment/readiness validated -> sees receipt and schedule.
- Coach sees assigned session -> views safety essentials -> records attendance -> completes feedback/proof -> parent sees outcome.
- Owner creates club activity/block/holiday camp -> assigns lead/support coaches -> monitors roster/attendance/payment -> exports evidence.
- Head coach reassigns work with reason -> coach queues update -> audit event exists.
- Compliance user exports attendance/finance/safeguarding/sensitive-read evidence with redaction.

Verification:

- `npm run typecheck`
- `npm run test:compile`
- `npm run lint`
- `node ./scripts/ui-quality-pipeline.js --require-flows`
- `npm --prefix apps/api run typecheck`
- `npm --prefix apps/api run test`
- `npm --prefix apps/api run release:preflight`
- `npm run export:web`
- targeted production-mode smoke against db-backed API
- `git diff --check`

Deployment blocker:

- Any core journey needs mock/local storage for booking, registration, child readiness, payment, attendance, proof, safeguarding, or compliance evidence.

## Deployment Definition Of Done

Clubroom is deployment-ready only when:

- Discover Map is a truthful storefront, not a gimmick.
- Every active route has a launch job and data authority.
- Staff-led feed and coach homepage are disciplined communication surfaces, not loose social posting.
- Results drift is hidden/demoted into selected squad/team schedule context.
- `1-to-1`, `Group Session`, `Holiday Camp`, and paid blocks share one clear product language.
- Final booking/registration success only appears after backend creation.
- Child readiness blocks unsafe minor bookings.
- Staff assignment and sensitive visibility are policy-backed and audited.
- Attendance is backend evidence, not local UI state.
- Development proof is session-linked and visibility-scoped.
- Reviews are booking-linked.
- Money state is backend-owned and never fake-paid.
- Refunds require registered-number SMS/2FA, reason, permission check, and audit.
- Club operations lead with commitments, staff, squads, safety, money, and evidence.
- Compliance exports exist for attendance, finance, safeguarding, and sensitive access.
- Full release rehearsal passes or leaves only external env/provider blockers.
