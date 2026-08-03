# Coach profile editor controls — validation

Date: 2026-08-01

## Runtime proof

- Strict `coach-profile-canonical` run: 11/11 passed with retries disabled and zero medium/high findings.
- Coach branches: canonical redirect, bio, focus/pricing, social/contact, experience, language, and qualification all passed.
- Parent, guardian, athlete, and club-admin compatibility-route denials all passed.
- All seven coach flows asserted zero implicit `PATCH /v1/coaches/me/profile` requests before the primary Save action.
- The social/contact flow proved that lookalike Instagram hosts and non-HTTP website schemes show inline errors and keep Save disabled.
- Target bounds, viewport placement, and five-point obscuration checks passed for the affected controls.
- The diagnostic `final-5` run exposed a transient athlete booking fetch failure. API health then returned HTTP 200 and the failure did not reproduce.
- The diagnostic `final-6` run exposed competing compatibility-route redirects for club admins. The route now waits for auth and sends only coaches to the editor; the targeted admin retest passed 1/1 before this complete run.

## Code and contract proof

- Root test compilation: passed.
- Root typecheck: passed.
- Focused profile/shared-link tests: 22/22 passed.
- Fastify typecheck: passed.
- Focused DB-fixture coach self-profile route test: passed; lookalike social hosts, unsafe website schemes, and nested `socialLinks.website` all returned HTTP 400 before persistence.
- Full coach-club route file: 42/42 passed.
- React Doctor staged scope: zero errors and four performance warnings. Three are pre-existing loops elsewhere in the large API route file; one is a bounded eight-item focus lookup.

## Scope and safety

- No production environment or production data was used.
- UI runtime tests did not submit the primary profile Save action.
- API mutation tests used the in-memory DB fixture backend.
- Supabase RLS/audit evidence remains recorded in `coach-profile-canonical-final-3/api-db-evidence.md`; this slice changes validation and routing, not database grants or policies.
- Sentry issue read remains blocked by ENV-004. Authenticated semantic traversal of the installed native build remains blocked by ENV-006.
