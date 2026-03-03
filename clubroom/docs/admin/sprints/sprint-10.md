# Sprint 10 - Booking, Revenue, and Financial Operations Console

## Goal
Provide secure internal tooling for booking and revenue operations:
reconciliation, invoice dispute handling, payment-status interventions,
and controlled financial adjustments.

## Dependencies
- Sprints 00-09
- Existing finance services (`services/invoice-service.ts`, `services/earnings/**`, `services/coach-payment-instructions-service.ts`)

## Scope
- booking operations queue (failed/cancelled/contested bookings)
- invoice operations queue (unpaid/overdue/disputed invoices)
- reconciliation workspace with reason-coded status transitions
- financial adjustment workflow (write-off, correction, manual settlement note)
- immutable audit trail for every financial action

## Data Model (new)
- `finance_cases`
- `finance_case_events`
- `invoice_disputes`
- `reconciliation_actions`
- `financial_adjustment_requests`

## API Contracts (examples)
- `GET /v1/admin/finance/queue`
- `GET /v1/admin/finance/cases/:id`
- `POST /v1/admin/invoices/:id/disputes`
- `POST /v1/admin/invoices/:id/reconcile`
- `POST /v1/admin/finance/adjustments`

## Security Notes
- dual-control required for direct financial adjustments above policy threshold
- step-up auth required for adjustment approval/execution
- strict role split: support can propose, finance admin can approve, security can audit
- all actions require reason code + linked case ID + actor context

## Test Gates
- unauthorized adjustment and reconciliation-deny tests
- dual-approval enforcement tests for high-value actions
- immutable invoice state history tests (no silent overwrite)
- audit assertions for all finance reads/writes

## Exit Criteria
- finance ops can resolve disputes and reconcile safely from one console
- high-risk financial actions are policy-gated and fully auditable

