# Social Feed Implementation Analysis

## Current State Overview

The social feed implementation is in its **early stages**. A basic reusable component exists but is currently only integrated into the USER (athlete) home screen. The Sprint 3 planning document outlines a comprehensive vision for a Facebook-like social networking platform, but most features remain unimplemented.

---

## 1. Social Feed Screens & Components

### Existing Components:
**Location:** `/home/user/coachapplication/clubroom/components/social/social-feed.tsx`

**Current Implementation:**
- **Component:** `SocialFeed` (reusable)
- **Status:** BASIC - Works but limited functionality
- **Props:**
  - `title?: string` - Custom title (default: "Community Feed")
  - `limit?: number` - Optional limit for number of posts to show

**Current Features:**
- Displays posts from mock data
- Shows author name, avatar, content, and creation date
- Like button with heart icon (toggles filled/outline)
- Like count display
- **MISSING:**
  - Comment display
  - Comment functionality
  - Share button
  - Follow button
  - Post images/media
  - Post detail view
  - Create post functionality

### Where SocialFeed is Used:
- **USER Home Screen** (`/clubroom/components/user/home-screen.tsx`) - ✅ Currently integrated
  - Displays "Recent Activity" section with limited posts
  - Shows alongside next session info

**Recently Removed From (based on git commit 2389894):**
- COACH Development Screen - Removed to focus on athlete tracking
- PARENT Discover Screen - Removed to focus on coach discovery
- ADMIN Users Screen - Removed to focus on user management

---

## 2. Navigation Setup for Different Roles

### Tab Navigation by Role

**Location:** `/home/user/coachapplication/clubroom/app/(tabs)/_layout.tsx`

**COACH Tabs:**
1. Messages
2. Bookings
3. Development (athlete tracking)
4. Analytics (chart-based)
5. Profile

**USER (Athlete) Tabs:**
1. Home (includes SocialFeed)
2. Find Coach
3. Progress (bookings/progress view)
4. Messages
5. Profile

**PARENT Tabs:**
1. Discover (coach search)
2. Bookings
3. Development (per-child progress)
4. Messages
5. Profile

**ADMIN Tabs:**
1. Users (user management)
2. Bookings
3. Reports
4. Settings

**MISSING:**
- No dedicated "Feed" tab for any role
- No separate feed discovery/browsing screens
- No post creation screen
- No profile viewing screens (beyond coach profile)

---

## 3. Data Structures for Posts & Comments

### Post Type Definition

**Location:** `/home/user/coachapplication/clubroom/constants/app-types.ts`

```typescript
export interface Post {
  id: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  images?: string[];
  likes: string[]; // User IDs who liked
  createdAt: string;
}
```

### Enhanced Coach Post Type

**Location:** `/home/user/coachapplication/clubroom/constants/types.ts`

```typescript
export interface CoachPost {
  id: string;
  coachId: string;
  content: string;
  mediaUrls?: string[];
  mediaType?: 'photo' | 'video';
  createdAt: string;
  likes: number;           // Count only
  comments: number;        // Count only
}
```

### Comment Type
**Status:** NOT DEFINED ❌

No Comment interface exists yet. Needed:
```typescript
interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  likes: string[];
  replies?: Comment[];
  createdAt: string;
}
```

### Mock Data

**Location:** `/home/user/coachapplication/clubroom/constants/mock-data.ts`

**MOCK_POSTS Array:**
- Only 3 posts defined
- Used in SocialFeed component
- Contains:
  - Posts from users and coaches
  - Like counts (as array of user IDs)
  - No comments data
  - No media URLs
  
**Example:**
```typescript
{
  id: 'post1',
  authorId: 'user3',
  authorName: 'James Wilson',
  authorAvatar: '🧑',
  content: 'Just achieved my goal of scoring 20 goals this season!...',
  likes: ['user1', 'parent1', 'coach2'],
  createdAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
}
```

---

## 4. API & Data Handling

### Current State
- **No Backend API** - Uses mock data only
- **Storage:** AsyncStorage (not implemented yet, but mentioned in Sprint 3 plan)
- **Data Flow:** Mock data → Component rendering

### Mock Data Helpers

**Location:** `/home/user/coachapplication/clubroom/constants/mock-data.ts`

Available helper functions:
```typescript
export function getUserById(id: string): User | undefined
export function getCoachProfile(userId: string): CoachProfile | undefined
export function getAllCoachesWithProfiles(): Array<User & { profile: CoachProfile }>
```

**Missing Helpers:**
- `getPostsForUser(userId: string)`
- `getPostsForFeed(userId: string)` - for personalized feed
- `getCommentsForPost(postId: string)`
- `getLikesForPost(postId: string)`
- `getUserFollowers(userId: string)`
- `getUserFollowing(userId: string)`

---

## 5. Current Implementation Status

### Completed ✅
- Post data type definition (basic)
- Mock posts data (3 posts)
- SocialFeed component (basic rendering)
- Like functionality (visual feedback)
- Integration into USER home screen
- Navigation structure for all roles

### Partially Implemented 🟡
- Post display (text and metadata only)
- Like counts
- CoachPost type (for coach profiles)
- Coach profile posts display (in coach-profile.tsx)

### Not Started ❌

**Core Features:**
- Comment system (type, UI, mock data)
- Post creation flow
- Feed filtering ("For You", "Coaches", "Players")
- Post media handling (images, videos)
- Share functionality
- Follow/unfollow system
- Post detail views
- Comment threads

**Advanced Features:**
- Skills radar chart
- Achievement badges & unlocking
- XP/Level system
- Goals & objectives tracking
- Activity timeline
- Analytics & graphs
- Session history tracking

**Supporting Features:**
- Post/comment moderation
- Reporting posts
- Blocking users
- Notifications
- Search functionality
- User profiles with posts grid
- Follow relationships persistence

---

## 6. Coach Profile Implementation (Partial Social Features)

**Location:** `/home/user/coachapplication/clubroom/app/(tabs)/coach-profile.tsx`

### What's Implemented:
- Posts tab showing CoachPost items
- Post display with:
  - Avatar and coach name
  - Content text
  - Media URLs support (not rendering)
  - Like count
  - Comment count
  - Share button (UI only)
- Experience section
- Certifications
- Photo gallery

### What's Missing:
- Click handlers for like/comment buttons
- Post creation
- Comment display when clicking comments
- Media rendering (images/videos)
- Post detail modal
- Actual post data tied to current user

---

## 7. Key Gaps & Missing Pieces

### High Priority (Required for MVP):
1. **Comment System** - Type definition, mock data, components
2. **Post Creation** - Modal/screen for creating posts
3. **Comment Display** - Show comments on posts, comment threads
4. **Like Functionality** - Make like button work with state updates
5. **Post Detail Screen** - Full post view with all comments

### Medium Priority (Core Social Features):
6. **Follow System** - Follow/unfollow buttons and relationships
7. **User Profiles** - Public profile views with posts grid
8. **Feed Navigation** - "For You" vs "Coaches" vs "Players" tabs
9. **Post Media** - Image/video support and display
10. **Share Button** - Functional share to messages or native sharing

### Lower Priority (Enhancement):
11. **Development Hub** - Skills tracking, analytics, achievements
12. **Activity Feed** - Timeline of user activities
13. **Goals & Objectives** - Progress tracking
14. **Notifications** - Real-time updates
15. **Search & Discover** - Finding posts and users

---

## 8. Integration Points Needed

### Current Integration:
```
UserHomeScreen 
  └─ SocialFeed (Recent Activity section)
```

### Needed Integration:
```
Tab Navigation (all roles)
  └─ New "Feed" Tab
      ├─ Feed List Screen (infinite scroll)
      ├─ Post Detail Screen (comments)
      ├─ Create Post Modal
      └─ User Profile Screens
          ├─ Posts Tab
          ├─ About Tab
          ├─ Activity Tab
          └─ Reviews Tab (coaches)
```

---

## 9. Data Architecture

### Current Schema Hierarchy:
```
Post
├── id
├── authorId (User)
├── content
├── likes (User[] IDs)
├── createdAt
└── (MISSING) comments

User
├── id
├── name
├── avatar
├── role
└── (MISSING) followers, following

CoachPost
├── id
├── coachId (Coach)
├── content
├── likes (count)
├── comments (count)
├── mediaUrls
└── mediaType
```

### Needed:
```
Comment (NEW)
├── id
├── postId
├── authorId
├── content
├── likes
├── replies
└── createdAt

Follow (NEW)
├── id
├── followerId
├── followingId
└── createdAt

Achievement (NEW)
├── id
├── userId
├── name
├── description
├── icon
├── unlocked
├── unlockedAt

Goal (EXISTS but needs enhancement)
├── id
├── userId
├── title
├── progress
├── status
└── createdAt
```

---

## 10. Sprint 3 Planning Reference

**Document Location:** `/docs/sprints/SPRINT_3_SOCIAL_DEVELOPMENT.md`

**Vision:** Transform from booking platform to social network with:
- Social feed with posts/comments/likes
- Follow system
- Development hub (skills tracking)
- Achievements & badges
- Goals & objectives
- Enhanced profiles
- Activity feed

**Proposed Component Structure:**
```
/components/social/
├── post-card.tsx
├── create-post-modal.tsx
├── comment-card.tsx
├── comment-input.tsx
└── media-gallery.tsx

/components/development/
├── skills-radar-chart.tsx
├── session-timeline-item.tsx
├── achievement-badge.tsx
└── analytics-chart.tsx

/app/(tabs)/
├── feed.tsx (NEW - all roles)
└── development.tsx (NEW - users/parents)
```

---

## 11. Recommended Next Steps

### Phase 1 (Foundation):
1. Create `Comment` type in `app-types.ts`
2. Add mock comments data to `mock-data.ts`
3. Build `comment-card.tsx` component
4. Create post detail screen (`app/feed/post/[postId].tsx`)
5. Add comment display to post detail

### Phase 2 (Core):
6. Create post composition modal
7. Add follow/unfollow functionality
8. Build dedicated feed screen with infinite scroll
9. Create user profile screen with posts grid
10. Implement like/comment state management

### Phase 3 (Enhancement):
11. Add media support
12. Build achievement system
13. Create development hub screens
14. Add analytics and goals

---

## Summary

**Current State:** Early stage with basic reusable SocialFeed component

**What Works:**
- Post rendering with author info, content, and date
- Like button with visual feedback
- Integration into USER home screen
- Mock data with 3 sample posts

**What's Missing (Critical):**
- Comments system entirely
- Post creation
- Post detail views
- Comment threads
- Follow system
- User profiles
- Feed navigation

**Architecture:** Post type exists but Comment type needs definition. Mock data is minimal but extensible. No API integration yet - uses local mock data only.

