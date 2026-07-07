/**
 * MarkPaidButton — Records a manual receipt, marks the invoice as paid, and emits event.
 *
 * Accepts either an invoiceId directly, or a bookingId (looks up the invoice).
 */

import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import {
  invoiceService,
  type ManualReceiptMethod,
} from '@/services/invoice-service';
import type { Invoice } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

interface MarkPaidButtonProps {
  invoiceId?: string;
  bookingId?: string;
  onSuccess?: () => void;
  variant?: 'primary' | 'compact';
}

const MANUAL_PAYMENT_OPTIONS: Array<{ id: ManualReceiptMethod; label: string }> = [
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'cash', label: 'Cash' },
  { id: 'other', label: 'Other' },
];

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

async function resolveTargetInvoice(
  invoiceId?: string,
  bookingId?: string,
): Promise<Invoice | null> {
  if (invoiceId) {
    const invoice = await invoiceService.getInvoiceById(invoiceId);
    if (invoice) return invoice;
  }

  if (bookingId) {
    return invoiceService.getInvoiceByBookingId(bookingId);
  }

  return null;
}

function MarkPaidButtonInner({ invoiceId, bookingId, onSuccess, variant = 'primary' }: MarkPaidButtonProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) return;
    if (!invoiceId && !bookingId) {
      uiFeedback.showToast('No invoice found for this booking.');
      return;
    }

    const confirmed = await uiFeedback.confirm({
      title: 'Record payment received',
      message: 'Confirm this invoice has been paid?',
      confirmText: 'Choose method',
    });
    if (!confirmed) return;

    setLoading(true);

    let invoiceToMark: Invoice | null = null;
    try {
      invoiceToMark = await resolveTargetInvoice(invoiceId, bookingId);
    } catch {
      setLoading(false);
      uiFeedback.showToast('Could not load invoice. Please try again.', 'error');
      return;
    }
    setLoading(false);

    if (!invoiceToMark) {
      uiFeedback.showToast('No invoice found for this booking.');
      return;
    }

    const method = await uiFeedback.choose({
      title: 'Record payment received',
      message: `How did the \u00A3${invoiceToMark.total.toFixed(2)} payment arrive?`,
      options: MANUAL_PAYMENT_OPTIONS,
      cancelText: 'Cancel',
    });
    if (!method) return;

    setLoading(true);

    await runAsyncTryCatchFinally(async () => {
      const result = await invoiceService.markAsPaid(invoiceToMark.id, {
        manualReceipt: {
          method: method as ManualReceiptMethod,
          amountMinor: toMinorUnits(invoiceToMark.total),
          receivedAt: new Date().toISOString(),
          note: `Recorded from invoice action for invoice ${invoiceToMark.id}`,
        },
      });
      if (result) {
        onSuccess?.();
      } else {
        uiFeedback.showToast('Failed to mark invoice as paid.', 'error');
      }
    }, async error => {
      uiFeedback.showToast('Something went wrong. Please try again.', 'error');
    }, () => {
      setLoading(false);
    });
  };

  if (loading) {
    return <ActivityIndicator size="small" color={colors.success} />;
  }

  return (
    <Button
      onPress={handlePress}
      variant={variant === 'compact' ? 'outline' : 'primary'}
      size={variant === 'compact' ? 'small' : 'medium'}
      accessibilityLabel="Mark as paid"
    >
      <Row align="center" justify="center" gap="xs">
        <Ionicons
          name="checkmark-circle-outline"
          size={18}
          color={variant === 'compact' ? colors.success : colors.onPrimary}
        />
        <ThemedText style={{ color: variant === 'compact' ? colors.success : colors.onPrimary }}>
          {variant === 'compact' ? 'Paid' : 'Mark as Paid'}
        </ThemedText>
      </Row>
    </Button>
  );
}

export const MarkPaidButton = MarkPaidButtonInner;
