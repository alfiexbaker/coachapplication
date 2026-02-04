# Complete Feature Map — Bilateral Audit

> Every feature. Both sides. What's perfect, what's amazing, and what's still not.

---

## The App in One Sentence

**Clubroom is a football coaching marketplace where parents find, book, and track their child's development with private coaches — and coaches grow a real business.**

---

## MAJOR FEATURES (18 domains)

### 1. COACH DISCOVERY & MARKETPLACE

| Feature | Coach Side (Action) | Parent Side (Reaction) | Bilateral? | Status |
|---------|--------------------|-----------------------|------------|--------|
| **Profile visibility** | Coach creates profile with bio, photo, specialties, qualifications, rate | Parent sees profile in search, map, featured | ✅ YES | Built + Sprint 7/8 enhance |
| **Map search** | Coach sets location + travel radius | Parent sees coach on Airbnb-quality map with price pill pins | ✅ YES | Sprint 8 REWRITE |
| **Filters** | Coach tags: specialty, age range, price | Parent filters by all tags + distance + rating + availability | ✅ YES | Sprint 8 |
| **Featured/recommended** | Coach earns featured status via reviews, completion rate, response time | Parent sees curated "Featured near you" + "Recommended for Jake" | ✅ YES | Sprint 8 |
| **Public profile** | Coach gets shareable URL + QR code | Parent views profile without login, can book directly | ✅ YES | Sprint 7 |
| **Similar coaches** | Coach appears in "Similar coaches" on competitor profiles | Parent sees alternatives: "Also in Hackney: 4 other coaches" | ✅ YES | Sprint 7 |
| **Trial sessions** | Coach creates trial at reduced rate, marked with trial badge | Parent sees "Trial available — £15 for first session" in discovery | ✅ YES | Sprint 7 |
| **Favourites** | Coach sees anonymous save count in analytics: "12 parents saved you this month" | Parent taps heart → coach saved to favourites list + map pins | ✅ YES | Sprint 8 + Sprint 7 analytics |
| **Next available slot** | Coach updates availability → slot recalculates in real-time | Parent sees "Next: Tue 4pm" on coach card, always fresh | ✅ YES | Sprint 8 |
| **Conversion funnel** | Coach sees: 47 views → 12 saves → 8 enquiries → 5 bookings (10.6%) | Parent is part of the funnel without knowing — coach optimises accordingly | ✅ YES | Sprint 7 |

**Why it's amazing:** No coaching app has this. Spond has zero discovery. ClassForKids has a marketplace but no map, no personalisation, no real-time availability. We have Airbnb-quality map + smart recommendations + coach business analytics. Parents find the right coach in under 60 seconds.

**Why it's not perfect yet:** Discovery is the most complex sprint (Sprint 8). The relevance scoring algorithm for recommendations is basic — no ML, just weighted factors. The "Search this area" viewport API needs to be performant with 50+ pins. Real-world testing will reveal edge cases.

---

### 2. BOOKING ENGINE

| Feature | Who Acts | Other Side Reaction | Bilateral? | Status |
|---------|----------|-------------------|------------|--------|
| **Book a session** | Parent books via 4-step wizard | Coach sees in schedule (auto-confirm) OR gets confirmation request (manual confirm) | ✅ YES | Built + Sprint 7 adds manual confirm |
| **Select child** | Parent picks which child attends | Coach sees child name + age + skill level on booking | ✅ YES | Built |
| **Price display** | Coach sets price | Parent sees price + "Pay £40 cash at session" | ✅ YES | Built (cash MVP) |
| **Cancellation policy** | Coach sets policy (free cancel 24h+, 50% within 24h, full within 2h) | Parent sees policy BEFORE booking + during cancel flow | ✅ YES | Sprint 3 |
| **Cancel booking** | Parent cancels with reason | Coach notified + freed slot offered to waitlist | ✅ YES | Sprint 3 |
| **Coach cancels** | Coach cancels with reason | Parent notified + "Book another time?" CTA + auto-suggest alternatives | ✅ YES | Sprint 3 |
| **Reschedule** | Coach proposes new time | Parent confirms or counter-proposes — NOT auto-accepted | ✅ YES | Sprint 3 |
| **Counter-offer** | Parent proposes different time | Coach sees proposal + can accept/reject/counter | ✅ YES | Built |
| **Waitlist** | Parent joins waitlist when session full | When spot opens: parent notified with 24h to respond, then goes to next person | ✅ YES | Sprint 6 type fix |
| **Calendar add** | Parent adds booking to phone calendar | Coach can bulk-sync all sessions to calendar | ✅ YES | Sprint 2 |
| **Booking confirmation** | System confirms booking | BOTH sides see confirmation screen + notification | ✅ YES | Built + Sprint 6 push |

**Why it's amazing:** Full negotiation engine. Counter-offers. Manual confirmation mode for coaches who want control. Waitlist with 24h expiry. Calendar integration. Cash-only simplicity for MVP. Every cancellation has a policy. Every reschedule requires consent.

**Why it's not perfect yet:** No online payment — cash only. No session packages/bundles (1,262 lines of code exist but deferred). No recurring booking modification (cancel individual instances works, but "move all future sessions to Wednesday" doesn't). Counter-offer can only go one round deep — no true negotiation thread.

---

### 3. SESSION LIFECYCLE

| Feature | Coach Action | Parent/Athlete Reaction | Bilateral? | Status |
|---------|-------------|------------------------|------------|--------|
| **Session creation** | Coach creates 1:1 or group session | Parents see in discovery or receive invite | ✅ YES | Built |
| **Session invite** | Coach invites specific athletes/squads | Parent sees invite card + can accept/decline/counter | ✅ YES | Sprint 1 bug fix |
| **Decline with reason** | Parent declines: "too far" / "price" / "schedule" | Coach sees reason + gets smart suggestions: "Offer closer venue?" | ✅ YES | Sprint 2 |
| **Invite acceptance rate** | Coach sends 8 invites | Coach dashboard: "8 sent · 5 accepted · 2 declined · 1 pending" | ✅ YES | Sprint 2 |
| **RSVP (group)** | Coach creates squad training | Parent gets RSVP: Going / Can't / Maybe + deadline | ✅ YES | Sprint 2 |
| **RSVP summary** | Coach sees: "8 going, 2 can't, 1 maybe, 3 no response — [Send Reminder]" | Parent sees RSVP count on session card: "8/12 confirmed" | ✅ YES | Sprint 2 |
| **Session completion** | Coach taps "Complete" → attendance → notes → badges → done | Parent gets review prompt + sees notes + attendance | ✅ YES | Sprint 2 |
| **Athlete journal** | (Session completed) | Athlete sees DIFFERENT prompt: mood, energy, journal entry — not just "rate the coach" | ✅ YES | Sprint 2 + Sprint 9 |
| **No-show handling** | Coach marks no-show with category | Parent notified: "Jake was marked as no-show. Policy: full fee may apply." Parent can dispute. | ✅ YES | Sprint 3 |
| **Attendance display** | Coach records: attended / late / no-show per athlete | Parent sees on booking detail: "✅ Attended · Effort: 4/5 · Focus: Passing" | ✅ YES | Sprint 2 |
| **Session notes** | Coach writes per-athlete notes during completion | Parent sees notes on child's booking detail page | ✅ YES | Built |
| **Drill assignment** | Coach assigns homework drill during completion | Athlete sees drill in homework tab with instructions + video | ✅ YES | Built |
| **Drill completion** | Athlete marks drill complete | Coach notified: "Jake completed Cone Weave ✓" + one-tap encouragement | ✅ YES | Sprint 9 |
| **Review prompt** | (Auto after completion) | Parent sees "How was Jake's session?" with star rating | ✅ YES | Sprint 2 |
| **Review response** | Coach replies to review publicly | Parent notified: "Coach Marcus replied to your review" | ✅ YES | Sprint 7 |
| **Badge award** | Coach awards badge during completion | Athlete + parent see full-screen confetti celebration + shareable card | ✅ YES | Sprint 10 |

**Why it's amazing:** The complete session lifecycle is mapped tap-by-tap for all three roles. Coach never forgets (completion checklist). Parent always knows (notes, attendance, effort). Athlete has their own experience (journal, not just the parent's review). Every action triggers a reaction. RSVP matches Spond's killer feature then adds attendance pre-fill.

**Why it's not perfect yet:** Session notes are free-text — no templates for common feedback. The "30 seconds per athlete" completion target is ambitious for large groups (12+ athletes). No voice-to-text for quick notes. No auto-generated session recap video from photos/clips taken during the session.

---

### 4. SCHEDULING & AVAILABILITY

| Feature | Coach Action | Parent Reaction | Bilateral? | Status |
|---------|-------------|----------------|------------|--------|
| **Weekly template** | Coach sets Mon PM, Tue PM, Sat AM | Booking flow only shows available slots | ✅ YES | Built |
| **Blocked dates** | Coach blocks holiday dates | Affected parents notified + auto-suggested alternatives. Squad parents told training paused. | ✅ YES | Sprint 3 |
| **Scheduling rules** | Coach sets: 30min buffer, 24h notice, 2-week advance | Booking enforces all rules — parent can't book within 24h | ✅ YES | Sprint 3 (602 lines exist) |
| **Price change** | Coach raises rate from £40 to £50 | Parents with future bookings notified: "Existing bookings stay at £40. New bookings £50." | ✅ YES | Sprint 7 |

**Why it's amazing:** Every rule the coach sets is enforced and communicated to the parent. No surprises.

**Why it's not perfect yet:** No "suggest optimal schedule" based on demand patterns. No multi-location scheduling (coach at Park A in morning, Park B in afternoon). Calendar sync is one-way — changes in Google Calendar don't reflect back.

---

### 5. CLUB & ACADEMY

| Feature | Admin/Coach Action | Member Reaction | Bilateral? | Status |
|---------|-------------------|-----------------|------------|--------|
| **Club branding** | Admin sets logo, cover, colours, tagline | Members see branded club page | ✅ YES | Sprint 4 |
| **Club dashboard** | Admin sees stats, recent results, quick actions | Members see club feed with announcements, results, badges | ✅ YES | Sprint 4 |
| **Club calendar** | Admin/coaches create sessions, matches, events per squad | Members see aggregated calendar with squad filter | ✅ YES | Sprint 4 |
| **Squad group chat** | Coach sends message to squad chat | All squad parents see message. Pinned messages stay at top. | ✅ YES | Sprint 4 |
| **Club announcements** | Admin posts critical announcement with RSVP | All members see pinned in feed. Push sent. If push off: persistent banner. | ✅ YES | Sprint 4 |
| **Bulk messaging** | Coach sends to all parents in squad | Parents get individual threads. Coach sees delivery/read status: ✓ sent ✓✓ read. | ✅ YES | Sprint 4 |
| **Member removal** | Admin removes a member | Removed member notified: "You've been removed from [club]" | ✅ YES | Sprint 4 |
| **Member promotion** | Admin promotes member to admin | Promoted member notified: "You're now an admin of [group]" | ✅ YES | Sprint 4 |
| **Academy branding** | Owner sets distinct academy visual treatment | Members see premium academy page vs standard club | ✅ YES | Sprint 4 (467 lines exist) |
| **Match results** | Coach records match result | Auto-posts to club feed as rich card. Parents see without checking separately. | ✅ YES | Sprint 4 |
| **Welcome flow** | (New member joins) | New member sees guided club tour: squads, coaches, schedule, how to RSVP | ✅ YES | Sprint 4 |

**Why it's amazing:** Clubs feel alive. Not a dead admin page. Rich feed with match results, badge awards, session recaps. Group chat per squad. Branding makes every club look professional. The announcement fallback (banner when push is off) means critical info is never missed.

**Why it's not perfect yet:** No multi-club support (a coach can only be in one club). No club-level analytics dashboard (only individual coach analytics). No club subscription/billing. No parent-to-parent messaging within a club (only via group chat). Community groups (1,012 lines) exist separately but relationship to club chat is unclear.

---

### 6. PLAYER DEVELOPMENT

| Feature | Coach Action | Parent/Athlete Reaction | Bilateral? | Status |
|---------|-------------|------------------------|------------|--------|
| **Skill radar** | Coach rates skills during session (6 axes) | Parent + athlete see animated spider chart with current vs previous overlay | ✅ YES | Sprint 9 |
| **Progress timeline** | Coach's notes, badges, goal updates auto-populate | Parent sees chronological journey: sessions, milestones, skill changes | ✅ YES | Sprint 9 |
| **Session recap card** | Auto-generated from completion data | Shareable beautiful card: skills worked, effort, coach notes, badge | ✅ YES | Sprint 9 |
| **Goal setting** | Coach sets goal with milestones | Athlete + parent notified: "New goal: Master keepy-ups" — parent must acknowledge | ✅ YES | Sprint 9 |
| **Goal progress** | Coach updates progress during session | Athlete + parent notified: "Goal now at 70%" | ✅ YES | Sprint 9 |
| **Milestone complete** | Coach or athlete marks milestone done | Other side notified: "Milestone completed: 10 consecutive passes ✓" | ✅ YES | Sprint 9 |
| **Session plans** | Coach uses/customises templates (30+) | Athlete sees what's planned for next session | ✅ YES | Sprint 9 |
| **Drill library** | Coach assigns drills from library with video demos | Athlete sees drill card with video, instructions, completion button | ✅ YES | Sprint 9 |
| **Video challenges** | Coach posts challenge with instructions | Athletes submit video attempts. Leaderboard shows top performers. | ✅ YES | Sprint 9 |
| **Progress reports** | Auto-generated monthly | Parent shares with family. Image includes Clubroom branding + app store link. Coach notified when shared. | ✅ YES | Sprint 9 |
| **Athlete journal** | (Athlete writes personal entry post-session) | Coach does NOT see (private). But journal entries enrich the athlete's own progress view. | Intentionally one-way | Sprint 9 |

**Why it's amazing:** This is the Spond-killer. Zero competitors have visual skill tracking. Radar charts that parents screenshot and share. Goals with milestones. Video challenges with leaderboards. Monthly shareable progress reports that double as organic marketing. The session recap card makes every session feel valuable.

**Why it's not perfect yet:** Skill assessment is subjective — it's the coach's opinion, not objective measurement. No wearable/sensor integration. No benchmarking against "average for age 10 in UK" (would need data). Radar chart has 6 fixed axes — should probably be customisable per sport/position. Video challenge doesn't support slow-motion analysis.

---

### 7. COMMUNICATION & NOTIFICATIONS

| Feature | Sender Action | Receiver Reaction | Bilateral? | Status |
|---------|--------------|------------------|------------|--------|
| **Direct message** | Send text/image | Receiver gets push notification + in-app badge + message | ✅ YES | Built + Sprint 6 push |
| **Read receipts** | Sender sees ✓ sent, ✓✓ delivered, blue ✓✓ read | Receiver knows sender can see read status | ✅ YES | Sprint 5 |
| **"Seen" indicators** | Coach views parent's RSVP/invite response | Parent sees "Coach viewed your response" | ✅ YES | Sprint 5 |
| **Notification centre** | 44 notification types, grouped by day | Tap any notification → deep links to relevant screen | ✅ YES | Sprint 6 |
| **Notification preferences** | Per-type toggles (push on/off per category) | Only receives what they want | ✅ YES | Sprint 5/6 |
| **Session reminders** | Auto-scheduled at booking time | 24h + 1h reminders with location + directions + equipment | ✅ YES | Sprint 10 |
| **Coach "on my way"** | Coach taps one button | Parent gets notification + green badge on booking detail | ✅ YES | Sprint 10 |

**Why it's amazing:** 44 notification types — every cross-user action has one. Deep linking means no dead-end notifications. Read receipts and "seen" indicators mean parents never shout into a void. Session reminders include directions (opens Maps) and equipment list.

**Why it's not perfect yet:** No real-time messaging (would need WebSockets, not in scope for mock MVP). No voice messages. No message search. No message reactions (👍). Notification grouping for parents with multiple children in same club could get noisy — needs smart batching ("3 sessions this week" not 3 separate notifications).

---

### 8. SAFETY & TRUST

| Feature | Reporter Action | Other Side Reaction | Bilateral? | Status |
|---------|----------------|-------------------|------------|--------|
| **Report user** | User reports safety concern | Admin sees report in review queue. Reported user sees nothing (by design). | One-way (correct) | Sprint 5 |
| **Block user** | User blocks another | Blocked user can't message, invite, or find in discovery. Not notified (by design). | One-way (correct) | Sprint 5 |
| **Coach verification** | Coach submits ID + background check | Parent sees verification badges on profile: ✓ ID · ✓ DBS · ✓ FA Level 2 | ✅ YES | Built |
| **Delete account** | User requests deletion | 30-day grace period → permanent. GDPR compliant. | One-way | Sprint 5 |
| **Data export** | User requests data export | Receives JSON/ZIP of all their data | One-way | Sprint 5 |
| **Health records** | Parent enters medical info + emergency contacts | Coach sees relevant health info for session (allergies, conditions) | ✅ YES | Built (1420 lines) |

**Why it's amazing:** Safety is asymmetric by design — reported users shouldn't be notified. Block is immediate and comprehensive. Verification badges build trust visually. Health records protect children. GDPR compliance from day one (delete + export).

**Why it's not perfect yet:** No real DBS integration (manual upload only). No automated content moderation in messages. No photo/video verification for coach identity. The admin review queue is a screen but there's no actual admin web panel — it's in-app only.

---

### 9. COACH BUSINESS TOOLS

| Feature | Coach Action | Parent Reaction / Business Impact | Bilateral? | Status |
|---------|-------------|----------------------------------|------------|--------|
| **Earnings dashboard** | Coach sees revenue tracking (cash sessions recorded) | N/A — coach-only view | One-way (correct) | Sprint 7 |
| **Earnings projections** | Dashboard shows: confirmed, pending, projected monthly | Helps coach plan — "If you fill 3 more slots, you'll hit £2k/month" | One-way | Sprint 7 |
| **Profile analytics** | Coach sees: views, saves, enquiries, bookings, conversion rate | Parent is passively measured — coach optimises accordingly | ✅ Indirect | Sprint 7 |
| **Trial conversions** | Coach tracks: how many trial parents became regulars | Parents don't see this — but they benefit from a coach who optimises | ✅ Indirect | Sprint 7 |
| **QR code** | Coach prints QR code for flyers/business cards | Parent scans → lands on public profile → book | ✅ YES | Sprint 7 |
| **Shareable link** | Coach shares booking link via WhatsApp/social | Parent opens link → profile → book without needing app | ✅ YES | Sprint 7 |

**Why it's amazing:** Coaches are treated as business owners, not volunteers. Revenue projections. Conversion funnels. Shareable booking links. QR codes for offline marketing. This is what makes coaches switch from Spond.

**Why it's not perfect yet:** Earnings are display-only (no real money flows). No invoicing. No tax reporting. No "what-if" scenario modelling ("if I raise my rate £5, how does demand change?"). No integration with accounting tools.

---

### 10. EVENTS & MATCHES

| Feature | Coach Action | Parent/Athlete Reaction | Bilateral? | Status |
|---------|-------------|------------------------|------------|--------|
| **Create event** | Coach creates tournament/social | All club members notified + event appears in calendar | ✅ YES | Built + Sprint 4 notification |
| **Cancel event** | Coach cancels | All RSVPed users notified | ✅ YES | Sprint 2 notification |
| **Event RSVP** | (Parent responds) | Coach sees RSVP count + individual responses | ✅ YES | Built |
| **Event check-in** | Coach checks in athlete | Parent notified: "Jake checked in" | ✅ YES | Sprint 2 notification |
| **Create match** | Coach creates fixture | Squad members get match invite + availability request | ✅ YES | Built |
| **Availability response** | Parent marks available/unavailable | Coach sees lineup possibilities | ✅ YES | Built |
| **Select lineup** | Coach picks starting lineup + reserves | Selected players notified. Parents told if child is starting/bench/reserve. | ✅ YES | Built |
| **Record result** | Coach enters score + stats | Auto-posts to club feed as rich card | ✅ YES | Sprint 4 |

**Why it's amazing:** Full match-day workflow from fixture creation through availability, lineup selection, check-in, and result recording — all with notifications at every step.

**Why it's not perfect yet:** No live match updates (score ticker). No parent-facing live commentary. No photo gallery per match. No opponent team management (just enter opponent name, no linked data).

---

### 11. VIDEO & CONTENT

| Feature | Coach Action | Athlete Reaction | Bilateral? | Status |
|---------|-------------|-----------------|------------|--------|
| **Upload video** | Coach uploads session clip | Athlete/parent notified: "New video from Coach Marcus" | ✅ YES | Built + Sprint 6 notification |
| **Annotate video** | Coach draws on video (circles, arrows, notes) | Athlete sees annotations on playback | ✅ YES | Built (594 lines) |
| **Video challenge** | Coach posts challenge with instructions | Athletes submit attempts. Coach sees submissions. Leaderboard. | ✅ YES | Sprint 9 |
| **Assign drill** | Coach assigns from library with video demo | Athlete sees in homework. Marks complete. Coach gets notification. | ✅ YES | Sprint 9 |

**Why it's amazing:** Video annotation is a CoachNow-level feature that they charge for. We include it free. Video challenges with leaderboards drive engagement between sessions.

**Why it's not perfect yet:** No slow-motion playback. No side-by-side comparison (before/after). No AI-assisted analysis. Storage for video could be expensive at scale — no compression strategy defined.

---

### 12. FAMILY MANAGEMENT

| Feature | Parent Action | Other Guardian / Impact | Bilateral? | Status |
|---------|-------------|----------------------|------------|--------|
| **Add children** | Parent adds child with name, DOB, skill level | Coach sees child info on bookings/roster | ✅ YES | Built (779 lines) |
| **Family calendar** | Parent sees all children's sessions in one view | N/A — parent-only view aggregating all data | One-way (correct) | Built (352 lines) |
| **Guardian sharing** | Primary parent invites co-parent/guardian | Guardian notified. Can accept with permissions. Primary notified on accept. | ✅ YES | Sprint 5 (726 lines exist!) |
| **Guardian permissions** | Primary changes guardian permissions | Guardian notified of permission change | ✅ YES | Sprint 5 |
| **Guardian removal** | Primary removes guardian | Removed guardian notified | ✅ YES | Sprint 5 |

**Why it's amazing:** Family sharing is a massive differentiator. Both parents see the same bookings, schedule, progress. No "I didn't know he had training today" arguments. 726 lines already built.

**Why it's not perfect yet:** Family sharing exists (726 lines) but no sprint verifies it works. Guardian permissions model is complex — hasn't been tested. No grandparent/nanny access level (read-only without booking ability).

---

### 13. ONBOARDING & DELIGHT

| Feature | Trigger | User Experience | Bilateral? | Status |
|---------|---------|----------------|------------|--------|
| **Coach onboarding** | First login | 5-screen guided flow: profile → rate → availability → done. Live in <2 min. | N/A (single user) | Sprint 10 |
| **Parent onboarding** | First login | 3-screen flow: child details → skill level → "Here are coaches near you!" | N/A (single user) | Sprint 10 |
| **Badge celebration** | Coach awards badge | Full-screen confetti + badge animation + shareable card | ✅ YES | Sprint 10 |
| **Goal celebration** | Goal completed | Full-screen celebration + "Share" + "Set New Goal" | ✅ YES | Sprint 10 |
| **Coach milestone** | 10/25/50/100 sessions | Full-screen celebration + share option | One-way | Sprint 10 |
| **Review celebration** | 5-star review received | Coach sees animated review card | One-way | Sprint 10 |
| **One-tap RSVP** | Push notification | Available/Unavailable buttons directly in notification | ✅ YES | Sprint 10 |
| **One-tap accept** | Push notification | Accept button directly in notification | ✅ YES | Sprint 10 |
| **Micro-interactions** | Every tap, toggle, swipe | Haptic feedback, scale animations, smooth transitions | N/A (feel) | Sprint 10 |
| **Empty states** | No data to show | Contextual message + CTA: "No sessions booked yet. Find a coach." | N/A (guidance) | Sprint 5/10 |

**Why it's amazing:** The app feels alive. Not an admin tool. Celebrations make achievements feel real. One-tap actions from notifications mean parents don't even need to open the app for common tasks. Every empty state tells you what to do next.

**Why it's not perfect yet:** Confetti animations need performance testing on older devices. Sound effects (optional) haven't been specced for all celebrations. The "Share" button generates images but the image generation library hasn't been chosen. One-tap notification actions need iOS/Android-specific implementation testing.

---

### 14. INFRASTRUCTURE & RELIABILITY

| Feature | What It Does | Both Sides Covered? | Status |
|---------|-------------|-------------------|--------|
| **Offline support** | Actions queue in AsyncStorage, flush on reconnect | ✅ Both coach and parent see offline banner + queued actions | Sprint 1 |
| **API client** | Single shared module for all 46 services | ✅ All roles use same pattern | Sprint 1 |
| **Mock toggle** | ENV var switches between mock data and real API | ✅ Transparent to all users | Sprint 6 |
| **JWT auth** | Token-based auth with refresh | ✅ All roles authenticated | Sprint 6 |
| **Push notifications** | 44 notification types, local for MVP, server-push ready | ✅ Every cross-user action triggers one | Sprint 6 |
| **Deep linking** | Every shareable/notifiable content has a link | ✅ Tap any notification → correct screen | Sprint 6 |
| **Error types** | Typed errors across all services | ✅ All roles see proper error messages | Sprint 6 |
| **Loading states** | Skeleton loaders on every screen | ✅ All roles see shimmer loading, not spinners | Sprint 5 |
| **Error states** | Retry button on every screen | ✅ All roles can recover from errors | Sprint 5 |
| **Accessibility** | WCAG AA, 44pt targets, screen readers, dynamic text | ✅ All roles benefit | Sprint 5 |
| **GDPR** | Delete account + data export | ✅ All roles have rights | Sprint 5 |

---

## MICRO FEATURES (the details that make it feel premium)

| Micro Feature | What It Does | Sprint |
|---------------|-------------|--------|
| Press state scale (0.98) | Every card subtly shrinks on tap | Sprint 10 |
| Haptic on toggle | Physical feedback on switches | Sprint 10 |
| Heart fill animation | Favourite button fills with colour + scale pop | Sprint 10 |
| Star rating fill | Stars fill left-to-right with delay | Sprint 10 |
| Message swoosh | Sent message slides up | Sprint 10 |
| Drill completion ✓ | Checkmark draws itself | Sprint 10 |
| Badge spin | Badge spins in from top | Sprint 10 |
| Booking confirmed pulse | Green checkmark pulse | Sprint 10 |
| Skill level up glow | Number counts up with glow effect | Sprint 10 |
| Pull-to-refresh football icon | Bouncy football instead of generic spinner | Sprint 10 |
| Tab cross-fade | Smooth transition between tabs, not hard cut | Sprint 10 |
| Skeleton shimmers | Content-shaped loading placeholders | Sprint 5 |
| Cash payment reminder | "Pay £40 cash at the session" on every booking confirmation | Sprint 3 |
| Equipment reminder | "Don't forget: shin pads, water" in 1h session reminder | Sprint 10 |
| Directions CTA | "Get Directions" opens native Maps with venue coordinates | Sprint 10 |
| Shareable cards | Progress reports + badges include Clubroom branding + app store link | Sprint 9/10 |
| Smart slot suggestions | "Your busiest day is Saturday — add more slots?" based on patterns | Sprint 3 |
| Decline smart suggestions | Parent declines "too far" → coach sees "Offer session at closer venue?" | Sprint 2 |
| "Copy last week" | Quick schedule duplication for coaches | Sprint 3 |
| Counter-offer reason | Both sides see why the other proposed a change | Built |
| RSVP deadline | Configurable per session, auto-closes responses | Sprint 2 |
| Announcement fallback banner | Critical announcements show even if push is off | Sprint 4 |
| Notification bell badge | Unread count on bell icon in header | Sprint 6 |
| Tab badge counts | Unread messages badge on Messages tab, pending invites on Invites tab | Built + Sprint 5 |

---

## THE HONEST "NOT PERFECT" LIST

These are real weaknesses, not solvable in 10 sprints:

| Gap | Why It Matters | Why We Accept It |
|-----|---------------|-----------------|
| **No real-time messaging** | Messages show on refresh, not instant | Needs WebSockets / server. Mock MVP can't do this. Acceptable for POC. |
| **No online payments** | Cash-only limits scalability | Deliberate choice — simplifies MVP massively. Stripe comes post-launch. |
| **No multi-sport** | Football only | Deliberate — focus wins. Expand later. |
| **No ML recommendations** | "Recommended for Jake" uses weighted scoring, not actual ML | Good enough for POC. Real ML needs data we don't have yet. |
| **No wearable integration** | Can't import data from fitness trackers | Out of scope. Would need hardware partnerships. |
| **No live streaming** | Can't stream sessions to parents | Out of scope. Privacy concerns too. |
| **No admin web panel** | Admin features are in-app only | Web admin comes with backend. POC doesn't need it. |
| **No automated DBS** | Coach uploads PDF, no API check | DBS API integration costs money. Manual upload is fine for POC. |
| **No tax reporting** | Earnings are display-only | Cash MVP — no money flows through platform. |
| **12 uncovered screens** | Objectives, statistics, special-needs, community, edit-profile not in any sprint | They work as-is. Won't get the polish pass but won't break. |
| **No testing strategy** | No unit/integration/E2E tests in sprint plan | POC priority is features over test coverage. Real tests come before production. |

---

## TOTAL COUNTS

| Metric | Count |
|--------|-------|
| **User stories** | 326 (151 built, 24 enhance, 66 build, 18 deferred, 67 new) |
| **Notification types** | 44 |
| **Database tables** | ~62 |
| **API domains** | 22 |
| **Screens** | 173 |
| **Components** | 234 |
| **Services** | 46 |
| **Total code** | ~146,000 lines |
| **Bilateral interactions** | Every single one now has both sides mapped |
| **Sprints** | 10 |
| **Micro-interactions** | 25+ defined |

---

## WHY IT'S AMAZING (the real pitch)

1. **No app does all of this.** Spond does team management. ClassForKids does booking. CoachNow does development. We do ALL THREE.

2. **Every interaction is 2D.** Coach acts → parent reacts. Parent acts → coach knows. 44 notification types ensure nobody is left in the dark.

3. **The map is Airbnb-quality.** Price-pill pins. Bottom sheet. Clustering. GPS. "Search this area." No coaching app has this.

4. **Player development is visual.** Radar charts parents screenshot. Shareable progress reports that double as marketing. Video challenges that drive engagement.

5. **Coaches are treated as business owners.** Conversion funnels. Earnings projections. Shareable booking links. QR codes. Trial session tracking. This is how you make coaches switch from Spond.

6. **The app feels alive.** Confetti. Haptics. Smooth transitions. One-tap actions from notifications. Every empty state tells you what to do. This isn't an admin tool — it's a product people want to use.

7. **146K lines of code already exist.** This isn't a design document — it's a real application with 173 screens, 234 components, and 46 services. The sprints enhance what's built, not build from scratch.

---

*Last updated: February 2026 — Post deep bilateral audit*
