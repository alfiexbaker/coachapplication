# ROUTE-098 — invoice list filter recovery

## Scope

`/invoices` shows invoices that the authenticated actor can read and lets that
actor narrow the list by status and date.

## Runtime path

`InvoicesScreen` → `invoiceService` → `GET /v1/invoices` or
`GET /v1/coaches/me/invoices`. Fastify applies actor-scoped access before
filtering. The React Native screen owns only filter presentation and does not
select an identity or decide finance authority.

## Fixes verified

1. A valid empty response now retains the invoice list and its filters. The
   user can clear a zero-result status or date filter instead of being trapped
   in a generic empty screen.
2. The total is explicitly labelled `Filtered summary` when a query is active.
3. Date filtering and clearing are separate labelled pressable controls. The
   clear control is no longer nested inside the date-filter pressable.
4. Clearing filters resets both local controls and the server query.

## Cross-role boundaries

- Owner coach, payer, privileged admin, and eligible club finance actors see
  only rows Fastify authorises for their identity.
- A caller cannot use the client filter UI to choose a different actor.
- The seeded Fastify suite covers an authorised invoice read, an unrelated
  actor denial, and filtered list responses.

## Verification

- Root type-check and test compilation: passed.
- Invoice list, invoice detail, and API-mode service contracts: 6/6 passed.
- Seeded Fastify invoice access and list-filter scenarios: 2/2 matched tests
  passed (63 unrelated route-suite cases skipped by the name filter).
- Target lint: passed.
- React Doctor reports only the separate protected `use-group-session`
  compiler diagnostic; it reports no finding in this invoice-list slice.

## Limitation

Native post-fix interaction and VoiceOver verification are blocked by `ENV-009`
(CoreSimulator XPC hangs while installing the built development client). No
production or staging invoice, payment, database audit, Sentry event, or
third-party state was changed.
