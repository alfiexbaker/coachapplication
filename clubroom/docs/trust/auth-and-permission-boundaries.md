# Auth And Permission Boundaries

Validated: 2026-07-05
Purpose: state what is enforced today, what is design truth, and where auth and permission work is still incomplete.

## Canonical Sources

- `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`
- `components/auth/route-access-gate.tsx`
- `hooks/use-auth.tsx`
- `services/auth-service.ts`
- `apps/api/src/lib/authz.ts`
- `apps/api/src/plugins/auth-context.ts`

## Frontend Boundary

Current frontend access control is a combination of:

- auth state from `hooks/use-auth.tsx`
- route redirection via `components/auth/route-access-gate.tsx`
- service-level checks and role-aware UI branching
- native token storage in `expo-secure-store`, with web tokens scoped to browser `sessionStorage` so a same-tab reload can restore bearer auth

Rule:

- Route gating prevents unauthorized content flash.
- It is a UX guard, not a full security boundary.

## Backend Boundary

Current backend authorization has two layers:

- bearer-first auth context from `apps/api/src/plugins/auth-context.ts`
- route-level and helper checks in `apps/api/src/lib/authz.ts`

Validated reality:

- runtime auth now resolves identity from signed bearer JWTs that are verified by `apps/api/src/plugins/auth-context.ts`
- `/v1/auth/*` issues short-lived access tokens and refresh tokens, and runtime `/v1/me/sessions*` reads the same auth session registry
- `x-auth-user-id` and `x-auth-roles` override is now test-only through the API harness, not the app/server runtime
- runtime auth is no longer the temporary dev-session model

## What Is Real Today

- Frontend role-aware navigation and redirects exist
- Backend test coverage exists for several authz-sensitive routes
- Trust and medical access rules now resolve through backend authz helpers plus repository-backed relationship checks
- Athlete self-access is resolved from the athlete record's linked `userId`; authz must not assume `athlete.id` is mechanically derived from `user.id`
- App `/v1` authority services now rely on bearer auth plus `x-acting-role` and scoped relationship headers instead of client-supplied identity headers
- `/v1/auth/login`, `/v1/auth/register`, `/v1/auth/refresh`, `/v1/auth/logout`, `/v1/auth/revoke`, and `/v1/auth/me` now run on the JWT/session runtime
- In API mode the frontend may keep demo username-to-email metadata for convenience, but it must not carry demo plaintext passwords or retain the typed password on the mapped current user; credentials live in ignored test-account files and hashed `/v1` credentials
- `/v1/me/sessions`, `/v1/me/sessions/revoke-all`, and `/v1/me/sessions/:sessionId/revoke` now expose the same runtime session registry used by bearer auth
- Runtime bearer auth now accepts configured external OIDC/JWKS access tokens and maps them onto local users and granted roles
- Persisted `audit_events` and `security_events` now record auth/session actions, sensitive reads and writes, deny paths, and internal errors for the current trust/commercial routes
- Bearer-authenticated requests no longer honor forged `x-guardian-athlete-ids`, `x-coach-athlete-ids`, or `x-coach-verified` headers; those debug trust headers are restricted to the explicit API harness override mode
- Safeguarding incidents now persist through a repository-backed runtime path instead of route-local memory
- Remaining club and trust-sensitive admin checks now centralize in `apps/api/src/lib/authz.ts` instead of being hand-coded per route
- privileged admin access is currently `club_admin`, `admin`, or `security_admin`; staff invite-link eligibility is `coach` plus the privileged admin roles
- `/v1/clubs`, `/v1/clubs/join`, `/v1/families/:familyId`, `/v1/invoices/*`, `/v1/access-grants`, `/v1/admin/retention-runs`, and the affected booking invite/group-session routes now use that shared backend role decision instead of local route drift
- coach verification status is private to the coach and platform `admin` / `security_admin` reviewers; another coach, parent, athlete, or club admin cannot read it, and denied reads are audited
- the app `/verification` route group renders only for signed-in coach-role accounts; non-coach roles are redirected before a status request, while the API boundary remains authoritative
- coach verification evidence must be coach-owned, private, available, malware-clean, non-empty, no larger than 20 MiB, and one of PDF, JPEG, PNG, WebP, or HEIC; the API rechecks these constraints before linking the media object to a verification record
- creating an athlete in a family requires family owner/admin authority, primary-guardian authority, or an explicit `admin` family permission; ordinary membership or assignment to an existing child is insufficient, and denied creates are audited without adding an `Athlete` or `GuardianChildLink`
- the app resolves the same family-admin capability before rendering `/add-child` or its entry actions; this prevents dead controls and content flash, while `POST /v1/athletes` remains the authoritative boundary
- `/family`, `/family/calendar`, `/family/recurring`, and `/children` resolve the canonical linked-family context rule before family reads, child-creation controls, or mutations; ineligible actors receive a terminal unavailable state or role-appropriate redirect rather than a family-data read, booking CTA, recurring-plan read, child-management control, or recurring mutation, while the API remains authoritative for eligible family reads and booking-series mutations
- unresolved child photo, video, social-media, and emergency-treatment consent is denied across child creation, profile hydration, API normalization, and both family-athlete repositories; only an authorised guardian write can grant consent, and `consents.update` audit events record the resulting granted and denied types
- Add Child sends profile, medical, emergency-contact, and consent data through one `POST /v1/athletes` command; the seed repository removes every inserted row on failure, while the Prisma repository writes the complete bundle and returns its response row from one transaction, so neither a protected-data failure nor a post-commit projection read can leave a created athlete behind while reporting failure
- direct child medical and emergency routes prove the current actor's child-management authority before reading or mutating protected records; unavailable states have no retry or contact action, while a linked guardian retains the dedicated medical and emergency controls
- `/roster/:athleteId` and `/roster/:athleteId/emergency` prove verified coach status and a coach-owned roster entry before they ask for emergency data; unauthorised reads cannot fall back to cached data and end with no retry, while an authorised coach receives the complete medical-alert list and emergency-call controls
- `/roster/:athleteId/health` proves verified coach status and roster membership before it reads the coach injury projection; injury sharing defaults to deny in storage and the API returns only explicitly shared records (or a coach's own record), never family-private notes or a broad guardian injury record, and an unavailable player receives no retry
- `/roster/:athleteId/raise-concern` proves verified coach status before it resolves a player or renders the concern form; the same assigned-coach rule is authoritative at `POST /v1/safeguarding/incidents`, and both denied and successful attempts are audited
- `/roster/consents` is coach-only in both the app and API: a direct non-coach route ends without a retry or consent rows, while the coach view exposes labelled controls and presents partial or absent consent as warning or error rather than a false success signal

## What Is Still Design Truth, Not Full Runtime Truth

- full device metadata management across app and API
- production-grade grant resolution and repository filtering for every remaining sensitive route beyond the current runtime-owned paths
- complete audit coverage for every remaining sensitive route outside the current auth, family-athlete, safeguarding, and invoice/admin trust seams

## Safe Interpretation For Agents

1. Treat `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md` as the target enforcement model.
2. Treat current frontend route guards as presentation safety, not final security.
3. Treat current backend auth as JWT-backed runtime auth with test-only header override, and keep closing route-level authz gaps from here.
4. When changing sensitive flows, check both:
   - who can see it in the UI
   - who can read or write it at the API boundary

## Highest-Risk Areas

- child medical and emergency data
- safeguarding incidents
- coach verification state
- org-wide visibility into child or coach-private data
- booking and invoice actions that imply commercial ownership

## Validation Notes

- The frontend auth client now calls `/v1/auth/*`.
- The backend app exposes matching `/v1/auth/*` routes, issues/validates JWTs, supports external OIDC/JWKS bearer validation, and now supports self-session revocation via `/v1/me/sessions*`.
- Runtime `/v1` auth no longer falls back to `x-auth-*` identity headers outside the API test harness.
- Runtime `/v1` auth also no longer trusts forged relationship debug headers on bearer-authenticated requests.
- Audit and security events now persist through the shared runtime instead of route-local side effects.
- Child medical, emergency-contact, and consent writes no longer persist through `services/child-service.ts`; those records now flow through `services/safety-service.ts` -> `services/family/family-health-service.ts` -> `/v1/athletes/*`.
- Child consent fallbacks are default-deny in the shared app service and API mapping. The family-athlete route/repository tests prove missing rows are denied, explicit guardian grants and revocations supersede prior rows, and both resulting states are recorded in `AuditEvent` metadata.
- Child creation no longer performs protected medical/contact/consent writes after the athlete create response. The bundled create path records the sensitive write events on success and an `athlete.create` error event on rollback; isolated failure injection proves zero residual athlete, guardian-link, support-tag, medical, contact, or consent rows.
- The edit-child-profile modal owns only basic identity and football-position fields. In API mode it proves explicit `MANAGE_PROFILE`/`ADMIN` permission plus assignment before fetching or rendering a player; medical, emergency, consent, support, and coaching-note changes remain in their dedicated protected flows. The Fastify athlete patch independently enforces family-athlete manage access, rejects surplus or malformed fields, and records success or denial metadata without request values.
- The player-support modal proves the same assigned `MANAGE_PROFILE`/`ADMIN` authority before fetching support data. Condition, adjustment, communication, and regulation changes stay local until one explicit athlete patch; the backend validates bounded strict nested data, updates detailed support plus current `ChildSenTag` rows in one repository transaction, projects legacy tag-only records for safe migration, and audits only changed field names or denial codes.
- Booking creation in non-mock mode is now fail-closed through `/v1/bookings`; guardian or delegated requests either pass backend relationship authz or fail, instead of silently persisting a local-only booking.
- This closes the transport mismatch, the runtime scaffold-header fallback, the temporary dev-session model, issuer-grade bearer validation, persisted audit/security logging for the current trust seams, and the remaining duplicated privileged-admin checks in the current `/v1` trust/commercial routes. Broader backend authorization coverage is still incomplete beyond these runtime-owned paths.
