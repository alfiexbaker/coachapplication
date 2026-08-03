# Invoice reminder concurrency verification

## Scope

- Reviewed every remaining backend async-ordering diagnostic from the latest React Doctor inventory.
- Changed only the invoice reminder route where two reads/writes are independent.
- Used local seed fixtures only. No production or staging service, database, email provider, Sentry project, or child data was touched.

## Implemented change

`POST /v1/invoices/:invoiceId/reminders` now starts the delivery-status update and invoice-detail read together. The response still uses the mapped invoice detail and persisted reminder returned by the same operations.

The `invoice.reminder` success audit remains after the delivery-status update resolves. A failed reminder update therefore cannot produce a false success audit.

## Reviewed sequential paths

The following diagnostics are intentional ordering boundaries and were not changed:

- Auth registration creates the password credential before the verification/session records so a partial failure cannot create a usable account without its credential.
- Athlete skill assessment reads run inside one Prisma interactive transaction; `Promise.all` would not create database concurrency on the transaction connection and would obscure replay ordering.
- Drill-assignment completion reloads assignments after the transaction because the response must contain the newly written submission/status projection.
- Club creation, membership, and invite writes run inside one Prisma transaction and retain foreign-key and authority-event ordering.

## Verification

- Focused Fastify tests: 3 passed, 62 skipped by name filter.
  - Authorized seed reminder with denied payer boundary.
  - Configured webhook reminder without raw recipient metadata.
  - Practice-task and drill-assignment completion with outsider denial.
- API TypeScript check: passed.
- Root TypeScript check: passed.
- React Doctor changed-file scan: 0 diagnostics.
- `git diff --check`: passed.

Sentry issue inspection remains blocked by the previously recorded token HTTP 403 (`ENV-004`).
