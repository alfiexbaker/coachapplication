# CLUBROOM DATA ARCHITECTURE & FEATURE ACCESS

## Core Entities (Single Source of Truth)

### User
```typescript
{
  id: string;
  email: string;
  role: 'ADMIN' | 'COACH' | 'USER' | 'PARENT';
  name: string;
  avatar?: string;
  postcode: string;
  dateOfBirth: string;
}
```

### Booking
```typescript
{
  id: string;
  coachId: string;           // Who's coaching
  athleteId: string;         // Who's being coached (child or self)
  bookedById: string;        // Who made the booking (parent or athlete)
  scheduledAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  duration: number;
  location: string;
  service: string;
  price: number;
}
```

### Session (completed booking)
```typescript
{
  id: string;
  bookingId: string;
  coachId: string;
  athleteId: string;         // Always the athlete who attended
  completedAt: string;
  performanceRating: number;
  skillsWorkedOn: string[];
  notes: string;
  videoUrls?: string[];
}
```

### Post (social feed)
```typescript
{
  id: string;
  authorId: string;
  authorRole: 'COACH' | 'USER';  // Only coaches and athletes post
  content: string;
  createdAt: string;
  likes: string[];           // User IDs who liked
  mediaUrls?: string[];
}
```

---

## Feature Access Matrix

| Feature | ADMIN | COACH | USER (Athlete) | PARENT |
|---------|-------|-------|----------------|--------|
| **DISCOVERY** | ❌ | ❌ | ✅ Find coaches | ✅ Find coaches (per child) |
| **BOOKINGS** | ✅ View all | ✅ Their sessions | ✅ Their sessions | ✅ Children's sessions |
| **PROGRESS/DEVELOPMENT** | ❌ | ✅ Track athletes | ✅ View own progress | ✅ Track children |
| **SOCIAL FEED** | ❌ | ✅ Post updates | ✅ Post & view | ❌ (view only?) |
| **MESSAGES** | ✅ (moderation) | ✅ Chat | ✅ Chat | ✅ Chat |
| **ANALYTICS** | ✅ Platform stats | ✅ Business metrics | ❌ | ❌ |
| **PROFILE** | ✅ Manage own | ✅ Edit coach profile | ✅ Edit profile | ✅ Manage children |

---

## Navigation Structure

### ADMIN
- **Users** → Platform stats
- **Bookings** → All bookings
- **Reports** → Moderation
- **Settings** → Admin settings

### COACH
- **Messages** → Chat with clients
- **Bookings** → Coaching sessions
- **Development** → Track athletes
- **Analytics** → Revenue, stats
- **Profile** → Coach profile

### USER (Athlete)
- **Home** → Social feed + upcoming
- **Find Coach** → Discovery
- **Bookings** → Their sessions
- **Messages** → Chat
- **Profile** → User profile

*Note: Progress accessible via quick action in Bookings*

### PARENT
- **Discover** → Find coaches
- **Bookings** → Children's sessions
- **Development** → Track children
- **Messages** → Chat
- **Profile** → Manage family

---

## Data Filtering Rules

### Bookings
- **ADMIN**: All bookings
- **COACH**: `booking.coachId === currentUser.id`
- **USER**: `booking.athleteId === currentUser.id`
- **PARENT**: `booking.athleteId IN [children.ids]`

### Sessions (Progress)
- **COACH**: `session.coachId === currentUser.id`
- **USER**: `session.athleteId === currentUser.id`
- **PARENT**: `session.athleteId IN [children.ids]` (with child selector)

### Posts (Social Feed)
- **ADMIN**: View all (moderation)
- **COACH**: Create & view all
- **USER**: Create & view all
- **PARENT**: View only (or not at all - decide)

### Messages
- **ADMIN**: View all (reports)
- **COACH**: `thread.participantIds includes currentUser.id`
- **USER**: `thread.participantIds includes currentUser.id`
- **PARENT**: `thread.participantIds includes currentUser.id`

---

## Database Schema (Future)

### Tables Needed
1. **users** (id, email, role, name, avatar, postcode, dob)
2. **relationships** (id, parentId, childId, type)
3. **bookings** (id, coachId, athleteId, bookedById, scheduledAt, status, ...)
4. **sessions** (id, bookingId, coachId, athleteId, completedAt, rating, ...)
5. **posts** (id, authorId, authorRole, content, createdAt, ...)
6. **post_likes** (id, postId, userId, createdAt)
7. **messages** (id, threadId, senderId, content, createdAt, ...)
8. **threads** (id, participant1Id, participant2Id, ...)

### Key Relationships
- **Parent → Children**: 1:many via relationships table
- **Booking → Session**: 1:1 when completed
- **User → Bookings**: 1:many (as bookedBy OR as athlete)
- **Coach → Bookings**: 1:many
- **Athlete → Sessions**: 1:many
- **User → Posts**: 1:many
- **Post → Likes**: 1:many

---

## Implementation Fixes Needed

### 1. Bookings Screen
**Current Issue**: USER role redirected to progress screen
**Fix**: Remove lines 58-61, show bookings for all roles

### 2. Parent Booking Filter
**Current Issue**: Filters by `clientId`
**Fix**: Filter by children's `athleteId`:
```typescript
const childrenIds = getChildrenForParent(currentUser.id).map(c => c.id);
return childrenIds.includes(booking.athleteId);
```

### 3. Progress Access
**Current Solution**: Quick action button in Bookings tab
**Keep**: AthleteProgressScreen accessible via button, not tab

### 4. Social Feed
**Decision Needed**: Should PARENTS see social feed?
- **Option A**: Parents view only (no posting)
- **Option B**: Parents hidden (athlete/coach community only)

---

## Single Source of Truth Principles

1. **Booking.athleteId** is ALWAYS the athlete (never parent)
2. **Booking.bookedById** tracks who made the booking
3. **Session.athleteId** matches the booking's athleteId
4. **Progress** is calculated from sessions, not stored separately
5. **Posts** are created by COACH or USER only (not PARENT/ADMIN)
6. **All data filters** use the same field names consistently

---

This architecture ensures:
- Clear data ownership
- Consistent filtering across screens
- Future database migration ready
- No duplicate sources of truth
