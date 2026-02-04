# 4B: Rich Feed Cards + Academy + Welcome Flow

**Phase**: 2 — Differentiation
**Origin**: Sprint 4, Tasks 4, 5, 6
**Estimated scope**: 3 tasks, auto-generated content + academy distinction

## Goal

Club feeds auto-populate with match results, badge awards, session recaps. Academies look visually different from grassroots clubs. New members get a welcome flow.

## Tasks

### Task 1: Rich Feed Cards

**File**: `components/club/feed-cards/`

Auto-generate feed content from data events. Card types:

- **Match Result Card**: Score, W/D/L badge, player of match, likes/comments
- **Badge Award Card**: Badge icon, athlete name, coach reason, likes/comments
- **Session Recap Card**: Focus area, attendance count, coach summary
- **Event Reminder Card**: Date/time/location, RSVP count, [RSVP Now] CTA

**Auto-generation**: When a match result is recorded, auto-create a `ClubFeedPost` with `postType: 'match'`. Same for badge awards and session completions (from 2A).

### Task 2: Academy Differentiation

**File**: `app/academy/[id]/home.tsx`

Academies get a distinct look:
1. **Header**: Full-width banner image with logo overlay (like a school website hero)
2. **Programme tiers**: Show different squads as "programmes" with descriptions
3. **Staff showcase**: Photo grid of coaches with specialties
4. **Welcome message**: Pinned message from academy owner
5. **Colour theming**: Academy's primary/secondary colours theme the entire page

| Feature | Club | Academy |
|---------|------|---------|
| Header | Badge + name | Full banner + logo overlay |
| Squads | Listed as squads | Listed as "programmes" |
| Staff | Coach names only | Photo + bio + specialty cards |
| Join flow | Enter code | Apply → approval workflow |
| Branding | Badge + 2 colours | Full theme (banner, logo, colours, fonts) |

### Task 3: New Member Welcome Flow

**File**: `components/club/welcome-flow.tsx`

When a member first joins a club/academy:

```
Step 1: "Welcome to [Club Name]!" + cover photo
Step 2: "You've been added to [Squad Name]"
Step 3: "Here's what's coming up" — next 3 events/sessions
Step 4: "Meet the coaches" — coach cards
Step 5: [Done — Go to Club Home]
```

Quick 5-step carousel. Can be skipped.

## Acceptance Criteria

- [ ] Feed shows rich cards for match results, badges, recaps, events
- [ ] Match results auto-post to club feed
- [ ] Academy pages have distinct visual treatment (banner, staff, programmes)
- [ ] New member welcome flow triggers on first visit

## Files Changed

| File | Action |
|------|--------|
| `components/club/feed-cards/match-result-card.tsx` | CREATE |
| `components/club/feed-cards/badge-award-card.tsx` | CREATE |
| `components/club/feed-cards/session-recap-card.tsx` | CREATE |
| `components/club/feed-cards/event-reminder-card.tsx` | CREATE |
| `app/academy/[id]/home.tsx` | MODIFY — distinct academy layout |
| `components/club/welcome-flow.tsx` | CREATE |
| `services/match-service.ts` | MODIFY — trigger feed post on result entry |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 4A (dashboard hosts the feed)
