# Clubs & Squads System

> Complete documentation for club management, squad organization, membership, and club feeds.

---

## Overview

The clubs system provides:
- Club creation and management
- Squad/team organization
- Role-based membership with permissions
- Club feeds with targeted posting
- Invite codes for joining
- Academy system for organizations

---

## Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Club Management | Complete | Create, edit, manage clubs |
| Squad System | Complete | Teams within clubs |
| Membership Roles | Complete | 5 roles with permissions |
| Invite Codes | Complete | Join via code |
| Club Feed | Complete | Posts, filtering, pinning |
| Academy System | Complete | Organization accounts |
| Member Removal | Complete | Remove with undo |

---

## Screens & Routes

### Club Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Club Hub | `/(tabs)/club-hub` | Main club dashboard |
| Club Detail | `/club/[id]` | Full club view |
| Create Club | `/club/create` | New club form |
| Invite Members | `/club/invite-members` | Generate invite codes |
| Club Settings | `/club/settings` | Club configuration |

### Academy Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Create Academy | `/academy/create` | Multi-step wizard |
| Academy Detail | `/academy/[id]` | Academy view |
| Staff Management | `/academy/[id]/staff` | Manage staff |
| Branding | `/academy/[id]/branding` | Logo, colors |
| Academy Settings | `/academy/[id]/settings` | Configuration |

### Squad Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| Create Squad | `/club/squad/create` | New squad |
| Squad Invite | `/squads/[id]/invite` | Invite to session |
| Training Schedule | `/club/training-schedule` | Squad schedule |

---

## Club Structure

### Club Data Model

```typescript
interface Club {
  id: string;
  name: string;

  // Identity
  badge?: string;                  // Initials ("LI" for Lions)
  photoUrl?: string;
  tagline?: string;

  // Location
  city: string;
  country?: string;

  // Stats
  memberCount: number;
  coachCount: number;
  squadCount: number;

  // Ownership
  ownerId: string;
  ownerName: string;

  // Invite
  inviteCode: string;              // Generated on creation

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

### Club UI

```
┌─────────────────────────────────────────────────────────────────┐
│                        Lions FC Academy                          │
│                       [Club Badge/Logo]                          │
│                                                                 │
│   📍 London • 45 members • 8 coaches                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Feed] [Members] [Squads] [Events] [Sessions]                 │
│   ═════                                                         │
│                                                                 │
│   📌 PINNED                                                     │
│   ─────────────────────────────────────────────────────         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 📢 Club Registration Now Open                           │  │
│   │    Lions FC • Club-wide • 2 days ago                    │  │
│   │                                                          │  │
│   │    Registration for the new season is now open...        │  │
│   │                                                          │  │
│   │    👍 45   💬 12                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   RECENT POSTS                                                  │
│   ─────────────────────────────────────────────────────         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 📷 U12 Tournament Champions!                            │  │
│   │    Coach Sarah • Photos • Yesterday                      │  │
│   │                                                          │  │
│   │    [📸 Photo Grid]                                       │  │
│   │                                                          │  │
│   │    👍 34   💬 8                                          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 📅 Family Fun Day                                       │  │
│   │    Lions FC • Event • 3 days ago                         │  │
│   │                                                          │  │
│   │    Join us for our annual Family Fun Day...              │  │
│   │    Saturday, Jan 25 at 10:00 AM                          │  │
│   │                                                          │  │
│   │    👍 28   💬 5   [RSVP]                                 │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Membership System

### Club Roles

```typescript
type ClubRole = 'OWNER' | 'ADMIN' | 'HEAD_COACH' | 'COACH' | 'MEMBER';
```

### Role Permissions

| Permission | OWNER | ADMIN | HEAD_COACH | COACH | MEMBER |
|------------|-------|-------|------------|-------|--------|
| Remove members | ✓ | ✓ | ✓* | ✗ | ✗ |
| Pin posts | ✓ | ✓ | ✓ | ✓ | ✗ |
| Create posts | ✓ | ✓ | ✓ | ✓ | ✗ |
| Post as club | ✓ | ✓ | ✓ | ✗ | ✗ |
| Manage settings | ✓ | ✓ | ✗ | ✗ | ✗ |
| View members | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create squads | ✓ | ✓ | ✓ | ✗ | ✗ |
| Invite members | ✓ | ✓ | ✓ | ✓ | ✗ |

*HEAD_COACH cannot remove OWNER

### Membership Data Model

```typescript
interface ClubMembership {
  clubId: string;
  userId: string;

  // Role
  role: ClubRole;

  // Status
  status: 'active' | 'pending';
  joinSource: 'invite' | 'created' | 'code';
  inviteCode?: string;

  // Access
  squadIds?: string[];             // Which squads member belongs to
  canPostAsClub?: boolean;

  // Timestamps
  joinedAt: string;
}
```

---

## Invite Codes

### Invite Code Structure

```typescript
interface ClubInvite {
  code: string;                    // "LIONS-COACH"
  clubId: string;
  clubName: string;

  // Creator
  createdBy: string;
  createdByName: string;

  // Role Granted
  role: ClubRole;

  // Limits
  expiresAt: string;
  remainingUses: number;

  createdAt: string;
}
```

### Invite Validation Flow

```
User enters code
        │
        ▼
Convert to uppercase
        │
        ▼
Search invites
        │
        ▼
┌───────────────────┐
│   Code exists?    │
└─────────┬─────────┘
          │
    ┌─────┴─────┐
    │ NO        │ YES
    ▼           ▼
  Error    Check expiration
           & remaining uses
                  │
           ┌──────┴──────┐
           │ Invalid     │ Valid
           ▼             ▼
         Error      Create membership
                    with assigned role
```

### Example Invite Codes

| Code | Club | Role | Uses Remaining |
|------|------|------|----------------|
| `LIONS-CLUB` | Lions FC | HEAD_COACH | 8 |
| `LIONS-COACH` | Lions FC | COACH | 15 |
| `EAGLES-JOIN` | East London Eagles | MEMBER | Unlimited |

---

## Squad System

### Squad Structure

```typescript
interface ClubSquad {
  id: string;
  clubId: string;

  // Identity
  name: string;                    // "U15 Performance"
  level: string;                   // "U15 · Competitive"

  // Roster
  memberCount: number;
  primaryCoach: string;            // Coach ID

  // Schedule
  meetLocation: string;
  nextSession?: string;

  // Tags
  tags?: string[];                 // ["Pressing", "Finishing"]

  // Age Range
  ageMin?: number;
  ageMax?: number;
}
```

### Squad Member

```typescript
interface SquadMember {
  id: string;
  squadId: string;

  // Athlete
  athleteId: string;
  athleteName: string;
  athleteAge?: number;
  athletePhotoUrl?: string;

  // Parent
  parentId: string;
  parentName: string;
  parentEmail?: string;
  parentPhone?: string;

  // Status
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  joinedAt: string;

  // Position
  position?: string;
  jerseyNumber?: number;
}
```

---

## Club Feed

### Post Types

```typescript
type ClubPostType =
  | 'announcement'    // Official announcements
  | 'photo'           // Photo gallery
  | 'event'           // Event post
  | 'general'         // General discussion
  | 'achievement'     // Badge awarded
  | 'session'         // Training post
  | 'match';          // Match update
```

### Post Structure

```typescript
interface ClubFeedPost {
  id: string;
  clubId: string;

  // Content
  title: string;
  body: string;
  postType?: ClubPostType;
  attachments?: string[];
  imageUrl?: string;

  // Targeting
  audience: 'club' | 'squad' | 'staff';
  audienceLabel?: string;
  squadIds?: string[];             // For squad-targeted posts

  // Author
  authorId: string;
  authorName: string;
  postAs?: 'club' | 'self';

  // Engagement
  reactionCount?: number;
  commentCount?: number;

  // Pinning
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: string;

  // Event-specific
  eventDate?: string;
  eventLocation?: string;

  // Achievement-specific
  athleteId?: string;
  athleteName?: string;
  badgeId?: string;

  createdAt: string;
}
```

### Audience Targeting

| Audience | Who Sees |
|----------|----------|
| `club` | All club members |
| `squad` | Only members of specified squads |
| `staff` | COACH, ADMIN, OWNER only |

**Note:** Audience filtering is currently defined but NOT enforced (known issue).

### Feed Filtering

```
┌────────┬────────────────┬────────┬────────┐
│  All   │ Announcements  │ Photos │ Events │
│  (24)  │     (3)        │  (8)   │  (5)   │
└────────┴────────────────┴────────┴────────┘
```

---

## Academy System

### Academy vs Club

| Feature | Club | Academy |
|---------|------|---------|
| Creation | Simple name form | 4-step wizard |
| Branding | Basic badge | Full branding |
| Roles | 5 roles | 6 roles |
| Permissions | Binary | Fine-grained |
| Discovery | Members only | Can be public |
| Approval | Auto-join | Optional approval |

### Academy Structure

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

  // Ownership
  ownerId: string;
  ownerName: string;

  createdAt: string;
}
```

### Academy Roles & Permissions

```typescript
type AcademyRole =
  | 'OWNER'
  | 'ADMIN'
  | 'HEAD_COACH'
  | 'COACH'
  | 'ASSISTANT'
  | 'MEMBER';

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
- Multi-select: Dribbling, Passing, Finishing, Defending, Goalkeeping, Conditioning

**Step 4: Review**
- Confirm all details
- Note: "Customize branding after creation"

---

## Member Management

### Removal Flow

```
Long-press on member
        │
        ▼
Action sheet appears
        │
        ▼
Select removal reason
        │
        ▼
Confirm removal
        │
        ▼
Member removed
        │
        ▼
[UNDO] available (5 seconds)
        │
        ▼
Removal record created
```

### Removal Reasons

```typescript
type MemberRemovalReason =
  | 'LEFT_CLUB'      // Voluntary departure
  | 'INACTIVE'       // No activity
  | 'CONDUCT'        // Behavior issues
  | 'SEASON_END'     // End of season
  | 'OTHER';         // Custom reason
```

### Removal Record

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

  // For undo
  originalMembership?: ClubMembership;
}
```

---

## Services

### club-service.ts

```typescript
class ClubService {
  // CRUD
  createClub(params: CreateClubParams): Promise<Club>
  getClub(id: string): Promise<Club>
  updateClub(id: string, data: Partial<Club>): Promise<Club>
  deleteClub(id: string): Promise<void>

  // Membership
  getMembers(clubId: string): Promise<ClubMembership[]>
  addMember(clubId: string, userId: string, role: ClubRole): Promise<ClubMembership>
  updateMemberRole(clubId: string, userId: string, role: ClubRole): Promise<ClubMembership>
  removeMember(clubId: string, userId: string, reason: MemberRemovalReason): Promise<void>

  // Invites
  createInviteCode(clubId: string, role: ClubRole, expiresIn: number): Promise<ClubInvite>
  validateInviteCode(code: string): Promise<ClubInvite | null>
  joinWithCode(code: string, userId: string): Promise<ClubMembership>

  // Feed
  getFeed(clubId: string): Promise<ClubFeedPost[]>
  createPost(clubId: string, post: Omit<ClubFeedPost, 'id'>): Promise<ClubFeedPost>
  pinPost(postId: string, pinnedBy: string): Promise<ClubFeedPost>
  unpinPost(postId: string): Promise<ClubFeedPost>
}
```

### squad-service.ts

```typescript
class SquadService {
  // CRUD
  createSquad(clubId: string, params: CreateSquadParams): Promise<ClubSquad>
  getSquad(id: string): Promise<ClubSquad>
  getClubSquads(clubId: string): Promise<ClubSquad[]>
  updateSquad(id: string, data: Partial<ClubSquad>): Promise<ClubSquad>
  deleteSquad(id: string): Promise<void>

  // Members
  getSquadMembers(squadId: string): Promise<SquadMember[]>
  addMember(squadId: string, athleteId: string, parentId: string): Promise<SquadMember>
  removeMember(squadId: string, athleteId: string): Promise<void>
}
```

### academy-service.ts

```typescript
class AcademyService {
  // CRUD
  createAcademy(params: CreateAcademyParams): Promise<Academy>
  getAcademy(id: string): Promise<Academy>
  updateAcademy(id: string, data: Partial<Academy>): Promise<Academy>

  // Staff
  getStaff(academyId: string): Promise<StaffMember[]>
  addStaff(academyId: string, userId: string, role: AcademyRole): Promise<StaffMember>
  updateStaffRole(academyId: string, userId: string, role: AcademyRole): Promise<StaffMember>
  removeStaff(academyId: string, userId: string): Promise<void>

  // Branding
  updateBranding(academyId: string, branding: AcademyBranding): Promise<Academy>
}
```

---

## Components

### Club Components

| Component | Path | Purpose |
|-----------|------|---------|
| `ClubHeader` | `/components/club/ClubHeader.tsx` | Club header |
| `MembersPanel` | `/components/club/MembersPanel.tsx` | Members list |
| `TeamsPanel` | `/components/club/TeamsPanel.tsx` | Squads list |
| `FeedPost` | `/components/club/FeedPost.tsx` | Post display |
| `EventsPanel` | `/components/club/EventsPanel.tsx` | Events section |
| `SessionsPanel` | `/components/club/SessionsPanel.tsx` | Sessions |
| `JoinClubCard` | `/components/club/JoinClubCard.tsx` | Join button |
| `MatchesPanel` | `/components/club/MatchesPanel.tsx` | Matches |

### Academy Components

| Component | Path | Purpose |
|-----------|------|---------|
| `academy-card` | `/components/academy/academy-card.tsx` | Academy display |
| `staff-role-picker` | `/components/academy/staff-role-picker.tsx` | Role selector |

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `club_members_${clubId}` | Club memberships |
| `club_member_removals` | Removal records |
| `squad_members` | Squad memberships |
| `academies` | Academy data |
| `academy_memberships` | Academy staff |
| `academy_invites` | Academy invitations |
| `club_feed_posts` | Feed posts |

---

## Files Reference

### Services
- `/services/club-service.ts`
- `/services/squad-service.ts`
- `/services/academy-service.ts`

### Screens
- `/app/(tabs)/club-hub.tsx`
- `/app/club/[id].tsx`
- `/app/club/create.tsx`
- `/app/club/invite-members.tsx`
- `/app/club/squad/create.tsx`
- `/app/academy/create.tsx`
- `/app/academy/[id]/*.tsx`

### Components
- `/components/club/*.tsx`
- `/components/academy/*.tsx`
- `/components/squad/*.tsx`
