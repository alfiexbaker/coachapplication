# Action Plan: Coach Application Restructuring

**Priority Order:** Critical Bugs → User Type Simplification → Bilateral Relationships → Social Features

---

## Phase 1: Critical Bug Fixes

### 1.1 Fix Session Invite → Booking Creation

**Priority:** CRITICAL
**Files to modify:**
- `/services/session-invite-service.ts`
- `/constants/app-types.ts`

**Current Bug Location:** Line 408-409 in `session-invite-service.ts`

```typescript
// CURRENT (BROKEN):
if (input.response === 'ACCEPTED') {
  notification.title = 'Invite Accepted!';
  console.log('[SessionInviteService] Booking would be created...');
  // No actual booking creation!
}
```

**Fix Required:**

```typescript
// Step 1: Add sessionInviteId to Booking interface (app-types.ts)
interface Booking {
  // ... existing fields
  sessionInviteId?: string;  // ADD THIS
}

// Step 2: Add bookingId to SessionInvite interface (types.ts)
interface SessionInvite {
  // ... existing fields
  bookingId?: string;  // ADD THIS
}

// Step 3: Create booking on acceptance (session-invite-service.ts:408)
if (input.response === 'ACCEPTED') {
  // Create the actual booking
  const booking = await bookingService.createBooking({
    coachId: invite.coachId,
    athleteId: invite.athleteIds[0], // Primary athlete
    bookedById: invite.parentId,
    scheduledAt: invite.selectedSlot!.date,
    duration: invite.selectedSlot!.durationMinutes,
    status: 'CONFIRMED',
    sessionInviteId: invite.id,
    service: invite.sessionType,
  });

  // Link booking back to invite
  invite.bookingId = booking.id;

  notification.title = 'Invite Accepted!';
}
```

### 1.2 Fix Counter-Proposal Booking Creation

**Priority:** HIGH
**File:** `/services/session-invite-service.ts` (lines 489-532)

Same pattern as above - when coach accepts counter-proposal, create booking.

### 1.3 Add Missing Back-References

**Priority:** HIGH
**Files to modify:**
- `/constants/app-types.ts`
- `/constants/types.ts`

```typescript
// Add to Booking interface
interface Booking {
  reviewId?: string;      // Link to review if exists
  sessionNoteId?: string; // Link to session notes
}

// Add to Session interface
interface Session {
  feedbackId?: string;    // Link to coach feedback
}

// Add to CoachProfile interface
interface CoachProfile {
  verificationStatusId?: string;  // Link to verification
}
```

---

## Phase 2: User Type Simplification

### 2.1 New Type Definitions

**Create:** `/constants/new-types.ts`

```typescript
// ====================
// SIMPLIFIED USER TYPES
// ====================

export type UserType = 'USER' | 'COACH';

// Base user interface (replaces USER + PARENT)
export interface User {
  id: string;
  email: string;
  name: string;
  type: 'USER';
  avatar?: string;
  bio?: string;
  phone?: string;
  dateOfBirth: string;
  postcode: string;
  createdAt: string;

  // Self-athlete properties (optional)
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';
  position?: string;
  goals?: Goal[];

  // Parent properties (optional)
  children?: ChildReference[];

  // If managed by a parent
  parentId?: string;
  guardians?: GuardianReference[];

  // Admin flag (instead of separate ADMIN role)
  isSystemAdmin?: boolean;
}

export interface ChildReference {
  childId: string;
  childName: string;
  relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
  addedAt: string;
}

export interface GuardianReference {
  guardianId: string;
  guardianName: string;
  relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
  isPrimary: boolean;
}

// Coach interface (individual or organization)
export interface Coach {
  id: string;
  email: string;
  name: string;
  type: 'COACH';
  avatar?: string;
  createdAt: string;

  // Organization support
  isOrganization: boolean;
  organizationName?: string;
  organizationLogo?: string;

  // Staff (if organization)
  staffMembers?: StaffMember[];

  // Availability status
  isLive: boolean;  // Currently accepting new bookings
  liveStatusReason?: string; // "On vacation", "Fully booked", etc.

  // Profile
  bio: string;
  phone?: string;
  website?: string;
  primarySport: string;
  sports: string[];
  specialties: string[]; // footballFocuses

  // Qualifications
  certifications: Certification[];
  experiences: Experience[];
  languages: Language[];

  // Location
  city: string;
  state?: string;
  postcode: string;
  travelRadius?: number; // miles willing to travel

  // Pricing
  priceRange: {
    minUsd: number;
    maxUsd: number;
    unitLabel: string;
  };
  sessionFormats: string[]; // 'In-person', 'Virtual', 'Small group'

  // Ratings
  rating: {
    average: number;
    reviewCount: number;
  };

  // Verification
  verificationLevel: 'NONE' | 'BASIC' | 'VERIFIED' | 'PREMIUM';
  verificationStatusId?: string;

  // Social
  socialLinks?: SocialLinks;

  // Analytics
  totalSessions: number;
  activeAthletes: number;
}

export interface StaffMember {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'HEAD_COACH' | 'COACH' | 'ASSISTANT' | 'ADMIN';
  permissions: CoachPermission[];
  joinedAt: string;
  isActive: boolean;
}

export type CoachPermission =
  | 'MANAGE_BOOKINGS'
  | 'MANAGE_ROSTER'
  | 'AWARD_BADGES'
  | 'VIEW_EARNINGS'
  | 'MANAGE_SETTINGS'
  | 'INVITE_STAFF'
  | 'POST_AS_COACH';
```

### 2.2 Navigation Updates

**File:** `/app/(tabs)/_layout.tsx`

```typescript
// Current: 4 role-based configurations
// New: 2 type-based configurations with feature flags

const getTabConfig = (user: User | Coach) => {
  if (user.type === 'COACH') {
    return {
      tabs: ['home', 'schedule', 'athletes', 'feed', 'profile'],
      hidden: ['find-coach', 'bookings', 'children', 'messages'],
    };
  }

  // USER type - check if has children
  const hasChildren = 'children' in user && user.children?.length > 0;

  return {
    tabs: [
      'home',
      hasChildren ? 'children' : 'bookings',
      'find-coach',
      'messages',
      'profile',
    ],
    hidden: hasChildren ? ['bookings'] : ['children'],
  };
};
```

### 2.3 Auth Context Updates

**File:** `/hooks/use-auth.tsx`

```typescript
// Update demo users
const DEMO_USERS: (User | Coach)[] = [
  // Coaches
  {
    id: 'coach1',
    email: 'coach@example.com',
    name: 'Marcus Johnson',
    type: 'COACH',
    isOrganization: false,
    isLive: true,
    // ... other coach fields
  },
  {
    id: 'academy1',
    email: 'academy@example.com',
    name: 'Elite Sports Academy',
    type: 'COACH',
    isOrganization: true,
    organizationName: 'Elite Sports Academy',
    isLive: true,
    staffMembers: [
      { userId: 'coach1', role: 'HEAD_COACH', ... },
    ],
  },
  // Users (athlete)
  {
    id: 'user1',
    email: 'athlete@example.com',
    name: 'Tom Henderson',
    type: 'USER',
    skillLevel: 'INTERMEDIATE',
    children: [], // No children, self-athlete
  },
  // Users (parent)
  {
    id: 'parent1',
    email: 'parent@example.com',
    name: 'Sarah Henderson',
    type: 'USER',
    children: [
      { childId: 'user1', childName: 'Tom Henderson', relationshipType: 'PARENT_CHILD' },
    ],
  },
  // Users (both parent and athlete)
  {
    id: 'user_parent1',
    email: 'both@example.com',
    name: 'Mike Wilson',
    type: 'USER',
    skillLevel: 'BEGINNER', // Self is athlete
    children: [
      { childId: 'user2', childName: 'James Wilson', relationshipType: 'PARENT_CHILD' },
    ],
  },
];
```

### 2.4 Screen Logic Updates

**Pattern for all screens:**

```typescript
// Old pattern (role-based)
if (currentUser?.role === 'PARENT') {
  // Show parent-specific UI
}

// New pattern (feature-based)
const hasChildren = currentUser?.type === 'USER' && currentUser.children?.length > 0;
const isAthlete = currentUser?.type === 'USER' && currentUser.skillLevel;
const isCoach = currentUser?.type === 'COACH';
const isOrganization = isCoach && currentUser.isOrganization;

if (hasChildren) {
  // Show children management UI
}
if (isAthlete) {
  // Show personal progress UI
}
```

---

## Phase 3: Bilateral Relationship Fixes

### 3.1 Two-Way Reviews

**Create:** `/constants/review-types.ts`

```typescript
// Existing: Parent → Coach
interface CoachReview {
  id: string;
  coachId: string;
  parentId: string;
  athleteId?: string;
  rating: number;
  content: string;
  createdAt: string;
}

// NEW: Coach → Athlete/Parent feedback
interface AthleteFeedback {
  id: string;
  coachId: string;
  athleteId: string;
  parentId?: string; // If athlete is minor

  // Feedback categories
  punctuality: 1 | 2 | 3 | 4 | 5;
  effort: 1 | 2 | 3 | 4 | 5;
  attitude: 1 | 2 | 3 | 4 | 5;
  coachability: 1 | 2 | 3 | 4 | 5;

  // Written feedback
  positives: string;
  areasToImprove: string;

  // Visibility
  visibility: 'coach_only' | 'parent' | 'athlete';

  createdAt: string;
  sessionId?: string; // Link to specific session
}
```

**Create:** `/services/athlete-feedback-service.ts`

### 3.2 Badge Acknowledgment

**Update:** `/constants/types.ts`

```typescript
interface BadgeAward {
  // ... existing fields

  // NEW: Acknowledgment
  acknowledgedAt?: string;
  acknowledgedMessage?: string; // "Thank you!"
  thankYouSent: boolean;
}
```

**Update:** `/services/badge-service.ts`

```typescript
// Add acknowledgment method
async acknowledgeBadge(awardId: string, message?: string): Promise<void> {
  const award = await this.getAward(awardId);
  if (!award) throw new Error('Award not found');

  award.acknowledgedAt = new Date().toISOString();
  award.acknowledgedMessage = message;
  award.thankYouSent = true;

  await this.saveAward(award);

  // Notify coach
  await notificationService.notifyCoachBadgeAcknowledged({
    coachId: award.coachId,
    athleteName: award.athleteName,
    badgeName: award.badgeName,
    message: message,
  });
}
```

### 3.3 Following System

**Create:** `/constants/follow-types.ts`

```typescript
interface Follow {
  id: string;
  followerId: string;
  followerName: string;
  followerType: 'USER' | 'COACH';
  followingId: string;
  followingName: string;
  followingType: 'USER' | 'COACH';
  createdAt: string;

  // Notification preferences
  notifyOnPost: boolean;
  notifyOnSession: boolean;
}

// Follow request for private profiles
interface FollowRequest {
  id: string;
  requesterId: string;
  targetId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
  respondedAt?: string;
}
```

**Create:** `/services/follow-service.ts`

```typescript
export class FollowService {
  // Follow a coach or user
  async follow(followerId: string, followingId: string): Promise<Follow>;

  // Unfollow
  async unfollow(followerId: string, followingId: string): Promise<void>;

  // Get followers
  async getFollowers(userId: string): Promise<Follow[]>;

  // Get following
  async getFollowing(userId: string): Promise<Follow[]>;

  // Check if following
  async isFollowing(followerId: string, followingId: string): Promise<boolean>;

  // Get following feed
  async getFollowingFeed(userId: string): Promise<Post[]>;
}
```

### 3.4 Direct Messaging (Outside Booking Context)

**Update:** `/constants/types.ts`

```typescript
interface ChatThread {
  // ... existing fields

  // NEW: Thread types
  threadType: 'BOOKING' | 'DIRECT' | 'GROUP' | 'CLUB';

  // For direct messages (no booking)
  initiatedBy?: string;
  acceptedAt?: string;

  // Message request status
  requestStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}
```

---

## Phase 4: Social Feature Completion

### 4.1 Blocking System

**Create:** `/constants/block-types.ts`

```typescript
interface Block {
  id: string;
  blockerId: string;
  blockedId: string;
  reason?: string;
  createdAt: string;
}
```

**Create:** `/services/blocking-service.ts`

```typescript
export class BlockingService {
  async blockUser(blockerId: string, blockedId: string, reason?: string): Promise<void>;
  async unblockUser(blockerId: string, blockedId: string): Promise<void>;
  async getBlockedUsers(userId: string): Promise<Block[]>;
  async isBlocked(userId: string, targetId: string): Promise<boolean>;
}
```

**Update Feed Query:** `/services/social-feed-service.ts`

```typescript
async getAggregatedFeed(userId: string): Promise<AggregatedFeedPost[]> {
  const blockedUsers = await blockingService.getBlockedUsers(userId);
  const blockedIds = blockedUsers.map(b => b.blockedId);

  const posts = await this.getAllPosts(userId);

  // Filter out blocked users' posts
  return posts.filter(post => !blockedIds.includes(post.authorId));
}
```

### 4.2 Complete Reaction System

**Update:** `/constants/types.ts`

```typescript
interface Reaction {
  userId: string;
  userName: string;
  userAvatar?: string;
  type: 'like' | 'love' | 'celebrate' | 'support';
  createdAt: string;
}

interface ClubFeedPost {
  // ... existing fields

  // Replace reactionCount with detailed reactions
  reactions: Reaction[];
}
```

**Update:** `/services/social-feed-service.ts`

```typescript
async toggleReaction(
  postId: string,
  userId: string,
  type: Reaction['type'] = 'like'
): Promise<void> {
  const post = await this.getPost(postId);
  if (!post) return;

  const existingIndex = post.reactions.findIndex(r => r.userId === userId);

  if (existingIndex >= 0) {
    // Remove reaction (unlike)
    post.reactions.splice(existingIndex, 1);
  } else {
    // Add reaction
    post.reactions.push({
      userId,
      userName: await this.getUserName(userId),
      type,
      createdAt: new Date().toISOString(),
    });
  }

  await this.savePost(post);
}
```

### 4.3 Audience Filtering Enforcement

**Update:** `/services/social-feed-service.ts`

```typescript
async getAggregatedFeed(userId: string): Promise<AggregatedFeedPost[]> {
  const memberships = await clubService.getUserMemberships(userId);

  const posts = await this.getAllClubPosts(userId);

  return posts.filter(post => {
    // Check audience
    switch (post.audience) {
      case 'staff':
        // Only show to coaches/admins
        const membership = memberships.find(m => m.clubId === post.clubId);
        return ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH'].includes(membership?.role);

      case 'squad':
        // Only show to squad members
        const squadMember = await squadService.isSquadMember(userId, post.squadId);
        return squadMember;

      case 'club':
      default:
        // Show to all club members
        return true;
    }
  });
}
```

### 4.4 Privacy Settings Enforcement

**Update:** `/app/(tabs)/coach-profile.tsx` and related screens

```typescript
// Before displaying profile
const profile = await coachService.getProfile(coachId);
const privacySettings = await privacyService.getSettings(coachId);

// Check visibility
if (!privacySettings.profileVisible && viewerId !== coachId) {
  return <PrivateProfileScreen />;
}

// Check specific fields
const showEarnings = coachId === viewerId || privacySettings.showEarnings;
const showClientList = coachId === viewerId || privacySettings.showClientList;
```

---

## Phase 5: Data Model Cleanup

### 5.1 Goal-Session Junction

**Create:** `/constants/goal-types.ts`

```typescript
interface GoalSession {
  id: string;
  goalId: string;
  sessionId: string;
  bookingId: string;
  coachId: string;

  // Progress tracking
  contributedToGoal: boolean;
  progressNotes?: string;
  percentageCompleted?: number;

  createdAt: string;
}
```

### 5.2 Normalize MatchPlayer

**Update:** `/constants/types.ts`

```typescript
// Before
interface MatchPlayer {
  athleteId: string;
  athleteName: string;
  athletePhotoUrl?: string;
  parentId: string;
  parentName: string;
  // ... duplicated data
}

// After
interface MatchPlayer {
  rosterEntryId: string;  // Reference to RosterEntry
  squadMemberId?: string; // Optional reference to SquadMember

  // Match-specific data only
  position?: string;
  jerseyNumber?: number;
  availability: 'AVAILABLE' | 'UNAVAILABLE' | 'MAYBE';
  responseAt?: string;
}
```

### 5.3 Booking Status History

**Create:** `/constants/audit-types.ts`

```typescript
interface BookingStatusChange {
  id: string;
  bookingId: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  changedBy: string;
  changedByRole: 'USER' | 'COACH' | 'SYSTEM';
  reason?: string;
  createdAt: string;
}
```

---

## Migration Checklist

### Pre-Migration
- [ ] Back up all mock data
- [ ] Document current role-based screen access
- [ ] List all places where role is checked

### Phase 1 (Bugs)
- [ ] Fix session invite → booking creation
- [ ] Fix counter-proposal booking creation
- [ ] Add sessionInviteId to Booking
- [ ] Add bookingId to SessionInvite
- [ ] Test invite → booking flow end-to-end

### Phase 2 (User Types)
- [ ] Create new-types.ts with User and Coach interfaces
- [ ] Update auth context with new type definitions
- [ ] Update tab navigation for 2 types
- [ ] Migrate PARENT-specific screens to check `user.children`
- [ ] Migrate USER-specific screens to check `user.skillLevel`
- [ ] Add isOrganization and isLive to Coach
- [ ] Add staffMembers array to Coach
- [ ] Update all role checks to type checks

### Phase 3 (Bilateral)
- [ ] Create AthleteFeedback interface
- [ ] Add acknowledgment fields to BadgeAward
- [ ] Create Follow interface and service
- [ ] Update ChatThread for direct messaging
- [ ] Add Follow button to coach profiles

### Phase 4 (Social)
- [ ] Create Block interface and service
- [ ] Update feed queries to filter blocked
- [ ] Replace reactionCount with reactions array
- [ ] Implement audience filtering in feed
- [ ] Enforce privacy settings in profile views

### Phase 5 (Data Model)
- [ ] Create GoalSession junction
- [ ] Normalize MatchPlayer
- [ ] Add BookingStatusChange audit trail
- [ ] Add updatedAt/updatedBy to key entities

### Post-Migration
- [ ] Run full test suite
- [ ] Verify all user flows work
- [ ] Update documentation
- [ ] Remove deprecated code

---

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Bug Fixes | 2-3 days | CRITICAL |
| Phase 2: User Types | 5-7 days | HIGH |
| Phase 3: Bilateral | 3-4 days | MEDIUM |
| Phase 4: Social | 3-4 days | MEDIUM |
| Phase 5: Data Model | 2-3 days | LOW |

**Total Estimated:** 15-21 days of focused development

---

## Files to Modify Summary

### Core Types (modify)
- `/constants/types.ts`
- `/constants/app-types.ts`

### New Files (create)
- `/constants/new-types.ts`
- `/constants/follow-types.ts`
- `/constants/block-types.ts`
- `/constants/review-types.ts`
- `/constants/audit-types.ts`
- `/services/follow-service.ts`
- `/services/blocking-service.ts`
- `/services/athlete-feedback-service.ts`

### Services (modify)
- `/services/session-invite-service.ts` - **PRIORITY**
- `/services/booking-service.ts`
- `/services/social-feed-service.ts`
- `/services/badge-service.ts`
- `/services/messaging-service.ts`

### Hooks (modify)
- `/hooks/use-auth.tsx`

### Navigation (modify)
- `/app/(tabs)/_layout.tsx`

### Screens (modify - role → type checks)
- `/app/(tabs)/index.tsx`
- `/app/(tabs)/feed.tsx`
- `/app/(tabs)/messages.tsx`
- `/app/(tabs)/settings.tsx`
- `/app/(tabs)/children.tsx`
- `/app/(tabs)/coach-profile.tsx`
- All screens with role-based logic
