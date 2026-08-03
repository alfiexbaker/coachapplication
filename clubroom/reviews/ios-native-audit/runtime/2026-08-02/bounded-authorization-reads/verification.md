# QA-054 — Bounded authorization reads

## Goal

Remove four serial, read-only authorization loops without weakening Clubroom's default-deny, assignment, audit, ordering, or error behavior.

## Scope

- `GET /v1/safeguarding/incidents`
- `GET /v1/sessions/:sessionId/media`
- `GET /v1/sessions/:sessionId/badges`
- practice-task assignment context reads used by action routes

Production and staging were not called or mutated. Verification used local seed fixtures and source/compiler analysis only.

## Runtime invariants reviewed

- Safeguarding candidates remain capped by the existing query schema/repository boundary. Every candidate authorization check completes before the success audit and response.
- A failed safeguarding check still rejects the whole list. `Promise.all` only overlaps independent reads; it does not convert a denial into a partial response.
- Session-media rows retain repository order. Rows without an athlete ID and rows whose athlete check returns a client error remain hidden.
- Session-badge athlete checks are deduplicated through one shared helper. The existing all-denied `403` behavior remains intact.
- Non-`ApiProblemError` and server-side (`5xx`) athlete-check failures still propagate instead of being hidden.
- Practice-task IDs remain normalized by the existing bounded helper. `RESOURCE_NOT_FOUND` still skips that ID, other failures still propagate, and `Promise.all` preserves input order before null removal.
- No write begins before authorization and no audit event was moved ahead of a protected read.

## Verification

| Check | Result |
| --- | --- |
| Trust-operations safeguarding Fastify suite | 7/7 passed, including filtered sensitive-read audit and unrelated-actor denials |
| Wave2+ media, badges, and practice-task focused cases | 3/3 passed; 62 unrelated tests skipped by name filter |
| Isolated TypeScript compile for both changed routes plus Fastify request augmentation | Passed with zero diagnostics |
| Focused ESLint | Passed with zero errors |
| `git diff --check` | Passed |
| React Doctor diff against `HEAD` | 0 errors, 0 warnings; the four targeted `async-await-in-loop` findings are absent |

The repository-wide app and API typechecks were also attempted. They are currently blocked by separate, already-present match-timezone work: three mock `Match` fixtures and one constructor omit required `timeZone`, while two Prisma match creates use `timeZone` before the concurrent generated Prisma client contains that field. Those failures do not originate in either changed authorization route and were not folded into this slice.

## Result

Fixed. Four bounded authorization loops now overlap independent reads, repeated athlete IDs are checked once per request, and all reviewed denial, ordering, audit, and error semantics remain unchanged.
