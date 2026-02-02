# User Stories Review & API Readiness Audit

**Date**: 2026-02-02
**Scope**: Full platform audit — user stories, data input coverage, roles, club/school experience, API readiness
**Method**: 35 self-directed questions with pass/fail evaluation

---

## Part 1: 35 Audit Questions & Verdicts

### DATA INPUT COVERAGE — Does every field have a face?

#### Q1: Can a coach fill in every field on their profile through the UI?
**MOSTLY YES.** Bio, certifications, experiences, languages, specialties, social links, price range, session formats all have edit screens.
**GAPS:**
- `travelRadius` — no input control anywhere
- `liveStatusReason` — no UI for coaches to explain why they're not yet live
- `priceRange.unitLabel` — hardcoded, coach can't customise

#### Q2: Can a parent fill in all child data through the UI?
**YES for basics, GAPS on safety.** Name, DOB, relationship, skillLevel, position all have forms. Emergency contacts and medical info screens exist.
**GAPS:**
- Consents (photo/video/social media/emergency treatment) exist but are never prompted during onboarding
- Parents must discover the safety screens on their own — no nudge or checklist
- Special needs route exists (`children/[childId]/special-needs`) but may not be linked from the main child profile

#### Q3: Is there a UI for every booking field?
**PARTIAL.** Booking wizard covers athlete selection, service type, time slot, objectives.
**GAPS:**
- No way for a parent to pick a preferred location if the coach operates at multiple venues
- Applying a package credit at checkout is unclear — promo code field exists but package redemption flow is murky
- `sessionInviteId` linkage (booking created from invite) is broken — see Q24

#### Q4: Can coaches set ALL availability fields?
**NO — critical gaps.**
- Weekly templates (dayOfWeek, start/end) — ✅ works
- One-off overrides (block dates) — ✅ works
- `bufferMinutes` between sessions — ❌ **no input**
- `maxConcurrent` bookings per slot — ❌ **no input**
- `minimumAdvanceBookingHours` — ❌ **no settings screen**
- `maxAdvanceBookingDays` — ❌ **no settings screen**
- `allowSameDayBookings` — ❌ **no toggle**
- `rescheduleDeadlineHours` — ❌ **no input**

All of these are defined in `CoachSchedulingRules` type but have zero UI.

#### Q5: Can coaches create/manage cancellation policies?
**NO.** `CancellationPolicy` type with `RefundTier[]` is fully defined. No creation screen, no edit screen, no display to parents before booking. Flagged as critical gap in USER-STORIES.md.

#### Q6: Is there a UI for invoice management?
**PARTIAL.** Invoice types are comprehensive (number, tax/VAT, line items). Invoices page exists. But auto-generation from completed bookings and manual invoice creation are mock-only. No PDF generation or download.

#### Q7: Can a coach set up real payout methods?
**UI EXISTS, DOES NOTHING REAL.** Earnings screen displays payout methods. Adding bank account / PayPal / Stripe Connect is entirely mock. Acceptable for now — Stripe integration is explicitly deferred.

---

### COACH-SPECIFIC FEATURES

#### Q8: Does the coach analytics dashboard exist?
**YES — comprehensive.** Revenue charts, session stats by type, client retention metrics, cancellation breakdown, peak-hours heatmap, top skills taught, average rating trends. All mock data but screens are fully built.

#### Q9: Can a coach create a session plan?
**YES.** Objectives, warmup, main activities, cooldown, equipment, notes. Shareable with athletes.

#### Q10: Can a coach write a session recap?
**YES.** Summary, per-athlete highlights (strengths + areas to improve), skills worked, overall performance rating, photos/videos.

#### Q11: Can a coach mark attendance?
**NO — CRITICAL GAP.** `SessionRegistration.status` supports 'attended' / 'no_show' but there is no screen to toggle this. A coach finishes a session and has no way to record who showed up.

#### Q12: Is there a session completion flow?
**NO — CRITICAL GAP.** No lifecycle flow exists for: mark attendance → write session notes → award badges → trigger parent review request. Sessions just sit in "confirmed" with no progression.

#### Q13: Is the roster management solid?
**YES.** Full athlete directory with search, per-athlete notes (private), tags, status management (active/paused/graduated), session history, parent contact info. This is one of the stronger features.

#### Q14: Can badges be awarded from session context?
**YES.** Badge awarding supports session context, reason, note, visibility settings. Can be triggered from session recap or athlete profile.

---

### CLUBS & SCHOOLS — IS IT BORING?

#### Q15: Does the club hub feel like a real community?
**FUNCTIONAL BUT FLAT.** The club hub provides: feed with posts, squad management, match fixtures, events with RSVP, member roles.

**What makes it boring:**
- No club branding customisation (logo/colors exist in types but no editor screen)
- No pinned welcome message or new-member onboarding
- No club photo gallery or media highlights section
- No club-level analytics visible to members (coaches see analytics, members see nothing)
- No aggregated club calendar showing all squads' sessions + matches + events in one view
- No external links section (pitch directions, kit supplier, club website)
- Feed is text-heavy — no rich media templates, no match result cards, no session recap cards
- No "club shop" or merchandise links
- No leaderboards or squad standings

**What would make it better:**
1. A proper club dashboard with next match, next event, recent results, badges awarded this week
2. Club calendar that overlays all squad schedules
3. Photo/video gallery from sessions and matches
4. Match result cards in the feed (auto-generated from results entry)
5. Badge leaderboard per squad
6. Club branding editor (logo, colors, cover photo)

#### Q16: Is academy/school differentiated from club?
**BARELY.** Academy types include branding (logo, banner, colors, slug), staff permissions, membership with approval. But the actual screens mirror clubs almost exactly. No:
- Custom landing page / public profile
- Branded session booking experience
- Academy-specific onboarding ("Welcome to [Academy]. Here's how it works.")
- Programme tiers (e.g., development squad vs elite squad with different pricing)
- Academy-wide curriculum or training philosophy display

#### Q17: Are squads interesting or just rosters?
**DECENT, COULD BE BETTER.** Squad members, bulk invites, squad-scoped posts work.
**Missing:**
- Squad-level progress analytics (how is the U12s improving as a group?)
- Comparative anonymised stats between squad members
- Squad training plan templates
- Squad schedule calendar view
- Squad attendance tracking across all sessions

#### Q18: Do matches feel complete?
**YES — one of the stronger features.** Create fixture → invite players → parent responds → coach selects lineup → record result. Notifications for selection/reserve. Match types (friendly/league/cup/tournament).

#### Q19: Are events engaging?
**FUNCTIONAL.** Create event, set type/RSVP/attendance. Check-in methods (self, coach, QR, location).
**Missing:** Post-event photos, event recap, event discovery for non-members.

---

### ROLE EVALUATION

#### Q20: Are two roles (USER/COACH) sufficient?
**CLEVER BUT HAS GAPS.** The flag-based approach (USER + children[] = parent, USER + skillLevel = athlete, COACH + isOrganization = academy) works well and avoids role explosion.
**But:**
- CLUB_ADMIN is a membership role, not a user type — this is correct
- No distinct "academy owner" onboarding that bootstraps an academy
- A user cannot be both COACH and PARENT simultaneously — the `type` field is exclusive

#### Q21: Can a coach who is also a parent use both personas?
**NO.** `type: 'USER' | 'COACH'` is mutually exclusive. Many grassroots football coaches also have children who train with other coaches. They'd need two separate accounts. This is a real friction point.

**Recommendation:** Either allow a `roles: string[]` array, or add a `personalChildren: ChildReference[]` to the COACH type.

#### Q22: Are club/academy permissions granular enough?
**YES.** StaffMember roles (HEAD_COACH, COACH, ASSISTANT, ADMIN) with CoachPermission array. AcademyPermission covers all needed operations. This is well designed.

#### Q23: Is the admin role useful?
**NO — IT'S A STUB.** Admin has a tab layout with invite code management. Missing:
- User moderation (suspend/ban)
- Content moderation (hide/flag posts)
- Platform-wide analytics
- Dispute resolution workflow
- Coach verification approval queue
- Financial reporting / platform revenue tracking

---

### FLOW COMPLETENESS

#### Q24: Is discovery → book → complete → review flow end-to-end?
**NO — BROKEN AT KEY POINTS.**
- Discovery → Book → Confirm → Pay — ✅ works (mock payment)
- Session Completion (attendance + notes + review prompt) — ❌ doesn't exist
- Session Invite → Booking creation — ❌ **BROKEN** (logs to console, doesn't create booking — line 408-409 in session-invite-service.ts)
- Counter-offer → Booking creation — ❌ same bug

This is the single most critical issue in the codebase.

#### Q25: Does the invite negotiation flow work?
**UI WORKS, BACKEND BROKEN.** Coach sends invite → Parent sees it → Parent accepts/declines/counters — all the screens exist. But accepting an invite doesn't actually create a booking.

#### Q26: Does the family dashboard deliver value?
**YES.** Unified calendar across children, per-child spending breakdown, progress summaries, guardian management with permissions. Well-built feature.
**Minor gap:** No unified notification stream across all children.

#### Q27: Can guardian sharing actually work?
**TYPES COMPLETE, FLOW UNTESTED.** GuardianInvite, FamilyGuardian, permissions all defined. Invite form exists. But the second guardian accepting → logging in → seeing shared children flow is likely incomplete and untested.

#### Q28: Is wallet/payment end-to-end?
**NO.** Wallet with balance, top-up, transactions — all UI exists. But everything is mock. No Stripe, no card processing, no real money movement. Acceptable — payment is explicitly deferred.

---

### API READINESS

#### Q29: Do services follow a consistent swappable pattern?
**INCONSISTENT.** FEATURE_GAPS.md documents a `USE_MOCK` toggle pattern. But services vary:
- Some have mock data inline in the service file
- Some reference a shared `mock-data.ts` (105KB)
- Some use AsyncStorage, some don't persist
- No shared `apiClient` wrapper for HTTP calls
- No shared error handling or retry logic

**Recommendation:** Before API integration, create a standardised `api-client.ts` with interceptors, error handling, and mock toggle.

#### Q30: Are types complete enough for API contracts?
**YES — this is the strongest asset.** `constants/types.ts` (114KB) and `constants/app-types.ts` are exhaustive. Every entity has full CRUD-ready type definitions with proper enums. These could directly generate an OpenAPI/Swagger spec or Prisma schema.

#### Q31: Is error handling consistent?
**NO.** Most services return data or throw generic errors. No:
- Standardised error types (ApiError, ValidationError, NotFoundError)
- Retry logic for network failures
- Offline detection or queuing
- Optimistic updates with rollback

#### Q32: Do screens handle loading/error/empty states?
**MINIMAL.** Some screens have loading spinners. Most don't handle API errors gracefully. Empty states exist for some lists but coverage is inconsistent (maybe 40% of screens).

#### Q33: Is auth ready for a real backend?
**NO — FULL REWRITE NEEDED.** Currently:
- Hardcoded demo users with plaintext password matching
- No JWT/refresh token flow
- No session management or token expiry
- No "forgot password" implementation (type exists, function is mock)
- No secure storage for tokens (would need expo-secure-store)

#### Q34: Is real-time infrastructure accounted for?
**NO.** Messaging, notifications, availability updates, booking status changes all need WebSocket/SSE. Currently static mock data. SOURCE_OF_TRUTH.md mentions Socket.io for backend phase, but no client-side infrastructure (connection manager, event handlers, reconnection logic) exists.

#### Q35: Is the data model DB-ready?
**MOSTLY.** Types use ID references between entities which maps to foreign keys. Some intentional denormalization (coachName on bookings) is acceptable. The 114KB types file could inform a PostgreSQL schema. `docs/technical/DB_MODEL_NOTES.md` exists for this purpose.

---

## Part 2: Scorecard

| Category | Score | Detail |
|----------|-------|--------|
| User Stories Coverage | **85%** | 430+ stories tracked, ~90% marked ✅ or 🔨. 6 critical gaps remain |
| Data Input UI Coverage | **75%** | Most fields have screens. Scheduling rules, cancellation policy, buffer time have no UI |
| Coach Experience | **80%** | Strong roster, analytics, badges, session tools. Critical gap: no attendance marking, no session completion flow |
| Club/School Experience | **60%** | Functional but visually flat. Academy barely differentiated. No branding editor, no club calendar, feed is text-heavy |
| Parent/Family Experience | **85%** | Multi-child hub, family calendar, spending, guardians. Minor gaps only |
| Role System | **70%** | Two-role + flags is elegant. Coach-parent dual role impossible. Admin is a stub |
| Flow Completeness | **55%** | Booking wizard works but session lifecycle incomplete. Invite → booking BROKEN |
| Types & Data Model | **95%** | Exceptional. 114KB of comprehensive, well-structured types. API-contract ready |
| Service Layer | **50%** | Inconsistent patterns. No shared API client. No error standardisation |
| Auth | **20%** | Demo-only. Full rewrite needed for production |
| Payment | **30%** | UI shells exist. Everything mock. Stripe deferred by design |
| Real-time | **10%** | No WebSocket infrastructure. Mock data only |
| **Overall API Readiness** | **~45%** | Types are production-grade. Everything else needs hardening |

---

## Part 3: What Must Be Done Before API Integration

### CRITICAL (blocks integration)

1. **Fix invite → booking creation bug** — Session invite acceptance logs to console but never creates a booking. This breaks the core coach-initiated flow. (`session-invite-service.ts:408-409`)

2. **Build session completion flow** — After a session: mark attendance → write notes/recap → award badges → trigger parent review prompt. Without this, the session lifecycle has no ending.

3. **Add scheduling rules UI** — Buffer time, minimum notice, max advance booking, same-day toggle, reschedule deadline. All typed, none have screens. A backend will enforce these rules — the frontend needs to let coaches set them.

4. **Add cancellation policy UI** — Create/edit policy, display to parents before booking. This is a legal/trust requirement for a real marketplace.

5. **Standardise service layer** — Create `api-client.ts` with:
   - Base URL config
   - Auth token injection (header interceptor)
   - Error handling with typed errors
   - `USE_MOCK` toggle per service
   - Retry logic for network failures
   - Request/response logging

6. **Rewrite auth for real backend** — JWT access + refresh tokens, secure storage, token expiry/renewal, logout cleanup, "forgot password" flow.

### HIGH (should do before integration)

7. **Loading/error/empty states** — Every screen that fetches data needs: loading skeleton, error with retry, empty state with CTA. Audit all ~50 pages.

8. **Club branding editor** — Let academy/club owners set logo, colors, cover photo. The types support it; the UI doesn't.

9. **Club calendar view** — Aggregate all squad sessions, matches, and events into one calendar. This transforms the club from "a list of things" to "a living schedule."

10. **Match result cards in feed** — Auto-generate feed posts from match results. Makes the club feed dynamic without coaches having to manually post.

11. **Coach-parent dual role** — Either allow `roles[]` array or add `personalChildren` to coach type. Prevents the "I need two accounts" problem.

12. **Admin panel expansion** — User moderation, content moderation, verification approval queue, platform analytics. Even if basic.

### MEDIUM (nice before, can come after)

13. **Squad analytics** — Group-level progress, attendance rates, improvement trends per squad.
14. **Club photo gallery** — Media from sessions and matches, organised by date/event.
15. **Onboarding checklist** — Guide parents to fill in emergency contacts, consents, medical info. Guide coaches to set availability, cancellation policy, verify credentials.
16. **Unified notification stream** — For parents with multiple children, show all notifications in one chronological feed.
17. **Academy differentiation** — Custom landing page, branded booking experience, programme tiers.
18. **Coach travel radius UI** — Let coaches set how far they'll travel. Display in search/discovery.

---

## Part 4: Verdict

**Are we API integration ready?**

**Not yet.** The types and data model are production-grade — that's 95% done and the hardest part to get right. But the service layer is inconsistent, auth is demo-only, session lifecycle is incomplete (no completion flow), and the core invite → booking path is broken.

**Estimated work to reach API-ready:**
- Fix the 6 critical items (above)
- Standardise 45+ services to a swappable pattern
- Add loading/error states across ~50 screens
- Rewrite auth hook

The types are so good that once a backend exists, swapping mock → real will be mechanical if the service layer is standardised first. The recommendation is: **fix critical bugs, standardise services, then start the backend**.

---

*Generated 2026-02-02 by full codebase audit*
