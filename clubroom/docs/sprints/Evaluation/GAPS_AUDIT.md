# Comprehensive Gap Audit — Every Interaction Must Be Perfect

> Brutal audit of what's missing, half-built, or not good enough.
> Organised by user journey, not by sprint. Because users don't think in sprints.

---

## AUDIT METHOD

I walked through every single thing each role does in the app, screen by screen, tap by tap. For each interaction I asked:
1. Does the screen exist?
2. Does the interaction actually work end-to-end?
3. Is there a loading state?
4. Is there an error state?
5. Is there an empty state?
6. Is the feedback instant (optimistic UI)?
7. Would a first-time user know what to do?
8. Does it feel good or just functional?

---

## PARENT JOURNEY — Full Walkthrough

### 1. First Open → "What is this app?"
| What happens | What should happen |
|---|---|
| Dumped on discover screen with postcode input | 3-screen onboarding: what the app does → add your child → find coaches nearby |
| No explanation of value prop | First screen shows "Find the perfect football coach for your child" |
| No prompt to add a child | Can't do anything useful without a child profile — force this first |
| ❌ **Gap**: No first-time experience at all | Sprint 10 |

### 2. Add Child
| What happens | What should happen |
|---|---|
| Navigate to settings → children → add | Prompted during onboarding or first search |
| Form works but no age calculation from DOB | Auto-calculate age, show "Jake, 10" everywhere |
| No skill level selector during add | Add skill level + position during creation (used for recommendations) |
| No photo upload for child | Child photo on booking confirmations, progress reports |
| ❌ **Gap**: Child creation is buried and minimal | Sprint 10 onboarding + Sprint 5 UI |

### 3. Find a Coach — Discovery
| What happens | What should happen |
|---|---|
| Postcode input → flat list of coaches | GPS first, postcode fallback → rich map + list with filters |
| No filters visible on first load | Filter chips visible immediately (Price, Distance, Rating, Age) |
| Map exists but uses DIY grid, not real maps | react-native-maps with Airbnb-quality experience (see MAP_EXPERIENCE.md) |
| Coach cards show name/rating/price/distance | Add: verified badge, review quote, next available slot, trial badge, specialties |
| No "Featured" or "Recommended" sections | Horizontal scroll sections on parent home (Sprint 8) |
| No search suggestions | Recent + popular + area browse (Sprint 8) |
| No browsing by specialty | Specialty chips → filtered results |
| ⚠️ **Gap**: Discovery exists but is basic | Sprint 8 + MAP_EXPERIENCE.md |

### 4. View Coach Profile
| What happens | What should happen |
|---|---|
| Profile page loads with bio, qualifications, portfolio | All good — this is well built (4.5/5) |
| Reviews section exists | Good |
| Gallery/portfolio works | Good |
| No "similar coaches" at bottom | Add "Coaches like Marcus" recommendation row |
| No "share this coach" button | Share button → deep link or social card |
| ❌ **Gap**: No similar coaches, no share | Sprint 7 (public profile) + Sprint 8 (recommendations) |

### 5. Book a Session
| What happens | What should happen |
|---|---|
| Multi-step booking wizard works well | This is genuinely good (4/5) |
| Select child → select slot → confirm | Works |
| Price shown clearly | Good |
| Location shown | Good |
| No cancellation policy shown during booking | Show coach's cancellation policy before confirm (Sprint 3) |
| No "you'll pay £X cash at the session" reminder | Add cash payment reminder on confirmation screen |
| No estimated travel time to venue | Show "15 min drive from your location" on confirm screen |
| ⚠️ **Gap**: Missing policy, payment reminder, travel time | Sprint 3 + Sprint 5 |

### 6. Booking Confirmed → What Now?
| What happens | What should happen |
|---|---|
| Confirmation screen shown | Good |
| Booking appears in "my bookings" | Good |
| No push notification scheduled | Schedule reminder: 24h before + 1h before (Sprint 10) |
| No add-to-calendar option | "Add to Calendar" button → native calendar integration |
| No directions link | "Get Directions" → open Maps app with venue address |
| No weather info for outdoor sessions | Show weather for session date/time (nice-to-have, not MVP critical) |
| ❌ **Gap**: No calendar, no directions, no reminders | Sprint 10 + new |

### 7. Accept a Session Invite
| What happens | What should happen |
|---|---|
| Invite shows in pending section | Good |
| Tap "Accept" | Console.log but NO booking created (BUG) |
| Parent thinks they're booked but they're not | Fix: accept → create booking → confirmation (Sprint 1) |
| No "Decline with reason" option | Add decline with optional reason (Sprint 2) |
| 🚨 **CRITICAL BUG**: Invites don't work | Sprint 1 |

### 8. Before the Session
| What happens | What should happen |
|---|---|
| Nothing | 24h reminder: "Tomorrow at 4pm with Coach Marcus at Hackney Downs" |
| Nothing | 1h reminder: "In 1 hour! Here are directions to Hackney Downs Park" |
| Nothing | Quick actions from notification: Get Directions, Message Coach, Cancel |
| ❌ **Gap**: Zero pre-session communication | Sprint 10 |

### 9. After the Session
| What happens | What should happen |
|---|---|
| Nothing | Coach marks attendance + adds notes (Sprint 2) |
| Nothing | Parent gets prompt: "How was the session with Coach Marcus?" → review flow |
| Nothing | Session recap card: what was covered, badges earned, next session |
| Nothing | "Book again?" CTA in recap |
| ❌ **Gap**: Session just... ends. No closure. | Sprint 2 + Sprint 9 |

### 10. View My Child's Progress
| What happens | What should happen |
|---|---|
| Badges exist on profile | Good foundation |
| No skill tracking over time | Radar chart showing 6 skills over time (Sprint 9) |
| No session history with notes | Timeline of all sessions with coach notes (Sprint 9) |
| No progress report | Monthly shareable report: skills, badges, goals (Sprint 9) |
| No video challenge submissions | Video challenges from coach (Sprint 9) |
| ❌ **Gap**: No development tracking | Sprint 9 |

### 11. Club/School Experience
| What happens | What should happen |
|---|---|
| Can join club via invite code | Good |
| Club page shows members list | Basic |
| No club branding | Cover photo, logo, colours (Sprint 4) |
| No club calendar | Aggregated calendar of all squad sessions (Sprint 4) |
| No feed | Rich activity feed: results, badges, events (Sprint 4) |
| No squad management for parents | See which squad your child is in |
| ❌ **Gap**: Clubs are just member lists | Sprint 4 |

### 12. Messaging
| What happens | What should happen |
|---|---|
| Chat screen exists | Skeleton only — can send text messages |
| No read receipts | Show blue ticks |
| No typing indicator | Show "Marcus is typing..." |
| No image/file sharing | Share photos, drill videos |
| No notification for new messages | Push notification on new message |
| No conversation list | List of all conversations with last message preview |
| ⚠️ **Gap**: Messaging is minimal | Needs new sprint or extend Sprint 5 |

---

## COACH JOURNEY — Full Walkthrough

### 1. First Open → "How do I get started?"
| What happens | What should happen |
|---|---|
| Coach home shows dashboard-style cards | Fine for returning coaches, bad for first-timers |
| No setup wizard | 5-screen onboarding: photo → bio → qualifications → availability → "You're live!" (Sprint 10) |
| No checklist of what to complete | "Complete your profile" progress bar (Sprint 5) |
| No explanation of how to get bookings | "How it works" section: parents search → find you → book → you earn |
| ❌ **Gap**: Coach onboarding is nonexistent | Sprint 10 |

### 2. Set Up Profile
| What happens | What should happen |
|---|---|
| Profile edit screen works | Good |
| Can add bio, qualifications, specialties | Good |
| Portfolio builder works | Good — video/image grid |
| No public profile preview | "See how parents see you" button (Sprint 7) |
| No shareable profile link | Public URL + QR code (Sprint 7) |
| No profile completeness score | "Your profile is 70% complete — add qualifications to rank higher" |
| ⚠️ **Gap**: No public profile, no share, no completeness | Sprint 7 |

### 3. Set Availability
| What happens | What should happen |
|---|---|
| Availability editor exists | Works |
| Can set weekly recurring slots | Good |
| No buffer time between sessions | Coach needs 15-30 min between sessions (Sprint 3) |
| No minimum notice period | "Don't allow bookings less than 24h in advance" (Sprint 3) |
| No maximum advance booking | "Don't allow bookings more than 4 weeks out" (Sprint 3) |
| No blocked dates | Coach going on holiday — block specific dates |
| No same-day booking toggle | Some coaches want walk-ins, some don't |
| ❌ **Gap**: Scheduling rules are missing | Sprint 3 |

### 4. Receive a Booking
| What happens | What should happen |
|---|---|
| Booking appears in upcoming | Good |
| No push notification | "New booking! Jake (10) booked Tue 4pm" |
| No quick accept/decline from notification | Tap notification → accept/decline |
| If auto-accept: no notification that it happened | "You have a new session with Jake — Tue 4pm" |
| ⚠️ **Gap**: No booking notifications | Sprint 10 |

### 5. Send a Session Invite
| What happens | What should happen |
|---|---|
| Can create and send invite | Works |
| Parent receives invite | Shows in pending section |
| Parent accepts → nothing happens | BUG — must create booking (Sprint 1) |
| No way to see invite status (pending/accepted/declined) | Invite management screen showing all invites + statuses |
| No way to resend expired invites | "Resend" button on expired invites |
| ❌ **Gap**: Invite tracking broken and incomplete | Sprint 1 |

### 6. Run the Session (day of)
| What happens | What should happen |
|---|---|
| Session shows in "today" section | Good |
| No "I'm on my way" status | Toggle "On my way" → parent gets notification |
| No attendance marking | Mark who showed up (Sprint 2) |
| No session notes | Add post-session notes per player (Sprint 2) |
| No quick badge award | "Award badge" button during/after session |
| ❌ **Gap**: No in-session tools | Sprint 2 |

### 7. After the Session
| What happens | What should happen |
|---|---|
| Nothing | Session completion flow: attendance → notes → badges → done (Sprint 2) |
| Nothing | See review from parent when they submit |
| Nothing | Session recap auto-generated: "You trained 3 players today" |
| Nothing | "Create follow-up session" quick action |
| ❌ **Gap**: Session just disappears | Sprint 2 |

### 8. Track My Business
| What happens | What should happen |
|---|---|
| No earnings view at all | Earnings dashboard: today/week/month, projections (Sprint 7) |
| No session statistics | "42 sessions this month, 12 unique players" |
| No trial conversion tracking | "3 of 5 trial players booked again" (Sprint 7) |
| No booking trends | "Saturdays are your busiest day" |
| ❌ **Gap**: No business intelligence | Sprint 7 |

### 9. Manage Club/School
| What happens | What should happen |
|---|---|
| Can create club and squads | Good |
| Can invite members | Good |
| No branding customization | Logo, cover, colours (Sprint 4) |
| No club-level calendar | See all squads in one calendar (Sprint 4) |
| No club announcements | Pinned posts in feed |
| No parent communication (club-wide) | "Message all parents" bulk messaging |
| ⚠️ **Gap**: Club management is basic | Sprint 4 |

### 10. Plan Sessions
| What happens | What should happen |
|---|---|
| No session plan feature | Template library: warm-up, drills, games, cool-down (Sprint 9) |
| No drill library | 30+ drills with video demos (Sprint 9) |
| No curriculum/programme builder | Multi-week programme: "8-week finishing course" |
| ❌ **Gap**: No professional coaching tools | Sprint 9 |

---

## ATHLETE JOURNEY (teen/adult booking for themselves)

### Gaps
| Gap | Fix |
|---|---|
| No differentiation from parent UX | Athlete skips child selection, books for self |
| No "my skills" self-assessment | Skill level picker during profile setup |
| No coach recommendations based on own level | Use athlete.skillLevel for matching |
| No goal setting | "I want to improve my weak foot" → matched to relevant coaches |
| No session journal/notes for self | Personal notes after each session |
| ⚠️ Most athlete gaps are covered by existing sprints (9, 10) | Minor tweaks needed |

---

## INTERACTIONS THAT MUST FEEL PERFECT

These are the moments that make or break the app. Every one needs to be polished:

### The "Money Moments"
1. **First coach found** — must feel exciting, not like a phone book
2. **Booking confirmed** — celebration, clear next steps, calendar add
3. **First session completed** — recap, review prompt, "book again?"
4. **First review received** (coach) — celebration, motivation to keep going
5. **Trial → repeat booking** — the conversion moment

### The "Trust Moments"
1. **Viewing a coach for the first time** — verification badge, reviews, qualifications must be immediately visible
2. **Entering payment info** — N/A for cash, but booking confirmation must say "Pay £40 cash at the session"
3. **Cancelling a session** — policy clearly shown, confirmation dialog, both parties notified
4. **Reporting a concern** — safety-critical, must exist (NOT IN ANY SPRINT — adding below)

### The "Delight Moments"
1. **Badge earned** — confetti + sound + card (Sprint 10)
2. **Milestone reached** — "10 sessions completed!" celebration
3. **New review** — coach gets a nice card, not just a notification
4. **Streak maintained** — "4 weeks in a row! Keep it going"
5. **Progress shown** — radar chart going up feels motivating

---

## CRITICAL GAPS NOT IN ANY SPRINT

These fell through the cracks. Every one needs to be addressed:

### 1. Safety & Reporting
**Not in any sprint. Must be added.**

- Report coach button on profile page
- Report inappropriate message in chat
- Report concern about session
- Admin review queue for reports
- Block user functionality
- Coach verification flow (DBS check upload, qualification verification)

**Where**: Add to Sprint 5 (UI polish) or create Sprint 5b

### 2. Cancellation Flow (end-to-end)
**Sprint 3 covers policy creation. But the actual cancellation flow is missing.**

- Parent cancels session → confirmation dialog → shows refund policy → coach notified
- Coach cancels session → parent notified → automatic rebooking suggestion
- Late cancellation → policy enforced (note shown, no money involved for cash MVP)
- No-show handling → coach marks no-show → parent flagged

**Where**: Extend Sprint 3

### 3. Notifications System
**No sprint covers the actual notification infrastructure.**

- Push notification registration (expo-notifications)
- Notification permission request flow
- Notification types: booking, invite, reminder, review, message, badge, milestone
- Notification preferences screen (toggle each type)
- In-app notification centre (bell icon with badge count)
- Deep linking from notification tap → relevant screen

**Where**: Add to Sprint 6 (auth/API prep) — notifications are infrastructure

### 4. Calendar Integration
**Not in any sprint.**

- Add booking to native calendar (iOS Calendar / Google Calendar)
- Calendar sync for coaches (see all sessions in phone calendar)
- iCal export for coaches

**Where**: Add to Sprint 2 (session lifecycle)

### 5. Offline / Poor Connection Handling
**Not in any sprint.**

- Cached data for previously loaded screens
- Optimistic UI for actions (book → show booked immediately, sync later)
- Offline banner: "You're offline. Some features may not work."
- Queue actions taken offline, sync when reconnected
- Stale data indicator: "Last updated 5 min ago"

**Where**: Add to Sprint 1 (service layer — this is where the API client lives)

### 6. Accessibility
**Not in any sprint.**

- Screen reader labels on all interactive elements
- Minimum touch targets (44x44pt)
- Colour contrast compliance (WCAG AA)
- Dynamic text size support
- Reduce motion option (disable animations)

**Where**: Add to Sprint 5 (UI polish)

### 7. Deep Linking
**Not in any sprint.**

- Coach profile: `clubroom://coach/{id}` → opens coach profile
- Booking: `clubroom://booking/{id}` → opens booking details
- Club invite: `clubroom://club/join/{code}` → opens club join flow
- Session invite: `clubroom://invite/{id}` → opens invite acceptance
- Universal links for web sharing

**Where**: Add to Sprint 6 (API prep) — needed for notifications + sharing

### 8. Settings Completeness
**Settings screen exists but is incomplete.**

Missing:
- Notification preferences (per-type toggles)
- Privacy settings (profile visibility, search visibility)
- Language/locale preference
- Delete account (GDPR requirement)
- Data export (GDPR requirement)
- Terms of service / privacy policy display
- App version info

**Where**: Add to Sprint 5 (UI polish)

### 9. Favourites / Saved Coaches
**Not in any sprint.**

- Heart icon on coach cards and profile
- "My Saved Coaches" section in parent home
- Saved coaches show different pin on map (see MAP_EXPERIENCE.md)
- Notify when saved coach adds new availability

**Where**: Add to Sprint 8 (discovery)

### 10. Coach Availability "Smart Slots"
**Not in any sprint. Currently availability is manual recurring slots only.**

- "Copy last week's schedule" quick action
- "Block this week" holiday mode
- Auto-suggest popular times based on booking history
- Show coaches when their slots are consistently unbooked: "Consider adding evening slots"

**Where**: Add to Sprint 3 (coach settings)

---

## UPDATED SPRINT IMPACT

After this audit, here's what needs to be added to each sprint:

| Sprint | Additions |
|--------|-----------|
| **1** | Offline queueing in api-client, connection status detection |
| **2** | Calendar integration (add to calendar), decline invite with reason |
| **3** | Full cancellation flow (not just policy), no-show handling, blocked dates, smart slot suggestions |
| **4** | Club announcements / pinned posts, bulk parent messaging |
| **5** | Safety reporting, accessibility audit, settings completeness, screen reader labels |
| **6** | Push notification infrastructure, deep linking setup, notification preferences |
| **7** | Profile share button, similar coaches section |
| **8** | Favourites/saved coaches, saved coaches on map, "no results" state polish |
| **9** | Personal session journal for athletes, goal setting |
| **10** | Pre-session reminders with directions/weather, "I'm on my way" coach status |

---

## THE SPOND-BEATER CHECKLIST

Things Spond does that we MUST match:
- [x] Team/squad management (clubs + squads)
- [x] Event creation (matches + sessions)
- [ ] **RSVP for events** ← WE DON'T HAVE THIS for group sessions
- [ ] **Group messaging** ← We have 1-to-1 only, need group chat for squads
- [x] Member roles in groups
- [ ] **Subgroups** ← Spond has guardians group, coaches group within a team
- [ ] **Availability polling** ← "Can you make training this Tuesday?" RSVP
- [ ] **Car pooling** ← Nice to have, not critical
- [ ] **Payment collection for events** ← Cash only for us, but Spond tracks who's paid

Things Spond does NOT do that we do:
- [x] Coach discovery and marketplace
- [x] Individual booking and scheduling
- [x] Coach profiles and portfolios
- [x] Skill development tracking
- [x] Session planning tools
- [x] Trial sessions
- [x] Public coach profiles
- [x] Business growth tools for coaches

### RSVP Gap — CRITICAL

Spond's killer feature is RSVP. "Training Tuesday 6pm — are you coming?"

We need this for group sessions and matches:
- Coach creates group session/match → all squad members get RSVP request
- Parent responds: ✅ Going / ❌ Can't make it / ❓ Maybe
- Coach sees real-time attendance count
- Reminders for non-responders
- Auto-populated attendance list on session day

**This is NOT in any sprint. It should be added to Sprint 2 (session lifecycle).**

### Group Chat Gap — HIGH

Squads need group messaging:
- Squad-level group chat (all parents + coaches)
- Coach can post announcements (pinned)
- Parents can discuss
- Photo/image sharing
- Separate from 1-to-1 coaching conversations

**This should be added to Sprint 4 (club/school revamp) or a dedicated messaging sprint.**

---

## API README ADDITIONS

New tables needed from this audit:

```sql
-- Reports & Safety
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id),
  reported_user_id UUID REFERENCES users(id),
  reported_content_id UUID,
  reported_content_type VARCHAR(20), -- 'message', 'review', 'profile'
  reason VARCHAR(50) NOT NULL, -- 'inappropriate', 'safety_concern', 'spam', 'fake_profile'
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favourites
CREATE TABLE favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  coach_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, coach_id)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(30) NOT NULL, -- 'booking', 'invite', 'reminder', 'review', 'message', 'badge', 'milestone'
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data JSONB, -- deep link info, related entity IDs
  read BOOLEAN DEFAULT FALSE,
  push_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
  booking_push BOOLEAN DEFAULT TRUE,
  booking_email BOOLEAN DEFAULT TRUE,
  invite_push BOOLEAN DEFAULT TRUE,
  reminder_push BOOLEAN DEFAULT TRUE,
  review_push BOOLEAN DEFAULT TRUE,
  message_push BOOLEAN DEFAULT TRUE,
  badge_push BOOLEAN DEFAULT TRUE,
  milestone_push BOOLEAN DEFAULT TRUE,
  marketing_email BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RSVP
CREATE TABLE session_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  user_id UUID NOT NULL REFERENCES users(id),
  child_id UUID REFERENCES children(id),
  status VARCHAR(10) NOT NULL DEFAULT 'pending', -- 'going', 'not_going', 'maybe', 'pending'
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id, child_id)
);

-- Group Messages
CREATE TABLE group_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id),
  name VARCHAR(100), -- defaults to squad name
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES group_conversations(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  media_url TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocked dates (coach holidays)
CREATE TABLE blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Total tables: **~62** (up from ~54)

---

## SUMMARY

| Category | Gaps Found | Severity |
|----------|-----------|----------|
| Safety & reporting | 0 screens exist | 🚨 Critical |
| RSVP for group sessions | Not started | 🚨 Critical (Spond-beater) |
| Session invite bug | Broken | 🚨 Critical |
| Notifications infrastructure | Not started | 🔴 High |
| Cancellation flow (end-to-end) | Policy only, no flow | 🔴 High |
| Group messaging | Not started | 🔴 High (Spond-beater) |
| Calendar integration | Not started | 🔴 High |
| Deep linking | Not started | 🟡 Medium |
| Offline handling | Not started | 🟡 Medium |
| Favourites/saved | Not started | 🟡 Medium |
| Accessibility | Not audited | 🟡 Medium |
| Settings completeness | Partial | 🟡 Medium |
| Athlete-specific UX | Minimal differentiation | 🟢 Low |
| Smart availability | Manual only | 🟢 Low |

**Before this audit**: 10 sprints, ~54 tables
**After this audit**: 10 sprints (expanded), ~62 tables, 14 new gap categories addressed
