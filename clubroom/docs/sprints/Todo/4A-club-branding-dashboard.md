# 4A: Club Branding + Dashboard + Calendar

**Phase**: 2 — Differentiation
**Origin**: Sprint 4, Tasks 1, 2, 3
**Estimated scope**: 3 tasks, club identity + admin overview

## Goal

Clubs get a visual identity (logo, colours, cover photo) and a proper dashboard with stats, results, and calendar. Clubs feel alive, not like a boring list.

## Tasks

### Task 1: Club Branding Editor

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
│ │ Primary colour [#2563EB]    │   │
│ │ Secondary      [#F59E0B]    │   │
│ │ Tagline        [Enter...]    │   │
│ └──────────────────────────────┘   │
│                                     │
│ Preview:                            │
│ [How your club card looks]          │
└─────────────────────────────────────┘
```

- Colour picker: 8 preset colours + custom hex input
- Image upload: camera roll or take photo
- Live preview of club card as you edit

### Task 2: Club Dashboard

**File**: `app/club/[clubId]/dashboard.tsx`

Replace the current flat club view with a proper dashboard:

- **Stats row**: Sessions this week, matches this week, events upcoming
- **Recent results**: Last 3 match results with score + W/D/L badge
- **Quick actions**: 4-button grid (Calendar, Post, Match, Event)
- **Feed**: Scrollable feed below with rich cards

### Task 3: Club Calendar

**File**: `app/club/[clubId]/calendar.tsx`

Aggregate view of ALL squad activity:

- Colour-coded by type (session/match/event) and by squad
- Filter by squad
- Tap an item to see detail
- Month/week/day view toggle
- Data source: Aggregate from `SessionOffering`, `Match`, `ClubEvent` where `clubId` matches

## Acceptance Criteria

- [ ] Club admins can set logo, cover photo, tagline, 2 brand colours
- [ ] Club dashboard shows stats, recent results, quick actions, and feed
- [ ] Club calendar aggregates all squads' sessions, matches, events
- [ ] Calendar supports month/week toggle and squad filter

## Files Changed

| File | Action |
|------|--------|
| `app/club/[clubId]/branding.tsx` | CREATE |
| `app/club/[clubId]/dashboard.tsx` | CREATE (or heavy MODIFY) |
| `app/club/[clubId]/calendar.tsx` | CREATE |
| `components/club/branding-editor.tsx` | CREATE |
| `components/club/club-calendar.tsx` | CREATE |
| `services/club-service.ts` | MODIFY — add branding methods |

## Dependencies

- **Blocks**: 4B (feed cards sit on dashboard)
- **Blocked by**: 1A (api-client)
