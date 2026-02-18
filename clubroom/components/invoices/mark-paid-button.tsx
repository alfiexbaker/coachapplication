/**
 * MarkPaidButton — Confirmation + mark invoice as paid + emit event.
 *
 * Accepts either an invoiceId directly, or a bookingId (looks up the invoice).
 */

import { memo, useState, useCallback } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { invoiceService } from '@/services/invoice-service';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { useTheme } from '@/hooks/useTheme';

interface MarkPaidButtonProps {
  invoiceId?: string;
  bookingId?: string;
  onSuccess?: () => void;
  variant?: 'primary' | 'compact';
}

function MarkPaidButtonInner({ invoiceId, bookingId, onSuccess, variant = 'primary' }: MarkPaidButtonProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handlePress = useCallback(() => {
    Alert.alert(
      'Mark as Paid',
      'Confirm this invoice has been paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            setLoading(true);
            try {
              let targetInvoiceId = invoiceId;

              // Look up invoice by booking if no direct ID
              if (!targetInvoiceId && bookingId) {
                const invoice = await invoiceService.getInvoiceByBookingId(bookingId);
                if (invoice) {
                  targetInvoiceId = invoice.id;
                }
              }

              if (!targetInvoiceId) {
                Alert.alert('No Invoice', 'No invoice found for this booking.');
                return;
              }

              const result = await invoiceService.markAsPaid(targetInvoiceId);
              if (result) {
                emitTyped(ServiceEvents.INVOICE_PAID, {
                  invoiceId: targetInvoiceId,
                  coachId: result.coachId,
                  amount: result.amount,
                });
                onSuccess?.();
              } else {
                Alert.alert('Error', 'Failed to mark invoice as paid.');
              }
            } catch {
              Alert.alert('Error', 'Something went wrong. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }, [invoiceId, bookingId, onSuccess]);

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
      <Ionicons name="checkmark-circle-outline" size={18} color={variant === 'compact' ? colors.success : colors.onPrimary} />
      {variant === 'compact' ? 'Paid' : 'Mark as Paid'}
    </Button>
  );
}

export const MarkPaidButton = memo(MarkPaidButtonInner);
