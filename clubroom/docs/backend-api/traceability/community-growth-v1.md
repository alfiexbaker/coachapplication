# Community + Growth V1 Traceability Matrix (UI <-> API <-> Data <-> AuthZ)

**Contract status**: Signed for pre-API freeze (2026-03-01)  
**Spine**: Community & Growth

This matrix freezes the Community/Growth contract for API migration. It maps user-visible, currently-routed UI flows to planned `/v1` backend dependencies and owner modules.

## Backend Dependency Owners
| Owner key | Module owner scope (planned) | Primary sprint anchor |
|---|---|---|
| `community-social` | `apps/api/modules/community-social` (posts, comments, reactions, groups) | Sprint 09 |
| `messaging-realtime` | `apps/api/modules/messaging` (threads, messages, receipts, typing fanout) | Sprint 09 |
| `notifications-preferences` | `apps/api/modules/notifications` (inbox, preference/mute/quiet hours) | Sprint 09 |
| `clubs-memberships` | `apps/api/modules/clubs-memberships` (clubs, squads, memberships) | Sprint 04 + Sprint 09 |
| `events-rsvp` | `apps/api/modules/events` (event reads, RSVP writes) | Sprint 05 + Sprint 09 |
| `referrals-growth` | `apps/api/modules/referrals` (codes/events) | Sprint 09 |
| `identity-access` | `apps/api/modules/identity-access` (`/v1/me` and actor context) | Sprint 02 |

## Critical UI Contract Table
| Flow | Critical UI route(s) | UI anchors (components/services) | Planned API endpoint(s) | Backend dependency owner | Mock-only assumption now | Migration order |
|---|---|---|---|---|---|---|
| Feed read/create/detail | `/(tabs)/feed`, `/(modal)/create-post`, `/(modal)/post-detail` | `components/social/*`, `services/social-feed-service.ts` | `GET /v1/posts`, `POST /v1/posts`, `GET /v1/posts/:postId`, `POST /v1/posts/:postId/comments`, `POST /v1/posts/:postId/reactions` | `community-social` | feed uses local seeded/demo data | Community step 2 |
| Community groups | `/community`, `/community/[groupId]` | `services/community/*`, group UI components | `GET /v1/community-groups`, `POST /v1/community-groups`, `POST /v1/community-groups/:id/memberships` | `community-social` | memberships simulated in local service state | Community step 3 |
| Messaging threads/messages | `/(tabs)/messages`, `/chat`, `/chat/[threadId]` | `services/messaging-service.ts`, `services/event-bus.ts` | `GET /v1/message-threads`, `POST /v1/message-threads`, `GET /v1/message-threads/:id/messages`, `POST /v1/message-threads/:id/messages`, `POST /v1/message-threads/:id/read` | `messaging-realtime` | local-thread persistence and event-bus fanout only | Community step 1 |
| Notifications inbox + prefs | `/(tabs)/notifications`, `/settings/notifications`, `/settings/notifications/preferences` | `services/notification/*` | `GET /v1/me/notifications`, `GET /v1/me/notification-preferences`, `PATCH /v1/me/notification-preferences`, `POST /v1/me/muted-sources`, `GET/PATCH /v1/me/quiet-hours` | `notifications-preferences` | local preference storage and mock notification feed | Community step 4 |
| Discovery and coach browse | `/discover/map`, `/discover-sessions`, `/book-coach`, `/favourites`, `/compare`, `/compare/[ids]` | discover/favourites components, compare screens | `GET /v1/discovery/coaches`, `GET /v1/discovery/sessions`, `POST /v1/favourites`, `DELETE /v1/favourites/:id`, `GET /v1/compare/coaches` | `community-social` + `identity-access` | discovery cards mostly seeded | Community step 2 |
| Clubs, squads, and member operations | `/(tabs)/club-hub`, `/club/*`, `/squads/[id]/invite` | club/squad components and invite UI | `GET/POST /v1/clubs`, `GET/POST/PATCH /v1/clubs/:clubId/memberships`, `GET/POST/PATCH /v1/clubs/:clubId/squads` | `clubs-memberships` | club membership state is local/mock | Community step 3 |
| Events and RSVP | `/events`, `/events/[id]`, `/events/create`, `/events/[id]/attendees`, `/events/[id]/rsvp`, `/session/[id]/rsvp` | event screens + RSVP hooks (`hooks/use-event-rsvp.ts`) | `GET /v1/events`, `GET /v1/events/:eventId`, `POST /v1/events`, `GET /v1/events/:eventId/attendees`, `POST /v1/events/:eventId/rsvp` | `events-rsvp` | attendee and RSVP lists are mock-backed | Community step 3 |
| Referrals and invite growth | `/referrals/invite`, `/invites`, `/coach-invites` | `services/referral-service.ts`, invite services | `POST /v1/referrals/codes`, `GET /v1/referrals/events`, `GET /v1/invites` | `referrals-growth` + `community-social` | referral outcomes are simulated and non-transactional | Community step 5 |

## Migration Order (Community Spine)
1. Messaging threads/messages and read receipts (`messaging-realtime`)
2. Feed/discovery reads + post writes (`community-social`)
3. Groups/clubs/events membership boundaries (`community-social`, `clubs-memberships`, `events-rsvp`)
4. Notifications/preferences/mute/quiet-hours (`notifications-preferences`)
5. Referrals and non-critical growth instrumentation (`referrals-growth`)

## Freeze Notes
- Routes above are current user-visible anchors from `app/` and pre-API gate docs.
- Any new Community/Growth route must be added to this matrix before API cutover.
