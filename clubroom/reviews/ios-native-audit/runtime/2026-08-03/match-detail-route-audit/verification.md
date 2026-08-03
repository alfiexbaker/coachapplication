# ROUTE-103 — match-detail authority and player privacy

## Scope

`/matches/:id` shows a club fixture, its relevant availability state, and the
actions the signed-in actor may actually complete.

## Runtime path

`MatchDetailScreen` → `useMatchDetail` → `matchService.getMatch` →
`GET /v1/matches/:matchId`. Fastify derives `canManageMatch` from the active
club-staff/privileged-admin relationship, not from a client role label. The
same viewer projection is used by `GET /v1/clubs/:clubId/matches`.

## Fixes verified

1. Management controls, lineup selection, result recording, and cancellation
   now require Fastify's `canManageMatch` capability. A broad client `COACH`
   or `ADMIN` label cannot expose an action that the club relationship denies.
2. Non-staff fixture projections include only the actor's own invited player,
   or no player row. Another family availability note is not returned through
   either the detail or club-list endpoint.
3. Detail reads now validate the response contract and audit
   `club_match.read` success and denial outcomes.
4. Result entry is reachable before the result exists, and only accepts an
   exact `0-0` through `99-99` score. Copy is direct: `Lineup saved.`,
   `Result saved.`, and `Match cancelled.`
5. A linked athlete can use the same self player projection to respond to an
   invite; a guardian who also has staff capability can see both relevant
   response and management controls.

## Cross-role proof

The seeded Fastify boundary test made five local requests against one private
fixture:

- Club staff received `canManageMatch: true`, the full player projection, and
  the availability note.
- The invited guardian received `canManageMatch: false` and only that child's
  player row.
- A different active club member received `canManageMatch: false` and no
  player rows in both detail and list responses.
- An unrelated visitor received `403`.
- The three allowed detail reads wrote `club_match.read/SUCCESS`; the denied
  read wrote `club_match.read/DENY`.

## Verification

- Root and API type-checks plus root test compilation: passed.
- Match detail and API-mode service contracts: 4/4 passed.
- Seeded detail boundary proof: 1/1 passed.
- Existing seeded player-invite, availability, lineup, deny, notification, and
  audit lifecycle scenario: 1/1 matched test passed (41 unrelated cases
  skipped by its name filter).
- Target lint: zero errors. The five reported warnings predate this slice in
  legacy match/shared-contract code; no new warning remains in its test or
  match-detail hook.
- React Doctor reports legacy loop advisories in `matches.ts` and protected
  unrelated diagnostics in `use-child-context` and `use-group-session`; none
  is a new match-detail-control diagnostic.

## Limitations

Native post-fix interaction and VoiceOver verification remain blocked by
`ENV-009` (CoreSimulator XPC hangs while installing the built development
client). Sentry issue reads remain blocked by `ENV-004`; direct Supabase MCP
inspection remains blocked by `ENV-003`.

The wider pre-existing `persists club matches, gates staff writes, and projects
results into club schedule` test was separately observed to fail before this
slice's exercised path: its user-worktree invalid-create assertion expects
`400`, while current error handling returns `500` for `clientOnlyStatus`.
This route slice does not change match creation or that test file and does not
count the failing broad test as passing evidence.

No production or staging match, player, audit, Sentry, database, or external
service state was changed.
