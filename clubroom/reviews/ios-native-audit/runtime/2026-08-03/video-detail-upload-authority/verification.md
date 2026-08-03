# Video detail and upload authority verification

Date: 2026-08-03

## Scope

- Routes: `app/videos/[id].tsx`; `app/videos/upload.tsx`
- Data: private playback detail; video visibility; upload session; media object; malware scan; archive
- Actors: media owner; explicitly shared athlete or guardian; outsider; scanner worker; system admin

## Findings and fix

`useVideoDetail` used a video-ID-only cache key. An account switch on the same route could display a prior viewer's warmed private video detail until the current request settled. The cache identity and refetch dependency now include the authenticated actor.

The detail header had a generic operating-system share link. That link did not create a video share and recipients still needed Fastify authority, so it was a misleading duplicate next to the authoritative owner share action. It has been removed. The hard-coded `Coach` detail value has also been removed rather than inventing identity not returned by the API.

The upload UI advertised AVI although the Fastify upload policy allows only MP4, MOV and M4V. The picker now rejects an unsupported filename before upload. The back button; upload button; title; and description have explicit semantic labels. Privacy copy now states the actual boundary: selected media remains private until upload and safety checks complete.

## Verification

- `npm run typecheck` — passed.
- `npm run test:compile` — passed.
- Focused ESLint over the seven changed production and test files — passed.
- `node --require ./scripts/test-register.js --test .tmp-tests/__tests__/hooks/video-detail-actor-boundary.test.js .tmp-tests/__tests__/hooks/use-video-detail.test.js .tmp-tests/__tests__/hooks/video-upload-api-boundary.test.js .tmp-tests/__tests__/services/video-service-api-mode.test.js` — passed 16/16. This proves the actor cache contract; removal of the non-authoritative link and fabricated label; accessible upload controls; supported formats; backend error propagation; and API-mode behavior.
- `NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test src/modules/media/upload-file-policy.test.ts` — passed 3/3. This proves unsupported declarations; filename mismatches; and malformed bytes are rejected.
- `NODE_ENV=test API_DATA_BACKEND=seed ./node_modules/.bin/tsx --test --test-name-pattern='denies outsider access to unrelated video detail|keeps athlete family access closed until the coach explicitly shares a video|creates db-backed videos and mutates annotations through `/v1/videos\\*`|rejects upload completion and video creation from unsafe media state' src/modules/wave2plus/routes.test.ts` — passed 4 matched tests. This proves outsider detail denial; no family access before explicit owner share; owner upload lifecycle; scanner callback constraints; unsafe media rejection; and the db-fixture video lifecycle.
- `npx react-doctor@latest --verbose --scope changed` — the pre-existing user worktree diagnostic remains `hooks/use-group-session.ts:140`. The two `video-upload-sections.tsx` warnings are false positives: the flagged exports are React components (`VideoPreviewCard` and `RequirementsList`), not stateful non-component exports.

## Limits

- Native iOS interaction-tree and VoiceOver verification remain blocked by ENV-009.
- Direct Supabase RLS verification remains unavailable (ENV-003). These tests use only isolated seed and db-fixture backends.
- Sentry issue read is unavailable (ENV-004). No synthetic event was sent.
- No production or staging mutation was performed.
