# Clubroom API Feature System Report

Generated: 2026-07-03
Scope: current `/v1` API authority, app feature mapping, database relationship shape, mock/API drift, and known gaps.

## Executive Status

This is not 100% production-complete yet. The codebase is making real progress toward a backend-authoritative product, but a Google-level bar still requires more end-to-end verification, Supabase live DB validation, and closing the remaining legacy local-state surfaces.

Current practical estimate:

- API authority coverage: about 70%
- Security/audit posture: improving, not complete
- Full app flow confidence: not high enough to call complete
- Swagger/OpenAPI: usable, not yet polished to a high-quality public standard
- Payouts/payments: intentionally simulated provider flow, API-backed state, no real money movement

Recent hardening decisions:

- API-mode booking create/status/reminder notification overlays are mock-only.
- API-mode local notification triggers are mock-only.
- Club UI actions are gated by active grants.
- Match squad invites in API mode use real `/v1/matches/:matchId/players/invite` and skip local notifications.
- Event squad invite fan-out now uses `/v1/events/:eventId/invites/squads` to notify primary guardians for active athletes in selected event-club squads.
- Event specific-athlete targeting now uses `/v1/events/:eventId/invites/athletes`, stamps athlete-scoped event metadata/visibility, notifies linked athlete accounts and guardians, and blocks non-target club-member reads.

## Category Matrix

| Category | Subcategory | Current authority | Main relationships | Status | Gaps / decisions |
| --- | --- | --- | --- | --- | --- |
| Auth and identity | Login/register/session/me/password reset | `/v1/auth/*`, `/v1/me*` | `User` 1:N `UserRoleMembership`, `AuthSession`; `User` 1:1 `CoachProfile` | Strong | Need live Supabase credential/test-user verification. |
| Family and athletes | Families, guardians, athlete CRUD | `/v1/families*`, `/v1/athletes*` | `Family` 1:N `FamilyMembership`; guardian-to-athlete via `GuardianChildLink`; `Athlete` optionally links to `User` | Strong | E2E app flow validation still needed. |
| Medical and consent | Injuries, medical, emergency contacts, consents | `/v1/athletes/:id/*` | `Athlete` 1:N sensitive records | Strong | Keep default-deny and audit-sensitive reads/writes. |
| Clubs and academy | Club org, members, invite codes, branding | `/v1/clubs*` | `Club` 1:N `ClubMembership`, events, matches, sessions | Strong | Product treats club and academy as same organisation until a future spec separates them. |
| Club staffing | Assignments, grants, head-coach oversight | `/v1/clubs/:clubId/*` staffing/oversight routes | `Club` 1:N work assignments/tasks; users are staff via memberships/grants | Medium/strong | Continue grant-by-grant UI audit. |
| Booking | Direct bookings, lifecycle, status | `/v1/bookings*` | `Booking` links coach, booker, athletes via `BookingParticipant`; 1:N `BookingStatusEvent` | Medium/strong | Some routes still labelled scaffolded but app is API-first. Need deeper E2E run. |
| Recurring bookings | Multi-week/series lifecycle | `/v1/booking-series*` | Series 1:N bookings | Strong | Existing mock generated-booking paths are mock-only. |
| Group sessions | Create/publish/cancel/register/roster/attendance | `/v1/group-sessions*`, `/v1/group-session-registrations*` | `GroupSession` 1:N registrations, RSVPs, linked bookings/invoices | Strong | Waitlist remains planned. |
| Session invites | Direct invite lifecycle and responses | `/v1/invites*` | `Invite` 1:N `InviteTarget`; target may be athlete-scoped | Medium | Some invite routes are still scaffolded but backed by DB adapter. |
| Event CRUD | Events, publish, club/squad/specific-athlete invite | `/v1/clubs/:clubId/events`, `/v1/events/:id`, `/v1/events/:id/invites/club`, `/v1/events/:id/invites/squads`, `/v1/events/:id/invites/athletes` | `ClubEvent` belongs to `Club`; target athlete IDs are currently stored in `metadataJson`; 1:N RSVP/attendance | Medium/strong | Dedicated event-target table deferred until product needs target history beyond audit/notification metadata. |
| Event RSVP/attendance | RSVP, reminders, check-ins | `/v1/events/:id/rsvp*`, `/v1/events/:id/attendance*` | `ClubEvent` 1:N `EventRSVP`, `EventAttendance` | Strong | Reminder fan-out is backend notification rows in API mode. |
| Matches | Match create/invite/respond/lineup/result | `/v1/clubs/:clubId/matches`, `/v1/matches/:id/*` | `ClubMatch` 1:N `ClubMatchPlayer`; optional squad link | Strong | API mode skips local squad invite rows. |
| Payments and invoices | Invoice lifecycle, payment attempts | `/v1/invoices*` | `Invoice` 1:N line items/events/payment attempts | Medium/strong | Provider is simulated. No real hosted payment provider cutover yet. |
| Payouts | Payout methods and withdrawals | `/v1/coaches/me/payout-methods*`, `/v1/coaches/me/withdrawals*` | `CoachPayoutMethod` 1:N `CoachWithdrawal` | Strong for simulated mode | Completion is simulated only; no money ledger or provider-backed settlement. |
| Notifications | Reads, dismiss, clear, preferences | `/v1/me/notifications*` | `Notification` belongs to recipient `User`; preferences self-scoped | Medium | Unsupported local create/handled overlays remain compatibility-only; more direct call sites need review. |
| Audit and trust | Audit events, safeguarding, removals | `/v1/safeguarding*`, repository audit events | `AuditEvent` references actor/resource; `SafeguardingIncident` 1:N actions | Medium/strong | Continue checking all sensitive reads/writes produce audit events. |
| Progress and development | Goals, logs, self-assessments, drills, feedback | Several `/v1/progress*` and athlete/session routes | Progress rows attach to athlete/coach/booking/session explicitly | Medium | Some synthesis/read-model features still need dedicated DB shape. |
| Media | Videos, annotations, sharing | `/v1/videos*` and related media contracts | `Video` 1:N `VideoAnnotation`, `VideoShare` | Medium | Verify storage/signing and UI E2E. |
| Community/social | Groups, feed, follows, comments | Mixed `/v1` and legacy services | Parent/community groups and follows are social graph overlays | Medium | `GENERAL`/`CLUB`/private `SQUAD` group create, public join/leave, join approval requests, direct member add, member role update, owner transfer, member soft-remove, group archive, and normal invites now use `/v1/community-groups*`; session group authority still needs a dedicated API. |
| Swagger/OpenAPI | Docs and route JSON | `/v1/openapi.json`, `/v1/docs` | Route inventory to OpenAPI generator | Usable | Needs stricter tags, operation naming, examples, error schemas, auth docs, and public-facing cleanup. |

## Database Relationship Summary

Core one-to-many and many-to-many shape:

- `User` 1:N `UserRoleMembership`, `AuthSession`, `Notification`, `AuditEvent` actor references.
- `User` 1:1 `CoachProfile` when operating as a coach.
- `Family` 1:N `FamilyMembership`; guardians reach athletes through explicit guardian-child links.
- `Athlete` 1:N injuries, medical/consent records, practice logs, goals, assessments, submissions.
- `Club` 1:N `ClubMembership`, `ClubEvent`, `ClubMatch`, `GroupSession`, invite codes, staffing/oversight records.
- `Booking` 1:N `BookingParticipant`, `BookingStatusEvent`, objectives, invoices/status changes.
- `GroupSession` 1:N registrations and RSVPs; registrations can link to booking/invoice authority.
- `Invite` 1:N `InviteTarget`; responses are per target and may be athlete-scoped.
- `ClubEvent` 1:N RSVPs and attendance records.
- `ClubMatch` 1:N `ClubMatchPlayer`.
- `Invoice` 1:N line items, invoice events, and payment attempts.
- `CoachPayoutMethod` 1:N `CoachWithdrawal`.
- `Video` 1:N annotations and shares.
- `SafeguardingIncident` 1:N incident actions.

Relationship rules that matter:

- Club membership alone does not grant coach-private, medical, safeguarding, or finance access.
- Assignment controls visibility; access is not transitive.
- Assistant access is narrower than coach access unless a grant explicitly widens it.
- Soft removal/audit wording is preferred over destructive delete semantics for trust-sensitive records.
- Academy currently means club/organisation compatibility, not a separate live authority.

## Known Missing APIs / Product Decisions Needed

1. Specific-athlete event targeting.
   - Current safe behavior: API mode blocks it rather than broadening to all athletes.
   - Needed: event target table or explicit event invite target contract.

2. Community group membership expansion authority.
   - Current safe behavior: API mode uses `/v1` for group create, private squad group create, public join/leave, join approval request create/list/approve/reject, direct member add, role update, owner transfer, member soft-remove, group archive, and normal invites; session group writes fail closed instead of writing local overlays.
   - Needed: session group membership and notification routes with audit.

3. Public-grade Swagger polish.
   - Current state: route inventory-backed docs exist.
   - Needed: consistent operation IDs, tags, examples, auth schemes, error schemas, and generated schema cleanup.

4. Live Supabase verification.
   - Current state: Prisma/Postgres schema and migrations exist.
   - Limitation: Supabase MCP was not exposed as a callable tool in this session, so live project/table verification is still pending.

5. Test users and credentials.
   - Current local artifact: ignored fixture-derived credentials at `docs/backend-api/test-data/TEST_ACCOUNTS.local.txt`.
   - Current staging artifact: ignored DB-derived credentials at `docs/backend-api/test-data/TEST_ACCOUNTS.staging.local.txt`.
   - Existing live authority report says staging reset verified salted `scrypt` hashes and attached coach accounts.
   - Security rule: do not store production secrets or reusable real credentials in repo-tracked plaintext.

## Verification Run During This Pass

- `npm run test:compile`
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/booking/booking-status-service.test.js`
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/invite/event-invite-service.test.js .tmp-tests/__tests__/services/invite/match-invite-service.test.js`
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/services/earnings/payout-api-mode.test.js`
- `npm run audit:api-boundaries`
- `git diff --check` on changed slices

## Bottom Line

We are not just hacking until it looks green. The current work is removing half-real API paths, documenting when no backend contract exists, and keeping simulated money flows explicit. The remaining risk is not one single bug; it is the set of legacy local surfaces that still need either real `/v1` routes or clear fail-closed behavior.
