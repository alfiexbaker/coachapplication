# ROUTE-097 — invoice-detail authority

## Scope

`/invoices/[id]` for invoice read, send/reminder, mark-paid, and void actions.

## Runtime path

`InvoiceDetailScreen` → `useInvoiceDetail` → `invoiceService` →
`GET /v1/invoices/:invoiceId`, `POST /v1/invoices/:invoiceId/reminders`,
`POST /v1/invoices/:invoiceId/mark-paid`, and
`POST /v1/invoices/:invoiceId/void`.

The detail response now carries `invoice.canManageMoney`, calculated by the
Fastify authority from the authenticated actor's owner-coach, privileged-admin,
or active club finance membership. The client defaults to no finance controls
unless that capability or its direct coach/admin equivalent is present.

## Fixes verified

1. Mark-paid and void wait for a returned invoice in the requested terminal
   status before refreshing. A null or wrong result remains on the screen with
   an error; success confirmation is direct.
2. Active club owner/admin finance actors receive the backend-authoritative
   capability instead of being hidden by a client-only coach-role check.
3. The void icon and recipient email input now have explicit accessibility
   labels.

## Cross-role boundaries

- Owner coach, privileged admin, and active club owner/admin finance roles can
  manage money only when `canManageMoney` is true.
- A payer can read their own invoice but receives `canManageMoney: false`.
- Assistant and member finance mutations are denied by Fastify before any
  transition. Invoice reads and money transitions are audited.

## Verification

- Root and API type-checks: passed.
- Root test compilation plus invoice detail/service contracts: 6/6 passed.
- Seeded Fastify finance/reminder filter: 2 matched tests passed; 63 unrelated
  route tests skipped by the explicit name filter.
- Target lint: no errors. One older import-order warning remains in
  `constants/financial-types.ts` outside this change.
- React Doctor reports existing diagnostics across the large Fastify route file
  and the protected `use-group-session` compiler error; none identify this
  invoice capability path.

## Limitation

Native post-fix interaction is blocked by `ENV-009` (CoreSimulator XPC hangs
while installing the built development client). No production or staging
invoice, payment, database audit, Sentry event, or third-party state changed.
