# Sprint 03 - Family, Athlete, Consent, Medical, and SEN

## Goal
Deliver family and athlete identity/relationship APIs with strict guardian permissions and audited sensitive reads.

## Dependencies
- Sprint 02

## Scope
- families and guardian memberships
- athlete profiles (child and self-linked athlete model)
- guardian-child links
- emergency contacts
- medical records and SEN tags
- consents and consent history (append-only / revocable)
- verification/consent gates for sensitive reads

## Codebase Alignment Anchors
Current UI and services:
- `app/family/*`
- `app/child/[id]/medical.tsx`
- `app/child/[id]/emergency.tsx`
- `app/(modal)/add-child.tsx`
- `app/(modal)/edit-child-sen.tsx`
- `components/family/*`
- `components/child/*`
- `services/family/*`
- `services/child-service.ts`
- `services/consent-service.ts`
- `services/safety-service.ts`

## Tables / Schema
- `families`
- `family_memberships`
- `athletes`
- `guardian_child_links`
- `child_emergency_contacts`
- `child_medical_records`
- `child_sen_tags`
- `child_consents`
- optional `consent_artifacts`

## Endpoints (examples)
- `GET /v1/families/:familyId`
- `POST /v1/families/:familyId/guardians`
- `POST /v1/athletes`
- `PATCH /v1/athletes/:athleteId`
- `GET /v1/athletes/:athleteId/medical`
- `PATCH /v1/athletes/:athleteId/medical`
- `GET /v1/athletes/:athleteId/emergency-contacts`
- `PUT /v1/athletes/:athleteId/consents`

## AuthZ / Audit Notes
- guardians control child records
- athlete self access policy depends on linked user and age/feature policy
- coach reads of medical/SEN/emergency require both relationship and safety gates
- sensitive reads are audited (`medical.read`, `sen.read`, `emergency.read`)
- no hard delete of consent history; use revocation/supersession

## Test Gates
- guardian vs non-guardian access
- co-guardian sharing access
- coach verification gating for sensitive reads
- consent revocation effect on downstream access
- version conflicts on medical updates
- sensitive read audit assertions

## Exit Criteria
- Family and child trust-critical data flows are correct and audited
- Parent + same child across multiple clubs remains supported by model
