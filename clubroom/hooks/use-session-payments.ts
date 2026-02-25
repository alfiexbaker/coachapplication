/**
 * useSessionPayments — Loads completed bookings + linked invoices for payment reconciliation.
 *
 * For each completed booking, fetches the linked invoice (auto-generates if missing).
 * Returns 3-way split: unpaid (owed), paid, written-off with totals and action handlers.
 */

import { useCallback, useMemo, useRef } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { useToast } from '@/components/ui/toast';
import { bookingService } from '@/services/booking';
import { invoiceService } from '@/services/invoice-service';
import { rosterService } from '@/services/roster-service';
import { ServiceEvents } from '@/services/event-bus';
import { ok, err, serviceError } from '@/types/result';
import type { Booking, Invoice } from '@/constants/types';

export interface SessionPaymentItem {
  booking: Booking;
  invoice: Invoice;
  athleteName: string;
  isOverdue?: boolean;
}

interface SessionPaymentsData {
  unpaid: SessionPaymentItem[];
  paid: SessionPaymentItem[];
  writtenOff: SessionPaymentItem[];
  totalOwed: number;
  totalCollected: number;
  totalWrittenOff: number;
  overdueCount: number;
}

export function useSessionPayments() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';
  const { showToast } = useToast();
  const processingInvoiceIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [bookings, roster] = await Promise.all([
        bookingService.getBookingsForUser(coachId, 'coach'),
        rosterService.getRoster(coachId),
      ]);
      // Include completed sessions + late-cancelled (inside cancellation window = payment owed)
      const reconcilable = bookings.filter(
        (b) =>
          b.status === 'COMPLETED' ||
          (b.status === 'CANCELLED' && b.cancellationFee && b.cancellationFee > 0),
      );

      // Build athlete name lookup from roster
      const nameMap = new Map<string, string>();
      for (const entry of roster) {
        if (entry.athleteName) {
          nameMap.set(entry.athleteId, entry.athleteName);
        }
      }

      const unpaid: SessionPaymentItem[] = [];
      const paid: SessionPaymentItem[] = [];
      const writtenOff: SessionPaymentItem[] = [];
      let totalOwed = 0;
      let totalCollected = 0;
      let totalWrittenOff = 0;
      let overdueCount = 0;
      const now = Date.now();

      for (const booking of reconcilable) {
        // Use cancellation fee for cancelled bookings, otherwise booking price
        const invoiceAmount = booking.status === 'CANCELLED'
          ? (booking.cancellationFee ?? 0)
          : (booking.price ?? 0);

        let invoice = await invoiceService.getInvoiceByBookingId(booking.id);

        // Auto-generate invoice if missing
        if (!invoice) {
          const result = await invoiceService.generateInvoice({ bookingId: booking.id });
          if (result.success) {
            invoice = result.data;
          }
        }

        // TODO: Remove synthetic fallback when real API replaces AsyncStorage mock layer
        if (!invoice && invoiceAmount > 0) {
          invoice = {
            id: `inv_auto_${booking.id}`,
            invoiceNumber: `INV-AUTO-${booking.id}`,
            userId: booking.bookedById ?? booking.athleteId ?? '',
            bookingId: booking.id,
            coachId: booking.coachId,
            athleteId: booking.athleteId,
            sessionDate: booking.scheduledAt,
            sessionType: booking.service ?? booking.serviceType,
            sessionLocation: booking.location,
            sessionDuration: booking.duration ?? 60,
            amount: invoiceAmount,
            tax: 0,
            taxRate: 0,
            total: invoiceAmount,
            currency: 'GBP',
            status: 'SENT',
            createdAt: booking.createdAt ?? booking.scheduledAt,
          };
          // Persist so mark-paid / write-off actions can find it
          await invoiceService.upsertInvoice(invoice);
        }

        // Skip bookings with no monetary value (e.g. free trial sessions)
        if (!invoice) {
          if (invoiceAmount <= 0) continue;
          continue;
        }

        const athleteName =
          nameMap.get(booking.athleteId ?? '') ??
          (booking.coachName !== currentUser?.name ? (booking.coachName ?? 'Athlete') : 'Athlete');

        const item: SessionPaymentItem = { booking, invoice, athleteName };

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
      }

      // Sort: overdue first in unpaid, then most recent
      unpaid.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return new Date(b.booking.scheduledAt).getTime() - new Date(a.booking.scheduledAt).getTime();
      });
      const sortByDate = (a: SessionPaymentItem, b: SessionPaymentItem) =>
        new Date(b.booking.scheduledAt).getTime() - new Date(a.booking.scheduledAt).getTime();
      paid.sort(sortByDate);
      writtenOff.sort(sortByDate);

      return ok<SessionPaymentsData>({ unpaid, paid, writtenOff, totalOwed, totalCollected, totalWrittenOff, overdueCount });
    } catch {
      return err(serviceError('UNKNOWN', 'Failed to load session payments'));
    }
  }, [coachId, currentUser?.name]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<SessionPaymentsData>({
    load,
    deps: [coachId],
    isEmpty: (d) => d.unpaid.length === 0 && d.paid.length === 0 && d.writtenOff.length === 0,
    events: [
      ServiceEvents.INVOICE_PAID,
      ServiceEvents.INVOICE_WRITTEN_OFF,
      ServiceEvents.INVOICE_RESTORED,
      ServiceEvents.SESSION_COMPLETED,
    ],
  });

  const unpaidSessions = useMemo(() => data?.unpaid ?? [], [data]);
  const paidSessions = useMemo(() => data?.paid ?? [], [data]);
  const writtenOffSessions = useMemo(() => data?.writtenOff ?? [], [data]);
  const totalOwed = data?.totalOwed ?? 0;
  const totalCollected = data?.totalCollected ?? 0;
  const totalWrittenOff = data?.totalWrittenOff ?? 0;
  const overdueCount = data?.overdueCount ?? 0;

  const handleMarkPaid = useCallback(async (invoiceId: string) => {
    if (processingInvoiceIdsRef.current.has(invoiceId)) return;
    processingInvoiceIdsRef.current.add(invoiceId);
    try {
      const result = await invoiceService.markAsPaid(invoiceId);
      if (result) {
        showToast('Marked as paid', 'success');
      } else {
        showToast('Failed to update payment', 'error');
      }
    } finally {
      processingInvoiceIdsRef.current.delete(invoiceId);
    }
  }, [showToast]);

  const handleMarkUnpaid = useCallback(async (invoiceId: string) => {
    const result = await invoiceService.markAsUnpaid(invoiceId);
    if (result) {
      showToast('Moved back to owed', 'default');
    } else {
      showToast('Failed to update', 'error');
    }
  }, [showToast]);

  const handleWriteOff = useCallback(async (invoiceId: string) => {
    const result = await invoiceService.writeOff(invoiceId);
    if (result) {
      showToast('Written off', 'default');
    } else {
      showToast('Failed to write off', 'error');
    }
  }, [showToast]);

  const handleRestore = useCallback(async (invoiceId: string) => {
    const result = await invoiceService.restoreFromWriteOff(invoiceId);
    if (result) {
      showToast('Restored to owed', 'success');
    } else {
      showToast('Failed to restore', 'error');
    }
  }, [showToast]);

  return {
    unpaidSessions,
    paidSessions,
    writtenOffSessions,
    totalOwed,
    totalCollected,
    totalWrittenOff,
    unpaidCount: unpaidSessions.length,
    paidCount: paidSessions.length,
    writtenOffCount: writtenOffSessions.length,
    overdueCount,
    handleMarkPaid,
    handleMarkUnpaid,
    handleWriteOff,
    handleRestore,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  };
}
