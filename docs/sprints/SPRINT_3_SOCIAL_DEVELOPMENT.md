# Sprint 3: Social Features & Development Hub
**Duration:** 3-4 weeks
**Focus:** Social networking, player development tracking, skills analytics, achievements

**Note:** Still using mock data. Database integration deferred per your request.

---

## Objectives

Transform the app from a booking platform into a social network with comprehensive player development tracking.

### What We're Building:
1. Social feed (posts, likes, comments)
2. Follow system
3. Development hub (skills tracking & analytics)
4. Achievements & badges
5. Goals & objectives
6. Enhanced profiles
7. Activity feed

---

## Tasks

### 1. Social Feed

**Create:** `app/(tabs)/feed.tsx` (add as new tab for all roles)

**Tab bar position:** Between Discover/Calendar and Bookings

**Feed types:**
- [ ] "For You" - Personalized feed (followed users + coaches)
- [ ] "Coaches" - Only coach posts
- [ ] "Players" - Only player posts

**Post types:**
- [ ] Text post (up to 500 chars)
- [ ] Image post (1-10 images)
- [ ] Video post (up to 60s)
- [ ] Achievement post (auto-generated when badge unlocked)
- [ ] Session highlight (share session notes)

**Feed features:**
- [ ] Infinite scroll
- [ ] Pull to refresh
- [ ] Like button with animation
- [ ] Comment button (opens comment sheet)
- [ ] Share button (share to messages, native share)
- [ ] More menu (Report, Hide post, Block user)
- [ ] Follow button on each post (if not following)

**Post card components:**
```
PostCard:
- Header:
  - Avatar (tap to view profile)
  - Name + Role badge (Coach/Player/Parent)
  - Timestamp ("2h ago")
  - More menu (...)
- Content:
  - Text
  - Images (swipeable gallery if multiple)
  - Video player (if video)
  - Achievement badge (if achievement post)
- Footer:
  - Like button (❤️ + count)
  - Comment button (💬 + count)
  - Share button (↗️)
- Comments preview (first 2 comments)
  - "View all X comments"
```

---

### 2. Create Post

**Create:** `app/feed/create-post.tsx`

**Modal screen (slide up from bottom):**
- [ ] Multi-line text input (500 char max)
- [ ] Character counter
- [ ] Media picker buttons:
  - 📷 Camera
  - 🖼️ Gallery (select up to 10)
  - 📹 Video
- [ ] Selected media preview (grid)
- [ ] Remove media (X button)
- [ ] Privacy selector (Public, Followers only, Private)
- [ ] "Post" button (disabled if empty)

**Post types:**
- [ ] Regular post
- [ ] Achievement share (when badge unlocked)
- [ ] Session highlight (share session notes with coach permission)

**Mock posting flow:**
- [ ] Optimistic update (post appears immediately)
- [ ] Simulate upload progress for media
- [ ] Add to feed once "posted"

---

### 3. Comments System

**Create:** `app/feed/post/[postId].tsx`

**Full post view with comments:**
- [ ] Show post at top
- [ ] List all comments below
- [ ] Comment input at bottom (fixed position)
- [ ] Send button

**Comment features:**
- [ ] Text comments (300 char max)
- [ ] Like comments (❤️)
- [ ] Reply to comment (nested 1 level)
- [ ] Delete own comments
- [ ] Report comment
- [ ] Timestamp

**Comment card:**
```
Comment:
- Avatar
- Name + Role badge
- Comment text
- Like button + count
- Reply button
- Timestamp
- (If has replies) "View X replies"
```

---

### 4. Follow System

**Add follow/unfollow functionality:**

**Follow button locations:**
- [ ] On user profiles
- [ ] On post cards (if not following)
- [ ] On coach cards (Discover page)
- [ ] In search results

**Follow button states:**
- Not following: "Follow" (blue button)
- Following: "Following" (gray button)
- Pending (future): "Requested" (if private account)

**Followers/Following screens:**

**Create:** `app/profile/[userId]/followers.tsx`
**Create:** `app/profile/[userId]/following.tsx`

- [ ] List of users
- [ ] Show avatar, name, role, bio snippet
- [ ] Follow/Following button on each
- [ ] Search/filter users
- [ ] Pull to refresh

**Mock follow data:**
- [ ] Add followers/following counts to user profiles
- [ ] Store follow relationships in AsyncStorage
- [ ] Update counts when following/unfollowing

---

### 5. Enhanced Profile Screens

**Update:** `app/profile/[userId].tsx` (public profile view)

**Profile tabs:**
- [ ] Posts - User's posts grid
- [ ] About - Bio, stats, info
- [ ] Activity - Recent sessions, achievements (for players)
- [ ] Reviews - Reviews received (for coaches)

**Profile header:**
```
ProfileHeader:
- Cover photo (optional)
- Avatar (large, center)
- Name + Verified badge
- Role badge (Coach/Player/Parent)
- Bio (2-3 lines)
- Location (city, state)
- Stats row:
  - Followers: 1.2k
  - Following: 340
  - Posts: 89
  - (If coach) Rating: 4.9 ⭐
- Action buttons:
  - (If own profile) Edit Profile
  - (If other) Follow + Message + Book (if coach)
```

**Posts grid:**
- [ ] 3-column grid of post thumbnails
- [ ] Tap to view full post
- [ ] Show like/comment counts on hover/long-press

---

### 6. Development Hub (Player View)

**This is the core differentiator!**

**Create:** `app/(tabs)/development.tsx` (add new tab for Users/Parents only)

**Tab bar position:** Replace or add alongside Profile

**Development Hub sections:**

#### 6.1 Overview Dashboard

- [ ] Stats cards:
  - Total sessions: 42
  - Total hours: 56.5h
  - Current level: Silver
  - Current streak: 🔥 12 days

- [ ] Progress rings (circular progress):
  - Sessions this month: 8 / 12 goal
  - Skills improved: 4 / 8
  - Active goals: 2 / 5

- [ ] Recent achievements (horizontal scroll):
  - Badge icon
  - Badge name
  - Tap to see all achievements

- [ ] Quick actions:
  - 📅 Book session
  - 🎯 Set new goal
  - 📊 View full analytics

#### 6.2 Skills Radar Chart

**Create:** `app/development/skills.tsx`

- [ ] Install `victory-native` for charts
- [ ] Radar/spider chart showing 8 skills:
  - Passing
  - Shooting
  - Dribbling
  - Defending
  - Positioning
  - Fitness
  - Ball Control
  - Game IQ
- [ ] Each skill on 1-10 scale
- [ ] Color-coded by level (red = low, green = high)
- [ ] Tap skill to see detail view

**Skill detail view:**

**Create:** `app/development/skill/[skillName].tsx`

- [ ] Line chart: Skill progression over time
- [ ] Current level: 7/10
- [ ] Improvement: +2 in last 3 months
- [ ] Sessions focused on this skill (list)
- [ ] Coach notes related to this skill
- [ ] Set goal for this skill button

**Mock skill data:**
- [ ] Generate realistic progression data
- [ ] Update after session notes added
- [ ] Store in AsyncStorage

#### 6.3 Session History

**Create:** `app/development/history.tsx`

- [ ] Timeline view (chronological, newest first)
- [ ] Each entry shows:
  - Date & time
  - Coach name + avatar
  - Duration
  - Focus areas (chips)
  - Effort rating (stars)
  - Notes preview (expandable)
  - Attachments (if any)
  - Skills updated (badges: Passing +1, Shooting +1)

- [ ] Filters:
  - Date range picker
  - Filter by coach
  - Filter by skill focus
  - Filter by rating

- [ ] Export report button (PDF - future)

#### 6.4 Analytics & Graphs

**Create:** `app/development/analytics.tsx`

**Charts to include:**

1. **Sessions over time** (Line chart)
   - X: Last 12 months
   - Y: Number of sessions
   - Show trend line

2. **Hours trained** (Bar chart)
   - X: Last 8 weeks
   - Y: Hours
   - Color by session type

3. **Skill improvements** (Horizontal bar chart)
   - X: Improvement (0-3 points)
   - Y: Skills
   - Show which skills improved most

4. **Training frequency** (Calendar heatmap)
   - GitHub-style contribution graph
   - Green intensity = sessions that day
   - Last 365 days

5. **Session type breakdown** (Pie chart)
   - 1-on-1: 60%
   - Small group: 30%
   - Team: 10%

**Implementation:**
- [ ] Use `victory-native` for all charts
- [ ] Generate realistic mock data
- [ ] Make charts interactive (tap for details)

---

### 7. Achievements & Badges

**Create:** `app/development/achievements.tsx`

**Achievement categories:**
- 🎯 Milestone (First session, 10 sessions, 50 sessions, 100 sessions)
- ⚽ Skill (Passing master, Sharpshooter, Speed demon)
- 🏆 Consistency (7-day streak, 30-day streak, 6-month streak)
- 👥 Social (Team player, Feedback champion, Community leader)

**Achievement examples:**
```javascript
const achievements = [
  {
    id: 'first-session',
    name: 'First Step',
    description: 'Complete your first training session',
    icon: '🎯',
    category: 'milestone',
    requirement: 'Complete 1 session',
    points: 10,
    unlocked: true,
  },
  {
    id: 'dedicated-athlete',
    name: 'Dedicated Athlete',
    description: 'Complete 10 training sessions',
    icon: '🏆',
    category: 'milestone',
    requirement: 'Complete 10 sessions',
    points: 50,
    progress: 7, // 7/10
    unlocked: false,
  },
  // ... 20-30 total achievements
];
```

**Achievement screen:**
- [ ] Grid layout (2 columns)
- [ ] Locked badges show in grayscale
- [ ] Unlocked badges show in color with animation
- [ ] Progress bar for in-progress achievements
- [ ] Tap badge to see details modal:
  - Badge icon (large)
  - Name & description
  - Requirement
  - Progress (if not unlocked)
  - Date unlocked (if unlocked)
  - XP earned

**Auto-unlock logic (mock):**
- [ ] Check conditions after session completion
- [ ] If met, mark as unlocked
- [ ] Show unlock modal with animation
- [ ] Award XP
- [ ] Create achievement post (optional)

---

### 8. Level & XP System

**Add to player profiles:**
- [ ] Current level (Bronze, Silver, Gold, Elite)
- [ ] Experience points (XP)
- [ ] Progress to next level

**XP sources:**
- Complete session: +50 XP
- Unlock achievement: +10-100 XP
- Receive 5-star review: +25 XP
- Post content: +5 XP
- Get 10 likes on post: +10 XP

**Levels:**
- Bronze: 0-999 XP
- Silver: 1,000-4,999 XP
- Gold: 5,000-14,999 XP
- Elite: 15,000+ XP

**Level badge:**
- [ ] Show on profile
- [ ] Show progress bar with XP count
- [ ] Animate level up with confetti

**Level up notification:**
- [ ] Modal: "Level Up! You're now Silver!"
- [ ] Show new perks (future: unlock features per level)

---

### 9. Goals & Objectives

**Create:** `app/development/goals.tsx`

**Goal types:**
- Skill goal: "Improve passing to 8/10"
- Session goal: "Complete 15 sessions this month"
- Streak goal: "Train 4 days/week for a month"

**Create goal flow:**

**Create:** `app/development/goal/create.tsx`

- [ ] Goal title (text input)
- [ ] Goal type (dropdown)
- [ ] Target skill (if skill goal, dropdown)
- [ ] Target value (slider or number input)
- [ ] Deadline (date picker)
- [ ] Create button

**Goals screen:**
- [ ] Tabs: Active | Completed
- [ ] Each goal card shows:
  - Goal title
  - Progress bar (current / target)
  - Days until deadline
  - Edit / Delete buttons

**Auto-complete goals:**
- [ ] Check goal progress after events:
  - Session completed → check session goals
  - Skill updated → check skill goals
  - Streak updated → check streak goals
- [ ] If goal met, mark complete
- [ ] Show completion modal
- [ ] Award XP

---

### 10. Activity Feed (Profile)

**Create:** `app/profile/[userId]/activity.tsx`

**Show recent activity:**
- [ ] Sessions completed (with coach, date, focus)
- [ ] Achievements unlocked (badge + date)
- [ ] Goals completed (goal title + date)
- [ ] Reviews received (rating + date)
- [ ] Skills improved (skill name + improvement)

**Timeline format:**
- [ ] Chronological list
- [ ] Icon per activity type
- [ ] Tap to see details

---

## Mock Data Updates

**Update:** `constants/mock-data.ts`

**Add:**
- [ ] Sample posts (20-30)
- [ ] Comments data
- [ ] Follow relationships
- [ ] Skills history (progression over time)
- [ ] Achievements list
- [ ] Goals samples
- [ ] XP and level data
- [ ] Activity timeline data

**Add types:** `constants/types.ts`
- [ ] `Post` type
- [ ] `Comment` type
- [ ] `Achievement` type
- [ ] `Goal` type
- [ ] `SkillHistory` type
- [ ] `Activity` type

---

## New Components

### Social:
- [ ] `components/feed/post-card.tsx`
- [ ] `components/feed/create-post-modal.tsx`
- [ ] `components/feed/comment-card.tsx`
- [ ] `components/feed/comment-input.tsx`
- [ ] `components/feed/media-gallery.tsx`
- [ ] `components/profile/follow-button.tsx`
- [ ] `components/profile/followers-list.tsx`

### Development Hub:
- [ ] `components/development/stat-card.tsx`
- [ ] `components/development/progress-ring.tsx`
- [ ] `components/development/skills-radar-chart.tsx`
- [ ] `components/development/skill-detail-chart.tsx`
- [ ] `components/development/session-timeline-item.tsx`
- [ ] `components/development/achievement-badge.tsx`
- [ ] `components/development/achievement-grid.tsx`
- [ ] `components/development/level-badge.tsx`
- [ ] `components/development/goal-card.tsx`
- [ ] `components/development/analytics-chart.tsx`

---

## Libraries to Install

```bash
npm install victory-native react-native-svg
npm install react-native-reanimated # for animations
npm install react-native-gesture-handler # for swipe gestures
```

---

## Navigation Updates

**Update tab bar:**
- [ ] Add "Feed" tab (all users)
- [ ] Add "Development" tab (Users/Parents only)
- [ ] Reorder tabs:
  - Users: Discover | Feed | Bookings | Development | Messages | Profile
  - Coaches: Calendar | Feed | Bookings | Messages | Profile
  - Admin: Users | Feed | Bookings | Reports | Settings

---

## Success Criteria

✅ Sprint 3 is complete when:
1. Social feed displays posts with like/comment
2. Users can create posts with text/images
3. Follow/unfollow works
4. Enhanced profiles show posts and activity
5. Development Hub shows skills radar chart
6. Session history timeline displays
7. Analytics charts render correctly
8. Achievements unlock automatically
9. XP and leveling system works
10. Goals can be created and tracked
11. Activity feed shows recent events

---

## Testing Checklist

- [ ] Create text post
- [ ] Create post with multiple images
- [ ] Like and comment on post
- [ ] Follow/unfollow user
- [ ] View user profile with tabs
- [ ] View own Development Hub
- [ ] Check skills radar chart
- [ ] View skill detail with history
- [ ] View session history with filters
- [ ] View analytics charts
- [ ] Unlock achievement (mock trigger)
- [ ] View achievement grid
- [ ] Earn XP and level up
- [ ] Create goal
- [ ] Complete goal (mock trigger)
- [ ] View activity feed

---

## Notes

- All social data stored in AsyncStorage
- Charts use realistic mock data
- Achievement unlock logic is simulated
- Skills update after session notes
- Focus on making Development Hub visually impressive
- This sprint showcases the app's unique value prop

---

**Next Sprint Preview:**
Sprint 4 will add team management, group chats, school features, admin panel, and prepare for backend integration.
