import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Booking, Invoice, SessionOffering, User } from '@/constants/types';
import { apiClient } from '@/services/api-client';
import { orgOwnerDashboardService } from '@/services/org-owner-dashboard-service';

function isoOffset(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function makeBooking(id: string, overrides: Partial<Booking> = {}): Booking {
  return {
    id,
    coachId: 'coach1',
    coachName: 'Director Kelly',
    clubId: 'club_lions',
    actingAs: 'club',
    commercialMode: 'ORG_OWNED',
    athleteIds: ['athlete_1'],
    athleteNames: ['Athlete One'],
    bookedById: 'parent_1',
    bookedByName: 'Parent One',
    status: 'CONFIRMED',
    scheduledAt: isoOffset(3),
    location: 'Main Pitch',
    service: 'Club Session',
    serviceType: 'COACHING',
    sessionSource: 'direct',
    sessionSourceEntityId: 'offering_org_1',
    createdAt: isoOffset(-7),
    duration: 60,
    ...overrides,
  };
}

function makeOffering(id: string, overrides: Partial<SessionOffering> = {}): SessionOffering {
  return {
    id,
    coachId: 'coach1',
    clubId: 'club_lions',
    actingAs: 'club',
    commercialMode: 'ORG_OWNED',
    title: 'Club Session',
    sessionType: '1on1',
    maxParticipants: 8,
    location: 'Main Pitch',
    scheduledAt: isoOffset(3),
    isRecurring: false,
    recurrenceType: 'none',
    status: 'active',
    registrations: [],
    createdAt: isoOffset(-7),
    ...overrides,
  };
}

function makeInvoice(id: string, bookingId: string, total: number, overrides: Partial<Invoice> = {}): Invoice {
  return {
    id,
    invoiceNumber: `INV-${id}`,
    userId: 'parent_1',
    bookingId,
    coachId: 'coach1',
    athleteId: 'athlete_1',
    sessionDate: isoOffset(-3),
    sessionType: 'Club Session',
    sessionLocation: 'Main Pitch',
    sessionDuration: 60,
    amount: total,
    tax: 0,
    taxRate: 0,
    total,
    currency: 'GBP',
    status: 'SENT',
    createdAt: isoOffset(-4),
    dueDate: isoOffset(-1),
    ...overrides,
  };
}

describe('orgOwnerDashboardService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_OFFERINGS);
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.USERS);
    await apiClient.remove(STORAGE_KEYS.INVOICES);
    await apiClient.remove(STORAGE_KEYS.PROBLEM_REPORTS);
    await apiClient.remove(STORAGE_KEYS.ORG_HEAD_COACH_TASKS);
    await apiClient.remove(STORAGE_KEYS.ORG_HEAD_COACH_STANDARDS);
    await apiClient.remove(STORAGE_KEYS.PROGRESS_PRACTICE_TASKS);
  });

  it('builds an owner view across staffing, delivery, support, and reconciler finance', async () => {
    await apiClient.set(STORAGE_KEYS.USERS, [
      {
        id: 'coach1',
        name: 'Director Kelly',
        email: 'kelly@example.com',
        postcode: '',
        dateOfBirth: '1980-01-01',
        role: 'COACH',
      },
      {
        id: 'coach2',
        name: 'Jess Okafor',
        email: 'jess@example.com',
        postcode: '',
        dateOfBirth: '1986-01-01',
        role: 'COACH',
      },
    ] satisfies User[]);

    await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [
      makeOffering('offering_unassigned', {
        title: 'Unassigned Session',
        assigneeCoachId: undefined,
        ownerCoachId: 'coach1',
      }),
      makeOffering('offering_off_platform', {
        title: 'Off Platform Group',
        sessionType: 'group',
        status: 'completed',
        scheduledAt: isoOffset(-20),
        price: 15,
        offPlatformParticipants: 2,
      }),
      makeOffering('offering_independent', {
        actingAs: 'self',
        clubId: undefined,
        title: 'Independent Session',
      }),
    ] satisfies SessionOffering[]);

    await apiClient.set(STORAGE_KEYS.BOOKINGS, [
      makeBooking('booking_support', {
        coachId: 'coach2',
        coachName: 'Jess Okafor',
        assigneeCoachId: 'coach2',
        scheduledAt: isoOffset(2),
        sessionSourceEntityId: 'offering_unassigned',
      }),
      makeBooking('booking_completion', {
        scheduledAt: isoOffset(-2),
        status: 'CONFIRMED',
        price: 0,
      }),
      makeBooking('booking_finance_open', {
        scheduledAt: isoOffset(-3),
        status: 'COMPLETED',
        price: 40,
      }),
      makeBooking('booking_finance_paid', {
        scheduledAt: isoOffset(-4),
        status: 'COMPLETED',
        commercialMode: 'COACH_OWNED',
        price: 25,
      }),
      makeBooking('booking_independent', {
        actingAs: 'self',
        clubId: undefined,
        scheduledAt: isoOffset(-3),
        status: 'COMPLETED',
        price: 99,
      }),
    ] satisfies Booking[]);

    await apiClient.set(STORAGE_KEYS.INVOICES, [
      makeInvoice('invoice_open', 'booking_finance_open', 40, {
        status: 'SENT',
      }),
      makeInvoice('invoice_paid', 'booking_finance_paid', 25, {
        status: 'PAID',
        paidAt: isoOffset(-1),
      }),
    ] satisfies Invoice[]);

    await apiClient.set(STORAGE_KEYS.PROBLEM_REPORTS, [
      {
        id: 'report_1',
        bookingId: 'booking_support',
        category: 'safety',
        description: 'Parent flagged a safeguarding concern after the session.',
        status: 'pending',
        createdAt: isoOffset(-1),
      },
      {
        id: 'report_2',
        bookingId: 'booking_finance_open',
        category: 'quality',
        description: 'Already resolved.',
        status: 'resolved',
        createdAt: isoOffset(-1),
      },
    ]);

    const result = await orgOwnerDashboardService.getDashboardData('club_lions', 'coach1');

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.club.id, 'club_lions');
    assert.equal(result.data.summary.activeOrgSessions, 1);
    assert.equal(result.data.summary.liveBookingCount, 1);
    assert.equal(result.data.summary.unassignedCount, 1);
    assert.equal(result.data.summary.awaitingCompletionCount, 1);
    assert.equal(result.data.summary.overdueCompletionCount, 1);
    assert.equal(result.data.summary.supportIssueCount, 1);
    assert.equal(result.data.unassignedWork[0]?.offeringId, 'offering_unassigned');

    assert.equal(result.data.finance.openTotal, 70);
    assert.equal(result.data.finance.orgCreditOpen, 70);
    assert.equal(result.data.finance.coachCollectedOpen, 0);
    assert.equal(result.data.finance.collectedTotal, 25);
    assert.equal(result.data.finance.owedCount, 2);
    assert.equal(result.data.finance.overdueCount, 2);

    assert.equal(result.data.supportIssues.length, 1);
    assert.equal(result.data.supportIssues[0]?.bookingId, 'booking_support');
    assert.equal(result.data.supportIssues[0]?.supportLabel, result.data.club.name);
    assert.ok(result.data.coachHealth.some((item) => item.coachId === 'coach1'));
    assert.equal(result.data.completionQueue[0]?.bookingId, 'booking_completion');
  });
});
