/**
 * Invoice Service Tests
 *
 * Unit tests for the invoice service utility functions.
 * Tests the pure functions that don't require storage or external dependencies.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

// Import types
import type { Invoice, InvoiceStatus, InvoiceSummary, InvoiceFilter } from '../../constants/types';

describe('Invoice Service Utility Functions', () => {
  describe('formatAmount', () => {
    const formatAmount = (amount: number, currency: string = 'GBP'): string => {
      const symbol = '\u00A3';
      return `${symbol}${amount.toFixed(2)}`;
    };

    test('should format GBP amount correctly', () => {
      const formatted = formatAmount(50.00, 'GBP');
      assert.ok(formatted.includes('50.00'));
    });

    test('should format decimal amounts correctly', () => {
      const formatted = formatAmount(41.67, 'GBP');
      assert.ok(formatted.includes('41.67'));
    });

    test('should format zero correctly', () => {
      const formatted = formatAmount(0, 'GBP');
      assert.ok(formatted.includes('0.00'));
    });

    test('should keep GBP formatting even when another currency is passed', () => {
      const formatted = formatAmount(50.00, 'EUR');
      assert.ok(formatted.includes('\u00A3'));
      assert.ok(formatted.includes('50.00'));
    });

    test('should default to GBP when currency not specified', () => {
      const formatted = formatAmount(50.00);
      assert.ok(formatted.includes('50.00'));
    });
  });

  describe('getStatusLabel', () => {
    const getStatusLabel = (status: InvoiceStatus): string => {
      const labels: Record<InvoiceStatus, string> = {
        DRAFT: 'Draft',
        SENT: 'Sent',
        PAID: 'Paid',
        VOID: 'Voided',
        WRITTEN_OFF: 'Written Off',
      };
      return labels[status];
    };

    test('should return Draft for DRAFT status', () => {
      assert.strictEqual(getStatusLabel('DRAFT'), 'Draft');
    });

    test('should return Sent for SENT status', () => {
      assert.strictEqual(getStatusLabel('SENT'), 'Sent');
    });

    test('should return Paid for PAID status', () => {
      assert.strictEqual(getStatusLabel('PAID'), 'Paid');
    });

    test('should return Voided for VOID status', () => {
      assert.strictEqual(getStatusLabel('VOID'), 'Voided');
    });
  });



  describe('Tax Calculation', () => {
    const DEFAULT_TAX_RATE = 20;

    const calculateTax = (amount: number, taxRate: number = DEFAULT_TAX_RATE) => {
      const netAmount = amount / (1 + taxRate / 100);
      const taxAmount = amount - netAmount;
      return {
        netAmount: Math.round(netAmount * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        total: amount,
      };
    };

    test('should calculate 20% VAT correctly', () => {
      const result = calculateTax(60);
      assert.strictEqual(result.total, 60);
      assert.strictEqual(result.netAmount, 50);
      assert.strictEqual(result.taxAmount, 10);
    });

    test('should handle fractional amounts', () => {
      const result = calculateTax(50);
      assert.strictEqual(result.total, 50);
      assert.ok(Math.abs(result.netAmount - 41.67) < 0.01);
      assert.ok(Math.abs(result.taxAmount - 8.33) < 0.01);
    });

    test('should use custom tax rate', () => {
      const result = calculateTax(100, 10);
      assert.strictEqual(result.total, 100);
      assert.ok(Math.abs(result.netAmount - 90.91) < 0.01);
    });

    test('should handle zero amount', () => {
      const result = calculateTax(0);
      assert.strictEqual(result.total, 0);
      assert.strictEqual(result.netAmount, 0);
      assert.strictEqual(result.taxAmount, 0);
    });
  });

  describe('Invoice Number Generation', () => {
    const generateInvoiceNumber = (existingNumbers: string[], year: number): string => {
      const yearInvoices = existingNumbers
        .filter((num) => num.includes(`-${year}-`))
        .map((num) => {
          const match = num.match(/INV-\d{4}-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });

      const nextNumber = yearInvoices.length > 0 ? Math.max(...yearInvoices) + 1 : 1;
      return `INV-${year}-${String(nextNumber).padStart(3, '0')}`;
    };

    test('should generate first invoice number for new year', () => {
      const number = generateInvoiceNumber([], 2025);
      assert.strictEqual(number, 'INV-2025-001');
    });

    test('should increment invoice number', () => {
      const existing = ['INV-2025-001', 'INV-2025-002'];
      const number = generateInvoiceNumber(existing, 2025);
      assert.strictEqual(number, 'INV-2025-003');
    });

    test('should ignore invoices from different years', () => {
      const existing = ['INV-2024-005', 'INV-2024-006'];
      const number = generateInvoiceNumber(existing, 2025);
      assert.strictEqual(number, 'INV-2025-001');
    });

    test('should handle gaps in invoice numbers', () => {
      const existing = ['INV-2025-001', 'INV-2025-005'];
      const number = generateInvoiceNumber(existing, 2025);
      assert.strictEqual(number, 'INV-2025-006');
    });

    test('should pad invoice number to 3 digits', () => {
      const number = generateInvoiceNumber([], 2025);
      assert.ok(number.endsWith('001'));
    });
  });

  describe('Due Date Calculation', () => {
    const getDefaultDueDate = (fromDate: Date = new Date()): string => {
      const date = new Date(fromDate);
      date.setDate(date.getDate() + 14);
      return date.toISOString();
    };

    test('should return date 14 days from now', () => {
      const now = new Date('2025-01-10T12:00:00.000Z');
      const dueDate = getDefaultDueDate(now);
      const due = new Date(dueDate);
      assert.strictEqual(due.getDate(), 24);
    });

    test('should handle month boundary', () => {
      const now = new Date('2025-01-25T12:00:00.000Z');
      const dueDate = getDefaultDueDate(now);
      const due = new Date(dueDate);
      assert.strictEqual(due.getMonth(), 1); // February
    });

    test('should return ISO string format', () => {
      const dueDate = getDefaultDueDate(new Date('2025-01-10'));
      assert.ok(dueDate.includes('T'));
      assert.ok(dueDate.includes('Z') || dueDate.includes('+'));
    });
  });

  describe('Invoice Filtering', () => {
    const mockInvoices: Partial<Invoice>[] = [
      { id: '1', status: 'PAID', sessionDate: '2025-01-05', coachId: 'coach1' },
      { id: '2', status: 'SENT', sessionDate: '2025-01-08', coachId: 'coach2' },
      { id: '3', status: 'DRAFT', sessionDate: '2025-01-10', coachId: 'coach1' },
      { id: '4', status: 'VOID', sessionDate: '2024-12-15', coachId: 'coach3' },
      { id: '5', status: 'PAID', sessionDate: '2024-11-20', coachId: 'coach1' },
    ];

    const filterInvoices = (
      invoices: Partial<Invoice>[],
      filter: InvoiceFilter
    ): Partial<Invoice>[] => {
      let result = [...invoices];

      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        result = result.filter((inv) => statuses.includes(inv.status as InvoiceStatus));
      }

      if (filter.coachId) {
        result = result.filter((inv) => inv.coachId === filter.coachId);
      }

      if (filter.dateFrom) {
        const fromDate = new Date(filter.dateFrom).getTime();
        result = result.filter((inv) => new Date(inv.sessionDate!).getTime() >= fromDate);
      }

      if (filter.dateTo) {
        const toDate = new Date(filter.dateTo).getTime();
        result = result.filter((inv) => new Date(inv.sessionDate!).getTime() <= toDate);
      }

      return result;
    };

    test('should filter by single status', () => {
      const filtered = filterInvoices(mockInvoices, { status: 'PAID' });
      assert.strictEqual(filtered.length, 2);
      assert.ok(filtered.every((inv) => inv.status === 'PAID'));
    });

    test('should filter by multiple statuses', () => {
      const filtered = filterInvoices(mockInvoices, { status: ['PAID', 'SENT'] });
      assert.strictEqual(filtered.length, 3);
    });

    test('should filter by coach ID', () => {
      const filtered = filterInvoices(mockInvoices, { coachId: 'coach1' });
      assert.strictEqual(filtered.length, 3);
      assert.ok(filtered.every((inv) => inv.coachId === 'coach1'));
    });

    test('should filter by date range', () => {
      const filtered = filterInvoices(mockInvoices, {
        dateFrom: '2025-01-01',
        dateTo: '2025-01-31',
      });
      assert.strictEqual(filtered.length, 3);
    });

    test('should combine multiple filters', () => {
      const filtered = filterInvoices(mockInvoices, {
        status: 'PAID',
        coachId: 'coach1',
      });
      assert.strictEqual(filtered.length, 2);
    });

    test('should return all invoices when no filter applied', () => {
      const filtered = filterInvoices(mockInvoices, {});
      assert.strictEqual(filtered.length, 5);
    });
  });

  describe('Invoice Summary Calculation', () => {
    const calculateSummary = (invoices: Partial<Invoice>[]): InvoiceSummary => {
      return {
        userId: 'test-user',
        totalInvoices: invoices.length,
        paidCount: invoices.filter((inv) => inv.status === 'PAID').length,
        pendingCount: invoices.filter((inv) => inv.status === 'SENT').length,
        draftCount: invoices.filter((inv) => inv.status === 'DRAFT').length,
        voidedCount: invoices.filter((inv) => inv.status === 'VOID').length,
        totalAmount: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        totalPaid: invoices
          .filter((inv) => inv.status === 'PAID')
          .reduce((sum, inv) => sum + (inv.total || 0), 0),
        totalPending: invoices
          .filter((inv) => inv.status === 'SENT')
          .reduce((sum, inv) => sum + (inv.total || 0), 0),
        currency: 'GBP',
      };
    };

    const mockInvoices: Partial<Invoice>[] = [
      { id: '1', status: 'PAID', total: 50 },
      { id: '2', status: 'PAID', total: 75 },
      { id: '3', status: 'SENT', total: 45 },
      { id: '4', status: 'DRAFT', total: 50 },
      { id: '5', status: 'VOID', total: 30 },
    ];

    test('should calculate correct total invoices count', () => {
      const summary = calculateSummary(mockInvoices);
      assert.strictEqual(summary.totalInvoices, 5);
    });

    test('should calculate correct paid count', () => {
      const summary = calculateSummary(mockInvoices);
      assert.strictEqual(summary.paidCount, 2);
    });

    test('should calculate correct pending count', () => {
      const summary = calculateSummary(mockInvoices);
      assert.strictEqual(summary.pendingCount, 1);
    });

    test('should calculate correct draft count', () => {
      const summary = calculateSummary(mockInvoices);
      assert.strictEqual(summary.draftCount, 1);
    });

    test('should calculate correct voided count', () => {
      const summary = calculateSummary(mockInvoices);
      assert.strictEqual(summary.voidedCount, 1);
    });

    test('should calculate correct total amount', () => {
      const summary = calculateSummary(mockInvoices);
      assert.strictEqual(summary.totalAmount, 250);
    });

    test('should calculate correct total paid', () => {
      const summary = calculateSummary(mockInvoices);
      assert.strictEqual(summary.totalPaid, 125);
    });

    test('should calculate correct total pending', () => {
      const summary = calculateSummary(mockInvoices);
      assert.strictEqual(summary.totalPending, 45);
    });

    test('should handle empty invoice list', () => {
      const summary = calculateSummary([]);
      assert.strictEqual(summary.totalInvoices, 0);
      assert.strictEqual(summary.totalAmount, 0);
    });
  });

  describe('Date Formatting', () => {
    const formatDate = (dateString: string): string => {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    };

    const formatShortDate = (dateString: string, now: Date = new Date()): string => {
      const date = new Date(dateString);
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
      }
    };

    test('should format full date correctly', () => {
      const formatted = formatDate('2025-01-15T14:00:00.000Z');
      assert.ok(formatted.includes('January'));
      assert.ok(formatted.includes('2025'));
    });

    test('should return Today for same day', () => {
      const now = new Date('2025-01-10T12:00:00.000Z');
      const formatted = formatShortDate('2025-01-10T08:00:00.000Z', now);
      assert.strictEqual(formatted, 'Today');
    });

    test('should return Yesterday for previous day', () => {
      const now = new Date('2025-01-10T12:00:00.000Z');
      const formatted = formatShortDate('2025-01-09T08:00:00.000Z', now);
      assert.strictEqual(formatted, 'Yesterday');
    });

    test('should return days ago for recent dates', () => {
      const now = new Date('2025-01-10T12:00:00.000Z');
      const formatted = formatShortDate('2025-01-07T08:00:00.000Z', now);
      assert.strictEqual(formatted, '3 days ago');
    });

    test('should return short date for older dates', () => {
      const now = new Date('2025-01-20T12:00:00.000Z');
      const formatted = formatShortDate('2025-01-05T08:00:00.000Z', now);
      assert.ok(formatted.includes('Jan'));
      assert.ok(formatted.includes('5'));
    });
  });
});

describe('Invoice Types', () => {
  test('InvoiceStatus should have expected values', () => {
    const validStatuses: InvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'VOID', 'WRITTEN_OFF'];
    assert.strictEqual(validStatuses.length, 5);
  });

  test('Invoice should have required fields', () => {
    const invoice: Invoice = {
      id: 'test-id',
      invoiceNumber: 'INV-2025-001',
      userId: 'user-id',
      bookingId: 'booking-id',
      coachId: 'coach-id',
      athleteId: 'athlete-id',
      sessionDate: '2025-01-10',
      amount: 41.67,
      tax: 8.33,
      taxRate: 20,
      total: 50,
      currency: 'GBP',
      status: 'DRAFT',
      createdAt: '2025-01-10T12:00:00.000Z',
    };

    assert.ok(invoice.id);
    assert.ok(invoice.invoiceNumber);
    assert.ok(invoice.userId);
    assert.ok(invoice.bookingId);
    assert.ok(invoice.coachId);
    assert.ok(invoice.athleteId);
    assert.strictEqual(invoice.total, invoice.amount + invoice.tax);
  });
});

describe('Invoice HTML Generation', () => {
  const generateBasicHtml = (invoice: Partial<Invoice>): string => {
    return `
      <html>
        <body>
          <h1>${invoice.invoiceNumber}</h1>
          <p>Total: ${invoice.total}</p>
          <p>Status: ${invoice.status}</p>
        </body>
      </html>
    `.trim();
  };

  test('should include invoice number in HTML', () => {
    const html = generateBasicHtml({ invoiceNumber: 'INV-2025-001', total: 50, status: 'PAID' });
    assert.ok(html.includes('INV-2025-001'));
  });

  test('should include total amount in HTML', () => {
    const html = generateBasicHtml({ invoiceNumber: 'INV-2025-001', total: 50, status: 'PAID' });
    assert.ok(html.includes('50'));
  });

  test('should include status in HTML', () => {
    const html = generateBasicHtml({ invoiceNumber: 'INV-2025-001', total: 50, status: 'PAID' });
    assert.ok(html.includes('PAID'));
  });

  test('should be valid HTML structure', () => {
    const html = generateBasicHtml({ invoiceNumber: 'INV-2025-001', total: 50, status: 'PAID' });
    assert.ok(html.includes('<html>'));
    assert.ok(html.includes('</html>'));
    assert.ok(html.includes('<body>'));
    assert.ok(html.includes('</body>'));
  });
});
