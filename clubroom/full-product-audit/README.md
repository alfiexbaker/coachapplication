# Clubroom Full Product Audit

Date: 2026-07-07
Scope: code-grounded product audit of the Clubroom app, API-facing service seams, and major feature surfaces.

## Executive Verdict

Clubroom is not just a badge app or a generic football social app. The real product is a football-only operating system for paid development:

1. discover a trusted coach, club, squad, session, or activity
2. check readiness, consent, safety, availability, and eligibility
3. book, register, invite, or RSVP
4. invoice, pay, reconcile, or refund through backend authority
5. deliver the session or activity
6. record attendance, feedback, media, recognition, and trust evidence
7. rebook, continue, report, escalate, or improve standards

The app has a serious architecture and a broad feature set. The risk is that some surfaces can feel like product mass unless they are tied tightly to that loop. Features are strongest when they reduce operational burden, prove development, protect children, or create revenue. Features are weakest when they look like generic engagement, social posting, or collectible UI without a coaching or safeguarding reason.

## Badge Naming Recommendation

Rename the user-facing concept away from "badges" in most places.

Recommended language:

- Coach action: `Award recognition`
- Athlete/parent result: `Achievement`
- Feed item: `Achievement post`
- Progress area: `Achievements`
- Internal domain object: keep `Badge` temporarily until a dedicated rename slice exists
- Coach qualifications: `Credentials` or `Coaching qualifications`, never "coach badges"

Reason: "badge" means too many things in this codebase and in UK football. It is used for child recognition, UI status pills, club badge images, message count badges, and FA coaching badges. "Achievement" better matches the family/athlete value. "Recognition" better matches the coach action.

Verdict on the feature: keep it, but reposition it. The system is more than a gimmick because awards are connected to FA Four Corners categories, session completion, notifications, parent visibility, feed sharing, progress points, and API-backed award routes. It becomes a gimmick if it is treated as collectible decoration instead of evidence of development.

## Audit Method

Local code and docs inspected:

- `docs/START_HERE.md`
- `docs/SOURCE_OF_TRUTH.md`
- `docs/KNOWLEDGE_SPINE.md`
- `docs/architecture/service-ownership-map.md`
- `docs/APP_REPORT.md`
- `navigation/routes.ts`
- representative routes under `app/`
- representative feature components under `components/`
- service facades under `services/`
- API route coverage under `apps/api/src/modules/`
- badge/achievement registry, service, hooks, and tests

Six requested stakeholder passes were spawned as read-only audit agents:

- Coach
- Coach's boss / club leadership
- Parents
- Child / athlete
- FA / compliance
- Best standards / product quality

Their findings are consolidated into:

- [FEATURE_AUDIT.md](./FEATURE_AUDIT.md): feature-by-feature audit.
- [STAKEHOLDER_SYNTHESIS.md](./STAKEHOLDER_SYNTHESIS.md): six-perspective interpretation.
- [PONYTAIL_SCORECARD.md](./PONYTAIL_SCORECARD.md): blunt codebase score and cut/keep/fix calls.
- [PONYTAIL_SPRINTS_TO_100.md](./PONYTAIL_SPRINTS_TO_100.md): specific sprint simulation to move the app from `64/100` to `100/100`.

## Highest-Level Findings

- Core product strength: booking, delivery, progress, family safety, club operations, and money are connected enough to form a real paid-development product.
- Biggest maturity risk: runtime split between mock compatibility and API authority still needs constant discipline, especially around sensitive flows.
- Biggest product risk: too many surfaces can compete for attention unless the app keeps ranking features by the paid-development loop.
- Biggest trust risk: family health, consent, media, safeguarding, finance, and coach-private notes must stay backend-authoritative and auditable.
- Biggest UX risk: broad route count creates opportunities for duplicate actions, dead controls, and role-confusing navigation.
- Biggest naming risk: badges should become achievements/recognition in product language.

## Critical Cross-Perspective Gaps

- Coach: schedule/session truth can look more complete than it is; session creation is powerful but heavy; individual no-show/attendance and completion-message thread mapping still need runtime authority.
- Coach's boss: owner dashboard and staffing are serious, but standards need evidence links, criteria, review history, and leadership action trails.
- Parent: discovery and confirmation must not show placeholders, synthetic counts, simulated payments, or mixed booking states as if they are real.
- Child/athlete: progress must avoid becoming a scoreboard; direct-athlete behavior must be separated from parent-represented child behavior; child-visible safety entry points need strengthening.
- FA/compliance: server-side DBS/verification gates, safeguarding action permissions, retention/deletion execution, consent snapshots, and real payment provider evidence are launch-grade blockers.
- Best standards: reduce feature mass around five pillars: booking, delivery, progress proof, family safety, and club operations.

## Decision Summary

Keep and finish:

- discovery and booking
- session delivery and completion
- progress proof
- family/health/consent
- coach roster and athlete development
- club squads, staffing, and owner/head-coach oversight
- invoices, earnings, and reconciliation
- verification, safeguarding, reporting, and privacy

Keep only if tied to the loop:

- achievements/recognition
- community feed
- favourites/follows
- video/media
- events and matches
- notifications

Tighten before launch:

- API-mode completion of legacy/mock surfaces
- server-side DBS/verification enforcement for child bookings
- role-specific action visibility
- reporting/audit evidence
- finance provider boundaries
- parent/athlete clarity around achievements and progress
- accessibility and dead-control audits
