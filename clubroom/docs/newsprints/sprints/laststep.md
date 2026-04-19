# Last Step Handoff

Date: 2026-04-17

## What Was Just Done

1. Added `apps/api/src/repositories/p0/community-media-repository.ts` so `/v1/videos/:videoId`, `/v1/community-groups`, `/v1/posts`, `/v1/message-threads`, and `/v1/me/notifications` now share one db-aware authority seam instead of keeping route-local seed reads.
2. Moved those handlers in `apps/api/src/modules/wave2plus/routes.ts` onto the repository and tightened them to fail closed for unauthenticated or unrelated callers.
3. Extended `packages/db/scripts/import-marketplace-p0-seed.mjs` so production db import now carries the community/media graph (`MediaObject`, `UploadSession`, `MalwareScanResult`, `Video`, `VideoAnnotation`, `CommunityGroup`, `CommunityGroupMembership`, `Post`, `PostComment`, `PostReaction`, `MessageThread`, `MessageParticipant`, `Message`, `MessageReceipt`, `Notification`, `NotificationPreference`, `MutedSource`, `QuietHours`) instead of leaving those live `/v1` reads seed-only after cutover.
4. Added focused route coverage in `apps/api/src/modules/wave2plus/routes.test.ts` for db-fixture fallback plus outsider-denied video and community-post access.

## Verification Run In This Step

- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`85/85`)
- `npx tsx --test apps/api/src/modules/wave2plus/routes.test.ts` -> PASS (`20/20`)
- `node --check packages/db/scripts/import-marketplace-p0-seed.mjs` -> PASS
- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `git diff --check` -> PASS

## Current State

- Active community/media `/v1` reads no longer depend on route-local marketplace seed-table logic in `db` mode.
- Production db import now includes the media/community graph needed for video detail, community groups, posts, threads, and notifications after cutover.
- The remaining production risk in this area has moved up the stack: app community, video, messaging, and notification services still use local compatibility storage or legacy `/api/*` paths outside mock mode.

## Next Exact Action

1. Start `PROD-CUTOVER-01` to move active community/media app reads onto the now-authoritative `/v1` routes and delete non-mock local authority where it is replaced.
