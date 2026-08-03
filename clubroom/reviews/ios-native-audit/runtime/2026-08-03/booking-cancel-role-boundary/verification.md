# QA-097 — booking cancellation role boundary

## Scope

Athlete, parent, and coach cancellation presentation, the `POST /v1/bookings/:bookingId/cancel` authority boundary, and cancellation notifications. All execution used the local seeded API test backend; no production, staging, user account, permission, payment, refund, or notification state was changed.

## Findings and fixes

- The app trusted `?mode=coach` to choose its role-specific cancellation UI. The server already authorizes the authenticated booking actor, but the client could show the wrong role's reasons and notification wording.
- The `Notify Waitlist` toggle was a dead control: it only wrote a debug log and sent no notification.
- Athlete accounts were falling into the parent-only reason list.

The route now carries only the booking ID. The hook derives coach presentation from the signed-in coach account and loaded booking owner, restricts parent-only reasons to parent accounts, and removes the fake waitlist guarantee.

## Verification

- App contract suite: 6 checks passed for role derivation, policy fail-closed behavior, and auth-scoped snapshots.
- `src/modules/booking/routes.test.ts`: 51/51 local seeded API tests passed, including durable cancellation notifications and simulated payment/refund guards.
- `src/modules/p0-core/routes.test.ts`: 46/46 local seeded API tests passed, including unrelated-actor cancellation denial.
- Targeted ESLint passed. Full TypeScript checking passed before the evidence-only update.

## Limitation

ENV-008 blocks a native after retest. The route remains explicitly native-retest pending; this evidence proves the source and local API boundary only.
