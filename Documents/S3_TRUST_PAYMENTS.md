# S3 Trust, Verification & Payments Roadmap

## Scope
- Pillar 6 (Verification, Compliance & Payments) plus supporting admin tooling.
- Post-MVP features that ensure platform viability and safety.

## Verification Tracks
| Track | Requirements | Data Captured | Review Workflow |
| --- | --- | --- | --- |
| Identity (KYC) | Government ID scan + selfie match via Stripe Identity | doc type, issuing country, verification status, expiresAt | Auto decision with manual override queue |
| DBS / Background | Upload certificate + metadata | file URL, certificateId, issue/expiry | Manual review by compliance user |
| Insurance | Proof of liability coverage | provider, policy number, coverage amount, expiry | Auto-reminder 30 days before expiry |
| Qualifications | Coaching badges, licenses | issuing body, level, verification doc | Optional but boosts discovery ranking |

## Verification UX
- Profile badge stack showing status (Verified, Pending, Action Needed).
- Progress checklist surfaced during coach onboarding and in Profile > Compliance.
- Parents can tap badges on profile to view last verified date and coverage summary.

## Payments Architecture (Stripe Connect)
- **Accounts**: Create Express accounts per coach; store `stripeAccountId` on `CoachProfile`.
- **Charges**: Parent pays via Checkout/Payment Element; funds flow to platform, then transfer to coach less commission.
- **Payout cadence**: Weekly automatic payouts, adjustable in admin console.
- **Fees model**: Platform fee % configurable per service; store on `Service` record for transparency.
- **Refunds**: Triggered by cancellation policy; refund logic references booking status and payment capture timestamp.
- **Invoices**: Generate PDF per booking with line items (service, taxes, fees). Parents access via booking details; coaches via payouts history.

## Compliance & Safeguarding
- **Safeguarding reports**: Accessible from messaging thread, booking detail, and profile. Form collects `category`, `description`, `attachments`, `urgency`. Routes to admin console queue.
- **Content moderation**: Integrate with chat + media storage to quarantine flagged assets until reviewed.
- **Audit logs**: Every action (verification change, payout adjustment, safeguarding resolution) recorded with actor and timestamp.

## Admin Console Modules
1. **Verification Review**: Table with filters by status, track type; detail drawer shows documents and decision buttons.
2. **Payouts & Fees**: View transfers, pending payouts, disputes. Actions: hold payout, release, adjust fee.
3. **Safeguarding Cases**: Kanban (New, Investigating, Resolved) with assignment to admins, notes, and linked bookings/messages.
4. **Moderation Queue**: Messages/media awaiting decision; actions to delete, warn, or escalate.

## Notifications & Reminders
- Coaches receive reminders for expiring documents (30/7/1 day). Push + email referencing compliance page deep link.
- Parents notified when coach loses verified status (badge greyed) with explanation.
- Admin alerts for high-severity safeguarding reports (SMS + email optional).

## Future Enhancements
- **Subscriptions**: Offer premium parent plan for extended media retention + priority support.
- **Escrow payments**: Hold funds until session completion for additional trust.
- **Multi-currency support**: Expand beyond USD/EUR; rely on Stripe FX rates.
- **Tax handling**: Collect VAT/GST data where required; integrate tax calculation service.

## Open Decisions
- Do we require verification before first booking or allow grace period? (Recommendation: allow discovery but block bookings until KYC + DBS complete.)
- Should payouts be instant for top-tier coaches? (Explore Stripe Instant Payouts as add-on.)
- How to surface safeguarding transparency to parents without causing alarm? (Consider monthly safety digest.)
