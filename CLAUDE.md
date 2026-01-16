# CLAUDE.md - Clubroom API & Security Documentation

> **Last Updated:** January 2026
> **Version:** 1.0.0
> **Platform:** Clubroom Coaching Application

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Sprint Documentation](#sprint-documentation)
3. [Security Architecture](#security-architecture)
4. [Data Protection](#data-protection)
5. [Component Security Matrix](#component-security-matrix)
6. [Service Security Matrix](#service-security-matrix)
7. [API Endpoint Reference](#api-endpoint-reference)

---

## Project Overview

Clubroom is a coaching platform connecting athletes/parents with qualified coaches. This document serves as the **single source of truth** for API architecture, security implementation, and data protection strategies.

### Tech Stack
- **Frontend:** React Native 0.81.5 + Expo 54
- **State:** AsyncStorage (migrating to secure backend)
- **Auth:** JWT with refresh tokens
- **API:** REST + WebSocket (real-time)

### Core Principles
1. **Defense in Depth** - Multiple security layers
2. **Least Privilege** - Minimal access by default
3. **Data Minimization** - Only collect what's needed
4. **Encryption Everywhere** - TLS + at-rest encryption

---

## Sprint Documentation

### Sprint 1: Authentication & Core Security
**Goal:** Establish secure authentication foundation

| Task | Security Requirement | Status |
|------|---------------------|--------|
| JWT Implementation | RS256 signing, 15min access tokens | Planned |
| Refresh Token Flow | Secure HTTP-only cookies, rotation | Planned |
| Password Security | Argon2id hashing, min 12 chars | Planned |
| Rate Limiting | 5 attempts/15min per IP | Planned |
| Session Management | Single-device or multi-device policy | Planned |

**Security Deliverables:**
- [ ] Authentication service with secure password handling
- [ ] JWT token generation and validation
- [ ] Refresh token rotation mechanism
- [ ] Account lockout after failed attempts
- [ ] Secure password reset flow

---

### Sprint 2: Booking System Security
**Goal:** Secure booking creation and management

| Task | Security Requirement | Status |
|------|---------------------|--------|
| Authorization Checks | Only owners can modify bookings | Planned |
| Input Validation | Sanitize all booking inputs | Planned |
| Business Rule Enforcement | Server-side availability validation | Planned |
| Audit Logging | Track all booking changes | Planned |

**Security Deliverables:**
- [ ] Role-based booking access control
- [ ] Booking modification audit trail
- [ ] Secure cancellation with proper refund logic
- [ ] Double-booking prevention (server-side)

---

### Sprint 3: Payment & Financial Security
**Goal:** PCI-compliant payment handling

| Task | Security Requirement | Status |
|------|---------------------|--------|
| Stripe Integration | PCI DSS compliance via Stripe | Planned |
| Wallet Security | Transaction integrity, no negative balance | Planned |
| Payout Protection | Identity verification for withdrawals | Planned |
| Financial Audit | Complete transaction logging | Planned |

**Security Deliverables:**
- [ ] Stripe Elements for card handling (no raw card data)
- [ ] Idempotent payment operations
- [ ] Webhook signature verification
- [ ] Financial transaction audit log

---

### Sprint 4: Family & Child Data Protection
**Goal:** COPPA-compliant child data handling

| Task | Security Requirement | Status |
|------|---------------------|--------|
| Parental Consent | Verified consent for child accounts | Planned |
| Data Access Control | Parents control child data access | Planned |
| Guardian Permissions | Granular guardian access levels | Planned |
| Data Deletion | Complete child data removal on request | Planned |

**Security Deliverables:**
- [ ] Parental consent workflow
- [ ] Guardian permission management
- [ ] Child account data isolation
- [ ] COPPA-compliant data handling

---

### Sprint 5: Communication Security
**Goal:** Secure messaging and notifications

| Task | Security Requirement | Status |
|------|---------------------|--------|
| Message Encryption | End-to-end encryption for DMs | Planned |
| Notification Security | No sensitive data in push payloads | Planned |
| Content Moderation | Filter inappropriate content | Planned |
| Contact Protection | No direct contact info sharing | Planned |

**Security Deliverables:**
- [ ] Encrypted message storage
- [ ] Safe notification payloads
- [ ] Report/block functionality
- [ ] Contact mediation (no direct phone/email sharing)

---

### Sprint 6: Media & Content Security
**Goal:** Secure video and file handling

| Task | Security Requirement | Status |
|------|---------------------|--------|
| Upload Validation | File type, size, content scanning | Planned |
| Storage Security | Signed URLs, access control | Planned |
| CDN Protection | Token-based access, geo-restrictions | Planned |
| Content Ownership | Watermarking, copyright protection | Planned |

**Security Deliverables:**
- [ ] Secure upload endpoint with validation
- [ ] Signed URL generation for private content
- [ ] Video streaming with access control
- [ ] Content takedown workflow

---

### Sprint 7: Organization & Staff Security
**Goal:** Multi-tenant security for academies

| Task | Security Requirement | Status |
|------|---------------------|--------|
| Tenant Isolation | Complete data separation | Planned |
| Staff Permissions | Role-based access within org | Planned |
| Audit Compliance | Organization-level audit logs | Planned |
| Admin Controls | Staff management, access revocation | Planned |

**Security Deliverables:**
- [ ] Multi-tenant database design
- [ ] Organization-scoped data queries
- [ ] Staff permission inheritance
- [ ] Admin audit dashboard

---

## Security Architecture

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Gate   │────▶│  Auth Svc   │
│   (App)     │◀────│  (Rate Lim) │◀────│  (JWT/DB)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │  1. Login Req     │                   │
       │──────────────────▶│  2. Validate      │
       │                   │──────────────────▶│
       │                   │  3. Issue Tokens  │
       │  4. Access+Refresh│◀──────────────────│
       │◀──────────────────│                   │
       │                   │                   │
       │  5. API Request   │                   │
       │  (Bearer token)   │  6. Verify JWT    │
       │──────────────────▶│──────────────────▶│
       │                   │  7. User Context  │
       │  8. Response      │◀──────────────────│
       │◀──────────────────│                   │
```

### Token Security

| Token Type | Lifetime | Storage | Rotation |
|------------|----------|---------|----------|
| Access Token | 15 min | Memory only | On refresh |
| Refresh Token | 7 days | Secure HTTP-only cookie | On use |
| Password Reset | 1 hour | DB with hash | Single use |
| Email Verify | 24 hours | DB with hash | Single use |

### Password Requirements

```typescript
interface PasswordPolicy {
  minLength: 12;
  requireUppercase: true;
  requireLowercase: true;
  requireNumber: true;
  requireSpecial: true;
  maxLength: 128;
  preventCommon: true;      // Check against common password list
  preventUserInfo: true;    // No email/name in password
  hashAlgorithm: 'argon2id';
  hashParams: {
    memoryCost: 65536;      // 64 MB
    timeCost: 3;
    parallelism: 4;
  };
}
```

---

## Data Protection

### Data Classification

| Level | Description | Examples | Protection |
|-------|-------------|----------|------------|
| **PUBLIC** | Non-sensitive, shareable | Coach bio, public reviews | Standard TLS |
| **INTERNAL** | Business data | Session schedules, availability | Auth required |
| **CONFIDENTIAL** | Personal data | Email, phone, address | Encryption + ACL |
| **RESTRICTED** | Sensitive PII | Payment info, child data | Max protection |

### Encryption Standards

| Data State | Method | Key Management |
|------------|--------|----------------|
| In Transit | TLS 1.3 | Managed certs (Let's Encrypt/AWS) |
| At Rest (DB) | AES-256-GCM | AWS KMS / Vault |
| At Rest (Files) | AES-256-GCM | Per-user keys |
| Backups | AES-256-GCM | Separate backup keys |

### Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|-----------------|-----------------|
| Active User Data | While account active | Soft delete |
| Deleted Account | 30 days | Hard delete |
| Financial Records | 7 years | Archive, then delete |
| Audit Logs | 2 years | Archive, then delete |
| Session Recordings | 90 days | Auto-delete |

### GDPR/CCPA Compliance

```typescript
interface UserDataRights {
  access: boolean;       // Right to access personal data
  rectification: boolean; // Right to correct data
  erasure: boolean;      // Right to be forgotten
  portability: boolean;  // Right to data export
  restriction: boolean;  // Right to limit processing
  objection: boolean;    // Right to object to processing
}

// API Endpoints for Data Rights
GET    /user/data-export      // Download all user data
DELETE /user/account          // Request account deletion
PUT    /user/consent          // Update consent preferences
GET    /user/consent          // View current consent
```

---

## Component Security Matrix

### Authentication Components

| Component | Security Features | Data Handled |
|-----------|------------------|--------------|
| `LoginForm` | Input sanitization, rate limit display | Email, password (never logged) |
| `RegisterForm` | Password strength meter, consent checkbox | PII, password |
| `ForgotPassword` | Email enumeration prevention | Email only |
| `TwoFactorInput` | Brute force protection | OTP codes |
| `BiometricAuth` | Secure enclave integration | Biometric data (device only) |

### Booking Components

| Component | Security Features | Data Handled |
|-----------|------------------|--------------|
| `BookingWizard` | CSRF protection, input validation | Session details |
| `BookingConfirmation` | Double-submit prevention | Payment info (via Stripe) |
| `BookingHistory` | User-scoped queries only | User's bookings |
| `CancelBookingModal` | Confirmation required | Booking ID |

### Payment Components

| Component | Security Features | Data Handled |
|-----------|------------------|--------------|
| `WalletView` | Balance masking option | Financial data |
| `TopUpForm` | Stripe Elements (PCI compliant) | Card via Stripe iframe |
| `PayoutSettings` | Identity verification required | Bank details (masked) |
| `TransactionHistory` | Export with auth | Transaction records |

### Family Components

| Component | Security Features | Data Handled |
|-----------|------------------|--------------|
| `ChildProfile` | Parent-only access | Child PII |
| `GuardianInvite` | Email verification | Guardian contact |
| `FamilySettings` | Permission controls | Family structure |
| `ChildSelector` | Authorized children only | Child references |

### Messaging Components

| Component | Security Features | Data Handled |
|-----------|------------------|--------------|
| `ChatView` | Message sanitization | Messages |
| `MessageInput` | File type restrictions | Text, attachments |
| `ContactList` | Blocked user filtering | User list |
| `ReportMessage` | Anonymous reporting option | Report details |

---

## Service Security Matrix

### Core Services

| Service | Security Implementation | Sensitive Data |
|---------|------------------------|----------------|
| `auth-service` | Argon2id passwords, JWT signing, session management | Credentials |
| `booking-service` | Owner/coach authorization, audit logging | Booking details |
| `wallet-service` | Transaction integrity, balance validation | Financial data |
| `earnings-service` | Coach-only access, payout verification | Earnings data |

### User Data Services

| Service | Security Implementation | Sensitive Data |
|---------|------------------------|----------------|
| `family-service` | Parental consent, guardian ACL | Child data |
| `progress-service` | Coach-athlete relationship validation | Performance data |
| `safety-service` | Encrypted storage, emergency access | Medical info |

### Communication Services

| Service | Security Implementation | Sensitive Data |
|---------|------------------------|----------------|
| `messaging-service` | E2E encryption, message retention limits | Messages |
| `notification-service` | No PII in push payloads | Notification content |
| `review-service` | Content moderation, fake review detection | Reviews |

### Content Services

| Service | Security Implementation | Sensitive Data |
|---------|------------------------|----------------|
| `video-service` | Signed URLs, access tokens, watermarking | Videos |
| `drill-service` | Coach content ownership | Drill content |

### Organization Services

| Service | Security Implementation | Sensitive Data |
|---------|------------------------|----------------|
| `academy-service` | Tenant isolation, admin hierarchy | Org data |
| `club-service` | Member-only access, role permissions | Club data |
| `squad-service` | Squad membership validation | Squad data |

---

## API Endpoint Reference

See `/docs/API/` for complete endpoint documentation:

- [Authentication API](./docs/API/AUTH.md)
- [Booking API](./docs/API/BOOKING.md)
- [Payment API](./docs/API/PAYMENT.md)
- [Family API](./docs/API/FAMILY.md)
- [Messaging API](./docs/API/MESSAGING.md)
- [Content API](./docs/API/CONTENT.md)
- [Organization API](./docs/API/ORGANIZATION.md)

### API Security Headers

All API responses include:

```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Rate Limiting

| Endpoint Category | Rate Limit | Window |
|-------------------|------------|--------|
| Authentication | 5 requests | 15 minutes |
| Password Reset | 3 requests | 1 hour |
| API (authenticated) | 1000 requests | 1 hour |
| API (unauthenticated) | 100 requests | 1 hour |
| File Upload | 10 requests | 1 hour |
| WebSocket | 100 messages | 1 minute |

---

## Quick Reference

### Security Contacts
- **Security Issues:** security@clubroom.app
- **Data Protection:** dpo@clubroom.app

### Key Files
- `/services/auth-service.ts` - Authentication logic
- `/services/api-contracts.ts` - API type definitions
- `/constants/storage-keys.ts` - Data storage keys
- `/docs/API/` - Complete API documentation

### Testing Security
```bash
npm run test:security        # Security test suite
npm run audit               # Dependency audit
npm run lint:security       # Security linting
```

---

**Document maintained by the Clubroom Engineering Team**
