# Sprint 4: Club & School Revamp

## Goal

Clubs feel like living communities, not boring lists. Academies are visually distinct from clubs. The feed is rich with auto-generated content. A club calendar ties everything together.

## User Stories This Sprint Fixes

| Role | Story | Current State |
|------|-------|---------------|
| **Club Admin** | I want to brand my club with logo, colours, cover photo | ❌ Types exist, no editor |
| **Club Admin** | I want a dashboard showing my club's activity at a glance | ❌ Just a list |
| **Club Admin** | I want a calendar showing all sessions, matches, events | ❌ No aggregated view |
| **Club Member** | I want to see match results without the coach posting manually | ❌ Manual posts only |
| **Club Member** | I want the feed to feel alive with varied content | Feed is text-heavy |
| **Parent** | I want to see my child's squad schedule in one calendar | ❌ No squad calendar |
| **Academy Owner** | I want my academy to look different from a grassroots club | ❌ Identical screens |
| **Academy Owner** | I want a welcome flow for new members joining my academy | ❌ Nothing |
| **Coach** | I want match results to auto-post to the club feed | ❌ Manual only |

## Task 1: Club Branding Editor

**File**: `app/club/[clubId]/branding.tsx`

```
┌─────────────────────────────────────┐
│ [Cover Photo - full width]          │
│                                     │
│   [Club Badge]  Hackney Youth FC    │
│                                     │
│ ┌─ Branding ───────────────────┐   │
│ │ Club name      [Hackney Y..]│   │
│ │ Badge/Logo     [Upload]      │   │
│ │ Cover photo    [Upload]      │   │
│ │ Primary colour [#2563EB ■]  │   │
│ │ Secondary      [#F59E0B ■]  │   │
│ │ Tagline        [Enter...]    │   │
│ └──────────────────────────────┘   │
│                                     │
│ Preview:                            │
│ ┌──────────────────────────────┐   │
│ │ [How your club card looks]   │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

- Colour picker: 8 preset colours + custom hex input
- Image upload: camera roll or take photo
- Live preview of club card as you edit
- Saves to `Club.badge`, `Club.photoUrl`, `Club.tagline` + new fields for colours

## Task 2: Club Dashboard

**File**: `app/club/[clubId]/dashboard.tsx`

Replace the current flat club view with a proper dashboard:

```
┌─────────────────────────────────────┐
│ [Cover + Badge + Name]              │
│                                     │
│ ┌─ This Week ──────────────────┐   │
│ │ 3 sessions  │  1 match  │ 0 │   │
│ │ scheduled   │  Sat 10am │ events│
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Recent Results ─────────────┐   │
│ │ ⚽ U12s vs Arsenal   3-1 W  │   │
│ │ ⚽ U10s vs Chelsea   2-2 D  │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Quick Actions ──────────────┐   │
│ │ [📅 Calendar] [📝 Post]     │   │
│ │ [⚽ Match]    [📢 Event]    │   │
│ └──────────────────────────────┘   │
│                                     │
│ ┌─ Feed ───────────────────────┐   │
│ │ [Rich feed cards below...]   │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Stats row**: Sessions this week, matches this week, events upcoming.
**Recent results**: Last 3 match results with score + W/D/L badge.
**Quick actions**: 4-button grid for common admin tasks.
**Feed**: Scrollable feed below (same as current but with rich cards — see Task 4).

## Task 3: Club Calendar

**File**: `app/club/[clubId]/calendar.tsx`

Aggregate view of ALL squad activity:

```
┌─────────────────────────────────────┐
│ February 2026                       │
│ Mo Tu We Th Fr Sa Su                │
│                    1  2             │
│  3  4  5  6  7  8  9             │
│     •  •     •  ●                  │
│                                     │
│ • = session  ● = match  ◆ = event  │
│                                     │
│ Thursday 6 Feb                      │
│ ┌──────────────────────────────┐   │
│ │ 🟢 U12 Training  4:00-5:30  │   │
│ │    Hackney Downs Park        │   │
│ │    Coach: Marcus             │   │
│ └──────────────────────────────┘   │
│ ┌──────────────────────────────┐   │
│ │ 🟡 U10 Training  5:30-7:00  │   │
│ │    Hackney Downs Park        │   │
│ │    Coach: Sarah              │   │
│ └──────────────────────────────┘   │
│                                     │
│ Saturday 8 Feb                      │
│ ┌──────────────────────────────┐   │
│ │ 🔴 U12s vs Arsenal  10:00   │   │
│ │    Away — Emirates Stadium   │   │
│ │    Meet: 9:15 at clubhouse   │   │
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

- Colour-coded by type (session/match/event) and by squad
- Filter by squad
- Tap an item to see detail
- Month/week/day view toggle

**Data source**: Aggregate from `SessionOffering`, `Match`, `ClubEvent` where `clubId` matches.

## Task 4: Rich Feed Cards

**File**: `components/club/feed-cards/`

Auto-generate feed content from data events. Each card type has a distinct visual:

**Match Result Card** (`match-result-card.tsx`):
```
┌─────────────────────────────────────┐
│ ⚽ MATCH RESULT                     │
│                                     │
│   Hackney U12s    3 - 1    Arsenal  │
│      [badge]              [badge]   │
│                                     │
│ ⭐ Player of match: Jake B.        │
│ 📍 Hackney Downs Park              │
│ 🕐 Saturday 8 Feb                  │
│                                     │
│ ❤️ 12   💬 4                       │
└─────────────────────────────────────┘
```

**Badge Award Card** (`badge-award-card.tsx`):
```
┌─────────────────────────────────────┐
│ 🏅 BADGE AWARDED                   │
│                                     │
│ Jake B. earned "First Touch Master" │
│ Awarded by Coach Marcus             │
│ "Exceptional ball control in 1v1    │
│  drills today"                      │
│                                     │
│ ❤️ 8   💬 2                        │
└─────────────────────────────────────┘
```

**Session Recap Card** (`session-recap-card.tsx`):
```
┌─────────────────────────────────────┐
│ 📋 SESSION RECAP                    │
│                                     │
│ U12 Training — Thursday 4pm         │
│ Focus: Passing & Movement           │
│ 8/10 attended                       │
│                                     │
│ "Great energy today. Worked on..."  │
│                                     │
│ ❤️ 5   💬 1                        │
└─────────────────────────────────────┘
```

**Event Reminder Card** (`event-reminder-card.tsx`):
```
┌─────────────────────────────────────┐
│ 📅 UPCOMING EVENT                   │
│                                     │
│ End of Season Awards Night          │
│ Sat 15 Mar — 6:00pm                │
│ Hackney Clubhouse                   │
│                                     │
│ 12 going · 4 maybe · 2 not going   │
│ [RSVP Now]                          │
└─────────────────────────────────────┘
```

**Auto-generation**: When a match result is recorded (`match-service.ts`), auto-create a `ClubFeedPost` with `postType: 'match'`. Same for badge awards and session completions (from Sprint 2).

## Task 5: Academy Differentiation

**File**: `app/academy/[id]/home.tsx`

Academies get a distinct look:

1. **Header**: Full-width banner image with logo overlay (like a school website hero)
2. **Programme tiers**: Show different squads as "programmes" with descriptions
3. **Staff showcase**: Photo grid of coaches with specialties
4. **Welcome message**: Pinned message from academy owner for new members
5. **Colour theming**: Academy's primary/secondary colours theme the entire page

**What makes an academy different from a club**:

| Feature | Club | Academy |
|---------|------|---------|
| Header | Badge + name | Full banner + logo overlay |
| Squads | Listed as squads | Listed as "programmes" |
| Staff | Coach names only | Photo + bio + specialty cards |
| Join flow | Enter code | Apply → approval workflow |
| Branding | Badge + 2 colours | Full theme (banner, logo, colours, fonts) |

## Task 6: New Member Welcome Flow

**File**: `components/club/welcome-flow.tsx`

When a member first joins a club/academy:

```
Step 1: "Welcome to [Club Name]!" + cover photo
Step 2: "You've been added to [Squad Name]" (if applicable)
Step 3: "Here's what's coming up" — next 3 events/sessions
Step 4: "Meet the coaches" — coach cards
Step 5: [Done — Go to Club Home]
```

Quick 5-step carousel. Can be skipped.

## Task 7: Squad Group Chat

**File**: `app/club/[clubId]/squad/[squadId]/chat.tsx` + `components/club/group-chat.tsx`

Every squad gets a group chat — Spond's bread and butter. Parents coordinate here.

```
┌─────────────────────────────────────┐
│ U12 Lions Chat · 14 members        │
│                                     │
│ ┌─ 📌 Pinned ────────────────────┐ │
│ │ Coach Marcus: "Training        │ │
│ │ CANCELLED this Sat due to      │ │
│ │ pitch flooding. Back next week"│ │
│ └─────────────────────────────────┘ │
│                                     │
│ Sarah M.: "Can someone give Jake   │
│ a lift Tuesday? Stuck at work"     │
│                                     │
│ Tom R.: "Yeah no problem 👍"       │
│                                     │
│ [📷] Type a message...    [Send]   │
└─────────────────────────────────────┘
```

- One group chat per squad (auto-created)
- Coach can pin messages (announcements)
- Photo/image sharing
- Unread badge count on club tab
- Paginated message loading (scroll up)

## Task 8: Club Announcements

**File**: `components/club/feed-cards/announcement-card.tsx`

Club-wide announcements pinned to top of feed:
- Admin-only creation
- RSVP integration (reuses Sprint 2 RSVP)
- Push notification to all club members
- Pin/unpin by admin

## Task 9: Bulk Parent Messaging

**File**: `components/club/bulk-message.tsx`

Coach/admin sends to all parents in a squad or whole club:
- Select squad or entire club, or custom pick individuals
- Creates individual message threads (not group — privacy)
- Preview before send
- Delivery confirmation

## Acceptance Criteria

- [ ] Club admins can set logo, cover photo, tagline, 2 brand colours
- [ ] Club dashboard shows stats, recent results, quick actions, and feed
- [ ] Club calendar aggregates all squads' sessions, matches, events
- [ ] Calendar supports month/week toggle and squad filter
- [ ] Feed shows rich cards for match results, badges, recaps, events
- [ ] Match results auto-post to club feed
- [ ] Academy pages have distinct visual treatment (banner, staff, programmes)
- [ ] New member welcome flow triggers on first visit
- [ ] All club-related data uses `api-client.ts` from Sprint 1
- [ ] Every squad has a group chat with pinned messages
- [ ] Photo sharing in group chat
- [ ] Club announcements pinned to feed with RSVP
- [ ] Bulk messaging to squad or all club parents
- [ ] Unread badge count on club tab

## Files Changed

| File | Action |
|------|--------|
| `app/club/[clubId]/branding.tsx` | CREATE |
| `app/club/[clubId]/dashboard.tsx` | CREATE (or heavy MODIFY of existing) |
| `app/club/[clubId]/calendar.tsx` | CREATE |
| `app/club/[clubId]/squad/[squadId]/chat.tsx` | CREATE — squad group chat |
| `app/academy/[id]/home.tsx` | MODIFY — distinct academy layout |
| `components/club/feed-cards/match-result-card.tsx` | CREATE |
| `components/club/feed-cards/badge-award-card.tsx` | CREATE |
| `components/club/feed-cards/session-recap-card.tsx` | CREATE |
| `components/club/feed-cards/event-reminder-card.tsx` | CREATE |
| `components/club/feed-cards/announcement-card.tsx` | CREATE |
| `components/club/welcome-flow.tsx` | CREATE |
| `components/club/branding-editor.tsx` | CREATE |
| `components/club/club-calendar.tsx` | CREATE |
| `components/club/group-chat.tsx` | CREATE — reusable group chat UI |
| `components/club/bulk-message.tsx` | CREATE — bulk parent messaging |
| `services/club-service.ts` | MODIFY — add branding + auto-post methods |
| `services/group-messaging-service.ts` | CREATE — group chat CRUD |
| `services/match-service.ts` | MODIFY — trigger feed post on result entry |
