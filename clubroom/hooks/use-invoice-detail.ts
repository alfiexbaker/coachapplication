/**
 * Hook for the Invoice Detail screen.
 * Manages invoice loading, send/mark-paid/void actions, and send modal state.
 */

import { useCallback, useState } from 'react';

import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { invoiceService } from '@/services/invoice-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { Invoice } from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('InvoiceDetailScreen');

export function useInvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const [actionLoading, setActionLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');

  const loadInvoice = useCallback(async () => {
    if (!id) {
      return ok<Invoice | null>(null);
    }

    try {
      const data = await invoiceService.getInvoiceById(id);
      return ok<Invoice | null>(data);
    } catch (error) {
      logger.error('Failed to load invoice', error);
      return err(serviceError('UNKNOWN', 'Failed to load invoice.', error));
    }
  }, [id]);

  const {
    data: invoice,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<Invoice | null>({
    load: loadInvoice,
    deps: [id],
    isEmpty: (value) => value === null,
    refetchOnFocus: true,
  });

  const handleSendInvoice = useCallback(async () => {
    if (!invoice || !sendEmail.trim()) return;
    setActionLoading(true);
    try {
      const result = await invoiceService.sendInvoice(invoice.id, sendEmail.trim());
      if (result.success) {
        uiFeedback.alert('Invoice Sent', `Invoice sent to ${sendEmail}`);
        setShowSendModal(false);
        setSendEmail('');
        onRefresh();
      } else {
        uiFeedback.alert('Failed', result.error || 'Could not send invoice');
      }
    } catch {
      uiFeedback.alert('Error', 'An error occurred while sending the invoice');
    } finally {
      setActionLoading(false);
    }
  }, [invoice, sendEmail, onRefresh]);

  const handleMarkPaid = useCallback(async () => {
    if (!invoice) return;
    uiFeedback.alert('Mark as Paid', 'Are you sure you want to mark this invoice as paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid',
        onPress: async () => {
          setActionLoading(true);
          try {
            await invoiceService.markAsPaid(invoice.id);
            onRefresh();
          } catch {
            uiFeedback.alert('Error', 'Failed to update invoice');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [invoice, onRefresh]);

  const handleVoidInvoice = useCallback(async () => {
    if (!invoice) return;
    uiFeedback.alert(
      'Void Invoice',
      'Are you sure you want to void this invoice? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void Invoice',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await invoiceService.voidInvoice(invoice.id, 'Voided by user');
              onRefresh();
            } catch {
              uiFeedback.alert('Error', 'Failed to void invoice');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  }, [invoice, onRefresh]);

  const goBack = useCallback(() => router.back(), []);
  const openSendModal = useCallback(() => setShowSendModal(true), []);
  const closeSendModal = useCallback(() => setShowSendModal(false), []);

  const isCoach = currentUser?.role === 'COACH' || currentUser?.id === invoice?.coachId;
  const canSend = invoice?.status === 'DRAFT' && isCoach;
  const canMarkPaid = (invoice?.status === 'SENT' || invoice?.status === 'DRAFT') && isCoach;
  const canVoid = invoice?.status !== 'VOID' && invoice?.status !== 'PAID';

  return {
    invoice: invoice ?? null,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    actionLoading,
    showSendModal,
    sendEmail,
    isCoach,
    canSend,
    canMarkPaid,
    canVoid,
    setSendEmail,
    handleSendInvoice,
    handleMarkPaid,
    handleVoidInvoice,
    goBack,
    openSendModal,
    closeSendModal,
  };
}
