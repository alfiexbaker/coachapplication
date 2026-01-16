# Clubroom API Documentation

> **Security-First API Design**

## Overview

This directory contains comprehensive API documentation for the Clubroom coaching platform. Every endpoint is designed with security as the primary concern.

## Documentation Index

| Document | Description |
|----------|-------------|
| [AUTH.md](./AUTH.md) | Authentication & authorization endpoints |
| [BOOKING.md](./BOOKING.md) | Session booking management |
| [PAYMENT.md](./PAYMENT.md) | Wallet, payments, and earnings |
| [FAMILY.md](./FAMILY.md) | Family and child management |
| [MESSAGING.md](./MESSAGING.md) | Communication endpoints |
| [CONTENT.md](./CONTENT.md) | Media and content management |
| [ORGANIZATION.md](./ORGANIZATION.md) | Academy and club management |
| [SECURITY.md](./SECURITY.md) | Security implementation details |
| [DATA-PROTECTION.md](./DATA-PROTECTION.md) | Data handling and privacy |

## API Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.clubroom.app/v1` |
| Staging | `https://api-staging.clubroom.app/v1` |
| Development | `http://localhost:3000/v1` |

## Authentication

All API requests (except public endpoints) require authentication:

```http
Authorization: Bearer <access_token>
```

## Security Principles

### 1. Defense in Depth
Multiple security layers protect every endpoint:
- TLS encryption in transit
- JWT token validation
- Role-based access control
- Input validation and sanitization
- Rate limiting
- Audit logging

### 2. Least Privilege
Users only access data they're authorized to see:
- Athletes see their own data
- Parents see their children's data
- Coaches see their clients' data
- Organizations see their members' data

### 3. Data Minimization
APIs return only necessary data:
- No sensitive fields in list views
- Separate endpoints for detailed views
- Explicit opt-in for additional data

## Common Response Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | Success | Successful GET/PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate/conflict |
| 422 | Unprocessable | Validation failed |
| 429 | Too Many Requests | Rate limited |
| 500 | Server Error | Internal error |

## Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "requestId": "req_abc123"
  }
}
```

## Versioning

API uses URL versioning: `/v1/`, `/v2/`, etc.

Breaking changes require new versions. Non-breaking additions to existing versions are allowed.
