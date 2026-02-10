import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { invoiceService } from '@/services/invoice-service';
import { storageService } from '@/services/storage-service';

const STORAGE_KEY_INVOICES = 'clubroom.invoices';

describe('InvoiceService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEY_INVOICES);
  });

  describe('getUserInvoices', () => {
    it('should return empty array for user with no invoices', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const invoices = await invoiceService.getUserInvoices(userId);

      assert.equal(invoices.length, 0);
    });

    it('should return invoices for user as parent', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const invoice = {
        id: 'test-invoice-' + Math.random().toString(36).slice(2),
        invoiceNumber: 'INV-2026-001',
        userId,
        userName: 'Test User',
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Test Athlete',
        sessionDate: '2026-03-15T14:00:00.000Z',
        sessionType: '1-on-1 Training',
        sessionLocation: 'Test Venue',
        sessionDuration: 60,
        amount: 41.67,
        tax: 8.33,
        taxRate: 20,
        total: 50.0,
        currency: 'GBP',
        status: 'PAID',
        createdAt: new Date().toISOString(),
        coachBusinessName: 'Test Coaching',
        coachBusinessEmail: 'coach@test.com',
      };

      await storageService.setItem(STORAGE_KEY_INVOICES, [invoice]);

      const invoices = await invoiceService.getUserInvoices(userId);

      assert.equal(invoices.length, 1);
      assert.equal(invoices[0].userId, userId);
    });

    it('should limit results when limit parameter provided', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const invoices = Array.from({ length: 10 }, (_, i) => ({
        id: 'test-invoice-' + i + '-' + Math.random().toString(36).slice(2),
        invoiceNumber: `INV-2026-${String(i + 1).padStart(3, '0')}`,
        userId,
        userName: 'Test User',
        bookingId: 'test-booking-' + i + '-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Test Athlete',
        sessionDate: '2026-03-15T14:00:00.000Z',
        sessionType: '1-on-1 Training',
        sessionLocation: 'Test Venue',
        sessionDuration: 60,
        amount: 41.67,
        tax: 8.33,
        taxRate: 20,
        total: 50.0,
        currency: 'GBP',
        status: 'PAID',
        createdAt: new Date().toISOString(),
        coachBusinessName: 'Test Coaching',
        coachBusinessEmail: 'coach@test.com',
      }));

      await storageService.setItem(STORAGE_KEY_INVOICES, invoices);

      const result = await invoiceService.getUserInvoices(userId, 5);

      assert.equal(result.length, 5);
    });
  });

  describe('getInvoiceById', () => {
    it('should return invoice when found', async () => {
      const invoiceId = 'test-invoice-' + Math.random().toString(36).slice(2);
      const invoice = {
        id: invoiceId,
        invoiceNumber: 'INV-2026-001',
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Test Athlete',
        sessionDate: '2026-03-15T14:00:00.000Z',
        sessionType: '1-on-1 Training',
        sessionLocation: 'Test Venue',
        sessionDuration: 60,
        amount: 41.67,
        tax: 8.33,
        taxRate: 20,
        total: 50.0,
        currency: 'GBP',
        status: 'SENT',
        createdAt: new Date().toISOString(),
        coachBusinessName: 'Test Coaching',
        coachBusinessEmail: 'coach@test.com',
      };

      await storageService.setItem(STORAGE_KEY_INVOICES, [invoice]);

      const result = await invoiceService.getInvoiceById(invoiceId);

      assert.ok(result);
      assert.equal(result?.id, invoiceId);
    });

    it('should return null when invoice not found', async () => {
      const result = await invoiceService.getInvoiceById('non-existent-invoice');

      assert.equal(result, null);
    });
  });

  describe('getInvoicesFiltered', () => {
    it('should filter by status', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const invoices = [
        {
          id: 'test-invoice-1-' + Math.random().toString(36).slice(2),
          invoiceNumber: 'INV-2026-001',
          userId,
          userName: 'Test User',
          bookingId: 'test-booking-1-' + Math.random().toString(36).slice(2),
          coachId: 'test-coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
          athleteName: 'Test Athlete',
          sessionDate: '2026-03-15T14:00:00.000Z',
          sessionType: '1-on-1',
          sessionLocation: 'Test Venue',
          sessionDuration: 60,
          amount: 41.67,
          tax: 8.33,
          taxRate: 20,
          total: 50.0,
          currency: 'GBP',
          status: 'PAID' as const,
          createdAt: new Date().toISOString(),
          coachBusinessName: 'Test Coaching',
          coachBusinessEmail: 'coach@test.com',
        },
        {
          id: 'test-invoice-2-' + Math.random().toString(36).slice(2),
          invoiceNumber: 'INV-2026-002',
          userId,
          userName: 'Test User',
          bookingId: 'test-booking-2-' + Math.random().toString(36).slice(2),
          coachId: 'test-coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
          athleteName: 'Test Athlete',
          sessionDate: '2026-03-16T14:00:00.000Z',
          sessionType: '1-on-1',
          sessionLocation: 'Test Venue',
          sessionDuration: 60,
          amount: 41.67,
          tax: 8.33,
          taxRate: 20,
          total: 50.0,
          currency: 'GBP',
          status: 'SENT' as const,
          createdAt: new Date().toISOString(),
          coachBusinessName: 'Test Coaching',
          coachBusinessEmail: 'coach@test.com',
        },
      ];

      await storageService.setItem(STORAGE_KEY_INVOICES, invoices);

      const result = await invoiceService.getInvoicesFiltered(userId, { status: 'PAID' });

      assert.equal(result.length, 1);
      assert.equal(result[0].status, 'PAID');
    });
  });

  describe('markAsPaid', () => {
    it('should update invoice status to PAID', async () => {
      const invoiceId = 'test-invoice-' + Math.random().toString(36).slice(2);
      const invoice = {
        id: invoiceId,
        invoiceNumber: 'INV-2026-001',
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Test Athlete',
        sessionDate: '2026-03-15T14:00:00.000Z',
        sessionType: '1-on-1',
        sessionLocation: 'Test Venue',
        sessionDuration: 60,
        amount: 41.67,
        tax: 8.33,
        taxRate: 20,
        total: 50.0,
        currency: 'GBP',
        status: 'SENT' as const,
        createdAt: new Date().toISOString(),
        coachBusinessName: 'Test Coaching',
        coachBusinessEmail: 'coach@test.com',
      };

      await storageService.setItem(STORAGE_KEY_INVOICES, [invoice]);

      const result = await invoiceService.markAsPaid(invoiceId);

      assert.ok(result);
      assert.equal(result?.status, 'PAID');
      assert.ok(result?.paidAt);
    });

    it('should return null for non-existent invoice', async () => {
      const result = await invoiceService.markAsPaid('non-existent-invoice');

      assert.equal(result, null);
    });

    it('should return null for voided invoice', async () => {
      const invoiceId = 'test-invoice-' + Math.random().toString(36).slice(2);
      const invoice = {
        id: invoiceId,
        invoiceNumber: 'INV-2026-001',
        userId: 'test-user-' + Math.random().toString(36).slice(2),
        userName: 'Test User',
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
        athleteName: 'Test Athlete',
        sessionDate: '2026-03-15T14:00:00.000Z',
        sessionType: '1-on-1',
        sessionLocation: 'Test Venue',
        sessionDuration: 60,
        amount: 41.67,
        tax: 8.33,
        taxRate: 20,
        total: 50.0,
        currency: 'GBP',
        status: 'VOID' as const,
        createdAt: new Date().toISOString(),
        coachBusinessName: 'Test Coaching',
        coachBusinessEmail: 'coach@test.com',
      };

      await storageService.setItem(STORAGE_KEY_INVOICES, [invoice]);

      const result = await invoiceService.markAsPaid(invoiceId);

      assert.equal(result, null);
    });
  });

  describe('getInvoiceSummary', () => {
    it('should return summary with counts and totals', async () => {
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const invoices = [
        {
          id: 'test-invoice-1-' + Math.random().toString(36).slice(2),
          invoiceNumber: 'INV-2026-001',
          userId,
          userName: 'Test User',
          bookingId: 'test-booking-1-' + Math.random().toString(36).slice(2),
          coachId: 'test-coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
          athleteName: 'Test Athlete',
          sessionDate: '2026-03-15T14:00:00.000Z',
          sessionType: '1-on-1',
          sessionLocation: 'Test Venue',
          sessionDuration: 60,
          amount: 41.67,
          tax: 8.33,
          taxRate: 20,
          total: 50.0,
          currency: 'GBP',
          status: 'PAID' as const,
          createdAt: new Date().toISOString(),
          coachBusinessName: 'Test Coaching',
          coachBusinessEmail: 'coach@test.com',
        },
        {
          id: 'test-invoice-2-' + Math.random().toString(36).slice(2),
          invoiceNumber: 'INV-2026-002',
          userId,
          userName: 'Test User',
          bookingId: 'test-booking-2-' + Math.random().toString(36).slice(2),
          coachId: 'test-coach-' + Math.random().toString(36).slice(2),
          coachName: 'Test Coach',
          athleteId: 'test-athlete-' + Math.random().toString(36).slice(2),
          athleteName: 'Test Athlete',
          sessionDate: '2026-03-16T14:00:00.000Z',
          sessionType: '1-on-1',
          sessionLocation: 'Test Venue',
          sessionDuration: 60,
          amount: 62.50,
          tax: 12.50,
          taxRate: 20,
          total: 75.0,
          currency: 'GBP',
          status: 'SENT' as const,
          createdAt: new Date().toISOString(),
          coachBusinessName: 'Test Coaching',
          coachBusinessEmail: 'coach@test.com',
        },
      ];

      await storageService.setItem(STORAGE_KEY_INVOICES, invoices);

      const summary = await invoiceService.getInvoiceSummary(userId);

      assert.equal(summary.totalInvoices, 2);
      assert.equal(summary.paidCount, 1);
      assert.equal(summary.pendingCount, 1);
      assert.equal(summary.totalPaid, 50.0);
      assert.equal(summary.totalPending, 75.0);
    });
  });
});
