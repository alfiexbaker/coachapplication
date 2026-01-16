# Authentication API

> **Security Level: CRITICAL**

## Overview

The Authentication API handles user registration, login, token management, and account security. All authentication endpoints implement strict security measures.

---

## Security Implementation

### Password Security
- **Algorithm:** Argon2id (winner of Password Hashing Competition)
- **Memory Cost:** 64 MB
- **Time Cost:** 3 iterations
- **Parallelism:** 4 threads
- **Salt:** 16 bytes, cryptographically random

### Token Security
- **Access Token:** JWT, RS256 signed, 15-minute expiry
- **Refresh Token:** Opaque, stored hashed, 7-day expiry, rotated on use
- **Token Storage:** Access in memory, refresh in HTTP-only secure cookie

### Rate Limiting
| Endpoint | Limit | Window | Lockout |
|----------|-------|--------|---------|
| Login | 5 attempts | 15 min | 30 min after 5 failures |
| Register | 3 attempts | 1 hour | - |
| Password Reset | 3 attempts | 1 hour | - |
| Verify Email | 5 attempts | 1 hour | - |

---

## Endpoints

### POST /auth/register

Create a new user account.

**Security:**
- Rate limited (3/hour)
- Email verification required
- Password strength validation
- Consent recording

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123!",
  "firstName": "John",
  "lastName": "Smith",
  "userType": "USER",
  "sport": "Tennis",
  "consent": {
    "termsAccepted": true,
    "privacyAccepted": true,
    "marketingOptIn": false
  }
}
```

**Response (201):**
```json
{
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "userType": "USER",
    "emailVerified": false,
    "createdAt": "2026-01-16T10:00:00Z"
  },
  "message": "Verification email sent"
}
```

**Validation Rules:**
| Field | Rule |
|-------|------|
| email | Valid format, unique, max 254 chars |
| password | Min 12 chars, uppercase, lowercase, number, special |
| firstName | 1-50 chars, letters/spaces/hyphens only |
| lastName | 1-50 chars, letters/spaces/hyphens only |
| userType | "USER" or "COACH" |

---

### POST /auth/login

Authenticate user and receive tokens.

**Security:**
- Rate limited (5/15min)
- Account lockout after failures
- Timing-safe comparison
- No user enumeration

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123!",
  "deviceId": "device_xyz789"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "userType": "USER",
    "emailVerified": true
  }
}
```

**Note:** Refresh token sent as HTTP-only cookie, not in response body.

**Security Headers Set:**
```http
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/auth; Max-Age=604800
```

---

### POST /auth/refresh

Refresh access token using refresh token.

**Security:**
- Refresh token rotation (old token invalidated)
- Detects token reuse (compromised token family)
- Requires valid refresh token cookie

**Request:**
No body required. Refresh token read from cookie.

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

**Token Reuse Detection:**
If a refresh token is reused after rotation, ALL tokens for that user are invalidated (security breach assumed).

---

### POST /auth/logout

End user session.

**Security:**
- Invalidates refresh token
- Clears all session data
- Audit logged

**Request:**
```json
{
  "allDevices": false
}
```

**Response (204):**
No content. Refresh token cookie cleared.

---

### POST /auth/verify-email

Verify email address with code.

**Security:**
- Code expires in 24 hours
- Code hashed in database
- Single use only
- Rate limited (5/hour)

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "verified": true,
  "message": "Email verified successfully"
}
```

---

### POST /auth/forgot-password

Request password reset.

**Security:**
- No user enumeration (same response for valid/invalid email)
- Token expires in 1 hour
- Token hashed in database
- Rate limited (3/hour)

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account exists, a reset email has been sent"
}
```

---

### POST /auth/reset-password

Reset password with token.

**Security:**
- Token single-use
- Token expires in 1 hour
- Invalidates all existing sessions
- Password history check (last 5)

**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "NewSecureP@ssw0rd456!"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

---

### POST /auth/change-password

Change password for authenticated user.

**Security:**
- Requires current password
- Password history check
- Invalidates other sessions (optional)
- Audit logged

**Request:**
```json
{
  "currentPassword": "OldSecureP@ssw0rd123!",
  "newPassword": "NewSecureP@ssw0rd456!",
  "logoutOtherDevices": true
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

---

### GET /auth/sessions

List active sessions for user.

**Security:**
- User can only see own sessions
- Session details limited (no full tokens)

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "sess_abc123",
      "deviceName": "iPhone 15 Pro",
      "location": "London, UK",
      "lastActive": "2026-01-16T10:00:00Z",
      "current": true
    }
  ]
}
```

---

### DELETE /auth/sessions/:sessionId

Revoke a specific session.

**Security:**
- User can only revoke own sessions
- Audit logged

**Response (204):**
No content.

---

## Data Protection

### What We Store
| Data | Storage | Encryption |
|------|---------|------------|
| Email | Database | At rest (AES-256) |
| Password | Database | Argon2id hash only |
| Refresh Tokens | Database | SHA-256 hash only |
| Session Data | Database | At rest (AES-256) |

### What We Never Store
- Plain text passwords
- Full refresh tokens
- Access tokens (stateless JWT)
- Password reset tokens (only hash)

### Data Retention
| Data | Retention |
|------|-----------|
| Active sessions | Until logout/expiry |
| Failed login attempts | 24 hours |
| Password reset tokens | 1 hour |
| Audit logs | 2 years |

---

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_001 | Invalid credentials |
| AUTH_002 | Account locked |
| AUTH_003 | Email not verified |
| AUTH_004 | Token expired |
| AUTH_005 | Token invalid |
| AUTH_006 | Session revoked |
| AUTH_007 | Password too weak |
| AUTH_008 | Rate limit exceeded |
