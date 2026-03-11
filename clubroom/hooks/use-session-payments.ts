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
import { apiClient } from '@/services/api-client';
import { ServiceEvents } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import {
  getSessionOfferingHeadcount,
  getSessionOfferingOffPlatformCount,
} from '@/utils/session-offering-capacity';
import {
  getCoachBusinessContext,
  getCoachMoneyContext,
  getCoachMoneyContextDisplay,
  type CoachBusinessContext,
  type CoachMoneyContext,
} from '@/utils/coach-business-context';
import { ok, err, serviceError } from '@/types/result';
import type { Booking, Invoice, SessionOffering } from '@/constants/types';

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

export function useSessionPayments() {
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';
  const { showToast } = useToast();
  const processingInvoiceIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [bookings, roster, offerings] = await Promise.all([
        bookingService.getBookingsForUser(coachId, 'coach'),
        rosterService.getRoster(coachId),
        apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
      ]);
      // Include completed sessions + late-cancelled (inside cancellation window = payment owed)
      const reconcilable = bookings.filter(
        (b) =>
          b.status === 'COMPLETED' ||
          (b.status === 'CANCELLED' && b.cancellationFee && b.cancellationFee > 0),
      );
      const now = Date.now();
      const reconcilableOffPlatformOfferings = offerings.filter((offering) => {
        if (offering.coachId !== coachId) return false;
        if (offering.sessionType !== 'group') return false;
        if (offering.status === 'cancelled') return false;
        const offPlatformCount = getSessionOfferingOffPlatformCount(offering);
        if (offPlatformCount <= 0) return false;

        const scheduledAt = new Date(offering.scheduledAt).getTime();
        if (!Number.isFinite(scheduledAt)) return false;
        return offering.status === 'completed' || scheduledAt <= now;
      });

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
      const getSummaryForContext = (context: CoachBusinessContext) =>
        context === 'org' ? orgSummary : independentSummary;
      const pushItem = (item: SessionPaymentItem) => {
        const { booking, invoice } = item;
        const summary = getSummaryForContext(item.businessContext);
        if (invoice.status === 'PAID') {
          paid.push(item);
          totalCollected += invoice.total;
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
          writtenOff.push(item);
          totalWrittenOff += invoice.total;
          summary.totalWrittenOff += invoice.total;
          summary.writtenOffCount += 1;
          return;
        }

        // Check if overdue (past dueDate or > 14 days since session with no dueDate)
        const dueDate = invoice.dueDate
          ? new Date(invoice.dueDate).getTime()
          : new Date(booking.scheduledAt).getTime() + 14 * 24 * 60 * 60 * 1000;
        const isOverdue = now > dueDate;

        unpaid.push({ ...item, isOverdue });
        totalOwed += invoice.total;
        summary.totalOwed += invoice.total;
        summary.unpaidCount += 1;
        if (item.moneyContext === 'org_credit') {
          summary.creditOwed += invoice.total;
        } else {
          summary.directOwed += invoice.total;
        }
        if (isOverdue) overdueCount++;
        if (isOverdue) summary.overdueCount += 1;
      };

      const invoiceAmounts = reconcilable.map((booking) =>
        booking.status === 'CANCELLED'
          ? (booking.cancellationFee ?? 0)
          : (booking.price ?? 0),
      );

      const invoiceResults = await Promise.all(
        reconcilable.map((booking) => invoiceService.getInvoiceByBookingId(booking.id)),
      );

      const missingInvoiceIndices = invoiceResults
        .map((invoice, index) => (invoice ? -1 : index))
        .filter((index) => index >= 0);

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
        pushItem(item);
      }

      for (const offering of reconcilableOffPlatformOfferings) {
        const offPlatformCount = getSessionOfferingOffPlatformCount(offering);
        const perParticipantPrice = offering.price ?? 0;
        const invoiceAmount = perParticipantPrice * offPlatformCount;
        if (invoiceAmount <= 0) continue;

        const syntheticBookingId = `booking_off_platform_${offering.id}`;
        const syntheticInvoiceTemplate: Invoice = {
          id: `inv_off_platform_${offering.id}`,
          invoiceNumber: `INV-OFF-${offering.id}`,
          userId: offering.coachId,
          bookingId: syntheticBookingId,
          coachId: offering.coachId,
          athleteId: undefined,
          sessionDate: offering.scheduledAt,
          sessionType: `${offering.title} (Off-platform)`,
          sessionLocation: offering.location,
          sessionDuration: offering.duration ?? 60,
          amount: invoiceAmount,
          tax: 0,
          taxRate: 0,
          total: invoiceAmount,
          currency: 'GBP',
          status: 'SENT',
          createdAt: offering.createdAt ?? offering.scheduledAt,
        };

        const storedInvoice = await invoiceService.getInvoiceByBookingId(syntheticBookingId);
        let invoice = storedInvoice
          ? {
              ...storedInvoice,
              amount: invoiceAmount,
              tax: 0,
              taxRate: 0,
              total: invoiceAmount,
              sessionDate: offering.scheduledAt,
              sessionType: `${offering.title} (Off-platform)`,
              sessionLocation: offering.location,
              sessionDuration: offering.duration ?? 60,
            }
          : syntheticInvoiceTemplate;

        if (!storedInvoice) {
          syntheticInvoicesToPersist.push(invoice);
        }

        const syntheticBooking: Booking = {
          id: syntheticBookingId,
          coachId: offering.coachId,
          clubId: offering.clubId,
          actingAs: offering.actingAs,
          ownerCoachId: offering.ownerCoachId,
          assigneeCoachId: offering.assigneeCoachId,
          createdByUserId: offering.createdByUserId,
          createdByRole: offering.createdByRole,
          status: 'COMPLETED',
          scheduledAt: offering.scheduledAt,
          location: offering.location,
          service: offering.title,
          serviceType: 'group',
          price: invoiceAmount,
          isGroupSession: true,
          maxParticipants: offering.maxParticipants,
          currentParticipants: getSessionOfferingHeadcount(offering),
          createdAt: offering.createdAt,
          groupSessionId: offering.id,
        };

        const moneyDisplay = getCoachMoneyContextDisplay(syntheticBooking);
        const item: SessionPaymentItem = {
          booking: syntheticBooking,
          invoice,
          athleteName: `Off-platform (${offPlatformCount})`,
          businessContext: getCoachBusinessContext(syntheticBooking),
          moneyContext: getCoachMoneyContext(syntheticBooking),
          moneyLabel: moneyDisplay.label,
          moneyDetail: moneyDisplay.detail,
        };
        pushItem(item);
      }

      if (syntheticInvoicesToPersist.length > 0) {
        await Promise.all(
          syntheticInvoicesToPersist.map((invoice) => invoiceService.upsertInvoice(invoice)),
        );
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
      ServiceEvents.SESSION_UPDATED,
    ],
  });

  const unpaidSessions = useMemo(() => data?.unpaid ?? [], [data]);
  const paidSessions = useMemo(() => data?.paid ?? [], [data]);
  const writtenOffSessions = useMemo(() => data?.writtenOff ?? [], [data]);
  const totalOwed = data?.totalOwed ?? 0;
  const totalCollected = data?.totalCollected ?? 0;
  const totalWrittenOff = data?.totalWrittenOff ?? 0;
  const overdueCount = data?.overdueCount ?? 0;
  const orgSummary = data?.orgSummary ?? createPaymentBusinessSummary();
  const independentSummary = data?.independentSummary ?? createPaymentBusinessSummary();

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
