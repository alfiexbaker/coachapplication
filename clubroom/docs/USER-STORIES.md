# User Stories — Complete Feature Map (Revised)

> Updated to reflect cash-only MVP, all sprint additions, and codebase verification.
> Legend: ✅ Built | 🔨 Needs Enhancement | ❌ Missing | 💤 Deferred (Cash MVP) | 🆕 New (from sprint audit)

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

## 1. ONBOARDING & AUTHENTICATION

### Coach
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Sign up with email | ✅ | — | Auth flow exists |
| Set hourly rate | ✅ | — | Profile setup |
| Add qualifications | ✅ | — | Credentials in profile |
| Verify identity | ✅ | — | Verification service |
| Complete background check | ✅ | — | Background check flow |
| Set coaching specialties | ✅ | — | Skills in profile |
| Add bio and photo | ✅ | — | Profile editing |
| Link social media | ✅ | — | Social links |
| 🆕 Guided first-time onboarding (5 screens, live in <2 min) | ❌ | Sprint 10 | |
| 🆕 Onboarding checklist (8 items, progress bar) | ❌ | Sprint 5 | |

### Parent
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Sign up quickly | ✅ | — | Auth flow |
| Add children | ✅ | — | Children management |
| Add emergency contacts per child | ✅ | — | Emergency info |
| Add medical information | ✅ | — | Medical info |
| Set notification preferences | ✅ | Sprint 5 | Exists (334 lines) — enhance with per-type toggles |
| 🆕 Guided first-time onboarding (3 screens, to discovery in <1 min) | ❌ | Sprint 10 | |
| 🆕 Onboarding checklist (6 items) | ❌ | Sprint 5 | |
| 🆕 Add child skill level + position during creation | ❌ | Sprint 10 | |

### Athlete
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Sign up and book for myself | ✅ | — | USER role |
| Set skill level | 🔨 | Sprint 10 | Basic profile exists |
| Set training goals | ✅ | Sprint 9 | Goals system (434 lines) — enhance |
| 🆕 Keep personal session journal | ❌ | Sprint 9 | |

---

## 2. COACH DISCOVERY & SEARCH

### Parent/Athlete
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Search for coaches near me | ✅ | Sprint 8 | Postcode search exists — add GPS |
| Filter by specialty | ✅ | Sprint 8 | Filter modal exists — enhance |
| Filter by price range | ✅ | Sprint 8 | Price slider exists — enhance |
| Filter by rating | ✅ | Sprint 8 | Rating filter exists |
| Filter by availability | 🔨 | Sprint 8 | "Available this week" toggle |
| See coaches on a map | 🔨 | Sprint 8 | Grid map exists — REWRITE to Airbnb-quality (MAP_EXPERIENCE.md) |
| Compare coaches side by side | ✅ | — | Comparison tool (492 lines) |
| Save coaches to favourites | ✅ | Sprint 8 | Favourites exist (296 lines service) — add heart animation, map pins |
| See coach reviews before booking | ✅ | — | Reviews display |
| See qualifications and verification | ✅ | — | Verification badges |
| Message coach before booking | ✅ | — | Messaging |
| 🆕 See coaches with price on map pins (Airbnb-style) | ❌ | Sprint 8 | MAP_EXPERIENCE.md |
| 🆕 See featured coaches near me | ❌ | Sprint 8 | |
| 🆕 See recommended coaches for my child (age/skill match) | ❌ | Sprint 8 | |
| 🆕 Browse by specialty chips | ❌ | Sprint 8 | |
| 🆕 Search suggestions (recent + popular) | ❌ | Sprint 8 | |
| 🆕 Filter by trial available | ❌ | Sprint 8 | |
| 🆕 See "similar coaches" on coach profile | ❌ | Sprint 7 | |

### Coach
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Appear in search results | ✅ | — | Discover service |
| Highlight specialties | ✅ | — | Profile skills |
| Showcase reviews and ratings | ✅ | — | Review display |
| Set service area/locations | ✅ | — | Location settings |
| 🆕 Shareable public profile page (works without login) | ❌ | Sprint 7 | |
| 🆕 Shareable booking link + QR code | ❌ | Sprint 7 | |
| 🆕 Offer trial/taster sessions | ❌ | Sprint 7 | |

---

## 3. SESSION CREATION & MANAGEMENT (COACH)

### Creating Sessions
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Create 1:1 sessions | ✅ | — | Session wizard (1241 lines) |
| Create group sessions | ✅ | — | Group sessions (898 lines) |
| Set pricing in GBP | ✅ | — | Price field (display-only for cash) |
| Set duration | ✅ | — | Duration field |
| Set location | ✅ | — | Location field |
| Add description | ✅ | — | Description field |
| Set skill focus | ✅ | — | Skill selection |
| Set age restrictions | ✅ | — | Age min/max |
| Set max participants | ✅ | — | Max participants |
| 🆕 Use session plan template | ❌ | Sprint 9 | |

### Recurring Sessions
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Create weekly recurring | ✅ | — | Weekly recurrence |
| Create bi-weekly recurring | ✅ | — | Biweekly option |
| Set end date | ✅ | — | End date field |
| Cancel individual instances | ✅ | — | Instance cancellation |
| End entire series | ✅ | — | End series action |
| See all upcoming instances | ✅ | — | Instance list |

### Session Invites
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Create invite-only sessions | ✅ | — | Invite mode |
| Invite specific athletes | ✅ | — | Athlete selection |
| Bulk invite roster | ✅ | — | Bulk invite |
| See accept/decline status | ✅ | — | Invite status |
| Send invites to squads | ✅ | — | Squad invites |
| Propose multiple time slots | ✅ | — | Proposed slots |

### Managing Sessions
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| See all upcoming sessions | ✅ | — | Bookings list |
| See who's registered | ✅ | — | Registrations |
| Cancel session and notify | 🔨 | Sprint 3 | Cancel exists (544 lines) — add notifications |
| Reschedule session | 🔨 | Sprint 3 | Basic edit — add proper flow |
| Manage waitlist | ✅ | — | Waitlist service (298 lines) |
| Set open/invite only | ✅ | — | Session visibility |
| 🆕 See RSVP count for group sessions | ❌ | Sprint 2 | |
| 🆕 Send RSVP reminder to non-responders | ❌ | Sprint 2 | |

---

## 4. BOOKING & PAYMENT

### Booking Flow
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Book with a few taps | ✅ | — | Quick book |
| Select which child attends | ✅ | — | Child selector |
| Book multiple weeks of recurring | ✅ | — | Weeks selector |
| Add note for coach | ✅ | — | Notes field |
| See total cost before confirming | ✅ | — | Review screen (price display-only, cash) |
| Join waitlist if full | ✅ | — | Waitlist join |
| 🆕 See cancellation policy before booking | ❌ | Sprint 3 | |
| 🆕 See "Pay £X cash at the session" reminder | ❌ | Sprint 3 | |
| 🆕 Add booking to phone calendar | ❌ | Sprint 2 | |
| 🆕 Get directions to venue | ❌ | Sprint 10 | |

### Receiving Invites
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Receive session invites | ✅ | — | Invites inbox |
| See pending invites | ✅ | — | Pending tab |
| Accept invite and pick time | 🔨 | Sprint 1 | **BUG: accept logs to console, doesn't create booking** |
| Decline an invite | ✅ | Sprint 2 | Add decline with reason |
| Counter-propose times | ✅ | — | Counter offer |
| See invite history | ✅ | — | History tab |
| Badge for pending invites | ✅ | — | Badge in nav |
| 🆕 RSVP for group sessions (going/can't/maybe) | ❌ | Sprint 2 | Spond-beater |

### Payments (DEFERRED — Cash Only MVP)
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Pay with credit/debit card | 💤 | — | DEFERRED — cash only |
| Save payment methods | 💤 | — | DEFERRED |
| Use wallet balance | 💤 | — | DEFERRED |
| Apply promo code | 💤 | — | DEFERRED |
| Purchase session packages | 💤 | — | RETHINK as session bundles |
| See payment history | 💤 | — | DEFERRED |
| Download invoices | 💤 | — | DEFERRED |
| Request refund | 💤 | — | N/A — cash only |

### Managing Bookings
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| See all upcoming bookings | ✅ | — | Bookings list |
| Cancel a booking | ✅ | Sprint 3 | 544 lines exist — enhance with policy |
| Reschedule a booking | 🔨 | Sprint 3 | Needs improvement |
| Know cancellation policy | 🔨 | Sprint 3 | Policy editor exists — add display on booking |
| Be notified when coach cancels | 🔨 | Sprint 6 | Needs notification infra |

---

## 5. AVAILABILITY & CALENDAR (COACH)

| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Set weekly availability template | ✅ | — | Availability templates |
| Block specific dates | ✅ | Sprint 3 | 285 lines exist — enhance |
| Different availability per location | 🔨 | — | Basic support |
| Sync with Google Calendar | ✅ | — | Calendar sync (371 lines) |
| Sync with Apple Calendar | ✅ | — | Calendar sync |
| See schedule at a glance | ✅ | — | Schedule view (863 lines) |
| Buffer time between sessions | 🔨 | Sprint 3 | Scheduling rules (602 lines exist) — enhance |
| Minimum booking notice | 🔨 | Sprint 3 | Same |
| 🆕 Maximum advance booking | ❌ | Sprint 3 | |
| 🆕 Same-day booking toggle | ❌ | Sprint 3 | |
| 🆕 Smart slot suggestions based on booking patterns | ❌ | Sprint 3 | |
| 🆕 "Copy last week's schedule" quick action | ❌ | Sprint 3 | |

---

## 6. POST-SESSION & FEEDBACK

### Coach Actions
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Mark attendance | 🔨 | Sprint 2 | Session complete (669 lines exists) — enhance |
| Add session notes per athlete | ✅ | — | Session notes service |
| Rate athlete effort/progress | 🔨 | Sprint 2 | Basic in notes — enhance |
| Set homework/drills | ✅ | — | Drill assignments (736 lines) |
| Award badges | ✅ | Sprint 10 | Badge service — add celebration trigger |
| Upload session videos | ✅ | — | Video service |
| Annotate videos | ✅ | — | Annotation service |
| Update goals based on progress | ✅ | Sprint 9 | Goal service — enhance |
| 🆕 Mark no-show with categorisation | ❌ | Sprint 3 | |
| 🆕 Session completion checklist (attendance → notes → badges → done) | 🔨 | Sprint 2 | 669 lines exist — complete the flow |

### Parent/Athlete Actions
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Rate session with coach | ✅ | Sprint 2 | Review service — trigger after completion |
| Leave written review | ✅ | — | Review form |
| See child's session notes | ✅ | — | Notes view |
| See drills assigned | ✅ | — | Drill view |
| See badges earned | ✅ | Sprint 10 | Badge display — add celebration |
| Watch annotated videos | ✅ | — | Video player |
| Report a problem | ✅ | Sprint 5 | Report exists — enhance with safety reporting |

---

## 7. PROGRESS TRACKING & DEVELOPMENT

### Coach View
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| See skill progression | ✅ | Sprint 9 | Skill trees — add radar chart |
| Set goals for athletes | ✅ | Sprint 9 | Goal service (672 lines) — enhance |
| Track goal progress | ✅ | Sprint 9 | Progress service |
| See session history | ✅ | — | History view |
| See skills worked on | ✅ | — | Skill tracking |
| Compare to benchmarks | 🔨 | Sprint 9 | Basic analytics — enhance |
| 🆕 Assign from session plan templates | ❌ | Sprint 9 | |
| 🆕 Create video challenges for players | ❌ | Sprint 9 | |

### Parent/Athlete View
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| See skill progression | ✅ | Sprint 9 | Add radar chart overlay |
| See all badges | ✅ | — | Badge collection |
| See goals and progress | ✅ | Sprint 9 | Enhance |
| See session history and notes | ✅ | — | History view |
| See improvement over time | ✅ | Sprint 9 | Add timeline |
| Track own progress (athlete) | ✅ | Sprint 9 | Enhance (731 lines) |
| Complete assigned drills | ✅ | — | Drill completion |
| 🆕 Monthly progress report (shareable) | ❌ | Sprint 9 | |
| 🆕 Personal session journal with mood/energy (athlete) | ❌ | Sprint 9 | |
| 🆕 Goal setting with age-based suggestions | ❌ | Sprint 9 | |
| 🆕 Submit video challenge attempts | ❌ | Sprint 9 | |

---

## 8. COMMUNICATION & MESSAGING

### Direct Messaging
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Message coach directly | ✅ | — | Messaging service |
| Coach messages parents/athletes | ✅ | — | Messaging service |
| See unread message count | ✅ | — | Badge count |
| Share images in chat | ✅ | — | Attachments |
| Push notifications for messages | 🔨 | Sprint 6 | Needs notification infra |
| Mute notifications from specific coaches | ✅ | — | Mute feature |
| 🆕 Squad group chat (all parents + coaches) | ❌ | Sprint 4 | Spond-beater |
| 🆕 Pin announcements in group chat | ❌ | Sprint 4 | |
| 🆕 Bulk message all parents in squad/club | ❌ | Sprint 4 | |

### Notifications
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Booking confirmation notifications | 🔨 | Sprint 6 | Notification service exists — needs push infra |
| Session reminder notifications | 🔨 | Sprint 10 | 24h + 1h with directions |
| Cancellation notifications | 🔨 | Sprint 6 | Basic |
| New booking notifications (coach) | 🔨 | Sprint 6 | Basic |
| Coach cancellation notifications | 🔨 | Sprint 6 | Basic |
| New badge notifications | 🔨 | Sprint 6 | Basic |
| Quiet hours | ✅ | — | Quiet hours selector |
| Channel preferences (push/email) | ✅ | Sprint 5 | Enhance |
| 🆕 In-app notification centre with bell icon | 🔨 | Sprint 6 | 378 lines exist — enhance |
| 🆕 Deep link from notification tap to relevant screen | ❌ | Sprint 6 | |
| 🆕 Per-type notification toggles | 🔨 | Sprint 5 | 334 lines exist — enhance |

---

## 9. EARNINGS & BUSINESS (COACH)

| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| See total earnings | ✅ | Sprint 7 | Earnings (903 lines) — enhance with projections |
| See pending vs available balance | 🔨 | Sprint 7 | Rethink for cash (display-only tracking) |
| See earnings by time period | ✅ | Sprint 7 | Period filters |
| See breakdown by session type | ✅ | Sprint 7 | Analytics |
| Withdraw to bank | 💤 | — | DEFERRED — cash only |
| Withdraw to PayPal | 💤 | — | DEFERRED |
| See withdrawal history | 💤 | — | DEFERRED |
| Understand platform fees | 💤 | — | DEFERRED |
| Create session packages | 💤 | — | RETHINK as bundles |
| Create promo codes | 💤 | — | DEFERRED |
| See referral earnings | 💤 | — | DEFERRED (keep referral tracking, remove money) |
| 🆕 Earnings projections (confirmed + pending + projected) | ❌ | Sprint 7 | |
| 🆕 Trial session conversion tracking | ❌ | Sprint 7 | |
| 🆕 "Your busiest day is Saturday" insights | ❌ | Sprint 3 | Smart slot suggestions |

---

## 10. CLUB & SQUAD MANAGEMENT

### Club Admin
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Create a club | ✅ | — | Club service |
| Invite coaches | ✅ | — | Invite members (629 lines) |
| Create squads | ✅ | — | Squad service |
| Assign coaches to squads | ✅ | — | Squad management |
| Manage member roles | ✅ | — | Role management |
| Set club branding | 🔨 | Sprint 4 | Academy branding (467 lines) — extend to clubs |
| See club-wide analytics | 🔨 | Sprint 7 | Basic analytics |
| Manage club subscription | 💤 | — | DEFERRED |
| 🆕 Club dashboard with stats, results, quick actions | ❌ | Sprint 4 | |
| 🆕 Club calendar aggregating all squads | ❌ | Sprint 4 | |
| 🆕 Club announcements with RSVP | ❌ | Sprint 4 | |

### Club Coach
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| See assigned squads | ✅ | — | Squad view |
| Manage squad roster | ✅ | — | Roster service |
| Create sessions for squad | ✅ | — | Squad sessions |
| Bulk invite squad | ✅ | — | Bulk invites |
| Track squad progress | ✅ | Sprint 9 | Enhance with radar |
| Create club events | ✅ | — | Event service (885 lines) |

### Club Member
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Join club with code | ✅ | — | Join with code |
| See club announcements | 🔨 | Sprint 4 | Club feed exists — add announcements |
| See squad schedule | ✅ | — | Squad schedule |
| RSVP to club events | ✅ | — | Event RSVP (588 lines) |
| See other squad members | 🔨 | Sprint 4 | Basic roster view |
| Access club drills | ✅ | — | Drill library |
| 🆕 Squad group chat | ❌ | Sprint 4 | |

---

## 11. EVENTS & MATCHES

### Events
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Create club events | ✅ | — | Event service |
| Set event type (tournament, social) | ✅ | — | Event types |
| Track RSVPs | ✅ | — | RSVP tracking |
| Check in attendees | ✅ | — | Attendance tracking |
| Parent RSVP for child | ✅ | — | RSVP flow |
| See upcoming events | ✅ | — | Event list |

### Matches
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Create match fixtures | ✅ | — | Match service (874 lines) |
| Invite players | ✅ | — | Match invites |
| Select lineup | ✅ | — | Lineup selector |
| Record results | ✅ | Sprint 4 | Auto-post to club feed |
| Mark availability | ✅ | — | Availability response |
| See if child is selected | ✅ | — | Selection notification |

---

## 12. VIDEO & CONTENT

| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Upload session videos | ✅ | — | Video service |
| Annotate videos | ✅ | — | Annotation service (594 lines) |
| Share videos with athletes | ✅ | — | Video sharing |
| Create drill library | ✅ | Sprint 9 | Drill service (440 lines) — expand to 30+ |
| Assign drills | ✅ | — | Drill assignment (736 lines) |
| View child's videos | ✅ | — | Video player |
| See annotations | ✅ | — | Annotation display |
| Mark drills complete | ✅ | — | Completion tracking |
| 🆕 Video challenges (coach posts, players submit) | ❌ | Sprint 9 | |
| 🆕 Challenge leaderboard | ❌ | Sprint 9 | |

---

## 13. FAMILY DASHBOARD (PARENT)

| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Manage multiple children | ✅ | — | Children management (779 lines) |
| Switch between children | ✅ | — | Child switcher |
| Unified calendar for all children | ✅ | — | Family calendar (352 lines) |
| See total spending | 💤 | — | RETHINK for cash — show session count instead |
| See spending by child | 💤 | — | Same |
| See all children's progress | ✅ | — | Family overview (432 lines) |
| Share access with partner/spouse | ✅ | Sprint 5 | **726 lines exist!** Verify it works |

---

## 14. SAFETY & TRUST

### Coach Verification
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Verify email and phone | ✅ | — | Verification service |
| Submit ID verification | ✅ | — | ID verification (334 lines) |
| Complete background check | ✅ | — | Background check (357 lines) |
| Upload credentials | ✅ | — | Credentials (490 lines) |
| Show verification badges | ✅ | — | Badge display |

### Safety Features
| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| See coach verification status | ✅ | — | Verification display |
| Set emergency contacts | ✅ | — | Emergency info |
| Provide medical information | ✅ | — | Medical info |
| Manage consent forms | ✅ | — | Consent service |
| Track injuries/health | ✅ | — | Injury service (1420 lines total) |
| Report safety concerns | 🔨 | Sprint 5 | Basic reporting — enhance with full flow |
| 🆕 Block a user | ❌ | Sprint 5 | |
| 🆕 Report inappropriate messages | ❌ | Sprint 5 | |
| 🆕 Admin review queue for reports | ❌ | Sprint 5 | |

---

## 15. SOCIAL & COMMUNITY

| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Follow coaches | ✅ | — | Follow service |
| See social feed | ✅ | Sprint 4 | Feed (1030 lines) — add rich cards |
| Post updates (coach) | ✅ | — | Coach posts |
| Share achievements | ✅ | Sprint 10 | Post types — add shareable images |
| Join community groups | ✅ | — | Community (523 lines) |
| Interact with posts (like, comment) | 🔨 | — | Basic interactions |

---

## 16. REFERRALS & GROWTH

| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| Refer friends | ✅ | — | Referral service — keep but remove money |
| Share referral code | ✅ | — | Referral code (402 lines) |
| Track referral stats | ✅ | — | Referral stats — remove money display |
| See who referred | ✅ | — | Referral list |

---

## 17. APP EXPERIENCE & DELIGHT (🆕 from Sprint Audit)

| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| 🆕 Confetti celebration on badge earned | ❌ | Sprint 10 | |
| 🆕 Celebration on goal completed | ❌ | Sprint 10 | |
| 🆕 Coach milestone celebrations (10/25/50/100 sessions) | ❌ | Sprint 10 | |
| 🆕 One-tap match RSVP from notification | ❌ | Sprint 10 | |
| 🆕 One-tap invite accept from notification | ❌ | Sprint 10 | |
| 🆕 Session reminders 24h + 1h before with directions | ❌ | Sprint 10 | |
| 🆕 Coach "I'm on my way" status | ❌ | Sprint 10 | |
| 🆕 Micro-interactions (haptics, press states, animations) | ❌ | Sprint 10 | |
| 🆕 Shareable achievement cards (organic marketing) | ❌ | Sprint 10 | |
| 🆕 Loading skeletons on every screen (not spinners) | 🔨 | Sprint 5 | Skeleton component (59 lines) — expand |
| 🆕 Error states with retry on every screen | ❌ | Sprint 5 | |
| 🆕 Contextual empty states with CTA on every screen | ❌ | Sprint 5 | |
| 🆕 Offline banner + action queue | ❌ | Sprint 1 | |
| 🆕 Deep linking for all shareable content | ❌ | Sprint 6 | |

---

## 18. INFRASTRUCTURE (🆕)

| Story | Status | Sprint | Notes |
|-------|--------|--------|-------|
| 🆕 Standardised API client (all 46 services use same pattern) | ❌ | Sprint 1 | |
| 🆕 Mock ↔ real API toggle via env var | ❌ | Sprint 6 | |
| 🆕 JWT auth with token refresh | ❌ | Sprint 6 | |
| 🆕 Push notification infrastructure | ❌ | Sprint 6 | |
| 🆕 Accessibility (WCAG AA, screen readers, 44pt targets) | ❌ | Sprint 5 | |
| 🆕 Delete account (GDPR compliance) | ❌ | Sprint 5 | |
| 🆕 Data export (GDPR compliance) | ❌ | Sprint 5 | |

---

## STORY COUNT SUMMARY

| Category | ✅ Built | 🔨 Enhance | ❌ Missing | 💤 Deferred | 🆕 New |
|----------|---------|-----------|----------|-----------|--------|
| Onboarding | 10 | 1 | 4 | 0 | 4 |
| Discovery | 11 | 2 | 7 | 0 | 7 |
| Sessions | 19 | 2 | 2 | 0 | 2 |
| Booking | 10 | 2 | 5 | 8 | 5 |
| Availability | 6 | 2 | 4 | 0 | 4 |
| Post-Session | 12 | 3 | 2 | 0 | 2 |
| Progress | 14 | 1 | 5 | 0 | 5 |
| Messaging | 8 | 4 | 5 | 0 | 5 |
| Earnings | 4 | 1 | 3 | 7 | 3 |
| Clubs | 17 | 3 | 4 | 1 | 4 |
| Events/Matches | 12 | 0 | 0 | 0 | 0 |
| Video | 8 | 0 | 2 | 0 | 2 |
| Family | 4 | 0 | 0 | 2 | 0 |
| Safety | 8 | 1 | 3 | 0 | 3 |
| Social | 4 | 1 | 0 | 0 | 0 |
| Referrals | 4 | 0 | 0 | 0 | 0 |
| Delight | 0 | 1 | 13 | 0 | 14 |
| Infrastructure | 0 | 0 | 7 | 0 | 7 |
| **TOTAL** | **151** | **24** | **66** | **18** | **67** |

**151 stories built, 24 need enhancement, 66 to build, 18 deferred for cash MVP, 67 brand new stories added from sprint audit.**

---

## CRITICAL PATH (Must Work Perfectly Before Launch)

1. ❌ Invite → Booking bug fix (Sprint 1)
2. ❌ Session completion flow enhancement (Sprint 2)
3. ❌ RSVP for group sessions (Sprint 2)
4. ❌ Cancellation policy display (Sprint 3)
5. ❌ Map that works (Sprint 8)
6. ❌ Push notifications (Sprint 6)
7. ❌ Safety reporting (Sprint 5)
8. ❌ Coach onboarding (Sprint 10)

---

*Last updated: February 2026 — Post sprint audit*
