# Sprint Readiness Audit — Deep Verification

> Line-by-line cross-reference of every file in the codebase against every sprint.
> This document corrects errors in the sprints and identifies everything still missing.

---

## CRITICAL CORRECTIONS

### Files Sprints Say "CREATE" That Already Exist

These files exist and are substantial. Sprints must say **MODIFY/ENHANCE** not CREATE:

| File | Lines | Sprint Says | Should Say |
|------|-------|-------------|------------|
| `app/session/[id]/complete.tsx` | 669 | Sprint 2: CREATE | ENHANCE — add RSVP pre-fill, attendance categories |
| `app/booking/[id]/cancel.tsx` | 544 | Sprint 3: CREATE | ENHANCE — add policy display, reason picker, coach cancel flow |
| `app/favourites/index.tsx` | 269 | Sprint 8: CREATE | EXISTS — review and enhance |
| `app/settings/privacy.tsx` | 242 | Sprint 5: CREATE | ENHANCE — add visibility toggles, data export |
| `app/settings/notifications/preferences.tsx` | 334 | Sprint 5: CREATE | ENHANCE — add per-type toggles |
| `app/settings/calendar-sync.tsx` | 371 | Sprint 2: not mentioned | EXISTS — calendar sync already built |
| `services/favourite-service.ts` | 296 | Sprint 8: CREATE | EXISTS — review and enhance |
| `services/calendar-service.ts` | 437 | Sprint 2: CREATE | EXISTS — review and enhance |
| `components/ui/skeleton.tsx` | 59 | Sprint 5: CREATE | EXISTS — extend with more variants |

### Features USER-STORIES.md Marks ✅ That Need Re-Evaluation for Cash MVP

These are marked as built but relate to payments. For cash-only MVP they need to be:
- Kept as display-only (price shown, paid in cash)
- OR deferred entirely
- OR re-marked as 🔨 / ❌

| Story | Current Status | Cash MVP Status |
|-------|---------------|-----------------|
| Pay with credit/debit card | ✅ | ❌ DEFER — cash only |
| Save payment methods | ✅ | ❌ DEFER |
| Use wallet balance | ✅ | ❌ DEFER |
| Apply promo code | ✅ | ❌ DEFER (or keep as coach-managed discount) |
| Purchase session packages | ✅ | 🔨 RETHINK — packages without payment? |
| See payment history | ✅ | ❌ DEFER |
| Download invoices | ✅ | ❌ DEFER |
| Withdraw to bank | ✅ | ❌ DEFER |
| Withdraw to PayPal | ✅ | ❌ DEFER |
| Understand platform fees | ✅ | ❌ DEFER |
| Create promo codes | ✅ | ❌ DEFER |
| See referral earnings | ✅ | ❌ DEFER (keep referral tracking, remove money) |
| Club subscription/billing | ❌ | ❌ DEFER |
| Request refund | ❌ | N/A — no money to refund |

### User Stories Missing from USER-STORIES.md Entirely

These are covered by sprints but not documented as user stories:

| Missing Story | Sprint |
|---------------|--------|
| As a parent, I want to RSVP for group training sessions (going/can't/maybe) | Sprint 2 |
| As a coach, I want to see RSVP counts for my group sessions | Sprint 2 |
| As a parent, I want to add a booking to my phone calendar | Sprint 2 |
| As a parent, I want to decline an invite with a reason | Sprint 2 |
| As a coach, I want to block dates when I'm on holiday | Sprint 3 |
| As a coach, I want to mark a player as no-show | Sprint 3 |
| As a parent, I want to see the cancellation policy before cancelling | Sprint 3 |
| As a coach, I want to see a chat for each squad | Sprint 4 |
| As a coach, I want to pin announcements in squad chat | Sprint 4 |
| As a coach, I want to message all parents at once | Sprint 4 |
| As a user, I want to report a safety concern about a coach | Sprint 5 |
| As a user, I want to block another user | Sprint 5 |
| As a user, I want to delete my account | Sprint 5 |
| As a user, I want to export my data | Sprint 5 |
| As a user, I want push notifications for bookings and messages | Sprint 6 |
| As a user, I want an in-app notification centre | Sprint 6 |
| As a coach, I want a shareable public profile page | Sprint 7 |
| As a coach, I want to share a QR code for my booking link | Sprint 7 |
| As a coach, I want to offer trial sessions | Sprint 7 |
| As a coach, I want to see my earnings dashboard | Sprint 7 |
| As a parent, I want to save/favourite coaches | Sprint 8 |
| As a parent, I want to see coaches on an Airbnb-quality map with prices | Sprint 8 |
| As a parent, I want personalised coach recommendations for my child | Sprint 8 |
| As an athlete, I want to keep a personal session journal | Sprint 9 |
| As a parent, I want to set training goals for my child | Sprint 9 |
| As a coach, I want video challenge features | Sprint 9 |
| As a coach, I want session plan templates | Sprint 9 |
| As a parent, I want a monthly progress report I can share | Sprint 9 |
| As a new coach, I want a guided onboarding to get my profile live fast | Sprint 10 |
| As a new parent, I want to find a coach in under 1 minute | Sprint 10 |
| As a user, I want celebrations when badges/goals are achieved | Sprint 10 |
| As a parent, I want session reminders with directions | Sprint 10 |
| As a coach, I want to tell parents "I'm on my way" | Sprint 10 |
| As a parent, I want to share account access with my partner/spouse | NOT IN ANY SPRINT |

---

## ROUTE-BY-ROUTE COVERAGE MAP

Every screen in `app/`, mapped to which sprint touches it.

### Core Tabs
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `(tabs)/index.tsx` | 50 | Sprint 8 (REWRITE), Sprint 10 | Covered — thin router, real work in role-specific components |
| `(tabs)/_layout.tsx` | 213 | Sprint 6 (deep linking) | Needs notification bell badge added |
| `(tabs)/athletes.tsx` | 524 | Sprint 5 (states) | Needs loading/error/empty |
| `(tabs)/availability.tsx` | 969 | Sprint 3 (scheduling rules) | Needs blocked dates integration |
| `(tabs)/badges.tsx` | 793 | Sprint 10 (celebrations) | Needs celebration trigger on award |
| `(tabs)/bookings/index.tsx` | 284 | Sprint 2 (lifecycle) | Needs AWAITING_COMPLETION status |
| `(tabs)/bookings/[id].tsx` | 826 | Sprint 2, 3 | Needs completion button, cancel flow, calendar add |
| `(tabs)/bookings/objectives.tsx` | 537 | — | NOT IN ANY SPRINT |
| `(tabs)/bookings/report-problem.tsx` | 255 | Sprint 5 (safety) | Report flow exists — enhance |
| `(tabs)/bookings/session-feedback.tsx` | 130 | Sprint 2 (review prompt) | EXISTS — enhance |
| `(tabs)/bookings/statistics.tsx` | 460 | — | NOT IN ANY SPRINT |
| `(tabs)/children.tsx` | 779 | Sprint 10 (onboarding) | Needs enhanced child creation (skill level, position) |
| `(tabs)/club-hub.tsx` | 541 | Sprint 4 (revamp) | Needs dashboard/calendar/feed/group chat |
| `(tabs)/coach-profile.tsx` | 1299 | Sprint 7 (public profile, share) | Needs share button, similar coaches |
| `(tabs)/earnings.tsx` | 1 | Sprint 7 (earnings dashboard) | STUB — 1 line, needs full build |
| `(tabs)/edit-profile.tsx` | 1393 | — | Large file, not in any sprint. Review for completeness |
| `(tabs)/feed.tsx` | 1030 | Sprint 4 (rich cards) | Needs announcement cards, badge cards |
| `(tabs)/messages.tsx` | 458 | Sprint 4 (group chat) | Needs group conversation list |
| `(tabs)/more.tsx` | 43 | — | Navigation menu, fine |
| `(tabs)/notifications.tsx` | 378 | Sprint 6 (notification centre) | EXISTS — enhance with deep link tap handling |
| `(tabs)/profile.tsx` | 1 | — | STUB — redirects, fine |
| `(tabs)/roster.tsx` | 775 | Sprint 5 (states) | Needs loading/error/empty |
| `(tabs)/schedule.tsx` | 863 | Sprint 3 (rules), Sprint 2 (lifecycle) | Needs blocked dates, session completion CTA |
| `(tabs)/settings.tsx` | 640 | Sprint 5 (completeness) | Needs expanded settings sections |
| `(tabs)/wallet.tsx` | 683 | DEFER | Cash only — mark as future |

### Booking Flow
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `book-coach.tsx` | 427 | Sprint 3 | Needs scheduling rules enforcement |
| `book/[coachId]/session-type.tsx` | 88 | — | Covered |
| `book/[coachId]/schedule.tsx` | 245 | Sprint 3 | Needs rules enforcement |
| `book/[coachId]/details.tsx` | 108 | — | Covered |
| `book/[coachId]/review.tsx` | 239 | Sprint 3 | Needs cancellation policy display |
| `book/[coachId]/confirmation.tsx` | 218 | Sprint 2 | Needs calendar add, cash payment reminder |
| `confirm-booking.tsx` | 604 | Sprint 3 | Needs policy display |
| `booking/[id]/cancel.tsx` | 544 | Sprint 3 | EXISTS — enhance with policy tiers, reason |

### Discovery
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `discover/map.tsx` | 274 | Sprint 8 + MAP_EXPERIENCE | REWRITE with react-native-maps |
| `discover/filters.tsx` | 120 | Sprint 8 | REBUILD |
| `discover-sessions.tsx` | 503 | Sprint 8 | Review — may be redundant with parent home redesign |

### Session Management
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `sessions/create.tsx` | 1241 | — | Large, comprehensive. Not in sprint but works |
| `session/[id]/complete.tsx` | 669 | Sprint 2 | EXISTS — enhance with RSVP pre-fill |
| `session-invites/create.tsx` | 967 | Sprint 1 (fix bug) | Fix accept→booking |
| `session-invites/[id].tsx` | 947 | Sprint 1 (fix bug) | Fix accept→booking |
| `session-invites/index.tsx` | 678 | Sprint 2 (decline with reason) | Enhance |
| `session-invites/group.tsx` | 973 | Sprint 2 (RSVP) | Integrate RSVP |
| `session-invites/squad.tsx` | 801 | Sprint 2 (RSVP) | Integrate RSVP |
| `session-notes/[bookingId].tsx` | 103 | Sprint 2 | Small — enhance post-session |
| `group-sessions/create.tsx` | 898 | Sprint 2 (RSVP) | Trigger RSVP on create |
| `group-sessions/[id].tsx` | 595 | Sprint 2 (RSVP) | Show RSVP summary |
| `group-sessions/[id]/roster.tsx` | 937 | Sprint 2 | Pre-fill from RSVPs |
| `group-sessions/index.tsx` | 494 | — | Covered |

### Club & Academy
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `club/[id].tsx` | 955 | Sprint 4 (revamp) | HEAVY MODIFY — add dashboard, calendar, feed, chat |
| `club/create.tsx` | 432 | — | Works |
| `club/invite-members.tsx` | 629 | — | Works |
| `club/settings.tsx` | 713 | Sprint 4 (branding) | Needs branding editor integration |
| `club/squad/create.tsx` | 439 | — | Works |
| `club/training-schedule.tsx` | 621 | Sprint 4 (calendar) | Enhance with club calendar |
| `academy/[id].tsx` | 575 | Sprint 4 (differentiation) | Needs distinct visual treatment |
| `academy/[id]/branding.tsx` | 467 | Sprint 4 | EXISTS — review |
| `academy/[id]/settings.tsx` | 349 | — | Covered |
| `academy/[id]/staff.tsx` | 444 | — | Covered |
| `academy/create.tsx` | 517 | — | Covered |
| `academy/join.tsx` | 206 | — | Covered |

### Analytics & Development
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `analytics/dashboard.tsx` | 501 | Sprint 7 (earnings) | Enhance with earnings projections |
| `analytics/[athleteId].tsx` | 755 | Sprint 9 (radar charts) | Enhance with radar |
| `analytics/retention.tsx` | 456 | Sprint 7 | Review |
| `analytics/revenue.tsx` | 542 | Sprint 7 (earnings) | Enhance |
| `development/athlete/[athleteId].tsx` | 1001 | Sprint 9 | Enhance with timeline, radar |
| `development/athlete-session/[sessionId].tsx` | 308 | Sprint 9 | Enhance with recap card |
| `development/badges.tsx` | 537 | Sprint 10 (celebrations) | Trigger celebrations |
| `development/child-progress/[childId].tsx` | 468 | Sprint 9 (progress reports) | Enhance |
| `development/my-progress.tsx` | 731 | Sprint 9 (athlete journal) | Enhance |
| `development/session/[sessionId].tsx` | 980 | Sprint 9 | Enhance with recap |
| `development/athlete/[athleteId]/special-needs.tsx` | 600 | — | NOT IN ANY SPRINT |

### Events & Matches
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `events/create.tsx` | 885 | — | Comprehensive, works |
| `events/[id].tsx` | 583 | — | Works |
| `events/[id]/attendees.tsx` | 316 | — | Works |
| `events/[id]/rsvp.tsx` | 588 | Sprint 2 (RSVP) | May reuse RSVP components |
| `events/index.tsx` | 242 | — | Works |
| `matches/create.tsx` | 874 | — | Comprehensive |
| `matches/[id].tsx` | 701 | Sprint 4 (result cards in feed) | Auto-post result to feed |
| `matches/index.tsx` | 353 | — | Works |

### Drills & Goals
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `drills/index.tsx` | 422 | Sprint 9 | EXISTS |
| `drills/[id].tsx` | 650 | Sprint 9 | EXISTS |
| `drills/library.tsx` | 440 | Sprint 9 | EXISTS — enhance with 30+ templates |
| `drills/create.tsx` | 135 | Sprint 9 | Small — enhance |
| `drills/assign.tsx` | 736 | Sprint 9 | EXISTS |
| `goals/index.tsx` | 434 | Sprint 9 (goal setting) | EXISTS — enhance |
| `goals/[id].tsx` | 672 | Sprint 9 | EXISTS — enhance with progress tracking |
| `goals/create.tsx` | 189 | Sprint 9 | EXISTS — enhance with suggestions |

### Family
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `family/index.tsx` | 432 | — | Works |
| `family/calendar.tsx` | 352 | — | Works |
| `family/spending.tsx` | 492 | DEFER | Cash only |
| `family/sharing.tsx` | 726 | **NOT IN ANY SPRINT** | Family sharing exists but USER-STORIES says ❌ Missing |

### Health & Safety
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `health/index.tsx` | 496 | — | Works, not in sprint |
| `health/[id].tsx` | 478 | — | Works |
| `health/injuries.tsx` | 335 | — | Works |
| `health/log.tsx` | 111 | — | Works |
| `verification/*` | 1557 total | — | Works |

### Videos
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `videos/index.tsx` | 356 | Sprint 9 (challenges) | Enhance with challenges |
| `videos/[id].tsx` | 477 | — | Works |
| `videos/annotate/[id].tsx` | 594 | — | Works |
| `videos/review/[id].tsx` | 540 | — | Works |
| `videos/upload.tsx` | 349 | Sprint 9 | Enhance for challenge submissions |

### Payment/Commerce (DEFER for Cash MVP)
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `wallet.tsx` | 683 | DEFER | Cash only |
| `wallet/promo.tsx` | 400 | DEFER | Cash only |
| `invoices/index.tsx` | 234 | DEFER | Cash only |
| `invoices/[id].tsx` | 416 | DEFER | Cash only |
| `packages/index.tsx` | 272 | RETHINK | Packages without payment? |
| `packages/[id].tsx` | 498 | RETHINK | |
| `packages/manage.tsx` | 492 | RETHINK | |
| `payment/add-card.tsx` | 33 | DEFER | Cash only |
| `payment/methods.tsx` | 54 | DEFER | Cash only |
| `earnings.tsx` (standalone) | 903 | Sprint 7 | Enhance with projections |

### Settings
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `settings/index.tsx` | 331 | Sprint 5 (completeness) | Enhance |
| `settings/account.tsx` | 352 | Sprint 5 | Enhance with delete account |
| `settings/appearance.tsx` | 317 | — | Works (dark mode future) |
| `settings/calendar-sync.tsx` | 371 | — | EXISTS — not in any sprint! |
| `settings/help.tsx` | 351 | — | Works |
| `settings/notifications/index.tsx` | 226 | Sprint 6 | Enhance |
| `settings/notifications/preferences.tsx` | 334 | Sprint 5/6 | EXISTS — enhance |
| `settings/privacy.tsx` | 242 | Sprint 5 | EXISTS — enhance |

### Other
| Route | Lines | Sprint | Status |
|-------|-------|--------|--------|
| `compare/index.tsx` | 227 | — | Works |
| `compare/[ids].tsx` | 265 | — | Works |
| `community/index.tsx` | 523 | — | NOT IN ANY SPRINT |
| `community/[groupId].tsx` | 489 | — | NOT IN ANY SPRINT |
| `carpool/index.tsx` | 919 | OUT OF SCOPE | Listed as out of scope |
| `referrals/index.tsx` | 402 | DEFER | Remove money, keep tracking |
| `referrals/invite.tsx` | 459 | DEFER | Remove money, keep tracking |
| `chat/[threadId].tsx` | 227 | Sprint 4 (group chat) | Enhance for group messages |
| `skills/index.tsx` | 310 | Sprint 9 | Works |
| `skills/[category].tsx` | 577 | Sprint 9 | Works |
| `coach/[id].tsx` | 849 | Sprint 7 (share, similar) | Enhance |
| `rate-coach.tsx` | 478 | Sprint 2 (review prompt) | Works — trigger after completion |
| `review/[bookingId].tsx` | 234 | Sprint 2 | Works |
| `coach-invites.tsx` | 464 | Sprint 1 (fix bug) | Fix accept flow |
| `invites.tsx` | 654 | Sprint 1 (fix bug), Sprint 2 (decline reason) | Fix + enhance |

---

## SCREENS NOT COVERED BY ANY SPRINT

These files exist, are substantial, and no sprint mentions them:

| File | Lines | What It Does | Action Needed |
|------|-------|-------------|--------------|
| `(tabs)/bookings/objectives.tsx` | 537 | Booking learning objectives | Review — may be redundant or needs integration with session plans (Sprint 9) |
| `(tabs)/bookings/statistics.tsx` | 460 | Booking statistics view | Review — integrate into coach analytics (Sprint 7) |
| `(tabs)/edit-profile.tsx` | 1393 | Full profile editor | Large file, works but needs accessibility pass (Sprint 5) |
| `development/athlete/[athleteId]/special-needs.tsx` | 600 | Special needs tracking | Important for inclusivity — ensure it stays accessible |
| `community/index.tsx` | 523 | Community groups | Feature exists — ensure sprint 4 group chat doesn't duplicate |
| `community/[groupId].tsx` | 489 | Group detail | Same — clarify relationship to squad group chat |
| `family/sharing.tsx` | 726 | Family account sharing | USER-STORIES says ❌ Missing but file exists! 726 lines! |
| `settings/calendar-sync.tsx` | 371 | Calendar sync settings | Sprint 2 says create calendar service but this already exists |
| `bookings/subscribe.tsx` | 335 | Subscription booking | RETHINK for cash MVP |
| `admin/promo-codes.tsx` | 499 | Promo code management | DEFER for cash MVP or keep as discount tracking |
| `(tabs)/admin/invite-codes.tsx` | 406 | Invite code admin | Works, not in sprint |
| `availability/scheduling-rules.tsx` | 602 | Scheduling rules editor | Sprint 3 says CREATE but this EXISTS |
| `availability/block-date.tsx` | 285 | Block date screen | Sprint 3 says CREATE but this EXISTS |

---

## FAMILY SHARING — CRITICAL FIND

`app/family/sharing.tsx` is **726 lines** and implements family account sharing (adding partner/spouse). The USER-STORIES.md marks this as ❌ Missing, and NO SPRINT covers it. But the code EXISTS.

**Action needed**: Verify this file works, add to Sprint 5 or create separate task. This is a highly requested feature for parents.

---

## SCHEDULING RULES — ALREADY BUILT

`app/availability/scheduling-rules.tsx` is **602 lines**. Sprint 3 says to create scheduling rules UI, but it already exists. Sprint 3 needs to say ENHANCE not CREATE.

Also: `app/availability/block-date.tsx` is **285 lines**. Sprint 3 says create blocked dates, but it exists.

---

## COMMUNITY GROUPS vs SQUAD GROUP CHAT

`app/community/` has 2 screens (1012 lines total) for community groups. Sprint 4 adds squad group chat. These are different things:
- **Community groups**: Open groups anyone can join (like Reddit/Facebook groups)
- **Squad group chat**: Private chat within a squad's parents + coaches

Both should exist. Sprint 4 should clarify it's creating squad-specific group chat, NOT replacing community groups.

---

## PACKAGES WITHOUT PAYMENT

`app/packages/` has 3 screens (1262 lines total) for session packages. With cash-only MVP:
- **Option A**: Defer entirely (hide from UI)
- **Option B**: Rethink as "session bundles" — coach creates a 4-session bundle at £150, parent books all 4 at once, pays cash per session (£37.50 each). Bundle tracks completion.

Recommend Option B — it's a coach business tool even without digital payment.

---

## WHAT NEEDS NEW SPRINTS (Not Covered Anywhere)

### 1. USER-STORIES.md Rewrite
The current USER-STORIES.md is out of date. It marks payment features as ✅ when they should be deferred. It marks family sharing as ❌ when the code exists. It's missing 30+ stories from the sprints. **Needs a complete rewrite.**

### 2. Cash MVP Cleanup Sprint
All payment-related UI needs to be:
- Hidden behind feature flags
- OR repurposed (packages → bundles, earnings → display-only tracking)
- OR cleanly deferred with "Coming soon" placeholder

Files affected: wallet.tsx, invoices/, packages/, payment/, promo-codes, earnings (partially).

### 3. Existing Feature Polish
These routes exist but need sprint-level attention:
- `community/` — 1012 lines, works but needs Sprint 5 loading/error/empty
- `health/` — 1420 lines, works but needs Sprint 5 treatment
- `verification/` — 1557 lines, works
- `compare/` — 492 lines, works
- `referrals/` — 861 lines, remove money tracking, keep sharing

---

## TOTAL CODEBASE STATS

| Category | Count | Total Lines |
|----------|-------|-------------|
| App pages/screens | 173 | ~78,000 |
| Components | 234 | ~45,000 |
| Services | 46 | ~15,000 |
| Constants/Types | ~10 | ~8,000 |
| **Total** | **~463 files** | **~146,000 lines** |

This is a serious codebase. Not a prototype — a real application with deep features.

---

## SPRINT CORRECTIONS NEEDED

| Sprint | Correction |
|--------|-----------|
| **1** | No corrections — new files correctly marked CREATE |
| **2** | `calendar-service.ts` EXISTS (437 lines). `session/[id]/complete.tsx` EXISTS (669 lines). Change CREATE → ENHANCE. Add: integrate with existing `events/[id]/rsvp.tsx` (588 lines) for RSVP pattern |
| **3** | `availability/scheduling-rules.tsx` EXISTS (602 lines). `availability/block-date.tsx` EXISTS (285 lines). `booking/[id]/cancel.tsx` EXISTS (544 lines). Change all CREATE → ENHANCE |
| **4** | Community groups exist separately — clarify squad chat is NEW alongside existing community. `academy/[id]/branding.tsx` EXISTS (467 lines) |
| **5** | `settings/privacy.tsx` EXISTS (242 lines). `settings/notifications/preferences.tsx` EXISTS (334 lines). `skeleton.tsx` EXISTS (59 lines). Change CREATE → ENHANCE. Add: family/sharing.tsx audit (726 lines — verify it works) |
| **6** | `(tabs)/notifications.tsx` EXISTS (378 lines). Change CREATE → ENHANCE |
| **7** | `earnings.tsx` EXISTS (903 lines) but `(tabs)/earnings.tsx` is 1-line STUB. Both exist — consolidate |
| **8** | `favourites/index.tsx` EXISTS (269 lines). `services/favourite-service.ts` EXISTS (296 lines). Change CREATE → ENHANCE. `discover-sessions.tsx` (503 lines) may be redundant — clarify |
| **9** | `drills/` already has 5 screens (2383 lines total). `goals/` has 3 screens (1295 lines). `skills/` has 2 screens (887 lines). These are ENHANCE not CREATE. Sprint 9 adds radar charts, journal, challenges ON TOP of what exists |
| **10** | `(tabs)/bookings/session-feedback.tsx` EXISTS (130 lines) — integrate with review prompt |

---

## FINAL VERDICT: ARE THE SPRINTS READY?

**No. Three things need to happen:**

1. **Correction pass**: Fix all CREATE → ENHANCE for existing files. A developer picking up Sprint 3 and seeing "CREATE `app/booking/[id]/cancel.tsx`" will be confused when the file already has 544 lines of code.

2. **Coverage gaps**: Add the 12 uncovered routes to appropriate sprints (objectives, statistics, special-needs, community, family-sharing, edit-profile, calendar-sync, etc.)

3. **Cash MVP cleanup**: Need a Sprint 0 or Sprint 1 addition that flags/hides payment UI and repurposes packages as session bundles.

After these three fixes, the sprints are comprehensive and implementation-ready.
