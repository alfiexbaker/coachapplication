# Ponytail Codebase Scorecard

Date: 2026-07-07
Mode: Ponytail full

## Score

Overall: `64/100`

Scale used here: `100` means Google-level production discipline. `0` means unusable toy code.

Blunt verdict: Clubroom is a real product buried under too many almost-real surfaces. The core is good. The filler is the problem.

## Why It Is Not Lower

- Real Expo app plus real Fastify API.
- Clear route, service, and storage ownership rules.
- Backend modules exist for booking, health, family/athlete, social, trust ops, coach club, auth, and payments.
- Sensitive flows are at least moving toward backend authority.
- There are many tests and audit scripts.
- Social features are not automatically bad here. Messages, groups, club posts, achievements, event updates, and parent coordination all have a real football reason.

## Why It Is Not Higher

- The app is too wide for its runtime maturity: roughly `152` app route files, `155` service files, and `786` component files in the scanned app areas.
- Mock/demo/simulated concepts still appear across about `119` scanned files.
- Some surfaces look production-shaped while still being hollow, synthetic, or dev-only.
- Payments are still simulated-provider first.
- Verification has dev-only approval paths.
- Some progress/achievement language risks becoming game decoration instead of development evidence.
- Some dashboards and feeds risk showing information because the UI has a slot, not because the user needs it.

## Ponytail Product Rule

Every feature must answer one question:

> Does this help a football customer book, deliver, prove progress, stay safe, run the club, or get paid?

If no, remove it, hide it, or turn it into real evidence.

Social features pass only when they do one of these:

- coordinate families, coaches, teams, or clubs
- share session evidence, achievement evidence, logistics, or safety updates
- reduce repeated admin
- create a useful club operating record

Social fails when it becomes:

- generic engagement
- vanity numbers
- filler cards
- synthetic activity
- fake popularity
- posts without operational purpose

## Score By Discipline

| Area                    | Score | Read                                                                                                     |
| ----------------------- | ----: | -------------------------------------------------------------------------------------------------------- |
| Core product reason     |    67 | Strong loop exists: discover, book, deliver, record, pay, rebook. Too many side routes dilute it.        |
| Runtime truth           |    56 | Good API direction, but mock/demo/simulated paths still leak into major flows.                           |
| Trust and child safety  |    68 | Serious intent and backend coverage. Needs stricter server-side gates and evidence trails before launch. |
| Code organization       |    72 | Service facades, route helpers, API modules, tests. Big, but not random.                                 |
| UI usefulness           |    58 | Many useful screens. Also too many cards, stats, and placeholders that can feel made-up.                 |
| Social/community        |    70 | Worth keeping if it stays coordination-first. Dangerous if it becomes a social network clone.            |
| Money                   |    52 | Invoices and earnings are real-shaped. Provider/runtime truth is not mature enough.                      |
| Verification/compliance |    61 | Good direction. Dev-only approval and incomplete reviewer evidence drag it down.                         |
| Simplicity              |    44 | The product tries to be complete before the core is sharp.                                               |
| Test/audit posture      |    74 | Large test surface and useful scripts. Some tests preserve mock compatibility instead of launch truth.   |

## Feature Verdicts

| Feature family           | Score | Keep       | Fix or cut                                                                                                        |
| ------------------------ | ----: | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| Booking                  |    72 | Yes        | Tighten confirmation, refund, capacity, payment, and verification truth.                                          |
| Session delivery         |    70 | Yes        | Make attendance, no-show, notes, media, and parent updates one clean workflow.                                    |
| Coach schedule           |    49 | Yes        | `services/availability-service.ts` has `getCoachBookings()` returning `[]`; fix before treating schedule as real. |
| Progress                 |    69 | Yes        | Keep evidence and practice. Cut scoreboard-first language.                                                        |
| Achievements/recognition |    62 | Yes        | Rename user-facing "badges". Tie every award to criteria, context, and coach evidence.                            |
| Family hub               |    73 | Yes        | Keep. Make every child-specific permission and medical/consent visibility obvious.                                |
| Health/medical/SEN       |    75 | Yes        | Keep. No mock-first or casual sharing here.                                                                       |
| Clubs/squads             |    72 | Yes        | Keep. Avoid duplicate club/social/admin surfaces.                                                                 |
| Leadership dashboards    |    65 | Yes        | Keep only live data. Good pattern already exists in `services/org-owner-dashboard-service.ts`.                    |
| Standards                |    57 | Yes, later | Must be evidence/review/action history, not badges-for-staff.                                                     |
| Social feed              |    68 | Yes        | Keep as club operating feed. Cut fake member/popularity/activity filler.                                          |
| Groups/messages          |    74 | Yes        | Keep. This is real coordination, not fluff.                                                                       |
| Events/matches           |    63 | Yes        | Keep if tied to attendance, availability, logistics, results, and follow-up.                                      |
| Video/media              |    61 | Yes        | Keep only when attached to coaching evidence, consent, or learning.                                               |
| Notifications            |    59 | Yes        | Keep useful triggers. Cut demo notifications and noisy badges.                                                    |
| Discovery/search/map     |    60 | Yes        | Keep. No synthetic counts, fake popularity, or placeholder profiles.                                              |
| Favourites/follows       |    54 | Maybe      | Useful for rebooking. Useless as social vanity.                                                                   |
| Reviews/testimonials     |    55 | Maybe      | Useful for trust. Dangerous if not verified against real bookings.                                                |
| Invoices/earnings        |    58 | Yes        | Keep. Do not overstate until payment provider truth is live.                                                      |
| Verification             |    60 | Yes        | Keep. Remove dev-only approval from anything close to production builds.                                          |
| Settings/legal/help      |    66 | Yes        | Keep, but keep boring. No feature tour bloat.                                                                     |
| Analytics                |    50 | Maybe      | Useful when derived from real sessions/money/progress. Cut mock chart decoration.                                 |

## Worst Offenders

These are not all bugs. They are the highest-signal "this may feel like filler" spots.

- `services/availability-service.ts`: `getCoachBookings()` returns `[]`. A schedule that cannot show bookings is not a schedule.
- `apps/api/src/lib/ops-runtime.ts`: Stripe is explicitly not implemented and simulated payment remains the safe setting. Parent-facing money copy must be careful.
- `constants/financial-types.ts`: finance model still allows `placeholder` and `simulated`.
- `app/verification/id.tsx` and `app/verification/background.tsx`: dev-only approval exists. Fine for development, toxic if it leaks.
- `services/notification-service.ts`: seeds demo notifications. Useful for mock mode, bad if it teaches product decisions.
- `services/social-feed-service.ts`: contains a mock club member list. Social should be real relationships or nothing.
- `services/analytics/*`: mock analytics can make the app look smarter than it is.
- `hooks/use-edit-profile.ts`: profile/cover photo picker says "coming soon". Hide dead actions until real.
- `constants/badge-registry.ts`: mock achievement state is fine for demos, but product language should not imply earned proof.
- Broad route count: the app has many surfaces that need role gating, empty states, and runtime truth checks.

## Keep Social, Cut Slop

Keep:

- parent groups
- club announcements
- coach-parent messages
- achievement updates
- event and session logistics
- media shared with consent
- comments where they help coordination

Cut or hide:

- fake activity
- fake counts
- fake rankings
- "popular" claims without data
- generic inspirational feed cards
- notifications that only exist to make the app look alive
- any social card where the user cannot act or learn something true

## Badges Rename

Do not make "badges" the product.

- Coach action: `Recognise`
- Parent/athlete surface: `Achievements`
- Feed copy: `Recognition update`
- Evidence-backed milestone: `Achievement`
- Internal code for now: leave `BadgeAward` until a dedicated rename slice

Ponytail reason: public naming is cheap and high-value. Full internal rename is wide and risky. Do the visible rename first.

## The Cut List

Cut means remove, hide behind API truth, or collapse into an existing screen.

1. Anything mock-only shown in API/live mode.
2. Any stat that cannot name its source.
3. Any card that has no action, evidence, or decision.
4. Any "coming soon" control.
5. Any social count not backed by real relationships.
6. Any payment state that implies real settlement before provider truth exists.
7. Any achievement that is not tied to session, skill, coach note, evidence, or standard.
8. Any coach/club trust claim without expiry, reviewer, source, and audit trail.
9. Any child-facing progress mechanic that looks like a public scoreboard.
10. Any duplicate route whose only job is to show the same data with different decoration.

## Next Three Fixes

1. Fix coach schedule truth: make `getCoachBookings()` return real API/mock bookings or hide booking-dependent schedule UI.
2. Strip production-facing fake life: demo notifications, mock social members, synthetic analytics, fake counts.
3. Rename visible badge copy to achievements/recognition without touching the internal domain model yet.

That is the shortest useful path. Do not redesign the whole app. Remove fake certainty first.
