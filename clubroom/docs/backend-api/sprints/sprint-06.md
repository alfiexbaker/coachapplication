# Sprint 06 - Invoices and Reconciler (No In-App Payments)

## Goal
Ship the v1 revenue/reconciler backend (invoices, direct-to-coach reminders, mark paid/unpaid/write-off/restore) with immutable financial history and strong auditability.

## Dependencies
- Sprint 05

## Scope
- invoice generation and retrieval
- invoice line items
- invoice status event history (append-only)
- reconciler entries and state transitions
- payment instruction templates (direct-to-coach)
- reminder sends/logging
- payer invoice reads (limited views)

## Codebase Alignment Anchors
- `app/(tabs)/earnings.tsx`
- `app/analytics/revenue.tsx`
- `components/invoices/*`
- `components/payment/*` (phase 1 direct payment UI still exists)
- `services/invoice-service.ts`
- `services/earnings/*`
- `services/coach-payment-instructions-service.ts`

## Tables / Schema
- `invoices`
- `invoice_line_items`
- `invoice_events` (append-only)
- `reconciler_entries`
- `payment_instruction_templates`
- `payment_reminders`

## Endpoints (examples)
- `POST /v1/invoices/generate`
- `GET /v1/invoices/:invoiceId`
- `GET /v1/coaches/me/invoices`
- `POST /v1/invoices/:invoiceId/mark-paid`
- `POST /v1/invoices/:invoiceId/mark-unpaid`
- `POST /v1/invoices/:invoiceId/write-off`
- `POST /v1/invoices/:invoiceId/restore`
- `POST /v1/invoices/:invoiceId/reminders`
- `GET/PATCH /v1/coaches/me/payment-instructions`

## AuthZ / Audit Notes
- coach owner and explicitly delegated finance scopes can manage reconciler actions
- payer/guardian may read only their own invoice views
- all invoice/reconciler actions audited
- no hard delete for financial tables

## Data Rules
- amounts in minor units (`GBP`)
- status history append-only via `invoice_events`
- idempotency required on status transition endpoints

## Test Gates
- mark paid/unpaid/write-off/restore idempotency
- authz tests (owner coach, delegated finance, payer read)
- invoice event history immutability assertions
- audit event coverage for all financial actions

## Exit Criteria
- v1 revenue/reconciler flows are production-safe and future payment-provider compatible
