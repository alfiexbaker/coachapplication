# Decision and action register

## CEO control view — 8 September 2026

**Verdict: not launch-ready.** The product model is now coherent and the core Stripe sandbox rail exists, but live money and a child-accessible external pilot remain closed.

| Gate | Current truth | Next proof |
| --- | --- | --- |
| Position and account model | Fixed: football business software for coaches/clubs; Home is the family workspace; User is the adult login; Player is the participant (`Athlete` internally) | Keep all UI, contracts and support copy on this language |
| Booking and payment core | Same-Supplier multi-Player/multi-session Orders, Stripe test Checkout, signed webhooks, direct full refunds and safe direct/session/series cancellation exist | Finish individual registration cancellation, customer refund UX, consolidated/partial refunds, disputes, payouts and reconciliation |
| Runtime confidence | API suite is green in seed/test mode; targeted DB-orchestration harnesses exist | Disposable real-Postgres concurrency proof plus signed-device Stripe test-account E2E |
| Legal and tax | Working stance and adviser brief exist | Incorporate/verify director and PSC, assign IP, then obtain solicitor, FCA-perimeter, accountant/VAT/platform-reporting and insurance sign-off |
| Children and safety | Adult-only accounts, Player relationships and backend permission controls exist | Approve DPIA/APD, lawful bases, retention, safeguarding operation, Ofcom assessments, NCA CSEA reporting workflow and moderation service levels |
| Apple | Stripe is allowed for in-person coaching; non-in-person creation/public exposure is now closed, but deletion/privacy/UGC controls remain incomplete | Close age rating/privacy labels, deletion, UGC evidence, review notes and demo accounts |
| Pilot | Design only | Start only after the gates above close; 5–10 known England-based Suppliers, capped exposure and manual reconciliation |

Ordered founder focus:

1. Finish the remaining sandbox money lifecycle; do not switch on live keys.
2. Close legal, tax, privacy, safeguarding, insurance and Apple decisions in parallel.
3. Prove the full coach→Home→Player→booking→payment→delivery→progress→refund loop on signed devices and real Postgres.
4. Run the capped pilot, measure support load and contribution per basket, then decide whether to scale.

## Decisions adopted for planning

These are the current working decisions. Items marked **external sign-off** are not final legal or tax conclusions.

| Area                    | Decision                                                                             | Status                                                |
| ----------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| Legal entity            | One England-and-Wales private company limited by shares                              | Adopt for formation; solicitor/accountant check       |
| Product identity        | Football-specific SaaS-enabled managed marketplace                                   | Adopt                                                 |
| Coaching Supplier       | Named independent coach/legal business or club, never ambiguous                      | Adopt; contract sign-off                              |
| Family party            | Parent/guardian is purchaser; child is participant/data subject                      | Adopt; edge-case counsel review                       |
| Clubroom role           | Principal for its platform/SaaS; disclosed Supplier-side agent for coaching bookings | Working position; **external sign-off**               |
| Payments                | Cards/wallets through regulated marketplace PSP; no Direct Debit or Clubroom wallet  | Adopt                                                 |
| Provider                | Stripe Connect with direct charges and `Stripe handles pricing`                       | Adopt for pilot; written configuration confirmation   |
| Basket                  | Multiple children/sessions allowed only for one legal Supplier per payment           | Adopt for launch                                      |
| Mixed sellers           | Defer; later grouped separate orders/payments                                        | Defer                                                 |
| Family app              | Free; no family digital premium tier at launch                                       | Adopt                                                 |
| Independent coach price | 6% VAT-inclusive where applicable; Stripe cost passed through                        | Capped-pilot decision; accountant/provider sign-off    |
| Club/academy price      | No pilot subscription; test £99/month + 2% only after value/retention evidence        | Defer                                                 |
| Remote coaching         | No paid one-to-many remote group coaching at launch                                  | Defer                                                 |
| Child access            | 18+ authenticated accounts; under-18s are managed Players in Home                    | Adopt for launch; Children's Code/DPIA still required |
| Social/UGC              | No public child social network or unmonitored adult-child DMs                        | Adopt                                                 |
| Data                    | Controller for core platform purposes; operation-specific allocation elsewhere       | Working position; **external sign-off**               |
| Geography               | England-only first pilot                                                             | Adopt                                                 |

## What “development complete enough for a closed payment pilot” means

Do not aim for every imagined Clubroom feature. Stripe sandbox integration has already started; completion now means proving the narrow launch loop rather than adding breadth:

- one legal Supplier per session and payment;
- family purchaser/child participant relationship;
- agent/principal checkout wording hypothesis;
- canonical booking, cancellation, refund and payout state machines;
- line-level ledger and idempotent webhook design;
- no Direct Debit, wallet or mixed-Supplier payment;
- minimum medical/safeguarding projection;
- privacy-safe event schema;
- account deletion/retention separation;
- no prohibited Apple digital purchase route.

Sandbox work should continue while professional decisions are obtained. Live money remains gated by those opinions and the controls below.

## Work sequence

### Gate 0 — founder decisions

- Confirm working company name and run Companies House/trade mark/domain checks.
- Confirm England-only pilot and first customer: known commercial coach/small academy.
- Confirm fee hypotheses: who pays processing and whether fees include VAT.
- Confirm one-Supplier cart and defer mixed-seller/remote group/social features.
- Decide whether any 13–17 self-login is truly required for the pilot.

**Exit:** this register is accepted as the product boundary.

### Gate 1 — professional design before live integration

- Obtain English commercial/consumer marketplace opinion on agency, supplier identity, terms, cancellation and liability.
- Obtain FCA/payment-services perimeter opinion.
- Obtain accountant opinion on agency/principal revenue, VAT, invoicing and platform reporting.
- Complete privacy/safeguarding advice on family authority, DPIA, lawful bases, Article 9/10, retention and controller allocation.
- Obtain insurance indications and confirm material exclusions.
- Confirm only identified sole traders, companies and clubs with a legal contracting entity enter the pilot.

**Exit:** no red issue requires changing the company, money or family model.

### Gate 2 — trust and operational specification

- Produce Supplier, family/platform and organisation SaaS contracts.
- Produce checkout/receipt/refund disclosures.
- Complete DPIA, APD, processing/transfer registers and privacy notices.
- Define Supplier verification, expiry, suspension and appeal.
- Define safeguarding, data breach, payment incident and complaint playbooks.
- Complete Ofcom scope/illegal-content/children's-access assessments and the NCA CSEA reporting workflow before enabling UGC.
- Lock analytics allowlist and prohibit raw child/family identifiers.
- Define account deletion and retention enforcement.

**Exit:** every sensitive feature has an owner, lawful purpose, access rule, retention rule and incident route.

### Gate 3 — engineering completion for closed pilot

- Prove the existing Stripe Connect sandbox path with test connected accounts on signed devices.
- Prove the existing line-item Order/Invoice/attempt/refund ledger and authoritative webhook state against real Postgres.
- Prove the existing multi-Player/multi-session same-Supplier checkout end to end.
- Finish individual registration cancellation plus customer-visible refund UX, consolidated/partial refunds, disputes, payout delay, Supplier statements and reconciliation.
- Prove Stripe account restriction and recovery on a test connected account. Checkout re-verifies fee payer, loss liability, requirements ownership, Dashboard type and readiness directly with Stripe before every sandbox session; signed `account.updated` webhooks now persist the current Stripe status and converge duplicates.
- Make permissions backend-authoritative and test reassignment/revocation.
- Implement minimal safety projection and cache clearing.
- Implement in-app account deletion request and retained-record explanation.
- Remove/defer public child UGC, direct adult-child messaging and commercial child profiling.
- Add Apple privacy manifest/labels inventory and App Review demo path.
- Run security, accessibility, family-role, booking and payment E2E tests.

**Exit:** sandbox acceptance matrix passes; no unresolved critical permission/safety/payment defect.

Current evidence (8 September 2026): account deletion reaches audited `CLOSED_WITH_RETENTION`, closes access, scrubs direct adult identity and attempts an idempotent completion email; successful delivery clears the isolated destination and failure remains retryable. Direct, full-session and booking-series cancellation now reconcile paid/refunded money and expire active Stripe Checkout sessions before final cancellation. This closes earlier implementation defects, but not the full launch gates. Player/UGC/object/backup/provider-revocation policy, production delivery, counsel-approved retention, individual registration cancellation, consolidated/partial refund UX, real-Postgres/Stripe connected-account proof, signed-device E2E, dependency trust and credential rotation remain open.

### Gate 4 — closed real-money pilot

Pilot with 5–10 known providers in one English area and at least 100 bookings. Cap exposure and manually reconcile every payment/refund/payout.

Initial acceptance hypotheses:

- more than 80% of Suppliers onboard with minimal assistance;
- fewer than 5 support contacts per 100 bookings initially, trending below 2;
- zero unreconciled payment or unauthorised sensitive-access events;
- tested safeguarding escalation works;
- chargebacks below 0.5%;
- Supplier 90-day retention above 80% once measurable;
- family 60-day rebooking above 60% once measurable;
- founder routine operations trend below one hour/day;
- contribution margin above 70% of Clubroom revenue where processing is passed through.

These are decision thresholds to test, not forecasts or promises.

**Exit:** accountant-approved reconciliation, acceptable trust metrics and positive contribution after variable support/loss.

### Gate 5 — focused public launch

- Expand to 20–30 providers in the same geographic/supply niche.
- Prove at least three months of retention, contribution and operations.
- Add discovery only where local supply is dense.
- Compare Supplier-sourced versus Clubroom-sourced demand.
- If consumer acquisition is not economical after a defined six-month test, stop spending on marketplace demand and continue as football operations SaaS.

## Profitability decision rule

Clubroom is not “proven profitable” until real cohort data shows:

```text
Clubroom fee + allocated subscription revenue
− payment/payout cost absorbed by Clubroom
− Clubroom-funded refunds and chargeback loss
− variable support, messaging and hosting
> 0 per completed booking/cohort
```

Then include fixed operating costs, insurance, professional fees, taxes and a realistic founder salary in the monthly break-even model.

## New development-gap audit task

Use a separate Codex task for the implementation audit. Suggested task prompt:

> Audit Clubroom end-to-end against `/Users/tubton/Desktop/coachapplication/legal-stance` and current runtime truth. Do not assume features work from docs, types or prior test names. Inventory every user-visible feature and every role (parent/guardian, Player account, coach, coach-guardian, assistant, club owner/admin/head coach/member), then trace each flow from UI action through navigation, service, API, authorisation, database, side effects and user feedback. Test happy paths plus loading, empty, error, retry, offline, duplicate action, cancellation, reassignment, revoked permission, cross-account and bounded account deletion. Give special depth to Home authority, child privacy, medical/safeguarding projection, one-Supplier multi-session checkout, Stripe failure/refund/reconciliation, analytics identifiers and Apple compliance. Produce a feature/flow matrix with evidence, severity, owner and exact reproduction. Separate runtime-proven, test-only, implemented-but-unproven, mock-only, dead UI, backend-missing and policy-blocked. Do not fix issues in the audit task. End with the smallest ordered development-completion plan and explicit go/no-go gates for Stripe sandbox, closed live-money pilot and App Store submission. Be concise and do not call the product perfect.

The audit should use real runtime evidence and E2E tooling, not mark the product “perfect”. No credible product audit can guarantee that no defect remains.

## Open founder inputs

- Average session price and expected sessions per basket.
- Expected proportion of club versus independent-coach Suppliers.
- Expected card mix and refund/cancellation rate.
- Founder confirmation that the pilot fee is 6% VAT-inclusive and how any post-pilot price change will be notified.
- Who funds goodwill refunds and disputes.
- Minimum payout delay and new-Supplier reserve policy.
- Whether teen login is commercially necessary.
- Whether any development scores/percentiles are necessary at launch.
- Ordinary support hours and named urgent-safeguarding cover.
- Desired founder salary and monthly runway for break-even planning.

## Explicit no-go list for launch

- Clubroom money-holding, wallet, escrow, credit or BNPL.
- One charge spanning independent Suppliers.
- Ambiguous seller identity.
- Direct Debit.
- Paid remote group coaching through external payment in the iOS app.
- Family digital premium subscription sold outside Apple IAP.
- Standalone under-13 account.
- Public child profile/social feed or unmonitored adult-child DM.
- Medical/safeguarding production data before DPIA/lawful-basis/retention sign-off.
- Raw child/family identifiers or sensitive values in product analytics.
- “Safe”, “fully vetted”, “guaranteed” or unauthorised endorsement claims.
