# Last Step Handoff

Date: 2026-04-12

## What Was Just Done

1. Finished `PROD-MONEY-01` by adding a backend-owned money runtime in `apps/api/src/lib/invoice-runtime.ts` plus a provider boundary in `apps/api/src/lib/payment-provider.ts`.
2. Replaced direct payer-paid mutation on `POST /v1/invoices/:invoiceId/payments` with hosted payment-attempt creation in `apps/api/src/modules/wave2plus/routes.ts`; invoices now become `PAID` only after backend confirmation through `/v1/payment-attempts/:attemptId/simulated-complete`.
3. Added backend-owned invoice generation and reminder/send routes in `apps/api/src/modules/wave2plus/routes.ts`, and extended the Prisma auth/revenue model with `PaymentAttempt` state in `packages/db/prisma/schema.prisma`.
4. Switched app invoice flows onto the new authority path in `services/invoice-service.ts`, `hooks/use-invoice-detail.ts`, and `app/invoices/[id].tsx`, so non-mock invoice detail launches a hosted payment boundary with allowlisted app return URLs instead of mutating paid state locally.
5. Added route regressions for hosted payment session creation, backend confirmation, deep-link return URL allowlisting, idempotent generation, and reminder authz in `apps/api/src/modules/wave2plus/routes.test.ts`, then synced the canonical runtime, trust, route-inventory, and sprint backlog docs.

## Verification Run In This Step

- `npm --prefix packages/db run prisma:generate` -> PASS
- `npm --prefix apps/api run typecheck` -> PASS
- `npm --prefix apps/api run test` -> PASS (`66/66`)
- `npm run typecheck` -> PASS
- `npm run test:compile` -> PASS
- `git diff --check` -> PASS

## Current State

- `PROD-MONEY-01` is complete in code.
- Non-mock invoice generation, reminder/send, and payer payment session flows now run through backend `/v1` routes.
- The app no longer treats payer payment as a direct invoice status transition; the current hosted provider is simulated behind a Stripe-ready backend boundary.
- Coach manual reconciler actions remain separate for off-platform collections.

## Next Exact Action

1. Start `PROD-OPS-01`.
