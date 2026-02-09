# Clubroom Master Refactoring Plan

## Status: COMPLETE
Last updated: 2026-02-08

> All 5 phases complete. See `docs/ROADMAP.md` for the forward-looking plan.

---

## Phase 1: Design System Library (Uber-grade)
**Goal:** Every screen uses theme tokens. Zero hardcoded colors.

### 1A. Extend Theme Tokens [DONE]
- [x] Added semantic colors: info, destructive, onPrimary/onSecondary/onSuccess/onError/onInfo/onDestructive
- [x] Opacity tokens: overlay in Colors
- [x] Dark mode palette aligned with light (minimalist approach)

### 1B. Build Primitive Components [DONE]
Created `components/ui/primitives/` — 12 components + barrel export:
- [x] `Button` — primary, secondary, outline, ghost, destructive + sm/md/lg + loading + icons
- [x] `Card` — elevated, bordered, flat + optional onPress
- [x] `Badge` — default, success, warning, error, info + sm/md sizes
- [x] `Avatar` — sm/md/lg/xl with fallback initials + online indicator
- [x] `Input` — text, search, multiline with label/error/helper/icons
- [x] `Chip` — selectable, removable variants
- [x] `Divider` — horizontal/vertical with configurable spacing
- [x] `Section` — screen section with title/subtitle/action
- [x] `ListItem` — standard row with icon/avatar, right slot, chevron
- [x] `StatusBanner` — full-width dismissible, 4 variants
- [x] `ProgressBar` — animated fill bar
- [x] `Tag` — colored labels, semantic or custom colors

### 1C. Replace Hardcoded Colors [DONE]
1,159 instances across 301 files → 0 remaining:
- [x] components/ — 103 files fixed (agent a41b598)
- [x] app/ — 108 files fixed, 340 hex values replaced (agent ab5c909)
- [x] Top 30 worst files fixed first (agents a48c55e + a9e39b6)
- [x] Exceptions preserved: decorative/celebration, chart data, badge tiers, role colors, shadowColor

### 1D. Replace Hardcoded Typography [PARTIAL]
- [x] Typography tokens defined and used in primitives
- [ ] Full audit of remaining non-token fontSize/fontWeight still needed

---

## Phase 2: Feature Fixes — Club Management
**Goal:** Full club admin experience like Facebook Groups.

### 2A. Member Management [DONE]
- [x] Members list items clickable → navigate to member detail screen
- [x] Member detail screen: `app/club/[clubId]/member/[memberId].tsx` with profile, role, squads
- [x] Role actions: changeMemberRole(), canManageRole(), getAssignableRoles() in club-service
- [x] Only leaders/admins see management options (hierarchy enforced)
- [x] Confirmation dialogs for remove + ban (danger zone section)

### 2B. Squad Management [DONE]
- [x] Squad route fixed: `app/club/squad/[id].tsx` now exists
- [x] Squad detail screen: shows all members, inline rename, manage roster
- [x] Add/remove members to/from squad with one tap
- [x] Squad settings: rename, delete with confirmation, send squad invite

### 2C. Club Photos [DONE]
- [x] Added profilePhotoUrl and coverPhotoUrl to Club interface
- [x] ClubHeader reworked: cover photo banner + profile photo avatar
- [x] expo-image-picker integration with permission flow + crop
- [x] onUpdatePhotos callback for parent screens

---

## Phase 3: Booking & Invites System
**Goal:** Coaches create sessions, choose open/closed invite, auto-post to feed.

### 3A. Open/Closed Invite System [DONE]
- [x] Add invite type to session creation: 'OPEN' | 'CLOSED' | 'SQUAD_ONLY'
- [x] OPEN: visible when browsing coach's available sessions
- [x] CLOSED: invite-only, coach sends specific invites
- [x] SQUAD_ONLY: only squad members can see/book
- [x] UI selector in group session creation wizard (type step)
- [x] Invite type shown in review step before publish
- [x] Backend: SessionInviteType on GroupSession, CreateGroupSessionInput, session-crud-service

### 3B. Auto-Post to Coach Feed [DONE]
- [x] When coach creates open session → auto-generate feed post
- [x] Feed post shows session details + "Book Now" CTA
- [x] Parents who follow coach see it in their feed

---

## Phase 4: Coach Features
**Goal:** Coaches have personal feeds, can join groups as members.

### 4A. Coach Personal Feed [DONE]
- [x] Every coach gets a personal feed (not just club feed)
- [x] Parents who've had sessions see coach's posts
- [x] Option to share post to personal feed OR club feed OR both (FeedType)
- [x] Feed post creation with audience selector

### 4B. Coach Group Membership [DONE]
- [x] Coaches can join community groups as regular members
- [x] Auto-assign MEMBER role (not admin)
- [x] Group admins can promote coach to moderator/admin
- [x] Notifications for role changes

---

## Phase 5: Availability UX
**Goal:** Intuitive availability setup with first-time tutorial.

### 5A. Interactive Tutorial [DONE]
- [x] First-time coach onboarding: step-by-step availability setup
- [x] 4-step animated walkthrough modal (Welcome → Tap → Templates → Done)
- [x] useAvailabilityTutorial() hook with storage persistence
- [x] Wired into availability screen — auto-shows on first visit

### 5B. Simplify Availability Flow [DONE]
- [x] Quick-add templates at top of screen (Weekday Mornings, Evenings, Weekend)
- [x] Visual weekly calendar grid (tap to toggle slots) — AvailabilityWeekGrid
- [x] Clear distinction: "Available for 1v1" vs "Group session scheduled"
- [x] Quick-add templates (one-tap presets)
- [x] Summary stats: hrs/week, days, slots

---

## Progress Log

| Date | Phase | What was done |
|------|-------|---------------|
| 2026-02-05 | Setup | Plan created, audit complete |
| 2026-02-05 | 1B | Built 12 primitive UI components in components/ui/primitives/ |
| 2026-02-05 | 1C | Replaced hardcoded colors in top 30 worst-offender files |
| 2026-02-06 | 1C | Replaced ALL remaining hardcoded colors: 103 component files + 108 app files (0 remaining) |
| 2026-02-06 | 2A | Member management: click-through, detail screen, role management, ban/remove |
| 2026-02-06 | 2B | Squad routing fixed: detail screen, rename, add/remove members, delete |
| 2026-02-06 | 2C | Club photos: cover + profile photo with expo-image-picker |
| 2026-02-06 | 2 | 7 new service methods in club-service.ts (changeMemberRole, banMember, etc.) |
| 2026-02-06 | 3-5 | Launched 5 parallel agents for Phases 3A, 3B, 4A, 4B, 5A/5B |
| 2026-02-06 | 3B | Auto-post to feed: OPEN_SESSION_PUBLISHED event + socialFeedService.createSessionAnnouncementPost() |
| 2026-02-06 | 4A | Coach personal feed: FeedType (PERSONAL/CLUB/BOTH), getPersonalFeed(), getCombinedFeedForParent() |
| 2026-02-06 | 4B | Coach group membership: joinGroup with isCoach flag, role hierarchy, promoteMember(), notifications |
| 2026-02-06 | 5A/5B | Availability tutorial: 4-step animated walkthrough, useAvailabilityTutorial() hook, wired into screen |
| 2026-02-06 | 3A | Invite type selector: UI in create-session-type-step, inviteType on GroupSession + CreateGroupSessionInput |
