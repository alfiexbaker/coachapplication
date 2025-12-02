# Sprint 2: Community Feed & Threads (FB Groups Parity)

**Intent**: Make Club Hub feel like the default social space by mirroring FB Groups dopamine loops—fast posting, reactions, replies, and resurfacing unread items—while reusing our existing messaging stack to avoid parallel systems.

## Why this matters
- Sticky social loop: post → reactions/comments → notifications → return visits. Needs low friction and strong visibility.
- Parents and players should see squad-relevant posts first to keep the feed useful and addictive, not noisy.
- Coaches must be able to announce sessions/services directly to groups for conversion, not just chat casually.

## Primary user journeys (mocked)
- **Member** scrolls feed, reacts, comments, and shares to DM/squad; sees unread counts and "new since last visit" markers.
- **Coach/Admin** posts announcement or service offer to specific squads/classes/staff with post-as (club vs self) and optional booking CTA.
- **Parent** opens feed from notification, scans squad filter, taps CTA to book a squad session created by coach.

## Build scope
- Extend group inbox filtering to Club/Squad/Class/Staff with sticky filters and "new posts" jump links.
- Post composer enhancements: post-as toggle, attachments (images/docs), polls, and "Offer session/service" template that attaches availability block.
- Feed cards reuse messaging thread components for consistency; include reactions, inline comment threads, and share-to-chat CTA.
- Surfacing signals: unread chips per filter, sticky "return to last read" divider, and subtle streak nudge ("active in last 3 days").

## Integration & constraints
- One feed/threads system: reuse message thread models; keep reaction/mention codepaths identical to chat.
- Posting a service/session offer should prefill Booking alignment data (service ID, squad scope, session slots) for Sprint 5 handoff.
- Respect role permissions: only Owner/Admin/Head Coach can broadcast to "All"; coaches can target their squads; members can post to squads they belong to.

## Interlocks & FB-grade behaviors
- Composer pulls squads/roles from Sprint 3 and honors badge visibility rules from Sprint 4 when previewing recognitions.
- Service offers inject booking CTAs (Sprint 5) with preselected time/location; completing the booking posts back as an update to the same thread.
- Trust controls from Sprint 6 (report, mute, pin, rate safety) are present on each card and thread; verification chips are surfaced by default.
- Analytics (Sprint 7) logs impressions, reactions, comment depth, share-to-chat, and booking conversions to tune ranking and nudges.

## Acceptance criteria
- Feed supports All vs Squad/Class vs Staff filters with unread counters and last-read markers.
- Composer supports post-as, attachments, polls, and service/session offer template wiring mock payloads.
- Feed cards render reactions/comments, share-to-chat, and booking CTA when offer template is used.
- Notifications for reactions/mentions are stubbed; blocked/empty states covered.
