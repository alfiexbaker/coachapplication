/**
 * useSessionPayments — Loads completed bookings + linked invoices for payment reconciliation.
 *
 * For each completed booking, fetches the linked invoice (auto-generates if missing).
 * Returns 3-way split: unpaid (owed), paid, written-off with totals and action handlers.
 */

import { useAuth } from '@/hooks/use-auth';
import { useLazyRef } from '@/hooks/use-lazy-ref';
import { useScreen } from '@/hooks/use-screen';
import { useToast } from '@/components/ui/toast';
import { api } from '@/constants/config';
import { bookingService } from '@/services/booking';
import { invoiceService, type ManualReceiptMethod } from '@/services/invoice-service';
import { rosterService } from '@/services/roster-service';
import { ServiceEvents } from '@/services/event-bus';
import { uiFeedback } from '@/services/ui-feedback';
import {
  getCoachBusinessContext,
  getCoachMoneyContext,
  getCoachMoneyContextDisplay,
  type CoachBusinessContext,
  type CoachMoneyContext,
} from '@/utils/coach-business-context';
import { ok, err, serviceError } from '@/types/result';
import type { Booking, Invoice } from '@/constants/types';

import { runAsyncFinally } from '@/utils/async-control';

export interface SessionPaymentItem {
  booking: Booking;
  invoice: Invoice;
  athleteName: string;
  businessContext: CoachBusinessContext;
  moneyContext: CoachMoneyContext;
  moneyLabel: string;
  moneyDetail: string;
  isOverdue?: boolean;
}

export interface PaymentBusinessSummary {
  totalOwed: number;
  totalCollected: number;
  totalWrittenOff: number;
  unpaidCount: number;
  paidCount: number;
  writtenOffCount: number;
  overdueCount: number;
  directOwed: number;
  directCollected: number;
  creditOwed: number;
  creditCollected: number;
}

interface SessionPaymentsData {
  unpaid: SessionPaymentItem[];
  paid: SessionPaymentItem[];
  writtenOff: SessionPaymentItem[];
  totalOwed: number;
  totalCollected: number;
  totalWrittenOff: number;
  overdueCount: number;
  orgSummary: PaymentBusinessSummary;
  independentSummary: PaymentBusinessSummary;
}

const RECONCILABLE_INVOICE_STATUSES: Invoice['status'][] = ['SENT', 'PAID', 'WRITTEN_OFF'];

const MANUAL_PAYMENT_OPTIONS: Array<{
  id: ManualReceiptMethod;
  label: string;
}> = [
  { id: 'bank_transfer', label: 'Bank transfer' },
  { id: 'cash', label: 'Cash' },
  { id: 'other', label: 'Other' },
];

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

function createPaymentBusinessSummary(): PaymentBusinessSummary {
  return {
    totalOwed: 0,
    totalCollected: 0,
    totalWrittenOff: 0,
    unpaidCount: 0,
    paidCount: 0,
    writtenOffCount: 0,
    overdueCount: 0,
    directOwed: 0,
    directCollected: 0,
    creditOwed: 0,
    creditCollected: 0,
  };
}

function bookingFromInvoice(invoice: Invoice, booking?: Booking): Booking {
  return {
    ...(booking ?? {}),
    id: booking?.id ?? invoice.bookingId,
    coachId: booking?.coachId ?? invoice.coachId,
    athleteId: booking?.athleteId ?? invoice.athleteId,
    athleteIds: booking?.athleteIds ?? (invoice.athleteId ? [invoice.athleteId] : undefined),
    bookedById: booking?.bookedById ?? invoice.userId,
    status: booking?.status ?? 'COMPLETED',
    scheduledAt: booking?.scheduledAt ?? invoice.sessionDate,
    duration: booking?.duration ?? invoice.sessionDuration ?? 60,
    location: booking?.location ?? invoice.sessionLocation ?? '',
    service: booking?.service ?? invoice.sessionType,
    serviceType: booking?.serviceType ?? invoice.sessionType,
    price: booking?.price ?? invoice.total,
    createdAt: booking?.createdAt ?? invoice.createdAt,
  };
}

function athleteNameForPayment(
  booking: Booking,
  invoice: Invoice,
  nameMap: Map<string, string>,
  currentUserName?: string,
): string {
  const athleteId = booking.athleteId ?? invoice.athleteId ?? '';
  return (
    nameMap.get(athleteId) ??
    (booking.coachName !== currentUserName ? (booking.coachName ?? 'Athlete') : 'Athlete')
  );
}

function pushPaymentItem(
  item: SessionPaymentItem,
  target: {
    unpaid: SessionPaymentItem[];
    paid: SessionPaymentItem[];
    writtenOff: SessionPaymentItem[];
    orgSummary: PaymentBusinessSummary;
    independentSummary: PaymentBusinessSummary;
    totalOwed: number;
    totalCollected: number;
    totalWrittenOff: number;
    overdueCount: number;
  },
  now: number,
) {
  const { booking, invoice } = item;
  const summary = item.businessContext === 'org' ? target.orgSummary : target.independentSummary;
  if (invoice.status === 'PAID') {
    target.paid.push(item);
    target.totalCollected += invoice.total;
    summary.totalCollected += invoice.total;
    summary.paidCount += 1;
    if (item.moneyContext === 'org_credit') {
      summary.creditCollected += invoice.total;
    } else {
      summary.directCollected += invoice.total;
    }
    return;
  }
  if (invoice.status === 'WRITTEN_OFF') {
    target.writtenOff.push(item);
    target.totalWrittenOff += invoice.total;
    summary.totalWrittenOff += invoice.total;
    summary.writtenOffCount += 1;
    return;
  }

  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).getTime()
    : new Date(booking.scheduledAt).getTime() + 14 * 24 * 60 * 60 * 1000;
  const isOverdue = now > dueDate;

  target.unpaid.push({ ...item, isOverdue });
  target.totalOwed += invoice.total;
  summary.totalOwed += invoice.total;
  summary.unpaidCount += 1;
  if (item.moneyContext === 'org_credit') {
    summary.creditOwed += invoice.total;
  } else {
    summary.directOwed += invoice.total;
  }
  if (isOverdue) target.overdueCount += 1;
  if (isOverdue) summary.overdueCount += 1;
}

function sortSessionPaymentItems(
  unpaid: SessionPaymentItem[],
  paid: SessionPaymentItem[],
  writtenOff: SessionPaymentItem[],
) {
  unpaid.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return new Date(b.booking.scheduledAt).getTime() - new Date(a.booking.scheduledAt).getTime();
  });
  const sortByDate = (a: SessionPaymentItem, b: SessionPaymentItem) =>
    new Date(b.booking.scheduledAt).getTime() - new Date(a.booking.scheduledAt).getTime();
  paid.sort(sortByDate);
  writtenOff.sort(sortByDate);
}

async function loadApiSessionPayments(
  coachId: string,
  currentUserName?: string,
): Promise<SessionPaymentsData> {
  const [invoices, bookings, roster] = await Promise.all([
    invoiceService.getInvoicesFiltered(coachId, {
      coachId,
      status: RECONCILABLE_INVOICE_STATUSES,
    }),
    bookingService.getBookingsForUser(coachId, 'coach'),
    rosterService.getRoster(coachId),
  ]);
  const nameMap = new Map<string, string>();
  for (const entry of roster) {
    if (entry.athleteName) {
      nameMap.set(entry.athleteId, entry.athleteName);
    }
  }
  const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));
  const target = {
    unpaid: [] as SessionPaymentItem[],
    paid: [] as SessionPaymentItem[],
    writtenOff: [] as SessionPaymentItem[],
    orgSummary: createPaymentBusinessSummary(),
    independentSummary: createPaymentBusinessSummary(),
    totalOwed: 0,
    totalCollected: 0,
    totalWrittenOff: 0,
    overdueCount: 0,
  };
  const now = Date.now();

  for (const invoice of invoices) {
    if (invoice.total <= 0 || invoice.status === 'VOID') continue;
    const booking = bookingFromInvoice(invoice, bookingsById.get(invoice.bookingId));
    const moneyDisplay = getCoachMoneyContextDisplay(booking);
    pushPaymentItem(
      {
        booking,
        invoice,
        athleteName: athleteNameForPayment(booking, invoice, nameMap, currentUserName),
        businessContext: getCoachBusinessContext(booking),
        moneyContext: getCoachMoneyContext(booking),
        moneyLabel: moneyDisplay.label,
        moneyDetail: moneyDisplay.detail,
      },
      target,
      now,
    );
  }

  sortSessionPaymentItems(target.unpaid, target.paid, target.writtenOff);

  return {
    unpaid: target.unpaid,
    paid: target.paid,
    writtenOff: target.writtenOff,
    totalOwed: target.totalOwed,
    totalCollected: target.totalCollected,
    totalWrittenOff: target.totalWrittenOff,
    overdueCount: target.overdueCount,
    orgSummary: target.orgSummary,
    independentSummary: target.independentSummary,
  };
}

export function useSessionPayments() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';
  const { showToast } = useToast();
  const processingInvoiceIdsRef = useLazyRef(() => new Set<string>());

  const load = async () => {
    try {
      if (!api.useMock) {
        return ok(await loadApiSessionPayments(coachId, currentUser?.name));
      }

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
      const now = Date.now();
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
      const orgSummary = createPaymentBusinessSummary();
      const independentSummary = createPaymentBusinessSummary();
      let totalOwed = 0;
      let totalCollected = 0;
      let totalWrittenOff = 0;
      let overdueCount = 0;

      const invoiceAmounts = reconcilable.map((booking) =>
        booking.status === 'CANCELLED' ? (booking.cancellationFee ?? 0) : (booking.price ?? 0),
      );

      const invoiceResults = await Promise.all(
        reconcilable.map((booking) => invoiceService.getInvoiceByBookingId(booking.id)),
      );

      const missingInvoiceIndices = invoiceResults.flatMap((invoice, index) =>
        invoice ? [] : [index],
      );

      if (missingInvoiceIndices.length > 0) {
        const generatedResults = await Promise.all(
          missingInvoiceIndices.map((index) =>
            invoiceService.generateInvoice({ bookingId: reconcilable[index].id }),
          ),
        );

        generatedResults.forEach((result, generatedIndex) => {
          if (!result.success) return;
          const targetIndex = missingInvoiceIndices[generatedIndex];
          invoiceResults[targetIndex] = result.data;
        });
      }

      const syntheticInvoicesToPersist: Invoice[] = [];

      for (let index = 0; index < reconcilable.length; index += 1) {
        const booking = reconcilable[index];
        const invoiceAmount = invoiceAmounts[index];
        let invoice = invoiceResults[index];

        if (!invoice && invoiceAmount > 0 && api.useMock) {
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
          invoiceResults[index] = invoice;
          syntheticInvoicesToPersist.push(invoice);
        }

        // Skip bookings with no monetary value (e.g. free trial sessions)
        if (!invoice) {
          if (invoiceAmount <= 0) continue;
          continue;
        }

        const athleteName =
          nameMap.get(booking.athleteId ?? '') ??
          (booking.coachName !== currentUser?.name ? (booking.coachName ?? 'Athlete') : 'Athlete');

        const moneyDisplay = getCoachMoneyContextDisplay(booking);
        const item: SessionPaymentItem = {
          booking,
          invoice,
          athleteName,
          businessContext: getCoachBusinessContext(booking),
          moneyContext: getCoachMoneyContext(booking),
          moneyLabel: moneyDisplay.label,
          moneyDetail: moneyDisplay.detail,
        };
        const target = {
          unpaid,
          paid,
          writtenOff,
          orgSummary,
          independentSummary,
          totalOwed,
          totalCollected,
          totalWrittenOff,
          overdueCount,
        };
        pushPaymentItem(item, target, now);
        totalOwed = target.totalOwed;
        totalCollected = target.totalCollected;
        totalWrittenOff = target.totalWrittenOff;
        overdueCount = target.overdueCount;
      }

      if (syntheticInvoicesToPersist.length > 0) {
        await Promise.all(
          syntheticInvoicesToPersist.map((invoice) => invoiceService.upsertInvoice(invoice)),
        );
      }

      sortSessionPaymentItems(unpaid, paid, writtenOff);

      return ok<SessionPaymentsData>({
        unpaid,
        paid,
        writtenOff,
        totalOwed,
        totalCollected,
        totalWrittenOff,
        overdueCount,
        orgSummary,
        independentSummary,
      });
    } catch {
      return err(serviceError('UNKNOWN', 'Failed to load session payments'));
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<SessionPaymentsData>({
    load,
    deps: [coachId],
    isEmpty: (d) => d.unpaid.length === 0 && d.paid.length === 0 && d.writtenOff.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: `session-payments:${coachId ?? 'none'}`,
    events: [
      ServiceEvents.INVOICE_PAID,
      ServiceEvents.INVOICE_WRITTEN_OFF,
      ServiceEvents.INVOICE_RESTORED,
      ServiceEvents.SESSION_COMPLETED,
      ServiceEvents.SESSION_UPDATED,
    ],
  });

  const unpaidSessions = data?.unpaid ?? [];
  const paidSessions = data?.paid ?? [];
  const writtenOffSessions = data?.writtenOff ?? [];
  const totalOwed = data?.totalOwed ?? 0;
  const totalCollected = data?.totalCollected ?? 0;
  const totalWrittenOff = data?.totalWrittenOff ?? 0;
  const overdueCount = data?.overdueCount ?? 0;
  const orgSummary = data?.orgSummary ?? createPaymentBusinessSummary();
  const independentSummary = data?.independentSummary ?? createPaymentBusinessSummary();

  const handleMarkPaid = async (item: SessionPaymentItem) => {
    const invoiceId = item.invoice.id;
    if (processingInvoiceIdsRef.current.has(invoiceId)) return;

    const method = await uiFeedback.choose({
      title: 'Record payment received',
      message: `How did ${item.athleteName}'s \u00A3${item.invoice.total.toFixed(2)} payment arrive?`,
      options: MANUAL_PAYMENT_OPTIONS,
      cancelText: 'Cancel',
    });
    if (!method) return;

    processingInvoiceIdsRef.current.add(invoiceId);

    await runAsyncFinally(
      async () => {
        const result = await invoiceService.markAsPaid(invoiceId, {
          manualReceipt: {
            method: method as ManualReceiptMethod,
            amountMinor: toMinorUnits(item.invoice.total),
            receivedAt: new Date().toISOString(),
            note: `Recorded from earnings reconciler for booking ${item.booking.id}`,
          },
        });
        if (result) {
          showToast('Marked as paid', 'success');
        } else {
          showToast('Failed to update payment', 'error');
        }
      },
      () => {
        processingInvoiceIdsRef.current.delete(invoiceId);
      },
    );
  };

  const handleMarkUnpaid = async (invoiceId: string) => {
    const result = await invoiceService.markAsUnpaid(invoiceId);
    if (result) {
      showToast('Moved back to owed', 'default');
    } else {
      showToast('Failed to update', 'error');
    }
  };

  const handleWriteOff = async (invoiceId: string) => {
    const result = await invoiceService.writeOff(invoiceId);
    if (result) {
      showToast('Written off', 'default');
    } else {
      showToast('Failed to write off', 'error');
    }
  };

  const handleRestore = async (invoiceId: string) => {
    const result = await invoiceService.restoreFromWriteOff(invoiceId);
    if (result) {
      showToast('Restored to owed', 'success');
    } else {
      showToast('Failed to restore', 'error');
    }
  };

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
    orgSummary,
    independentSummary,
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
