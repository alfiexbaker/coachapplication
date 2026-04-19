# Last Step Handoff

Date: 2026-04-17

## What Was Just Done

1. Added `services/community-media-authority-service.ts` as the shared non-mock `/v1` read bridge for community groups, message threads/messages, notifications, and notification preferences.
2. Moved `services/community/community-group-service.ts`, `services/community/community-messaging-service.ts`, `services/messaging-service.ts`, `services/notification/notification-store.ts`, and `services/notification/notification-preferences.ts` onto that authority path for non-mock reads.
3. Replaced the accidental non-mock `/api/*` compatibility writes for those overlays with a dedicated local AsyncStorage bridge in `services/local-overlay-store.ts`, so local state is now only an overlay for unsupported writes instead of a second authority path.
4. Added explicit local overlay keys for message thread summaries and deleted-message tombstones in `constants/storage-keys.ts`.
5. Synced runtime docs so the backlog now reflects the narrower remaining seam: video delivery and signed media reads.

## Verification Run In This Step

- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `git diff --check` -> PASS

## Current State

- Community group, group-message, direct-message, notification inbox, and notification-preference reads are now API-first in non-mock mode through the db-aware `/v1` routes.
- Local storage in those domains is now a compatibility overlay for unsupported writes, not the source of truth.
- The remaining active community/media production seam is video detail delivery: `video-service.ts` still depends on legacy `/api/videos*` because `/v1/videos/:videoId` does not yet return a signed/playable asset URL.

## Next Exact Action

1. Start `PROD-CUTOVER-02` to add signed/playable media delivery to `/v1/videos/:videoId` and move `video-service.ts` off legacy `/api/videos*` plus local compatibility storage in non-mock mode.
