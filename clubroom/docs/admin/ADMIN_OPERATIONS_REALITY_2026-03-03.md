# Admin Operations Reality (Codebase Audit)

Date: 2026-03-03
Scope: actual app behavior in this repo (routes + services + storage), not desired-state only.

## Update: 2026-03-04

Latest retained validation confirms:

- the Expo app remains a broad multi-role runtime
- the Fastify API package at `apps/api` is real and testable
- API auth still uses placeholder scaffold logic pending production auth hardening

Admin-specific reality is still fundamentally unchanged from 2026-03-03:

- no unified internal support/moderation/fraud console
- no immutable audit ledger operating in production path
- no break-glass + step-up workflow implementation
- API auth remains placeholder scaffold (`auth-placeholder`) pending production authn/authz hardening

## 1) What The App Actually Does Today

At runtime, Clubroom is a multi-role app with broad product coverage and mock/local persistence:
- 183 route files under `app/`
- 133 service files under `services/`
- 156 centralized storage keys in `constants/storage-keys.ts`
- Primary persistence via `apiClient` + AsyncStorage keys

Core functional areas currently implemented:
- coach operations (schedule, bookings, roster, invites, earnings, club/academy)
- parent/athlete booking and progress tracking
- verification self-service flows (ID/background/credentials/insurance)
- concern/report capture and safeguarding event emission
- club/academy member role and invite management

## 2) Current "Admin" Surface (What Workers Can See In UI)

Implemented UI surfaces for admin/staff users are limited:
- Admin home shows high-level user counts only (`components/admin/users-screen.tsx`)
- Admin invite code screen exists (`app/(tabs)/admin/invite-codes.tsx`)
- `/manage` and `/manage/bookings` are coach-ops tools also accessible to admin users

Important note:
- there is no full internal support/moderation/fraud console yet
- route constants include `/admin/promo-codes` paths, but corresponding route files are missing

## 3) Data Inventory Relevant To Admin Operations

High-value operational datasets already exist in storage keys:
- user/account/auth: `USERS`, `AUTH_USER`, `AUTH_TOKEN`, `AUTH_TOKENS`
- booking/ops: `BOOKINGS`, `SESSION_OFFERINGS`, `SESSION_INVITES`
- trust/safety: `REPORTS`, `PROBLEM_REPORTS`, `CONCERNS`, `BLOCKED_USERS`, `VERIFICATION`
- child safety: `EMERGENCY_INFO`, `FAMILY_MEMBERS`, `CHILDREN_PROFILES`, `COACH_OBSERVATIONS`
- financial: `INVOICES`, `EARNINGS`, `PAYOUT_METHODS`, wallet/transactions
- organization/team: `CLUB_MEMBERS`, `CLUB_MEMBER_REMOVALS`, `ACADEMY_MEMBERSHIPS`, `ACADEMY_INVITES`
- retention/lifecycle: `DATA_RETENTION_POLICIES`, `ARCHIVE_PREFIX`, `ACCOUNT_DELETION_PREFIX`

## 4) Admin-Critical Actions Already Implemented In Services

These exist today in service logic, but are not consolidated into one staff console:
- user block/unblock + block checks (`block-service.ts`)
- report intake + serious-category auto-block + safeguarding event emission (`report-service.ts`)
- concern intake + auto-escalation + parent notification + report mirroring (`concern-service.ts`)
- verification status updates, approvals (mock), expiry checks, expiring-soon signals (`verification-service.ts`)
- emergency data access checks and per-athlete access logs (`safety-service.ts`)
- data retention archive/restore and warning emissions (`data-retention-service.ts`)
- club membership controls: remove, undo removal, ban, change role, squad assignment (`club-service.ts`)
- academy staff controls: invite, join by code, role update, membership suspension (`academy-service.ts`)
- account deletion request/cancel (self-service flow) (`use-account-settings.ts`)

## 5) Security Controls Already Present

Current positives:
- role checks and scoped behavior across many flows
- DBS gate in booking creation path for under-18 scenarios (`booking-crud-service.ts`)
- minor visibility filtering in user search (`user-service.ts`)
- event bus emits for safeguarding, verification expiry, retention warnings
- some access auditing for emergency-data reads

## 6) Critical Gaps (What Admin Workers Still Cannot Reliably Do)

P0 gaps:
- no unified worker queue for support/moderation/fraud/verification incidents
- no global user suspension lifecycle (temporary/permanent, reason, reviewer, expiry)
- no centralized immutable audit ledger (only per-athlete emergency access logs + transient events)
- no break-glass workflow with MFA/timebox/audited scope
- no legal hold enforcement model connected to retention/deletion

P1 gaps:
- reports split across separate stores (`REPORTS` and `PROBLEM_REPORTS`) with no unified case timeline
- no dedicated verification reviewer workbench for staff actions and SLAs
- no system-health incident console for outage coordination
- no explicit staff role model (`support`, `moderator`, `risk`, `ops`, `security_admin`) in app runtime

P2 gaps:
- orphan route constants (`/admin/promo-codes`) without screens
- no compliance export workflow for investigations
- no staff tooling for cross-domain evidence bundle assembly

## 7) Sorted Admin Capability Model (Build Order)

### Tier 1 (Immediate)
- Support Queue + User 360
- Unified Case model linking `REPORTS`, `PROBLEM_REPORTS`, `CONCERNS`, booking and verification context
- Account action controls: suspend/reactivate/restrict (global, auditable, with reason codes)
- Team management consolidation: add/remove user to club/academy/squad with policy checks

### Tier 2 (Trust + Abuse)
- Verification Workbench for staff reviewers (approve/reject/resubmit/escalate)
- Moderation Queue for content and safeguarding-linked actions
- Fraud/Risk queue using blocking signals, velocity and linked-account indicators

### Tier 3 (Ops + Compliance)
- Reliability Incident Console (site-down workflows)
- Separate append-only audit ledger database with ingestion from app/admin actions
- Retention/legal-hold operations + compliance exports

## 8) What An Admin Account Should Be Able To Do (Sorted By Role)

Support Agent:
- search user, booking, invite, verification
- view safe user-360 data
- create/assign/escalate support cases
- request (not directly execute) suspension actions

Moderator/Safeguarding:
- triage reports and concerns
- apply content/account restrictions per policy
- escalate severe cases and track outcomes

Risk Analyst:
- review abuse/fraud signals
- place temporary holds/restrictions
- unblock/clear with reviewer notes and SLA tracking

Ops/Incident Manager:
- monitor system health
- open/coordinate incidents
- communicate status internally and externally

Security/Compliance Admin:
- manage legal holds and retention runs
- run audit evidence exports
- execute break-glass with MFA + full audit

## 9) Audit Log Architecture Recommendation (For This App)

Use two data planes:
- Operational Plane: existing app/admin stores (mutable business state)
- Audit Plane: separate append-only audit ledger DB (immutable evidence)

Minimum event envelope:
- event_id, occurred_at, actor_id, acting_role, action, resource_type, resource_id, result
- request_id/correlation_id
- subject_user_id (if applicable)
- metadata_json (reason code, case id, policy id)

Write strategy:
- write action -> append audit outbox in operational DB -> forward to ledger DB
- ledger DB append-only permissions; no update/delete for app roles
- legal hold flags prevent retention/deletion jobs from purging applicable records

## 10) Recommendation Summary

This codebase already contains many admin-relevant building blocks in services and storage,
but they are fragmented across product surfaces. The highest-value move is to unify these
into a case-based operations console with strict staff role separation and immutable auditability.

Related retained docs:
- `docs/trust/auth-and-permission-boundaries.md`
- `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`
- `docs/backend-api/ARCHITECTURE_BLUEPRINT.md`
