# Auth And Permission Boundaries

Validated: 2026-03-11
Purpose: state what is enforced today, what is design truth, and where auth and permission work is still incomplete.

## Canonical Sources

- `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`
- `docs/product-reality/ORG_PERMISSION_AND_VISIBILITY_MATRIX_2026-03-10.md`
- `components/auth/route-access-gate.tsx`
- `hooks/use-auth.tsx`
- `services/auth-service.ts`
- `apps/api/src/lib/authz.ts`
- `apps/api/src/plugins/auth-placeholder.ts`

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

- scaffold auth context from `apps/api/src/plugins/auth-placeholder.ts`
- route-level and helper checks in `apps/api/src/lib/authz.ts`

Validated reality:

- the backend auth plugin is explicitly marked temporary
- it builds auth context from dev headers and defaults
- this is not production authentication

## What Is Real Today

- Frontend role-aware navigation and redirects exist
- Backend test coverage exists for several authz-sensitive routes
- Trust and medical access rules are partially modeled in backend authz helpers

## What Is Still Design Truth, Not Full Runtime Truth

- Auth0-backed JWT validation
- full session/device management across app and API
- aligned frontend and backend auth contracts
- production-grade grant resolution and audit coverage for every sensitive route

## Safe Interpretation For Agents

1. Treat `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md` as the target enforcement model.
2. Treat current frontend route guards as presentation safety, not final security.
3. Treat current backend auth as scaffolded unless you replace `auth-placeholder`.
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

- The frontend auth client currently calls `/api/auth/*`.
- The backend app currently registers `/v1/*` modules and does not expose matching auth route modules in the current tree.
- This mismatch should be treated as an active integration gap, not as a hidden feature.
