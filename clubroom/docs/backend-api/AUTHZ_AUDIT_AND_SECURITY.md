# AuthZ, Audit, and Security Model

## Core Requirement
Clubroom's API must enforce access with four layers together:
1. role-based auth (`coach`, `parent`, `athlete`, `club_admin`, etc.)
2. delegated permissions (club leaders/admins only where explicitly granted)
3. resource-scoped grants (coach A shares with coach B)
4. hard safety gates (consent, verification, safeguarding, retention/legal hold)

This is not optional. RBAC alone is insufficient for Clubroom.

## AuthN vs AuthZ (separation of concerns)
- Auth0 handles identity/authentication (who the user is)
- Clubroom API handles authorization (what they may do)
- Clubroom API also handles audit trail, retention, and legal-hold-aware access rules

## Base Role Model (RBAC)
Roles are stored in `user_roles` and may overlap for the same `user_id`.

Expected roles:
- `coach`
- `parent`
- `athlete`
- `club_admin`
- `club_staff` (optional split from admin)
- `support`
- `security_admin`

### Acting role
If a user has multiple roles, sensitive endpoints should require an explicit acting role header/field (`X-Acting-Role`).
This prevents accidental cross-role privilege leakage.

## Delegated Permissions and Resource-Scoped Grants
### Why both exist
- Delegated permissions solve: "club admin can manage some coach resources only when granted"
- Resource-scoped grants solve: "coach A shares athlete notes with coach B for one athlete / one time window"

### `access_grants` model (concept)
Each grant includes:
- `grantor_user_id`
- `grantee_user_id`
- `resource_type` (e.g., `coach_scope`, `athlete_progress`, `session_note`)
- `resource_id` (nullable depending on scope)
- `constraints_json` (club, athlete, coach, squads, date bounds)
- `expires_at` (nullable but preferred)
- `revoked_at`
- `created_at`

### `access_grant_scopes`
Examples:
- `availability.read`
- `availability.manage`
- `booking.read`
- `booking.reconcile`
- `roster.read`
- `session_notes.read_public`
- `session_notes.read_private`
- `progress.read_private`

### Hard rules
- Grants are allow-only, no transitive inheritance
- Grants are revocable immediately
- Grants are time-bound where practical
- Every create/update/revoke is audited
- Club membership does not imply coach-private access
- Coach-to-coach private notes access requires explicit scope (`session_notes.read_private` and/or `progress.read_private`)

## AuthZ Evaluation Flow (every protected request)
1. Authenticate JWT and load local `user_id`
2. Resolve acting role
3. Load route policy (required base role(s), scopes, safety gates)
4. Resolve resource relationship:
   - owner
   - guardian of athlete
   - athlete self
   - participant
   - club member/admin
5. Load applicable grants (`access_grants`) if base role alone is insufficient
6. Apply hard gates:
   - consent checks
   - DBS/verification checks
   - safeguarding restrictions
   - legal hold constraints (for destructive actions)
7. Apply repository filters for list endpoints (prevent overfetch)
8. Log audit event (and security event if deny/abuse/risk)

## Repository Filters Are Mandatory
Do not rely on handler-level authz only.

For list/read queries, repository filters must enforce the same scope rules as single-resource checks, otherwise data can leak through search/list endpoints.

Examples of common leaks to prevent:
- club admin listing all coach private notes without grant
- coach listing medical fields for non-roster athletes
- parent seeing invoices for unrelated bookings
- message thread listing without participant membership filter

## Audit Model (global append-only)
### What gets audited
- Every write action (create/update/soft-delete/status transition)
- Grant create/revoke/change
- Authentication/session actions (login/logout/revoke-all)
- Sensitive reads (medical, emergency, SEN, safeguarding, private notes, financial details)
- Admin/support actions and break-glass usage

### `audit_events` fields (minimum)
- `id`
- `occurred_at`
- `request_id`
- `actor_user_id`
- `acting_role`
- `action` (stable string e.g. `booking.cancelled`, `medical.read`)
- `resource_type`
- `resource_id`
- `subject_user_id` (if action targets another person)
- `result` (`SUCCESS`, `DENY`, `ERROR`)
- `ip_hash` (avoid raw IP in logs where possible)
- `metadata_json`

### Retention and immutability
- `audit_events` is append-only
- no hard delete while policy active or legal hold applies
- partition by month (recommended early)
- archive/retention jobs write their own audit events

## Security Event Model (`security_events`)
Use this separately from business audit events for alerting and detection.

Examples:
- repeated authz denials on sensitive endpoints
- rate limit blocks
- malware scan positives
- signed URL abuse attempts
- break-glass session started/expired
- unusual session/device churn

## Required Security Controls (mapped from accepted posture)
### S1-S3: Tokens, sessions, validation
- JWT access + refresh rotation (Auth0 compatible)
- device/session tracking + revoke all sessions
- strict schema validation on every request

### S4-S5: Authorization and audit
- authz checks in service layer and repository filters
- audit logs for child/safeguarding/payment/invoice actions (plus sensitive reads)

### S6-S7: Abuse and write safety
- rate limiting by IP + user + endpoint class
- idempotency keys required for writes (booking, RSVP, mark-paid, invites, etc.)

### S8-S9: Storage security
- signed URLs only for object storage
- malware scanning pipeline with quarantine before publish

### S10-S12: Retention, alerting, admin control
- soft delete + retention windows + legal hold hooks
- structured security events + alerting
- admin impersonation disabled by default; break-glass only, fully audited

## Break-Glass Access (disabled by default)
If support/admin emergency access is ever enabled:
- require MFA
- require reason code and free-text justification
- create time-boxed `admin_break_glass_sessions`
- restrict scope (specific case/user/resource)
- banner/watermark in tools
- audit every read/write action during session
- automatic expiry + forced review log

## Safeguarding and Medical Data Gates (special category)
Sensitive categories require extra controls even when role/grant checks pass:
- `child_medical_records`
- `child_emergency_contacts`
- `child_sen_tags`
- `safeguarding_incidents` and related tables
- private coach notes touching safeguarding/medical topics

Additional gates:
- consent validation where applicable
- coach verification checks (e.g., DBS status) for certain reads
- heightened audit logging (`sensitive_read = true` metadata)
- stricter rate limits and alerting thresholds

## Practical Review Checklist for AuthZ Changes
- Which role(s) can access this route?
- Is access direct, delegated, or shared?
- What exact resource scopes are required?
- What list filters prevent overfetch?
- What sensitive read/write audit event is emitted?
- What happens after grant expiry/revoke?
- What happens if user changes role mid-session?
- Are denial paths tested?
