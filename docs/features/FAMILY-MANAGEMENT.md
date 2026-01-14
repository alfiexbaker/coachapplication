# Family Management System

> Complete documentation for family accounts, children management, guardian sharing, and family features.

---

## Overview

The family system enables:
- Parents to manage multiple children
- Guardian accounts with shared access
- Family calendar with all sessions
- Spending tracking across children
- Permission-based access control

---

## Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Children Management | Complete | Add, edit, remove children |
| Guardian Sharing | Complete | Invite co-parents, grandparents |
| Family Calendar | Complete | Unified view of all sessions |
| Spending Overview | Complete | Track spending by child |
| Permission Control | Complete | Granular access per guardian |
| Family Bookings | Complete | Book for any child |

---

## Screens & Routes

| Screen | Route | Purpose |
|--------|-------|---------|
| Children Hub | `/(tabs)/children` | List all children |
| Family Dashboard | `/family/index` | Family overview |
| Family Calendar | `/family/calendar` | All sessions calendar |
| Family Spending | `/family/spending` | Spending analytics |
| Guardian Sharing | `/family/sharing` | Manage guardians |
| Child Emergency | `/child/[id]/emergency` | Emergency contacts |
| Child Medical | `/child/[id]/medical` | Medical info |

---

## Family Account Structure

### Family Account

```typescript
interface FamilyAccount {
  id: string;

  // Primary Owner
  primaryGuardianId: string;
  primaryGuardianName: string;
  primaryGuardianEmail: string;

  // Secondary Guardians
  guardians: FamilyGuardian[];

  // Children
  children: FamilyMember[];

  // Settings
  settings: FamilySettings;

  // Metadata
  createdAt: string;
  updatedAt: string;
}
```

### Family Member (Child)

```typescript
interface FamilyMember {
  id: string;
  familyAccountId: string;

  // Identity
  name: string;
  firstName: string;
  lastName: string;
  avatar?: string;

  // Demographics
  dateOfBirth: string;
  age: number;                      // Computed
  gender?: 'male' | 'female' | 'other';

  // Sports
  position?: string;               // "Striker", "Midfielder"
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  team?: string;                   // Current team

  // Medical (Parent view only)
  medicalNotes?: string;
  allergies?: string[];
  medications?: string[];

  // Emergency
  emergencyContacts: EmergencyContact[];

  // Preferences
  preferredFoot?: 'left' | 'right' | 'both';
  goals?: string[];

  // Status
  isActive: boolean;
  addedAt: string;
  addedBy: string;
}
```

### Family Guardian

```typescript
interface FamilyGuardian {
  id: string;
  familyAccountId: string;

  // Identity
  userId: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;

  // Role
  role: GuardianRole;
  relationship: string;            // "Mother", "Father", "Grandparent"

  // Permissions
  permissions: GuardianPermission[];

  // Access
  childAccess: string[];           // Child IDs this guardian can access

  // Status
  status: 'ACTIVE' | 'PENDING' | 'REMOVED';
  invitedAt: string;
  acceptedAt?: string;
}

type GuardianRole =
  | 'PRIMARY'         // Full control
  | 'GUARDIAN'        // Can book and view
  | 'VIEWER';         // Read-only access

type GuardianPermission =
  | 'BOOK_SESSIONS'
  | 'CANCEL_SESSIONS'
  | 'VIEW_PROGRESS'
  | 'VIEW_MEDICAL'
  | 'MANAGE_PAYMENTS'
  | 'EDIT_CHILD_INFO'
  | 'INVITE_GUARDIANS'
  | 'MESSAGE_COACHES';
```

---

## Children Hub

### UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                         My Children                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  [Avatar]  Tom Henderson                                │  │
│   │            Age 15 • Striker                             │  │
│   │            Intermediate • Lions FC U15                  │  │
│   │                                                         │  │
│   │  📅 Next: Tomorrow 3pm with Coach Sarah                 │  │
│   │  🏆 5 badges earned                                     │  │
│   │                                                         │  │
│   │  [Book Session]  [View Progress]  [Edit]               │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  [Avatar]  Emma Henderson                               │  │
│   │            Age 14 • Midfielder                          │  │
│   │            Advanced • Lions FC U14                      │  │
│   │                                                         │  │
│   │  📅 Next: Saturday 10am with Coach Mike                 │  │
│   │  🏆 3 badges earned                                     │  │
│   │                                                         │  │
│   │  [Book Session]  [View Progress]  [Edit]               │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                        [+ Add Child]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Add Child Form

```
┌─────────────────────────────────────────────────────────────────┐
│                         Add Child                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   BASIC INFORMATION                                             │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   First Name:  [____________________]                           │
│   Last Name:   [____________________]                           │
│   Date of Birth: [____/____/________]                           │
│   Gender:      [Select...        ▼]                             │
│                                                                 │
│   FOOTBALL DETAILS                                              │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   Position:    [Select position... ▼]                           │
│   Skill Level: [Intermediate       ▼]                           │
│   Current Team: [____________________]                          │
│                                                                 │
│   EMERGENCY CONTACT                                             │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   Contact Name:  [____________________]                         │
│   Relationship:  [____________________]                         │
│   Phone Number:  [____________________]                         │
│                                                                 │
│   MEDICAL NOTES (Optional)                                      │
│   ─────────────────────────────────────────────────────         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Any allergies, conditions, or notes for coaches...      │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                        [Add Child]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Guardian Sharing

### Invite Guardian Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Invite Guardian                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Share access to your family account with another adult.       │
│                                                                 │
│   GUARDIAN DETAILS                                              │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   Name:         [____________________]                          │
│   Email:        [____________________]                          │
│   Relationship: [Grandmother         ▼]                         │
│                                                                 │
│   ACCESS LEVEL                                                  │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   ○ Guardian - Can book sessions and view progress              │
│   ○ Viewer - Read-only access to schedules and progress         │
│                                                                 │
│   CHILD ACCESS                                                  │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   Which children can this guardian access?                      │
│                                                                 │
│   [✓] Tom Henderson                                             │
│   [✓] Emma Henderson                                            │
│                                                                 │
│   PERMISSIONS                                                   │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   [✓] Book sessions                                             │
│   [ ] Cancel sessions                                           │
│   [✓] View progress                                             │
│   [ ] View medical info                                         │
│   [ ] Manage payments                                           │
│   [✓] Message coaches                                           │
│                                                                 │
│   PERSONAL MESSAGE (Optional)                                   │
│   ─────────────────────────────────────────────────────         │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Hi Grandma, I'm sharing access so you can book sessions │  │
│   │ when you're looking after the kids...                   │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                      [Send Invitation]                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Guardian Invite Structure

```typescript
interface GuardianInvite {
  id: string;
  familyAccountId: string;

  // Invitee
  email: string;
  name: string;
  relationship: string;

  // Access
  role: GuardianRole;
  permissions: GuardianPermission[];
  childAccess: string[];

  // Message
  personalMessage?: string;

  // Status
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  respondedAt?: string;
}
```

---

## Family Calendar

### Calendar View

```
┌─────────────────────────────────────────────────────────────────┐
│                      Family Calendar                             │
│                      January 2026                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Filter: [All Children ▼]  [All Coaches ▼]                     │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Mo   Tu   We   Th   Fr   Sa   Su                        │  │
│   │                 1    2    3    4                        │  │
│   │  5    6    7    8    9   10   11                        │  │
│   │ 12   13  [14]  15   16   17   18                        │  │
│   │ 19   20   21   22   23   24   25                        │  │
│   │ 26   27   28   29   30   31                             │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   TUESDAY, JANUARY 14                                           │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 🔵 3:00 PM - 4:00 PM                                    │  │
│   │    Tom Henderson • Coach Sarah                          │  │
│   │    1-on-1 Training • Hyde Park                          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 🟢 5:00 PM - 6:30 PM                                    │  │
│   │    Emma Henderson • Coach Mike                          │  │
│   │    Small Group • Community Center                       │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   LEGEND                                                        │
│   🔵 Tom Henderson  🟢 Emma Henderson                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Family Spending

### Spending Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                      Family Spending                             │
│                      January 2026                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   TOTAL THIS MONTH                                              │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│                        £420.00                                  │
│                   8 sessions booked                             │
│                                                                 │
│   BY CHILD                                                      │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ [Avatar] Tom Henderson                                  │  │
│   │          █████████████████████░░░░░░░  £300.00          │  │
│   │          5 sessions • 71% of total                      │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ [Avatar] Emma Henderson                                 │  │
│   │          ████████░░░░░░░░░░░░░░░░░░░░  £120.00          │  │
│   │          3 sessions • 29% of total                      │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   SPENDING TREND                                                │
│   ─────────────────────────────────────────────────────         │
│                                                                 │
│   │ £500                                                    │  │
│   │ £400    ╭──╮                                            │  │
│   │ £300 ───╯  ╰────                                        │  │
│   │ £200                                                    │  │
│   │ £100                                                    │  │
│   │      Oct   Nov   Dec   Jan                              │  │
│                                                                 │
│                    [Download Report]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Emergency & Medical Info

### Emergency Contacts

```typescript
interface EmergencyContact {
  id: string;
  childId: string;

  name: string;
  relationship: string;            // "Grandmother", "Neighbor"
  phone: string;
  email?: string;

  isPrimary: boolean;
  priority: number;                // 1 = first contact

  notes?: string;
}
```

### Medical Information

```typescript
interface MedicalInfo {
  childId: string;

  // Conditions
  conditions: string[];            // ["Asthma", "Diabetes"]
  allergies: string[];             // ["Peanuts", "Penicillin"]
  medications: string[];           // ["Inhaler as needed"]

  // Medical Contacts
  doctorName?: string;
  doctorPhone?: string;
  hospital?: string;

  // Documents
  insuranceInfo?: string;
  medicalCardUrl?: string;

  // Notes
  additionalNotes?: string;

  // Consent
  photoConsent: boolean;
  videoConsent: boolean;
  emergencyTreatmentConsent: boolean;

  lastUpdated: string;
}
```

---

## Services

### family-service.ts

```typescript
class FamilyService {
  // Family Account
  getFamilyAccount(userId: string): Promise<FamilyAccount>
  createFamilyAccount(primaryGuardianId: string): Promise<FamilyAccount>

  // Children
  getChildren(familyAccountId: string): Promise<FamilyMember[]>
  addChild(familyAccountId: string, child: Omit<FamilyMember, 'id'>): Promise<FamilyMember>
  updateChild(childId: string, data: Partial<FamilyMember>): Promise<FamilyMember>
  removeChild(childId: string): Promise<void>

  // Emergency & Medical
  getEmergencyContacts(childId: string): Promise<EmergencyContact[]>
  updateEmergencyContacts(childId: string, contacts: EmergencyContact[]): Promise<void>
  getMedicalInfo(childId: string): Promise<MedicalInfo>
  updateMedicalInfo(childId: string, info: Partial<MedicalInfo>): Promise<void>

  // Calendar
  getFamilyCalendar(familyAccountId: string, startDate: string, endDate: string): Promise<CalendarEvent[]>

  // Spending
  getFamilySpending(familyAccountId: string, period: string): Promise<SpendingSummary>
}
```

### family-sharing-service.ts

```typescript
class FamilySharingService {
  // Guardians
  getGuardians(familyAccountId: string): Promise<FamilyGuardian[]>
  inviteGuardian(familyAccountId: string, invite: GuardianInviteParams): Promise<GuardianInvite>
  acceptInvite(inviteId: string, userId: string): Promise<FamilyGuardian>
  declineInvite(inviteId: string): Promise<void>
  removeGuardian(guardianId: string): Promise<void>

  // Permissions
  updateGuardianPermissions(guardianId: string, permissions: GuardianPermission[]): Promise<FamilyGuardian>
  updateChildAccess(guardianId: string, childIds: string[]): Promise<FamilyGuardian>

  // Validation
  canGuardianAccess(guardianId: string, childId: string, permission: GuardianPermission): Promise<boolean>
}
```

---

## Components

### Family Components

| Component | Path | Purpose |
|-----------|------|---------|
| `FamilyCalendar` | `/components/family/FamilyCalendar.tsx` | Calendar view |
| `FamilyMemberCard` | `/components/family/FamilyMemberCard.tsx` | Child display |
| `SpendingChart` | `/components/family/SpendingChart.tsx` | Spending visualization |
| `UpcomingSessionsList` | `/components/family/UpcomingSessionsList.tsx` | Session list |

### Safety Components

| Component | Path | Purpose |
|-----------|------|---------|
| `emergency-banner` | `/components/safety/emergency-banner.tsx` | Emergency access |
| `EmergencyQuickCard` | `/components/safety/EmergencyQuickCard.tsx` | Quick contacts |
| `EmergencyContactCard` | `/components/safety/EmergencyContactCard.tsx` | Contact display |
| `MedicalAlertBadge` | `/components/safety/MedicalAlertBadge.tsx` | Medical alert |

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `clubroom.family_members` | Family member data |
| `clubroom.family_bookings` | Family booking links |
| `family_accounts` | Family account data |
| `guardian_invites` | Pending invitations |
| `clubroom.emergency_info` | Emergency contacts |
| `clubroom.emergency_cache` | Quick access cache |

---

## API Contracts

### Family Endpoints

```typescript
// Get family account
GET /family
Response: FamilyAccount

// Get children
GET /family/members
Response: FamilyMember[]

// Add child
POST /family/members
Body: Omit<FamilyMember, 'id'>
Response: FamilyMember

// Update child
PUT /family/members/:memberId
Body: Partial<FamilyMember>
Response: FamilyMember

// Get guardians
GET /family/guardians
Response: FamilyGuardian[]

// Invite guardian
POST /family/guardians/invite
Body: GuardianInviteParams
Response: GuardianInvite

// Accept invite
POST /family/guardians/invite/:inviteId/accept
Response: { guardian: FamilyGuardian, family: FamilyAccount }

// Get family calendar
GET /family/calendar
Query: { startDate, endDate }
Response: CalendarEvent[]

// Get spending
GET /family/spending
Query: { startDate?, endDate? }
Response: SpendingSummary
```

---

## Files Reference

### Services
- `/services/family-service.ts`
- `/services/family-sharing-service.ts`
- `/services/safety-service.ts`

### Screens
- `/app/(tabs)/children.tsx`
- `/app/family/index.tsx`
- `/app/family/calendar.tsx`
- `/app/family/spending.tsx`
- `/app/family/sharing.tsx`
- `/app/child/[id]/emergency.tsx`
- `/app/child/[id]/medical.tsx`

### Components
- `/components/family/*.tsx`
- `/components/safety/*.tsx`
