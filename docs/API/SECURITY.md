# Security Implementation Guide

> **Clubroom Security Architecture**

## Overview

This document details the security implementation across all Clubroom services and APIs. Our approach follows industry best practices and compliance requirements.

---

## Security Principles

### 1. Defense in Depth
Multiple layers of security protect data at every level:

```
┌─────────────────────────────────────────────────────────────┐
│                    EDGE SECURITY                             │
│  - DDoS Protection (Cloudflare/AWS Shield)                  │
│  - WAF Rules                                                 │
│  - Geographic Restrictions                                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    TRANSPORT SECURITY                        │
│  - TLS 1.3 (minimum TLS 1.2)                                │
│  - Certificate Pinning (mobile)                              │
│  - HSTS Preload                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY                               │
│  - Rate Limiting                                             │
│  - Request Validation                                        │
│  - JWT Verification                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│  - Authorization (RBAC/ABAC)                                │
│  - Input Sanitization                                        │
│  - Business Logic Validation                                 │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│  - Encryption at Rest                                        │
│  - Row-Level Security                                        │
│  - Audit Logging                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Least Privilege
Every user, service, and component has minimum necessary access:

| Entity | Access Model |
|--------|--------------|
| Users | Role-based (USER, COACH, ADMIN) |
| Services | Service accounts with scoped permissions |
| Database | Row-level security policies |
| APIs | Endpoint-specific authorization |

### 3. Zero Trust
Never trust, always verify:
- Every request authenticated
- Every action authorized
- Every input validated
- Every output sanitized

---

## Authentication Security

### Password Security

**Hashing Algorithm: Argon2id**
```typescript
// Password hashing configuration
const hashConfig = {
  algorithm: 'argon2id',
  memoryCost: 65536,    // 64 MB
  timeCost: 3,          // 3 iterations
  parallelism: 4,       // 4 parallel threads
  saltLength: 16,       // 16 bytes
  hashLength: 32        // 32 bytes output
};
```

**Password Requirements:**
```typescript
const passwordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  preventCommon: true,        // Against common password list
  preventUserInfo: true,      // No email/name in password
  preventRecentPasswords: 5   // Last 5 passwords
};
```

### Token Security

**JWT Structure:**
```typescript
// Access Token (short-lived)
{
  header: {
    alg: "RS256",
    typ: "JWT",
    kid: "key-id-123"      // Key ID for rotation
  },
  payload: {
    sub: "usr_abc123",     // User ID
    role: "USER",          // User role
    permissions: [],       // Additional permissions
    iat: 1705406400,       // Issued at
    exp: 1705407300,       // Expires (15 min)
    jti: "token-id-xyz"    // Unique token ID
  }
}

// Refresh Token (stored in DB, hashed)
{
  id: "ref_token_id",
  userId: "usr_abc123",
  tokenHash: "sha256(token)",
  familyId: "family_abc",  // For reuse detection
  deviceId: "device_xyz",
  expiresAt: "2026-01-23T10:00:00Z",
  createdAt: "2026-01-16T10:00:00Z"
}
```

**Token Refresh Flow:**
```
Client                 Server                   Database
  │                      │                         │
  │  Refresh Request     │                         │
  │─────────────────────▶│                         │
  │                      │  Lookup Token Hash      │
  │                      │────────────────────────▶│
  │                      │  Token Found            │
  │                      │◀────────────────────────│
  │                      │                         │
  │                      │  Verify Not Reused      │
  │                      │  (check familyId)       │
  │                      │                         │
  │                      │  Delete Old Token       │
  │                      │────────────────────────▶│
  │                      │                         │
  │                      │  Create New Tokens      │
  │                      │────────────────────────▶│
  │                      │                         │
  │  New Access Token    │                         │
  │  + Refresh Cookie    │                         │
  │◀─────────────────────│                         │
```

**Token Reuse Detection:**
If a refresh token is reused after being rotated, ALL tokens in that family are invalidated (indicates token theft).

### Session Security

```typescript
interface SessionConfig {
  accessTokenLifetime: 900,      // 15 minutes
  refreshTokenLifetime: 604800,  // 7 days
  maxConcurrentSessions: 5,      // Per user
  sessionInactivityTimeout: 3600, // 1 hour
  requireReauthFor: [
    'CHANGE_PASSWORD',
    'CHANGE_EMAIL',
    'ADD_PAYMENT_METHOD',
    'WITHDRAWAL'
  ]
}
```

---

## Authorization Security

### Role-Based Access Control (RBAC)

```typescript
enum Role {
  USER = 'USER',           // Athletes and parents
  COACH = 'COACH',         // Individual coaches
  ORG_ADMIN = 'ORG_ADMIN', // Organization admins
  ADMIN = 'ADMIN'          // Platform admins
}

interface Permission {
  resource: string;        // e.g., 'bookings', 'users'
  action: string;          // e.g., 'create', 'read', 'update', 'delete'
  scope: 'own' | 'org' | 'all';
}
```

### Permission Matrix

| Role | Bookings | Users | Payments | Organization |
|------|----------|-------|----------|--------------|
| USER | own:crud | own:ru | own:r | - |
| COACH | related:crud | roster:r | own:crud | - |
| ORG_ADMIN | org:crud | org:crud | org:r | org:crud |
| ADMIN | all:crud | all:crud | all:r | all:crud |

### Attribute-Based Access Control (ABAC)

For complex scenarios:

```typescript
interface AccessPolicy {
  effect: 'ALLOW' | 'DENY';
  principal: {
    roles?: Role[];
    userId?: string;
    attributes?: Record<string, any>;
  };
  resource: {
    type: string;
    attributes?: Record<string, any>;
  };
  action: string;
  conditions?: {
    timeWindow?: { start: string; end: string };
    ipRange?: string[];
    mfaRequired?: boolean;
  };
}

// Example: Coach can view athlete only if in their roster
const policy: AccessPolicy = {
  effect: 'ALLOW',
  principal: { roles: ['COACH'] },
  resource: { type: 'athlete' },
  action: 'read',
  conditions: {
    resourceAttribute: 'athlete.coachId == principal.userId'
  }
};
```

---

## Input Validation & Sanitization

### Validation Pipeline

```typescript
// All inputs validated before processing
const validateInput = async (input: any, schema: Schema) => {
  // 1. Type validation
  const typeValid = validateTypes(input, schema);

  // 2. Format validation (email, phone, etc.)
  const formatValid = validateFormats(input, schema);

  // 3. Length/size limits
  const sizeValid = validateSizes(input, schema);

  // 4. Business rules
  const businessValid = await validateBusinessRules(input, schema);

  // 5. Sanitization
  const sanitized = sanitizeInput(input, schema);

  return { valid: true, data: sanitized };
};
```

### Common Attack Prevention

**SQL Injection:**
```typescript
// NEVER: String concatenation
const query = `SELECT * FROM users WHERE id = '${userId}'`; // VULNERABLE

// ALWAYS: Parameterized queries
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]); // SAFE
```

**XSS Prevention:**
```typescript
// Output encoding
const safeHtml = escapeHtml(userInput);

// Content Security Policy
const csp = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'strict-dynamic'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'https://cdn.clubroom.app'],
  'connect-src': ["'self'", 'https://api.clubroom.app']
};
```

**CSRF Protection:**
```typescript
// SameSite cookies
Set-Cookie: session=xxx; SameSite=Strict; Secure; HttpOnly

// CSRF tokens for state-changing operations
const csrfToken = generateCsrfToken(sessionId);
```

---

## Rate Limiting

### Rate Limit Configuration

```typescript
const rateLimits = {
  // Authentication endpoints
  'POST /auth/login': { limit: 5, window: '15m', action: 'block' },
  'POST /auth/register': { limit: 3, window: '1h', action: 'block' },
  'POST /auth/forgot-password': { limit: 3, window: '1h', action: 'block' },

  // General API
  'authenticated': { limit: 1000, window: '1h', action: 'throttle' },
  'unauthenticated': { limit: 100, window: '1h', action: 'block' },

  // Sensitive operations
  'POST /wallet/topup': { limit: 10, window: '1h', action: 'block' },
  'POST /earnings/withdraw': { limit: 5, window: '24h', action: 'block' },

  // File uploads
  'POST /videos/upload': { limit: 10, window: '1h', action: 'block' },
  'POST /*/upload': { limit: 20, window: '1h', action: 'throttle' }
};
```

### Rate Limit Response

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 900
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1705407300

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 900
  }
}
```

---

## Logging & Monitoring

### Security Event Logging

```typescript
interface SecurityEvent {
  eventType: SecurityEventType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  resource?: string;
  action?: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  details: Record<string, any>;
  timestamp: string;
}

enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RATE_LIMIT_HIT = 'RATE_LIMIT_HIT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_EXPORT = 'DATA_EXPORT'
}
```

### Alerting Thresholds

| Event | Threshold | Action |
|-------|-----------|--------|
| Failed logins (single user) | 5 in 15 min | Lock account |
| Failed logins (global) | 100 in 5 min | Alert + investigate |
| Permission denied | 10 in 5 min | Alert |
| Rate limit hits | 50 in 5 min | Alert |
| Token reuse detected | 1 | Revoke all, alert |
| Admin action | Any | Log + audit |

---

## Secure Development

### Code Review Checklist

- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] All outputs encoded
- [ ] Parameterized queries used
- [ ] Proper error handling (no stack traces to users)
- [ ] Authorization checks present
- [ ] Rate limiting applied
- [ ] Audit logging implemented
- [ ] Sensitive data masked in logs
- [ ] Tests include security scenarios

### Dependency Security

```bash
# Regular dependency audits
npm audit

# Automated with CI/CD
npm audit --audit-level=high

# Update vulnerable packages
npm audit fix
```

### Secret Management

```typescript
// NEVER in code
const apiKey = "sk-1234567890"; // WRONG

// Environment variables (dev)
const apiKey = process.env.API_KEY;

// Secret manager (production)
const apiKey = await secretManager.getSecret('api-key');
```

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 | Critical - Active breach | 15 min | Data breach, system compromise |
| P2 | High - Potential breach | 1 hour | Suspicious access patterns |
| P3 | Medium - Security issue | 4 hours | Vulnerability discovered |
| P4 | Low - Minor issue | 24 hours | Policy violation |

### Response Procedures

1. **Identify** - Confirm and classify the incident
2. **Contain** - Limit the impact (revoke tokens, block IPs)
3. **Eradicate** - Remove the threat
4. **Recover** - Restore normal operations
5. **Learn** - Post-incident review and improvements

---

## Compliance

### Standards Adherence

| Standard | Relevance | Status |
|----------|-----------|--------|
| GDPR | User data protection | Implemented |
| CCPA | California privacy | Implemented |
| COPPA | Child data protection | Implemented |
| PCI DSS | Payment security | Via Stripe |
| SOC 2 | Security controls | Planned |

### Regular Audits

- **Quarterly**: Internal security review
- **Annually**: Third-party penetration testing
- **Ongoing**: Automated vulnerability scanning
