# Financial Sprint 3: Analytics Polish & Earnings Calculator

**Goal**: Fix the earnings analytics screens (revenue dashboard, earnings calculator) to show accurate data from the reconciler, add period filtering, and ensure all calculations use real invoice data instead of mock.

---

## Fix 1: Revenue dashboard uses mock data instead of real invoice totals

**File**: `app/analytics/revenue.tsx`
**Severity**: HIGH — analytics screen shows invented numbers

```
TASK: Wire revenue dashboard to real invoice data from invoiceService.

CURRENT BEHAVIOR:
- Revenue screen likely shows hardcoded or randomly generated figures
- Not connected to actual invoice/payment data
- Coach sees numbers that don't match their real earnings

FIX LOCATION: app/analytics/revenue.tsx

STEPS:
1. Read app/analytics/revenue.tsx to understand current data source
2. Check if it uses earnings-calculator-service.ts or hardcoded mock data
3. Replace mock data source with real invoice aggregation:

   ```typescript
   import { useAuth } from '@/hooks/use-auth';
   import { invoiceService } from '@/services/invoice-service';
   import { useScreen } from '@/hooks/use-screen';
   import { ok, err, serviceError } from '@/types/result';

   interface RevenueData {
     totalEarned: number;       // All PAID invoices
     totalOutstanding: number;  // All SENT/DRAFT invoices
     totalWrittenOff: number;   // All WRITTEN_OFF invoices
     invoiceCount: number;
     averagePerSession: number;
     periodBreakdown: Array<{
       month: string;
       earned: number;
       outstanding: number;
     }>;
   }

   const load = useCallback(async () => {
     try {
       const invoices = await invoiceService.getUserInvoices(coachId);

       const paid = invoices.filter((inv) => inv.status === 'PAID');
       const outstanding = invoices.filter((inv) => inv.status === 'SENT' || inv.status === 'DRAFT');
       const writtenOff = invoices.filter((inv) => inv.status === 'WRITTEN_OFF');

       const totalEarned = paid.reduce((sum, inv) => sum + inv.total, 0);
       const totalOutstanding = outstanding.reduce((sum, inv) => sum + inv.total, 0);
       const totalWrittenOff = writtenOff.reduce((sum, inv) => sum + inv.total, 0);
       const roundMoney = (n: number) => Math.round(n * 100) / 100;
       const averagePerSession = paid.length > 0
         ? roundMoney(totalEarned / paid.length)
         : 0;

       // Build monthly breakdown from paid invoices
       const monthMap = new Map<string, { earned: number; outstanding: number }>();
       for (const inv of [...paid, ...outstanding]) {
         const date = new Date(inv.sessionDate);
         const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
         const entry = monthMap.get(key) ?? { earned: 0, outstanding: 0 };
         if (inv.status === 'PAID') {
           entry.earned += inv.total;
         } else {
           entry.outstanding += inv.total;
         }
         monthMap.set(key, entry);
       }

       const periodBreakdown = Array.from(monthMap.entries())
         .sort(([a], [b]) => b.localeCompare(a))
         .map(([month, data]) => ({ month, ...data }));

       return ok<RevenueData>({
         totalEarned: roundMoney(totalEarned),
         totalOutstanding: roundMoney(totalOutstanding),
         totalWrittenOff: roundMoney(totalWrittenOff),
         invoiceCount: invoices.length,
         averagePerSession,
         periodBreakdown,
       });
     } catch {
       return err(serviceError('UNKNOWN', 'Failed to load revenue data'));
     }
   }, [coachId]);
   ```

4. Display using existing theme tokens:
   ```typescript
   <SurfaceCard>
     <Row gap="md">
       <Column style={{ flex: 1 }}>
         <ThemedText style={[Typography.caption, { color: colors.success }]}>Collected</ThemedText>
         <ThemedText style={Typography.heading}>{formatGBP(data.totalEarned)}</ThemedText>
       </Column>
       <Column style={{ flex: 1 }}>
         <ThemedText style={[Typography.caption, { color: colors.warning }]}>Outstanding</ThemedText>
         <ThemedText style={Typography.heading}>{formatGBP(data.totalOutstanding)}</ThemedText>
       </Column>
     </Row>
   </SurfaceCard>
   ```

ACCEPTANCE CRITERIA:
- Revenue screen shows real totals from invoice data
- Monthly breakdown computed from actual session dates
- Average per session calculated correctly (2 decimal places)
- All amounts in GBP with £ symbol
- Loading/error/empty states handled
```

---

## Fix 2: Earnings calculator rounds average to integer

**File**: `services/earnings/earnings-calculator-service.ts`
**Lines**: ~130 (average calculation)
**Severity**: MEDIUM — loses precision in analytics

```
TASK: Fix earnings average calculation to retain 2 decimal places.

CURRENT BEHAVIOR:
- Uses Math.round() which rounds to integer: £22.50 → £22
- Loses precision in analytics

FIX LOCATION: services/earnings/earnings-calculator-service.ts ~130

STEPS:
1. Read services/earnings/earnings-calculator-service.ts, locate average calculation
2. Find pattern:
   ```typescript
   const average = Math.round(totalEarnings / sessionCount);
   ```

3. Replace with money rounding:
   ```typescript
   const roundMoney = (amount: number): number => Math.round(amount * 100) / 100;
   const average = sessionCount > 0 ? roundMoney(totalEarnings / sessionCount) : 0;
   ```

4. Search for other integer rounding in same file:
   - Grep for `Math.round(` in the file
   - Verify each: session counts should be integers, money should use roundMoney

5. Apply same fix to any other money calculations in the file

ACCEPTANCE CRITERIA:
- Average earnings rounded to 2 decimals (not integer)
- £22.42, not £22
- All money calculations use roundMoney helper
- Session count calculations remain integers
```

---

## Fix 3: Invoice tax rounding — subtotal + tax ≠ total

**File**: `services/invoice-service.ts`
**Lines**: ~395-415 (generateInvoice tax calculation)
**Severity**: MEDIUM — financial accuracy

```
TASK: Fix tax calculation so invoice.amount + invoice.tax always equals invoice.total.

CURRENT BEHAVIOR:
- Lines 395-396: calculates net from total using taxRate
- Rounds amount and tax independently
- Rounding drift: amount + tax can differ from total by £0.01

FIX LOCATION: services/invoice-service.ts ~395-415

STEPS:
1. Read services/invoice-service.ts, locate tax calculation in generateInvoice
2. Current logic:
   ```typescript
   const netAmount = bookingData.amount / (1 + taxRate / 100);
   const taxAmount = bookingData.amount - netAmount;
   ```

3. Fix: derive tax as difference to guarantee sum matches:
   ```typescript
   const roundMoney = (n: number): number => Math.round(n * 100) / 100;
   const total = bookingData.amount; // This is the source of truth
   const netAmount = roundMoney(total / (1 + taxRate / 100));
   const taxAmount = roundMoney(total - netAmount); // Derived = guaranteed to sum
   ```

4. Verify in the invoice object:
   ```typescript
   const newInvoice: Invoice = {
     // ...
     amount: netAmount,      // Net (ex-VAT)
     tax: taxAmount,         // VAT
     total: netAmount + taxAmount, // Must equal original total
     // ...
   };

   // Safety check
   if (roundMoney(netAmount + taxAmount) !== roundMoney(total)) {
     logger.warn('Tax rounding drift', { netAmount, taxAmount, total });
     // Adjust tax to compensate
     newInvoice.tax = roundMoney(total - netAmount);
     newInvoice.total = total;
   }
   ```

ACCEPTANCE CRITERIA:
- invoice.amount + invoice.tax = invoice.total always
- No rounding drift across multiple invoices
- roundMoney applied consistently
- Tax calculated as difference (total - net) to avoid drift
```

---

## Fix 4: Period filter missing from earnings screen

**File**: `app/earnings.tsx`
**Severity**: MEDIUM — coach can't filter by time period

```
TASK: Add period filter chips (This Week / This Month / All Time) to earnings screen.

FIX LOCATION: app/earnings.tsx

STEPS:
1. Read app/earnings.tsx
2. Add period filter state:
   ```typescript
   type Period = 'week' | 'month' | 'all';
   const [period, setPeriod] = useState<Period>('all');
   ```

3. Add period filter chips below the tab row:
   ```typescript
   const PERIODS: { key: Period; label: string }[] = [
     { key: 'week', label: 'This Week' },
     { key: 'month', label: 'This Month' },
     { key: 'all', label: 'All Time' },
   ];

   // In listHeader, after tab row:
   <Row gap="xs" style={{ marginTop: Spacing.xs }}>
     {PERIODS.map((p) => {
       const isActive = period === p.key;
       return (
         <Clickable key={p.key} onPress={() => setPeriod(p.key)}>
           <View
             style={[
               styles.periodChip,
               {
                 backgroundColor: isActive ? withAlpha(colors.foreground, 0.06) : 'transparent',
               },
             ]}
           >
             <ThemedText
               style={{
                 ...Typography.caption,
                 color: isActive ? colors.foreground : colors.muted,
                 fontWeight: isActive ? '600' : '400',
               }}
             >
               {p.label}
             </ThemedText>
           </View>
         </Clickable>
       );
     })}
   </Row>
   ```

4. Filter activeData by period:
   ```typescript
   const filteredData = useMemo(() => {
     if (period === 'all') return activeData;

     const now = new Date();
     const startOfWeek = new Date(now);
     startOfWeek.setDate(now.getDate() - now.getDay());
     startOfWeek.setHours(0, 0, 0, 0);

     const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

     const cutoff = period === 'week' ? startOfWeek : startOfMonth;

     return activeData.filter(
       (item) => new Date(item.booking.scheduledAt).getTime() >= cutoff.getTime()
     );
   }, [activeData, period]);
   ```

5. Pass filteredData to FlatList instead of activeData

6. Add periodChip style:
   ```typescript
   periodChip: {
     paddingHorizontal: Spacing.sm,
     paddingVertical: Spacing.xxs,
     borderRadius: Radii.pill,
   },
   ```

ACCEPTANCE CRITERIA:
- Three period filter chips below tab row
- "All Time" selected by default
- "This Week" filters to current week sessions
- "This Month" filters to current month sessions
- Summary card totals update based on filtered data
- Filters persist while switching between tabs
```

---

## Fix 5: Package pricing — perSessionPrice × sessionCount ≠ totalPrice

**File**: `services/package-service.ts`
**Severity**: MEDIUM — misleading pricing display

```
TASK: Ensure package total is always derived from perSessionPrice × sessionCount.

STEPS:
1. Read services/package-service.ts, locate package creation/calculation logic
2. Search for totalPrice calculation or assignment
3. Enforce derivation:

   ```typescript
   const roundMoney = (n: number): number => Math.round(n * 100) / 100;

   // In createPackage or wherever package is assembled:
   const totalPrice = roundMoney(input.pricePerSession * input.sessionCount);

   const pkg = {
     ...input,
     totalPrice,
     perSessionPrice: input.pricePerSession,
   };
   ```

4. If discount is involved:
   ```typescript
   const discountAmount = input.discountPercent
     ? roundMoney(totalPrice * (input.discountPercent / 100))
     : 0;
   const finalPrice = roundMoney(totalPrice - discountAmount);

   const pkg = {
     ...input,
     totalPrice: finalPrice,
     originalPrice: totalPrice,
     perSessionPrice: input.pricePerSession,
     discountPercent: input.discountPercent ?? 0,
   };
   ```

5. Add validation:
   ```typescript
   if (input.discountPercent !== undefined) {
     if (input.discountPercent < 0 || input.discountPercent > 100) {
       return err({
         code: 'VALIDATION' as const,
         message: 'Discount must be between 0% and 100%'
       });
     }
   }
   ```

ACCEPTANCE CRITERIA:
- totalPrice = roundMoney(perSessionPrice × sessionCount) always
- Discount validated 0-100%
- Negative prices impossible
- perSessionPrice stored alongside total for verification
```

---

## Fix 6: Earnings screen subtitle says "Cash reconciliation" — add dynamic context

**File**: `app/earnings.tsx`
**Lines**: ~152
**Severity**: LOW — opportunity for better coaching UX

```
TASK: Make earnings screen subtitle dynamic based on current state.

CURRENT BEHAVIOR:
- Line 152: `<ScreenHeader title="Earnings" subtitle="Cash reconciliation" />`
- Static subtitle regardless of state

FIX LOCATION: app/earnings.tsx ~152

STEPS:
1. Read app/earnings.tsx
2. Replace static subtitle with dynamic one:

   ```typescript
   const subtitle = useMemo(() => {
     if (overdueCount > 0) {
       return `${overdueCount} overdue — chase payments`;
     }
     if (unpaidCount > 0) {
       return `\u00A3${totalOwed.toFixed(2)} outstanding`;
     }
     if (paidCount > 0) {
       return `\u00A3${totalCollected.toFixed(2)} collected`;
     }
     return 'Track your session payments';
   }, [overdueCount, unpaidCount, paidCount, totalOwed, totalCollected]);

   // In listHeader:
   <ScreenHeader title="Earnings" subtitle={subtitle} />
   ```

ACCEPTANCE CRITERIA:
- Subtitle shows overdue count when overdue items exist
- Shows outstanding amount when items owed
- Shows collected amount when all caught up
- Falls back to generic when no data
- Updates reactively
```

---

## Sprint 3 Summary

**Files Modified**: 5 files
**Issues Fixed**: 6
**Impact**: Analytics accuracy, period filtering, pricing integrity

**Key Changes**:
1. Revenue dashboard wired to real invoice data
2. Earnings average retains decimal precision
3. Invoice tax rounding guaranteed correct
4. Period filter (week/month/all) on earnings screen
5. Package pricing integrity enforced
6. Dynamic earnings subtitle based on state

**Verification Checklist**:
- [ ] Revenue dashboard shows real totals from invoices
- [ ] Monthly breakdown computed correctly
- [ ] Average per session shows 2 decimal places
- [ ] invoice.amount + invoice.tax = invoice.total
- [ ] Period filter chips work (week/month/all)
- [ ] Package perSession × count = total
- [ ] Discount validated 0-100%
- [ ] Earnings subtitle updates dynamically
- [ ] All amounts in GBP with £
- [ ] `npx tsc -p tsconfig.test.json` passes
