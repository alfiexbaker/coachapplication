/**
 * Hook for the Invoice Detail screen.
 * Manages invoice loading, send/mark-paid/void actions, and send modal state.
 */

import { useState } from 'react';

import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { invoiceService, type ManualReceiptMethod } from '@/services/invoice-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { Invoice } from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('InvoiceDetailScreen');

const MANUAL_PAYMENT_OPTIONS: Array<{ id: ManualReceiptMethod; label: string }> = [
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'cash', label: 'Cash' },
  { id: 'other', label: 'Other' },
];

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

export function useInvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const [actionLoading, setActionLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');

  const loadInvoice = async () => {
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
  };

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
    loadingStrategy: 'section-skeleton',
    dataKey: `invoice-detail:${id ?? 'missing'}`,
  });

  const handleSendInvoice = async () => {
    if (!invoice || !sendEmail.trim()) return;
    setActionLoading(true);

    await runAsyncTryCatchFinally(
      async () => {
        const result = await invoiceService.sendInvoice(invoice.id, sendEmail.trim());
        if (result.success) {
          uiFeedback.showToast(`Invoice sent to ${sendEmail}`, 'success');
          setShowSendModal(false);
          setSendEmail('');
          onRefresh();
        } else {
          uiFeedback.showToast(result.error || 'Could not send invoice', 'error');
        }
      },
      async (error) => {
        uiFeedback.showToast('An error occurred while sending the invoice', 'error');
      },
      () => {
        setActionLoading(false);
      },
    );
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    const confirmed = await uiFeedback.confirm({
      title: 'Record payment received',
      message: 'Confirm this invoice has been paid?',
      confirmText: 'Choose method',
    });
    if (!confirmed) return;

    const method = await uiFeedback.choose({
      title: 'Record payment received',
      message: `How did the \u00A3${invoice.total.toFixed(2)} payment arrive?`,
      options: MANUAL_PAYMENT_OPTIONS,
      cancelText: 'Cancel',
    });
    if (!method) return;

    setActionLoading(true);

    await runAsyncTryCatchFinally(
      async () => {
        await invoiceService.markAsPaid(invoice.id, {
          manualReceipt: {
            method: method as ManualReceiptMethod,
            amountMinor: toMinorUnits(invoice.total),
            receivedAt: new Date().toISOString(),
            note: `Recorded from invoice detail for invoice ${invoice.id}`,
          },
        });
        onRefresh();
      },
      async (error) => {
        uiFeedback.showToast('Failed to update invoice', 'error');
      },
      () => {
        setActionLoading(false);
      },
    );
  };

  const handleVoidInvoice = async () => {
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

            await runAsyncTryCatchFinally(
              async () => {
                await invoiceService.voidInvoice(invoice.id, 'Voided by user');
                onRefresh();
              },
              async (error) => {
                uiFeedback.showToast('Failed to void invoice', 'error');
              },
              () => {
                setActionLoading(false);
              },
            );
          },
        },
      ],
    );
  };

  const goBack = () => router.back();
  const openSendModal = () => setShowSendModal(true);
  const closeSendModal = () => setShowSendModal(false);

  const isCoach = currentUser?.role === 'COACH' || currentUser?.id === invoice?.coachId;
  const canSend = Boolean(
    invoice &&
    isCoach &&
    (invoice.status === 'DRAFT' || (invoice.status === 'SENT' && !invoice.sentAt)),
  );
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
