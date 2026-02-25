# Financial Sprint 4: Wallet Cruft Cleanup & Polish

**Goal**: Strip dead wallet code the app doesn't need (no real money flows yet), decouple packages from wallet, clean up "(mock)" labels, and add explanatory UI for the write-off concept.

---

## Fix 1: Remove wallet service references from active code paths

**Files**: Multiple
**Severity**: HIGH — dead code creates confusion and maintenance burden

```
TASK: Audit all imports of wallet services and remove references from active (non-wallet) code paths.

CURRENT STATE:
- services/wallet/ has 5 files: index.ts, wallet-crud-service.ts, wallet-payment-service.ts, wallet-transaction-service.ts, wallet-utils-service.ts
- No real money flows — app uses the reconciler (mark paid / write off) not wallets
- Some services may import wallet for credit/debit that never runs

STEPS:
1. Search for wallet imports outside the wallet directory:
   - Grep: pattern "from.*wallet", glob "*.{ts,tsx}", exclude path "services/wallet/"

2. For each file found:
   a. Read the file
   b. Determine if the wallet import is actually used in a live code path
   c. If used: replace with a no-op or remove the call
   d. If unused: remove the import

3. Files likely importing wallet (from previous audit):
   - services/invoice-service.ts — check if markAsPaid credits wallet (it doesn't currently, but sprint 1 old version suggested it)
   - services/recurring-booking-service.ts — may reference wallet for payment
   - services/referral-service.ts — referral bonus may reference wallet credit
   - services/package-service.ts — package purchase may reference wallet debit

4. For each: remove wallet dependency. The reconciler model is:
   - Session completes → invoice auto-generated → coach marks paid/unpaid
   - NO wallet credit/debit needed
   - NO balance tracking needed

5. Do NOT delete the wallet service files yet (they may be referenced by tests and route screens). Just decouple them from core flows.

ACCEPTANCE CRITERIA:
- No wallet service imported outside services/wallet/ directory (except wallet screens)
- invoice-service.ts has zero wallet references
- recurring-booking-service.ts has zero wallet references
- referral-service.ts has zero wallet references
- package-service.ts has zero wallet references
- Core booking → invoice → reconciler flow has no wallet dependency
- npx tsc -p tsconfig.test.json passes
```

---

## Fix 2: Package purchase flow references wallet balance — replace with reconciler

**File**: `services/package-service.ts`
**Severity**: MEDIUM — dead code path

```
TASK: Remove wallet-balance checks from package purchase and replace with reconciler-compatible flow.

CURRENT BEHAVIOR:
- purchasePackage may check wallet balance before allowing purchase
- No wallet exists — check always fails or is bypassed

FIX LOCATION: services/package-service.ts

STEPS:
1. Read services/package-service.ts
2. Locate purchasePackage method
3. Find any wallet balance checks:
   ```typescript
   // REMOVE: wallet balance check
   const walletResult = await walletService.getBalance(userId);
   if (walletResult.data.balance < pkg.totalPrice) { ... }
   ```

4. Replace with simple invoice generation:
   ```typescript
   async purchasePackage(packageId: string, userId: string): Promise<Result<PackagePurchase, ServiceError>> {
     const pkgResult = await this.getById(packageId);
     if (!pkgResult.success) return err(pkgResult.error);

     const pkg = pkgResult.data;

     if (!pkg.isActive) {
       return err({
         code: 'VALIDATION' as const,
         message: 'This package is no longer available'
       });
     }

     // Create purchase record (payment tracked via reconciler, not wallet)
     const purchase: PackagePurchase = {
       id: generateId('pkg_purchase'),
       packageId,
       userId,
       sessionsRemaining: pkg.sessionCount,
       totalPrice: pkg.totalPrice,
       status: 'ACTIVE',
       purchasedAt: new Date().toISOString(),
     };

     // Save purchase
     await this.savePurchase(purchase);

     // Generate invoice for reconciler tracking
     await invoiceService.generateInvoice({
       bookingId: purchase.id, // Use purchase ID as reference
       notes: `Package: ${pkg.name} (${pkg.sessionCount} sessions)`,
     });

     logger.info('package_purchased', { packageId, userId, total: pkg.totalPrice });
     emitTyped(ServiceEvents.PACKAGE_PURCHASED, { packageId, userId });

     return ok(purchase);
   }
   ```

ACCEPTANCE CRITERIA:
- Package purchase creates purchase record without wallet check
- Invoice generated for reconciler tracking
- Coach sees package purchase in Owed tab
- No wallet import in package-service.ts
```

---

## Fix 3: Remove "(mock)" labels from all payment displays

**Severity**: MEDIUM — confusing for users

```
TASK: Find and remove all "(mock)" text from user-facing payment and financial screens.

STEPS:
1. Search for "(mock)" in all components and screens:
   - Grep: pattern "\(mock\)|mock\)|Mock vault", glob "*.{ts,tsx}"

2. For each occurrence:
   a. Read the file
   b. If it's a price display: remove "(mock)" entirely
   c. If it's a dev warning: wrap in `__DEV__` check
   d. If it's a placeholder: replace with real content

3. Common patterns to fix:
   ```typescript
   // BEFORE
   <ThemedText>£{booking.price} (mock)</ThemedText>

   // AFTER
   <ThemedText>£{booking.price?.toFixed(2)}</ThemedText>
   ```

4. For "Mock vault" in payment screens:
   ```typescript
   // BEFORE
   <ThemedText>Mock vault - cards not stored</ThemedText>

   // AFTER — show only in dev mode
   {__DEV__ && (
     <Row gap="xs" align="center">
       <Ionicons name="information-circle" size={16} color={colors.warning} />
       <ThemedText style={[Typography.caption, { color: colors.warning }]}>
         Dev mode: Payments are simulated
       </ThemedText>
     </Row>
   )}
   ```

5. Also search for "mock" in booking-info-cards.tsx — known to have this issue

ACCEPTANCE CRITERIA:
- Zero "(mock)" in user-facing text (grep returns only __DEV__ guarded or test files)
- Dev warnings only shown in __DEV__ mode
- Payment amounts show clean £X.XX format
- No confusion about whether money is real
```

---

## Fix 4: "Written off" term unexplained — coaches don't understand it

**File**: `components/earnings/payment-summary-card.tsx`
**Lines**: ~65-72
**Severity**: LOW — confusing terminology

```
TASK: Add explanation for "written off" and consider renaming to "Uncollected".

FIX LOCATION: components/earnings/payment-summary-card.tsx

STEPS:
1. Read components/earnings/payment-summary-card.tsx
2. Find the written-off row (line 65-72)
3. Add info tooltip using a pressable icon:

   ```typescript
   import { useState, useCallback } from 'react';
   import { Alert } from 'react-native';
   import { Clickable } from '@/components/primitives/clickable';

   // Inside the component:
   const handleWriteOffInfo = useCallback(() => {
     Alert.alert(
       'What does "written off" mean?',
       'Written-off sessions are payments you\'ve decided not to chase. Common reasons:\n\n' +
         '• Athlete cancelled last minute\n' +
         '• Payment was waived as a favour\n' +
         '• Unable to collect after multiple reminders\n\n' +
         'You can restore a written-off session back to "owed" at any time.',
       [{ text: 'Got it' }]
     );
   }, []);
   ```

4. Add info icon next to "written off" text:
   ```typescript
   {writtenOffCount > 0 && (
     <Clickable onPress={handleWriteOffInfo} accessibilityLabel="What does written off mean?">
       <Row align="center" gap="xs" style={styles.writtenOffRow}>
         <Ionicons name="close-circle-outline" size={14} color={colors.muted} />
         <ThemedText style={[Typography.caption, { color: colors.muted }]}>
           {formatGBP(totalWrittenOff)} written off ({writtenOffCount} {writtenOffCount === 1 ? 'session' : 'sessions'})
         </ThemedText>
         <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
       </Row>
     </Clickable>
   )}
   ```

5. Also update the "Written Off" tab label in earnings.tsx to have a tooltip:
   - First-time coaches see a one-time hint on the Written Off tab
   - Use a simple Alert on first tap if no items exist

ACCEPTANCE CRITERIA:
- Info icon on written-off row
- Tapping shows explanation alert
- Explanation covers 3 common scenarios
- Mentions restore capability
- Works on both iOS and Android
```

---

## Fix 5: Invoice getStatusColor uses hardcoded hex colors

**File**: `services/invoice-service.ts`
**Lines**: ~815-824 (getStatusColor method)
**Severity**: LOW — violates theming rules

```
TASK: Remove getStatusColor method or replace with theme-aware approach.

CURRENT BEHAVIOR:
- Line 815-824: returns hardcoded hex colors for each status
- Doesn't respect dark mode or theme
- Violates CLAUDE.md: "NEVER hardcode colors"

FIX LOCATION: services/invoice-service.ts ~815-824

STEPS:
1. Read services/invoice-service.ts lines 815-824
2. The getStatusColor method returns hardcoded colors:
   ```typescript
   getStatusColor(status: InvoiceStatus): string {
     const colors: Record<InvoiceStatus, string> = {
       DRAFT: '#6B7280',
       SENT: '#2563EB',
       PAID: '#059669',
       VOID: '#DC2626',
       WRITTEN_OFF: '#9CA3AF',
     };
     return colors[status];
   }
   ```

3. OPTIONS:
   a. Remove method entirely — components should use theme colors directly
   b. Replace with a mapping function that takes theme colors as input

4. RECOMMENDED: Option A — remove and let components handle it:
   ```typescript
   // DELETE getStatusColor method entirely

   // In components that need status colors, use theme:
   // const statusColor = {
   //   DRAFT: colors.muted,
   //   SENT: colors.tint,
   //   PAID: colors.success,
   //   VOID: colors.error,
   //   WRITTEN_OFF: colors.muted,
   // }[invoice.status];
   ```

5. Search for getStatusColor usage:
   - Grep: pattern "getStatusColor", glob "*.{ts,tsx}"
   - Replace each call site with inline theme mapping

6. If multiple components use it, create a hook:
   ```typescript
   // In hooks/use-invoice-status-color.ts (only if 3+ call sites)
   export function useInvoiceStatusColor(status: InvoiceStatus): string {
     const { colors } = useTheme();
     const map: Record<InvoiceStatus, string> = {
       DRAFT: colors.muted,
       SENT: colors.tint,
       PAID: colors.success,
       VOID: colors.error,
       WRITTEN_OFF: colors.muted,
     };
     return map[status];
   }
   ```

ACCEPTANCE CRITERIA:
- No hardcoded hex colors in invoice-service.ts
- Status colors use theme tokens
- Dark mode respected
- All call sites updated
```

---

## Fix 6: Cancellation policy screen — unclear "24/12 hours" text

**File**: `app/settings/cancellation-policy.tsx`
**Severity**: LOW — coach doesn't understand the policy they're setting

```
TASK: Add clear explainer text to cancellation policy screen.

FIX LOCATION: app/settings/cancellation-policy.tsx

STEPS:
1. Read app/settings/cancellation-policy.tsx
2. Find where the tier descriptions are shown
3. Add concrete example for each tier:

   ```typescript
   // Add below each tier description:
   const getExample = (hours: number): string => {
     if (hours === 24) {
       return 'Example: For a 2pm Monday session, cancel by 2pm Sunday for a full refund.';
     }
     if (hours === 48) {
       return 'Example: For a 2pm Monday session, cancel by 2pm Saturday for a full refund.';
     }
     return `Example: Cancel at least ${hours} hours before the session starts.`;
   };
   ```

4. Display example below tier description:
   ```typescript
   <ThemedText style={[Typography.caption, { color: colors.muted, fontStyle: 'italic' }]}>
     {getExample(tier.hours)}
   </ThemedText>
   ```

5. If the policy is editable (custom tier), show live preview:
   ```typescript
   {selectedTier === 'custom' && customHours && (
     <SurfaceCard>
       <ThemedText style={[Typography.caption, { color: colors.muted }]}>
         Preview: Athletes must cancel at least {customHours} hours before the session for a {customRefund}% refund.
       </ThemedText>
     </SurfaceCard>
   )}
   ```

ACCEPTANCE CRITERIA:
- Each tier has a concrete example with day/time
- Custom tier shows live preview as coach types
- Explainer uses plain English, not jargon
- Coach understands policy before saving
```

---

## Sprint 4 Summary

**Files Modified**: 6+ files
**Issues Fixed**: 6
**Impact**: Dead code removed, UX clarity improved, theme compliance

**Key Changes**:
1. Wallet services decoupled from core flows (invoice, booking, package, referral)
2. Package purchase works without wallet balance check
3. "(mock)" labels removed from production views
4. "Written off" explained with info tooltip
5. Invoice status colors use theme tokens (not hardcoded hex)
6. Cancellation policy has clear examples

**Verification Checklist**:
- [ ] No wallet imports outside wallet/ directory (except wallet screens)
- [ ] Package purchase creates invoice without wallet check
- [ ] Zero "(mock)" in user-facing text
- [ ] Written-off info icon works and shows explanation
- [ ] Invoice status colors respect dark mode
- [ ] Cancellation policy has concrete examples
- [ ] npx tsc -p tsconfig.test.json passes
- [ ] Core reconciler flow unchanged: session → invoice → mark paid/write off

**Post-Sprint**:
- Consider deleting wallet service files entirely if no screens reference them
- Consider deleting components/payment/ (wallet UI) if unused
- Consider adding export/CSV for reconciler data
- Consider parent-facing invoice view (what they owe)
