# Facebook-Level Experience Gap Analysis

## Purpose
Map what the current Clubroom experience already covers and what is missing to match the depth and polish users expect from a Facebook-grade social surface, without creating parallel systems.

## What we already have
- **Role-aware navigation** with four-to-five primary tabs and hidden deep links, keeping experiences lean for coaches, parents, and admins.
- **Direct + group messaging** with club/squad/class filters, posting-as metadata, mention counts, and unread badges.
- **Booking + session flows** that bundle service details, session notes, and coach-to-parent follow-ups.
- **Availability templates** for recurring weekly schedules.
- **Club Hub** that lets coaches join/create clubs via invite codes, manage club-only feeds, sessions, and squads, and deep-link from Bookings.

## Gaps vs. a Facebook-grade app (by spine)
### Community
- Unified home feed with mixed media (photos/video), reactions, threaded comments, saves/shares, and lightweight creation (status, photo, live, poll) scoped by club/squad/class.
- Rich profiles and social graph (followers/memberships, mutuals, accolades/badges, activity timelines) with privacy controls.
- Event-like posts for club sessions with RSVP states, reminders, and attendance export to bookings.
- Group governance (roles, membership requests, invite approvals, post moderation queues, flagged content workflows).
- Notifications center (push + in-app) with granular settings and digest emails.

### Booking/Revenue
- Event-to-booking bridge so sessions created in club feeds convert to paid bookings with capacity, payments, and waitlists.
- Marketplace surfaces (discover coaches/clubs, recommendations, reviews/ratings) tied to profiles and availability.

### Development
- Progress timelines per athlete (milestones, coach notes, video breakdowns) that can be shared to club feeds or DMs.
- Badge hub surfaced in profiles and feed posts with awarding, revocation, and criteria audit trail.

### Trust/Ops
- Safety tooling: content filters, rate limits, audit log, user reports, and ban/mute flows per club.
- Privacy guardrails: per-post visibility, blocking, restricted DM, and data export/delete self-service.
- Reliability: pagination/virtualized lists, optimistic updates with retries, offline cache with eventual sync, and error telemetry.

## How to add without extra tech debt
1) **Extend existing primitives**: reuse feed data model from Club Hub for a global/home feed; add reactions/comments as nested objects on the same post type instead of new services.
2) **One identity model**: extend current profile + posting-as metadata to cover badges, roles, and privacy instead of creating a new “persona” layer.
3) **Shared surfaces**: drive notifications, badge hub, and event posts from the same message/feed services to avoid divergent channels; render via segmented inbox/feed filters rather than new tabs.
4) **Progressive delivery**: ship read-only feeds with reactions first, then add commenting and creation; gate moderation + notifications behind feature flags per club.
5) **Data contracts first**: define feed post/comment/reaction schemas and notification payloads in `constants/types.ts` and `docs/technical/` before wiring storage; keep mock fixtures in `constants/mock-data.ts` for UI-first slices.
6) **Accessibility + performance**: virtualized lists for feed/comments, image/video lazy loading, and skeleton states; reuse existing loading/empty/error patterns from booking and messaging screens.
7) **Governance loops**: align membership/invite flows with existing club invites; add admin tools (approve, remove, mute) as extensions of current role checks rather than bespoke screens.

## Initial deliverable slices
- **Slice 1 (Community)**: Read-only home feed with club/squad/class filters, reactions, and notification badge hook; uses mock data.
- **Slice 2 (Creation)**: Post composer that supports text + media + event session link; shares identity and permissions from Club Hub.
- **Slice 3 (Trust/Ops)**: Reporting + moderation queue for clubs with minimal audit log; notification settings per channel.
- **Slice 4 (Growth/Revenue)**: Event posts convert to bookable sessions with capacity and RSVP syncing to bookings calendar.

## Measures of “Facebook-good” readiness
- Engagement: daily active club feed visitors, posts created, reactions/comments per post, and read/write latency targets.
- Safety: time-to-resolution on reports, false-positive rate on moderation actions, and audit coverage.
- Reliability: crash-free sessions %, offline success rate for post creation, and notification delivery success/latency.
