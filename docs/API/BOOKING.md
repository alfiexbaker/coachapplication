# Booking API

> **Security Level: HIGH**

## Overview

The Booking API manages session creation, modification, and cancellation. Security focuses on authorization, preventing double-bookings, and protecting session details.

---

## Security Implementation

### Authorization Model
```
Booking Access Control:
├── Athlete/Parent (bookedBy)
│   ├── Can view booking details
│   ├── Can cancel (with policy)
│   └── Can modify (before confirmation)
├── Coach
│   ├── Can view all their bookings
│   ├── Can confirm/decline pending
│   ├── Can mark complete
│   └── Can add session notes
└── Admin
    └── Full access (audit logged)
```

### Data Protection
- Session locations masked until confirmed
- Coach contact info hidden until booking confirmed
- Payment details never exposed
- Session notes visible only to coach + athlete

### Business Rules (Server-Enforced)
- Cannot book unavailable slots
- Cannot double-book same time
- Cancellation policy enforced
- Refunds calculated server-side

---

## Endpoints

### GET /bookings

List user's bookings.

**Security:**
- User sees only their bookings
- Coaches see their sessions
- Pagination required

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| from | date | Start date filter |
| to | date | End date filter |
| limit | number | Max 50, default 20 |
| cursor | string | Pagination cursor |

**Response (200):**
```json
{
  "bookings": [
    {
      "id": "bkg_abc123",
      "coach": {
        "id": "coach_xyz",
        "name": "Sarah Johnson",
        "avatar": "https://cdn.clubroom.app/avatars/..."
      },
      "athletes": [
        {
          "id": "ath_123",
          "name": "Tom Smith"
        }
      ],
      "status": "CONFIRMED",
      "scheduledAt": "2026-01-20T14:00:00Z",
      "duration": 60,
      "location": "Central Tennis Club",
      "price": 45.00,
      "currency": "GBP"
    }
  ],
  "nextCursor": "cursor_xyz",
  "hasMore": true
}
```

---

### GET /bookings/:bookingId

Get booking details.

**Security:**
- Only authorized users (athlete, parent, coach)
- Sensitive fields shown only after confirmation

**Response (200):**
```json
{
  "id": "bkg_abc123",
  "coach": {
    "id": "coach_xyz",
    "name": "Sarah Johnson",
    "avatar": "https://cdn.clubroom.app/avatars/...",
    "phone": "+44 7xxx xxx xxx",
    "email": "coach@example.com"
  },
  "athletes": [
    {
      "id": "ath_123",
      "name": "Tom Smith",
      "skillLevel": "Intermediate"
    }
  ],
  "bookedBy": {
    "id": "usr_parent",
    "name": "John Smith"
  },
  "status": "CONFIRMED",
  "scheduledAt": "2026-01-20T14:00:00Z",
  "duration": 60,
  "location": {
    "name": "Central Tennis Club",
    "address": "123 Sports Lane, London",
    "coordinates": {
      "lat": 51.5074,
      "lng": -0.1278
    }
  },
  "price": 45.00,
  "currency": "GBP",
  "notes": "Focus on backhand technique",
  "createdAt": "2026-01-15T10:00:00Z",
  "confirmedAt": "2026-01-15T11:00:00Z"
}
```

**Note:** `coach.phone` and `coach.email` only shown when status is CONFIRMED.

---

### POST /bookings

Create a new booking.

**Security:**
- Validates slot availability (server-side)
- Prevents double-booking
- Validates payment capability
- Rate limited

**Request:**
```json
{
  "coachId": "coach_xyz",
  "athleteIds": ["ath_123"],
  "scheduledAt": "2026-01-20T14:00:00Z",
  "duration": 60,
  "location": "loc_central_tennis",
  "notes": "Focus on backhand technique",
  "paymentMethod": "wallet"
}
```

**Response (201):**
```json
{
  "booking": {
    "id": "bkg_abc123",
    "status": "PENDING",
    "scheduledAt": "2026-01-20T14:00:00Z",
    "duration": 60,
    "price": 45.00,
    "currency": "GBP"
  },
  "payment": {
    "status": "AUTHORIZED",
    "amount": 45.00,
    "holdId": "hold_xyz"
  }
}
```

**Validation:**
| Check | Error if Failed |
|-------|-----------------|
| Slot available | SLOT_NOT_AVAILABLE |
| Coach accepts athlete | ATHLETE_NOT_ACCEPTED |
| Sufficient balance | INSUFFICIENT_FUNDS |
| Within booking window | OUTSIDE_BOOKING_WINDOW |
| Athletes authorized | UNAUTHORIZED_ATHLETES |

---

### PUT /bookings/:bookingId

Update booking details.

**Security:**
- Only booker can modify
- Only pending bookings can be modified
- Cannot change time without coach approval

**Request:**
```json
{
  "notes": "Updated: focus on serve",
  "location": "loc_new_venue"
}
```

**Response (200):**
```json
{
  "booking": {
    "id": "bkg_abc123",
    "status": "PENDING",
    "notes": "Updated: focus on serve",
    "updatedAt": "2026-01-16T12:00:00Z"
  }
}
```

---

### POST /bookings/:bookingId/confirm

Coach confirms a pending booking.

**Security:**
- Only coach can confirm
- Only pending bookings
- Triggers payment capture
- Audit logged

**Request:**
```json
{
  "message": "Looking forward to our session!"
}
```

**Response (200):**
```json
{
  "booking": {
    "id": "bkg_abc123",
    "status": "CONFIRMED",
    "confirmedAt": "2026-01-16T12:00:00Z"
  },
  "payment": {
    "status": "CAPTURED",
    "amount": 45.00
  }
}
```

---

### POST /bookings/:bookingId/cancel

Cancel a booking.

**Security:**
- Authorized user only (booker or coach)
- Cancellation policy enforced
- Refund calculated server-side
- Audit logged

**Request:**
```json
{
  "reason": "Schedule conflict"
}
```

**Response (200):**
```json
{
  "booking": {
    "id": "bkg_abc123",
    "status": "CANCELLED",
    "cancelledAt": "2026-01-16T12:00:00Z",
    "cancelledBy": "usr_parent"
  },
  "refund": {
    "amount": 45.00,
    "percentage": 100,
    "policy": "Full refund (48+ hours notice)",
    "walletCredited": true
  }
}
```

**Cancellation Policy:**
| Notice Period | Refund |
|---------------|--------|
| 48+ hours | 100% |
| 24-48 hours | 50% |
| < 24 hours | 0% |
| Coach cancels | 100% + credit |

---

### POST /bookings/:bookingId/complete

Coach marks session as complete.

**Security:**
- Only coach can complete
- Only confirmed bookings
- Only after scheduled time
- Triggers earnings release

**Request:**
```json
{
  "sessionNotes": {
    "skillsWorkedOn": ["Backhand", "Footwork"],
    "performanceRating": 4,
    "nextFocusAreas": ["Serve consistency"],
    "notes": "Great improvement on backhand!"
  }
}
```

**Response (200):**
```json
{
  "booking": {
    "id": "bkg_abc123",
    "status": "COMPLETED",
    "completedAt": "2026-01-20T15:05:00Z"
  },
  "earnings": {
    "amount": 40.50,
    "platformFee": 4.50,
    "releasedAt": "2026-01-20T15:05:00Z"
  }
}
```

---

### POST /bookings/:bookingId/reschedule

Request to reschedule a booking.

**Security:**
- Authorized user only
- Requires other party approval
- Validates new slot availability

**Request:**
```json
{
  "newScheduledAt": "2026-01-22T14:00:00Z",
  "reason": "Work conflict"
}
```

**Response (200):**
```json
{
  "rescheduleRequest": {
    "id": "rsch_abc",
    "originalTime": "2026-01-20T14:00:00Z",
    "proposedTime": "2026-01-22T14:00:00Z",
    "status": "PENDING_APPROVAL",
    "expiresAt": "2026-01-17T12:00:00Z"
  }
}
```

---

## Data Protection

### Sensitive Fields by Status

| Field | PENDING | CONFIRMED | COMPLETED |
|-------|---------|-----------|-----------|
| Coach name | Yes | Yes | Yes |
| Coach phone | No | Yes | Yes |
| Coach email | No | Yes | Yes |
| Full address | No | Yes | Yes |
| Session notes | N/A | N/A | Authorized only |
| Payment details | Never | Never | Never |

### Audit Trail

All booking actions logged:
```json
{
  "action": "BOOKING_CANCELLED",
  "bookingId": "bkg_abc123",
  "userId": "usr_parent",
  "timestamp": "2026-01-16T12:00:00Z",
  "metadata": {
    "reason": "Schedule conflict",
    "refundAmount": 45.00
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| BKG_001 | Slot not available |
| BKG_002 | Insufficient funds |
| BKG_003 | Booking not found |
| BKG_004 | Not authorized |
| BKG_005 | Invalid status transition |
| BKG_006 | Outside booking window |
| BKG_007 | Athlete not in roster |
| BKG_008 | Coach not available |
