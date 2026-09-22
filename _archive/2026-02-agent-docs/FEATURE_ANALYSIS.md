# CoachApp - Feature Expansion Roadmap

## Current App Structure

### USER (Athlete) Pages
| Tab/Screen | Purpose |
|------------|---------|
| Home | Dashboard, quick actions |
| Feed | Social posts, community |
| Bookings | Upcoming/past sessions |
| Messages | Chat with coaches |
| Settings | Profile, preferences |
| `/badges` | Achievement showcase |
| `/development/my-progress` | Progress dashboard |
| `/book/[coachId]/*` | 5-step booking flow |
| `/videos/*` | Video library |
| `/club/[id]` | Club details |

### COACH Pages
| Tab/Screen | Purpose |
|------------|---------|
| Home | Development overview |
| Schedule | Calendar, availability |
| Athletes | Roster management |
| Feed | Social posts |
| Settings | Profile, preferences |
| `/earnings` | Financial dashboard |
| `/session-invites/*` | Invite management |
| `/group-sessions/*` | Group sessions |
| `/session-notes/[bookingId]` | Session notes |
| `/development/athlete/[athleteId]` | Athlete progress |
| `/analytics/[athleteId]` | Athlete analytics |
| `/verification/*` | Verification flow |
| `/academy/*` | Academy management |
| `/events/*` | Event management |
| `/matches/*` | Match tracking |

### PARENT Pages
| Tab/Screen | Purpose |
|------------|---------|
| Home | Overview dashboard |
| More | Discover coaches |
| Children | Children hub |
| Feed | Community |
| Settings | Preferences |
| `/development/child-progress/[childId]` | Child progress |
| `/children/badges/[childId]` | Child badges |
| `/child/[id]/emergency` | Emergency contacts |
| `/child/[id]/medical` | Medical info |
| `/book/[coachId]/*` | Booking flow |

---

## NEW FEATURES TO BUILD

### 1. Advanced Coach Discovery
**What:** Filter coaches by price, rating, distance, sport, gender, language
**Why:** Users can't find the right coach efficiently
**Links to:** Booking flow, Coach profiles
**New screens:** `/discover/filters`, `/discover/map`

### 2. Session Packages & Bundles
**What:** Buy 5/10 sessions at discounted rate
**Why:** Revenue boost, customer retention
**Links to:** Wallet, Bookings, Coach earnings
**New screens:** `/packages`, `/packages/[id]`, Coach: `/packages/manage`

### 3. Recurring Bookings
**What:** Subscribe to weekly/monthly slots automatically
**Why:** Parents manually re-book same time every week
**Links to:** Bookings, Calendar, Payments
**New screens:** `/bookings/recurring`, `/bookings/subscribe`

### 4. Homework & Drills System
**What:** Coaches assign drills between sessions, athletes mark complete
**Why:** No structured practice between sessions
**Links to:** Session notes, Progress tracking, Videos
**New screens:** `/drills`, `/drills/[id]`, Coach: `/drills/library`, `/drills/assign`

### 5. Goals & Milestones
**What:** Set specific goals, track milestones, celebrate achievements
**Why:** Coaching feels aimless without clear targets
**Links to:** Progress, Badges, Session planning
**New screens:** `/goals`, `/goals/[id]`, `/goals/create`

### 6. Calendar Sync
**What:** Export sessions to Google/Apple Calendar
**Why:** Sessions exist in isolation from user's real calendar
**Links to:** Bookings, Schedule
**New screens:** `/settings/calendar-sync`

### 7. Coach Comparison
**What:** Compare 2-3 coaches side-by-side (price, rating, specialties)
**Why:** Hard to choose between coaches
**Links to:** Discovery, Booking
**New screens:** `/compare`, `/compare/[ids]`

### 8. Family Dashboard (Parent)
**What:** See all children's sessions, spending, progress in one view
**Why:** Parents manage multiple children separately
**Links to:** Children hub, Bookings, Wallet
**New screens:** `/family`, `/family/calendar`, `/family/spending`

### 9. Skill Progression Trees
**What:** Visual skill trees showing progression paths
**Why:** Progress data exists but isn't visualized meaningfully
**Links to:** Badges, Progress, Goals
**New screens:** `/skills`, `/skills/[category]`

### 10. Waitlist System
**What:** Join waitlist for full sessions, get notified when spot opens
**Why:** Popular sessions fill up, no way to queue
**Links to:** Bookings, Notifications, Group sessions
**New screens:** `/waitlist`, Coach: `/waitlist/manage`

### 11. Session Recording & Annotation
**What:** Upload session videos with timestamp annotations and coach comments
**Why:** Video upload exists but no annotation tools
**Links to:** Videos, Session notes, Progress
**New screens:** `/videos/annotate/[id]`, `/videos/review/[id]`

### 12. Referral System
**What:** Generate referral codes, earn wallet credits when friends join
**Why:** No organic growth mechanism
**Links to:** Wallet, Onboarding
**New screens:** `/referrals`, `/referrals/invite`

### 13. Invoice & Receipt Generation
**What:** Generate PDF invoices/receipts for sessions
**Why:** Parents need receipts for expense tracking
**Links to:** Bookings, Payments, Earnings
**New screens:** `/invoices`, `/invoices/[id]`

### 14. Emergency Info Quick Access (Coach)
**What:** Quick-access card for athlete emergency/medical info during sessions
**Why:** Emergency data exists but buried in parent-side screens
**Links to:** Roster, Active session view
**New screens:** `/roster/[athleteId]/emergency`

### 15. Notification Preferences
**What:** Configure quiet hours, channel preferences, opt-out by type
**Why:** Type exists in database, no UI to configure
**Links to:** Settings, Notifications
**New screens:** `/settings/notifications/preferences`

### 16. Squad Bulk Invites
**What:** Invite entire squad to training session with one action
**Why:** Coaches manually send individual invites
**Links to:** Session invites, Club management, Roster
**New screens:** `/session-invites/squad`, `/squads/[id]/invite`

### 17. Event RSVP & Attendance
**What:** RSVP to club events, check-in at event, view attendee list
**Why:** Events created but no attendance tracking
**Links to:** Events, Club hub, Notifications
**New screens:** `/events/[id]/rsvp`, `/events/[id]/attendees`

### 18. Promo Codes & Credits
**What:** Create/apply promo codes, manage wallet credits
**Why:** Wallet supports credits but no way to generate codes
**Links to:** Wallet, Bookings, Admin
**New screens:** `/wallet/promo`, Admin: `/promo-codes`

### 19. Coach Analytics Dashboard
**What:** Peak hours heatmap, revenue trends, retention metrics, cancellation patterns
**Why:** Analytics type defined but minimal display
**Links to:** Earnings, Bookings, Schedule
**New screens:** `/analytics/dashboard`, `/analytics/revenue`, `/analytics/retention`

### 20. Consent Management (Coach View)
**What:** Dashboard showing which athletes have video/photo consent
**Why:** Consent collected but coaches can't see who's consented
**Links to:** Roster, Social feed, Videos
**New screens:** `/roster/consents`

### 21. Counter-Offer Completion
**What:** Full negotiation flow for booking time changes
**Why:** Counter-proposal exists but UI incomplete on both sides
**Links to:** Bookings, Session invites, Notifications
**New screens:** `/bookings/[id]/counter`, `/bookings/[id]/negotiate`

### 22. Verification Badges Display
**What:** Trust badges on coach profiles, "verified" filter in search
**Why:** Verification tracked but not visible to users
**Links to:** Coach profiles, Discovery, Search
**Enhancement to:** Coach profile, Search results

### 23. Parent Community
**What:** Parent-to-parent messaging, group chats, carpool coordination
**Why:** All messaging is parent-coach only
**Links to:** Messages, Club hub
**New screens:** `/community`, `/community/[groupId]`, `/carpool`

### 24. Injury & Recovery Tracking
**What:** Log injuries, track recovery, share with coach
**Why:** Important context missing from training
**Links to:** Profile, Session booking, Coach roster view
**New screens:** `/health`, `/health/injuries`, `/health/log`

### 25. Favourites & Saved Coaches
**What:** Save favourite coaches, quick re-book
**Why:** No way to bookmark preferred coaches
**Links to:** Discovery, Booking
**New screens:** `/favourites`

---

## INTERNAL LINKING OPPORTUNITIES

### Data That Exists But Isn't Connected

| Data Source | Should Link To | Current State |
|-------------|----------------|---------------|
| Athlete goals | Session planning | Coach can't see athlete goals when planning |
| Emergency info | Active session view | Coach has no quick access during session |
| Skill improvements | Badge awards | Tracked separately, should auto-suggest badges |
| Consent status | Video upload | Coach posts without checking consent |
| Coach certifications | Search filters | Can't filter by verified credentials |
| Session history | Progress trends | No visual trend from past sessions |
| Wallet balance | Booking flow | Not shown during checkout |
| Squad membership | Session invites | Can't bulk invite by squad |
| Follow preferences | Notification settings | Can't mute specific coaches |
| Payment reminders | Wallet/Bookings | Reminders defined but never sent |

### Missing Cross-Role Connections

| From | To | What's Missing |
|------|-----|----------------|
| Coach roster | Athlete goals | Coach can't see what athlete wants to achieve |
| Parent children | Cross-coach progress | Can't see progress across multiple coaches |
| Session notes | Homework | Notes don't generate take-home drills |
| Badge awards | Social feed | Badges don't auto-post achievements |
| Reviews | Coach analytics | Reviews not aggregated into insights |
| Cancellations | Coach schedule | No pattern detection for no-shows |

---

## NEW PAGES SUMMARY

### For USER (Athlete)
```
/discover/filters      - Advanced search filters
/discover/map          - Map-based coach discovery
/packages              - Browse session packages
/packages/[id]         - Package details
/bookings/recurring    - Manage recurring bookings
/bookings/subscribe    - Subscribe to time slot
/drills                - View assigned drills
/drills/[id]           - Drill details
/goals                 - Goal dashboard
/goals/[id]            - Goal details
/goals/create          - Create new goal
/skills                - Skill progression trees
/skills/[category]     - Category skill tree
/waitlist              - My waitlists
/videos/review/[id]    - Review annotated video
/referrals             - Referral dashboard
/referrals/invite      - Send invites
/invoices              - My invoices
/invoices/[id]         - Invoice detail
/favourites            - Saved coaches
/health                - Health dashboard
/health/injuries       - Injury log
/health/log            - Log new injury
/compare               - Compare coaches
/compare/[ids]         - Side-by-side comparison
```

### For COACH
```
/packages/manage       - Create/manage packages
/drills/library        - Drill library
/drills/assign         - Assign drills to athlete
/waitlist/manage       - Manage waitlists
/videos/annotate/[id]  - Annotate session video
/roster/[id]/emergency - Quick emergency info
/roster/consents       - Consent dashboard
/session-invites/squad - Bulk squad invite
/squads/[id]/invite    - Invite squad
/analytics/dashboard   - Full analytics
/analytics/revenue     - Revenue trends
/analytics/retention   - Retention metrics
/bookings/[id]/counter - Handle counter-offers
```

### For PARENT
```
/family                - Family dashboard
/family/calendar       - Family calendar
/family/spending       - Spending overview
/community             - Parent community
/community/[groupId]   - Group chat
/carpool               - Carpool coordination
/compare               - Compare coaches
/packages              - Buy packages for kids
/invoices              - Family invoices
```

### Settings (All Roles)
```
/settings/calendar-sync         - Calendar integration
/settings/notifications/preferences - Notification config
```

### Admin
```
/promo-codes           - Manage promo codes
/promo-codes/create    - Create new code
```

---

## FEATURE CATEGORIES

### Discovery & Booking
- Advanced coach filters
- Map view
- Coach comparison
- Favourites
- Packages
- Recurring bookings
- Waitlist
- Counter-offers

### Training & Progress
- Goals & milestones
- Homework/drills
- Skill trees
- Session recording
- Video annotation
- Injury tracking

### Communication
- Parent community
- Squad invites
- Carpool coordination
- Notification preferences

### Financial
- Session packages
- Referral credits
- Promo codes
- Invoices
- Family spending

### Safety & Trust
- Emergency quick access
- Consent dashboard
- Verification badges

### Analytics
- Coach dashboard
- Revenue trends
- Retention metrics

---

## DEVELOPMENT STANDARDS

### For Every Feature

Each feature MUST include:

#### 1. Unit Tests
- Component tests with React Native Testing Library
- Service/hook tests with Jest
- Mock Supabase calls
- Test user interactions and edge cases
- Minimum 80% coverage per feature

#### 2. Documentation
- JSDoc comments on all exports
- README in feature folder explaining usage
- Type definitions fully documented
- API/service methods documented

#### 3. Quality Requirements
- TypeScript strict mode compliance
- No `any` types
- Proper error handling with user-friendly messages
- Loading states for all async operations
- Empty states for lists
- Accessibility labels on interactive elements

#### 4. Customer/Coach Centric UX
- Clear call-to-action buttons
- Intuitive navigation flow
- Confirmation dialogs for destructive actions
- Success/error feedback (toasts)
- Pull-to-refresh where applicable
- Skeleton loaders during data fetch

### File Structure Per Feature

```
src/
├── components/{feature}/
│   ├── __tests__/
│   │   └── {Component}.test.tsx
│   ├── {Component}.tsx
│   └── index.ts
├── screens/{feature}/
│   ├── __tests__/
│   │   └── {Screen}.test.tsx
│   └── {Screen}.tsx
├── services/{feature}/
│   ├── __tests__/
│   │   └── {service}.test.ts
│   └── {service}.ts
├── hooks/{feature}/
│   ├── __tests__/
│   │   └── use{Feature}.test.ts
│   └── use{Feature}.ts
└── types/{feature}.ts
```

### Test Examples

```typescript
// Component test
describe('PackageCard', () => {
  it('renders package details correctly', () => {})
  it('shows discount percentage', () => {})
  it('calls onPurchase when button pressed', () => {})
  it('disables button when out of stock', () => {})
})

// Service test
describe('packageService', () => {
  it('fetches available packages', async () => {})
  it('handles purchase transaction', async () => {})
  it('returns error on insufficient balance', async () => {})
})
```

---

## IMPLEMENTATION TRACKER

| # | Feature | Status | Tests | Docs |
|---|---------|--------|-------|------|
| 1 | Advanced Coach Discovery | DONE | 30 | JSDoc |
| 2 | Session Packages | DONE | 32 | JSDoc |
| 3 | Recurring Bookings | DONE | 40+ | JSDoc |
| 4 | Homework & Drills | DONE | 64 | JSDoc |
| 5 | Goals & Milestones | DONE | 30+ | JSDoc |
| 6 | Calendar Sync | DONE | 25+ | JSDoc |
| 7 | Coach Comparison | DONE | 48 | JSDoc |
| 8 | Family Dashboard | DONE | 30+ | JSDoc |
| 9 | Skill Trees | DONE | 35+ | JSDoc |
| 10 | Waitlist System | DONE | 35 | JSDoc |
| 11 | Session Recording | DONE | 79 | JSDoc |
| 12 | Referral System | DONE | 22 | JSDoc |
| 13 | Invoice Generation | DONE | 80 | JSDoc |
| 14 | Emergency Quick Access | DONE | 30+ | JSDoc |
| 15 | Notification Preferences | DONE | 72 | JSDoc |
| 16 | Squad Bulk Invites | DONE | 31 | JSDoc |
| 17 | Event RSVP | DONE | 36 | JSDoc |
| 18 | Promo Codes | DONE | 47 | JSDoc |
| 19 | Coach Analytics | DONE | 49 | JSDoc |
| 20 | Consent Dashboard | DONE | 62 | JSDoc |
| 21 | Counter-Offers | DONE | 17 | JSDoc |
| 22 | Verification Badges | DONE | (integrated) | JSDoc |
| 23 | Parent Community | DONE | 25+ | JSDoc |
| 24 | Injury Tracking | DONE | 79 | JSDoc |
| 25 | Favourites | DONE | 61 | JSDoc |

**Total: ~1000+ unit tests across all features**

---

*Completed: January 2026*
