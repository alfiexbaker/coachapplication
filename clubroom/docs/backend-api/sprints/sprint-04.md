# Sprint 04 - Coach, Club, Scheduling, and Verification

## Goal
Implement coach business setup, club memberships, squads, scheduling, and verification records while preserving delegated-only access to coach-private resources.

## Dependencies
- Sprint 03

## Scope
- coach profiles and locations
- offerings/services
- availability templates + overrides + blocked times
- scheduling rules and cancellation policies
- clubs, club memberships, squads, squad memberships
- coach verification records and verification documents

## Codebase Alignment Anchors
- `app/(tabs)/coach-profile.tsx`
- `app/(tabs)/availability.tsx`
- `app/availability/*`
- `app/(tabs)/club-hub.tsx`
- `app/squads/*`
- `app/verification/*`
- `services/coach-service.ts`
- `services/availability-service.ts`
- `services/scheduling-rules-service.ts`
- `services/club-service.ts`
- `services/squad-service.ts`
- `services/verification-service.ts`

## Tables / Schema
- `coach_profiles` (PK = `user_id` recommended)
- `coach_locations`
- `coaching_offerings`
- `availability_templates`
- `availability_overrides`
- `blocked_time_ranges`
- `scheduling_rules`
- `cancellation_policy_rules`
- `clubs`
- `club_memberships`
- `squads`
- `squad_memberships`
- `coach_verifications`
- `verification_documents`

## Endpoints (examples)
- `GET/PATCH /v1/coaches/me/profile`
- `GET/POST/PATCH /v1/coaches/me/offerings`
- `GET/POST/PATCH /v1/coaches/me/availability/templates`
- `GET/POST/PATCH /v1/coaches/me/availability/overrides`
- `GET/PATCH /v1/coaches/me/scheduling-rules`
- `GET/POST /v1/clubs`
- `POST /v1/clubs/:clubId/memberships`
- `POST /v1/clubs/:clubId/squads`
- `POST /v1/coaches/me/verifications/:type/documents`

## AuthZ / Audit Notes
- owner coach has full access to own private scheduling/business resources
- `club_admin` sees/manages only club-owned resources by default
- `club_admin` access to coach-private scheduling/profile fields requires explicit grant
- verification document access is restricted and audited

## Test Gates
- coach owner vs club admin vs delegated staff access
- availability template/override conflict validation
- cancellation policy write validation
- verification doc signed URL access and denial cases
- audit events for writes and sensitive reads

## Exit Criteria
- Coach and club operational setup is API-backed and authz-safe
