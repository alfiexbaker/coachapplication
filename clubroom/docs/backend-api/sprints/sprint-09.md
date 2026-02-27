# Sprint 09 - Community, Messaging, Notifications, and Referrals

## Goal
Ship social/community and messaging APIs with membership-scoped authz, chat realtime support, and abuse protections.

## Dependencies
- Sprint 02 (authz kernel)
- Sprint 04 (clubs/memberships)

## Scope
- community groups + memberships
- feed posts/comments/reactions
- message threads/participants/messages/receipts
- typing indicator/presence events (chat only realtime scope)
- notifications inbox and preferences
- muted sources and quiet hours
- referral codes/events

## Codebase Alignment Anchors
- `app/community/**`
- `app/chat/[threadId].tsx`
- `app/(tabs)/messages.tsx`
- `app/(tabs)/notifications.tsx`
- `components/notification/*`
- `components/social/*` (if present) and feed components
- `services/community/*`
- `services/messaging-service.ts`
- `services/notification/*`
- `services/social-feed-service.ts`
- `services/referral-service.ts`

## Tables / Schema
- `community_groups`
- `community_group_memberships`
- `posts`
- `post_comments`
- `post_reactions`
- `message_threads`
- `message_participants`
- `messages`
- `message_receipts`
- `notifications`
- `notification_preferences`
- `muted_sources`
- `quiet_hours`
- `referral_codes`
- `referral_events`

## Endpoints (examples)
- `GET/POST /v1/community-groups`
- `POST /v1/community-groups/:id/memberships`
- `GET/POST /v1/posts`
- `POST /v1/posts/:id/comments`
- `POST /v1/posts/:id/reactions`
- `GET/POST /v1/message-threads`
- `GET/POST /v1/message-threads/:id/messages`
- `POST /v1/message-threads/:id/read`
- `GET/PATCH /v1/me/notification-preferences`
- `POST /v1/me/muted-sources`
- `GET/PATCH /v1/me/quiet-hours`

## AuthZ / Security Notes
- thread membership verified on every message read/write
- group privacy enforced by membership and visibility
- endpoint-class rate limits for messaging/posting/reactions
- content delete/moderation actions audited
- mute and quiet-hours preferences are self-only

## Realtime Notes
- chat typing and message fanout only in phase 1
- persistence first; realtime transport is secondary
- missed events must recover via read endpoints

## Test Gates
- thread isolation tests (non-participant cannot read/write)
- message receipt/read update correctness
- post reaction duplicate submit/idempotency tests
- mute/quiet hours behavior tests
- rate-limit and abuse-path tests

## Exit Criteria
- Community/messaging/notification flows are API-backed and scoped correctly
