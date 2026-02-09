/**
 * Hook for the Invoice Detail screen.
 * Manages invoice loading, send/mark-paid/void actions, and send modal state.
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { invoiceService } from '@/services/invoice-service';
import { createLogger } from '@/utils/logger';
import type { Invoice } from '@/constants/types';

const logger = createLogger('InvoiceDetailScreen');

export function useInvoiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    try {
      const data = await invoiceService.getInvoiceById(id);
      setInvoice(data);
    } catch (error) {
      logger.error('Failed to load invoice', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadInvoice(); }, [loadInvoice]));

  const handleSendInvoice = useCallback(async () => {
    if (!invoice || !sendEmail.trim()) return;
    setActionLoading(true);
    try {
      const result = await invoiceService.sendInvoice(invoice.id, sendEmail.trim());
      if (result.success) {
        Alert.alert('Invoice Sent', `Invoice sent to ${sendEmail}`);
        setShowSendModal(false);
        setSendEmail('');
        loadInvoice();
      } else {
        Alert.alert('Failed', result.error || 'Could not send invoice');
      }
    } catch {
      Alert.alert('Error', 'An error occurred while sending the invoice');
    } finally {
      setActionLoading(false);
    }
  }, [invoice, sendEmail, loadInvoice]);

  const handleMarkPaid = useCallback(async () => {
    if (!invoice) return;
    Alert.alert('Mark as Paid', 'Are you sure you want to mark this invoice as paid?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Paid', onPress: async () => {
          setActionLoading(true);
          try { await invoiceService.markAsPaid(invoice.id); loadInvoice(); }
          catch { Alert.alert('Error', 'Failed to update invoice'); }
          finally { setActionLoading(false); }
        },
      },
    ]);
  }, [invoice, loadInvoice]);

  const handleVoidInvoice = useCallback(async () => {
    if (!invoice) return;
    Alert.alert('Void Invoice', 'Are you sure you want to void this invoice? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Void Invoice', style: 'destructive', onPress: async () => {
          setActionLoading(true);
          try { await invoiceService.voidInvoice(invoice.id, 'Voided by user'); loadInvoice(); }
          catch { Alert.alert('Error', 'Failed to void invoice'); }
          finally { setActionLoading(false); }
        },
      },
    ]);
  }, [invoice, loadInvoice]);

  const goBack = useCallback(() => router.back(), []);
  const openSendModal = useCallback(() => setShowSendModal(true), []);
  const closeSendModal = useCallback(() => setShowSendModal(false), []);

  const isCoach = currentUser?.role === 'COACH' || currentUser?.id === invoice?.coachId;
  const canSend = invoice?.status === 'DRAFT' && isCoach;
  const canMarkPaid = (invoice?.status === 'SENT' || invoice?.status === 'DRAFT') && isCoach;
  const canVoid = invoice?.status !== 'VOID' && invoice?.status !== 'PAID';

  return {
    invoice, loading, actionLoading, showSendModal, sendEmail,
    isCoach, canSend, canMarkPaid, canVoid,
    setSendEmail, handleSendInvoice, handleMarkPaid, handleVoidInvoice,
    goBack, openSendModal, closeSendModal,
  };
}
