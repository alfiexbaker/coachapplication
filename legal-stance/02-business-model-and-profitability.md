# Business Model and Profitability

## Recommended commercial model

Clubroom should launch as a football-specific, SaaS-enabled managed marketplace, not as an employer-led coaching company and not as a generic child social network.

The starting revenue engine should be a transparent seller commission on successfully completed paid bookings. Optional club SaaS pricing can be introduced only when it pays for a distinct administrative product and does not hide payment charges or duplicate the commission.

Potential later revenue lines must be separately tested:

- club administration subscription;
- lower commission tier bundled with a paid club plan;
- verification or compliance administration sold at cost or as a clearly described service;
- premium business analytics for adult business users;
- enterprise contracts with academies or clubs.

Do not monetise children’s attention, medical data, safeguarding data, advertising profiles, undisclosed ranking, pay-to-win trust badges, or a coach’s ability to hide negative evidence.

## Commercial wedge and sequence

Start with commercial independent youth-development coaches, small academies and small paid-development organisations that already have families. They offer one decision-maker, repeated paid bookings and a clear scheduling/reconciliation problem. Volunteer-run clubs can follow after the payment, role and governance model works.

The sequence is:

1. Vertical SaaS plus booking/payment agency for Suppliers bringing existing families.
2. Prove activation, rebooking, reconciliation, retention and self-service support.
3. Add local discovery only where Supplier density is high enough to serve demand.
4. Charge more for genuinely Clubroom-sourced demand only after attribution is reliable.

If consumer discovery fails, Clubroom can remain a viable football operations SaaS rather than continuing to fund an uneconomic two-sided marketplace.

## Unit-economics model

Define these inputs before choosing a take rate:

| Variable | Meaning |
| --- | --- |
| `B` | completed paid baskets per month |
| `A` | average basket value |
| `T` | Clubroom commission rate |
| `S` | monthly seller/club subscription revenue |
| `P` | payment processing cost |
| `C` | connected-account and payout cost |
| `R` | refunds, disputes, fraud, and bad-debt cost retained by Clubroom |
| `V` | variable support, verification, messaging, storage, and notification cost |
| `VAT` | VAT cost or output tax attributable to Clubroom revenue, as confirmed by an accountant |
| `F` | fixed monthly operating cost, including insurance and professional services |

Core calculations:

```text
GMV = B × A
Gross platform revenue = (GMV × T) + S
Contribution = gross platform revenue - P - C - R - V - VAT
Contribution margin = contribution ÷ gross platform revenue
Operating profit before tax = contribution - F
Break-even baskets = F ÷ contribution per completed basket
```

Track both GMV margin and revenue margin. A processor cost of 1.5% of GMV can consume 15% of revenue when Clubroom earns a 10% commission, before the fixed transaction fee.

## Basket economics

Using Stripe’s published standard UK-card price of 1.5% + 20p solely as an illustration:

- three separate £20 payments cost about £1.50 in core processing fees;
- one £60 basket costs about £1.10;
- the basket saves about 40p before Connect, payout, refund, tax, and support costs.

This supports multiple sessions in one checkout. It does not by itself justify mixed-seller baskets.

## Recommended launch basket

Allow multiple sessions from the **same legal seller** in one basket. Each line keeps its own session, athlete, price, cancellation, attendance, and refund state.

Defer a basket containing multiple legal sellers until:

- payment-regulatory counsel approves the funds flow;
- the provider confirms marketplace support and full pricing in writing;
- partial refunds, disputes, seller insolvency, negative balances, and transfer reversals are automated;
- every line clearly identifies its seller and contract;
- customer support can explain one card charge containing several supplier contracts;
- accounting can reconcile gross charge, commission, processing fees, seller balances, payouts, VAT, and tax reporting.

## Pricing decision—not yet fixed

Do not select a commission percentage from competitors’ headlines. Model at least:

- independent coach, low volume;
- independent coach, high volume;
- small club;
- multi-squad club;
- free session;
- cancelled and partially refunded basket;
- disputed payment;
- seller paid weekly versus monthly.

For each, compare Stripe Connect and at least one serious marketplace alternative using written all-in quotes. Published core card rates exclude important platform economics.

Working pilot hypotheses—not commitments:

- independent coach: 6% Clubroom fee, with processing deducted separately from the Supplier;
- club/academy: about £99 per month plus 2% of booking value, with processing deducted separately;
- family: free;
- Clubroom-sourced new demand: test 8–10% only later;
- no parent booking fee and no Direct Debit.

Whether those percentages are inclusive or exclusive of VAT must be fixed before contracts and checkout are drafted.

### Worked platform-cost sensitivity

One CFO scenario assumes £10,000 monthly GMV, 200 baskets, 20 active Suppliers, 80 payouts, £9,000 of Supplier proceeds and a 10% VAT-inclusive Clubroom commission. Using current published Stripe examples, core card fees could be about £190, active-account charges £40, payout charges £30.50 and a possible additional funds-routing charge £22.50. Total provider cost would be about £283, or 2.83% of GMV, subject to confirmation that each Connect component applies to the selected configuration.

The £1,000 VAT-inclusive commission would contain £166.67 output VAT, leaving £833.33 net revenue and about £550.33 after those illustrative provider costs—before support, refunds, fraud, hosting, insurance or salary. This shows why a 10% headline take rate is not a 10% margin and why the Supplier should bear transparent processing costs where lawful and contractually agreed.

## Profitability gates

Clubroom is commercially ready only when:

- every paid basket has a positive expected contribution after expected refunds and support;
- commission covers payment costs without unlawful or misleading consumer surcharges;
- seller acquisition does not depend on indefinite founder labour;
- verification and safeguarding review workloads have measurable capacity and cost;
- the payout schedule creates an adequate refund/dispute reserve without unfairly withholding seller funds;
- VAT treatment is modelled both below and above the registration threshold;
- at least three downside scenarios remain solvent;
- the founder has a monthly cash runway and tax reserve policy;
- free bookings have a defined strategic reason and cost ceiling.

## Usability gates

Profitability must not be created through hidden friction. Before launch:

- the customer sees the total price, named seller, cancellation policy, and participant for every basket line;
- a returning parent can complete a normal booking without re-entering stable family data;
- mixed permissions never expose another child merely to make checkout easier;
- seller onboarding asks once for information that can lawfully be reused;
- verification expiry creates clear action, not silent delisting without notice;
- partial cancellation and refund are understandable at line-item level;
- support has one case timeline combining booking, payment, notification, permission, and audit evidence;
- no operational policy depends on the founder remembering an off-system exception.

## Management dashboard

Review weekly:

- completed GMV and net revenue;
- effective take rate;
- processor and payout cost as percentages of GMV and revenue;
- contribution per basket and per active seller;
- checkout conversion and payment failure rate;
- repeat booking rate by family and seller, using non-sensitive cohorts;
- refund, cancellation, dispute, and no-show rates;
- time to first seller booking;
- seller activation and 30/90-day retention;
- support minutes and safeguarding-review minutes per completed basket;
- concentration of GMV by club/coach;
- cash, provider balance, seller liability, refund reserve, tax reserve, and runway.

Do not place child health, safeguarding categories, inferred ability, or vulnerability attributes in the commercial analytics warehouse.
