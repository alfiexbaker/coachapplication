# Payments and basket design

## Launch decision

Clubroom should not use Direct Debit. Use Stripe Connect for the closed pilot, accepting cards and supported wallets. The existing direct-charge architecture fits the intended Supplier-as-seller model and Stripe has the strongest already-implemented test path. Do not switch for Mollie's 0.3-point standard-card headline saving unless a written Connect quote proves a materially better blended cost without transferring payment, chargeback or negative-balance risk to Clubroom.

The provider must perform seller onboarding/KYC and move the money. Clubroom must not receive family money into its own bank account, maintain an internal wallet, promise escrow, or manually net unrelated sellers.

This is both a legal boundary and a profitability boundary. Payment-provider product language does not determine Clubroom's regulatory or contractual status, so obtain a written payment-services perimeter opinion before live money.

## One seller per payment

Parents may book several sessions and several children at once when every basket line has the same legal Supplier. The basket must show each participant, session, date, price and cancellation term.

At launch:

- one legal Supplier per payment;
- multiple children are allowed;
- multiple sessions and dates are allowed;
- different delivery coaches are allowed only where the same club/legal entity is the Supplier;
- no payment may silently combine independent coaches or different clubs.

If mixed-seller demand is later proven, use a grouped shopping experience that creates clearly separated orders and, preferably, visibly separated payment authorisations. A true single charge split across sellers should not be introduced without legal, accounting, support, refund and reconciliation sign-off.

## Recommended money flow

Subject to provider and legal confirmation:

1. The family selects sessions supplied by one coach or club.
2. Checkout names that Supplier and Clubroom's agency role.
3. The provider processes the card/wallet payment for the connected Supplier.
4. Clubroom takes the contractually disclosed application/platform fee.
5. Payment-processing, refund and chargeback costs are allocated to the Supplier where the provider configuration and contract permit.
6. Payout is delayed until the agreed risk point, normally after delivery, then aggregated on a weekly schedule.
7. Webhooks authoritatively update an immutable line-level ledger using idempotent processing.
8. The Supplier statement shows gross receipts, Clubroom fee, VAT treatment, payment/payout fees, refunds, adjustments, net proceeds and payout date.

Configure **Stripe handles pricing**, with the connected Supplier as fee payer, subject to written confirmation. Persist and verify Stripe's authoritative fee-payer and negative-balance responsibility before enabling live money.

New or higher-risk Suppliers should have longer payout delays or proportionate reserves. Clubroom must never treat unsettled seller money as operating cash.

## Why basket consolidation matters

At Stripe's published standard UK-card price of 1.5% plus 20p, three separate £20 payments cost £1.50, while one £60 same-Supplier payment costs £1.10. Consolidation saves 40p because it removes two fixed charges.

The current runtime correctly restricts an Order to one Supplier and computes one basket fee. Paid consolidated Order refunds are still unsupported, so do not expose consolidated paid baskets in the live pilot until line-level cancellation and refund allocation is authoritative.

The percentage headline is not the whole price. Provider comparison must include:

- card percentage and fixed authorisation fee;
- connected-account fee;
- routing/application fee;
- payout fee;
- international and premium-card mix;
- refund treatment;
- dispute and chargeback fees;
- fraud tools;
- KYC failure and support effort;
- reserve requirements;
- who legally and economically bears negative balances.

A 0.3 percentage-point difference is £300 at £100,000 GMV and £3,000 at £1 million GMV before fixed fees and marketplace charges. It matters at scale, but is only 6p, 11p and 15p on £20, £35 and £50 baskets. The wrong liability or reconciliation model can cost more.

## Published-price working comparison

Prices change and negotiated marketplace pricing may differ. Confirm in writing before signing.

| Provider | Relevant public starting point | Launch assessment |
|---|---|---|
| Stripe | UK standard cards 1.5% + 20p; premium UK cards 2.8% + 20p; EEA cards 2.5% + 20p. Under **Stripe handles pricing**, Stripe publishes no additional platform account, payout-volume, tax-reporting or per-payout fee | Pilot choice; confirm controller configuration and negotiated terms in writing |
| Mollie | UK domestic consumer cards 1.2% + 20p; UK commercial and European cards 2.9% + 20p; Connect requires a quote | Do not switch on headline price alone; its split-payment model states the marketplace owns the payment, pays Mollie fees and retains chargeback liability |
| Adyen | Published processing fee plus payment-method/interchange pricing; platform products may add costs | Powerful but likely operationally heavy for the first closed pilot |

## Sandbox and integration sequence

Stripe provides test environments, test cards, simulated disputes/refunds, test connected accounts and webhook testing. Use them now; do not wait for all development to be finished.

Required test matrix before live money:

- successful wallet and card payment;
- authentication required, decline and retry;
- duplicate submission and idempotency;
- seller onboarding incomplete or restricted;
- multi-child, multi-session same-Supplier payment;
- full and line-level partial refund;
- Supplier cancellation;
- dispute before and after payout;
- failed/reversed payout;
- webhook delay, duplication and reordering;
- abandoned checkout and expired inventory;
- account deletion with retained financial records;
- receipt, tax invoice and seller-statement reconciliation.

After sandbox acceptance, use a capped real-money pilot with a small number of known Suppliers. Reconcile every payment, refund and payout manually against the ledger before scaling.

Stripe does not add a standard refund fee but does not return the original payment, Connect or foreign-exchange fees. The current adapter returns Clubroom's application fee, leaving no Clubroom commission on a full refund while the Supplier bears the original processing cost. Current dispute pricing can erase the revenue from many bookings, and dispute, payout and account-restriction webhooks are not yet implemented. These are live-money blockers.

## Tax and reporting dependencies

The true agency position affects VAT and accounting. A disclosed agent commonly records its commission/agency service as revenue while the Supplier records the coaching sale, but the written contract, checkout, receipts, invoices, ledger and actual conduct must all match.

Before launch obtain written accountant advice on:

- whether Clubroom is agent or principal for VAT and revenue recognition;
- whether its fee is quoted inclusive or exclusive of VAT;
- the £90,000 VAT-registration threshold and forecast registration date;
- the Supplier's responsibility for VAT on coaching;
- refunds, discounts and bad debt;
- corporation-tax forecasts;
- digital-platform seller due diligence and HMRC annual reporting.

Service sellers can fall within the digital-platform reporting rules. Onboarding and the ledger should therefore collect the required seller identity/tax data and reportable quarterly totals; do not assume the payment provider files Clubroom's report.

## Decisions requiring external sign-off

- **Payments/FCA counsel:** regulatory perimeter, Supplier-only agency appointment, permitted money flow and refund authority.
- **Accountant/tax adviser:** agency/principal treatment, VAT, invoices, revenue recognition and platform reporting.
- **Provider:** liability for fees, refunds, disputes, negative balances, reserves, KYC and termination.
- **Insurance broker:** whether payment loss, crime/social engineering and platform liability are covered.

## Sources

See [sources.md](sources.md), especially the FCA, Stripe, Mollie, Adyen, VAT and platform-reporting sections.
