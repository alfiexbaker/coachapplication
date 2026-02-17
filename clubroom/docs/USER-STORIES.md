# User Stories — Clubroom Feature Map

> Updated: 2026-02-11
> Legend: ✅ Built | 🔨 Needs Enhancement | ❌ Missing | 💤 Deferred (Cash MVP)
> See `ROADMAP.md` for the 5-month execution plan.

---

## ROLES

| Role | Description |
|------|-------------|
| **COACH** | Individual coaches offering sessions |
| **PARENT** | Books sessions for their children |
| **ATHLETE** | Adult athletes booking for themselves |
| **CLUB_ADMIN** | Manages club/academy |
| **CLUB_COACH** | Coach within a club structure |

---

## Completed Foundational Features (155 stories)

<details>
<summary>Click to expand — all foundational features that are built and working</summary>

### Onboarding & Auth
- ✅ Coach: sign up, set rate, qualifications, verify identity, background check, specialties, bio/photo, social links
- ✅ Parent: sign up, add children, emergency contacts, medical info
- ✅ Athlete: sign up, book for self

### Discovery
- ✅ Search coaches near me (postcode), filter by specialty/price/rating, compare side-by-side
- ✅ Save favourites, see reviews, see verification, message coach before booking
- ✅ Coach: appear in search, highlight specialties, showcase reviews, set service area

### Session Creation (Coach)
- ✅ Create 1:1 and group sessions, set pricing/duration/location/description/skill focus/age/max participants
- ✅ Recurring: weekly, bi-weekly, end date, cancel instances, end series, see upcoming
- ✅ Invites: invite-only sessions, invite specific athletes, bulk invite, accept/decline status, squad invites, propose multiple slots

### Booking
- ✅ Book with few taps, select child, book recurring, add note, see total cost, join waitlist
- ✅ See all bookings, cancel booking, counter-propose times, invite history, pending badge

### Availability (Coach)
- ✅ Weekly template, sync Google/Apple Calendar, schedule view

### Post-Session
- ✅ Add session notes, set drills, award badges, upload/annotate videos, update goals
- ✅ Parent: leave review, see notes/drills/badges/videos, mark drills complete

### Progress Tracking
- ✅ Coach: skill progression, set/track goals, session history, skill tracking
- ✅ Parent/Athlete: skill progression, badges, goals, session history, improvement, drill completion

### Communication
- ✅ Direct messaging, unread count, image sharing, mute, quiet hours, channel preferences

### Earnings (Coach)
- ✅ Total earnings, earnings by period, breakdown by session type

### Clubs
- ✅ Create club, invite coaches, create squads, assign coaches, manage roles, set branding
- ✅ Coach: see squads, manage roster, create sessions, bulk invite, create events
- ✅ Member: join with code, see schedule, RSVP events, see members, access drills

### Events & Matches
- ✅ Create events, set type, track RSVPs, check in, parent RSVP, see upcoming
- ✅ Create fixtures, invite players, select lineup, record results, mark availability, see selection

### Video & Content
- ✅ Upload/annotate/share videos, drill library, assign drills, view/mark complete

### Family Dashboard
- ✅ Multiple children, child switcher, unified calendar, all children progress, family sharing (726 lines)

### Safety & Trust
- ✅ Email/phone verification, ID verification, background check, credentials, verification badges
- ✅ See verification status, emergency contacts, medical info, consent forms, injury tracking

### Social
- ✅ Follow coaches, social feed, post updates, share achievements, join groups, interactions

### Referrals
- ✅ Refer friends, share code, track stats, see who referred

</details>

---

## CRITICAL PATH (Must Fix Before Launch)

| # | Item | Sprint | Status | Impact |
|---|------|--------|--------|--------|
| 1 | ~~Invite -> Booking bug~~ | 1 | ✅ | Fixed (Sprint 1B) |
| 2 | ~~Offline banner + action queue~~ | 1 | ✅ | Built (Sprint 1C) |
| 3 | **Session completion checklist** (attendance -> notes -> badges -> done) | 2 | ✅ | Completion wizard shipped; continue polish |
| 4 | **RSVP for group sessions** (going/can't/maybe) | 2 | ❌ | Spond-beater feature |
| 5 | **Cancellation policy display** (before booking + on cancel) | 3 | ❌ | Trust |
| 6 | **Push notification infrastructure** | 6 | ❌ | Engagement |
| 7 | **Safety reporting full flow** | 5 | 🔨 | Safety |
| 8 | ~~Coach onboarding~~ (5 screens, live in <2 min) | 10 | ✅ | Built (Sprint 10A) |

---

## Sprint 1: Critical Fixes ✅ COMPLETE

| Story | Status | Notes |
|-------|--------|-------|
| Accept invite and create booking | ✅ | Fixed (Sprint 1B — invite→booking + counter-offer→booking) |
| Offline banner + action queue | ✅ | Built (Sprint 1C — offline banner + action queue) |
| Standardised API client (all services same pattern) | ✅ | Built (Sprint 1A — 59 services migrated) |

---

## Sprint 2: Session Completion + RSVP

| Story | Status | Notes |
|-------|--------|-------|
| Session completion checklist (attendance -> notes -> badges -> done) | ✅ | 4-step completion wizard shipped in `app/session/[id]/complete.tsx` with extracted step components |
| Emit SESSION_COMPLETED event on completion submit | ✅ | `use-session-completion` emits `ServiceEvents.SESSION_COMPLETED` |
| Trigger parent notification on session completion | ✅ | `notificationTriggers.sessionCompleted()` called on completion |
| Trigger review prompt after session completion | ✅ | `notificationTriggers.reviewPrompt()` called after completion |
| Create structured AttendanceRecord per athlete on completion | ✅ | Attendance records are created and persisted in completion flow |
| Decompose complete.tsx into sub-components (<300 lines) | ✅ | `app/session/[id]/complete.tsx` is now 196 lines with step components extracted |
| Error state with retry on completion screen | ✅ | `ErrorState` with retry is wired for both load failure and missing session |
| Group session completion updates individual bookings | ❌ | Sprint 2 — only session offering status updated, not per-athlete bookings |
| RSVP for group sessions (going/can't/maybe) | ❌ | |
| RSVP count on group sessions | ❌ | |
| RSVP reminder to non-responders | ❌ | |
| Mark attendance enhancement | 🔨 | Per-athlete effort rating, no-show category |
| Rate athlete effort/progress enhancement | 🔨 | Individual effort per athlete (not just group-level) |
| Rate session with coach (trigger after completion) | ✅ | Trigger wiring is active in completion flow |
| Decline invite with reason | ✅ | Needs enhancement |
| Add booking to phone calendar | ❌ | |

---

## Sprint 3: Schedule, Cancellation & Smart Features

| Story | Status | Notes |
|-------|--------|-------|
| Cancellation policy display (before booking + on cancel) | ❌ | Policy editor exists (344 lines) |
| "Pay cash at session" reminder | ❌ | |
| Cancel session with notifications | 🔨 | 544 lines exist |
| Reschedule session proper flow | 🔨 | |
| Maximum advance booking setting | ❌ | |
| Same-day booking toggle | ❌ | |
| Buffer time / minimum notice enhancement | 🔨 | 602 lines exist |
| "Copy last week's schedule" | ❌ | |
| Mark no-show with categorisation | ❌ | |
| Block specific dates enhancement | ✅ | 285 lines, needs polish |

---

## Sprint 4: Club Hub & Social

### 4A: Comment System
| Story | Status | Notes |
|-------|--------|-------|
| Comment on feed posts (all roles) | ❌ | Facebook-style threaded |
| Reply to comments (single-level threading) | ❌ | |
| Like individual comments | ❌ | |
| Delete comments (author + post owner + admin) | ❌ | |
| Comment notifications (in-app) | ❌ | |
| Inline comment preview on feed cards | ❌ | |
| Comment service with persistent storage | ❌ | |
| Post detail modal rewrite for ClubFeedPost | ❌ | |

### 4B: Squad Auto-Group Chat
| Story | Status | Notes |
|-------|--------|-------|
| Squad auto-create group chat on creation | ❌ | Auto-provision ParentGroup |
| Auto-sync squad group on member add/remove | ❌ | Event-driven |
| Coach message whole squad from squad screen | ❌ | |
| Parent auto-join squad group when child added | ❌ | |
| Parent auto-leave when last child removed | ❌ | |

### 4C: Coach Posts & Personal Feed
| Story | Status | Notes |
|-------|--------|-------|
| Coach post composer (Personal/Club/Squad) | ❌ | |
| createCoachPost() service method | ❌ | |
| COACH_POST_CREATED event | ❌ | |
| Coach personal feed on profile (real data) | ❌ | |
| ProfilePostCard adapts to ClubFeedPost | ❌ | |
| "What's on your mind?" compose prompt | ❌ | |
| Parent sees coach personal posts in feed | ❌ | |
| Club-less coach composer parity | ❌ | |

### 4 General
| Story | Status | Notes |
|-------|--------|-------|
| Club dashboard with stats + quick actions | ❌ | |
| Club calendar aggregating all squads | ❌ | |
| Club announcements with RSVP | ❌ | |
| Set club branding enhancement | 🔨 | 467 lines exist |
| See club announcements enhancement | 🔨 | |
| See other squad members enhancement | 🔨 | |
| Pin announcements in group chat | ❌ | |
| Bulk message all parents in squad/club | ❌ | |
| Record match results (auto-post to feed) | ✅ | |

---

## Sprint 5: Invite UX Revolution + Safety + Polish

### Invite Experience
| Story | Status | Notes |
|-------|--------|-------|
| Cover images on invites (Facebook Events style) | ❌ | Coach uploads hero image |
| Shareable invite link (WhatsApp/SMS) | ❌ | Native share sheet + deep link |
| Quick 1-tap RSVP from invite list | ❌ | No navigation needed |
| "Maybe" RSVP option on session invites | ❌ | |
| Social proof on invite cards (attendee count + avatars) | ❌ | "5 going" + face stack |
| Attendee list modal ("See who's going") | ❌ | Grouped: Going/Maybe/Can't Go |
| Location map preview + "Get Directions" | ❌ | Static map + native maps link |
| RSVP counts on sent invites (coach view) | ❌ | |
| Pin "Upcoming Events" carousel in Club Hub | ❌ | Horizontal scroll, 7-day window |
| Show invite activity in Club Hub feed | ❌ | "Sarah accepted" activity posts |
| Event cards with cover images in Club Hub | ❌ | Rich cards with hero + RSVP count |

### Safety & Compliance
| Story | Status | Notes |
|-------|--------|-------|
| Report safety concerns (full flow) | 🔨 | Basic exists |
| Block a user | ❌ | |
| Report inappropriate messages | ❌ | |
| Admin review queue for reports | ❌ | |
| Delete account (GDPR) | ❌ | |
| Data export (GDPR) | ❌ | |

### Polish & Quality
| Story | Status | Notes |
|-------|--------|-------|
| Loading skeletons on every screen | 🔨 | 59-line skeleton — expand |
| Error states with retry on every screen | 🔨 | `use-screen` is imported in 76/189 route files; rollout still incomplete |
| Contextual empty states with CTA on every screen | ❌ | |
| Accessibility (WCAG AA, screen readers, 44pt) | ❌ | |
| Notification preferences per-type toggles | 🔨 | 334 lines exist |
| Family sharing verification | ✅ | 726 lines — needs testing |
| Onboarding checklist coach (8 items) | ✅ | Built (Sprint 5B) |
| Onboarding checklist parent (6 items) | ✅ | Built (Sprint 5B) |

---

## Sprint 6: Notifications & Infrastructure

| Story | Status | Notes |
|-------|--------|-------|
| Push notification infrastructure | ❌ | |
| Deep link from notification to screen | ❌ | |
| Booking confirmation notifications | 🔨 | Service exists, needs push |
| Cancellation notifications | 🔨 | |
| New booking notifications (coach) | 🔨 | |
| Coach cancellation notifications | 🔨 | |
| New badge notifications | 🔨 | |
| In-app notification centre (bell icon) | 🔨 | 378 lines exist |
| Be notified when coach cancels | 🔨 | |
| Push notifications for messages | 🔨 | |
| Mock -> real API toggle via env var | ✅ | Built (Sprint 6B — API contracts + mock toggle) |
| JWT auth with token refresh | ✅ | Built (Sprint 6A — JWT auth + demo mode + refresh) |
| Deep linking for all shareable content | ❌ | |

---

## Sprint 7: Coach Business & Profiles

| Story | Status | Notes |
|-------|--------|-------|
| Shareable public coach profile (works without login) | ❌ | |
| Shareable booking link + QR code | ❌ | |
| Offer trial/taster sessions | ❌ | |
| Earnings projections (confirmed + pending + projected) | ❌ | |
| Trial session conversion tracking | ❌ | |
| See pending vs available balance | 🔨 | Rethink for cash |
| See club-wide analytics | 🔨 | Basic exists |

---

## Sprint 8: Discovery Revolution

| Story | Status | Notes |
|-------|--------|-------|
| Coaches on map with price pins (Airbnb-style) | ❌ | MAP_EXPERIENCE.md spec |
| Featured coaches near me | ❌ | |
| Recommended coaches for child (age/skill match) | ❌ | |
| Browse by specialty chips | ❌ | |
| Search suggestions (recent + popular) | ❌ | |
| Filter by trial available | ❌ | |
| Filter by availability ("Available this week") | 🔨 | Toggle exists |
| Favourites heart animation + map pins | ✅ | 296 lines, needs polish |
| Map rewrite to Airbnb-quality | 🔨 | Grid map exists |
| GPS-based search (not just postcode) | ✅ | Needs enhancement |

---

## Sprint 9: Progress & Development (Deferred to Post-Launch)

| Story | Status | Notes |
|-------|--------|-------|
| Session plan templates | ❌ | |
| Video challenges (coach posts, players submit) | ✅ | Sprint 9C — challenges.tsx + challenge-card |
| Personal session journal with mood/energy | ✅ | Sprint 9D — journal.tsx + session-journal component |
| Goal setting with age-based suggestions | ❌ | |
| Submit video challenge attempts | ✅ | Sprint 9C — ChallengeCard onSubmitAttempt |
| Assign from session plan templates | ❌ | |
| Create video challenges for players | ✅ | Sprint 9C — create-challenge.tsx |
| Skill progression radar chart | ✅ | Sprint 9A — SkillRadar on athlete/my-progress/child-progress |
| Set/track goals enhancement | ✅ | 672 lines |
| Compare to benchmarks | 🔨 | |
| Set training goals enhancement | ✅ | 434 lines |
| Set skill level | 🔨 | |

---

## Sprint 10: Delight & Onboarding

| Story | Status | Notes |
|-------|--------|-------|
| Guided coach onboarding (5 screens, live in <2 min) | ✅ | Built (Sprint 10A) |
| Guided parent onboarding (3 screens, discovery in <1 min) | ✅ | Built (Sprint 10A) |
| Confetti celebration on badge earned | ❌ | |
| Celebration on goal completed | ❌ | |
| Coach milestone celebrations (10/25/50/100 sessions) | ❌ | |
| One-tap match RSVP from notification | ❌ | |
| One-tap invite accept from notification | ❌ | |
| Session reminders 24h + 1h with directions | ❌ | |
| Micro-interactions (haptics, press states, animations) | ❌ | |
| Add child skill level + position during creation | ❌ | |
| Award badges celebration trigger | ✅ | Needs celebration UI |
| See badges earned celebration | ✅ | Needs celebration UI |
| Share achievements (shareable images) | ✅ | Needs enhancement |
| Get directions to venue | ❌ | |
| Set notification preferences enhancement | ✅ | 334 lines |

---

## Deferred (Cash MVP)

| Story | Notes |
|-------|-------|
| Pay with credit/debit card | Cash only |
| Save payment methods | Cash only |
| Use wallet balance | Cash only |
| Apply promo code | Cash only |
| Purchase session packages | Rethink as bundles |
| See payment history | Cash only |
| Download invoices | Cash only |
| Request refund | N/A |
| Withdraw to bank/PayPal | Cash only |
| See withdrawal history | Cash only |
| Understand platform fees | Cash only |
| Create promo codes | Cash only |
| See referral earnings | Keep tracking, remove money |
| Manage club subscription | Cash only |
| See total spending | Show session count instead |
| See spending by child | Same |
| Create session packages | Rethink as bundles |

---

## Story Count Summary

| Status | Count |
|--------|-------|
| ✅ Built (foundational) | 155 |
| 🔨 Needs Enhancement | 24 |
| ❌ Missing (to build) | 89 |
| 💤 Deferred (Cash MVP) | 18 |
| **Total** | **286** |

---

*Last updated: 2026-02-11 — Synced to current repo metrics and sprint status*
