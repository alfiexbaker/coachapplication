# Data, privacy and analytics

## Legal position

Clubroom should describe itself as a data controller for its core platform purposes: accounts, family relationships, bookings, payments reconciliation, fraud/security, permissions, safeguarding infrastructure, verification, audit, legal compliance and Clubroom analytics.

It cannot contractually call itself “only a processor” to avoid responsibility. Status follows who decides the purposes and essential means for each operation.

Coaches and clubs are likely separate controllers for parts of coaching delivery and their own records. Clubroom may be a processor for narrowly defined organisation-tenant processing carried out solely on documented instructions. Some deliberately co-designed processes may create joint controllership. Produce an operation-by-operation data map and Article 26/28 terms as applicable.

## Launch privacy boundary

The profitable core does not require child surveillance. Launch with:

- adult-owned family accounts;
- private child profiles by default;
- no authenticated account for an under-18 at launch;
- managed child Player profiles operated through an authorised adult's Home;
- no public youth profiles or follower system;
- no child-targeted marketing, behavioural advertising or engagement optimisation;
- no unmonitored adult-to-child messaging;
- no use of health, SEND, injury or safeguarding data for marketing, pricing, eligibility or growth analytics;
- no child percentile/ranking input to eligibility, promotion or commercial decisions;
- first-party, server-derived commercial analytics with short-lived pseudonyms.

## Children and family authority

Clubroom is likely an online service within the scope of the ICO Children's Code because children are likely to access it or have their data processed through it. Design must put the child's best interests first, use high privacy defaults, minimise collection and sharing, keep geolocation off unless needed, show parental controls, keep profiling off by default, and provide age-appropriate information and rights tools.

Important rules:

- A parent's contract does not automatically make “contract” the Article 6 basis for the child's data.
- Under-13 parental consent rules apply where the online service is offered directly to the child and consent is the selected basis; they do not solve all family authority questions.
- A parent does not own a child's privacy rights.
- A sufficiently competent teenager may exercise rights and have confidentiality interests, particularly in safeguarding matters.
- Family membership alone must not grant medical, safeguarding, coach-private or finance access.

Privacy and safeguarding counsel must design multi-guardian, restricted-contact, court-order, competent-teen and unsafe-guardian cases before those features go live.

## Working lawful-basis register

This is a hypothesis for counsel approval, not a final determination.

| Processing                                   | Working Article 6 position                                                    | Additional condition/decision                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Adult account and requested platform service | Contract                                                                      | None                                                                  |
| Supplier onboarding                          | Contract                                                                      | Article 10/Schedule 1 condition if criminal-offence data is processed |
| Child identity and participation             | Documented legitimate interests/recognised legitimate interests as applicable | Separate Article 9 condition for health/disability information        |
| Necessary planned medical/SEND information   | Purpose-specific legitimate interests or consent                              | Usually explicit consent under Article 9(2)(a); counsel confirm       |
| Life-threatening emergency                   | Vital interests                                                               | Article 9(2)(c), only in the narrow emergency circumstances           |
| Safeguarding                                 | Recognised legitimate interest in safeguarding children                       | Article 9(2)(g) and DPA Schedule 1 condition where applicable         |
| Finance, invoices and tax                    | Contract/legal obligation                                                     | Keep sensitive narrative out                                          |
| Security/fraud                               | Legitimate interests or recognised crime interest                             | Article 10/Schedule 1 where offence data is involved                  |
| Service analytics                            | Legitimate interests with LIA                                                 | Separate PECR/storage-access analysis                                 |
| Adult marketing                              | Consent or valid soft opt-in as applicable                                    | PECR requirements and opt-out                                         |
| Child marketing/profiling                    | Do not do at launch                                                           | —                                                                     |

Medical, injury, SEND and disability data require both an Article 6 basis and an Article 9 condition. Vital interests is not a general basis for keeping medical data “just in case”. Criminal-offence/DBS processing requires an Article 10 and DPA 2018 Schedule 1 analysis plus an Appropriate Policy Document where required.

## Required pre-production governance

Before real child medical, safeguarding or verification data is used, complete and approve:

- a platform-wide Children and Sensitive Data DPIA, with annexes for family authority, medical access, safeguarding/messaging, DBS, payments, media, scoring/profiling, analytics SDKs and any offline access;
- record of processing activities;
- lawful-basis, legitimate-interest assessment and consent register;
- Appropriate Policy Document for applicable Schedule 1 processing;
- controller/processor/joint-controller matrix;
- processor, subprocessor and international-transfer registers;
- Article 28 processor terms and Article 26 arrangement where needed;
- Children's Code conformance assessment;
- adult, younger-child and teen privacy notices;
- ICO fee assessment/registration;
- documented DPO threshold decision, named Privacy Lead and external privacy adviser.

## Medical and safeguarding minimisation

The app should project only current, actionable safety information to the assigned, eligible coach for the relevant period. It should not expose full health history, doctor/insurance fields or private safeguarding information merely because an adult holds a family role.

Every export, local cache, push notification, log, analytics event and backup is a data flow. Revocation must invalidate server access and clear sensitive caches on logout, account/role switch, reassignment and permission change.

## Analytics position

North-star metric:

> Contribution-positive paid athlete-sessions completed per month, subject to safety, trust and usability guardrails.

Commercial measures should include GMV separately from Clubroom revenue, take rate, payment/payout cost, refunds/disputes, contribution per booking, adult-purchaser CAC, contribution LTV, rebooking, Supplier activation/retention, support contacts, group fill and manual interventions.

Trust guardrails should include:

- confirmed unauthorised sensitive reads: zero;
- cross-account stale-cache incidents: zero;
- payment reconciliation failures;
- revocation-to-access-removal latency;
- safeguarding acknowledgement time;
- rights and complaint response time;
- crash-free sessions and API error rate.

Do not optimise child dwell time, streaks, emotional predictions, child advertising, health-derived propensity or percentile ranking.

## Safe event design

Prefer server-authoritative events derived from booking, invoice, refund and payment states. Client events should cover only UX steps the server cannot observe.

Allowlisted examples:

```text
event_id, event_name, schema_version, occurred_at_utc
environment, source, platform, app_version
short_lived_session_key, rotating_pseudonymous_adult_key
pseudonymous_organisation_key, actor_role_bucket
flow_name, step_name, outcome, allowlisted_error_code
booking_type, payment_method_category, currency
amount_minor (server commercial events only)
purpose_id, retention_class
```

Prohibited:

```text
names, contact details, date of birth, addresses
raw user, child, family, coach or club IDs
health, injury, SEND, consent or safeguarding values
messages, notes, media, filenames or free text
precise location, DBS detail, card data
raw API payloads, exception text, identifier-bearing URLs
```

Use a runtime allowlist, schema registry, rotating pseudonyms, cohort-size controls, automated PII tests, logged exports and short retention. Audit/security evidence must remain separate from product analytics.

### Current implementation risks to audit

The independent repository review found:

- `BookingStepAnalyticsEvent` persists raw user, coach and club identifiers;
- open `metadataJson`, security-message and similar free-text fields can leak sensitive content without allowlists;
- athlete improvement, consistency and percentile analytics constitute child profiling;
- a `RetentionPolicy` model exists, but automatic runtime enforcement was not established;
- medical fields include doctor and insurance detail broader than a delivery coach normally needs.

These are development-review targets, not findings that every runtime path currently exposes the data.

## Working retention targets

Counsel must approve a complete schedule. Initial design targets:

| Data                        | Treatment                                                                  |
| --------------------------- | -------------------------------------------------------------------------- |
| Verification/reset tokens   | Short technical expiry; unusable and deleted after use                     |
| Abandoned invitations       | Delete shortly after expiry except necessary abuse evidence                |
| Raw funnel telemetry        | Aggregate promptly; remove raw identifiers within seven days               |
| Closed account/profile      | Delete or anonymise within 30 days except isolated legal records           |
| Accounting/payment evidence | Necessary subset retained for six years from the relevant financial period |
| Raw DBS certificate         | Prefer never storing; if necessary, normally destroy within six months     |
| DBS outcome                 | Minimal type/date/reference/decision/renewal record where justified        |
| Medical record              | Only while needed; prompt for accuracy and remove stale versions           |
| Ordinary messages/media     | Short, visible purpose-specific period                                     |
| Safeguarding                | Separate restricted schedule and legal-hold rules; never ordinary deletion |
| Backups                     | Fixed cycle, beyond use pending expiry                                     |
| Audit/security              | Defined risk-based period, extended only for incident/legal hold           |

### Runtime position — 7 September 2026

Clubroom now has an in-app request, a system-admin-only due-request executor, immediate access closure, token/session/role revocation, direct adult-account/profile scrubbing, ownership/legal-hold blockers, transactional outcome audit, and a retryable completion-email notice whose stored destination is cleared after a successful send.

That is a bounded `CLOSED_WITH_RETENTION` process, not full erasure. The remaining policy and engineering gates are Player-subject disposition, item-level shared post/message/media decisions, Sign in with Apple or other provider-token revocation if introduced, object deletion, backup expiry, a counsel-approved table-by-table retention schedule, and a real configured-provider delivery proof. Failed completion delivery deliberately retains the isolated destination until supervised retry; its maximum retention and escalation owner must be fixed before live use.

## Rights, complaints and breaches

Provide an in-app Privacy Centre for access/export, correction, deletion, restriction, portability where applicable, objection, marketing/analytics choices, consent/sharing controls and complaints. Account deletion must separate erasable profile data from lawfully retained accounting, dispute and safeguarding records.

Maintain a breach plan that records every event, contains and assesses immediately, decides ICO notification within the 72-hour window where risk is likely, and notifies people where high risk. Child medical, precise location and safeguarding exposure should be treated as potentially serious from the start. Run a tabletop before production.

As of 19 June 2026, the current ICO complaint regime requires controllers to facilitate complaints, acknowledge within 30 days, investigate, keep the complainant informed and respond without undue delay.

## Sources

See [sources.md](sources.md), particularly ICO controller/processor, Children's Code, lawful bases, DPIA, special-category data, PECR, retention, complaints and breach guidance.
