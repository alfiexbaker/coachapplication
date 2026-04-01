# Codebase / Feature Audit Prompt

Date: 2026-04-01
Purpose: give a fresh AI a precise audit brief for the current Clubroom repo without sending it back into stale planning.

## Prompt To Paste

You are auditing the Clubroom codebase in `/Users/tubton/Desktop/coachapplication/clubroom`.

Your job is to answer, with evidence:
- where the product really is today
- what is actually working
- what is done versus scaffolded versus broken
- what blocks this app from being functional within 30 days
- what should happen next, in a realistic order

Do not start by trusting old planning notes.
Prefer executable truth over prose.
Treat `docs/newsprints/sprints/BACKLOG.md` and `docs/newsprints/sprints/laststep.md` as the only live execution tracker.
Do not recreate a second sprint queue under `docs/product-reality/`.

## Required Read Order

1. `/Users/tubton/Desktop/coachapplication/clubroom/CODEX.md`
2. `/Users/tubton/Desktop/coachapplication/clubroom/docs/START_HERE.md`
3. `/Users/tubton/Desktop/coachapplication/clubroom/docs/SOURCE_OF_TRUTH.md`
4. `/Users/tubton/Desktop/coachapplication/clubroom/docs/KNOWLEDGE_SPINE.md`
5. `/Users/tubton/Desktop/coachapplication/clubroom/docs/trust/auth-and-permission-boundaries.md`
6. `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/README.md`
7. `/Users/tubton/Desktop/coachapplication/clubroom/docs/backend-api/ROUTE_INVENTORY_V1.md`
8. `/Users/tubton/Desktop/coachapplication/clubroom/docs/newsprints/README.md`
9. `/Users/tubton/Desktop/coachapplication/clubroom/docs/newsprints/sprints/BACKLOG.md`
10. `/Users/tubton/Desktop/coachapplication/clubroom/docs/newsprints/sprints/laststep.md`
11. `/Users/tubton/Desktop/coachapplication/clubroom/docs/product-reality/README.md`
12. `/Users/tubton/Desktop/coachapplication/clubroom/docs/product-reality/value-shape/MASTER.md`

Only open more docs when you need to verify a specific claim.

## Ground Truth You Should Assume Before Auditing

- This is an Expo app with a real Fastify API under `apps/api`.
- The app still supports mock and pre-API live modes.
- Frontend data access should stay behind `services/api-client.ts`.
- Route ownership should stay behind `navigation/routes.ts`.
- `/v1` session-invite authority is now closed for create/list/detail/respond/cancel/remind/dismiss.
- Direct invite acceptance now creates bookings through `/v1`.
- Dev-session bearer tokens now persist into backend session rows and support `/v1/me/sessions*`, logout, and revocation.
- Production identity is still not complete; the current auth stack is scaffold-first and still relies on the temporary auth plugin.
- `AUTH-02` is the current highest-priority execution item.
- `OBS-01` Sentry is next after the auth seam unless your audit proves a more urgent blocker.
- The goal is not "more features everywhere." The goal is a functional football-only app within one month.

## What To Audit

Audit by role, by spine, and by trust level.

You must cover at least these areas:

1. Auth and session lifecycle
   - Check `/v1/auth/*`, `/v1/me`, `/v1/me/sessions*`, `apps/api/src/plugins/auth-placeholder.ts`, and the frontend auth service path.
   - Decide what is working for local/dev reality versus what is still not launch-safe.

2. Booking and invite authority
   - Verify current invite reads and writes across `services/invite/*`, `app/session-invites/*`, and `apps/api/src/modules/booking/routes.ts`.
   - Confirm whether booking creation paths are now consistently authoritative.

3. Family, health, and progress surfaces
   - Check whether self-versus-child context is coherent and whether trust-sensitive family/medical flows are backend-authoritative or still app-owned.

4. Club schedule and event workspace
   - Audit the current `Schedule`, event detail, attendance, RSVP, and club-update handoff shape.
   - Decide how close `LAUNCH-01` and `LAUNCH-02` really are to usable.

5. Storefront and conversion surfaces
   - Audit coach profile, club profile, reviews/proof, booking entry, and rebook loops.
   - Decide how much of `LAUNCH-03` and `LAUNCH-04` is real versus missing.

6. Home, updates, and role entry
   - Check whether each role lands in a coherent primary surface.
   - Call out dead routes, duplicate dashboards, or empty/fake CTAs.

7. Observability and release readiness
   - Check whether Sentry exists anywhere meaningful.
   - Check whether the repo-critical audit scripts are honest or still environment-fragile.
   - Call out any "looks green but is not actually safe" traps.

## Output Rules

- Do not rewrite canonical docs in this pass unless asked.
- Do not make broad code changes.
- If you find stale docs, list them in the review outputs instead of deleting them.
- Every important claim must cite specific files, routes, tests, or commands.
- Classify each audited item as one of:
  - `WORKING`
  - `PARTIAL`
  - `SCAFFOLDED`
  - `BROKEN`
  - `NOT VERIFIED`

## Where To Put Review Output

Create this folder:

`/Users/tubton/Desktop/coachapplication/clubroom/reviews/codebase-audit/2026-04-01/`

Write exactly these files:

1. `01-executive-summary.md`
   - one concise "where we are now" summary
   - what is working
   - what is done
   - biggest blockers to "functional in a month"
   - top 5 recommended next moves

2. `02-feature-status-matrix.md`
   - table by feature/flow
   - columns: area, role(s), status, evidence, blocking gap, recommended next action

3. `03-risk-register.md`
   - highest-severity risks first
   - include auth, trust-sensitive data, launch blockers, misleading UI, and doc drift

4. `04-30-day-plan.md`
   - week-by-week plan for the next 4 weeks
   - sequence by dependency, not preference
   - say what should ship, what can wait, and what should be cut

5. `05-review-questions.md`
   - unresolved questions or assumptions that need a human decision
   - include any spots where current docs and code do not line up cleanly

## Definition Of A Good Audit

A good audit should let a human do three things immediately:

1. understand where Clubroom actually is without rereading the whole repo
2. decide what not to work on this month
3. approve the next execution slice with confidence

If you are uncertain, say so explicitly and mark the item `NOT VERIFIED` instead of guessing.
