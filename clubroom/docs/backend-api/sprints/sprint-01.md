# Sprint 01 - AuthN, Sessions/Devices, and Audit Skeleton

## Goal
Ship secure authentication integration (Auth0 JWT validation + local user/session registry) and establish the global audit event skeleton.

## Dependencies
- Sprint 00

## Scope
- Auth0 JWT verification plugin
- User provisioning/upsert on first authenticated request
- `user_roles` and basic role assignment reads
- Session/device tracking and revoke-all support
- `audit_events` base table + writer utility
- `/v1/me` and session/device management endpoints

## Tables / Schema
- `users`
- `user_profiles`
- `user_roles`
- `user_devices`
- `auth_sessions`
- `audit_events` (append-only, partition-ready)
- `security_events` (basic)

## Endpoints
- `GET /v1/me`
- `GET /v1/me/sessions`
- `POST /v1/me/sessions/revoke-all`
- `POST /v1/me/sessions/:sessionId/revoke`

## AuthZ / Audit Notes
- Authn required on all `/v1/me/*`
- Audit write for session revoke actions
- Security event on invalid/revoked token use attempts
- Multi-role user shape returned, but no acting-role-required endpoints yet

## UI/API Alignment Checks
Future consumers in current app likely map from:
- auth flows (`components/auth/*`)
- settings/account screens (`app/settings/**`, `app/(tabs)/settings.tsx`)

Add placeholder traceability entries even if UI integration is deferred.

## Test Gates
- valid token accepted, invalid token rejected
- revoked session denied
- revoke-all invalidates all active sessions
- audit event emitted for revoke actions
- response contract snapshots for `/v1/me`

## Exit Criteria
- Authenticated identity context is stable and reusable by all later sprints
- Session revoke flows and audit skeleton are production-safe
