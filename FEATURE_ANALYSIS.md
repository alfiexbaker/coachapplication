# CoachApp Feature Analysis & Roadmap

## Current State Summary

**Total Screens:** 98
**Roles:** COACH, USER (Athlete), PARENT, ADMIN
**Major Issue:** Heavy redundancy - same features accessible via 3-4 different paths

---

## CURRENT FEATURES BY ROLE

### USER (Athlete) Features
| Feature | Status | Notes |
|---------|--------|-------|
| Find Coach | Done | Via discover/browse coaches |
| Book Sessions | Done | 1-to-1, group, clinics |
| View Schedule | Done | Upcoming bookings |
| Progress Tracking | Done | Personal progress dashboard |
| Badges/Achievements | Done | 12 categories, 5 tiers |
| Messaging | Done | Direct chat with coaches |
| Social Feed | Done | Posts, likes, comments |
| Session History | Done | Past sessions with notes |
| Reviews | Done | Rate coaches post-session |
| Wallet/Payments | Done | Add cards, pay for sessions |
| Notifications | Done | Session reminders, messages |
| Profile Management | Done | Edit details, goals, positions |
| Video Library | Done | Watch session videos |
| Club Membership | Done | Join clubs, see club feed |

### COACH Features
| Feature | Status | Notes |
|---------|--------|-------|
| Session Management | Done | Create offerings, manage bookings |
| Athlete Roster | Done | View all athletes, search, filter |
| Availability | Done | Set weekly schedule |
| Earnings Dashboard | Done | Track income, payouts |
| Athlete Progress | Done | Award badges, add notes |
| Session Invites | Done | Invite athletes to sessions |
| Group Sessions | Done | Create and manage |
| Messaging | Done | Chat with athletes/parents |
| Social Feed | Done | Post updates, achievements |
| Reviews | Done | See and respond to reviews |
| Analytics | Done | Performance stats, busy times |
| Verification | Done | ID, credentials, background |
| Profile | Done | Services, rates, certifications |
| Club Management | Done | Create/manage clubs |
| Academy | Done | Create academies, manage staff |

### PARENT Features
| Feature | Status | Notes |
|---------|--------|-------|
| Children Hub | Done | Manage multiple children |
| Book for Children | Done | Book sessions for kids |
| Child Progress | Done | View each child's development |
| Child Badges | Done | See children's achievements |
| Discover Coaches | Done | Browse and filter coaches |
| Messaging | Done | Communicate with coaches |
| Payments | Done | Pay for children's sessions |
| Emergency Contacts | Done | Per child |
| Medical Info | Done | Per child |
| Social Feed | Done | Community updates |

---

## ALL PAGES BY ROLE

### USER (Athlete) - 5 Tabs + Screens

**Tab Bar:**
1. Home - Personal dashboard, quick actions
2. Feed - Social posts, community
3. Bookings - Upcoming and past sessions
4. Messages - Chat with coaches
5. Settings - Profile, preferences

**Accessible Screens:**
- `/badges` - Badge showcase
- `/development/my-progress` - Progress dashboard
- `/booking/[id]` - Session details
- `/review/[bookingId]` - Leave review
- `/chat/[threadId]` - Message thread
- `/book/[coachId]/*` - Booking flow (5 steps)
- `/videos/*` - Video library
- `/club/[id]` - Club details
- `/settings/*` - Settings pages (6)
- `/payment/*` - Payment methods

### COACH - 5 Tabs + Screens

**Tab Bar:**
1. Home - Development overview
2. Schedule - Calendar, availability
3. Athletes - Roster management
4. Feed - Social posts
5. Settings - Profile, preferences

**Accessible Screens:**
- `/earnings` - Financial dashboard
- `/session-invites/*` - Create/manage invites
- `/group-sessions/*` - Group session management
- `/session-notes/[bookingId]` - Add session notes
- `/development/athlete/[athleteId]` - Athlete progress
- `/analytics/[athleteId]` - Athlete analytics
- `/roster/[athleteId]` - Athlete details
- `/verification/*` - Verification flow (4 steps)
- `/academy/*` - Academy management
- `/club/*` - Club management
- `/events/*` - Event management
- `/matches/*` - Match tracking
- `/chat/[threadId]` - Message thread
- `/settings/*` - Settings pages

### PARENT - 5 Tabs + Screens

**Tab Bar:**
1. Home - Overview dashboard
2. More - Discover coaches
3. Children - Children hub
4. Feed - Community
5. Settings - Preferences

**Accessible Screens:**
- `/development/child-progress/[childId]` - Child progress
- `/children/badges/[childId]` - Child badges
- `/child/[id]/emergency` - Emergency contacts
- `/child/[id]/medical` - Medical info
- `/book/[coachId]/*` - Booking flow
- `/booking/[id]` - Session details
- `/chat/[threadId]` - Message thread
- `/club/[id]` - Club details
- `/payment/*` - Payment methods
- `/settings/*` - Settings pages

---

## REDUNDANCY ISSUES (ANATOMICAL PROBLEMS)

### Critical: Same Button Appearing Everywhere

| Feature | Places It Appears | Should Be |
|---------|-------------------|-----------|
| Bookings | Tab + Settings + Schedule Hub | Tab only |
| Messages | Tab + Settings + Profile | Tab only |
| Badges | Tab + Statistics + Settings + Development | 1 unified screen |
| Feed | Tab + Settings + Quick Actions | Tab only |
| Earnings | Tab + Settings + Root level | Tab only |
| Roster | Athletes tab + Hidden roster tab + Settings | 1 screen |
| Profile Edit | View + Edit separate screens | Combined view/edit |

### Specific Duplications Found

1. **Earnings screens:** `/(tabs)/earnings.tsx` AND `/earnings.tsx`
2. **Roster screens:** `/(tabs)/roster.tsx` AND `/roster/index.tsx`
3. **Settings:** Full stack at `/settings/*` duplicates tab settings
4. **Badges:** 4 different badge screens
5. **Athlete details:** 3 different athlete detail screens
6. **Session recap:** 3 different session detail views

### Settings Page Bloat

The Settings page currently links to:
- Bookings (already a tab)
- Messages (already a tab)
- Feed (already a tab)
- Earnings (already a tab for coaches)
- Badges (accessible elsewhere)

**These should be REMOVED from settings - they're just cluttering the UI.**

---

## MISSING FEATURES - SUGGESTIONS

### HIGH PRIORITY (Core Functionality Gaps)

| Feature | Description | For Role |
|---------|-------------|----------|
| **Calendar Sync** | Sync sessions to Google/Apple Calendar | All |
| **Push Notifications** | Real push notifications (not just in-app) | All |
| **Session Reminders** | Automated reminders 24h/1h before | All |
| **Cancellation Policy** | Define cancellation windows, fees | Coach |
| **Waitlist** | Join waitlist for full sessions | User |
| **Recurring Bookings** | Book same slot weekly/monthly | User |
| **Package Deals** | Buy 5/10 session bundles at discount | User |
| **Referral System** | Refer friends, earn credits | All |
| **Coach Search Filters** | Filter by price, rating, distance, sport | User |
| **Map View** | See coaches on map by location | User |
| **Session Recording** | Record sessions (video/audio) | Coach |
| **Homework/Drills** | Assign practice between sessions | Coach |

### MEDIUM PRIORITY (Enhanced Experience)

| Feature | Description | For Role |
|---------|-------------|----------|
| **Goals Setting** | Set and track specific goals | User |
| **Injury Tracking** | Log injuries, recovery progress | User |
| **Nutrition Logging** | Track diet, meal plans | User |
| **Sleep Tracking** | Log sleep for recovery | User |
| **Equipment Checklist** | What to bring per session type | User |
| **Weather Integration** | Weather forecast for outdoor sessions | All |
| **Live Session Timer** | Timer during active sessions | Coach |
| **Skill Trees** | Visual skill progression paths | User |
| **Leaderboards** | Compare progress with peers | User |
| **Team Formation** | Create practice teams/groups | Coach |
| **Substitutes** | Request subs for group sessions | User |
| **Invoice Generation** | Generate PDF invoices | Coach |
| **Tax Reports** | Annual earnings reports | Coach |

### LOW PRIORITY (Nice to Have)

| Feature | Description | For Role |
|---------|-------------|----------|
| **Dark Mode** | System/manual dark theme | All |
| **Offline Mode** | View schedule offline | All |
| **Apple Watch** | Quick session view on watch | User |
| **Widgets** | Home screen widgets (next session) | All |
| **Siri/Voice** | "Book a session with Coach X" | User |
| **AR Drills** | Augmented reality drill demos | Coach |
| **AI Analysis** | AI-powered performance insights | Coach |
| **Parent Chat** | Direct parent-to-parent chat | Parent |
| **Carpooling** | Coordinate rides to sessions | Parent |
| **Sibling Discounts** | Auto-discount multiple children | Parent |

---

## SUGGESTED NEW PAGES

### For USER (Athlete)

| Page | Purpose |
|------|---------|
| `/goals` | Set, track, celebrate goals |
| `/injuries` | Log and track injuries |
| `/drills` | View assigned homework/drills |
| `/favorites` | Saved/favorite coaches |
| `/history` | Complete training history timeline |
| `/compare` | Compare progress over time |
| `/calendar` | Full calendar view of all sessions |
| `/packages` | View/buy session packages |

### For COACH

| Page | Purpose |
|------|---------|
| `/templates` | Session plan templates |
| `/drills/library` | Drill library to assign |
| `/invoices` | Generate and send invoices |
| `/reports` | Tax and earnings reports |
| `/waitlist` | Manage session waitlists |
| `/packages/manage` | Create package deals |
| `/cancellations` | View cancellation history |
| `/calendar/export` | Export calendar |

### For PARENT

| Page | Purpose |
|------|---------|
| `/family` | Family dashboard, all children |
| `/spending` | Spending across all children |
| `/carpool` | Coordinate rides |
| `/compare-coaches` | Side-by-side coach comparison |
| `/calendar/family` | Family calendar view |
| `/packages` | Buy packages for children |

---

## RECOMMENDED ACTIONS

### 1. REMOVE Redundant Navigation (Quick Win)

**In Settings page, remove these links:**
- Bookings (it's a tab)
- Messages (it's a tab)
- Feed (it's a tab)
- Earnings (it's a tab)

**Keep in Settings only:**
- Account settings
- Notifications
- Privacy
- Appearance
- Help
- Logout

### 2. CONSOLIDATE Duplicate Screens

| Remove | Keep | Reason |
|--------|------|--------|
| `/earnings.tsx` | `/(tabs)/earnings.tsx` | Duplicate |
| `/(tabs)/roster.tsx` | `/roster/*` | Hidden anyway |
| `/settings/*` stack | `/(tabs)/settings.tsx` | Use modals instead |
| Multiple badge screens | `/badges` (unified) | One source of truth |

### 3. MERGE View/Edit Screens

Combine these pairs:
- `coach-profile` + `edit-profile` → Single profile with edit mode
- `edit-user-profile` → Add to user home/settings modal

### 4. SIMPLIFY Athlete Details

Merge into ONE athlete screen with tabs:
- `/roster/[athleteId]` (overview)
- Add tabs for: Development, Analytics, History

---

## FEATURE PRIORITY MATRIX

```
                    HIGH IMPACT
                        |
    Calendar Sync       |       Recurring Bookings
    Push Notifications  |       Package Deals
    Session Reminders   |       Coach Search Filters
                        |
LOW EFFORT ------------|------------ HIGH EFFORT
                        |
    Remove Redundancy   |       Map View
    Settings Cleanup    |       Session Recording
    Goals Setting       |       AI Analysis
                        |
                    LOW IMPACT
```

### Recommended Order:
1. Remove redundant navigation (1 day)
2. Consolidate duplicate screens (2-3 days)
3. Add Calendar Sync (3-5 days)
4. Add Push Notifications (2-3 days)
5. Add Recurring Bookings (3-5 days)
6. Add Package Deals (5-7 days)
7. Add Coach Search/Map (7-10 days)

---

## SUMMARY

### What You Have (Strong)
- Complete booking flow
- Financial system (wallet, earnings, payouts)
- Progress/badge system
- Social feed
- Club management
- Messaging

### What's Broken (Fix First)
- Too many ways to reach same screen
- Settings page is cluttered
- Duplicate screens causing confusion
- Navigation inconsistency between roles

### What's Missing (Add Next)
- Calendar sync
- Recurring bookings
- Package deals
- Better coach discovery (filters, map)
- Goals and homework system
- Parent-focused family dashboard

---

*Generated: January 2026*
