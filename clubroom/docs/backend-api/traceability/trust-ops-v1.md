# Trust + Safety + Ops V1 Traceability Matrix (UI <-> API <-> Data <-> AuthZ)

**Contract status**: Signed for pre-API freeze (2026-03-01)  
**Spine**: Trust, Safety & Operations

This matrix freezes trust-critical paths, including injury/medical surfaces, concern reporting from end-flows, verification, and account/legal operations.

## Backend Dependency Owners
| Owner key | Module owner scope (planned) | Primary sprint anchor |
|---|---|---|
| `family-athlete` | `apps/api/modules/family-athlete` (family, child profile, medical, emergency, consents) | Sprint 03 |
| `trust-safeguarding` | `apps/api/modules/trust-ops` (incidents, actions, safeguarding audit) | Sprint 10 |
| `verification` | `apps/api/modules/verification` (document upload/status/workflow) | Sprint 04 + Sprint 10 |
| `identity-access` | `apps/api/modules/identity-access` (`/v1/me`, sessions, account surface security) | Sprint 02 |
| `retention-legal` | `apps/api/modules/retention-legal` (deletion requests, legal holds, retention runs) | Sprint 10 |

## Critical UI Contract Table
| Flow | Critical UI route(s) | UI anchors (components/services) | Planned API endpoint(s) | Backend dependency owner | Mock-only assumption now | Migration order |
|---|---|---|---|---|---|---|
| Health and injury dashboard | `/health`, `/health/injuries`, `/health/log`, `/health/[id]` | `hooks/use-health-hub.ts`, health screens | `GET /v1/athletes/:athleteId/injuries`, `POST /v1/athletes/:athleteId/injuries`, `PATCH /v1/injuries/:injuryId` | `family-athlete` | injury logs are local and role checks are UI-side only | Trust step 1 |
| Child medical profile | `/child/[id]/medical` | child medical screen + family services | `GET /v1/athletes/:athleteId/medical`, `PATCH /v1/athletes/:athleteId/medical` | `family-athlete` | no server-side guardian/coach gate today | Trust step 1 |
| Child emergency contacts | `/child/[id]/emergency` | child emergency screen + family services | `GET /v1/athletes/:athleteId/emergency-contacts`, `PATCH /v1/athletes/:athleteId/emergency-contacts` | `family-athlete` | emergency contacts live in AsyncStorage only | Trust step 1 |
| Family sharing and child profile management | `/family`, `/family/sharing`, `/(modal)/add-child`, `/(modal)/edit-child-profile`, `/(modal)/edit-child-sen` | family/child components + consent service | `GET /v1/families/:familyId`, `POST /v1/families/:familyId/guardians`, `POST /v1/athletes`, `PATCH /v1/athletes/:athleteId`, `PUT /v1/athletes/:athleteId/consents` | `family-athlete` | co-guardian and consent history currently local-only | Trust step 2 |
| End-flow safeguarding report (group and 1:1) | `/session/[id]/complete`, `/development/session/[sessionId]`, `/roster/[athleteId]/raise-concern` | completion and development flows + concern route builder | `POST /v1/safeguarding/incidents`, `GET /v1/safeguarding/incidents/:id`, `POST /v1/safeguarding/incidents/:id/actions` | `trust-safeguarding` | concern forms do not persist to backend case workflow yet | Trust step 2 |
| Booking issue safety escalation | `/(tabs)/bookings/report-problem` | bookings issue screen + booking detail context pass-through | `POST /v1/safeguarding/incidents` (category `booking_issue.safety`), `POST /v1/safeguarding/incidents/:id/actions` | `trust-safeguarding` | booking-id context is only in route params today | Trust step 2 |
| Coach verification hub | `/verification`, `/verification/id`, `/verification/background`, `/verification/credentials`, `/verification/insurance` | verification screens + document upload service | `POST /v1/coaches/me/verifications/:type/documents`, `GET /v1/coaches/me/verifications` | `verification` | upload completion/status lifecycle is mocked | Trust step 3 |
| Account/legal/privacy surfaces | `/settings`, `/settings/account`, `/settings/help`, `/settings/privacy`, `/settings/privacy-policy`, `/settings/terms` | settings hub + account/privacy components | `GET /v1/me`, `GET /v1/me/sessions`, `POST /v1/me/sessions/:sessionId/revoke`, `POST /v1/me/sessions/revoke-all`, `POST /v1/me/data-deletion-requests`, `POST /v1/me/data-deletion-requests/:id/cancel` | `identity-access` + `retention-legal` | session/device and deletion workflows are static placeholders | Trust step 4 |
| Ops/admin management hub | `/manage`, `/manage/bookings` | manage screens + booking admin actions | `POST /v1/admin/break-glass/start`, `POST /v1/admin/break-glass/:id/end`, `POST /v1/admin/retention-runs` (internal) | `trust-safeguarding` + `retention-legal` | admin audit and break-glass are not enforced yet | Trust step 5 |

## Migration Order (Trust/Ops Spine)
1. Family/child medical, emergency, injury APIs with strict guardian gates
2. Safeguarding incident model and concern-report ingestion from end-flows
3. Verification document upload and status lifecycle
4. Account/security/legal surfaces (`/v1/me`, sessions, deletion request APIs)
5. Internal ops controls (break-glass, retention runs, legal hold integration)

## Injury Reporting Placement Guarantee
- Injury reporting is treated as a first-class end-flow requirement, not hidden utility:
  - athlete/parent entry: `/health`, `/health/injuries`
  - session end-flow escalation: `/session/[id]/complete`, `/development/session/[sessionId]`
  - booking-issue escalation: `/(tabs)/bookings/report-problem` with safety category

## Freeze Notes
- Trust/Ops routes here are user-visible and covered by placement/trust gates from Sprint 5.
- Any change to concern/injury entry paths must update this contract before release.
