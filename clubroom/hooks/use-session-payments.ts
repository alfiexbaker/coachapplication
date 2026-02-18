/**
 * useSessionPayments — Loads completed bookings + linked invoices for payment reconciliation.
 *
 * For each completed booking, fetches the linked invoice (auto-generates if missing).
 * Returns 3-way split: unpaid (owed), paid, written-off with totals and action handlers.
 */

import { useCallback, useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
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
}

interface SessionPaymentsData {
  unpaid: SessionPaymentItem[];
  paid: SessionPaymentItem[];
  writtenOff: SessionPaymentItem[];
  totalOwed: number;
  totalCollected: number;
  totalWrittenOff: number;
}

export function useSessionPayments() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const load = useCallback(async () => {
    try {
      const [bookings, roster] = await Promise.all([
        bookingService.getBookingsForUser(coachId, 'coach'),
        rosterService.getRoster(coachId),
      ]);
      const completed = bookings.filter((b) => b.status === 'COMPLETED');

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

      for (const booking of completed) {
        let invoice = await invoiceService.getInvoiceByBookingId(booking.id);

        // Auto-generate invoice if missing
        if (!invoice) {
          const result = await invoiceService.generateInvoice({ bookingId: booking.id });
          if (result.success) {
            invoice = result.data;
          }
        }

        // Fallback: create synthetic invoice from booking data when invoice service can't resolve
        if (!invoice && booking.price) {
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
            amount: booking.price,
            tax: 0,
            taxRate: 0,
            total: booking.price,
            currency: 'GBP',
            status: 'SENT',
            createdAt: booking.createdAt ?? booking.scheduledAt,
          };
          // Persist so mark-paid / write-off actions can find it
          await invoiceService.upsertInvoice(invoice);
        }

        if (!invoice) continue;

        const athleteName =
          nameMap.get(booking.athleteId ?? '') ??
          (booking.coachName !== currentUser?.name ? booking.coachName : 'Athlete');

        const item: SessionPaymentItem = { booking, invoice, athleteName };

        if (invoice.status === 'PAID') {
          paid.push(item);
          totalCollected += invoice.total;
        } else if (invoice.status === 'WRITTEN_OFF') {
          writtenOff.push(item);
          totalWrittenOff += invoice.total;
        } else {
          unpaid.push(item);
          totalOwed += invoice.total;
        }
      }

      // Sort: most recent first
      const sortByDate = (a: SessionPaymentItem, b: SessionPaymentItem) =>
        new Date(b.booking.scheduledAt).getTime() - new Date(a.booking.scheduledAt).getTime();
      unpaid.sort(sortByDate);
      paid.sort(sortByDate);
      writtenOff.sort(sortByDate);

      return ok<SessionPaymentsData>({ unpaid, paid, writtenOff, totalOwed, totalCollected, totalWrittenOff });
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

  const handleMarkPaid = useCallback(async (invoiceId: string) => {
    await invoiceService.markAsPaid(invoiceId);
  }, []);

  const handleMarkUnpaid = useCallback(async (invoiceId: string) => {
    await invoiceService.markAsUnpaid(invoiceId);
  }, []);

  const handleWriteOff = useCallback(async (invoiceId: string) => {
    await invoiceService.writeOff(invoiceId);
  }, []);

  const handleRestore = useCallback(async (invoiceId: string) => {
    await invoiceService.restoreFromWriteOff(invoiceId);
  }, []);

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
