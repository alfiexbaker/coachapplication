## Current Task
**Feature**: Earnings Tab Rework — Cash Payment Reconciliation (COMPLETE)
**Step**: All 10 steps done. TypeScript compiles clean (no errors).
**Files touched**:
- MODIFIED: constants/financial-types.ts — added WRITTEN_OFF to InvoiceStatus
- MODIFIED: services/event-bus.ts — added INVOICE_WRITTEN_OFF and INVOICE_RESTORED events + payloads
- MODIFIED: services/invoice-service.ts — added writeOff(), restoreFromWriteOff(), emitTyped for INVOICE_PAID, updated status label/color helpers
- REWRITTEN: hooks/use-session-payments.ts — 3-way split (unpaid/paid/writtenOff), action handlers, new events
- REWRITTEN: components/earnings/session-payment-item.tsx — expandable actions per tab (Mark Paid, Write Off, Remind, Restore)
- REWRITTEN: components/earnings/payment-summary-card.tsx — optional written-off display
- REWRITTEN: app/earnings.tsx — 3-tab reconciliation view (Owed/Paid/Written Off)
- MODIFIED: app/chat/[threadId].tsx — reads prefill param
- MODIFIED: components/messaging/chat-input.tsx — accepts initialValue prop
- REWRITTEN: app/payments/index.tsx — thin Redirect to earnings
- DELETED: components/earnings/earnings-balance-card.tsx
- DELETED: hooks/use-earnings.ts
- DELETED: components/earnings/transaction-list-item.tsx
- DELETED: components/earnings/earnings-withdraw-modal.tsx
- UPDATED: components/earnings/index.ts — removed deleted exports
- UPDATED: __tests__/invoices/invoice-service.test.ts — added WRITTEN_OFF to Record types
- UPDATED: __tests__/invoices/InvoiceCard.test.tsx — added WRITTEN_OFF to Record type
**Next**: Verify on device, or proceed to Sprint 3 dead-end flows
**Blockers**: none
