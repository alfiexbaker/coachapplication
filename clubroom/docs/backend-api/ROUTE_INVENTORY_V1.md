# `/v1` Route Inventory (Contracts-First, Phase 1)

This is the initial endpoint inventory for the Clubroom backend. It is intentionally broader than the first coded scaffold and should be implemented sprint-by-sprint.

Status legend:
- `scaffolded`: route exists in `apps/api`
- `planned`: contract + authz + data model defined, implementation pending
- `deferred`: intentionally after phase 1 or later sprint

## Current Scaffolded Routes
| Route | Method | Status | Notes |
|---|---|---|---|
| `/v1/health` | `GET` | `scaffolded` | contract in `@clubroom/shared-contracts` |
| `/v1/ready` | `GET` | `scaffolded` | DB/storage checks still placeholders |
| `/v1/meta/version` | `GET` | `scaffolded` | dev metadata only |
| `/v1/bookings/:bookingId/cancel` | `POST` | `scaffolded` | booking cancellation scaffold with actor ownership enforcement and idempotent cancelled response |
| `/v1/athletes/:athleteId/injuries` | `GET/POST` | `scaffolded` | in-memory scaffold for trust/health endpoint contract verification |
| `/v1/injuries/:injuryId` | `PATCH` | `scaffolded` | injury status/notes update scaffold |
| `/v1/athletes/:athleteId/medical` | `GET/PATCH` | `scaffolded` | medical profile scaffold with doctor, insurance, restriction, and notes fields |
| `/v1/athletes/:athleteId/emergency-contacts` | `GET/PATCH` | `scaffolded` | emergency contacts scaffold with stable contact IDs, primary contact, and pickup flags |
| `/v1/athletes/:athleteId/consents` | `GET/PUT` | `scaffolded` | consent record scaffold covering photo, video, social, and emergency treatment flags |
| `/v1/safeguarding/incidents` | `POST` | `scaffolded` | concern ingestion scaffold with incident tracking |
| `/v1/safeguarding/incidents/:incidentId` | `GET` | `scaffolded` | incident detail scaffold |
| `/v1/safeguarding/incidents/:incidentId/actions` | `POST` | `scaffolded` | incident action append + status transition scaffold |

## Identity / Sessions / Auth
| Route | Method | Status | Contract(s) | AuthZ | UI anchors |
|---|---|---|---|---|---|
| `/v1/me` | `GET` | `planned` | `MeResponse` | authenticated self | settings/account screens |
| `/v1/me/sessions` | `GET` | `planned` | `SessionListResponse` | authenticated self | settings/security |
| `/v1/me/sessions/revoke-all` | `POST` | `planned` | `RevokeAllSessionsRequest/Response` | self | settings/security |
| `/v1/me/sessions/:sessionId/revoke` | `POST` | `planned` | `RevokeSessionRequest/Response` | self | settings/security |

## Family / Athlete / Consent / Medical
| Route | Method | Status | Contract(s) | AuthZ | UI anchors |
|---|---|---|---|---|---|
| `/v1/families/:familyId` | `GET` | `planned` | `FamilyResponse` | guardian membership | `app/family/index.tsx` |
| `/v1/families/:familyId/guardians` | `POST` | `planned` | `CreateGuardianInviteRequest` | family admin guardian | `app/family/sharing.tsx` |
| `/v1/athletes` | `POST` | `planned` | `CreateAthleteRequest` | parent/guardian | `app/(modal)/add-child.tsx` |
| `/v1/athletes/:athleteId` | `PATCH` | `planned` | `UpdateAthleteRequest` | guardian / athlete self (policy) | `app/(modal)/edit-child-profile.tsx` |
| `/v1/athletes/:athleteId/medical` | `GET` | `scaffolded` | `MedicalRecordResponse` | guardian + verified coach (scoped) | `app/child/[id]/medical.tsx`, `services/family/family-health-service.ts` |
| `/v1/athletes/:athleteId/medical` | `PATCH` | `scaffolded` | `UpdateMedicalRecordRequest` | guardian | `app/child/[id]/medical.tsx`, `services/family/family-health-service.ts` |
| `/v1/athletes/:athleteId/emergency-contacts` | `GET` | `scaffolded` | `EmergencyContactsResponse` | guardian + gated coach | `app/child/[id]/emergency.tsx`, `services/family/family-health-service.ts` |
| `/v1/athletes/:athleteId/emergency-contacts` | `PATCH` | `scaffolded` | `UpdateEmergencyContactsRequest` | guardian | `app/child/[id]/emergency.tsx`, `services/family/family-health-service.ts` |
| `/v1/athletes/:athleteId/injuries` | `GET/POST` | `scaffolded` | `InjuriesResponse`, `CreateInjuryRequest` | athlete self / guardian / scoped coach | `app/health/index.tsx`, `app/health/injuries.tsx` |
| `/v1/injuries/:injuryId` | `PATCH` | `scaffolded` | `UpdateInjuryRequest` | athlete self / guardian / scoped coach | `app/health/[id].tsx` |
| `/v1/athletes/:athleteId/consents` | `GET` | `scaffolded` | `ConsentsResponse` | guardian + verified coach (scoped) | `app/child/[id]/medical.tsx`, `services/family/family-health-service.ts` |
| `/v1/athletes/:athleteId/consents` | `PUT` | `scaffolded` | `UpsertConsentsRequest`, `ConsentsResponse` | guardian | family/child consent UIs, `services/family/family-health-service.ts` |

## Coach / Clubs / Scheduling / Verification
| Route | Method | Status | Contract(s) | AuthZ | UI anchors |
|---|---|---|---|---|---|
| `/v1/coaches/me/profile` | `GET/PATCH` | `planned` | `CoachProfile*` | coach self | `app/(tabs)/coach-profile.tsx` |
| `/v1/coaches/me/offerings` | `GET/POST/PATCH` | `planned` | `Offering*` | coach self | session create + booking setup |
| `/v1/coaches/me/availability/templates` | `GET/POST/PATCH` | `planned` | `AvailabilityTemplate*` | coach self | `app/(tabs)/availability.tsx`, `app/availability/*` |
| `/v1/coaches/me/availability/overrides` | `GET/POST/PATCH` | `planned` | `AvailabilityOverride*` | coach self | `app/availability/calendar.tsx` |
| `/v1/coaches/me/scheduling-rules` | `GET/PATCH` | `planned` | `SchedulingRules*` | coach self | `services/scheduling-rules-service.ts` consumers |
| `/v1/clubs` | `GET/POST` | `planned` | `Club*` | authenticated / `club_admin` create | `app/(tabs)/club-hub.tsx` |
| `/v1/clubs/:clubId/memberships` | `GET/POST/PATCH` | `planned` | `ClubMembership*` | `club_admin` | club/admin UIs |
| `/v1/clubs/:clubId/squads` | `GET/POST/PATCH` | `planned` | `Squad*` | `club_admin` or owner coach | `app/squads/*` |
| `/v1/coaches/me/verifications/:type/documents` | `POST` | `planned` | `UploadVerificationDocument*` | coach self | `app/verification/*` |

## Booking / Group Sessions / Invites / Events
| Route | Method | Status | Contract(s) | AuthZ | UI anchors |
|---|---|---|---|---|---|
| `/v1/bookings` | `POST` | `planned` | `CreateBookingRequest`, `BookingResponse` | parent/athlete/coach | `app/book/[coachId]/*`, `components/ui/booking/*` |
| `/v1/bookings/:bookingId` | `GET` | `planned` | `BookingResponse` | participants/guardian/coach | `app/(tabs)/bookings/[id].tsx` |
| `/v1/bookings/:bookingId` | `PATCH` | `planned` | `UpdateBookingRequest`, `BookingResponse` | scoped actors + version | booking detail + admin tools |
| `/v1/bookings/:bookingId/cancel` | `POST` | `scaffolded` | `CancelBookingRequest`, `BookingResponse` | parent/athlete/coach tied to booking participants or delivery coach | `app/booking/[id]/cancel.tsx`, `hooks/use-booking-cancel.ts`, `services/booking/booking-authority-service.ts` |
| `/v1/bookings/:bookingId/reschedule-request` | `POST` | `planned` | `CreateBookingChangeRequest` | participant/guardian/coach | booking detail + chat template UX |
| `/v1/group-sessions` | `GET/POST` | `planned` | `GroupSession*` | read visibility / coach create | `app/group-sessions/index.tsx`, `app/group-sessions/create.tsx` |
| `/v1/group-sessions/:id/register` | `POST` | `planned` | `RegisterGroupSessionRequest` | parent/athlete | `hooks/use-group-session.ts`, `use-group-sessions.ts` |
| `/v1/group-sessions/:id/waitlist` | `POST` | `planned` | `JoinWaitlistRequest` | parent/athlete | group session detail + waitlist banner |
| `/v1/invites/:inviteId/respond` | `POST` | `planned` | `InviteResponseRequest` | invite target only | `app/invites.tsx`, `hooks/use-invites.ts` |
| `/v1/events/:eventId/rsvp` | `POST` | `planned` | `EventRsvpRequest` | event audience member | `hooks/use-event-rsvp.ts` |

## Revenue / Reconciler
| Route | Method | Status | Contract(s) | AuthZ | UI anchors |
|---|---|---|---|---|---|
| `/v1/invoices/:invoiceId` | `GET` | `planned` | `InvoiceResponse` | owner coach / payer / delegated finance | `components/invoices/*` |
| `/v1/coaches/me/invoices` | `GET` | `planned` | `InvoiceListResponse` | coach self | `app/(tabs)/earnings.tsx`, analytics revenue |
| `/v1/invoices/generate` | `POST` | `planned` | `GenerateInvoiceRequest` | coach/self service flow | `services/invoice-service.ts` replacement path |
| `/v1/invoices/:invoiceId/mark-paid` | `POST` | `planned` | `InvoiceTransitionRequest` | coach/delegated finance | reconciler UI |
| `/v1/invoices/:invoiceId/mark-unpaid` | `POST` | `planned` | `InvoiceTransitionRequest` | coach/delegated finance | reconciler UI |
| `/v1/invoices/:invoiceId/write-off` | `POST` | `planned` | `InvoiceTransitionRequest` | coach/delegated finance | reconciler UI |
| `/v1/invoices/:invoiceId/restore` | `POST` | `planned` | `InvoiceTransitionRequest` | coach/delegated finance | reconciler UI |
| `/v1/invoices/:invoiceId/reminders` | `POST` | `planned` | `SendInvoiceReminderRequest` | coach/delegated finance | reminder templates |

## Trust / Safeguarding / Ops
| Route | Method | Status | Contract(s) | AuthZ | UI anchors |
|---|---|---|---|---|---|
| `/v1/safeguarding/incidents` | `POST` | `scaffolded` | `CreateSafeguardingIncidentRequest`, `SafeguardingIncidentResponse` | coach/guardian scoped to athlete/booking context | `app/roster/[athleteId]/raise-concern.tsx`, `app/(tabs)/bookings/report-problem.tsx`, `services/trust/index.ts`, `services/concern-service.ts` |
| `/v1/safeguarding/incidents/:incidentId` | `GET` | `scaffolded` | `SafeguardingIncidentResponse` | assignment/role-restricted safeguarding access | trust follow-up surfaces, `services/trust/index.ts` |
| `/v1/safeguarding/incidents/:incidentId/actions` | `POST` | `scaffolded` | `CreateSafeguardingActionRequest`, `SafeguardingActionResponse` | safeguarding assignee/admin scope | operations tooling + incident review workflows, `services/trust/index.ts`, `services/concern-service.ts` |

## Progress / Media / Community / Trust Ops

Keep this file as the core `/v1` inventory index.
When these modules expand, add route rows here and update:
- `docs/backend-api/UI_API_BILATERAL_ALIGNMENT.md`
- `docs/backend-api/AUTHZ_AUDIT_AND_SECURITY.md`
- `docs/backend-api/API_CONTRACTS_ERRORS_AND_HANDLERS.md`

## Inventory Rules
- Every row must eventually include:
  - shared contract name(s)
  - authz rule summary (role + grants + safety gates)
  - idempotency requirement (for writes)
  - versioning/conflict requirement (for mutable resources)
  - UI route/service anchors
