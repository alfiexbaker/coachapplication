# Data Model and Identifiers (Tables, PKs, FKs, Formats)

## Goals
- Make every entity linkable and auditable
- Keep identifiers consistent across frontend and backend
- Avoid data drift and ambiguous joins
- Support sync-safe writes (later offline sync) from day one

## Identifier Strategy (Primary Keys for Everything)
Use prefixed string IDs generated from UUIDv7 (or ULID if UUIDv7 tooling is not ready).

### Standard
- Column name: `id`
- Type: `text` (phase 1, pragmatic and frontend-friendly)
- Value format: `<prefix>_<uuidv7>`
- Example: `bok_0195f1f8-7f2c-7d3f-9f6a-3b7f0f9f4f2a`

Why `text` PKs now:
- Existing frontend mock services already use string IDs.
- Easier debugging and traceability across logs/UI/tests.
- Low enough scale for acceptable Postgres performance with proper indexes.

### Prefix registry (core)
- `usr_` user (canonical human identity)
- `fam_` family
- `ath_` athlete
- `clb_` club
- `sqd_` squad
- `off_` coaching offering
- `avt_` availability template
- `avo_` availability override
- `bok_` booking
- `bkp_` booking participant
- `gse_` group session
- `gsr_` group session registration
- `wle_` waitlist entry
- `inv_` invite
- `evt_` club event
- `rsv_` RSVP
- `invc_` invoice
- `invl_` invoice line item
- `ine_` invoice event
- `rec_` reconciler entry
- `snt_` session note
- `sfb_` session feedback
- `gol_` goal
- `glm_` goal milestone
- `skd_` skill definition
- `ska_` skill assessment
- `abd_` badge definition
- `aba_` athlete badge award
- `drl_` drill
- `dra_` drill assignment
- `das_` assignment submission
- `med_` media object
- `upl_` upload session
- `vid_` video
- `van_` video annotation
- `pst_` post
- `cmt_` comment
- `thr_` message thread
- `msg_` message
- `nfn_` notification
- `grt_` access grant
- `aev_` audit event
- `sev_` security event
- `saf_` safeguarding incident

## Canonical Identity Linking (Parent, Coach, Athlete, Admin)
This is the key rule to avoid identity chaos.

### Human actors (parent, coach, club_admin, support) -> `users.id`
- Parent/coach/admin are roles, not separate identity systems.
- One human can hold multiple roles at once.
- Role membership is stored in `user_roles`.

Examples:
- `guardian_user_id` -> references `users.id`
- `coach_user_id` -> references `users.id`
- `admin_user_id` -> references `users.id`
- `actor_user_id` -> references `users.id`

### Athlete entity -> `athletes.id`
- `athletes.id` exists even for children without login accounts.
- Optional `athletes.user_id` links self-managed athlete account to a `users.id`.
- This supports both child athletes and athlete users.

### Family container -> `families.id`
- Guardians join families via `family_memberships`
- Guardian<->athlete relationship is explicit in `guardian_child_links`

### Coach profile
Use `coach_profiles.user_id` as PK/FK (recommended).
- Avoid separate `coach_profile_id` identity unless truly needed.
- This prevents duplicate identity joins for coach-owned resources.

## Table Standards (apply broadly)
### Mutable business tables (default)
Required columns:
- `id text primary key`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `created_by_user_id text not null` (FK `users.id`)
- `updated_by_user_id text not null` (FK `users.id`)
- `version bigint not null default 1`
- `deleted_at timestamptz null`
- `deleted_by_user_id text null`

### Append-only history/event tables
Required columns:
- `id text primary key`
- `occurred_at timestamptz not null`
- `actor_user_id text null`
- `request_id text null`
- `metadata_json jsonb not null default '{}'::jsonb`

No updates/deletes except controlled retention/archive on eligible tables.

## Core Tables and Relationships (Condensed)

### Identity / Sessions
- `users`
- `user_profiles` (1:1 `users`)
- `user_roles` (M:1 `users`)
- `user_devices` (M:1 `users`)
- `auth_sessions` (M:1 `users`, M:1 `user_devices`)
- `idempotency_keys` (M:1 `users`)

### Family / Athlete / Consent
- `families`
- `family_memberships` (M:1 `families`, M:1 `users`)
- `athletes` (optional M:1 `users`)
- `guardian_child_links` (M:1 `users`, M:1 `athletes`, M:1 `families`)
- `child_emergency_contacts` (M:1 `athletes`)
- `child_medical_records` (M:1 `athletes`, versioned snapshots recommended)
- `child_sen_tags` (M:1 `athletes`)
- `child_consents` (M:1 `athletes`, M:1 granting `users`)

### Coach / Clubs / Scheduling
- `coach_profiles` (PK = `user_id`)
- `coach_locations` (M:1 `coach_profiles`)
- `coaching_offerings` (M:1 `coach_profiles`)
- `availability_templates` (M:1 `coach_profiles`)
- `availability_overrides` (M:1 `coach_profiles`)
- `blocked_time_ranges` (M:1 `coach_profiles`)
- `scheduling_rules` (1:1 `coach_profiles`)
- `cancellation_policy_rules` (M:1 `coach_profiles`)
- `clubs`
- `club_memberships` (M:1 `clubs`, M:1 `users`)
- `athlete_club_links` (M:1 `clubs`, M:1 `athletes`)
- `squads` (M:1 `clubs`, M:1 owner coach user)
- `squad_memberships` (M:1 `squads`, M:1 `athletes`)

### Booking / Sessions / Events
- `bookings` (M:1 coach user, M:1 offering, optional M:1 club)
- `booking_participants` (M:1 `bookings`, M:1 `athletes`, optional guardian `users`)
- `booking_objectives` (M:1 `bookings`)
- `booking_status_events` (M:1 `bookings`, append-only)
- `booking_change_requests` (M:1 `bookings`)
- `recurring_series` (M:1 coach user)
- `group_sessions` (M:1 coach user, optional squad/series)
- `group_session_registrations` (M:1 `group_sessions`, M:1 `athletes`)
- `waitlist_entries` (M:1 `group_sessions`, M:1 `athletes`)
- `invites`, `invite_targets`
- `club_events`, `event_rsvps`
- `attendance_records`

### Revenue / Reconciler
- `invoices`
- `invoice_line_items` (M:1 `invoices`)
- `invoice_events` (M:1 `invoices`, append-only)
- `reconciler_entries` (M:1 `invoices`, M:1 coach user)
- `payment_instruction_templates`
- `payment_reminders`

### Progress / Development / Media
- `session_notes`
- `session_feedback`
- `coach_reviews`
- `goals`, `goal_milestones`
- `skill_definitions`, `athlete_skill_assessments`, `athlete_skill_rollups`
- `badges`, `athlete_badges`
- `drills`, `drill_assignments`, `assignment_submissions`
- `media_objects`, `upload_sessions`, `malware_scan_results`
- `videos`, `video_annotations`
- `progress_timeline_entries`

### Community / Messaging / Notifications
- `community_groups`, `community_group_memberships`
- `posts`, `post_comments`, `post_reactions`
- `message_threads`, `message_participants`, `messages`, `message_receipts`
- `notifications`, `notification_preferences`, `muted_sources`, `quiet_hours`
- `referral_codes`, `referral_events`

### AuthZ / Grants / Ops
- `access_grants`, `access_grant_scopes`
- `coach_verifications`, `verification_documents`
- `safeguarding_incidents`, `safeguarding_incident_actions`, `safeguarding_incident_parties`, `safeguarding_incident_attachments`
- `audit_events`, `security_events`
- `retention_policies`, `retention_runs`, `legal_holds`, `data_deletion_requests`
- `feature_flags`, `feature_flag_overrides`
- `admin_break_glass_sessions`, `support_actions`
- `outbox_events`

## Data Format Standards (to keep formats stable)
### Dates and times
- API transport: ISO-8601 strings in UTC (`2026-02-26T14:30:00Z`)
- DB storage: `timestamptz`
- Never send locale-formatted date strings in API responses
- Business/local schedule calculations: store timezone IDs (`Europe/London`) on coaches/clubs/users

### Money
- Store money in integer minor units (`amount_minor`, `currency = 'GBP'`)
- Example: `2500` = `GBP 25.00`
- Never store monetary totals as floating point

### Enums and statuses
- Centralize in shared contracts package and Prisma enum definitions
- Do not allow free-text status values in API write DTOs

### Text fields
- Trim and normalize whitespace in handlers
- Preserve user-entered content for notes/messages (except security sanitization)
- Avoid over-normalizing names/medical fields

## Versioning and Sync Safety (required now, offline later)
- Add `version bigint` to mutable tables
- On update, match current version or return `409 CONFLICT`
- Include current `version` in API responses for editable resources
- Soft delete sets `deleted_at`; it does not remove rows (preserves sync and audit references)

## Indexing Checklist (initial)
For each table, index at least:
- primary key `id`
- all foreign keys
- common list filters (`status`, `coach_user_id`, `athlete_id`, `club_id`)
- time columns used for sorting (`created_at`, `scheduled_start_at`, `occurred_at`)
- unique business constraints (`auth_provider_subject`, invoice numbers, etc.)

## Partitioning Guidance (phase-based)
Start without broad partitioning. Add early for:
- `audit_events` (monthly partitions)

Add later if needed:
- `messages`
- `notifications`
- `security_events`

## Naming Conventions (FK columns)
Use explicit names:
- `coach_user_id`, `guardian_user_id`, `actor_user_id`, `created_by_user_id`
- `athlete_id`, `club_id`, `booking_id`, `group_session_id`
- Avoid generic `userId`/`parentId` in DB schema; reserve camelCase for TS DTOs only
