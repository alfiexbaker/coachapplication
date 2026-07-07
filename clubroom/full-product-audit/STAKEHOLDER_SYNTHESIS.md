# Stakeholder Synthesis

Date: 2026-07-07
Source: six read-only code-audit agents plus local consolidation.

## 1. Coach

What the coach needs:

- Get booked.
- Know the schedule.
- Deliver safely.
- Record proof quickly.
- Communicate with families.
- Get paid and rebooked.

Best parts:

- Roster, athletes, booking, session creation, completion, feedback, payments, messages, and health/consent all exist as real coach workflows.
- Session completion is a strong retention loop when it produces parent-visible proof.
- Recognition can help motivation when tied to real session behaviours.

Weak parts:

- Schedule truth can look hollow if session data is not joined reliably.
- Session creation carries too many modes for a solo coach.
- Individual booking attendance/no-show, API-mode completion messages, provider-backed payments, refunds, and payouts are not fully mature.

Coach verdict:

Clubroom is a real coach product if the daily loop is simple: create or accept work, deliver, record one useful note, share progress, get paid. It becomes heavy if club admin, social posting, and achievement mechanics lead the experience.

## 2. Coach's Boss / Club Leadership

What leadership needs:

- Know which coach owns delivery.
- See unassigned and overdue work.
- Enforce standards.
- Monitor coach quality.
- Resolve safeguarding/support/finance exceptions.
- Keep sensitive data scoped.

Best parts:

- Owner dashboard, staffing console, and head-coach oversight are already leadership-grade foundations.
- Staffing is backend-backed and audited.
- Head-coach scope can be limited to assigned squads.
- Club governance has executable role policy.

Weak parts:

- Standards can become checkboxes unless each standard has criteria, evidence links, reviewer, version, and action history.
- Club hub mixes social updates, operational tasks, and achievements.
- Some leadership UI still risks deriving state from compatibility or local/social surfaces before backend authority.

Leadership verdict:

Clubroom has the shape of a serious club operating system. The next bar is standards evidence: who delivered, who observed, what evidence exists, what standard it satisfies, and what leadership did next.

## 3. Parents / Guardians

What parents need:

- Is my child safe?
- Are they booked and prepared?
- What am I paying for?
- Are they improving?
- Who can see or act on their information?

Best parts:

- Family calendar, child profile, medical/consent handling, booking, recurring plans, group logistics, and progress proof match real parent jobs.
- Recurring and multi-week sessions solve a real parent pain.
- Progress/feedback can prove paid development value.

Weak parts:

- Discovery and public profile trust cannot rely on placeholder names, empty proof, or synthetic filter counts.
- Booking confirmation copy can mix "confirmed" with "coach confirms within 24 hours".
- Simulated payment and refund states are dangerous if parents read them as real.
- Safety/reporting is strongest around bookings but should be clearer in chat/community and child-specific contexts.

Parent verdict:

The strongest parent product is not the feed or badges. It is reliable booking, clear money state, medical/consent confidence, and concrete proof that the child is improving.

## 4. Child / Athlete

What the athlete needs:

- Feel safe.
- Understand what is next.
- See progress without shame.
- Have a voice.
- Learn between sessions.
- Keep private data private.

Best parts:

- My Progress, session history, feedback, goals, practice tasks, media, and achievements can form a real development story.
- Practice tasks and drills convert feedback into action.
- Session media can be strong learning evidence.

Weak parts:

- Direct athlete accounts and parent-represented children can blur.
- Progress can feel like a scoreboard if levels, streaks, ratings, rarity, and badges lead the experience.
- Some language is not teen-friendly, for example "Kid" in contexts where an older athlete may see it.
- Child-visible safeguarding/help entry points need to be clearer.
- Child media and achievement sharing need precise privacy controls.

Athlete verdict:

The child-facing product is strongest when it tells a growth story: goal, effort, feedback, practice, improvement, and safe recognition. It is weakest when it feels like a game layer or adult admin dashboard.

## 5. FA / Compliance

What compliance needs:

- Default-deny access.
- Assignment-scoped visibility.
- DBS/verification enforced server-side.
- Safeguarding case control.
- Medical/consent audit history.
- Media consent snapshots.
- Retention/deletion execution.
- Payment evidence and reconciliation.

Best parts:

- Backend-authoritative direction is strong.
- Role policy is explicit.
- Medical, consent, safeguarding, media, invoices, and audit models are meaningful.
- Media upload scanning and signed URLs are good trust foundations.

Weak parts:

- DBS/verification for child bookings appears enforced in frontend/service flow, but server-side booking creation needs its own gate.
- Safeguarding incident actions are too broadly writable if incident access alone can permit action creation.
- Verification reviewer approval and expiry lifecycle are not complete.
- Retention/deletion appears more like read visibility than executed lifecycle control.
- Payments and payouts remain simulated.

Compliance verdict:

Clubroom is directionally serious, but launch-grade trust requires server-side enforcement and exportable evidence. "Achievement" language should not imply official accreditation unless criteria, proof, assessor, and appeals exist.

## 6. Best Standards

Standard:

Every feature must help a coach get paid to develop a footballer safely and measurably.

Best parts:

- The architecture has real service facades, route helpers, API mode boundaries, Fastify `/v1` modules, and meaningful tests.
- The product thesis is coherent when seen as paid football development.
- UI action and alert policy are generally aligned with the repo rules.

Weak parts:

- Feature mass is the biggest product risk.
- Mock/demo seams can make runtime truth look more complete than it is.
- Feed/community can pull the product toward a generic social app.
- Multiple button/clickable primitives and broad route count increase UX consistency risk.

Best-standards verdict:

The product should be organized around five pillars: booking, delivery, progress proof, family safety, and club operations. Anything else should be hidden, pruned, or reframed until it earns its place.

## Shared Naming Decision

Do not make "badge" the product word.

Recommended naming map:

- Internal object for now: `BadgeAward`
- Coach action: `Recognise` / `Award recognition`
- Parent/athlete display: `Achievements`
- Club leadership review: `Standards evidence`
- Feed item: `Recognition update` or `Achievement update`
- Coach qualifications: `Credentials`

Reason:

"Badge" collides with club badges, UI badges, notification badges, and FA coaching badges. "Achievement" is better for family/athlete progress, but FA/compliance warns that it can overclaim. The product should reserve official-sounding achievement claims for evidence-backed milestones and use "recognition" when a coach is awarding a subjective positive moment.

## Shared Product Test

For every existing or future feature, ask:

1. Does it help a family discover, book, or continue safe paid football development?
2. Does it help a coach deliver, prove, coordinate, or get paid?
3. Does it protect a child or clarify who can see sensitive information?
4. Does it give a club leader evidence and action, not just a dashboard number?
5. Does the backend own the truth in non-mock mode?

If the answer is no, the feature is either a gimmick risk or should be hidden until it becomes useful.
