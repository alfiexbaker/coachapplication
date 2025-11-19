# S1 MVP Core Notes

## Session State Machine
| State | Description | Allowed Transitions |
| --- | --- | --- |
| Available | Session slot is visible and open for booking. | Pending, Cancelled |
| Pending | Participant has requested the slot; awaiting coach confirmation. | Confirmed, Cancelled |
| Confirmed | Coach has approved the booking. | Completed, Cancelled |
| Completed | Session has occurred and is finalized. | — |
| Cancelled | Slot was cancelled by participant or coach. | — |

### Transition Map
1. **Available → Pending**: Triggered when a participant taps "Book" on an available slot.
2. **Pending → Confirmed**: Coach accepts the request.
3. **Confirmed → Completed**: Automatic transition after session end-time with completion event logged.
4. **Pending/Confirmed → Cancelled**: Initiated by coach or participant before start-time; pending requests auto-cancel after expiration timeout.

## Slot Selection UI
### Layout
- **Calendar strip** at the top shows 7-day rolling window. Active day highlights in primary color.
- **Slot list** beneath displays session cards grouped by day. Cards show start/end time, format icon (virtual/in-person), and availability badge.

### Interactions
1. Scrolling the calendar strip updates the slot list to the selected day.
2. Tapping a slot opens detail modal with coach bio snippet, price, and "Book" CTA.
3. Disabled slots show conflict tooltip explaining why booking is blocked.

### Availability & Conflict Rules
- Users cannot select overlapping slots with existing Pending or Confirmed bookings.
- A participant may hold at most two Pending requests simultaneously.
- Coaches may not double-book: once a slot is Pending or Confirmed it disappears from other users' lists.
- Slots within 2 hours of the current time are locked (viewable but not bookable).

## Notification Reminders
| Trigger | Audience | Timing | Payload |
| --- | --- | --- | --- |
| Session confirmed | Participant, Coach | Immediate | `{type: "session_confirmed", sessionId, coachId, participantId, startTime}` |
| Session reminder | Participant, Coach | 24h & 1h pre-start | `{type: "session_reminder", sessionId, startTime, joinLink, location}` |
| Pending request expiring | Participant | 12h after request if coach idle | `{type: "pending_expiring", sessionId, expiresAt, action: "nudge_coach"}` |
| Session completed | Participant, Coach | 30m post-end | `{type: "session_completed", sessionId, feedbackUrl}` |
| Cancellation | Affected party | Immediate | `{type: "session_cancelled", sessionId, cancelledBy, reason}` |
