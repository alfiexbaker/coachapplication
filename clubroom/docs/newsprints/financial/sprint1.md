# Financial Sprint 1: Wire the Reconciler to Real Data

**Goal**: The earnings screen (`app/earnings.tsx`) already has a 3-tab reconciler (Owed/Paid/Written Off) with `useSessionPayments`, `PaymentSummaryCard`, and `SessionPaymentItem`. But it only works with bookings that have status `COMPLETED`. Wire it to actual booking data, fix the invoice auto-generation fallback, and ensure every completed session appears.

---

## Fix 1: useSessionPayments only loads COMPLETED bookings — miss CANCELLED with payment owed

**File**: `hooks/use-session-payments.ts`
**Lines**: ~44
**Severity**: HIGH — coaches lose visibility on money owed for late-cancelled sessions

```
TASK: Expand booking filter in useSessionPayments to include CANCELLED bookings where payment is still owed.

CURRENT BEHAVIOR:
- Line 44: `const completed = bookings.filter((b) => b.status === 'COMPLETED');`
- Only COMPLETED bookings show up in reconciler
- A session cancelled inside the cancellation window (payment still owed) is invisible
- Coach can't track or mark-paid that owed amount

FIX LOCATION: hooks/use-session-payments.ts ~44

STEPS:
1. Read hooks/use-session-payments.ts
2. Replace line 44 filter:

   ```typescript
   // Include completed sessions + late-cancelled (inside cancellation window = payment owed)
   const reconcilable = bookings.filter(
     (b) =>
       b.status === 'COMPLETED' ||
       (b.status === 'CANCELLED' && b.cancellationFee && b.cancellationFee > 0)
   );
   ```

3. Update the loop (line 61) to use `reconcilable` instead of `completed`

4. When building synthetic invoices (line 73-95), use `b.cancellationFee` as the amount for cancelled bookings:
   ```typescript
   const invoiceAmount = booking.status === 'CANCELLED'
     ? (booking.cancellationFee ?? 0)
     : (booking.price ?? 0);
   ```

5. Update the synthetic invoice block to use `invoiceAmount` instead of `booking.price`

ACCEPTANCE CRITERIA:
- COMPLETED bookings appear as before
- CANCELLED bookings with cancellationFee > 0 appear in Owed tab
- Cancelled session invoice shows cancellation fee amount, not full price
- Paid/Written Off tabs still work
- Totals update correctly
```

---

## Fix 2: Synthetic invoice uses booking.price but some bookings have 0 or undefined price

**File**: `hooks/use-session-payments.ts`
**Lines**: ~73-95
**Severity**: HIGH — £0.00 items clutter reconciler

```
TASK: Skip bookings with no price instead of creating £0 synthetic invoices.

CURRENT BEHAVIOR:
- Line 73: `if (!invoice && booking.price) { ... }`
- Truthy check on booking.price means £0 bookings are skipped (good)
- But bookings with price=undefined still fall through to `if (!invoice) continue;` at line 97
- This creates invisible gaps — coach sees fewer items than expected

FIX LOCATION: hooks/use-session-payments.ts ~61-97

STEPS:
1. Read hooks/use-session-payments.ts
2. After the synthetic invoice block, before `if (!invoice) continue;`, add an explicit skip for zero-price:

   ```typescript
   // Skip bookings with no monetary value (e.g. free trial sessions)
   if (!invoice) {
     const amount = booking.status === 'CANCELLED'
       ? (booking.cancellationFee ?? 0)
       : (booking.price ?? 0);
     if (amount <= 0) continue;
   }
   ```

3. This means: if no invoice could be found or generated, AND booking has no price, skip silently

ACCEPTANCE CRITERIA:
- £0 bookings don't appear in reconciler
- Free trial sessions excluded
- Bookings with real prices still generate synthetic invoices
- No empty rows in any tab
```

---

## Fix 3: Invoice auto-generation only checks MOCK_BOOKINGS — real bookings always miss

**File**: `services/invoice-service.ts`
**Lines**: ~378-437 (generateInvoice method)
**Severity**: CRITICAL — auto-generation silently fails for all real bookings

```
TASK: Fix generateInvoice to fetch booking data from bookingService instead of only checking MOCK_BOOKINGS.

CURRENT BEHAVIOR:
- Line 389: `const bookingData = MOCK_BOOKINGS[bookingId];`
- MOCK_BOOKINGS only contains 1 entry ('booking_new_001')
- Every real booking ID returns undefined → generates no invoice
- The synthetic fallback in useSessionPayments catches this, but it's fragile

FIX LOCATION: services/invoice-service.ts ~378-437

STEPS:
1. Read services/invoice-service.ts, locate generateInvoice method
2. Import bookingService:
   ```typescript
   import { bookingService } from '@/services/booking';
   ```

3. Replace MOCK_BOOKINGS lookup with real booking fetch:
   ```typescript
   async generateInvoice(params: GenerateInvoiceParams): Promise<Result<Invoice, ServiceError>> {
     const { bookingId, notes, dueDate, taxRate = DEFAULT_TAX_RATE } = params;

     // Check if invoice already exists for this booking
     const existingInvoice = await this.getInvoiceByBookingId(bookingId);
     if (existingInvoice) {
       logger.warn('invoice_already_exists', { bookingId, invoiceId: existingInvoice.id });
       return ok(existingInvoice);
     }

     // Fetch real booking data
     const bookingResult = await bookingService.getById(bookingId);
     if (!bookingResult.success) {
       // Fallback to mock data for demo/testing
       const mockData = MOCK_BOOKINGS[bookingId];
       if (!mockData) {
         return err(notFound('Booking', bookingId));
       }
       return this.createInvoiceFromData(mockData, bookingId, notes, dueDate, taxRate);
     }

     const booking = bookingResult.data;
     const amount = booking.price ?? 0;
     if (amount <= 0) {
       return err({ code: 'VALIDATION' as const, message: 'Booking has no price' });
     }

     // Calculate tax
     const netAmount = amount / (1 + taxRate / 100);
     const taxAmount = amount - netAmount;
     const roundMoney = (n: number): number => Math.round(n * 100) / 100;

     const invoiceNumber = await this.generateInvoiceNumber();

     const newInvoice: Invoice = {
       id: generateId('inv'),
       invoiceNumber,
       userId: booking.bookedById ?? booking.athleteId ?? '',
       bookingId,
       coachId: booking.coachId,
       athleteId: booking.athleteId,
       sessionDate: booking.scheduledAt,
       sessionType: booking.service ?? booking.serviceType ?? 'Session',
       sessionLocation: booking.location ?? '',
       sessionDuration: booking.duration ?? 60,
       amount: roundMoney(netAmount),
       tax: roundMoney(taxAmount),
       taxRate,
       total: amount,
       currency: 'GBP',
       status: 'SENT',
       createdAt: new Date().toISOString(),
       dueDate: dueDate || this.getDefaultDueDate(),
       notes,
     };

     const invoices = await this.getAllInvoices();
     invoices.unshift(newInvoice);
     await this.saveInvoices(invoices);

     logger.info('invoice_generated', {
       invoiceId: newInvoice.id,
       invoiceNumber,
       bookingId,
       total: newInvoice.total,
     });

     return ok(newInvoice);
   }
   ```

4. Keep MOCK_BOOKINGS as fallback for demo seeded data

ACCEPTANCE CRITERIA:
- generateInvoice fetches real booking via bookingService.getById()
- Falls back to MOCK_BOOKINGS if booking service returns NOT_FOUND
- Tax calculated correctly with roundMoney
- Generated invoices have status 'SENT' (not 'DRAFT') so they appear in Owed tab
- Existing invoices returned without duplication
- Zero-price bookings rejected with VALIDATION error
```

---

## Fix 4: Payment summary card doesn't show collection rate percentage

**File**: `components/earnings/payment-summary-card.tsx`
**Lines**: ~36-73
**Severity**: MEDIUM — coach can't quickly assess how well they're collecting

```
TASK: Add collection rate percentage to PaymentSummaryCard.

CURRENT BEHAVIOR:
- Shows "Owed: £X" and "Collected: £Y" and optionally "Written Off: £Z"
- No percentage — coach has to mentally calculate

FIX LOCATION: components/earnings/payment-summary-card.tsx ~36-73

STEPS:
1. Read components/earnings/payment-summary-card.tsx
2. Add collection rate calculation inside the component:
   ```typescript
   const totalBilled = totalOwed + totalCollected + totalWrittenOff;
   const collectionRate = totalBilled > 0
     ? Math.round((totalCollected / totalBilled) * 100)
     : 0;
   ```

3. Add a row below the split items showing the rate:
   ```typescript
   {totalBilled > 0 && (
     <Row align="center" gap="xs" style={{ marginTop: Spacing.sm }}>
       <Ionicons
         name={collectionRate >= 80 ? 'trending-up' : 'trending-down'}
         size={14}
         color={collectionRate >= 80 ? colors.success : colors.warning}
       />
       <ThemedText style={[Typography.caption, { color: colors.muted }]}>
         {collectionRate}% collection rate
       </ThemedText>
     </Row>
   )}
   ```

ACCEPTANCE CRITERIA:
- Collection rate shown as percentage below summary
- Green trending-up icon when >= 80%
- Amber trending-down icon when < 80%
- Hidden when no sessions billed yet (totalBilled === 0)
- Updates reactively when sessions marked paid/written off
```

---

## Fix 5: Remind button navigates to wrong chat route

**File**: `app/earnings.tsx`
**Lines**: ~70-89 (handleSendReminder)
**Severity**: HIGH — remind action crashes or goes to wrong screen

```
TASK: Fix handleSendReminder to navigate to the correct messaging route.

CURRENT BEHAVIOR:
- Line 80-86: navigates to `/chat/[threadId]` with `threadId: item.booking.id`
- booking.id is not a chat thread ID — it's a booking ID
- Navigation likely fails or opens wrong conversation

FIX LOCATION: app/earnings.tsx ~70-89

STEPS:
1. Read app/earnings.tsx
2. The remind flow should either:
   a. Navigate to the parent/athlete's message thread, OR
   b. Open a share sheet with the reminder text

3. Replace with share sheet approach (simpler, no thread ID dependency):
   ```typescript
   import { Share } from 'react-native';

   const handleSendReminder = useCallback(
     async (item: SessionPaymentItemType) => {
       const amount = `\u00A3${item.invoice.total.toFixed(2)}`;
       const sessionDate = new Date(item.booking.scheduledAt).toLocaleDateString('en-GB', {
         day: 'numeric',
         month: 'short',
       });
       const message = `Hi! Just a friendly reminder about the ${amount} payment for the session on ${sessionDate}. Let me know if you have any questions!`;

       try {
         await Share.share({ message });
       } catch {
         // User cancelled share sheet — no action needed
       }
     },
     [],
   );
   ```

4. This uses the native share sheet (WhatsApp, SMS, etc.) which is more practical for payment reminders than in-app chat

ACCEPTANCE CRITERIA:
- Remind button opens native share sheet
- Pre-filled message includes amount (£) and session date
- Share sheet works on both iOS and Android
- No crash on cancel
- Amount formatted correctly with GBP symbol
```

---

## Fix 6: markAsPaid / writeOff / restore don't show success feedback

**File**: `hooks/use-session-payments.ts`
**Lines**: ~156-170
**Severity**: MEDIUM — coach taps button, item disappears, no confirmation

```
TASK: Add toast feedback after mark-paid, write-off, and restore actions.

CURRENT BEHAVIOR:
- handleMarkPaid calls invoiceService.markAsPaid(invoiceId)
- Item moves tabs via event-driven refresh
- No toast or confirmation — feels like it might have failed

FIX LOCATION: hooks/use-session-payments.ts ~156-170

STEPS:
1. Read hooks/use-session-payments.ts
2. Import showToast:
   ```typescript
   import { showToast } from '@/components/ui/toast';
   ```

3. Update each handler to show feedback:
   ```typescript
   const handleMarkPaid = useCallback(async (invoiceId: string) => {
     const result = await invoiceService.markAsPaid(invoiceId);
     if (result) {
       showToast('Marked as paid', 'success');
     } else {
       showToast('Failed to update payment', 'error');
     }
   }, []);

   const handleMarkUnpaid = useCallback(async (invoiceId: string) => {
     const result = await invoiceService.markAsUnpaid(invoiceId);
     if (result) {
       showToast('Moved back to owed', 'info');
     } else {
       showToast('Failed to update', 'error');
     }
   }, []);

   const handleWriteOff = useCallback(async (invoiceId: string) => {
     const result = await invoiceService.writeOff(invoiceId);
     if (result) {
       showToast('Written off', 'info');
     } else {
       showToast('Failed to write off', 'error');
     }
   }, []);

   const handleRestore = useCallback(async (invoiceId: string) => {
     const result = await invoiceService.restoreFromWriteOff(invoiceId);
     if (result) {
       showToast('Restored to owed', 'success');
     } else {
       showToast('Failed to restore', 'error');
     }
   }, []);
   ```

ACCEPTANCE CRITERIA:
- Toast shown after every reconciler action
- Success tone for mark-paid and restore
- Info tone for write-off and mark-unpaid
- Error tone when service returns null
- Toast messages are short and clear
```

---

## Sprint 1 Summary

**Files Modified**: 4 files
**Critical Issues Fixed**: 6
**Impact**: Reconciler wired to real booking data, actions give feedback, remind works

**Key Changes**:
1. CANCELLED bookings with cancellation fees appear in Owed tab
2. Invoice generation fetches real bookings (not just MOCK_BOOKINGS)
3. £0 bookings excluded from reconciler
4. Collection rate percentage added to summary card
5. Remind button uses native share sheet
6. All actions show toast feedback

**Verification Checklist**:
- [ ] Complete a session → appears in Owed tab
- [ ] Cancel a session (late) → cancellation fee appears in Owed tab
- [ ] Free trial sessions excluded from reconciler
- [ ] Mark paid → item moves to Paid tab + toast
- [ ] Write off → item moves to Written Off tab + toast
- [ ] Restore → item moves back to Owed tab + toast
- [ ] Remind → native share sheet opens with pre-filled message
- [ ] Collection rate shows correct percentage
- [ ] `npx tsc -p tsconfig.test.json` passes
