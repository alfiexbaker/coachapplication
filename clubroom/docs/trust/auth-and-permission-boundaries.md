# Auth And Permission Boundaries

Validated: 2026-04-12
Purpose: state what is enforced today, what is design truth, and where auth and permission work is still incomplete.

## Canonical Sources

- `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`
- `docs/product-reality/ORG_PERMISSION_AND_VISIBILITY_MATRIX_2026-03-10.md`
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
- App `/v1` authority services now rely on bearer auth plus `x-acting-role` and scoped relationship headers instead of client-supplied identity headers
- `/v1/auth/login`, `/v1/auth/register`, `/v1/auth/refresh`, `/v1/auth/logout`, `/v1/auth/revoke`, and `/v1/auth/me` now run on the JWT/session runtime
- `/v1/me/sessions`, `/v1/me/sessions/revoke-all`, and `/v1/me/sessions/:sessionId/revoke` now expose the same runtime session registry used by bearer auth
- Runtime bearer auth now accepts configured external OIDC/JWKS access tokens and maps them onto local users and granted roles
- Persisted `audit_events` and `security_events` now record auth/session actions, sensitive reads and writes, deny paths, and internal errors for the current trust/commercial routes
- Bearer-authenticated requests no longer honor forged `x-guardian-athlete-ids`, `x-coach-athlete-ids`, or `x-coach-verified` headers; those debug trust headers are restricted to the explicit API harness override mode
- Safeguarding incidents now persist through a repository-backed runtime path instead of route-local memory
- Remaining club and trust-sensitive admin checks now centralize in `apps/api/src/lib/authz.ts` instead of being hand-coded per route
- privileged admin access is currently `club_admin`, `admin`, or `security_admin`; staff invite-link eligibility is `coach` plus the privileged admin roles
- `/v1/clubs`, `/v1/clubs/join`, `/v1/families/:familyId`, `/v1/invoices/*`, `/v1/access-grants`, `/v1/admin/retention-runs`, and the affected booking invite/group-session routes now use that shared backend role decision instead of local route drift

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
- The parent edit-child-profile modal now treats medical, emergency, and consent changes as protected health flows and routes users to the dedicated child health screens instead of writing those fields into the child profile object.
- Booking creation in non-mock mode is now fail-closed through `/v1/bookings`; guardian or delegated requests either pass backend relationship authz or fail, instead of silently persisting a local-only booking.
- This closes the transport mismatch, the runtime scaffold-header fallback, the temporary dev-session model, issuer-grade bearer validation, persisted audit/security logging for the current trust seams, and the remaining duplicated privileged-admin checks in the current `/v1` trust/commercial routes. Broader backend authorization coverage is still incomplete beyond these runtime-owned paths.
