# Data Protection Guide

> **Privacy by Design**

## Overview

This document outlines how Clubroom protects user data throughout its lifecycle. We implement privacy by design principles and comply with GDPR, CCPA, and COPPA requirements.

---

## Data Classification

### Classification Levels

| Level | Description | Examples | Handling |
|-------|-------------|----------|----------|
| **PUBLIC** | Freely shareable | Coach bios, public reviews | Standard protection |
| **INTERNAL** | Business operational | Session schedules, analytics | Access controlled |
| **CONFIDENTIAL** | Personal information | Email, phone, address | Encrypted + ACL |
| **RESTRICTED** | Highly sensitive | Payment data, child info, medical | Maximum protection |

### Data Inventory

#### User Data
| Data Type | Classification | Encrypted | Retention |
|-----------|---------------|-----------|-----------|
| Email | CONFIDENTIAL | Yes | Account lifetime |
| Password | RESTRICTED | Hash only | Account lifetime |
| Phone | CONFIDENTIAL | Yes | Account lifetime |
| Address | CONFIDENTIAL | Yes | Account lifetime |
| DOB | CONFIDENTIAL | Yes | Account lifetime |
| Profile photo | INTERNAL | At rest | Until deleted |

#### Child Data (RESTRICTED)
| Data Type | Collected | Purpose | Retention |
|-----------|-----------|---------|-----------|
| Name | Required | Identification | Account lifetime |
| DOB | Required | Age verification | Account lifetime |
| Sport/skill | Required | Matching | Account lifetime |
| Medical notes | Optional | Safety | Until deleted |
| Session history | Generated | Progress | 2 years |
| Photos | Optional | Profile | Until deleted |

#### Financial Data (RESTRICTED)
| Data Type | Storage | Encryption | Retention |
|-----------|---------|------------|-----------|
| Card numbers | Stripe only | Stripe vault | Stripe policy |
| Bank accounts | Masked | Yes | Until removed |
| Transactions | Database | Yes | 7 years |
| Invoices | Database | Yes | 7 years |

---

## Encryption Standards

### In Transit

```
All traffic encrypted with TLS 1.3

Supported cipher suites:
- TLS_AES_256_GCM_SHA384
- TLS_CHACHA20_POLY1305_SHA256
- TLS_AES_128_GCM_SHA256

Certificate:
- RSA 4096-bit or ECDSA P-384
- Auto-renewal via Let's Encrypt
- HSTS with preload
```

### At Rest

```
Database encryption:
- Algorithm: AES-256-GCM
- Key management: AWS KMS / HashiCorp Vault
- Key rotation: Quarterly

File storage encryption:
- Algorithm: AES-256-GCM
- Per-user encryption keys
- Key derivation: HKDF-SHA256

Backup encryption:
- Separate encryption keys
- Geographic distribution
- Tested recovery procedures
```

### Field-Level Encryption

Sensitive fields encrypted before database storage:

```typescript
interface EncryptedField {
  ciphertext: string;      // Encrypted data
  iv: string;              // Initialization vector
  tag: string;             // Authentication tag
  keyId: string;           // Key used for encryption
  version: number;         // Encryption version
}

// Fields with field-level encryption:
// - email (searchable encryption)
// - phone
// - address
// - medical notes
// - bank account numbers
```

---

## Data Access Controls

### Access Model

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA ACCESS FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Request ──▶ Authentication ──▶ Authorization ──▶ Data      │
│                    │                  │              │       │
│                    ▼                  ▼              ▼       │
│              Verify JWT         Check RBAC/ABAC   Filter    │
│              Validate session   Verify ownership  Mask PII  │
│              Check MFA if req   Log access        Audit     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Filtering by Role

```typescript
// Automatic data filtering based on role
const getBookings = async (user: User) => {
  switch (user.role) {
    case 'USER':
      // Only own bookings (as booker or athlete)
      return db.bookings.where({
        OR: [
          { bookedById: user.id },
          { athleteIds: { contains: user.id } }
        ]
      });

    case 'COACH':
      // Bookings where they're the coach
      return db.bookings.where({ coachId: user.id });

    case 'ORG_ADMIN':
      // All bookings in their organization
      return db.bookings.where({ organizationId: user.organizationId });

    case 'ADMIN':
      // Platform admin - full access with audit
      auditLog('ADMIN_DATA_ACCESS', user.id, 'bookings');
      return db.bookings.all();
  }
};
```

### PII Masking

```typescript
// Automatic masking for different contexts
const maskUserData = (user: User, context: 'list' | 'detail' | 'admin') => {
  switch (context) {
    case 'list':
      return {
        id: user.id,
        name: user.name,
        avatar: user.avatar
        // No email, phone, address
      };

    case 'detail':
      return {
        ...user,
        email: maskEmail(user.email),      // j***@example.com
        phone: maskPhone(user.phone),      // +44 7*** *** ***
        // Full address only if authorized
      };

    case 'admin':
      // Full data with audit trail
      return user;
  }
};
```

---

## Data Retention

### Retention Schedule

| Data Category | Active | After Deletion | Archive | Permanent Delete |
|---------------|--------|----------------|---------|------------------|
| User profile | While active | 30 days | - | 30 days |
| Bookings | 2 years | 30 days | 5 years | 7 years |
| Messages | 1 year | 30 days | - | 30 days |
| Videos | 90 days | 30 days | - | 30 days |
| Financial | 7 years | N/A | N/A | 7 years |
| Audit logs | 2 years | N/A | 5 years | 7 years |
| Analytics | 2 years | Anonymized | - | - |

### Deletion Process

```
User Requests Deletion
         │
         ▼
┌─────────────────┐
│ Verify Identity │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 30-Day Hold     │◀── User can cancel during this period
│ (Soft Delete)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Data Anonymized │ ── Remove PII, keep aggregates
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Hard Delete     │ ── Remove from backups (eventual)
└─────────────────┘
```

### Data Anonymization

```typescript
// Anonymization for analytics retention
const anonymizeUser = (user: User) => ({
  id: generateAnonymousId(),  // New non-reversible ID
  role: user.role,
  sport: user.sport,
  region: getRegion(user.address),  // Country/region only
  ageRange: getAgeRange(user.dob),  // 20-30, 30-40, etc.
  joinedYear: user.createdAt.getFullYear(),
  // All PII removed
});
```

---

## User Rights (GDPR/CCPA)

### Right to Access

**Endpoint:** `GET /user/data-export`

```json
{
  "export": {
    "requestedAt": "2026-01-16T10:00:00Z",
    "completedAt": "2026-01-16T10:05:00Z",
    "downloadUrl": "https://exports.clubroom.app/download/xxx",
    "expiresAt": "2026-01-23T10:00:00Z",
    "contents": [
      "profile.json",
      "bookings.json",
      "messages.json",
      "payments.json",
      "activity.json"
    ]
  }
}
```

**Export Contents:**
- All personal data
- All activity history
- All content created
- Machine-readable format (JSON)
- Available within 48 hours

### Right to Rectification

**Endpoint:** `PUT /user/profile`

Users can update their data at any time:
- Profile information
- Contact details
- Preferences
- Consent settings

### Right to Erasure

**Endpoint:** `DELETE /user/account`

```json
{
  "confirmation": "DELETE MY ACCOUNT",
  "reason": "No longer using service",
  "feedback": "Optional feedback"
}
```

**Process:**
1. Identity verification
2. 30-day soft delete period
3. Anonymization of analytics data
4. Hard delete of personal data
5. Confirmation email sent

### Right to Restriction

**Endpoint:** `PUT /user/data-processing`

```json
{
  "processing": {
    "analytics": false,      // Opt out of analytics
    "marketing": false,      // No marketing communications
    "profiling": false,      // No automated decisions
    "thirdParty": false      // No third-party sharing
  }
}
```

### Right to Portability

**Endpoint:** `GET /user/data-export?format=portable`

Data exported in standard, machine-readable format for transfer to another service.

### Right to Object

Users can object to:
- Direct marketing
- Profiling
- Processing for research
- Processing based on legitimate interests

---

## COPPA Compliance (Child Data)

### Requirements

| Requirement | Implementation |
|-------------|----------------|
| Verifiable parental consent | Email + phone verification |
| Data minimization | Only essential data collected |
| No behavioral advertising | No tracking for minors |
| Parental access | Full visibility and control |
| Data deletion | Complete on request |

### Parental Consent Flow

```
1. Parent creates account
         │
         ▼
2. Parent adds child
         │
         ▼
3. Consent form presented
   - What data collected
   - How data used
   - Third-party sharing
         │
         ▼
4. Parent confirms consent
   - Email verification
   - Optional: Phone verification for high-risk
         │
         ▼
5. Consent recorded
   - Timestamp
   - IP address (hashed)
   - Verification method
         │
         ▼
6. Child profile created
```

### Child Data Restrictions

```typescript
// Child accounts have restricted functionality
const childRestrictions = {
  noDirectMessaging: true,      // Messages go to parent
  noLocationSharing: true,       // No real-time location
  noPublicProfile: true,         // Profile not discoverable
  noThirdPartySharing: true,     // No data shared externally
  noMarketingEmails: true,       // No promotional content
  noBehavioralAnalytics: true    // No tracking/profiling
};
```

---

## Third-Party Data Sharing

### Approved Third Parties

| Partner | Purpose | Data Shared | Legal Basis |
|---------|---------|-------------|-------------|
| Stripe | Payments | Payment info | Contract |
| AWS | Infrastructure | All (encrypted) | Contract |
| SendGrid | Email | Email address | Legitimate interest |
| Twilio | SMS | Phone number | Contract |

### Data Processing Agreements

All third parties have signed DPAs covering:
- Data protection obligations
- Security requirements
- Breach notification
- Sub-processor restrictions
- Audit rights

### No Data Selling

**We never sell user data.**

Data is only shared when:
1. User explicitly consents
2. Required for service delivery
3. Legal obligation
4. Vital interests (safety)

---

## Breach Response

### Detection

Automated monitoring for:
- Unusual access patterns
- Large data exports
- Failed authentication spikes
- Unauthorized API access

### Response Timeline

| Action | Timeframe |
|--------|-----------|
| Detection | Automated/immediate |
| Assessment | Within 1 hour |
| Containment | Within 2 hours |
| Notification (internal) | Within 4 hours |
| Notification (authorities) | Within 72 hours (GDPR) |
| User notification | Without undue delay |
| Post-incident review | Within 1 week |

### Notification Content

```
Dear [User],

We are writing to inform you of a security incident that may
have affected your data.

What happened: [Description]
When: [Date/time]
What data was affected: [Specific data types]
What we're doing: [Remediation steps]
What you should do: [User actions]

Contact: security@clubroom.app
```

---

## Privacy Contacts

- **Data Protection Officer:** dpo@clubroom.app
- **Privacy Questions:** privacy@clubroom.app
- **Security Issues:** security@clubroom.app
- **Data Requests:** datarequests@clubroom.app

---

## Regular Reviews

| Review | Frequency | Owner |
|--------|-----------|-------|
| Privacy impact assessment | Per new feature | Privacy team |
| Data inventory audit | Quarterly | Security team |
| Third-party review | Annually | Legal team |
| Policy updates | Annually | Privacy team |
| Consent mechanism review | Annually | Product team |
