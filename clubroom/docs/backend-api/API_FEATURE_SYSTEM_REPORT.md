# Clubroom API Feature System Report

Generated: 2026-07-08

This is a snapshot map for product/API coverage. Canonical runtime truth remains:

- `docs/backend-api/ROUTE_INVENTORY_V1.md`
- `docs/architecture/runtime-modes.md`
- `docs/architecture/entity-relationship-map.md`
- `contracts/club-governance.ts`

## Current Status

- API runtime estimate: about 94% operational against the staged `/v1`/Supabase path.
- Whole-app API-cutover confidence: about 85% until the remaining long-tail service paths and mobile E2E role flows are proven.
- Latest focused slice validation: API-mode fail-closed service tests, booking/invite route OpenAPI classification checks, `npm run test:compile`, root `npm run typecheck`, and `npm run audit:api-boundaries` passed after the latest drill-detail, coach follow, discovery/follow-suggestion, logging-semantics, trust escalation, badge action strictness, family progress analytics strictness, booking status lifecycle strictness, and self-booking preference strictness slices.
- Latest staging/Supabase smoke: 29/29 passed on 2026-07-08, 0 warnings, 0 failures.
- Latest strict DB audit: `npm run audit:db:stage:strict` passed on 2026-07-08 with 40/40 migrations applied, 0 blockers, and 0 warnings.
- Latest strict API-mode runtime smoke: `npm run smoke:api-mode:strict` passed on 2026-07-08 against the configured staging API origin with `/v1/ready=ready`.
- Latest UI role sweep: 36/36 passed on 2026-07-08 with 0 high/medium findings across parent, athlete, and admin.
- Latest focused money-provider checks: payout/earnings 4/4, payment instructions 2/2, and wave2+ invoice/payment routes 59/59 passed in seed API mode.
- Swagger/OpenAPI: `/v1/docs`, generated from route inventory, 400 operations.
- Current data rule: API mode must use `/v1` service authority and fail closed instead of using local/mock product data.
- Runtime config rule: every non-test frontend runtime fails fast if `EXPO_PUBLIC_USE_MOCK=true`; every frontend runtime fails fast if `EXPO_PUBLIC_PRE_API_LIVE_MODE=true`.
- Payout rule: payout and payment flows use API routes with simulated provider completion; no real money is wired.

## Hard Test Gates

API slices should ship with tests that prove:

- the successful route writes or reads the expected database-owned state;
- unauthorized users are denied by role/assignment, not hidden by client checks;
- sensitive writes emit audit events;
- frontend API mode calls `/v1` service authority and does not fall back to mock/local product state;
- unsupported API-mode flows fail closed with a clear product message.

## Feature Coverage Matrix

| Category | Subcategory | Runtime API coverage | Main frontend/service entrypoints | Notes |
| --- | --- | --- | --- | --- |
| Auth and account | login/session/self profile | `/v1/auth/*`, `/v1/auth/me`, `/v1/me`, `/v1/me/sessions*` | `services/auth-service.ts`, `hooks/use-auth.tsx`, `hooks/use-account-settings.ts` | Email, name, and phone are backend-owned in API mode. |
| Users | search and self display | `/v1/users/search`, `/v1/me` | `services/user-service.ts` | Local `USERS` browsing is not live authority in API mode. |
| Family and athletes | child profile create/update/remove | `/v1/athletes*`, `/v1/families/:familyId` | `services/child-service.ts`, `hooks/use-edit-child-profile.ts`, `hooks/use-children-hub.ts` | Generic profile editing does not mutate family child lists; child and guardian relationship edits stay in dedicated family/athlete flows. |
| Privacy | account privacy settings | `/v1/me/privacy-settings` | `services/privacy-settings-service.ts` | Backend-owned `UserPrivacySetting`. |
| Clubs and academy | club create/list/detail/update/archive | `/v1/clubs`, `/v1/clubs/:clubId` | `services/club-authority-service.ts`, `hooks/use-club-settings.ts`, `hooks/use-club-detail.ts` | Academy is a compatibility label over club contracts, not a parallel authority. |
| Clubs and academy | invite codes | `/v1/clubs/:clubId/invite-codes*` | `services/club-authority-service.ts`, `hooks/use-club-settings.ts` | Legacy global/school invite-code admin is mock-only. |
| Clubs and academy | direct user and email invites | `/v1/clubs/:clubId/invites`, `/v1/clubs/invites*` | `hooks/use-club-invite.ts`, `hooks/use-coach-invites.ts` | Member, coach-account, staff-account admin, and manual email direct invites are implemented and audited. Existing accounts are targeted by user id; unregistered emails are stored as pending HMAC email-target invites and bind to the matching signed-in account on response. Email-target delivery uses the configured webhook, Brevo API, SMTP, or dev-outbox provider and returns delivery counts. |
| Clubs and academy | member list, role, removal, self-leave, ban, restore | `/v1/clubs/:clubId/members*` | `services/club-service.ts`, `hooks/use-member-management.ts`, `hooks/use-club-detail.ts` | Removals are soft removals; self-leave blocks owner abandonment and audits. |
| Clubs and academy | squads and squad members | `/v1/clubs/:clubId/squads*` | `services/squad-service.ts`, `hooks/use-create-squad.ts`, `hooks/use-squad-detail.ts` | Target squad assignment requires linked athlete context. |
| Clubs and academy | branding | `/v1/clubs/:clubId/branding` | `services/club-service.ts` | Read/write audited. |
| Club operations | staffing console and assignments | `/v1/clubs/:clubId/staffing-console`, `/v1/clubs/:clubId/work-assignments/:assignmentId` | `services/org-staffing-service.ts`, `hooks/use-manage-bookings.ts` | Assignment controls visibility; access is not transitive. |
| Club operations | owner dashboard | `/v1/clubs/:clubId/owner-dashboard` | `services/org-owner-dashboard-service.ts`, `hooks/use-club-dashboard.ts` | Composes finance, staffing, oversight, and support data. |
| Club operations | head coach oversight | `/v1/clubs/:clubId/head-coach/*` | `services/org-head-coach-service.ts`, `hooks/use-head-coach-oversight.ts` | Owner/admin/head-coach scoped; tasks and standards are DB-backed. |
| Club schedule | schedule/activity projection | `/v1/clubs/:clubId/schedule*` | `services/club-schedule-service.ts`, `hooks/use-club-schedule.ts` | Projects events, group sessions, and matches. |
| Matches | club match CRUD and players | `/v1/clubs/:clubId/matches*`, `/v1/matches*` | `services/match-service.ts`, `hooks/use-create-match.ts` | Club staff or privileged admin write gates. |
| Bookings | list/detail/create/update/cancel/complete | `/v1/bookings*`, `/v1/bookings/:bookingId/*` | `services/booking/*`, `hooks/use-bookings.ts`, booking screens | API mode resolves club display through `/v1/clubs`; local booking mirrors are not read as authority. |
| Bookings | recurring plans and series | `/v1/booking-series*` | `services/recurring-booking-service.ts`, `services/multi-week-booking-service.ts` | Local recurring storage is mock-only. |
| Bookings | cancellation/no-show | `/v1/cancellation-records`, `/v1/families/:familyId/no-shows` | `services/cancellation-service.ts` | Bare no-show counter writes fail closed without proof. |
| Payments | invoices, reminders, and payment attempts | `/v1/invoices*`, `/v1/payment-attempts/*` | `services/invoice-service.ts`, payment hooks | Hosted attempts are simulated and parent invoice detail keeps checkout hidden until real provider cutover; completion requires backend confirmation. Invoice reminders persist `PaymentReminder` rows, use the configured webhook/Brevo/SMTP/dev-outbox provider, and audit delivery status without raw recipient email metadata. |
| Payouts | payout methods and withdrawals | `/v1/coaches/me/payout-methods*`, `/v1/coaches/me/withdrawals*` | `services/earnings/payout-service.ts` | Simulated-provider only; payout complete states work without wiring money. |
| Coaches | self profile and rich profile metadata | `/v1/coaches/me/profile` | `services/coach-profile-service.ts`, `hooks/use-edit-profile.ts` | Bio, pricing, website, social links, experience, languages, specialties, qualifications are supported. |
| Coaches | public profile/discovery/search | `/v1/coaches/search`, `/v1/coaches/:coachId/profile`, `/v1/coaches/offerings`, `/v1/coaches/:coachId/offerings`, `/v1/coaches/:coachId/reviews` | `services/discover-service.ts`, `services/coach-service.ts` | Search/list/featured use backend-owned public filters, completed public-review aggregates, ranking, text query over public coach fields/location labels, and coordinate distance search over sanitized public coach locations; external geocoding remains out of scope. |
| Coaches | verification status/evidence/review | `/v1/coaches/:coachId/verification-status`, `/v1/coaches/me/verifications/:type/documents`, `/v1/coaches/:coachId/verifications/:type/review` | `services/verification-service.ts`, verification hooks | Coach evidence upload and platform reviewer/admin decisions are backend-owned and audited; email/phone verification remain auth-provider owned. |
| Coaches | availability | `/v1/coaches/:coachId/availability/*`, `/v1/coaches/me/availability/*` | `services/availability-service.ts`, `hooks/use-day-editor.ts` | Local availability mirrors are mock-only. |
| Coaches | scheduling rules/cancellation policy | `/v1/coaches/me/scheduling-rules`, `/v1/coaches/:coachId/scheduling-rules` | `services/scheduling-rules-service.ts` | Non-self writes fail closed. |
| Coaches | roster | `/v1/coaches/:coachId/roster*` | `services/roster-service.ts` | Roster removals are soft, audited, and preserve history. |
| Coaches | travel/trials/payment instructions | `/v1/coaches/me/travel-settings`, `/v1/coaches/:coachId/trial-*`, `/v1/coaches/me/payment-instructions` | travel/trial/payment services | Payment instruction audit avoids raw bank text in audit metadata. |
| Events | club event CRUD/publish/cancel/reminder | `/v1/clubs/:clubId/events*`, `/v1/events/:eventId*` | `services/event/event-crud-service.ts` | Draft visibility and athlete targeting are backend-owned. |
| Events | RSVP and attendance | `/v1/events/:eventId/rsvp`, `/v1/events/:eventId/rsvps*`, `/v1/events/:eventId/attendance*` | RSVP and attendance services | Writes are audited; location validation supported. |
| Sessions | group sessions and registration | `/v1/group-sessions*`, `/v1/group-session-registrations*` | group-session services, booking hooks | Session invite/registration flows are backend-owned in API mode; confirmed registrations create/reactivate session message-thread access for the delivery coach and registering family/athlete account. |
| Session completion | feedback and messaging shortcuts | `/v1/bookings/:bookingId/complete`, `/v1/session-feedback`, `/v1/message-threads*` | `hooks/use-session-completion.ts`, `hooks/use-dev-session.ts` | Local `COACH_SESSIONS` ingestion remains mock/demo-only for legacy aggregate helpers; group-session shortcuts use `MessageThread.groupSessionId` created by confirmed registration. |
| Progress | goals, milestones, analytics, skills, badges | `/v1/athletes/:athleteId/*`, `/v1/goals*`, `/v1/badge-awards*`, `/v1/sessions/:sessionId/badges` | `services/progress/*`, badge services | Backend rows own goal/skill/badge state in API mode. |
| Progress | termly reports, practice logs/tasks, drills | `/v1/athletes/:athleteId/termly-reports`, `/v1/practice-*`, `/v1/drills*`, `/v1/drill-assignments*` | progress and drill services | Saved termly snapshots persist server-side. |
| Athlete health | medical, emergency contacts, consents, SEN, injuries | `/v1/athletes/:athleteId/medical`, emergency, consent, SEN, injury routes | health hooks/services | Sensitive reads fail closed; no persistent frontend cache in API mode. |
| Safeguarding and reports | incidents, reports, concerns | `/v1/safeguarding/incidents`, `/v1/reports` | `services/safety-service.ts`, `services/report-service.ts` | Status changes append actions instead of mutating local concern state. |
| Social/community | posts, comments, reactions, pinning, following updates | `/v1/posts*`, `/v1/comments*` | `services/social-feed-service.ts`, `services/comment-service.ts`, post hooks | Pin/unpin is audited staff-only via `PATCH /v1/posts/:postId/pin`; `followingOnly=true` filters to active followed authors without granting new visibility; post media attachments require finalized owned media proof. |
| Social/community | community groups and members | `/v1/community-groups*` | `services/community/community-group-service.ts` | Private/squad group membership is backend-owned. |
| Social/community | messages/read receipts | `/v1/community-groups/:groupId/messages*`, `/v1/message-threads*`, `/v1/messages/:messageId` | messaging services | Deletes are soft and audited; message media attachments require finalized owned media proof. |
| Social/community | follows, follow requests, blocks | `/v1/follows*`, `/v1/follow-requests*`, `/v1/blocks*` | `services/follow-service.ts`, `services/block-service.ts` | Blocks deny follow relationships and search exposure. |
| Media/video | uploads, videos, annotations, share | `/v1/uploads*`, `/v1/videos*` | `services/media-service.ts`, `services/video-service.ts` | Upload completion owns media proof; posts/messages accept finalized owned media-object proof and still reject arbitrary media URLs. |
| Notifications | inbox, read/dismiss, preferences | `/v1/me/notifications*` | notification services | Client-side arbitrary notification create/send remains fail-closed. |
| Trust ops | retention, deletion requests, access grants | `/v1/admin/retention-runs`, `/v1/me/data-deletion-requests`, `/v1/access-grants` | trust/admin surfaces | Sensitive reads are audited. |

## Core Database Relationships

| Relationship | Cardinality | Runtime meaning |
| --- | --- | --- |
| `User -> UserRoleMembership` | one-to-many | A user can have multiple global/runtime roles. |
| `User -> AuthSession` | one-to-many | Session revoke/revoke-all is self-scoped. |
| `User -> ClubMembership` | one-to-many | Club role and active/deleted state controls club visibility and staff capabilities. |
| `Club -> ClubMembership` | one-to-many | Clubs own member/staff membership rows. |
| `Club -> ClubInviteCode` | one-to-many | Club-scoped join/staff invite codes. |
| `Invite -> InviteTarget` | one-to-many | Direct/member/staff invite targets are per-user pending rows or pending email-target rows that bind to a matching account on response. |
| `Club -> Squad` | one-to-many | Squad assignment is club-scoped. |
| `Squad -> SquadMembership` | one-to-many | Squad membership points to linked athletes, not arbitrary users. |
| `User -> CoachProfile` | one-to-one | Coach profile owns marketplace/public coach metadata. |
| `CoachProfile -> CoachOffering` | one-to-many | Offerings power discovery and booking. |
| `CoachProfile -> CoachTravelSettings/PaymentInstructions/TrialOffering` | one-to-one or one-to-many by feature | Coach-specific commercial/preferences data. |
| `User -> Athlete` | one-to-zero/one | Athlete user account link. |
| `Family -> FamilyMembership` | one-to-many | Family membership controls guardian/child visibility. |
| `GuardianChildLink -> Athlete/User` | many-to-one | Guardian visibility is explicit, not transitive through club membership. |
| `Booking -> BookingParticipant` | one-to-many | Bookings can include multiple athletes/participants. |
| `Booking -> Invoice -> PaymentAttempt` | one-to-many across invoice/payment attempts | Payment state changes require backend confirmation. |
| `Booking -> SessionFeedback/Review/Timeline` | one-to-many | Feedback, review, and timeline are booking-linked proof. |
| `BookingSeries -> Booking` | one-to-many | Recurring booking plans generate booking rows. |
| `GroupSession -> GroupRegistration` | one-to-many | Group session registration owns attendance/booking linkage. |
| `Club -> ClubEvent` | one-to-many | Event visibility, RSVP, and attendance are club-scoped. |
| `ClubEvent -> EventRsvp/EventAttendance` | one-to-many | RSVP and attendance are separate durable records. |
| `Club -> ClubMatch -> ClubMatchPlayer` | one-to-many | Match roster/player records are club-owned. |
| `Athlete -> Goal -> GoalMilestone` | one-to-many | Goal progress and milestone state are backend-owned. |
| `Athlete -> AthleteSkillAssessment` | one-to-many | Skill history powers analytics and progress projections. |
| `Athlete -> Medical/Emergency/Consent/SEN/Injury rows` | one-to-many by domain | Sensitive health data is backend-authoritative and fail-closed. |
| `Post -> PostComment -> PostCommentReaction` | one-to-many | Thread shape is preserved by soft-delete placeholders. |
| `Post -> PostReaction` | one-to-many | Likes are actor-derived and audited. |
| `CommunityGroup -> CommunityGroupMembership` | one-to-many | Group read/write scope is membership based. |
| `CommunityGroup/MessageThread -> Message` | one-to-many | Read receipts and deletes are backend-owned. |
| `Video -> VideoAnnotation/VideoShare` | one-to-many | Video visibility and sharing are explicit. |
| `User -> Notification` | one-to-many | Notification inbox/read/dismiss is self-owned. |
| `User -> UserFollow/UserBlock` | one-to-many | Follow and block state shapes feed/search visibility. |

## Explicit Remaining Gaps

| Gap | Current behavior | Needed API/product decision |
| --- | --- | --- |
| Long-tail API-mode read/write paths | Core smoke flows pass, but remaining compatibility services still need classification so true API failures are not hidden as empty lists, `null`, or local defaults. Recent slices fixed practice tasks, squad reads, self-assessment prompts, family child updates, injury updates, coach follow toggles, drill-assignment detail, follow suggestions, stale invoice read route status, session invite API read failures, bulk/group invite API read failures, and availability template/override read failures. | Continue path-scoped service review until every API-mode path either uses `/v1`, is explicitly local UI state, or fails closed with product-visible handling. |
| Mobile role E2E depth | UI role sweeps and staging smoke cover high-value web/runtime flows; full mobile role E2E coverage is not complete. | Add/finish mobile E2E flows for coach, parent, athlete, club owner/admin, and trust-sensitive denial paths. |
| Swagger/OpenAPI polish | `/v1/docs` is a usable Swagger UI over generated OpenAPI 3.1, with operation IDs, domain tags, and lifecycle effects. | Add route-specific examples and richer request/response schemas where the generated route-inventory defaults are too thin. |
| Live payment/payout provider cutover | API routes support simulated provider completion and audited state transitions; no real money is wired. | Wire Stripe/payment/payout provider credentials and webhooks when product/compliance is ready. |

## Quality Matrix

| Area | Current standard | Notes |
| --- | --- | --- |
| Authorization | Default deny; assignment controls visibility; privileged admin is explicit. | Club membership alone does not grant coach-private, medical, safeguarding, or finance access. |
| Audit | Sensitive reads and writes are audited across finance, membership, invites, health, safeguarding, posts, messaging, and trust ops. | New club self-leave, direct invites, invite response, and post pin writes are audited. |
| Deletion | Sensitive/product data uses soft remove, archive, revoke, cancel, or status transitions where practical. | Club member removal, message removal, roster removal, squad/member links, drills, goals, payout methods, and service logs now avoid hard-delete wording where history is preserved. |
| Media proof | Posts and messages accept only finalized media objects owned by the actor; missing, unfinalized, wrong-owner, or unsupported media is denied. | Arbitrary `imageUrl`/`videoUrl` post payloads and local-only message attachments remain fail-closed in API mode. |
| Notifications | Product action routes create durable backend notification rows; generic client create/send helpers are mock-only and fail closed in API mode. | Covered by `__tests__/services/notification/notification-api-mode.test.ts` and `__tests__/services/notification/notification-api-boundary.test.ts`. |
| Mock control | API mode blocks generic storage bridge and mock/local product authority; non-test frontend config rejects mock and pre-API flags. | Retained mock branches are test-only scaffolding; recent hardening keeps academy, bookings, children/family, clubs, earnings, health, invites, media, roster, RSVP, safety, squads, and calendar exports off product-runtime fixture caches. |
| Swagger | Generated from route inventory. | Invoice list/detail reads now show as implemented DB-backed finance routes; regenerate with `npm run api:openapi` after route inventory edits. |
| Validation | Full verifier is the slice gate, with focused tests per strictness slice. | Latest focused strictness slices passed compile, typecheck, service tests, and API-boundary audit; latest staging smoke passed 29/29. |
| Supabase/Postgres | Schema migrations are audited for RLS and direct grants; staging smoke proves the configured DB-backed API path. | Latest DB migration audit: 40 migrations, 120 created tables, 0 missing RLS, 0 direct anon/auth grants. Latest staging smoke: 29/29 passed on 2026-07-08, 0 warnings, 0 failures. Strict API-mode runtime smoke passed with `/v1/ready=ready`. |

## Latest Committed API Slices

- `35b22443 fix(trust): fail closed on concern escalation errors`
- `1ca99344 chore(logs): use remove and archive wording`
- `c0a3a5cc fix(follows): fail closed on coach suggestion errors`
- `6bacb504 fix(coaches): toggle follows through api`
- `4a68d47f fix(discovery): fail closed on api hydration errors`
- `1cd390da feat(api): add drill assignment detail route`
- `5d9a8e04 fix(health): patch uncached injuries through api`
- `0e66e968 docs(api): correct live authority progress report`
- `8492926a fix(family): surface child update api failures`
- `f803cd94 fix(progress): fail closed on prompt reads`
- `7d80255f fix(squad): fail closed on api read errors`
- `67449d5b fix(progress): fail closed on practice task reads`
- `c05dd356 docs(api): regenerate openapi auth profile contract`
- `d2199e39 fix(coaches): remove stale event offering bucket`
- `e14a56e8 fix(calendar): use user-scoped event export authority`
- `5adf02e8 fix(clubs): keep member fixtures out of api mode`
- `95990484 fix(rsvp): keep mock helpers out of api mode`
- `6397c087 fix(roster): keep fixtures out of api mode`
- `740de51d fix(media): keep invite and video fixtures out of api mode`
- `80fd69d3 fix(children): keep profile fixtures out of api mode`
- `bbfb397b fix(safety): keep emergency fixtures out of api mode`
- `0a0f6be0 fix(family): keep demo helpers out of api mode`
- `e346588e fix(config): stop defaulting auth metadata to mock`
- `a18143e8 fix(app): block release mock runtime`
- `2eb63b79 test(api): cover demo account credentials`
- `30c71f87 feat(api): deliver invoice reminders`
- `5ef995df feat(api): deliver club invite emails`
- `9972abe7 feat(api): support email-target club invites`
- `a8e94679 feat(api): accept proof-backed media attachments`
- `a42ba182 docs(api): classify notification creation as backend-owned`
- `e61d45b6 feat(api): search coaches by public location labels`
- `d04a2625 feat(api): add session chat thread membership`
- `244ec90d fix(app): keep child lists out of generic profile edits`
