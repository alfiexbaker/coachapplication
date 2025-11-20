# Sprint Plan Overview

**Project:** Clubroom - Football Coaching Social Platform
**Status:** Frontend MVP Development
**Last Updated:** November 2025

---

## Current Status

**Completed:**
- ✅ Sprint 1 Foundation (UI primitives, basic tabs, mock data)
- ✅ Role-based navigation (Admin/Coach/User segmentation)
- ✅ Authentication system with 4 roles
- ✅ Basic discovery, bookings, messages, profile screens

**Rating:** 7.5/10 - Strong foundation, needs feature completion

---

## Sprint Structure

All sprints focus on **frontend-only development** using **mock data**. Database and backend integration will happen separately after Sprint 4 completion.

### Sprint 1: Core UX & UI Polish (1-2 weeks)
**Focus:** Polish existing UI, enhance navigation, add missing screens

**Key Deliverables:**
- Enhanced coach discovery with filters
- Improved booking management
- Better messaging with attachments
- Profile screens for all roles
- Settings & preferences
- Onboarding flow
- Loading states & animations
- Error handling

**File:** `SPRINT_1_UX_POLISH.md`

---

### Sprint 2: Booking Flow & Real-time Features (2-3 weeks)
**Focus:** Complete booking journey, session notes, reviews, mock payments

**Key Deliverables:**
- Multi-step booking wizard (Select → Schedule → Details → Review → Confirm)
- Real-time messaging simulation
- Session notes & feedback (Coach → Player)
- Reviews & ratings system
- Mock payment UI (Stripe-style, no real processing)
- Calendar integration (export to device)
- In-app notifications
- Coach earnings dashboard (mock)
- Booking cancellation flow

**File:** `SPRINT_2_BOOKING_REALTIME.md`

---

### Sprint 3: Social Features & Development Hub (3-4 weeks)
**Focus:** Social networking, player development tracking, analytics

**Key Deliverables:**
- Social feed (posts, likes, comments, share)
- Follow/unfollow system
- Enhanced profiles with activity
- **Development Hub** (core differentiator):
  - Skills radar chart
  - Session history timeline
  - Analytics graphs (sessions, hours, improvements)
  - Progress tracking
- Achievements & badges system
- XP and leveling
- Goals & objectives
- Activity feed

**File:** `SPRINT_3_SOCIAL_DEVELOPMENT.md`

---

### Sprint 4: Teams, Admin Panel & Platform Readiness (2-3 weeks)
**Focus:** Team management, admin tools, final polish

**Key Deliverables:**
- Team management (create teams, invite players, roster management)
- Group chats (team chats with admin controls)
- School profiles (programs, staff)
- **Admin Panel:**
  - User management
  - Booking oversight
  - Content moderation queue
  - Platform analytics dashboard
  - Platform settings
- Push notification preferences (UI prep)
- Global search
- Enhanced onboarding
- Demo mode (for presentations)
- Final polish & testing

**File:** `SPRINT_4_TEAMS_ADMIN.md`

---

## User Roles & Access

### User / Parent
**Can access:**
- Discover coaches
- Book sessions
- View development hub (skills, analytics, goals)
- Social feed (post, like, comment, follow)
- Messages (1-on-1 with coaches)
- Profile & settings

**Tabs:** Discover | Feed | Bookings | Development | Messages | Profile

---

### Coach
**Can access:**
- Manage availability calendar
- Accept/decline bookings
- Add session notes
- View earnings dashboard
- Create and manage teams
- Social feed (post, like, comment, follow)
- Group chats (team chats)
- Messages (1-on-1 with clients)
- Profile & settings

**Tabs:** Calendar | Feed | Teams | Bookings | Messages | Profile

---

### School
**Can access:**
- Create training programs
- Manage staff (add coaches)
- Accept bookings
- Social feed
- Messages
- Profile & settings

**Tabs:** Dashboard | Programs | Staff | Bookings | Messages | Profile

---

### Admin
**Can access:**
- User management (view all, suspend, delete)
- Booking management (view all, refund)
- Content moderation (review reports, take action)
- Platform analytics (users, bookings, revenue)
- Platform settings (feature flags, policies)

**Tabs:** Users | Bookings | Reports | Analytics | Settings

---

## Technical Approach

### Mock Data Strategy
All data is hardcoded in `constants/mock-data.ts` and stored in AsyncStorage for persistence during the session.

**Why mock data?**
- Rapid frontend development
- Demo-ready at all times
- Backend-agnostic design
- Easy to swap with real API later

### Real-time Simulation
Use `setTimeout` and AsyncStorage to simulate:
- Message sending/receiving
- Booking status updates
- Notification delivery
- Achievement unlocking

### Future Backend Integration
After Sprint 4, create API services that replace mock services:
- `services/api/auth-service.ts`
- `services/api/booking-service.ts`
- `services/api/messaging-service.ts`
- etc.

Swap mock implementations with real HTTP calls without changing UI code.

---

## Key Differentiators

What makes Clubroom unique:

1. **Development Hub** - Comprehensive skills tracking with visual analytics
2. **Social Networking** - Not just transactional, build a community
3. **Gamification** - Achievements, XP, leveling system
4. **Team Management** - Built-in team creation and group coordination
5. **Session Notes** - Detailed feedback from coaches to players
6. **Progress Visualization** - Radar charts, line graphs, heatmaps

---

## Navigation Changes

**FIXED:** Admin mode navigation is now properly segmented.

**Before:** Admin saw User/Parent tabs with hidden icons
**After:** Admin sees completely different tabs:
- Users (user management)
- Bookings (platform oversight)
- Reports (content moderation)
- Analytics (platform metrics)
- Settings (platform config)

**Implementation:** `clubroom/app/(tabs)/_layout.tsx` - now uses conditional rendering per role instead of just hiding tabs.

---

## Dependencies

### Already Installed:
- expo
- expo-router
- react-native
- react

### To Install:
**Sprint 2:**
- expo-calendar
- expo-image-picker
- expo-document-picker

**Sprint 3:**
- victory-native
- react-native-svg
- react-native-reanimated
- react-native-gesture-handler

**Sprint 4:**
- (No new major deps)

---

## File Structure

```
clubroom/
├── app/
│   ├── (tabs)/          # Main tab navigation
│   │   ├── index.tsx    # Discover / Users (admin)
│   │   ├── availability.tsx  # Coach calendar
│   │   ├── bookings.tsx # Bookings
│   │   ├── messages.tsx # Messages / Reports (admin)
│   │   ├── profile.tsx  # Profile / Settings (admin)
│   │   └── _layout.tsx  # Tab layout (UPDATED)
│   ├── book/            # Booking wizard
│   ├── chat/            # Chat screens
│   ├── teams/           # Team management
│   ├── development/     # Development hub
│   ├── feed/            # Social feed
│   ├── admin/           # Admin screens
│   └── ...
├── components/          # Reusable components
├── constants/           # Theme, types, mock data
├── hooks/               # Custom hooks (use-auth)
├── services/            # Business logic & API
└── docs/
    └── sprints/         # This folder
```

---

## Testing Strategy

**Per Sprint:**
1. Manual testing of all new features
2. Test each user role separately
3. Test on iOS and Android
4. Test dark mode
5. Test with slow network (mock delays)
6. Test empty states
7. Test error states

**End-to-End Tests:**
After Sprint 4, test complete user journeys:
- User books a session → Coach accepts → Session completed → Notes added → Review submitted
- Coach creates team → Invites player → Player accepts → Team chat works
- User posts content → Gets reported → Admin reviews → Takes action

---

## Demo Mode

**Purpose:** Impress investors and users during demos

**Features:**
- Auto-populate rich demo data
- Simulate real-time activity (messages arriving, bookings updating)
- Guided tour with tooltips
- Reset demo data anytime
- No authentication required

**Activation:** Tap app logo 5 times or use `?demo=true` URL param

---

## Launch Checklist

After completing all 4 sprints:

**Technical:**
- [ ] All features implemented
- [ ] All bugs fixed (critical)
- [ ] Performance optimized (load time < 3s)
- [ ] Works on iOS & Android
- [ ] Dark mode works
- [ ] Accessibility audit passed

**Legal & Policy:**
- [ ] Terms of Service written
- [ ] Privacy Policy written
- [ ] Community Guidelines defined
- [ ] COPPA compliance (child safety)
- [ ] GDPR compliance (data privacy)

**Assets:**
- [ ] App store screenshots
- [ ] App description
- [ ] Demo video
- [ ] Marketing website
- [ ] Social media presence

**Support:**
- [ ] Support email configured
- [ ] FAQ / Help center
- [ ] Customer support plan

---

## Next Steps

1. ✅ **Review this sprint plan**
2. **Start Sprint 1** - Focus on UI polish and navigation
3. **Complete Sprints 2-4** sequentially
4. **Backend Integration** (separate phase):
   - Set up database (PostgreSQL + Prisma)
   - Build REST API or GraphQL
   - Integrate Stripe payments
   - Set up WebSockets for real-time
   - Deploy backend (Railway, Fly.io, AWS)
5. **Beta Testing**
6. **Launch!** 🚀

---

## Questions or Issues?

If you need clarification on any sprint tasks, refer to the individual sprint markdown files. Each file contains:
- Detailed task breakdown
- Code examples
- Component specifications
- Testing checklists
- Success criteria

---

**Good luck with development! 🎉**
