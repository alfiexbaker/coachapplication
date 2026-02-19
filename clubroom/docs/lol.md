# Clubroom — Product Deep-Dive & Roadmap

**Date**: 19 February 2026
**Method**: 4 persona agents (Coach, Parent, Adult Athlete, FA Officer) independently reviewed the codebase, read actual files, and produced detailed assessments.

---

## The Personas

| Persona | Who | Core Need |
|---------|-----|-----------|
| **Coach Dave** | FA Level 2, 40 kids across 3 age groups, 1:1s, Oaklands FC | Run my coaching business without juggling 5 apps |
| **Sarah Henderson** | Mum of Tommy (10, U11) and Emma (13, U13) | Know what's happening with BOTH my kids without guessing |
| **Marcus Cole** | 28, Sunday league, trains himself | Track my own progress like Strava does for running |
| **Helen Wright** | County FA Development Officer, 200+ clubs | Can I recommend this without a safeguarding incident? |

---

## EXECUTIVE SUMMARY: WHAT'S BRILLIANT vs WHAT'S BROKEN

### Brilliant (keep, polish, ship faster)

1. **Earnings reconciliation** (Owed / Paid / Written Off) — matches how grassroots coaches actually think about cash payments. The "Send Reminder" pre-fill is clever.
2. **Session completion wizard** (Attendance -> Notes -> Badges -> Review) — well-designed 4-step flow. Kids will love badges.
3. **Emergency info system** — offline-cached per-athlete emergency contacts with medical alerts. Someone thought about coaches on muddy pitches with no signal.
4. **Consent management** — granular per-child consent (photo/video/social/medical) with "granted by" tracking. `hasContentPostingConsent()` gates sharing. GDPR-aware.
5. **Special needs tracking** — disability categories (PHYSICAL/LEARNING/SENSORY/BEHAVIORAL/MEDICAL), communication preferences, coach observation notes. Genuinely inclusive.
6. **Availability templates** — weekly patterns with overrides and blocked dates. Matches real coaching schedules.
7. **Progress radar charts** — if coaches actually fill them in, this is the killer differentiator vs Spond.
8. **Family calendar** — colour-coded per child, conflict detection banner, child filtering. Best-implemented multi-child feature.
9. **Architecture** — Result<T, ServiceError>, 83 typed events, 171 tests, zero `any`. This is built to last.

### Broken (blocks all 4 personas)

1. **No parent onboarding** — PARENT option missing from account type selection. Parents can't sign up. Sprint 3 task 3.4.
2. **No recurring sessions UI** — service layer is complete, zero UI screens. Coach's entire business is recurring. Sprint 3 task 3.1.
3. **8 of 16 notification methods are dead code** — parents get no push notifications. Sprint 3 task 3.3.
4. **Bookings auto-confirm** — no coach accept/decline. Safeguarding risk. Sprint 4 task 4.4.
5. **Double-booking possible** — no slot locking. Sprint 4 task 4.3.
6. **Booking flow child picker broken** — free-text "Add child" field instead of proper selector. Multi-child sprint Phase 7.
7. **No squad-level messaging** — can't message all U11 parents. WhatsApp remains required.
8. **DBS is a soft badge, not a hard gate** — parents can book unverified coaches. FA blocker.

---

## CHILD PICKER: THE CROSS-CUTTING CONCERN

Every feature needs child-awareness for parents with 2+ kids. Sarah's review was exhaustive. Here's the complete matrix:

### Features Where Child Picker Is CORRECTLY Implemented (3)
| Feature | Mechanism |
|---------|-----------|
| Calendar | `selectedChildId` + colour legend + `ScheduleConflictBanner` |
| Progress | `ChildSwitcher` component with haptic feedback, hides for single-child |
| Badges detail | Per-child route `children/badges/[childId]` |

### Features Where Child Picker EXISTS But Needs Work (3)
| Feature | Current State | Fix Needed |
|---------|--------------|------------|
| Invite list | `resolveInviteChildLabel` from context | Colour dot + child name on every card |
| Invite detail | `InviteChildHeader` component exists | Per-child RSVP toggles (Tommy: Going / Emma: Not Going) |
| RSVP | Partially implemented | Full per-child independent toggles |

### Features Where Child Picker Is MISSING ENTIRELY (6)
| Feature | Impact | Fix |
|---------|--------|-----|
| **Booking flow** | TextInput for child name (!!) | Multi-select child pills with avatar, link to medical/emergency |
| **Spending** | Family aggregate only | Child filter matching calendar, per-child per-coach breakdown |
| **Messaging** | No child context | Tag threads with relevant child name |
| **Notifications** | "Session tomorrow at 5pm" not "Tommy's session..." | Child name in every parent notification |
| **Reviews** | No child association | Tag review with child + age group for filtering |
| **Session feedback** | No per-child separation | Separate coach feedback per child per session |

### Features Where Child Picker Is Correctly NOT Needed (3)
Dashboard (aggregate), Family sharing (guardian-level), Dashboard badges (interleaved feed)

### The Spond Standard (what we must match)
- Every notification names the child
- Every RSVP is per-child
- Schedule merges all kids
- Calendar syncs to phone
- Group chat per team

### Single-Child Rule
**If parent has 1 child: HIDE everything.** No pickers, no child names, no legends. Lisa with James sees a clean, simple app. The `useChildContext().isMultiChild` flag gates all multi-child UI.

---

## PERSONA DEEP-DIVES

### COACH DAVE — Top 10 Needs (Ranked)

| # | Need | Status | Sprint |
|---|------|--------|--------|
| 1 | **Parent onboarding** — without parents, no clients | MISSING | S3 task 3.4 |
| 2 | **Recurring sessions UI** — entire business is recurring | SERVICE DONE, NO UI | S3 task 3.1 |
| 3 | **Squad-level messaging / broadcast** — "training cancelled tonight" | MISSING | New |
| 4 | **Per-athlete feedback in group sessions** — individual notes per kid after group training | MISSING | New |
| 5 | **Holiday camp / multi-day sessions** — half-term camps are biggest revenue week | MISSING | New |
| 6 | **Notification wiring** — 8/16 methods are dead code | PLANNED | S3 task 3.3 |
| 7 | **Coach booking confirmation** — must accept/decline, not auto-confirm | PLANNED | S4 task 4.4 |
| 8 | **Emergency contacts quick-access during sessions** — 2 taps when kid is hurt | DATA EXISTS, NO QUICK UI | New |
| 9 | **Family-level billing** — "Henderson family: 8 sessions = total" + bulk mark paid | MISSING | New |
| 10 | **Bulk athlete import** — 40 kids, no CSV upload, no invite links | MISSING | New |

**Coach Dave's verdict**: "The earnings reconciliation and session completion wizard show real product thinking. But I can't leave Spond + WhatsApp + Google Sheets until recurring sessions have UI, parents can sign up, and I can message a squad."

**Key insight**: The session completion wizard gives ONE notes field for the whole group. Tommy was brilliant, Emma struggled — but there's no per-athlete feedback. **Individual feedback is the reason parents pay for coaching.** Without it, Clubroom is just a booking tool.

### PARENT SARAH — Top 10 Needs (Ranked)

| # | Need | Status | Sprint |
|---|------|--------|--------|
| 1 | **Push notifications with child names** — "Tommy's session tomorrow at 5pm at Oaklands" | MISSING | S3 task 3.3 |
| 2 | **Proper child picker in booking flow** — replace TextInput with child pills | MISSING | Multi-child P7 |
| 3 | **Per-child RSVP on invites** — Tommy goes, Emma doesn't. Two independent toggles | PARTIAL | Multi-child P3 |
| 4 | **Calendar sync (Apple/Google)** — if not there, fridge calendar wins | MISSING | New |
| 5 | **Per-child spending breakdown** — Tommy: £240, Emma: £180 | MISSING | New |
| 6 | **Meaningful progress tracking** — prompt coaches, benchmark vs age group | FRAMEWORK EXISTS | Coaching workflow |
| 7 | **Coach discovery with filters** — specialty, age group, distance, DBS, price, trials | BASIC EXISTS | Enhancement |
| 8 | **Quick onboarding** — name + DOB to start, complete profile later | OVER-COMPLEX | Simplify |
| 9 | **Conflict detection at RSVP time** — warn BEFORE committing, not after | MISSING | Multi-child P5+ |
| 10 | **Child-aware messaging** — tag conversations with relevant child | MISSING | New |

**Sarah's scores**: Calendar 7/10, Progress 8/10 (if coaches use it), Multi-child handling 4/10, Notifications 2/10, Overall 5/10.

**Sarah's verdict**: "I would not pay £20/month today. Not yet. Check back in three months. The progress tracking is the killer feature — if coaches fill it in."

### ADULT ATHLETE MARCUS — Top 10 Needs (Ranked)

| # | Need | Status | Sprint |
|---|------|--------|--------|
| 1 | **Recurring session booking** — set it once, train every Tuesday | SERVICE DONE, NO UI | S3 task 3.1 |
| 2 | **Video analysis with coach annotations** — timestamped feedback on technique | PLACEHOLDER ONLY | S3 task 3.2 |
| 3 | **Calendar sync** — sessions in Google/Apple Calendar automatically | MISSING | New |
| 4 | **Coach-verified progress tracking** — radar chart means nothing if self-reported | FRAMEWORK EXISTS | Coaching workflow |
| 5 | **In-app payment with history** — replace bank transfers, download receipts | CASH ONLY (Stripe deferred) | Backend phase |
| 6 | **Group session drop-in booking** — browse open sessions, 2-tap book and pay | PARTIAL | Enhancement |
| 7 | **Coach discovery with adult filter** — "coaches who work with adults" | MISSING | New |
| 8 | **Team/group management** — replace WhatsApp for 5-a-side | COMMUNITY EXISTS | Enhancement |
| 9 | **Health/training load integration** — Apple Health, Strava | MISSING | Future |
| 10 | **Mature gamification** — Strava-style PBs/streaks, not "Great Effort" stickers | NEEDS REFRAMING | Design |

**Marcus's verdict**: "Today: No, I would not pay £20/month. With recurring sessions + video analysis + calendar sync: Maybe. With the full top 10: Yes, without hesitation."

**Key insight**: The app feels parent-first, athlete-second. Badges are childish for a 28-year-old. Reframe as Strava-style personal bests and season summaries. The journal feature is genuinely useful for adult athletes — don't lose it.

### FA OFFICER HELEN — Top 10 Requirements (Ranked)

| Rank | Requirement | Status | Priority |
|------|------------|--------|----------|
| 1 | **Enhanced DBS as mandatory gate** for child-facing coaching | Soft badge only | BLOCKER |
| 2 | **Club Welfare Officer role** with safeguarding concern routing | ABSENT | BLOCKER |
| 3 | **FA qualification structured fields** (Level 1/2/3, Safeguarding, First Aid) | Free-text only | BLOCKER |
| 4 | **1:1 session check-in/check-out** for lone working | ABSENT | HIGH |
| 5 | **Consent audit trail + GDPR data subject rights** | PARTIAL | HIGH |
| 6 | **Messaging safeguards for under-18 communications** | Minimal | HIGH |
| 7 | **Club governance roles** (Chair, Secretary, Treasurer, CWO) | ABSENT | MEDIUM |
| 8 | **Exportable participation + safeguarding compliance reports** | ABSENT | MEDIUM |
| 9 | **FA Whole Game System integration pathway** | ABSENT | MEDIUM |
| 10 | **Demographic reporting for funding applications** | ABSENT | MEDIUM |

**Helen's FA Recommendation Checklist** (REQUIRED items): **6 of 20 PASS (30%)**

What passes: Emergency contacts (offline-cached!), photo/video consent, emergency treatment consent, medical info, concern reporting with escalation, special needs tracking.

What fails: DBS gate, qualification structure, CWO role, concern routing, 1:1 safety, GDPR withdrawal, data retention, CWO visibility, insurance expiry, messaging safeguards, communications transparency, session safety protocol, privacy policy for children's data, DBS expiry tracking.

**Helen's verdict**: "Not ready. Re-evaluate in 3 months when DBS gating and CWO role are implemented. The quality of what they've already built suggests they would implement safeguarding well if given clear specifications. Overall: 4/10 for FA readiness, potential 7-8/10 in 6-12 months."

---

## SYNTHESISED PRIORITY ROADMAP

### Tier 0: SHIP BLOCKERS (do these or don't launch)
*Every persona is blocked by at least one of these*

| # | Feature | Personas Blocked | Effort | Sprint |
|---|---------|-----------------|--------|--------|
| 0.1 | **Parent onboarding** — add PARENT to account type picker | Coach, Parent | S | S3 |
| 0.2 | **Recurring sessions UI** — wire existing service to create/manage screens | Coach, Athlete | M | S3 |
| 0.3 | **Wire 8 orphaned notification methods** | All 4 | S | S3 |
| 0.4 | **Fix booking child picker** — replace TextInput with proper child selector | Parent | M | Multi-child P7 |
| 0.5 | **DBS as hard gate** — block unverified coaches from under-18 bookings | FA | M | New |

### Tier 1: CORE EXPERIENCE (makes the app worth using)

| # | Feature | Personas | Effort | Sprint |
|---|---------|----------|--------|--------|
| 1.1 | **Squad-level messaging** — message all parents in a squad | Coach, Parent | M | New |
| 1.2 | **Coach booking confirmation** — accept/decline, not auto-confirm | Coach, FA | M | S4 |
| 1.3 | **Per-athlete feedback in group sessions** — individual notes per kid | Coach, Parent | M | New |
| 1.4 | **Push notifications with child names** — "[Child]'s session tomorrow" | Parent | S | Multi-child P3 |
| 1.5 | **Calendar sync** (Apple/Google) | Parent, Athlete | M | New |
| 1.6 | **Double-booking prevention** — slot locking | All | M | S4 |
| 1.7 | **Club Welfare Officer role** — safeguarding concern routing | FA | S | New |
| 1.8 | **Per-child RSVP** — independent toggles per child on invites | Parent | M | Multi-child P3 |

### Tier 2: DIFFERENTIATION (makes people pay £20/month)

| # | Feature | Personas | Effort | Sprint |
|---|---------|----------|--------|--------|
| 2.1 | **Video analysis with annotations** — timestamped coach feedback on technique | Coach, Athlete | L | New |
| 2.2 | **Per-child spending breakdown** | Parent | S | New |
| 2.3 | **Family-level billing** — aggregate + bulk mark paid | Coach, Parent | M | New |
| 2.4 | **Holiday camp / multi-day sessions** | Coach | M | New |
| 2.5 | **Coach discovery filters** — specialty, age group, DBS, adult-friendly | Parent, Athlete | M | Enhancement |
| 2.6 | **FA qualification structured fields** (not free-text) | FA, Parent | S | New |
| 2.7 | **1:1 session safety protocol** — check-in/check-out with parent notification | FA, Coach | M | New |
| 2.8 | **Mature gamification mode** — Strava-style for adults, badge-style for kids | Athlete | M | Design |
| 2.9 | **Bulk athlete import** — CSV or invite links | Coach | S | New |
| 2.10 | **Quick onboarding** — name + DOB to start, nag later for full profile | Parent | S | Enhancement |

### Tier 3: GROWTH (makes FA recommend to 200 clubs)

| # | Feature | Effort |
|---|---------|--------|
| 3.1 | Club governance roles (Chair, Secretary, Treasurer) | M |
| 3.2 | Exportable participation reports for funding applications | M |
| 3.3 | Demographic reporting (anonymised age, gender, disability) | M |
| 3.4 | GDPR full compliance (withdrawal, audit trail, data retention) | L |
| 3.5 | FA Whole Game System integration pathway | L |
| 3.6 | Age group transition automation (U11 -> U12 at season end) | M |
| 3.7 | Walking football / adult age-group categories | S |
| 3.8 | Multi-language support | L |
| 3.9 | County FA dashboard (participation across all clubs) | L |
| 3.10 | Competition/league management (fixtures, results, tables) | XL |

---

## THE SPOND GAP (what we must match to win)

| Spond Feature | Clubroom Status | Priority |
|---------------|----------------|----------|
| Push notifications per session | Dead code (8/16 unwired) | Tier 0 |
| One-tap RSVP from notification | Exists but unclear UX | Tier 1 |
| Group chat per team | MISSING | Tier 1 |
| Calendar sync (Apple/Google) | MISSING | Tier 1 |
| Per-child RSVP | Partial | Tier 1 |
| Attendance tracking | EXISTS (coach side) | Done |
| Free | £20/month | N/A — differentiate on value |

**What Clubroom has that Spond doesn't** (our moat):
- Session payments / earnings reconciliation
- Progress tracking (radar charts, skill ratings, badges)
- Coach discovery marketplace
- Per-child spending analytics
- Video analysis (when built)

---

## NUMBERS THAT MATTER

| Metric | Current | Target |
|--------|---------|--------|
| Coach screens | 95 (53%) | Maintain ratio |
| Parent screens | 10 (5%) | 25+ (14%) |
| Athlete screens | 40 (22%) | Maintain |
| Multi-child features working | 3/15 (20%) | 15/15 (100%) |
| Notification methods wired | 8/16 (50%) | 16/16 (100%) |
| FA safeguarding checklist pass | 6/20 (30%) | 20/20 (100%) |
| Session types supported | 4 (1:1, group, clinic, assessment) | 7 (+camp, trial, drop-in) |

---

## THE ONE-LINER PITCH PER PERSONA

- **Coach Dave**: "Complete a session -> per-kid feedback goes to parents as a push notification with their child's name, skill progress, and a badge. That's something NO current tool does."
- **Sarah Henderson**: "One app that shows me Tommy's 5pm training AND Emma's progress radar chart AND how much I've spent on each kid this month."
- **Marcus Cole**: "Strava for football coaching — book, track, improve, with video proof of how much better I'm getting."
- **Helen Wright**: "The only grassroots coaching platform that makes DBS mandatory, routes concerns to welfare officers, and gives me participation data for funding applications."

---

*This document synthesises 4 independent persona reviews, each grounded in actual codebase analysis (reading real services, hooks, screens, and types). No features were assumed — everything was verified against the code.*
