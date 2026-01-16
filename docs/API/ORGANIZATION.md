# Organization API

> **Security Level: HIGH**

## Overview

The Organization API manages academies, clubs, and multi-coach organizations. Security focuses on tenant isolation, role-based access, and staff permission management.

---

## Security Implementation

### Multi-Tenancy Security
- **Complete data isolation** between organizations
- **Tenant ID in all queries** (enforced at DB level)
- **Cross-tenant access impossible** by design
- **Separate encryption keys** per organization (optional)

### Role Hierarchy
```
Organization Access Control:
├── Owner
│   ├── Full organization control
│   ├── Billing and subscription
│   ├── Delete organization
│   └── Transfer ownership
├── Admin
│   ├── Manage all staff
│   ├── View all data
│   ├── Manage settings
│   └── Cannot delete org
├── Manager
│   ├── Manage assigned areas
│   ├── View team data
│   └── Limited settings access
├── Coach (Staff)
│   ├── Own bookings only
│   ├── Own athletes only
│   └── No admin access
└── Assistant
    ├── View only
    └── No modifications
```

### Staff Permissions Matrix

| Permission | Owner | Admin | Manager | Coach | Assistant |
|------------|-------|-------|---------|-------|-----------|
| MANAGE_ORGANIZATION | Yes | No | No | No | No |
| MANAGE_BILLING | Yes | Yes | No | No | No |
| MANAGE_STAFF | Yes | Yes | Limited | No | No |
| VIEW_ALL_BOOKINGS | Yes | Yes | Yes | No | No |
| MANAGE_BOOKINGS | Yes | Yes | Yes | Own | No |
| VIEW_EARNINGS | Yes | Yes | Team | Own | No |
| MANAGE_ATHLETES | Yes | Yes | Yes | Own | No |
| MANAGE_SETTINGS | Yes | Yes | Limited | No | No |
| VIEW_ANALYTICS | Yes | Yes | Yes | Own | Yes |

---

## Academy Endpoints

### GET /organization

Get organization details.

**Security:**
- Organization members only
- Detail level based on role

**Response (200):**
```json
{
  "organization": {
    "id": "org_abc123",
    "name": "Elite Tennis Academy",
    "type": "ACADEMY",
    "logo": "https://cdn.clubroom.app/orgs/.../logo.png",
    "description": "Premier tennis coaching for all ages",
    "sport": "Tennis",
    "location": {
      "address": "123 Sports Lane, London",
      "coordinates": {
        "lat": 51.5074,
        "lng": -0.1278
      }
    },
    "stats": {
      "totalStaff": 8,
      "totalAthletes": 156,
      "activeBookings": 42
    },
    "subscription": {
      "plan": "PROFESSIONAL",
      "status": "ACTIVE",
      "renewsAt": "2026-02-01"
    },
    "createdAt": "2025-06-01T10:00:00Z"
  }
}
```

---

### PUT /organization

Update organization details.

**Security:**
- Owner or Admin only
- Logo upload via separate endpoint
- Audit logged

**Request:**
```json
{
  "name": "Elite Tennis Academy London",
  "description": "Updated description",
  "contactEmail": "contact@elitetennis.com",
  "contactPhone": "+44 20 1234 5678"
}
```

**Response (200):**
```json
{
  "organization": {
    "id": "org_abc123",
    "name": "Elite Tennis Academy London",
    "updatedAt": "2026-01-16T10:00:00Z"
  }
}
```

---

### GET /organization/staff

List organization staff.

**Security:**
- Admin+ for full list
- Managers see their team
- Coaches see colleagues (limited)

**Response (200):**
```json
{
  "staff": [
    {
      "id": "staff_001",
      "user": {
        "id": "usr_coach1",
        "name": "Sarah Johnson",
        "email": "sarah@elitetennis.com",
        "avatar": "https://cdn.clubroom.app/avatars/..."
      },
      "role": "COACH",
      "permissions": [
        "MANAGE_BOOKINGS",
        "MANAGE_ATHLETES",
        "VIEW_EARNINGS"
      ],
      "status": "ACTIVE",
      "joinedAt": "2025-08-15T10:00:00Z",
      "stats": {
        "activeAthletes": 24,
        "thisMonthSessions": 48
      }
    }
  ],
  "total": 8
}
```

---

### POST /organization/staff/invite

Invite new staff member.

**Security:**
- Admin+ only
- Cannot assign higher role than own
- Email verification required
- Audit logged

**Request:**
```json
{
  "email": "newcoach@example.com",
  "name": "John Davies",
  "role": "COACH",
  "permissions": [
    "MANAGE_BOOKINGS",
    "MANAGE_ATHLETES"
  ],
  "message": "Welcome to Elite Tennis Academy!"
}
```

**Response (201):**
```json
{
  "invite": {
    "id": "inv_staff123",
    "email": "newcoach@example.com",
    "role": "COACH",
    "status": "PENDING",
    "expiresAt": "2026-01-23T10:00:00Z",
    "inviteLink": "https://app.clubroom.app/org-invite/token_xxx"
  }
}
```

---

### PUT /organization/staff/:staffId

Update staff member.

**Security:**
- Admin+ only
- Cannot escalate above own role
- Permission changes audit logged

**Request:**
```json
{
  "role": "MANAGER",
  "permissions": [
    "MANAGE_BOOKINGS",
    "MANAGE_ATHLETES",
    "VIEW_EARNINGS",
    "MANAGE_STAFF"
  ]
}
```

**Response (200):**
```json
{
  "staff": {
    "id": "staff_001",
    "role": "MANAGER",
    "permissions": ["MANAGE_BOOKINGS", "MANAGE_ATHLETES", "VIEW_EARNINGS", "MANAGE_STAFF"],
    "updatedAt": "2026-01-16T10:00:00Z"
  }
}
```

---

### DELETE /organization/staff/:staffId

Remove staff member.

**Security:**
- Admin+ only
- Cannot remove owner
- Reassign athletes first
- Access immediately revoked

**Request:**
```json
{
  "reassignAthletesTo": "staff_002",
  "reason": "End of contract"
}
```

**Response (204):**
No content.

---

### GET /organization/analytics

Get organization analytics.

**Security:**
- Manager+ only
- Aggregated data only
- No individual athlete PII

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| period | string | "week", "month", "quarter", "year" |
| staffId | string | Filter by staff (optional) |

**Response (200):**
```json
{
  "analytics": {
    "period": "month",
    "revenue": {
      "total": 12450.00,
      "currency": "GBP",
      "change": 15.5,
      "breakdown": {
        "sessions": 10200.00,
        "packages": 2250.00
      }
    },
    "sessions": {
      "total": 312,
      "completed": 298,
      "cancelled": 14,
      "cancellationRate": 4.5
    },
    "athletes": {
      "total": 156,
      "new": 12,
      "churned": 3,
      "retention": 98.1
    },
    "staff": {
      "totalHours": 624,
      "averagePerCoach": 78,
      "topPerformer": {
        "id": "staff_001",
        "name": "Sarah Johnson",
        "sessions": 52
      }
    }
  }
}
```

---

## Club Endpoints

### GET /clubs

List clubs user belongs to.

**Security:**
- Members see their clubs
- Public info for discovery

**Response (200):**
```json
{
  "clubs": [
    {
      "id": "club_abc123",
      "name": "Central Tennis Club",
      "logo": "https://cdn.clubroom.app/clubs/.../logo.png",
      "sport": "Tennis",
      "memberCount": 342,
      "myRole": "MEMBER",
      "joinedAt": "2025-09-01T10:00:00Z"
    }
  ]
}
```

---

### GET /clubs/:clubId

Get club details.

**Security:**
- Members see full details
- Non-members see public info

**Response (200):**
```json
{
  "club": {
    "id": "club_abc123",
    "name": "Central Tennis Club",
    "description": "Community tennis club for all ages",
    "sport": "Tennis",
    "location": {
      "address": "456 Park Road, London"
    },
    "facilities": ["4 outdoor courts", "2 indoor courts", "Clubhouse"],
    "memberCount": 342,
    "admins": [
      {
        "id": "usr_admin1",
        "name": "Club Admin"
      }
    ],
    "upcomingEvents": 3
  }
}
```

---

### POST /clubs/:clubId/join

Request to join club.

**Security:**
- Authenticated users
- May require approval
- May have membership fee

**Request:**
```json
{
  "message": "I'd like to join the club",
  "referralCode": "MEMBER123"
}
```

**Response (200):**
```json
{
  "request": {
    "id": "req_abc123",
    "status": "PENDING_APPROVAL",
    "submittedAt": "2026-01-16T10:00:00Z"
  }
}
```

---

## Squad Endpoints

### GET /squads

List squads.

**Security:**
- Coach sees their squads
- Athletes see squads they're in

**Response (200):**
```json
{
  "squads": [
    {
      "id": "squad_abc123",
      "name": "Junior Development Squad",
      "description": "Ages 10-14, intermediate level",
      "memberCount": 12,
      "schedule": "Saturdays 10am-12pm",
      "coach": {
        "id": "usr_coach",
        "name": "Sarah Johnson"
      }
    }
  ]
}
```

---

### POST /squads

Create a squad.

**Security:**
- Coaches only
- Organization coaches need permission

**Request:**
```json
{
  "name": "Advanced Performance Squad",
  "description": "Competition-focused training",
  "ageRange": {
    "min": 14,
    "max": 18
  },
  "skillLevel": "Advanced",
  "maxMembers": 8
}
```

**Response (201):**
```json
{
  "squad": {
    "id": "squad_new123",
    "name": "Advanced Performance Squad",
    "createdAt": "2026-01-16T10:00:00Z"
  }
}
```

---

### POST /squads/:squadId/members

Add member to squad.

**Security:**
- Squad coach only
- Parent consent for minors
- Capacity check

**Request:**
```json
{
  "athleteId": "ath_123",
  "notifyParent": true
}
```

**Response (200):**
```json
{
  "membership": {
    "squadId": "squad_abc123",
    "athleteId": "ath_123",
    "joinedAt": "2026-01-16T10:00:00Z"
  }
}
```

---

## Data Isolation

### Database Query Pattern

All organization queries include tenant isolation:

```sql
-- Every query automatically scoped
SELECT * FROM bookings
WHERE organization_id = $tenant_id
AND id = $booking_id;

-- Cross-tenant queries impossible
-- No organization_id bypass available
```

### Row-Level Security

```sql
-- PostgreSQL RLS policy
CREATE POLICY org_isolation ON bookings
FOR ALL
USING (organization_id = current_setting('app.current_org')::uuid);
```

---

## Audit Trail

All organization actions logged:

```json
{
  "action": "STAFF_PERMISSION_CHANGED",
  "organizationId": "org_abc123",
  "performedBy": {
    "userId": "usr_admin",
    "role": "ADMIN"
  },
  "target": {
    "staffId": "staff_001",
    "userId": "usr_coach1"
  },
  "changes": {
    "roleBefore": "COACH",
    "roleAfter": "MANAGER",
    "permissionsAdded": ["MANAGE_STAFF"],
    "permissionsRemoved": []
  },
  "timestamp": "2026-01-16T10:00:00Z",
  "ipAddress": "hash(ip)"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| ORG_001 | Organization not found |
| ORG_002 | Not authorized (role insufficient) |
| ORG_003 | Cannot modify own role |
| ORG_004 | Cannot remove owner |
| ORG_005 | Staff member not found |
| ORG_006 | Invite expired |
| ORG_007 | Maximum staff reached (plan limit) |
| ORG_008 | Cannot escalate permissions |
| ORG_009 | Squad full |
| ORG_010 | Club membership required |
