# Sprint 4: Teams, Admin Panel & Platform Readiness
**Duration:** 2-3 weeks
**Focus:** Team management, group chats, admin tools, polish for launch

**Note:** Still using mock data. This sprint completes the frontend before backend integration.

---

## Objectives

Complete the platform with team management, admin panel, and final polish for launch readiness.

### What We're Building:
1. Team management (coaches create teams, invite players)
2. Group chats (team chats, class chats)
3. School profiles & staff management
4. Admin panel (user management, moderation, analytics)
5. Push notification prep (UI only)
6. Onboarding improvements
7. Final polish & bug fixes

---

## Tasks

### 1. Team Management (Coach Feature)

**Create:** `app/teams/index.tsx` (Coach only)

**Add "Teams" tab to Coach navigation:**
- Position: Between Bookings and Messages

**My Teams screen:**
- [ ] List of teams coach has created
- [ ] Each team card shows:
  - Team logo (icon or image)
  - Team name
  - Age group
  - Player count
  - Upcoming sessions
- [ ] "Create Team" button (floating action button)
- [ ] Tap team to view details

---

#### 1.1 Create Team

**Create:** `app/teams/create.tsx`

**Form:**
- [ ] Team name (required)
- [ ] Age group (dropdown: U10, U12, U14, U16, U18, Adult)
- [ ] Logo upload (optional)
  - Default: Use initials in circle
- [ ] Description (optional, textarea)
- [ ] Create button

**After creation:**
- [ ] Redirect to team detail screen
- [ ] Auto-create team group chat
- [ ] Add coach as admin

---

#### 1.2 Team Detail Screen

**Create:** `app/teams/[teamId]/index.tsx`

**Tabs:**
- Roster
- Schedule
- Chat
- Stats

**Roster Tab:**
- [ ] List of players
- [ ] Each player shows:
  - Avatar
  - Name
  - Position (if assigned)
  - Jersey number (if assigned)
  - Captain badge (if captain)
- [ ] "Invite Player" button
- [ ] Swipe player to:
  - Edit (assign position, jersey number)
  - Set as captain
  - Remove from team

**Schedule Tab:**
- [ ] Upcoming team training sessions
- [ ] Create team session button
  - Date & time picker
  - Location
  - Notes
  - Notify team (send notification to all)

**Chat Tab:**
- [ ] Group chat (see Group Chats section)

**Stats Tab:**
- [ ] Team aggregate stats (mock):
  - Total sessions: 24
  - Average attendance: 85%
  - Most improved player
  - Top scorer (if tracked)

---

#### 1.3 Invite Players

**Create:** `app/teams/[teamId]/invite.tsx`

**Flow:**
- [ ] Search for players
  - By name
  - By username
  - By email (future)
- [ ] List of search results
- [ ] Tap player to select
- [ ] Optional message to include with invite
- [ ] Send invite button

**Player receives:**
- [ ] Notification: "[Coach] invited you to join [Team Name]"
- [ ] Tap to view invite details
- [ ] Accept / Decline buttons

**Accept invite:**
- [ ] Add player to team roster
- [ ] Add player to team group chat
- [ ] Send confirmation to coach

---

### 2. Group Chats

**Team chat auto-created with team:**

**Create:** `app/chat/group/[groupId].tsx`

**Group chat features:**
- [ ] All team members auto-added
- [ ] Coach is admin
- [ ] Show sender name + avatar for each message
- [ ] Admin badge on coach messages
- [ ] Group info button (top right)

**Group info screen:**

**Create:** `app/chat/group/[groupId]/info.tsx`

- [ ] Group name & avatar
- [ ] Member list:
  - Avatar + name + role
  - Admin badge if admin
  - (Admin only) Remove member button
- [ ] (Admin only) Add member button
- [ ] Notifications settings:
  - Mute notifications
  - Custom notification sound
- [ ] Leave group button
- [ ] (Admin only) Delete group button

**Group chat types:**
- [ ] Team chats (auto-created with team)
- [ ] Custom group chats (coach can create for specific purpose)
- [ ] Class chats (for schools - future)

**Admin capabilities:**
- [ ] Add/remove members
- [ ] Pin messages (show at top)
- [ ] Delete any message
- [ ] Mute member (prevent them from sending)
- [ ] Announce message (special formatting, push to all)

---

### 3. School Profiles & Staff (Basic)

**For users with role: School**

**Update:** `app/(tabs)/profile.tsx` (when role = School)

**School profile tabs:**
- About
- Programs
- Staff
- Reviews

**About tab:**
- [ ] School logo
- [ ] Name
- [ ] Description
- [ ] Location
- [ ] Facilities (list)
- [ ] Contact info
- [ ] Website link
- [ ] Follow button (for other users)

**Programs tab:**
- [ ] List of training programs offered
- [ ] Each program shows:
  - Name
  - Age group
  - Price (per session or per month)
  - Schedule (days/times)
  - Capacity / spots available
  - Enroll button

**Create program:**

**Create:** `app/school/program/create.tsx`

- [ ] Program name
- [ ] Description
- [ ] Age group
- [ ] Price & billing (per session, per month, per term)
- [ ] Schedule (days, times)
- [ ] Capacity (max students)
- [ ] Duration (weeks/months)
- [ ] Create button

**Staff tab:**
- [ ] List of coaches employed by school
- [ ] Each coach shows:
  - Avatar
  - Name
  - Role (Coach, Head Coach, Director)
  - View profile button
- [ ] (School admin only) Add staff button

**Add staff:**

**Create:** `app/school/staff/add.tsx`

- [ ] Search for coach
- [ ] Select coach
- [ ] Assign role
- [ ] Send invite

**Reviews tab:**
- [ ] Reviews of the school
- [ ] Same format as coach reviews

---

### 4. Admin Panel

**For users with role: Admin**

Admin sees specialized screens for platform management.

---

#### 4.1 User Management

**Update:** `app/(tabs)/index.tsx` (when role = Admin)
**Rename to:** "Users" tab

**Features:**
- [ ] List all users (paginated)
- [ ] Filters:
  - Role (User, Parent, Coach, School, Admin)
  - Status (Active, Suspended, Deleted)
  - Date joined
  - Location
- [ ] Search by name, email, username
- [ ] Each user card shows:
  - Avatar + name + role badge
  - Join date
  - Total bookings
  - Status
  - Quick actions:
    - View profile
    - Message user
    - Suspend
    - Delete

**User detail view:**

**Create:** `app/admin/user/[userId].tsx`

- [ ] Full user profile
- [ ] Account info:
  - Email
  - Phone
  - Last active
  - Account status
- [ ] Activity summary:
  - Total bookings
  - Total posts
  - Total reviews
  - Reports filed
  - Reports received
- [ ] Actions:
  - Suspend account (temp ban)
  - Delete account (permanent)
  - Send warning message
  - Verify coach (DBS check)
  - Feature user (show in featured section)

---

#### 4.2 Booking Management

**Update:** `app/(tabs)/bookings.tsx` (when role = Admin)

**View all platform bookings:**
- [ ] List all bookings (paginated)
- [ ] Filters:
  - Status (Pending, Confirmed, Completed, Cancelled)
  - Date range
  - Coach
  - User
- [ ] Each booking card shows:
  - Coach + User
  - Date & time
  - Status
  - Amount
  - Quick actions:
    - View details
    - Refund
    - Cancel

**Booking detail:**
- [ ] Full booking info
- [ ] Payment info
- [ ] Session notes (if completed)
- [ ] Reviews (if completed)
- [ ] Action buttons:
  - Process refund
  - Cancel booking
  - Contact coach/user

---

#### 4.3 Content Moderation

**Update:** `app/(tabs)/messages.tsx` (when role = Admin)
**Rename to:** "Reports" tab

**Moderation queue:**
- [ ] List of pending reports
- [ ] Report types:
  - Inappropriate post
  - Inappropriate comment
  - User harassment
  - Fake profile
  - Spam
  - Other
- [ ] Each report card shows:
  - Reporter (who reported)
  - Reported user
  - Reported content (post/comment/profile)
  - Reason
  - Date reported
  - Status (Pending, Reviewed, Resolved, Dismissed)

**Report detail:**

**Create:** `app/admin/report/[reportId].tsx`

- [ ] Reporter info
- [ ] Reported user info
- [ ] Content preview (post, comment, or profile)
- [ ] Report reason & description
- [ ] Actions:
  - Dismiss (mark as not a violation)
  - Remove content (delete post/comment)
  - Warn user (send warning)
  - Suspend user (temp ban)
  - Ban user (permanent)
- [ ] Add admin notes

---

#### 4.4 Platform Analytics

**Update:** `app/(tabs)/profile.tsx` (when role = Admin)
**Rename to:** "Analytics" tab

**Dashboard overview:**
- [ ] Key metrics cards:
  - Total users: 1,245
  - Active users (last 30 days): 892
  - Total bookings: 3,456
  - Total revenue (GMV): £145,230
  - Average booking value: £42

- [ ] Charts:
  - User growth (line chart, last 12 months)
  - Daily active users (bar chart, last 30 days)
  - Bookings over time (line chart, last 12 months)
  - Revenue over time (line chart, last 12 months)
  - Users by role (pie chart)
  - Top coaches by bookings (leaderboard)
  - Top locations (map heatmap)

**Reports:**
- [ ] Export data button (CSV)
  - Users export
  - Bookings export
  - Payments export

---

#### 4.5 Platform Settings

**Create:** `app/admin/settings.tsx`

**Settings categories:**

**Feature Flags:**
- [ ] Enable social feed (toggle)
- [ ] Enable payments (toggle)
- [ ] Enable reviews (toggle)
- [ ] Enable group chats (toggle)
- [ ] Maintenance mode (toggle)

**Platform Fees:**
- [ ] Commission rate: 15% (slider)
- [ ] Payment processing fee: 2.9% + £0.30

**Content Policies:**
- [ ] Profanity filter (toggle)
- [ ] Auto-moderation (toggle)
- [ ] Max post length: 500 chars
- [ ] Max images per post: 10

**Safety:**
- [ ] Require background check for coaches (toggle)
- [ ] Minimum age for users: 13
- [ ] Parent approval required for minors (toggle)

**Notifications:**
- [ ] Email notifications (toggle per type)
- [ ] SMS notifications (toggle per type)
- [ ] Push notifications (toggle per type)

---

### 5. Push Notification Preparation

**Note:** No real push yet, but prepare the UI

**Create:** `app/settings/notifications.tsx`

**Notification preferences:**
- [ ] Enable notifications (master toggle)
- [ ] Notification types:
  - Bookings:
    - New booking request ✓
    - Booking confirmed ✓
    - Booking reminder (1 hour before) ✓
  - Messages:
    - New message ✓
  - Social:
    - New follower
    - Post liked
    - Post commented
  - Development:
    - Achievement unlocked ✓
    - Goal completed ✓
    - Session notes added ✓
- [ ] Notification sound (dropdown)
- [ ] Quiet hours (time range)
  - Don't send between 10pm - 8am

**In-app notification center:**
- [ ] Show all notifications (not just unread)
- [ ] Group by type
- [ ] Mark all as read button
- [ ] Clear all button

---

### 6. Search & Discovery

**Create:** `app/search/index.tsx` (global search)

**Accessible via:** Search icon in header (all screens)

**Search types:**
- [ ] Coaches
- [ ] Users/Players
- [ ] Schools
- [ ] Posts
- [ ] Teams (future)

**Search bar:**
- [ ] Text input with debounce (300ms)
- [ ] Filter chips: All | Coaches | Players | Schools | Posts
- [ ] Sort: Relevance | Distance | Rating | Recent

**Results:**
- [ ] List of results
- [ ] Each result shows appropriate preview
- [ ] Tap to view full profile/post
- [ ] Empty state if no results

---

### 7. Improved Onboarding

**Enhance:** `app/onboarding/` screens

**New steps:**

**Step 1: Welcome**
- [ ] App logo animation
- [ ] Tagline: "Find your perfect coach. Track your progress."
- [ ] Continue button

**Step 2: Role Selection**
- [ ] Cards: Player | Coach | School
- [ ] Tap to select
- [ ] Brief description per role

**Step 3: Account Creation**
- [ ] Email
- [ ] Password
- [ ] Confirm password
- [ ] Create account button
- [ ] Or "Sign in" link

**Step 4: Profile Setup**
- [ ] Upload photo
- [ ] Full name
- [ ] Date of birth
- [ ] Location (city, state)
- [ ] (If player) Primary sport
- [ ] (If coach) Certifications, pricing
- [ ] Continue button

**Step 5: Permissions**
- [ ] Location permission (for finding nearby coaches)
- [ ] Notifications permission
- [ ] Camera permission (for posts/messages)
- [ ] Allow button

**Step 6: Interest Selection**
- [ ] (If player) What do you want to improve?
  - Dribbling
  - Passing
  - Shooting
  - Defending
  - Conditioning
- [ ] Follow some coaches (show 5-10 recommended)

**Step 7: Complete**
- [ ] Success screen
- [ ] "Start exploring" button

---

### 8. Settings Enhancements

**Update:** `app/settings/index.tsx`

**New sections:**

**Account:**
- [ ] Edit profile
- [ ] Change password
- [ ] Email preferences
- [ ] Phone number
- [ ] Linked accounts (Facebook, Google - future)

**Privacy:**
- [ ] Profile visibility (Public, Followers only, Private)
- [ ] Show activity status (toggle)
- [ ] Allow messages from (Everyone, Followers only, No one)
- [ ] Blocked users list

**Notifications:**
- [ ] Link to notification preferences screen

**Support:**
- [ ] Help center (FAQ)
- [ ] Contact support
- [ ] Report a bug
- [ ] Feature request
- [ ] Rate the app

**About:**
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Community Guidelines
- [ ] Licenses
- [ ] App version
- [ ] Check for updates

**Danger Zone:**
- [ ] Logout
- [ ] Deactivate account (temp)
- [ ] Delete account (permanent)

---

### 9. Final Polish

**Throughout the app:**

**Performance:**
- [ ] Optimize image loading (lazy load, blur placeholder)
- [ ] Reduce bundle size (code splitting if needed)
- [ ] Improve app startup time
- [ ] Cache frequently accessed data
- [ ] Preload next screen while animating

**Animations:**
- [ ] Add micro-interactions:
  - Button press animations
  - Card hover effects
  - List item animations (stagger)
- [ ] Page transitions (fade, slide)
- [ ] Loading animations (skeleton loaders)
- [ ] Success animations (checkmarks, confetti)

**Accessibility:**
- [ ] Add accessibility labels to all interactive elements
- [ ] Ensure sufficient color contrast
- [ ] Support screen readers
- [ ] Support dynamic font sizing
- [ ] Test with VoiceOver/TalkBack

**Error handling:**
- [ ] Graceful error messages (friendly tone)
- [ ] Retry mechanisms for failed requests
- [ ] Offline mode support (show cached data)
- [ ] Network error screen

**Testing:**
- [ ] Test all user flows
- [ ] Test on different screen sizes
- [ ] Test on iOS and Android
- [ ] Test dark mode
- [ ] Test with slow network
- [ ] Test with no network

---

### 10. Demo Mode & Showcase

**For demos and investor presentations:**

**Create:** `app/demo.tsx`

**Demo mode features:**
- [ ] Auto-populate realistic demo data
- [ ] Simulate real-time activity:
  - New messages appear
  - Bookings update
  - Notifications arrive
  - Feed updates with new posts
- [ ] Skip authentication
- [ ] Guided tour (overlay with tooltips)
- [ ] Reset demo data button

**Enable demo mode:**
- [ ] Secret tap gesture (tap logo 5 times)
- [ ] Or URL parameter: `?demo=true`

---

## Mock Data Updates

**Massive mock data expansion:**

**Update:** `constants/mock-data.ts`

**Add:**
- [ ] 50-100 users (mix of roles)
- [ ] 30-50 coaches with full profiles
- [ ] 10-15 schools
- [ ] 100-200 posts
- [ ] 500+ comments
- [ ] Follow relationships (realistic network)
- [ ] 50+ bookings (various statuses)
- [ ] Team data (10-15 teams)
- [ ] Group chats (20+ conversations)
- [ ] Reports (10-20 for admin)
- [ ] Achievements (30+ badges)
- [ ] Notifications (50+ samples)

**Data generation script:**

**Create:** `scripts/generate-mock-data.ts`
- [ ] Faker.js to generate realistic data
- [ ] Export to JSON
- [ ] Import in app

---

## New Screens Summary

**Team Management:**
- `app/teams/index.tsx` - My teams list
- `app/teams/create.tsx` - Create team
- `app/teams/[teamId]/index.tsx` - Team detail
- `app/teams/[teamId]/invite.tsx` - Invite players
- `app/teams/[teamId]/edit.tsx` - Edit team

**Group Chats:**
- `app/chat/group/[groupId].tsx` - Group chat screen
- `app/chat/group/[groupId]/info.tsx` - Group info
- `app/chat/group/create.tsx` - Create custom group

**Schools:**
- `app/school/program/create.tsx` - Create program
- `app/school/staff/add.tsx` - Add staff

**Admin:**
- `app/admin/user/[userId].tsx` - User detail
- `app/admin/report/[reportId].tsx` - Report detail
- `app/admin/settings.tsx` - Platform settings

**Other:**
- `app/search/index.tsx` - Global search
- `app/demo.tsx` - Demo mode
- `app/settings/notifications.tsx` - Notification settings

---

## New Components

- [ ] `components/team/team-card.tsx`
- [ ] `components/team/roster-list-item.tsx`
- [ ] `components/team/team-stats-card.tsx`
- [ ] `components/chat/group-message-bubble.tsx`
- [ ] `components/chat/group-member-list-item.tsx`
- [ ] `components/school/program-card.tsx`
- [ ] `components/school/staff-list-item.tsx`
- [ ] `components/admin/user-card.tsx`
- [ ] `components/admin/report-card.tsx`
- [ ] `components/admin/metric-card.tsx`
- [ ] `components/admin/platform-chart.tsx`
- [ ] `components/search/search-result-item.tsx`

---

## Navigation Updates

**Final tab structure:**

**User/Parent:**
1. Discover
2. Feed
3. Bookings
4. Development
5. Messages
6. Profile

**Coach:**
1. Calendar
2. Feed
3. Teams (NEW)
4. Bookings
5. Messages
6. Profile

**School:**
1. Dashboard
2. Programs
3. Staff
4. Bookings
5. Messages
6. Profile

**Admin:**
1. Users
2. Bookings
3. Reports
4. Analytics
5. Settings

---

## Success Criteria

✅ Sprint 4 is complete when:
1. Coaches can create teams and invite players
2. Players can accept team invites
3. Team group chats work with admin controls
4. School profiles show programs and staff
5. Admin can view all users and bookings
6. Admin can moderate reported content
7. Admin dashboard shows platform analytics
8. Push notification preferences UI is ready
9. Global search works across all content
10. Onboarding flow is polished
11. App is fully functional with mock data
12. Demo mode works for presentations
13. All screens are tested and bug-free

---

## Testing Checklist

**Team Management:**
- [ ] Create team as Coach
- [ ] Invite player to team
- [ ] Accept team invite as Player
- [ ] View team roster
- [ ] Send message in team chat
- [ ] Remove player from team

**Group Chats:**
- [ ] Send message in group chat
- [ ] View group info
- [ ] Add member to group (admin)
- [ ] Remove member from group (admin)
- [ ] Leave group chat
- [ ] Pin message (admin)

**School Features:**
- [ ] View school profile
- [ ] Create program
- [ ] Add coach to staff
- [ ] Follow school

**Admin Panel:**
- [ ] View all users
- [ ] Search and filter users
- [ ] Suspend user account
- [ ] View all bookings
- [ ] Review reported content
- [ ] Dismiss / take action on report
- [ ] View platform analytics
- [ ] Update platform settings

**Other:**
- [ ] Global search (coaches, players, posts)
- [ ] Complete onboarding flow
- [ ] Update notification preferences
- [ ] Enable demo mode
- [ ] Test all roles (User, Coach, School, Admin)

---

## Launch Preparation

**Before launch:**
- [ ] All features tested thoroughly
- [ ] No critical bugs
- [ ] Performance is acceptable (app loads < 3s)
- [ ] Works on iOS and Android
- [ ] Dark mode works everywhere
- [ ] Accessibility audit passed
- [ ] Content policies defined
- [ ] Terms of Service written
- [ ] Privacy Policy written
- [ ] App store assets prepared (screenshots, description)
- [ ] Demo video created
- [ ] Marketing website ready
- [ ] Support email configured

**Backend integration next:**
After Sprint 4, you can proceed with database and backend integration while keeping the frontend intact. All API calls can be added by replacing the mock services with real API services.

---

## Notes

- This completes the full frontend MVP
- All features work with mock data
- Ready for demo, investor presentations
- Backend integration is next phase (separate from sprints)
- Focus on polish and user experience
- Make sure demo mode is impressive!

---

**End of Sprint Planning**

After completing Sprints 1-4, you will have a fully functional, polished app with:
- Complete booking system
- Social networking features
- Development tracking with analytics
- Team management
- Admin tools
- Professional UI/UX

**Ready for backend integration and launch!** 🚀
