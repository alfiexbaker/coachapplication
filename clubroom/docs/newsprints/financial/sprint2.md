# Financial Sprint 2: Overdue Detection, Reminders & GBP Consistency

**Goal**: Add overdue detection to the reconciler (invoices past due date), auto-sort owed items by urgency, fix all remaining USD/GBP inconsistencies, and add batch reminder capability.

---

## Fix 1: No OVERDUE detection — invoices past dueDate still show as "Owed"

**File**: `hooks/use-session-payments.ts`
**Lines**: ~104-114 (status bucketing logic)
**Severity**: CRITICAL — coach can't distinguish stale debt from recent owed

```
TASK: Split the "Owed" tab into overdue (past dueDate) and pending (not yet due), with overdue items sorted first and visually distinct.

CURRENT BEHAVIOR:
- Line 105-114: status bucketing is PAID / WRITTEN_OFF / else (owed)
- No concept of overdue — everything unpaid lumps together
- Coach can't see which payments are most urgent

FIX LOCATION: hooks/use-session-payments.ts ~104-114

STEPS:
1. Read hooks/use-session-payments.ts
2. Add overdue detection in the bucketing logic:

   ```typescript
   const now = Date.now();

   if (invoice.status === 'PAID') {
     paid.push(item);
     totalCollected += invoice.total;
   } else if (invoice.status === 'WRITTEN_OFF') {
     writtenOff.push(item);
     totalWrittenOff += invoice.total;
   } else {
     // Check if overdue (past dueDate or > 14 days since session with no dueDate)
     const dueDate = invoice.dueDate
       ? new Date(invoice.dueDate).getTime()
       : new Date(booking.scheduledAt).getTime() + 14 * 24 * 60 * 60 * 1000;
     const isOverdue = now > dueDate;

     unpaid.push({ ...item, isOverdue });
     totalOwed += invoice.total;
     if (isOverdue) overdueCount++;
   }
   ```

3. Update the SessionPaymentItem type to include overdue flag:
   ```typescript
   export interface SessionPaymentItem {
     booking: Booking;
     invoice: Invoice;
     athleteName: string;
     isOverdue?: boolean;
   }
   ```

4. Add overdueCount to the returned data:
   ```typescript
   interface SessionPaymentsData {
     unpaid: SessionPaymentItem[];
     paid: SessionPaymentItem[];
     writtenOff: SessionPaymentItem[];
     totalOwed: number;
     totalCollected: number;
     totalWrittenOff: number;
     overdueCount: number;
   }
   ```

5. Sort unpaid: overdue first, then by date descending:
   ```typescript
   unpaid.sort((a, b) => {
     // Overdue items first
     if (a.isOverdue && !b.isOverdue) return -1;
     if (!a.isOverdue && b.isOverdue) return 1;
     // Then by date (most recent first)
     return new Date(b.booking.scheduledAt).getTime() - new Date(a.booking.scheduledAt).getTime();
   });
   ```

6. Expose overdueCount from hook return:
   ```typescript
   const overdueCount = data?.overdueCount ?? 0;
   // Add to return object
   ```

ACCEPTANCE CRITERIA:
- Invoices past dueDate flagged as overdue
- Invoices with no dueDate become overdue 14 days after session date
- Overdue items sorted to top of Owed tab
- overdueCount available for UI badges
- Existing paid/written-off logic unchanged
```

---

## Fix 2: SessionPaymentItem doesn't show overdue visual indicator

**File**: `components/earnings/session-payment-item.tsx`
**Lines**: ~126-135 (icon/color logic)
**Severity**: HIGH — overdue items look identical to recent owed items

```
TASK: Add red overdue indicator and "X days overdue" badge to overdue items in the Owed tab.

CURRENT BEHAVIOR:
- Line 126-135: icon for 'owed' tab is always `time-outline` with `colors.warning`
- No distinction between a session owed from yesterday vs 30 days ago

FIX LOCATION: components/earnings/session-payment-item.tsx ~126-135

STEPS:
1. Read components/earnings/session-payment-item.tsx
2. Update the icon/color logic:

   ```typescript
   const isOverdue = item.isOverdue ?? false;

   const iconName = tab === 'paid'
     ? 'checkmark-circle'
     : tab === 'written_off'
       ? 'close-circle-outline'
       : isOverdue
         ? 'alert-circle'
         : 'time-outline';

   const iconColor = tab === 'paid'
     ? colors.success
     : tab === 'written_off'
       ? colors.muted
       : isOverdue
         ? colors.error
         : colors.warning;
   ```

3. Add days-overdue badge below the date line for overdue items:
   ```typescript
   // Calculate days overdue
   const daysOverdue = useMemo(() => {
     if (!isOverdue || !invoice.dueDate) return 0;
     const due = new Date(invoice.dueDate).getTime();
     return Math.floor((Date.now() - due) / (1000 * 60 * 60 * 24));
   }, [isOverdue, invoice.dueDate]);

   // In the render, after the date/time line:
   {isOverdue && daysOverdue > 0 && (
     <View style={[styles.overdueBadge, { backgroundColor: withAlpha(colors.error, 0.08) }]}>
       <ThemedText style={[Typography.micro, { color: colors.error, fontWeight: '700' }]}>
         {daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue
       </ThemedText>
     </View>
   )}
   ```

4. Add overdueBadge to styles:
   ```typescript
   overdueBadge: {
     paddingHorizontal: Spacing.xs,
     paddingVertical: Spacing.micro,
     borderRadius: Radii.sm,
     alignSelf: 'flex-start',
   },
   ```

ACCEPTANCE CRITERIA:
- Overdue items show red alert-circle icon (not amber time-outline)
- "X days overdue" badge shown in red below date
- Non-overdue owed items unchanged (amber time-outline)
- Badge calculates days from invoice.dueDate
- Memoized to avoid re-renders
```

---

## Fix 3: Owed tab badge doesn't show overdue count

**File**: `app/earnings.tsx`
**Lines**: ~163-191 (tab row)
**Severity**: MEDIUM — coach can't see urgency at a glance

```
TASK: Add overdue count indicator to the Owed tab chip.

CURRENT BEHAVIOR:
- Tab shows "Owed (3)" — total count
- No distinction for urgent overdue items

FIX LOCATION: app/earnings.tsx ~163-191

STEPS:
1. Read app/earnings.tsx
2. Import overdueCount from hook:
   ```typescript
   const { ..., overdueCount } = useSessionPayments();
   ```

3. Update the Owed tab chip to show overdue:
   ```typescript
   <ThemedText
     style={{
       color: isActive ? colors.tint : colors.muted,
       ...Typography.small,
       fontWeight: isActive ? '600' : '500',
     }}
   >
     {tab.label}{count > 0 ? ` (${count})` : ''}
   </ThemedText>
   {tab.key === 'owed' && overdueCount > 0 && (
     <View style={[styles.overdueDot, { backgroundColor: colors.error }]}>
       <ThemedText style={[Typography.micro, { color: '#fff', fontWeight: '700' }]}>
         {overdueCount}
       </ThemedText>
     </View>
   )}
   ```

4. Add overdueDot style:
   ```typescript
   overdueDot: {
     minWidth: 18,
     height: 18,
     borderRadius: 9,
     alignItems: 'center',
     justifyContent: 'center',
     paddingHorizontal: Spacing.xxs,
     marginLeft: Spacing.xxs,
   },
   ```

ACCEPTANCE CRITERIA:
- Red badge with overdue count shown on Owed tab chip
- Only shown when overdueCount > 0
- Badge disappears when all overdue items resolved
- Counts update reactively
```

---

## Fix 4: priceUsd field used in 33+ files — rename to price

**Severity**: HIGH — systemic currency confusion

```
TASK: Rename all priceUsd, minPriceUsd, maxPriceUsd fields to price, minPrice, maxPrice across the codebase.

STEPS:
1. Search for all USD field references:
   - Use Grep: pattern "priceUsd|minPriceUsd|maxPriceUsd|minUsd|maxUsd", glob "*.{ts,tsx}"

2. Start with type definitions:
   - constants/session-types.ts — rename priceUsd → price in interfaces
   - Let TypeScript errors cascade to find all dependent files

3. For each file:
   a. Read file
   b. Replace priceUsd → price (or minPriceUsd → minPrice, etc.)
   c. Use Edit tool with replace_all: true for consistency

4. PRIORITY ORDER:
   a. Type definitions (constants/session-types.ts, types/*.ts)
   b. Services (services/*.ts)
   c. Hooks (hooks/*.ts)
   d. Components (components/**/*.tsx)
   e. Screens (app/**/*.tsx)
   f. Tests (__tests__/**/*.ts)

5. Add data migration for persisted data:
   ```typescript
   // In any service that reads session/booking data from storage:
   function migratePrice<T extends Record<string, unknown>>(item: T): T {
     if ('priceUsd' in item && !('price' in item)) {
       const migrated = { ...item, price: item.priceUsd };
       delete (migrated as Record<string, unknown>).priceUsd;
       return migrated as T;
     }
     return item;
   }
   ```

6. Apply migration in booking service and session template service loadFromStorage methods

7. Run type check after each batch:
   ```bash
   npx tsc -p tsconfig.test.json
   ```

ACCEPTANCE CRITERIA:
- Zero occurrences of "Usd" in field names (grep returns empty)
- All types use price / minPrice / maxPrice
- npx tsc -p tsconfig.test.json passes
- Prices still display with £ symbol
- Data migration handles old persisted priceUsd fields gracefully
```

---

## Fix 5: formatPrice / currency display inconsistencies

**Severity**: MEDIUM — some screens show $ or "GBP" text instead of £

```
TASK: Audit and fix all currency display to consistently use £ symbol.

STEPS:
1. Search for hardcoded "$" in display strings:
   - Grep: pattern "\\\$\\{|\\$[0-9]|USD|formatPrice.*USD", glob "*.{ts,tsx}"

2. Search for "GBP" string in user-facing text:
   - Grep: pattern '"GBP"|GBP`', glob "*.{ts,tsx}"

3. Check for formatPrice utility:
   - Grep: pattern "formatPrice|formatCurrency|formatMoney", glob "*.{ts,tsx}"
   - If it exists, ensure it defaults to GBP with £ symbol
   - If it doesn't exist, create one in utils/format-price.ts:

   ```typescript
   /**
    * Format a number as GBP currency string.
    * Always uses £ symbol — app is UK-only.
    */
   export const formatPrice = (amount: number): string =>
     `\u00A3${amount.toFixed(2)}`;
   ```

4. Replace all inline currency formatting:
   - `${amount} GBP` → formatPrice(amount)
   - `$${amount}` → formatPrice(amount)
   - Inconsistent `.toFixed()` calls → formatPrice(amount)

5. Check invoice-service.ts line 793-796:
   - Already has formatAmount using £ symbol — good
   - Ensure all invoice displays use it

ACCEPTANCE CRITERIA:
- Zero "$" symbols in user-facing text
- Zero "GBP" text in user-facing displays
- All prices use £ symbol
- Consistent 2 decimal places
- formatPrice utility available for new code
```

---

## Fix 6: Batch "Remind All" for overdue payments

**File**: `app/earnings.tsx`
**Severity**: MEDIUM — coach has to remind one by one

```
TASK: Add a "Remind All Overdue" button that opens share sheet with consolidated reminder for all overdue items.

FIX LOCATION: app/earnings.tsx

STEPS:
1. Read app/earnings.tsx
2. Add a batch remind handler:
   ```typescript
   import { Share } from 'react-native';

   const handleRemindAllOverdue = useCallback(async () => {
     const overdueItems = unpaidSessions.filter((s) => s.isOverdue);
     if (overdueItems.length === 0) return;

     const totalOverdue = overdueItems.reduce((sum, item) => sum + item.invoice.total, 0);
     const itemList = overdueItems
       .map((item) => {
         const date = new Date(item.booking.scheduledAt).toLocaleDateString('en-GB', {
           day: 'numeric',
           month: 'short',
         });
         return `- ${item.athleteName} (${date}): \u00A3${item.invoice.total.toFixed(2)}`;
       })
       .join('\n');

     const message = `Hi! Just a friendly reminder about outstanding payments totalling \u00A3${totalOverdue.toFixed(2)}:\n\n${itemList}\n\nPlease let me know if you have any questions!`;

     try {
       await Share.share({ message });
     } catch {
       // User cancelled
     }
   }, [unpaidSessions]);
   ```

3. Add button in the list header, below the tab row, when overdue items exist:
   ```typescript
   {activeTab === 'owed' && overdueCount > 0 && (
     <Row style={{ marginTop: Spacing.xs }}>
       <Button
         onPress={handleRemindAllOverdue}
         variant="outline"
         style={{ minHeight: Components.buttonCompact.height }}
         accessibilityLabel={`Send reminder for ${overdueCount} overdue payments`}
       >
         Remind All Overdue ({overdueCount})
       </Button>
     </Row>
   )}
   ```

4. Import Button and Components:
   ```typescript
   import { Button } from '@/components/primitives/button';
   import { Components } from '@/constants/theme';
   ```

ACCEPTANCE CRITERIA:
- "Remind All Overdue" button shown only on Owed tab when overdue items exist
- Opens share sheet with consolidated list of overdue items
- Includes total amount and per-item breakdown
- All amounts in GBP with £ symbol
- Button hidden when no overdue items
```

---

## Sprint 2 Summary

**Files Modified**: 5 files
**Critical Issues Fixed**: 6
**Impact**: Overdue detection, visual urgency, GBP consistency, batch reminders

**Key Changes**:
1. Overdue detection based on dueDate (or 14 days after session)
2. Red visual indicators for overdue items
3. Overdue count badge on Owed tab
4. priceUsd → price rename across codebase
5. Currency display audit — all £, no $
6. Batch "Remind All Overdue" button

**Verification Checklist**:
- [ ] Invoices past dueDate flagged as overdue in Owed tab
- [ ] Overdue items sorted to top with red badge
- [ ] Owed tab shows overdue count dot
- [ ] priceUsd fully removed from codebase
- [ ] All prices display with £ symbol
- [ ] "Remind All Overdue" opens share sheet
- [ ] `npx tsc -p tsconfig.test.json` passes
