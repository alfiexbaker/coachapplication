# Auth And Permission Boundaries

Validated: 2026-04-03
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
- Trust and medical access rules are partially modeled in backend authz helpers
- App `/v1` authority services now rely on bearer auth plus `x-acting-role` and scoped relationship headers instead of client-supplied identity headers
- `/v1/auth/login`, `/v1/auth/register`, `/v1/auth/refresh`, `/v1/auth/logout`, `/v1/auth/revoke`, and `/v1/auth/me` now run on the JWT/session runtime
- `/v1/me/sessions`, `/v1/me/sessions/revoke-all`, and `/v1/me/sessions/:sessionId/revoke` now expose the same runtime session registry used by bearer auth

## What Is Still Design Truth, Not Full Runtime Truth

- Auth0-backed JWT validation
- full device metadata management across app and API
- production-grade grant resolution and audit coverage for every sensitive route

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
- The backend app exposes matching `/v1/auth/*` routes, issues/validates JWTs, and now supports self-session revocation via `/v1/me/sessions*`.
- Runtime `/v1` auth no longer falls back to `x-auth-*` identity headers outside the API test harness.
- This closes the transport mismatch, the runtime scaffold-header fallback, and the temporary dev-session model, but broader backend authorization coverage is still incomplete.
