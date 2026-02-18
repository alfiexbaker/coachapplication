/**
 * useSessionPayments — Loads completed bookings + linked invoices for payment reconciliation.
 *
 * For each completed booking, fetches the linked invoice (auto-generates if missing).
 * Returns unpaid/paid splits with totals.
 */

import { useCallback, useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { bookingService } from '@/services/booking';
import { invoiceService } from '@/services/invoice-service';
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
  totalOwed: number;
  totalCollected: number;
}

export function useSessionPayments() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const load = useCallback(async () => {
    try {
      const bookings = await bookingService.getBookingsForUser(coachId, 'coach');
      const completed = bookings.filter((b) => b.status === 'COMPLETED');

      const unpaid: SessionPaymentItem[] = [];
      const paid: SessionPaymentItem[] = [];
      let totalOwed = 0;
      let totalCollected = 0;

      for (const booking of completed) {
        let invoice = await invoiceService.getInvoiceByBookingId(booking.id);

        // Auto-generate invoice if missing
        if (!invoice) {
          const result = await invoiceService.generateInvoice({ bookingId: booking.id });
          if (result.success) {
            invoice = result.data;
          }
        }

        if (!invoice) continue;

        const athleteName = booking.coachName !== currentUser?.name
          ? booking.coachName
          : 'Athlete';

        const item: SessionPaymentItem = { booking, invoice, athleteName };

        if (invoice.status === 'PAID') {
          paid.push(item);
          totalCollected += invoice.total;
        } else {
          unpaid.push(item);
          totalOwed += invoice.total;
        }
      }

      // Sort: most recent first
      unpaid.sort((a, b) => new Date(b.booking.scheduledAt).getTime() - new Date(a.booking.scheduledAt).getTime());
      paid.sort((a, b) => new Date(b.booking.scheduledAt).getTime() - new Date(a.booking.scheduledAt).getTime());

      return ok<SessionPaymentsData>({ unpaid, paid, totalOwed, totalCollected });
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
    isEmpty: (d) => d.unpaid.length === 0 && d.paid.length === 0,
    events: [ServiceEvents.INVOICE_PAID, ServiceEvents.SESSION_COMPLETED],
  });

  const unpaidSessions = useMemo(() => data?.unpaid ?? [], [data]);
  const paidSessions = useMemo(() => data?.paid ?? [], [data]);
  const totalOwed = data?.totalOwed ?? 0;
  const totalCollected = data?.totalCollected ?? 0;
  const unpaidCount = unpaidSessions.length;

  return {
    unpaidSessions,
    paidSessions,
    totalOwed,
    totalCollected,
    unpaidCount,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  };
}
