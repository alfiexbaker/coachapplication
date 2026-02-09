# 5D: Safety + Settings + Seen Indicators

**Phase**: 1 — Foundation
**Origin**: Sprint 5, Tasks 7, 9, 10
**Estimated scope**: 3 tasks, safety/reporting + settings + read receipts

## Goal

Users can report and block. Settings page is complete (notifications, privacy, delete account). "Seen" indicators close the feedback loop on every interaction.

## Tasks

### Task 1: Safety & Reporting System

**File**: `components/safety/report-flow.tsx` + `app/report.tsx`

Report from: coach profile, message thread, review. Types: inappropriate, safety_concern, fake_profile, spam, other. Confidential — reported user NOT notified. Admin review queue. Block user option after reporting.

**Block User**: prevents messaging, invites, discovery visibility. Reversible from settings.

### Task 2: Settings Completeness

**File**: `app/settings/index.tsx` — EXPAND

Add missing settings:
- **Notification Preferences**: per-type toggles (bookings, invites, reminders, reviews, messages, badges, milestones)
- **Privacy**: profile visibility (public/registered-only), search visibility toggle
- **Data & Privacy**: download my data (JSON/ZIP), delete account (30-day grace → hard delete). GDPR requirement.
- **Preferences**: distance unit (miles/km), language
- **About**: terms of service, privacy policy, help, app version
- **Delete Account**: confirmation → soft-delete → 30-day grace → permanent. Required for app store compliance.

### Task 3: "Seen" Indicators (Action→Reaction)

Parents never know if the coach actually read their message, saw their RSVP, or reviewed their booking request. Add subtle "seen" indicators:

- **Messages**: ✓ sent, ✓✓ delivered, blue ✓✓ read (WhatsApp pattern)
- **Session invites**: After parent responds, show "Coach viewed your response" timestamp
- **RSVP**: After parent RSVPs, show "Coach has seen your response" or "3 parents responded" count
- **Booking requests** (manual confirm): Show "Coach will review" → "Coach viewed" → "Confirmed/Declined"
- **Goals**: After coach sets a goal, parent sees "New goal from Coach Marcus" → tapping marks as acknowledged

These are SMALL UI additions but they make the parent feel heard.

```typescript
// Simple seen tracking — works locally, server-synced later
interface SeenStatus {
  entityType: 'message' | 'invite_response' | 'rsvp' | 'booking_request' | 'goal';
  entityId: string;
  seenBy: string;  // userId
  seenAt: string;
}
```

**Family Service Gaps (Action→Reaction):**

| Service Function | Actor | Notify Who | Message |
|-----------------|-------|-----------|---------  |
| `family-service.inviteGuardian` | Primary parent | Invited guardian | "You've been invited to join [name]'s family account" |
| `family-service.acceptInvite` | Guardian | Primary parent | "[Guardian] accepted your family invite" |
| `family-service.removeGuardian` | Primary parent | Removed guardian | "You've been removed from [name]'s family account" |
| `family-service.updatePermissions` | Primary parent | Guardian | "Your family permissions were updated" |

## Acceptance Criteria

- [ ] Report button accessible on coach profiles, messages, reviews
- [ ] Block user prevents messaging, invites, discovery
- [ ] Settings: notification prefs, privacy, delete account, data export
- [ ] Terms of service and privacy policy screens exist
- [ ] Messages show sent/delivered/read indicators
- [ ] Invite responses show "Coach viewed" status
- [ ] RSVP shows "Coach has seen" after response
- [ ] Booking requests show review status progression
- [ ] Goals show parent acknowledged status

## Files Changed

| File | Action |
|------|--------|
| `components/safety/report-flow.tsx` | CREATE |
| `components/safety/block-user.tsx` | CREATE |
| `app/report.tsx` | CREATE |
| `app/settings/index.tsx` | ENHANCE (331 lines exist) |
| `app/settings/notifications/preferences.tsx` | ENHANCE (334 lines exist) |
| `app/settings/privacy.tsx` | ENHANCE (242 lines exist) |
| `app/settings/terms.tsx` | CREATE |
| `app/settings/privacy-policy.tsx` | CREATE |
| `services/report-service.ts` | CREATE |
| `services/block-service.ts` | CREATE |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: Nothing (can start immediately)
