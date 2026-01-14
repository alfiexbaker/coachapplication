# Events & Matches System

> Complete club event management with RSVP tracking, attendance check-in, and event analytics.

---

## Overview

The Events system enables clubs to organize tournaments, social gatherings, meetings, and presentations with full RSVP management, attendance tracking, and real-time statistics.

### Key Features

| Feature | Description |
|---------|-------------|
| Event Types | Tournament, Social, Meeting, Presentation, Fundraiser, Trial Day, Training Camp |
| RSVP Management | Going/Maybe/Can't Go with guest counts |
| Attendance Tracking | Check-in with location validation |
| Target Audiences | All, Coaches, Parents, Athletes, Specific Squads |
| Virtual Events | Zoom/Meet links for online events |
| Pricing | Free or paid events with currency support |

---

## Event Types

| Type | Icon | Color | Use Case |
|------|------|-------|----------|
| TOURNAMENT | trophy | #F59E0B | Competitive events |
| SOCIAL | people | #8B5CF6 | Club gatherings, BBQs |
| MEETING | chatbubbles | #3B82F6 | Parents meetings, AGMs |
| PRESENTATION | ribbon | #10B981 | Awards ceremonies |
| FUNDRAISER | cash | #EC4899 | Charity events |
| TRIAL_DAY | football | #06B6D4 | New player trials |
| TRAINING_CAMP | fitness | #EF4444 | Intensive training |
| OTHER | calendar | #6B7280 | General events |

---

## Event Flow

```
CREATE EVENT                    PUBLISH                    EVENT DAY
    │                              │                           │
    ▼                              ▼                           ▼
┌─────────┐                 ┌─────────────┐            ┌───────────────┐
│  DRAFT  │ ───────────────▶│  PUBLISHED  │───────────▶│   CHECK-IN    │
└─────────┘                 └─────────────┘            └───────────────┘
                                   │                           │
                                   │                           ▼
                            ┌──────┴──────┐            ┌───────────────┐
                            ▼             ▼            │  ATTENDANCE   │
                     ┌──────────┐  ┌───────────┐       │    STATS      │
                     │   RSVP   │  │  INVITE   │       └───────────────┘
                     │ GOING/   │  │  SQUADS   │
                     │ MAYBE    │  │           │
                     └──────────┘  └───────────┘
```

---

## Data Models

### ClubEvent

```typescript
interface ClubEvent {
  id: string;
  clubId: string;
  clubName: string;
  createdBy: string;
  createdByName: string;

  // Event Details
  title: string;
  description: string;
  eventType: ClubEventType;
  imageUrl?: string;

  // Schedule
  date: string;           // YYYY-MM-DD
  startTime: string;      // HH:MM
  endTime?: string;

  // Location
  venue: string;
  address?: string;
  isVirtual: boolean;
  meetingLink?: string;   // For virtual events

  // Targeting
  targetAudience: EventTargetAudience;
  squadIds?: string[];    // For squad-specific events

  // Capacity & Pricing
  maxAttendees?: number;
  price: number;
  currency: string;

  // RSVP Settings
  rsvpRequired: boolean;
  rsvpDeadline?: string;

  // Attendees
  attendees: EventAttendee[];

  // Status
  status: EventStatus;    // DRAFT | PUBLISHED | CANCELLED | COMPLETED
  createdAt: string;
}
```

### EventTargetAudience

```typescript
type EventTargetAudience =
  | 'ALL'        // Everyone in club
  | 'COACHES'    // Coaches only
  | 'PARENTS'    // Parents only
  | 'ATHLETES'   // Athletes only
  | 'SQUAD';     // Specific squads
```

### EventAttendee

```typescript
interface EventAttendee {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  status: RSVPStatus;     // GOING | MAYBE | NOT_GOING
  guestCount: number;
  respondedAt: string;
}
```

### EventRSVP

```typescript
interface EventRSVP {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';
  status: RSVPStatus;
  guestCount: number;
  respondedAt: string;
  updatedAt?: string;
  note?: string;          // Personal message
}
```

### EventAttendance (Check-in)

```typescript
interface EventAttendance {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  userRole: 'COACH' | 'PARENT' | 'ATHLETE';

  // Check-in details
  checkedInAt: string;
  checkedInBy?: string;
  checkedInByName?: string;
  checkInMethod: 'SELF' | 'COACH' | 'QR_CODE';

  // Location validation
  checkInLocation?: {
    latitude: number;
    longitude: number;
  };
  locationValidated?: boolean;
  distanceFromVenue?: number;  // meters

  guestsCheckedIn: number;
  notes?: string;
}
```

### EventAttendanceStats

```typescript
interface EventAttendanceStats {
  eventId: string;
  rsvpCounts: {
    going: number;
    notGoing: number;
    maybe: number;
    noResponse: number;
  };
  expectedGuests: number;
  capacity?: number;
  checkedInCount: number;
  guestsCheckedInCount: number;
  attendanceRate: number;     // percentage
  byRole: {
    coaches: { rsvp: number; checkedIn: number };
    parents: { rsvp: number; checkedIn: number };
    athletes: { rsvp: number; checkedIn: number };
  };
  updatedAt: string;
}
```

---

## Event Creation

### Required Fields

| Field | Description |
|-------|-------------|
| title | Event name |
| description | Event details |
| eventType | Type of event |
| date | Event date |
| startTime | Start time |
| venue | Location name |
| targetAudience | Who can see/attend |

### Optional Fields

| Field | Description |
|-------|-------------|
| endTime | End time |
| address | Full address |
| maxAttendees | Capacity limit |
| price | Entry fee |
| rsvpDeadline | RSVP cutoff date |
| imageUrl | Event banner image |

---

## RSVP System

### RSVP Statuses

| Status | Icon | Color | Description |
|--------|------|-------|-------------|
| GOING | checkmark-circle | #10B981 | Confirmed attendance |
| MAYBE | help-circle | #F59E0B | Tentative |
| NOT_GOING | close-circle | #EF4444 | Cannot attend |

### Guest Management

- Each RSVP can include additional guests
- Guest count tracks family members or companions
- Total attendance = RSVP count + guest count

---

## Check-in System

### Check-in Methods

| Method | Description |
|--------|-------------|
| SELF | Member checks in themselves |
| COACH | Coach marks member as present |
| QR_CODE | Scan QR code at venue |

### Location Validation

For in-person events, check-in validates location:

```typescript
const LOCATION_THRESHOLD = 500;  // meters

// Validates user is within 500m of venue
const isValid = distanceFromVenue <= LOCATION_THRESHOLD;
```

### Check-in Availability

Check-in opens 2 hours before event and closes at event end:

```typescript
function isCheckInAvailable(event): boolean {
  if (event.status !== 'PUBLISHED') return false;
  if (event.date !== today) return false;

  const checkInStart = eventStart - 2 hours;
  const checkInEnd = eventEnd || eventStart + 3 hours;

  return now >= checkInStart && now <= checkInEnd;
}
```

---

## Event Service

**File:** `services/event-service.ts`

### Event Management

```typescript
const eventService = {
  // Create & manage events
  createEvent(input): Promise<ClubEvent>;
  publishEvent(eventId): Promise<ClubEvent>;
  cancelEvent(eventId): Promise<ClubEvent>;
  getEvent(eventId): Promise<ClubEvent | null>;

  // Event lists
  getUpcomingEvents(clubId): Promise<ClubEvent[]>;
  getAllClubEvents(clubId): Promise<ClubEvent[]>;

  // Invitations
  inviteClub(eventId): Promise<void>;
  inviteSquads(eventId, squadIds): Promise<void>;
}
```

### RSVP Management

```typescript
const eventService = {
  // RSVP operations
  rsvp(eventId, userId, userName, userRole, status, guestCount): Promise<EventAttendee>;
  submitRSVP(input: SubmitRSVPInput): Promise<EventRSVP>;
  updateRSVP(rsvpId, status, guestCount?): Promise<EventRSVP>;

  // RSVP queries
  getEventRSVPs(eventId): Promise<EventRSVP[]>;
  getUserRSVPs(userId): Promise<EventRSVP[]>;
  getUserEventRSVP(eventId, userId): Promise<EventRSVP | null>;

  // Attendee helpers
  getEventAttendees(eventId): Promise<EventAttendee[]>;
  getAttendeeCounts(attendees): { going, maybe, notGoing, totalGuests };
  getUserRSVP(attendees, userId): EventAttendee | undefined;
}
```

### Attendance Tracking

```typescript
const eventService = {
  // Check-in operations
  checkIn(input: CheckInInput): Promise<EventAttendance>;
  removeCheckIn(eventId, userId): Promise<void>;

  // Attendance queries
  getAttendeeList(eventId): Promise<EventAttendance[]>;
  isUserCheckedIn(eventId, userId): Promise<boolean>;
  getUserAttendance(eventId, userId): Promise<EventAttendance | null>;

  // Statistics
  getAttendanceStats(eventId): Promise<EventAttendanceStats>;
}
```

### Helper Methods

```typescript
const eventService = {
  // Formatting
  formatEventType(type): string;
  getEventTypeIcon(type): string;
  getEventTypeColor(type): string;
  formatAudience(audience): string;
  formatPrice(price, currency): string;
  formatEventDate(date): string;
  formatEventTime(startTime, endTime?): string;

  // RSVP helpers
  formatRSVPStatus(status): string;
  getRSVPStatusColor(status): string;
  getRSVPStatusIcon(status): string;

  // Status checks
  isRSVPClosed(event): boolean;
  isEventFull(event): boolean;
  isEventToday(event): boolean;
  isCheckInAvailable(event): boolean;

  // Time formatting
  formatTimeAgo(dateString): string;
}
```

---

## UI Components

### Event Card
**File:** `components/event/event-card.tsx`

Displays event summary:
- Event type icon with color
- Title and description
- Date and time
- Venue or "Online" badge
- RSVP counts
- Price (or "Free")

### Check-in Button
**File:** `components/event/CheckInButton.tsx`

Dynamic button states:
- "Check In" when available
- "Checked In ✓" when complete
- Disabled outside check-in window

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `club_events` | All event data |
| `event_rsvps` | RSVP records |
| `event_attendance` | Check-in records |

---

## API Contracts

### Create Event

```http
POST /api/events
Body: CreateEventInput
Response: ClubEvent
```

### Get Club Events

```http
GET /api/events?clubId=club_1&upcoming=true
Response: ClubEvent[]
```

### Submit RSVP

```http
POST /api/events/:eventId/rsvp
Body: { userId, userName, userRole, status, guestCount, note? }
Response: EventRSVP
```

### Check In

```http
POST /api/events/:eventId/checkin
Body: CheckInInput
Response: EventAttendance
```

### Get Attendance Stats

```http
GET /api/events/:eventId/stats
Response: EventAttendanceStats
```

---

## File References

| Purpose | Path |
|---------|------|
| Service | `services/event-service.ts` |
| Event Card | `components/event/event-card.tsx` |
| Check-in Button | `components/event/CheckInButton.tsx` |
| Types | `constants/types.ts` |
| Tests | `__tests__/events/rsvp-attendance.test.ts` |
