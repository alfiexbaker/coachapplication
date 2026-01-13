# User Stories - Complete Feature Map

> "I'm helping!" - Ralph Wiggum

This document maps every user story across every role and feature area.
Legend: ✅ Built | 🔨 Partial | ❌ Missing | 🔥 Critical Gap

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
| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to sign up with my email so I can start coaching | ✅ | Auth flow exists |
| As a coach, I want to set my hourly rate so parents know my pricing | ✅ | Profile setup |
| As a coach, I want to add my qualifications so parents trust me | ✅ | Credentials in profile |
| As a coach, I want to verify my identity so I appear trustworthy | ✅ | Verification service |
| As a coach, I want to complete a background check so parents feel safe | ✅ | Background check flow |
| As a coach, I want to set my coaching specialties so I attract the right athletes | ✅ | Skills in profile |
| As a coach, I want to add my bio and photo so parents can learn about me | ✅ | Profile editing |
| As a coach, I want to link my social media so parents can see my work | ✅ | Social links |

### Parent
| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to sign up quickly so I can book sessions | ✅ | Auth flow |
| As a parent, I want to add my children so I can book for them | ✅ | Children management |
| As a parent, I want to add emergency contacts for each child | ✅ | Emergency info |
| As a parent, I want to add medical information for safety | ✅ | Medical info |
| As a parent, I want to set notification preferences so I'm not overwhelmed | ✅ | Notification settings |

### Athlete
| Story | Status | Notes |
|-------|--------|-------|
| As an athlete, I want to sign up and book for myself | ✅ | USER role |
| As an athlete, I want to set my skill level so coaches understand me | 🔨 | Basic profile |
| As an athlete, I want to set my training goals so coaches can help | ✅ | Goals system |

---

## 2. COACH DISCOVERY & SEARCH

### Parent/Athlete
| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to search for coaches near me | ✅ | Discover service |
| As a parent, I want to filter by sport/specialty | ✅ | Filter params |
| As a parent, I want to filter by price range | ✅ | Price filters |
| As a parent, I want to filter by rating | ✅ | Rating filters |
| As a parent, I want to filter by availability | 🔨 | Basic availability |
| As a parent, I want to see coaches on a map | ✅ | Map view |
| As a parent, I want to compare multiple coaches side by side | ✅ | Comparison tool |
| As a parent, I want to save coaches to favorites | ✅ | Favorites service |
| As a parent, I want to see coach reviews before booking | ✅ | Reviews display |
| As a parent, I want to see a coach's qualifications and verification status | ✅ | Verification badges |
| As a parent, I want to message a coach before booking to ask questions | ✅ | Messaging |

### Coach
| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want my profile to appear in search results | ✅ | Discover service |
| As a coach, I want to highlight my specialties to attract athletes | ✅ | Profile skills |
| As a coach, I want to showcase my reviews and ratings | ✅ | Review display |
| As a coach, I want to set my service area/locations | ✅ | Location settings |

---

## 3. SESSION CREATION & MANAGEMENT (COACH)

### Creating Sessions
| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to create 1:1 sessions | ✅ | Session create wizard |
| As a coach, I want to create group sessions | ✅ | Group sessions |
| As a coach, I want to set session pricing in GBP | ✅ | Price field |
| As a coach, I want to set session duration | ✅ | Duration field |
| As a coach, I want to set session location | ✅ | Location field |
| As a coach, I want to add a description of what we'll cover | ✅ | Description field |
| As a coach, I want to set skill focus (dribbling, passing, etc.) | ✅ | Skill selection |
| As a coach, I want to set age restrictions | ✅ | Age min/max |
| As a coach, I want to set max participants for group sessions | ✅ | Max participants |

### Recurring Sessions
| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to create weekly recurring sessions | ✅ | Weekly recurrence |
| As a coach, I want to create bi-weekly recurring sessions | ✅ | Biweekly option |
| As a coach, I want to set an end date for recurring sessions | ✅ | End date field |
| As a coach, I want to cancel individual instances without ending the series | ✅ | Instance cancellation |
| As a coach, I want to end an entire recurring series | ✅ | End series action |
| As a coach, I want to see all upcoming instances of a recurring session | ✅ | Instance list view |

### Session Invites
| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to create invite-only sessions | ✅ | Invite mode |
| As a coach, I want to invite specific athletes to sessions | ✅ | Athlete selection |
| As a coach, I want to bulk invite my roster to a session | ✅ | Bulk invite service |
| As a coach, I want to see who has accepted/declined invites | ✅ | Invite status |
| As a coach, I want to send invites to entire squads | ✅ | Squad invites |
| As a coach, I want to propose multiple time slots for an invite | ✅ | Proposed slots |

### Managing Sessions
| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to see all my upcoming sessions | ✅ | Bookings list |
| As a coach, I want to see who is registered for each session | ✅ | Registrations view |
| As a coach, I want to cancel a session and notify athletes | 🔨 | Cancel exists, notification partial |
| As a coach, I want to reschedule a session | 🔨 | Basic edit, no notification |
| As a coach, I want to manage a waitlist for full sessions | ✅ | Waitlist service |
| As a coach, I want to set session to "open" or "invite only" | ✅ | Session visibility |

---

## 4. BOOKING & PAYMENT (PARENT/ATHLETE)

### Discovering Sessions
| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to browse available sessions | ✅ | Discover sessions |
| As a parent, I want to filter sessions by skill focus | ✅ | Skill filter |
| As a parent, I want to filter sessions by type (1:1 vs group) | ✅ | Type filter |
| As a parent, I want to see how many spots are left in group sessions | ✅ | Spots display |
| As a parent, I want to search by coach name or location | ✅ | Search bar |

### Receiving Invites
| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to receive session invites from coaches | ✅ | Invites inbox |
| As a parent, I want to see all pending invites | ✅ | Pending tab |
| As a parent, I want to accept an invite and pick a time slot | ✅ | Accept flow |
| As a parent, I want to decline an invite | ✅ | Decline action |
| As a parent, I want to counter-propose different times | ✅ | Counter offer |
| As a parent, I want to see invite history | ✅ | History tab |
| As a parent, I want a badge showing pending invite count | ✅ | Badge in nav |

### Booking Flow
| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to book a session with a few taps | ✅ | Quick book |
| As a parent, I want to select which child is attending | ✅ | Child selector |
| As a parent, I want to book multiple weeks of a recurring session | ✅ | Weeks selector |
| As a parent, I want to add a note for the coach | ✅ | Notes field |
| As a parent, I want to see total cost before confirming | ✅ | Review screen |
| As a parent, I want to join a waitlist if session is full | ✅ | Waitlist join |

### Payments
| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to pay with credit/debit card | ✅ | Payment methods |
| As a parent, I want to save payment methods for quick checkout | ✅ | Saved cards |
| As a parent, I want to use my wallet balance | ✅ | Wallet service |
| As a parent, I want to apply a promo code | ✅ | Promo service |
| As a parent, I want to purchase session packages for discounts | ✅ | Packages |
| As a parent, I want to see my payment history | ✅ | Transaction list |
| As a parent, I want to download invoices | ✅ | Invoice service |

### Managing Bookings
| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to see all my upcoming bookings | ✅ | Bookings list |
| As a parent, I want to cancel a booking | ✅ | Cancel booking |
| As a parent, I want to reschedule a booking | 🔨 | Basic, needs improvement |
| As a parent, I want to know the cancellation policy | ❌ | **🔥 Missing** |
| As a parent, I want to request a refund for cancelled sessions | ❌ | **🔥 Missing** |
| As a parent, I want to be notified when coach cancels | 🔨 | Basic notification |

---

## 5. AVAILABILITY & CALENDAR (COACH)

| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to set my weekly availability template | ✅ | Availability templates |
| As a coach, I want to block off specific dates | ✅ | Availability overrides |
| As a coach, I want to set different availability for different locations | 🔨 | Basic support |
| As a coach, I want to sync with my Google Calendar | ✅ | Calendar sync |
| As a coach, I want to sync with my Apple Calendar | ✅ | Calendar sync |
| As a coach, I want to see my schedule at a glance | ✅ | Schedule view |
| As a coach, I want buffer time between sessions | ❌ | Missing |
| As a coach, I want to set minimum booking notice (e.g., 24 hours) | ❌ | Missing |

---

## 6. POST-SESSION & FEEDBACK

### Coach Actions
| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to mark attendance after a session | ❌ | **🔥 Missing** |
| As a coach, I want to add session notes for each athlete | ✅ | Session notes service |
| As a coach, I want to rate athlete effort/progress | 🔨 | Basic in notes |
| As a coach, I want to set homework/drills for athletes | ✅ | Drill assignments |
| As a coach, I want to award badges for achievements | ✅ | Badge service |
| As a coach, I want to upload session videos | ✅ | Video service |
| As a coach, I want to annotate videos with feedback | ✅ | Annotation service |
| As a coach, I want to update athlete goals based on progress | ✅ | Goal service |

### Parent/Athlete Actions
| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to rate my session with the coach | ✅ | Review service |
| As a parent, I want to leave a written review | ✅ | Review form |
| As a parent, I want to see my child's session notes | ✅ | Notes view |
| As a parent, I want to see drills assigned to my child | ✅ | Drill view |
| As a parent, I want to see badges my child earned | ✅ | Badge display |
| As a parent, I want to watch annotated session videos | ✅ | Video player |
| As a parent, I want to report a problem with a session | ✅ | Report problem |

---

## 7. PROGRESS TRACKING & DEVELOPMENT

### Coach View
| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to see each athlete's skill progression | ✅ | Skill trees |
| As a coach, I want to set goals for athletes | ✅ | Goal service |
| As a coach, I want to track goal progress over time | ✅ | Progress service |
| As a coach, I want to see an athlete's session history | ✅ | History view |
| As a coach, I want to see which skills we've worked on | ✅ | Skill tracking |
| As a coach, I want to compare athlete's progress to benchmarks | 🔨 | Basic analytics |

### Parent/Athlete View
| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to see my child's skill progression | ✅ | Progress view |
| As a parent, I want to see all badges earned | ✅ | Badge collection |
| As a parent, I want to see current goals and progress | ✅ | Goal view |
| As a parent, I want to see session history and notes | ✅ | History view |
| As a parent, I want to see improvement over time | ✅ | Analytics |
| As an athlete, I want to track my own progress | ✅ | My progress |
| As an athlete, I want to complete assigned drills | ✅ | Drill completion |

---

## 8. COMMUNICATION & MESSAGING

### Direct Messaging
| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to message a coach directly | ✅ | Messaging service |
| As a coach, I want to message parents/athletes | ✅ | Messaging service |
| As a user, I want to see unread message count | ✅ | Badge count |
| As a user, I want to share images in chat | ✅ | Attachments |
| As a user, I want to receive push notifications for messages | ✅ | Notifications |
| As a parent, I want to mute notifications from specific coaches | ✅ | Mute feature |

### Notifications
| Story | Status | Notes |
|-------|--------|-------|
| As a user, I want booking confirmation notifications | ✅ | Notification service |
| As a user, I want session reminder notifications | ✅ | Reminders |
| As a user, I want cancellation notifications | 🔨 | Basic |
| As a coach, I want to be notified of new bookings | ✅ | Booking notifications |
| As a coach, I want to be notified of cancellations | 🔨 | Basic |
| As a parent, I want to be notified of new badges | ✅ | Badge notifications |
| As a user, I want to set quiet hours | ✅ | Quiet hours |
| As a user, I want to choose notification channels (push/email/SMS) | ✅ | Channel preferences |

---

## 9. EARNINGS & PAYOUTS (COACH)

| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to see my total earnings | ✅ | Earnings service |
| As a coach, I want to see pending vs available balance | ✅ | Balance display |
| As a coach, I want to see earnings by time period | ✅ | Period filters |
| As a coach, I want to see breakdown by session type | ✅ | Analytics |
| As a coach, I want to withdraw to my bank account | ✅ | Payout methods |
| As a coach, I want to withdraw to PayPal | ✅ | PayPal option |
| As a coach, I want to see withdrawal history | ✅ | History view |
| As a coach, I want to understand platform fees | ✅ | Fee display |
| As a coach, I want to create session packages | ✅ | Package service |
| As a coach, I want to create promo codes | ✅ | Promo service |
| As a coach, I want to see referral earnings | ✅ | Referral stats |

---

## 10. CLUB & SQUAD MANAGEMENT

### Club Admin
| Story | Status | Notes |
|-------|--------|-------|
| As an admin, I want to create a club | ✅ | Club service |
| As an admin, I want to invite coaches to my club | ✅ | Invite members |
| As an admin, I want to create squads/teams | ✅ | Squad service |
| As an admin, I want to assign coaches to squads | ✅ | Squad management |
| As an admin, I want to manage member roles | ✅ | Role management |
| As an admin, I want to set club branding | ✅ | Club settings |
| As an admin, I want to see club-wide analytics | 🔨 | Basic analytics |
| As an admin, I want to manage club subscription/billing | ❌ | Missing |

### Club Coach
| Story | Status | Notes |
|-------|--------|-------|
| As a club coach, I want to see my assigned squads | ✅ | Squad view |
| As a club coach, I want to manage my squad roster | ✅ | Roster service |
| As a club coach, I want to create sessions for my squad | ✅ | Squad sessions |
| As a club coach, I want to bulk invite my squad to sessions | ✅ | Bulk invites |
| As a club coach, I want to track squad members' progress | ✅ | Progress tracking |
| As a club coach, I want to create club events | ✅ | Event service |

### Club Member (Parent/Athlete)
| Story | Status | Notes |
|-------|--------|-------|
| As a member, I want to join a club with a code | ✅ | Join with code |
| As a member, I want to see club announcements | ✅ | Club feed |
| As a member, I want to see squad schedule | ✅ | Squad schedule |
| As a member, I want to RSVP to club events | ✅ | Event RSVP |
| As a member, I want to see other squad members | 🔨 | Basic roster view |
| As a member, I want to access club resources/drills | ✅ | Drill library |

---

## 11. EVENTS & MATCHES

### Events
| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to create club events | ✅ | Event service |
| As a coach, I want to set event type (tournament, social, etc.) | ✅ | Event types |
| As a coach, I want to track RSVPs | ✅ | RSVP tracking |
| As a coach, I want to check in attendees | ✅ | Attendance tracking |
| As a parent, I want to RSVP for my child | ✅ | RSVP flow |
| As a parent, I want to see all upcoming events | ✅ | Event list |

### Matches
| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to create match fixtures | ✅ | Match service |
| As a coach, I want to invite players to matches | ✅ | Match invites |
| As a coach, I want to select the lineup | ✅ | Lineup selection |
| As a coach, I want to record match results | ✅ | Results entry |
| As a parent, I want to mark availability for matches | ✅ | Availability response |
| As a parent, I want to see if my child is selected | ✅ | Selection notification |

---

## 12. VIDEO & CONTENT

| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to upload session videos | ✅ | Video service |
| As a coach, I want to annotate videos with feedback | ✅ | Annotation service |
| As a coach, I want to share videos with specific athletes | ✅ | Video sharing |
| As a coach, I want to create a drill library | ✅ | Drill service |
| As a coach, I want to assign drills to athletes | ✅ | Drill assignment |
| As a parent, I want to view my child's videos | ✅ | Video player |
| As a parent, I want to see annotations on videos | ✅ | Annotation display |
| As an athlete, I want to mark drills as completed | ✅ | Completion tracking |

---

## 13. FAMILY DASHBOARD (PARENT)

| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to manage multiple children | ✅ | Children management |
| As a parent, I want to switch between children easily | ✅ | Child switcher |
| As a parent, I want a unified calendar for all children | ✅ | Family calendar |
| As a parent, I want to see total spending across children | ✅ | Family spending |
| As a parent, I want to see spending breakdown by child | ✅ | Per-child spending |
| As a parent, I want to see all children's progress in one place | ✅ | Family overview |
| As a parent, I want to share access with partner/spouse | ❌ | **Missing** |

---

## 14. SAFETY & TRUST

### Coach Verification
| Story | Status | Notes |
|-------|--------|-------|
| As a coach, I want to verify my email and phone | ✅ | Verification service |
| As a coach, I want to submit ID verification | ✅ | ID verification |
| As a coach, I want to complete background check | ✅ | Background check |
| As a coach, I want to upload my credentials/certifications | ✅ | Credentials |
| As a coach, I want to show my verification badges | ✅ | Badge display |

### Safety Features
| Story | Status | Notes |
|-------|--------|-------|
| As a parent, I want to see coach verification status | ✅ | Verification display |
| As a parent, I want to set emergency contacts | ✅ | Emergency info |
| As a parent, I want to provide medical information | ✅ | Medical info |
| As a parent, I want to manage consent forms | ✅ | Consent service |
| As a parent, I want to track injuries/health issues | ✅ | Injury service |
| As a parent, I want to report safety concerns | 🔨 | Basic reporting |

---

## 15. SOCIAL & COMMUNITY

| Story | Status | Notes |
|-------|--------|-------|
| As a user, I want to follow coaches | ✅ | Follow service |
| As a user, I want to see a social feed | ✅ | Social feed |
| As a coach, I want to post updates | ✅ | Coach posts |
| As a coach, I want to share achievements | ✅ | Post types |
| As a user, I want to join community groups | ✅ | Community service |
| As a user, I want to interact with posts (like, comment) | 🔨 | Basic interactions |

---

## 16. REFERRALS & GROWTH

| Story | Status | Notes |
|-------|--------|-------|
| As a user, I want to refer friends for rewards | ✅ | Referral service |
| As a user, I want to share my referral code | ✅ | Referral code |
| As a user, I want to track my referral rewards | ✅ | Referral stats |
| As a coach, I want to see who I've referred | ✅ | Referral list |

---

## CRITICAL GAPS (🔥 Priority Fixes)

### High Priority
1. **Cancellation Policy Display** - Parents don't know refund rules
2. **Refund Processing** - No automatic refunds when sessions cancelled
3. **Attendance Marking** - No way to mark who showed up
4. **Buffer Time** - Coaches can't set gaps between sessions
5. **Minimum Notice** - No minimum booking notice period
6. **Family Sharing** - Can't share account with spouse

### Medium Priority
1. **Reschedule Flow** - Needs proper notification and rebooking
2. **Coach Cancellation Notifications** - Athletes need proper alerts
3. **Session Completion Flow** - Mark session as done, prompt for feedback
4. **Club Billing** - No subscription management for clubs

### Nice to Have
1. **Live Session Streaming**
2. **Wearable Integration**
3. **AI Drill Recommendations**
4. **Performance Benchmarking**
5. **Automated Session Highlights**

---

## NEXT IMPLEMENTATION PRIORITIES

Based on user flow criticality:

1. **Session Completion Flow**
   - Mark attendance
   - Prompt for session notes
   - Trigger parent feedback request

2. **Cancellation & Refunds**
   - Display cancellation policy
   - Process refunds automatically
   - Handle coach cancellation compensation

3. **Scheduling Improvements**
   - Buffer time between sessions
   - Minimum booking notice
   - Better reschedule flow

4. **Family Features**
   - Account sharing with partner
   - Unified notifications

---

*Last updated: January 2026*
