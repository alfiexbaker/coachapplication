# S2 Messaging & Performance Blueprint

## Scope
- Pillar 4 (Messaging & Communication) and Pillar 5 (Performance Tracking).
- Build app-ready specifications so feature teams can start once MVP stabilizes.
- All schemas reference core entities in `DB_MODEL_NOTES.md` for consistency.

## Messaging System Overview
- **Trigger**: Chat thread auto-creates when a booking transitions to `Confirmed`.
- **Thread types**: `booking` (1:1 parent-coach per booking) and `coach-parent` (aggregate history once multiple bookings exist).
- **Transport**: Realtime backend (Supabase Realtime or Ably) with fallback to polling via API route when sockets unavailable.
- **Storage**: `Message` table (id, bookingId, senderUserId, body, attachments[], status, createdAt, readAt).
- **Encryption**: TLS in transit; optionally add client-side encryption wrapper for media once compliance requires.

## Chat Feature Set
|- Feature | Requirement | Notes |
| --- | --- | --- |
| Entry point | "Message coach" button on booking detail once confirmed | Disabled for cancelled bookings |
| Message types | Text, photo, short video (<30s), PDF (training plans) | Media uploads to storage bucket with signed URLs |
| Typing indicators | Publish `typing` events scoped to booking thread, TTL 5s | Avoid spamming by debouncing to 1 event/sec |
| Read receipts | Per-user `lastReadMessageId`; UI shows "Seen" timestamp | Parents + coaches both see read state |
| Moderation | Client-side keyword flagging + server-side queue for review | Blocked users cannot send/receive |
| Blocking | Either party can block; requires reason code | Automatically closes open booking chats |
| Reporting | Long-press message → Report; logs context for safety team | Connects to safeguarding workflow |

## Messaging UX States
- **Pre-booking**: CTA replaced with tooltip "Chat unlocks after booking for safety".
- **Active booking**: Persistent banner on booking detail summarizing chat status (new messages, blocked, reported).
- **Archived**: Threads auto-archive 30 days after session unless rebooked; accessible under Messages > Archived.
- **Connectivity loss**: Show offline bar; queue outbound messages and mark as pending until ACK received.

## Push Notification Topics
- `message.new`: includes message preview, bookingId, sender avatar.
- `message.mediaReady`: fired after media transcode completes.
- `message.block`: informs users when conversation disabled.

## Moderation & Safeguarding Pipeline
1. Client pre-check: banned words -> immediate warning, still allow send but flagged.
2. Server rules: detect suspicious frequency or media sizes; throttle if necessary.
3. Flagged content flows into `ModerationCase` table with links to booking + users.
4. Admin console (future) consumes queue to take actions: warn, suspend, escalate to safeguarding team.

## Performance Centre Overview
- **Goal**: Build longitudinal trust via timeline of sessions, notes, skills, and media accessible to parents + coaches.
- **Data model**: `PerformanceEntry` referencing `bookingId` + `childId`.
- **Entry types**: `note`, `media`, `skillTag`, `attendance`, `metric` (e.g., sprint speed).
- **Visibility**: Parents + assigned coaches; optional share link for child (later).

## Performance Timeline UX
- Timeline card per booking with chips for attendance, coach note summary, star skill tags.
- Expand card to view media carousel and metric charts (speed, agility) generated from `PerformanceMetric` records.
- Filters: by child, date range, skill tag, coach.
- Export placeholder: "Download PDF (coming soon)" button records intent metric.

## Skill Tag System
- Master list defined centrally (e.g., Ball Control, Passing Accuracy, Endurance).
- Coaches can tag up to 5 per session; parents see progress bars showing frequency of tags over time.
- Each tag stores `confidence` (0-100) to later visualize improvement curves.

## Attendance & Notes
- Attendance states: `present`, `late`, `absent`, `coach_cancelled`, `parent_cancelled`.
- Coach adds structured notes template: `Focus`, `Highlights`, `Next Session Prep`, `At-home drills`.
- Parent acknowledgment toggle confirms they viewed notes; reminder sent after 48h if not acknowledged.

## Media Handling
- Photos compressed client-side before upload; videos capped at 150MB and transcoded to HLS for playback.
- Permissions: only parent + coach for that booking can download; share actions disabled until trust module.
- Retention: default 1 year, extendable to 3 years for premium tier (future setting in Trust module).

## Analytics & Success Metrics
- Track `MessagesSent`, `ChatsBlocked`, `PerformanceEntriesCreated`, `NotesAcknowledged` events.
- Dashboard KPIs: % bookings with chat engagement, avg time to send first note, retention uplift when performance entries exist.

## Dependencies & Sequencing
- Requires `Messaging` and `PerformanceEntry` tables from `DB_MODEL_NOTES.md` plus media storage bucket and signed upload endpoints.
- Build order: (1) Schema + API, (2) Messaging UI (text first), (3) Media attachments, (4) Performance timeline read-only, (5) Entry creation UI, (6) Analytics wiring.

## Open Questions
- Should multi-child families share same chat or separate per child? (Default: per booking to avoid mixing.)
- Will moderation need automated ML classification at launch or manual review sufficient? (Assume manual with heuristics.)
- Do we allow parents to edit notes? (No—parents comment via messaging; notes remain coach-authored.)
