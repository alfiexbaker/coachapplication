# Family API

> **Security Level: CRITICAL (Child Data)**

## Overview

The Family API manages parent-child relationships, guardian access, and family booking permissions. Special attention to COPPA compliance and child data protection.

---

## Security Implementation

### COPPA Compliance
- **Verifiable Parental Consent** required for child accounts
- **Data minimization** for children under 13
- **No marketing** to children
- **Parent controls** all child data access

### Authorization Model
```
Family Access Control:
├── Primary Parent
│   ├── Full control over child accounts
│   ├── Can invite/remove guardians
│   ├── Can delete child data
│   └── Receives all notifications
├── Secondary Parent/Guardian
│   ├── View child profiles (if permitted)
│   ├── Book sessions (if permitted)
│   └── View session history (if permitted)
└── Coach
    └── See only assigned athletes
```

### Guardian Permission Levels
| Permission | VIEWER | GUARDIAN | PARENT |
|------------|--------|----------|--------|
| View profile | Yes | Yes | Yes |
| View sessions | Yes | Yes | Yes |
| Book sessions | No | Yes | Yes |
| Cancel sessions | No | Yes | Yes |
| Edit profile | No | No | Yes |
| Manage guardians | No | No | Yes |
| Delete account | No | No | Yes |

---

## Endpoints

### GET /family

Get family overview.

**Security:**
- Parent only
- Shows all children and guardians
- Activity summary included

**Response (200):**
```json
{
  "family": {
    "id": "fam_abc123",
    "members": [
      {
        "id": "child_123",
        "name": "Tom Smith",
        "age": 12,
        "sport": "Tennis",
        "skillLevel": "Intermediate",
        "avatar": "https://cdn.clubroom.app/avatars/...",
        "upcomingSessions": 2,
        "relationship": "PARENT_CHILD"
      }
    ],
    "guardians": [
      {
        "id": "guard_456",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "role": "GUARDIAN",
        "childAccess": ["child_123"],
        "permissions": ["VIEW", "BOOK"],
        "invitedAt": "2026-01-01T10:00:00Z",
        "acceptedAt": "2026-01-02T10:00:00Z"
      }
    ],
    "pendingInvites": [
      {
        "id": "inv_789",
        "email": "grandma@example.com",
        "role": "VIEWER",
        "childAccess": ["child_123"],
        "sentAt": "2026-01-15T10:00:00Z",
        "expiresAt": "2026-01-22T10:00:00Z"
      }
    ]
  }
}
```

---

### POST /family/members

Add a child to family.

**Security:**
- Parent only
- Age verification
- Parental consent recorded
- COPPA compliance check

**Request:**
```json
{
  "firstName": "Emma",
  "lastName": "Smith",
  "dateOfBirth": "2015-05-15",
  "sport": "Swimming",
  "skillLevel": "Beginner",
  "consent": {
    "dataProcessing": true,
    "sessionRecording": false,
    "photoSharing": false
  }
}
```

**Response (201):**
```json
{
  "child": {
    "id": "child_456",
    "name": "Emma Smith",
    "age": 10,
    "sport": "Swimming",
    "skillLevel": "Beginner",
    "createdAt": "2026-01-16T10:00:00Z"
  },
  "consent": {
    "recordedAt": "2026-01-16T10:00:00Z",
    "parentId": "usr_parent123",
    "ipAddress": "hash(ip)"
  }
}
```

**COPPA Requirements:**
| Age | Requirements |
|-----|--------------|
| Under 13 | Full COPPA compliance, parental consent |
| 13-15 | Reduced data collection, parent notification |
| 16+ | Can have own account with parent oversight |

---

### PUT /family/members/:childId

Update child profile.

**Security:**
- Parent only (not guardians)
- Audit logged
- Some fields immutable (DOB)

**Request:**
```json
{
  "sport": "Tennis",
  "skillLevel": "Intermediate",
  "medicalNotes": "Asthma - has inhaler"
}
```

**Response (200):**
```json
{
  "child": {
    "id": "child_123",
    "name": "Tom Smith",
    "sport": "Tennis",
    "skillLevel": "Intermediate",
    "updatedAt": "2026-01-16T10:00:00Z"
  }
}
```

---

### DELETE /family/members/:childId

Remove child from family.

**Security:**
- Parent only
- Confirmation required
- Data deletion workflow triggered
- 30-day recovery period

**Request:**
```json
{
  "confirmation": "DELETE",
  "reason": "Account no longer needed"
}
```

**Response (200):**
```json
{
  "deletion": {
    "childId": "child_123",
    "status": "SCHEDULED",
    "scheduledFor": "2026-02-15T10:00:00Z",
    "recoveryDeadline": "2026-02-15T10:00:00Z",
    "message": "Account scheduled for deletion. Can be recovered within 30 days."
  }
}
```

---

### POST /family/guardians/invite

Invite a guardian.

**Security:**
- Parent only
- Email verification required for guardian
- Granular permission selection
- Expiring invite links

**Request:**
```json
{
  "email": "grandma@example.com",
  "name": "Mary Smith",
  "role": "VIEWER",
  "childAccess": ["child_123", "child_456"],
  "permissions": ["VIEW_PROFILE", "VIEW_SESSIONS"],
  "message": "Please join to view the kids' tennis progress!"
}
```

**Response (201):**
```json
{
  "invite": {
    "id": "inv_abc123",
    "email": "grandma@example.com",
    "status": "PENDING",
    "expiresAt": "2026-01-23T10:00:00Z",
    "inviteLink": "https://app.clubroom.app/invite/token_xxx"
  }
}
```

---

### POST /family/guardians/invite/:inviteId/accept

Accept guardian invitation.

**Security:**
- Email must match invite
- Creates guardian account if needed
- Permissions immediately active

**Response (200):**
```json
{
  "guardian": {
    "id": "guard_new123",
    "familyId": "fam_abc123",
    "role": "VIEWER",
    "childAccess": [
      {
        "childId": "child_123",
        "childName": "Tom Smith"
      }
    ],
    "acceptedAt": "2026-01-17T10:00:00Z"
  }
}
```

---

### PUT /family/guardians/:guardianId

Update guardian permissions.

**Security:**
- Parent only
- Cannot escalate above own permissions
- Audit logged

**Request:**
```json
{
  "role": "GUARDIAN",
  "childAccess": ["child_123"],
  "permissions": ["VIEW_PROFILE", "VIEW_SESSIONS", "BOOK_SESSIONS"]
}
```

**Response (200):**
```json
{
  "guardian": {
    "id": "guard_456",
    "role": "GUARDIAN",
    "permissions": ["VIEW_PROFILE", "VIEW_SESSIONS", "BOOK_SESSIONS"],
    "updatedAt": "2026-01-16T10:00:00Z"
  }
}
```

---

### DELETE /family/guardians/:guardianId

Remove guardian access.

**Security:**
- Parent only
- Immediate access revocation
- Notification sent to guardian
- Audit logged

**Response (204):**
No content.

---

### GET /family/upcoming

Get upcoming sessions for all children.

**Security:**
- Based on user's permission level
- Only shows permitted children

**Response (200):**
```json
{
  "upcoming": [
    {
      "childId": "child_123",
      "childName": "Tom Smith",
      "sessions": [
        {
          "bookingId": "bkg_abc",
          "coachName": "Sarah Johnson",
          "scheduledAt": "2026-01-20T14:00:00Z",
          "duration": 60,
          "sport": "Tennis",
          "location": "Central Tennis Club"
        }
      ]
    }
  ]
}
```

---

### GET /family/spending

Get family spending summary.

**Security:**
- Parent only
- Aggregated by child
- No sensitive payment details

**Response (200):**
```json
{
  "spending": {
    "thisMonth": 180.00,
    "lastMonth": 225.00,
    "total": 1450.00,
    "currency": "GBP",
    "byChild": [
      {
        "childId": "child_123",
        "childName": "Tom Smith",
        "thisMonth": 135.00,
        "sessions": 3
      }
    ]
  }
}
```

---

## Child Data Protection

### Data Collected for Children

| Data | Collected | Purpose | Retention |
|------|-----------|---------|-----------|
| Name | Yes | Identification | Account lifetime |
| DOB | Yes | Age verification | Account lifetime |
| Sport/Skill | Yes | Coach matching | Account lifetime |
| Session history | Yes | Progress tracking | 2 years |
| Medical notes | Optional | Safety | Account lifetime |
| Photos | Optional | Profile | Until deleted |

### Data NOT Collected for Children

- Email address (under 13)
- Phone number
- Social media
- Location tracking
- Marketing preferences
- Behavioral analytics

### Parental Consent Record

```json
{
  "consentId": "consent_abc123",
  "childId": "child_123",
  "parentId": "usr_parent",
  "grantedAt": "2026-01-16T10:00:00Z",
  "consentType": "INITIAL_REGISTRATION",
  "permissions": {
    "dataProcessing": true,
    "sessionRecording": false,
    "photoSharing": false,
    "progressSharing": true
  },
  "verificationMethod": "EMAIL_CONFIRMATION",
  "ipAddress": "hash(ip)",
  "userAgent": "hash(ua)"
}
```

---

## Audit Trail

All family operations logged:

```json
{
  "action": "GUARDIAN_PERMISSIONS_UPDATED",
  "familyId": "fam_abc123",
  "performedBy": "usr_parent",
  "target": "guard_456",
  "changes": {
    "permissionsBefore": ["VIEW"],
    "permissionsAfter": ["VIEW", "BOOK"]
  },
  "timestamp": "2026-01-16T10:00:00Z"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| FAM_001 | Child not found |
| FAM_002 | Guardian not found |
| FAM_003 | Not authorized (parent only) |
| FAM_004 | Invite expired |
| FAM_005 | Email mismatch |
| FAM_006 | Maximum children reached |
| FAM_007 | Consent required |
| FAM_008 | Cannot remove primary parent |
