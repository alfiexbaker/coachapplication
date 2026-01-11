# Club & Organization System - Complete Documentation

## Overview

The club system provides team organization features including membership management, squads, matches, events, and club feeds. Academies are a more advanced variant for coaching businesses.

---

## 1. Screens & Navigation

### Club Screens

| Screen | Path | Purpose |
|--------|------|---------|
| Club Hub | `/(tabs)/club-hub` | Main club dashboard |
| Club Detail | `/club/[id]` | Full club view |

### Academy Screens

| Screen | Path | Purpose |
|--------|------|---------|
| Academy Create | `/academy/create` | Multi-step wizard |
| Academy Detail | `/academy/[id]` | Academy info |
| Academy Branding | `/academy/[id]/branding` | Logo, colors |
| Academy Staff | `/academy/[id]/staff` | Staff management |

---

## 2. Club vs Academy

| Feature | Club | Academy |
|---------|------|---------|
| Creation | Simple (name only) | 4-step wizard |
| Customization | Minimal | Extensive branding |
| Roles | 5 roles | 6 roles |
| Permissions | Binary | Fine-grained |
| Scope | Sports teams | Coaching businesses |
| Discovery | Membership only | Can be public |
| Approval | Automatic join | Can require approval |

---

## 3. Club Data Model

```typescript
interface Club {
  id: string;
  name: string;
  city: string;
  country?: string;
  badge?: string;              // Initials ("LI" for Lions)
  photoUrl?: string;
  tagline?: string;
  memberCount: number;
  coachCount: number;
  squadCount: number;
  ownerId: string;
  ownerName: string;
  inviteCode: string;
}
```

---

## 4. Club Membership

### Roles

```typescript
type ClubRole = 'OWNER' | 'ADMIN' | 'HEAD_COACH' | 'COACH' | 'MEMBER';
```

### Role Permissions

| Action | OWNER | ADMIN | HEAD_COACH | COACH | MEMBER |
|--------|-------|-------|-----------|-------|--------|
| Remove members | ✓ | ✓ | ✓* | ✗ | ✗ |
| Pin posts | ✓ | ✓ | ✓ | ✓ | ✗ |
| Create posts | ✓ | ✓ | ✓ | ✓ | ✗ |
| Post as club | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage settings | ✓ | ✓ | ✗ | ✗ | ✗ |
| View members | ✓ | ✓ | ✓ | ✓ | ✓ |

*HEAD_COACH cannot remove OWNER

### Membership Data Model

```typescript
interface ClubMembership {
  clubId: string;
  userId: string;
  role: ClubRole;
  status: 'active' | 'pending';
  joinSource: 'invite' | 'created';
  inviteCode?: string;
  squadIds?: string[];
  canPostAsClub?: boolean;
}
```

---

## 5. Invite Codes

### Structure

```typescript
interface ClubInvite {
  code: string;                // "LIONS-COACH"
  clubId: string;
  clubName: string;
  createdBy: string;
  createdByName: string;
  role: ClubRole;              // Role granted on join
  expiresAt: string;           // ISO date
  remainingUses: number;
}
```

### Validation Flow

```
User enters code (e.g., "LIONS-CLUB")
        │
        ▼
Convert to uppercase
        │
        ▼
Search clubInvites array
        │
        ▼
┌───────────────────────────┐
│ Code exists?              │
└───────────┬───────────────┘
            │
    ┌───────┴───────┐
    │ NO            │ YES
    ▼               ▼
  Error      Check expiration
            & remaining uses
                    │
            ┌───────┴───────┐
            │ Invalid       │ Valid
            ▼               ▼
          Error        Create membership
                       with assigned role
```

### Mock Invite Codes

| Code | Club | Role | Uses |
|------|------|------|------|
| LIONS-CLUB | Lions FC | HEAD_COACH | 8 |
| LIONS-COACH | Lions FC | COACH | 15 |
| EAGLES-JOIN | East London Eagles | MEMBER | - |

---

## 6. Squad System

### Squad Data Model

```typescript
interface ClubSquad {
  id: string;
  clubId: string;
  name: string;
  level: string;               // "U15 · Competitive"
  memberCount: number;
  primaryCoach: string;
  meetLocation: string;
  nextSession?: string;
  tags?: string[];
  ageMin?: number;
  ageMax?: number;
}
```

### Squad Members

```typescript
interface SquadMember {
  id: string;
  squadId: string;
  athleteId: string;
  athleteName: string;
  athleteAge?: number;
  athletePhotoUrl?: string;
  parentId: string;
  parentName: string;
  parentEmail?: string;
  parentPhone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  joinedAt: string;
  position?: string;
  jerseyNumber?: number;
}
```

### Mock Squads

| Squad | Club | Members | Level | Tags |
|-------|------|---------|-------|------|
| U15 Performance | Lions FC | 18 | U15 Competitive | Pressing, Finishing |
| Junior Skills | Lions FC | 22 | U11 Development | Ball Mastery |
| Staff Room | Lions FC | 8 | Staff | Approvals |

---

## 7. Club Feed

### Post Types

```typescript
type ClubPostType =
  | 'announcement'
  | 'photo'
  | 'event'
  | 'general'
  | 'achievement'
  | 'session'
  | 'match';
```

### Post Structure

```typescript
interface ClubFeedPost {
  id: string;
  clubId: string;
  title: string;
  body: string;
  createdAt: string;

  // Targeting
  audience: 'club' | 'squad' | 'staff';
  audienceLabel?: string;

  // Author
  authorName: string;
  authorId?: string;
  postAs?: 'club' | 'self';

  // Content
  postType?: ClubPostType;
  attachments?: string[];
  imageUrl?: string;

  // Engagement
  reactionCount?: number;
  commentCount?: number;

  // Pinning
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;

  // Event posts
  eventDate?: string;
  eventLocation?: string;

  // Achievement posts
  athleteId?: string;
  athleteName?: string;
  badgeId?: string;
  badgeAwardId?: string;
}
```

### Feed Filtering

```
┌────────┬────────────────┬────────┬────────┐
│  All   │ Announcements  │ Photos │ Events │
│  (24)  │     (3)        │  (8)   │  (5)   │
└────────┴────────────────┴────────┴────────┘
```

### Audience Visibility

| Audience | Who Sees |
|----------|----------|
| club | All club members |
| squad | Only squad members |
| staff | COACH, ADMIN, OWNER only |

**Note:** Audience filtering is defined but NOT enforced in queries (bug).

---

## 8. Match Management

### Match Data Model

```typescript
interface Match {
  id: string;
  clubId: string;
  clubName: string;
  squadId?: string;
  squadName?: string;
  coachId: string;

  // Details
  title: string;
  matchType: 'FRIENDLY' | 'LEAGUE' | 'CUP' | 'TOURNAMENT';
  opponent: string;
  isHome: boolean;

  // Schedule
  date: string;
  kickoffTime: string;
  meetTime?: string;

  // Location
  venue: string;
  address?: string;

  // Squad
  maxPlayers: number;
  selectedPlayers: MatchPlayer[];

  // Status
  status: 'SCHEDULED' | 'LINEUP_SET' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  // Result
  result?: { home: number; away: number };

  notes?: string;
}
```

### Match Player Flow

```
INVITED
    │
    ├──► AVAILABLE (parent confirms)
    │        │
    │        ├──► SELECTED (coach picks for starting 11)
    │        ├──► RESERVE (backup players)
    │        └──► NOT_SELECTED
    │
    └──► UNAVAILABLE (parent declines with reason)
```

### Match Player Structure

```typescript
interface MatchPlayer {
  athleteId: string;
  athleteName: string;
  parentId: string;
  parentName?: string;
  status: MatchPlayerStatus;
  responseAt?: string;
  parentNote?: string;
  position?: string;
  jerseyNumber?: number;
}
```

---

## 9. Training Sessions

### Group Session Types

| Type | Description |
|------|-------------|
| CAMP | Multi-day intensive |
| CLINIC | Focused skill workshop |
| TEAM_TRAINING | Regular squad training |
| OPEN_SESSION | Drop-in session |
| TRIAL | Try-out session |
| TRAINING | General training |

### Recurring Patterns

```typescript
interface RecurringPattern {
  dayOfWeek: number;           // 0-6 (Sun-Sat)
  startTime: string;           // "17:00"
  endTime: string;             // "18:30"
  until: string;               // End date
}
```

---

## 10. Club Events

### Event Types

```typescript
type ClubEventType =
  | 'TOURNAMENT'
  | 'SOCIAL'
  | 'MEETING'
  | 'PRESENTATION'
  | 'FUNDRAISER'
  | 'TRIAL_DAY'
  | 'TRAINING_CAMP'
  | 'OTHER';
```

### Event Structure

```typescript
interface ClubEvent {
  id: string;
  clubId: string;
  clubName: string;
  createdBy: string;

  // Details
  title: string;
  description: string;
  eventType: ClubEventType;

  // Schedule
  date: string;
  startTime: string;
  endTime?: string;

  // Location
  venue: string;
  address?: string;
  isVirtual: boolean;
  meetingLink?: string;

  // Attendance
  targetAudience: 'ALL' | 'COACHES' | 'PARENTS' | 'ATHLETES' | 'SQUAD';
  squadIds?: string[];
  maxAttendees?: number;

  // Pricing
  price: number;
  currency: string;

  // RSVP
  rsvpRequired: boolean;
  rsvpDeadline?: string;
  attendees: EventAttendee[];

  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';
}
```

### RSVP Status

```typescript
type RSVPStatus = 'GOING' | 'MAYBE' | 'NOT_GOING';

interface EventAttendee {
  userId: string;
  userName: string;
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  status: RSVPStatus;
  guestCount: number;
  respondedAt: string;
}
```

---

## 11. Academy System

### Academy Data Model

```typescript
interface Academy {
  id: string;
  name: string;
  description?: string;

  // Location
  postcode?: string;
  city?: string;
  address?: string;

  // Branding
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;

  // Contact
  email?: string;
  phone?: string;
  website?: string;

  // Settings
  isPublic: boolean;
  requiresApproval: boolean;

  // Sports
  sports: SportCategory[];
  specialties: string[];

  // Stats
  coachCount: number;
  athleteCount: number;
  rating: { average: number; reviewCount: number };

  ownerId: string;
  ownerName: string;
  createdAt: string;
}
```

### Academy Roles & Permissions

```typescript
type AcademyRole = 'OWNER' | 'ADMIN' | 'HEAD_COACH' | 'COACH' | 'ASSISTANT' | 'MEMBER';

type AcademyPermission =
  | 'MANAGE_STAFF'
  | 'MANAGE_SETTINGS'
  | 'CREATE_SESSIONS'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_BILLING'
  | 'POST_AS_ACADEMY'
  | 'INVITE_MEMBERS';
```

### Academy Creation Wizard

**Step 1: Basics**
- Academy name (required)
- City (required)
- Postcode (required)

**Step 2: Details**
- Description
- Email
- Phone
- Website

**Step 3: Specialties**
- Multi-select from: Dribbling, Passing, Finishing, Defending, Goalkeeping, Conditioning

**Step 4: Review**
- Confirm all details
- Note: "Customize branding after creation"

### Branding Colors

| Color | Hex |
|-------|-----|
| Blue | #1E40AF |
| Purple | #7C3AED |
| Green | #059669 |
| Red | #DC2626 |
| Orange | #EA580C |
| Cyan | #0891B2 |
| Indigo | #4F46E5 |
| Slate | #0F172A |

---

## 12. Member Management

### Member Removal

```typescript
interface ClubMemberRemovalRecord {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  userRole: ClubRole;
  reason: MemberRemovalReason;
  customReason?: string;
  removedBy: string;
  removedByName: string;
  removedAt: string;
  originalMembership?: ClubMembership;  // For undo
}

type MemberRemovalReason =
  | 'LEFT_CLUB'
  | 'INACTIVE'
  | 'CONDUCT'
  | 'SEASON_END'
  | 'OTHER';
```

### Removal Flow

```
Long-press on member
        │
        ▼
Action sheet appears
        │
        ▼
Select reason
        │
        ▼
Confirm removal
        │
        ▼
Member removed + Undo available (5 seconds)
        │
        ▼
Removal record created
```

---

## 13. Mock Data

### Clubs

| Club | City | Members | Coaches | Squads |
|------|------|---------|---------|--------|
| Lions FC Academy | London | 45 | 8 | 3 |
| East London Eagles | London | 38 | 5 | 2 |

### Feed Posts

| Type | Title | Reactions | Pinned |
|------|-------|-----------|--------|
| announcement | Club Registration Now Open | 45 | ✓ |
| announcement | Indoor Training Tonight | - | |
| photo | U12 Tournament Champions! | 34 | |
| event | Family Fun Day | 28 | |
| achievement | Tom Henderson earned a badge! | - | |

---

## 14. Implementation Status

### Fully Implemented

- Club creation and joining
- Membership management
- Role-based permissions
- Club feed with posts
- Feed filtering
- Post pinning
- Squad management
- Invite codes
- Member removal with undo
- Academy creation wizard
- Academy branding
- Academy staff management

### Partially Implemented

- Match management (basic)
- Event RSVP
- Club settings

### Not Implemented

- Comments on posts
- Reactions/likes (counter only)
- Post sharing
- Real image uploads
- Video uploads
- Squad permissions customization
- Bulk invites
- Attendance tracking
- Club calendar view
- Roster PDF export
- Real notifications

---

## 15. Non-Bilateral Issues

### Current Limitations

1. **Audience filtering not enforced** - Staff-only posts visible to all
2. **No parent-to-parent messaging** within clubs
3. **No athlete-to-athlete connections**
4. **Comments/reactions not functional**

---

## 16. Files Reference

### Screens
- `/app/(tabs)/club-hub.tsx`
- `/app/club/[id].tsx`
- `/app/academy/create.tsx`
- `/app/academy/[id]/*.tsx`

### Services
- `/services/club-service.ts`
- `/services/academy-service.ts`
- `/services/squad-service.ts`
- `/services/match-service.ts`

### Types
- `/constants/types.ts` - Club, ClubMembership, ClubSquad, Match
- `/constants/app-types.ts` - ClubEvent, Academy

### Mock Data
- `/constants/mock-data.ts` - clubs, clubMemberships, clubSquads, clubFeedPosts
