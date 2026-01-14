# API Contracts

> Complete API reference for backend integration, with request/response formats and authentication requirements.

---

## IMPORTANT: Implementation Status

```
┌─────────────────────────────────────────────────────────────────┐
│                     ⚠️  PLANNED / FUTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   These API contracts are SPECIFICATIONS for future backend     │
│   implementation. They are NOT currently implemented.           │
│                                                                 │
│   Current State:                                                │
│   • All data is stored locally via AsyncStorage                 │
│   • Services use mock data for development                      │
│   • No actual REST API endpoints exist                          │
│   • No authentication server implemented                        │
│                                                                 │
│   This document serves as a DESIGN REFERENCE for when           │
│   backend development begins.                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Overview

The Clubroom API is designed as a RESTful service with JSON payloads. **Currently, all services use mock data via AsyncStorage.** These API contracts are defined for future backend implementation.

### Base URL

```
Production: https://api.clubroom.app/v1
Development: http://localhost:3000/api
```

### Authentication

All authenticated endpoints require a Bearer token:

```http
Authorization: Bearer <jwt_token>
```

---

## Authentication Endpoints

### Register User

```http
POST /auth/register
Content-Type: application/json

Request:
{
  "email": "parent@example.com",
  "password": "securePassword123",
  "fullName": "Sarah Baker",
  "role": "USER",
  "postcode": "SW1A 1AA"
}

Response: 201 Created
{
  "user": User,
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "parent@example.com",
  "password": "securePassword123"
}

Response: 200 OK
{
  "user": User,
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

Request:
{
  "refreshToken": "refresh_token_here"
}

Response: 200 OK
{
  "token": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

---

## User Endpoints

### Get Current User

```http
GET /users/me
Authorization: Bearer <token>

Response: 200 OK
User
```

### Update Profile

```http
PATCH /users/me
Authorization: Bearer <token>

Request:
{
  "fullName": "Sarah Jane Baker",
  "phone": "+44 7123 456789"
}

Response: 200 OK
User
```

### Get Children

```http
GET /users/me/children
Authorization: Bearer <token>

Response: 200 OK
Child[]
```

### Add Child

```http
POST /users/me/children
Authorization: Bearer <token>

Request:
{
  "name": "Tom Baker",
  "dateOfBirth": "2014-05-15",
  "gender": "Male",
  "primarySport": "Football"
}

Response: 201 Created
Child
```

---

## Coach Discovery

### Search Coaches

```http
GET /coaches/search
Authorization: Bearer <token>

Query Parameters:
- query: string (text search)
- lat: number (latitude)
- lng: number (longitude)
- radius: number (km, default 10)
- minRating: number (1-5)
- priceMin: number
- priceMax: number
- focuses: string[] (comma-separated)
- formats: string[] (comma-separated)
- sortBy: 'relevance' | 'distance' | 'rating' | 'price_low' | 'price_high'
- page: number (default 1)
- pageSize: number (default 20)

Response: 200 OK
{
  "results": CoachSearchResult[],
  "totalCount": number,
  "page": number,
  "pageSize": number,
  "hasMore": boolean,
  "filterOptions": FilterOptions
}
```

### Get Coach Profile

```http
GET /coaches/:coachId
Authorization: Bearer <token>

Response: 200 OK
CoachProfile
```

### Get Filter Options

```http
GET /coaches/filters
Authorization: Bearer <token>

Query Parameters:
- query: string (optional, to scope counts)

Response: 200 OK
FilterOptions
```

---

## Availability

### Get Available Slots

```http
GET /coaches/:coachId/availability
Authorization: Bearer <token>

Query Parameters:
- startDate: YYYY-MM-DD
- endDate: YYYY-MM-DD
- duration: number (minutes, optional)

Response: 200 OK
AvailabilitySlot[]
```

### Update Availability Template

```http
PUT /coaches/:coachId/availability/template
Authorization: Bearer <token>

Request:
AvailabilityTemplate

Response: 200 OK
AvailabilityTemplate
```

### Create Override

```http
POST /coaches/:coachId/availability/overrides
Authorization: Bearer <token>

Request:
{
  "date": "2026-01-20",
  "type": "BLOCKED",
  "reason": "Personal appointment"
}

Response: 201 Created
AvailabilityOverride
```

---

## Bookings

### Create Booking

```http
POST /bookings
Authorization: Bearer <token>

Request:
{
  "coachId": "coach_1",
  "athleteId": "child_1",
  "date": "2026-01-20",
  "startTime": "10:00",
  "duration": 60,
  "sessionType": "INDIVIDUAL",
  "sport": "Football",
  "location": "Coach's venue",
  "parentNotes": "Focus on dribbling"
}

Response: 201 Created
Booking
```

### Get User Bookings

```http
GET /bookings
Authorization: Bearer <token>

Query Parameters:
- status: BookingStatus (optional)
- upcoming: boolean (optional)
- page: number
- pageSize: number

Response: 200 OK
{
  "bookings": Booking[],
  "totalCount": number,
  "hasMore": boolean
}
```

### Get Booking Details

```http
GET /bookings/:bookingId
Authorization: Bearer <token>

Response: 200 OK
Booking
```

### Cancel Booking

```http
POST /bookings/:bookingId/cancel
Authorization: Bearer <token>

Request:
{
  "reason": "Schedule conflict"
}

Response: 200 OK
Booking
```

### Complete Booking

```http
POST /bookings/:bookingId/complete
Authorization: Bearer <token>

Request:
{
  "coachNotes": "Great session, improved ball control"
}

Response: 200 OK
Booking
```

---

## Session Invites

### Send Invite

```http
POST /session-invites
Authorization: Bearer <token>

Request:
{
  "parentId": "parent_1",
  "athleteIds": ["child_1", "child_2"],
  "sessionType": "GROUP",
  "duration": 60,
  "proposedSlots": [
    { "date": "2026-01-20", "startTime": "10:00" },
    { "date": "2026-01-21", "startTime": "14:00" }
  ],
  "pricePerAthlete": 35,
  "message": "Would love to work on passing"
}

Response: 201 Created
SessionInvite
```

### Respond to Invite

```http
POST /session-invites/:inviteId/respond
Authorization: Bearer <token>

Request:
{
  "action": "ACCEPT",
  "selectedSlotId": "slot_1"
}

Response: 200 OK
SessionInvite
```

---

## Clubs

### Get Club

```http
GET /clubs/:clubId
Authorization: Bearer <token>

Response: 200 OK
Club
```

### Join Club

```http
POST /clubs/join
Authorization: Bearer <token>

Request:
{
  "inviteCode": "BBFC2024"
}

Response: 200 OK
{
  "club": Club,
  "membership": ClubMembership
}
```

### Get Club Members

```http
GET /clubs/:clubId/members
Authorization: Bearer <token>

Query Parameters:
- role: ClubRole (optional)
- status: 'active' | 'pending' (optional)

Response: 200 OK
ClubMembership[]
```

### Create Squad

```http
POST /clubs/:clubId/squads
Authorization: Bearer <token>

Request:
{
  "name": "U12 Elite",
  "ageGroup": "Under 12",
  "memberIds": ["child_1", "child_2"]
}

Response: 201 Created
Squad
```

---

## Events

### Create Event

```http
POST /events
Authorization: Bearer <token>

Request:
{
  "clubId": "club_1",
  "title": "Summer Tournament",
  "description": "Annual 7-a-side tournament",
  "eventType": "TOURNAMENT",
  "date": "2026-07-20",
  "startTime": "09:00",
  "endTime": "16:00",
  "venue": "Sports Ground",
  "address": "123 Field Lane",
  "targetAudience": "ATHLETES",
  "maxAttendees": 80,
  "price": 15,
  "rsvpRequired": true,
  "rsvpDeadline": "2026-07-10"
}

Response: 201 Created
ClubEvent
```

### RSVP to Event

```http
POST /events/:eventId/rsvp
Authorization: Bearer <token>

Request:
{
  "status": "GOING",
  "guestCount": 2,
  "note": "Looking forward to it!"
}

Response: 200 OK
EventRSVP
```

### Check In to Event

```http
POST /events/:eventId/checkin
Authorization: Bearer <token>

Request:
{
  "location": {
    "latitude": 51.5074,
    "longitude": -0.1278
  },
  "guestsCheckedIn": 2
}

Response: 200 OK
EventAttendance
```

---

## Progress & Analytics

### Submit Skill Assessment

```http
POST /athletes/:athleteId/assessments
Authorization: Bearer <token>

Request:
{
  "sessionId": "booking_1",
  "skills": {
    "Dribbling": 7,
    "Passing": 6,
    "Finishing": 5
  },
  "strengths": ["Ball control", "Work rate"],
  "improvements": ["Weak foot"],
  "overallNotes": "Great progress this session"
}

Response: 201 Created
SkillAssessment
```

### Get Athlete Analytics

```http
GET /athletes/:athleteId/analytics
Authorization: Bearer <token>

Query Parameters:
- period: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL'

Response: 200 OK
AthleteAnalytics
```

### Get Coach Analytics

```http
GET /coaches/:coachId/analytics
Authorization: Bearer <token>

Query Parameters:
- period: 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL'

Response: 200 OK
CoachAnalytics
```

---

## Messaging

### Get Threads

```http
GET /messages/threads
Authorization: Bearer <token>

Response: 200 OK
MessageThread[]
```

### Send Message

```http
POST /messages/threads/:threadId/messages
Authorization: Bearer <token>

Request:
{
  "content": "Hi, about tomorrow's session...",
  "type": "TEXT"
}

Response: 201 Created
Message
```

---

## Reviews

### Submit Review

```http
POST /reviews
Authorization: Bearer <token>

Request:
{
  "coachId": "coach_1",
  "bookingId": "booking_1",
  "rating": 5,
  "title": "Excellent coach",
  "content": "Tom has improved so much..."
}

Response: 201 Created
Review
```

### Get Coach Reviews

```http
GET /coaches/:coachId/reviews
Authorization: Bearer <token>

Query Parameters:
- page: number
- pageSize: number

Response: 200 OK
{
  "reviews": Review[],
  "totalCount": number,
  "averageRating": number
}
```

---

## Wallet & Payments

### Get Wallet Balance

```http
GET /wallet
Authorization: Bearer <token>

Response: 200 OK
{
  "balance": 150.00,
  "currency": "GBP",
  "pendingBalance": 0
}
```

### Add Funds

```http
POST /wallet/deposit
Authorization: Bearer <token>

Request:
{
  "amount": 100,
  "paymentMethodId": "pm_card_visa"
}

Response: 200 OK
WalletTransaction
```

### Get Transactions

```http
GET /wallet/transactions
Authorization: Bearer <token>

Query Parameters:
- type: TransactionType (optional)
- page: number
- pageSize: number

Response: 200 OK
{
  "transactions": WalletTransaction[],
  "totalCount": number
}
```

---

## Error Responses

All endpoints may return these error formats:

### 400 Bad Request

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid email format",
  "details": {
    "field": "email",
    "constraint": "Must be a valid email address"
  }
}
```

### 401 Unauthorized

```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "error": "FORBIDDEN",
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "error": "NOT_FOUND",
  "message": "Booking not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

| Endpoint Category | Limit |
|------------------|-------|
| Authentication | 10 req/min |
| Search | 60 req/min |
| Standard | 120 req/min |
| Webhooks | 300 req/min |

Response headers include:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 1640000000
```

---

## Webhooks (Future)

For real-time integrations, webhooks will be available:

| Event | Payload |
|-------|---------|
| `booking.created` | Booking |
| `booking.cancelled` | Booking |
| `booking.completed` | Booking |
| `payment.received` | WalletTransaction |
| `review.submitted` | Review |
