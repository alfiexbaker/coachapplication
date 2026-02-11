# Coach + Parent Functionality Atlas

**Last Updated**: 2026-02-11  
**Scope**: Live functionality + route paths for `COACH` and `PARENT` roles.

## Legend

| Status | Meaning |
|---|---|
| `LIVE` | Implemented and routed |
| `PARTIAL` | Implemented but missing depth/polish/coverage |
| `GAP` | Not yet delivered to product standard |

## Coach Function Map

| Spine | Capability | Route Paths | Status |
|---|---|---|---|
| Booking/Revenue | Coach home + operational hub | `/(tabs)/index`, `/(tabs)/schedule`, `/(tabs)/athletes`, `/(tabs)/feed`, `/(tabs)/settings` | `LIVE` |
| Booking/Revenue | Availability management | `/(tabs)/availability`, `/availability/add-template`, `/availability/edit-template`, `/availability/block-date`, `/availability/calendar`, `/availability/scheduling-rules` | `LIVE` |
| Booking/Revenue | Session creation and publishing | `/sessions/create`, `/group-sessions/create`, `/group-sessions`, `/group-sessions/[id]` | `LIVE` |
| Booking/Revenue | Booking operations | `/(tabs)/bookings`, `/(tabs)/bookings/[id]`, `/booking/[id]/cancel`, `/bookings/[id]/counter`, `/bookings/[id]/negotiate`, `/bookings/recurring`, `/bookings/subscribe` | `LIVE` |
| Booking/Revenue | Invite orchestration | `/session-invites`, `/session-invites/create`, `/session-invites/group`, `/session-invites/squad`, `/session-invites/[id]`, `/invites` | `LIVE` |
| Booking/Revenue | Waitlist management | `/waitlist`, `/waitlist/manage` | `PARTIAL` |
| Development/Analytics | Athlete profile + development views | `/development/athlete/[athleteId]`, `/development/athlete/[athleteId]/special-needs`, `/development/session/[sessionId]`, `/development/athlete-session/[sessionId]` | `LIVE` |
| Development/Analytics | Goals and skill tracking | `/goals`, `/goals/create`, `/goals/[id]`, `/skills`, `/skills/[category]` | `LIVE` |
| Development/Analytics | Drills + challenges | `/drills`, `/drills/library`, `/drills/create`, `/drills/assign`, `/drills/[id]`, `/drills/challenges`, `/drills/create-challenge` | `LIVE` |
| Development/Analytics | Video workflow | `/videos`, `/videos/upload`, `/videos/[id]`, `/videos/annotate/[id]`, `/videos/review/[id]` | `LIVE` |
| Development/Analytics | Session completion + notes | `/session/[id]/complete`, `/session-notes/[bookingId]`, `/(tabs)/bookings/session-feedback` | `LIVE` |
| Development/Analytics | Coach analytics dashboards | `/analytics/dashboard`, `/analytics/revenue`, `/analytics/retention`, `/analytics/[athleteId]` | `PARTIAL` |
| Community/Growth | Club and squad operations | `/(tabs)/club-hub`, `/club/create`, `/club/[id]`, `/club/[clubId]/dashboard`, `/club/[clubId]/calendar`, `/club/settings`, `/club/squad/create`, `/club/squad/[id]`, `/squads/[id]/invite` | `LIVE` |
| Community/Growth | Academy operations | `/academy/create`, `/academy/join`, `/academy/[id]`, `/academy/[id]/branding`, `/academy/[id]/settings`, `/academy/[id]/staff` | `LIVE` |
| Community/Growth | Feed and posting | `/(tabs)/feed`, `/(modal)/create-post`, `/(modal)/create-club-post`, `/(modal)/post-detail` | `PARTIAL` |
| Community/Growth | Messaging + community groups | `/(tabs)/messages`, `/chat/[threadId]`, `/community`, `/community/[groupId]`, `/carpool` | `LIVE` |
| Trust/Ops | Verification and trust pages | `/verification`, `/verification/id`, `/verification/credentials`, `/verification/background` | `PARTIAL` |
| Trust/Ops | Safety + health records | `/health`, `/health/injuries`, `/health/log`, `/health/[id]`, `/roster/consents`, `/roster/[athleteId]/raise-concern` | `PARTIAL` |
| Booking/Revenue | Earnings + financial pages | `/(tabs)/earnings`, `/earnings`, `/packages/manage`, `/packages`, `/packages/[id]`, `/invoices`, `/invoices/[id]` | `PARTIAL` |

## Parent Function Map

| Spine | Capability | Route Paths | Status |
|---|---|---|---|
| Community/Growth | Parent home + engagement tabs | `/(tabs)/index`, `/(tabs)/feed`, `/(tabs)/bookings`, `/(tabs)/messages`, `/(tabs)/settings` | `LIVE` |
| Booking/Revenue | Discovery + compare coaches | `/discover-sessions`, `/discover/map`, `/discover/filters`, `/compare`, `/compare/[ids]`, `/favourites`, `/coach/[coachId]/public` | `LIVE` |
| Booking/Revenue | Booking funnel | `/book-coach`, `/book/[coachId]/session-type`, `/book/[coachId]/schedule`, `/book/[coachId]/details`, `/book/[coachId]/review`, `/book/[coachId]/confirmation`, `/book/[coachId]/multi-week`, `/confirm-booking` | `LIVE` |
| Booking/Revenue | Booking management | `/(tabs)/bookings`, `/(tabs)/bookings/[id]`, `/booking/[id]/cancel`, `/bookings/[id]/counter`, `/bookings/[id]/negotiate`, `/bookings/recurring` | `LIVE` |
| Booking/Revenue | Invite response | `/session-invites/[id]`, `/session/[id]/rsvp`, `/events/[id]/rsvp` | `LIVE` |
| Booking/Revenue | Event attendance and logistics | `/events`, `/events/[id]`, `/events/[id]/attendees`, `/waitlist`, `/waitlist/manage` | `PARTIAL` |
| Development/Analytics | Child and family management | `/(tabs)/children`, `/(modal)/add-child`, `/child/[id]/emergency`, `/child/[id]/medical`, `/children/badges/[childId]`, `/family`, `/family/calendar`, `/family/sharing`, `/family/spending` | `LIVE` |
| Development/Analytics | Progress tracking | `/development/child-progress/[childId]`, `/development/my-progress`, `/goals`, `/goals/[id]`, `/badges`, `/skills`, `/athlete/journal` | `LIVE` |
| Development/Analytics | Drills and video follow-up | `/drills`, `/drills/[id]`, `/drills/challenges`, `/videos`, `/videos/[id]`, `/videos/review/[id]` | `PARTIAL` |
| Community/Growth | Club and community participation | `/(tabs)/club-hub`, `/club/[id]`, `/community`, `/community/[groupId]`, `/chat/[threadId]` | `PARTIAL` |
| Community/Growth | Referrals and social sharing | `/referrals`, `/referrals/invite` | `LIVE` |
| Trust/Ops | Reviews and coach feedback | `/review/[bookingId]`, `/rate-coach` | `LIVE` |
| Trust/Ops | Notifications and controls | `/(tabs)/notifications`, `/settings/notifications`, `/settings/notifications/preferences` | `PARTIAL` |
| Booking/Revenue | Wallet/payment/invoice surfaces (POC mode) | `/(tabs)/wallet`, `/wallet/promo`, `/payment/methods`, `/payment/add-card`, `/invoices` | `PARTIAL` |

## Shared Flows (Coach + Parent)

| Capability | Route Paths | Status |
|---|---|---|
| Auth shell + role tabs | `/`, `/(tabs)` | `LIVE` |
| Settings core | `/settings`, `/settings/account`, `/settings/appearance`, `/settings/help`, `/settings/privacy`, `/settings/terms`, `/settings/calendar-sync`, `/settings/coaching` | `LIVE` |
| Messaging thread | `/chat/[threadId]` | `LIVE` |
| Club feed post modal | `/(modal)/post-detail` | `LIVE` |
| Problem reporting | `/(tabs)/bookings/report-problem` | `PARTIAL` |

## Gap Register

### Product Gaps (Business-Critical)

| Priority | Gap | Why It Matters | Impacted Surface |
|---|---|---|---|
| `P0` | RSVP depth closed (status options + reminders + richer counts) | Core social retention + conversion loop for clubs/parents | `/session/[id]/rsvp`, `/session-invites/[id]`, `/events/[id]/rsvp` |
| `P0` | Cancellation policy visibility closed across booking flow + detail surfaces | Trust and chargeback/dispute prevention | Booking funnel + `/booking/[id]/cancel` |
| `P1` | Push/deep-link reliability hardened (validation + legacy rewrite + centralized navigation helper) | Re-engagement and day-of-session reliability | `/settings/notifications`, notification events |
| `P1` | Safety reporting flow hardened (auto-escalation + parent notification + report mirroring) | Compliance and safeguarding posture | `/roster/[athleteId]/raise-concern`, health/safety flows |
| `P1` | Club/coach social feed depth is partial (contextual posting, richer activity) | Community growth and retention | `/(tabs)/feed`, post modals, club hub |
| `P2` | Cash-MVP financial screens exist but real payment behavior is deferred | Can confuse users if not clearly marked | `/wallet/*`, `/payment/*`, `/packages/*`, `/invoices/*` |

### Technical Gaps (Scale/Quality)

| Priority | Gap | Evidence |
|---|---|---|
| `P0` | Permission hardening was inconsistent in academy branding route | Fixed in `app/academy/[id]/branding.tsx` (removed hardcoded `canEdit = true`) |
| `P1` | High concentration of oversized files increases change-risk | 76 components >250 LOC, 25 app routes >300 LOC, 61 hooks >200 LOC, 69 services >300 LOC |
| `P1` | Routing type safety regression risk (watch for reintroduction) | 0 instances of `as unknown as Href` in `navigation/routes.ts` (resolved, guardrail required) |
| `P1` | Event-driven feed context still has placeholder behavior | `services/service-subscribers.ts` RSVP feed type TODO |
| `P2` | Offline/real-network seam still marked as TODO in `apiClient` | `services/api-client.ts` offline support TODO |
| `P2` | Historical docs contain stale closure metrics | Multiple closed trackers claim zero oversized files while current metrics differ |

## Recommended Refactor Waves (Next)

| Wave | Scope | Target |
|---|---|---|
| Wave A | Permission + auth guards for all write screens | Remove route-level permission shortcuts |
| Wave B | Split top 20 oversized services and hooks | Lower defect density and review cost |
| Wave C | Add regression guard for route typing (keep unsafe casts at zero) | Safer navigation contracts |
| Wave D | Close remaining product gaps (feed depth, event/waitlist polish, cash-MVP labeling) | Release readiness for premium market |
