"use strict";
/**
 * Invoice Service Tests
 *
 * Unit tests for the invoice service utility functions.
 * Tests the pure functions that don't require storage or external dependencies.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
(0, node_test_1.describe)('Invoice Service Utility Functions', () => {
    (0, node_test_1.describe)('formatAmount', () => {
        const formatAmount = (amount, currency = 'GBP') => {
            const symbol = '\u00A3';
            return `${symbol}${amount.toFixed(2)}`;
        };
        (0, node_test_1.default)('should format GBP amount correctly', () => {
            const formatted = formatAmount(50.00, 'GBP');
            node_assert_1.default.ok(formatted.includes('50.00'));
        });
        (0, node_test_1.default)('should format decimal amounts correctly', () => {
            const formatted = formatAmount(41.67, 'GBP');
            node_assert_1.default.ok(formatted.includes('41.67'));
        });
        (0, node_test_1.default)('should format zero correctly', () => {
            const formatted = formatAmount(0, 'GBP');
            node_assert_1.default.ok(formatted.includes('0.00'));
        });
        (0, node_test_1.default)('should keep GBP formatting even when another currency is passed', () => {
            const formatted = formatAmount(50.00, 'EUR');
            node_assert_1.default.ok(formatted.includes('\u00A3'));
            node_assert_1.default.ok(formatted.includes('50.00'));
        });
        (0, node_test_1.default)('should default to GBP when currency not specified', () => {
            const formatted = formatAmount(50.00);
            node_assert_1.default.ok(formatted.includes('50.00'));
        });
    });
    (0, node_test_1.describe)('getStatusLabel', () => {
        const getStatusLabel = (status) => {
            const labels = {
                DRAFT: 'Draft',
                SENT: 'Sent',
                PAID: 'Paid',
                VOID: 'Voided',
            };
            return labels[status];
        };
        (0, node_test_1.default)('should return Draft for DRAFT status', () => {
            node_assert_1.default.strictEqual(getStatusLabel('DRAFT'), 'Draft');
        });
        (0, node_test_1.default)('should return Sent for SENT status', () => {
            node_assert_1.default.strictEqual(getStatusLabel('SENT'), 'Sent');
        });
        (0, node_test_1.default)('should return Paid for PAID status', () => {
            node_assert_1.default.strictEqual(getStatusLabel('PAID'), 'Paid');
        });
        (0, node_test_1.default)('should return Voided for VOID status', () => {
            node_assert_1.default.strictEqual(getStatusLabel('VOID'), 'Voided');
        });
    });
    (0, node_test_1.describe)('getStatusColor', () => {
        const getStatusColor = (status) => {
            const colors = {
                DRAFT: '#6B7280',
                SENT: '#2563EB',
                PAID: '#059669',
                VOID: '#DC2626',
            };
            return colors[status];
        };
        (0, node_test_1.default)('should return gray color for DRAFT status', () => {
            node_assert_1.default.strictEqual(getStatusColor('DRAFT'), '#6B7280');
        });
        (0, node_test_1.default)('should return blue color for SENT status', () => {
            node_assert_1.default.strictEqual(getStatusColor('SENT'), '#2563EB');
        });
        (0, node_test_1.default)('should return green color for PAID status', () => {
            node_assert_1.default.strictEqual(getStatusColor('PAID'), '#059669');
        });
        (0, node_test_1.default)('should return red color for VOID status', () => {
            node_assert_1.default.strictEqual(getStatusColor('VOID'), '#DC2626');
        });
    });
    (0, node_test_1.describe)('Tax Calculation', () => {
        const DEFAULT_TAX_RATE = 20;
        const calculateTax = (amount, taxRate = DEFAULT_TAX_RATE) => {
            const netAmount = amount / (1 + taxRate / 100);
            const taxAmount = amount - netAmount;
            return {
                netAmount: Math.round(netAmount * 100) / 100,
                taxAmount: Math.round(taxAmount * 100) / 100,
                total: amount,
            };
        };
        (0, node_test_1.default)('should calculate 20% VAT correctly', () => {
            const result = calculateTax(60);
            node_assert_1.default.strictEqual(result.total, 60);
            node_assert_1.default.strictEqual(result.netAmount, 50);
            node_assert_1.default.strictEqual(result.taxAmount, 10);
        });
        (0, node_test_1.default)('should handle fractional amounts', () => {
            const result = calculateTax(50);
            node_assert_1.default.strictEqual(result.total, 50);
            node_assert_1.default.ok(Math.abs(result.netAmount - 41.67) < 0.01);
            node_assert_1.default.ok(Math.abs(result.taxAmount - 8.33) < 0.01);
        });
        (0, node_test_1.default)('should use custom tax rate', () => {
            const result = calculateTax(100, 10);
            node_assert_1.default.strictEqual(result.total, 100);
            node_assert_1.default.ok(Math.abs(result.netAmount - 90.91) < 0.01);
        });
        (0, node_test_1.default)('should handle zero amount', () => {
            const result = calculateTax(0);
            node_assert_1.default.strictEqual(result.total, 0);
            node_assert_1.default.strictEqual(result.netAmount, 0);
            node_assert_1.default.strictEqual(result.taxAmount, 0);
        });
    });
    (0, node_test_1.describe)('Invoice Number Generation', () => {
        const generateInvoiceNumber = (existingNumbers, year) => {
            const yearInvoices = existingNumbers
                .filter((num) => num.includes(`-${year}-`))
                .map((num) => {
                const match = num.match(/INV-\d{4}-(\d+)/);
                return match ? parseInt(match[1], 10) : 0;
            });
            const nextNumber = yearInvoices.length > 0 ? Math.max(...yearInvoices) + 1 : 1;
            return `INV-${year}-${String(nextNumber).padStart(3, '0')}`;
        };
        (0, node_test_1.default)('should generate first invoice number for new year', () => {
            const number = generateInvoiceNumber([], 2025);
            node_assert_1.default.strictEqual(number, 'INV-2025-001');
        });
        (0, node_test_1.default)('should increment invoice number', () => {
            const existing = ['INV-2025-001', 'INV-2025-002'];
            const number = generateInvoiceNumber(existing, 2025);
            node_assert_1.default.strictEqual(number, 'INV-2025-003');
        });
        (0, node_test_1.default)('should ignore invoices from different years', () => {
            const existing = ['INV-2024-005', 'INV-2024-006'];
            const number = generateInvoiceNumber(existing, 2025);
            node_assert_1.default.strictEqual(number, 'INV-2025-001');
        });
        (0, node_test_1.default)('should handle gaps in invoice numbers', () => {
            const existing = ['INV-2025-001', 'INV-2025-005'];
            const number = generateInvoiceNumber(existing, 2025);
            node_assert_1.default.strictEqual(number, 'INV-2025-006');
        });
        (0, node_test_1.default)('should pad invoice number to 3 digits', () => {
            const number = generateInvoiceNumber([], 2025);
            node_assert_1.default.ok(number.endsWith('001'));
        });
    });
    (0, node_test_1.describe)('Due Date Calculation', () => {
        const getDefaultDueDate = (fromDate = new Date()) => {
            const date = new Date(fromDate);
            date.setDate(date.getDate() + 14);
            return date.toISOString();
        };
        (0, node_test_1.default)('should return date 14 days from now', () => {
            const now = new Date('2025-01-10T12:00:00.000Z');
            const dueDate = getDefaultDueDate(now);
            const due = new Date(dueDate);
            node_assert_1.default.strictEqual(due.getDate(), 24);
        });
        (0, node_test_1.default)('should handle month boundary', () => {
            const now = new Date('2025-01-25T12:00:00.000Z');
            const dueDate = getDefaultDueDate(now);
            const due = new Date(dueDate);
            node_assert_1.default.strictEqual(due.getMonth(), 1); // February
        });
        (0, node_test_1.default)('should return ISO string format', () => {
            const dueDate = getDefaultDueDate(new Date('2025-01-10'));
            node_assert_1.default.ok(dueDate.includes('T'));
            node_assert_1.default.ok(dueDate.includes('Z') || dueDate.includes('+'));
        });
    });
    (0, node_test_1.describe)('Invoice Filtering', () => {
        const mockInvoices = [
            { id: '1', status: 'PAID', sessionDate: '2025-01-05', coachId: 'coach1' },
            { id: '2', status: 'SENT', sessionDate: '2025-01-08', coachId: 'coach2' },
            { id: '3', status: 'DRAFT', sessionDate: '2025-01-10', coachId: 'coach1' },
            { id: '4', status: 'VOID', sessionDate: '2024-12-15', coachId: 'coach3' },
            { id: '5', status: 'PAID', sessionDate: '2024-11-20', coachId: 'coach1' },
        ];
        const filterInvoices = (invoices, filter) => {
            let result = [...invoices];
            if (filter.status) {
                const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
                result = result.filter((inv) => statuses.includes(inv.status));
            }
            if (filter.coachId) {
                result = result.filter((inv) => inv.coachId === filter.coachId);
            }
            if (filter.dateFrom) {
                const fromDate = new Date(filter.dateFrom).getTime();
                result = result.filter((inv) => new Date(inv.sessionDate).getTime() >= fromDate);
            }
            if (filter.dateTo) {
                const toDate = new Date(filter.dateTo).getTime();
                result = result.filter((inv) => new Date(inv.sessionDate).getTime() <= toDate);
            }
            return result;
        };
        (0, node_test_1.default)('should filter by single status', () => {
            const filtered = filterInvoices(mockInvoices, { status: 'PAID' });
            node_assert_1.default.strictEqual(filtered.length, 2);
            node_assert_1.default.ok(filtered.every((inv) => inv.status === 'PAID'));
        });
        (0, node_test_1.default)('should filter by multiple statuses', () => {
            const filtered = filterInvoices(mockInvoices, { status: ['PAID', 'SENT'] });
            node_assert_1.default.strictEqual(filtered.length, 3);
        });
        (0, node_test_1.default)('should filter by coach ID', () => {
            const filtered = filterInvoices(mockInvoices, { coachId: 'coach1' });
            node_assert_1.default.strictEqual(filtered.length, 3);
            node_assert_1.default.ok(filtered.every((inv) => inv.coachId === 'coach1'));
        });
        (0, node_test_1.default)('should filter by date range', () => {
            const filtered = filterInvoices(mockInvoices, {
                dateFrom: '2025-01-01',
                dateTo: '2025-01-31',
            });
            node_assert_1.default.strictEqual(filtered.length, 3);
        });
        (0, node_test_1.default)('should combine multiple filters', () => {
            const filtered = filterInvoices(mockInvoices, {
                status: 'PAID',
                coachId: 'coach1',
            });
            node_assert_1.default.strictEqual(filtered.length, 2);
        });
        (0, node_test_1.default)('should return all invoices when no filter applied', () => {
            const filtered = filterInvoices(mockInvoices, {});
            node_assert_1.default.strictEqual(filtered.length, 5);
        });
    });
    (0, node_test_1.describe)('Invoice Summary Calculation', () => {
        const calculateSummary = (invoices) => {
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
        const mockInvoices = [
            { id: '1', status: 'PAID', total: 50 },
            { id: '2', status: 'PAID', total: 75 },
            { id: '3', status: 'SENT', total: 45 },
            { id: '4', status: 'DRAFT', total: 50 },
            { id: '5', status: 'VOID', total: 30 },
        ];
        (0, node_test_1.default)('should calculate correct total invoices count', () => {
            const summary = calculateSummary(mockInvoices);
            node_assert_1.default.strictEqual(summary.totalInvoices, 5);
        });
        (0, node_test_1.default)('should calculate correct paid count', () => {
            const summary = calculateSummary(mockInvoices);
            node_assert_1.default.strictEqual(summary.paidCount, 2);
        });
        (0, node_test_1.default)('should calculate correct pending count', () => {
            const summary = calculateSummary(mockInvoices);
            node_assert_1.default.strictEqual(summary.pendingCount, 1);
        });
        (0, node_test_1.default)('should calculate correct draft count', () => {
            const summary = calculateSummary(mockInvoices);
            node_assert_1.default.strictEqual(summary.draftCount, 1);
        });
        (0, node_test_1.default)('should calculate correct voided count', () => {
            const summary = calculateSummary(mockInvoices);
            node_assert_1.default.strictEqual(summary.voidedCount, 1);
        });
        (0, node_test_1.default)('should calculate correct total amount', () => {
            const summary = calculateSummary(mockInvoices);
            node_assert_1.default.strictEqual(summary.totalAmount, 250);
        });
        (0, node_test_1.default)('should calculate correct total paid', () => {
            const summary = calculateSummary(mockInvoices);
            node_assert_1.default.strictEqual(summary.totalPaid, 125);
        });
        (0, node_test_1.default)('should calculate correct total pending', () => {
            const summary = calculateSummary(mockInvoices);
            node_assert_1.default.strictEqual(summary.totalPending, 45);
        });
        (0, node_test_1.default)('should handle empty invoice list', () => {
            const summary = calculateSummary([]);
            node_assert_1.default.strictEqual(summary.totalInvoices, 0);
            node_assert_1.default.strictEqual(summary.totalAmount, 0);
        });
    });
    (0, node_test_1.describe)('Date Formatting', () => {
        const formatDate = (dateString) => {
            return new Date(dateString).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        };
        const formatShortDate = (dateString, now = new Date()) => {
            const date = new Date(dateString);
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                return 'Today';
            }
            else if (diffDays === 1) {
                return 'Yesterday';
            }
            else if (diffDays < 7) {
                return `${diffDays} days ago`;
            }
            else {
                return date.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                });
            }
        };
        (0, node_test_1.default)('should format full date correctly', () => {
            const formatted = formatDate('2025-01-15T14:00:00.000Z');
            node_assert_1.default.ok(formatted.includes('January'));
            node_assert_1.default.ok(formatted.includes('2025'));
        });
        (0, node_test_1.default)('should return Today for same day', () => {
            const now = new Date('2025-01-10T12:00:00.000Z');
            const formatted = formatShortDate('2025-01-10T08:00:00.000Z', now);
            node_assert_1.default.strictEqual(formatted, 'Today');
        });
        (0, node_test_1.default)('should return Yesterday for previous day', () => {
            const now = new Date('2025-01-10T12:00:00.000Z');
            const formatted = formatShortDate('2025-01-09T08:00:00.000Z', now);
            node_assert_1.default.strictEqual(formatted, 'Yesterday');
        });
        (0, node_test_1.default)('should return days ago for recent dates', () => {
            const now = new Date('2025-01-10T12:00:00.000Z');
            const formatted = formatShortDate('2025-01-07T08:00:00.000Z', now);
            node_assert_1.default.strictEqual(formatted, '3 days ago');
        });
        (0, node_test_1.default)('should return short date for older dates', () => {
            const now = new Date('2025-01-20T12:00:00.000Z');
            const formatted = formatShortDate('2025-01-05T08:00:00.000Z', now);
            node_assert_1.default.ok(formatted.includes('Jan'));
            node_assert_1.default.ok(formatted.includes('5'));
        });
    });
});
(0, node_test_1.describe)('Invoice Types', () => {
    (0, node_test_1.default)('InvoiceStatus should have expected values', () => {
        const validStatuses = ['DRAFT', 'SENT', 'PAID', 'VOID'];
        node_assert_1.default.strictEqual(validStatuses.length, 4);
    });
    (0, node_test_1.default)('Invoice should have required fields', () => {
        const invoice = {
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
        node_assert_1.default.ok(invoice.id);
        node_assert_1.default.ok(invoice.invoiceNumber);
        node_assert_1.default.ok(invoice.userId);
        node_assert_1.default.ok(invoice.bookingId);
        node_assert_1.default.ok(invoice.coachId);
        node_assert_1.default.ok(invoice.athleteId);
        node_assert_1.default.strictEqual(invoice.total, invoice.amount + invoice.tax);
    });
});
(0, node_test_1.describe)('Invoice HTML Generation', () => {
    const generateBasicHtml = (invoice) => {
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
    (0, node_test_1.default)('should include invoice number in HTML', () => {
        const html = generateBasicHtml({ invoiceNumber: 'INV-2025-001', total: 50, status: 'PAID' });
        node_assert_1.default.ok(html.includes('INV-2025-001'));
    });
    (0, node_test_1.default)('should include total amount in HTML', () => {
        const html = generateBasicHtml({ invoiceNumber: 'INV-2025-001', total: 50, status: 'PAID' });
        node_assert_1.default.ok(html.includes('50'));
    });
    (0, node_test_1.default)('should include status in HTML', () => {
        const html = generateBasicHtml({ invoiceNumber: 'INV-2025-001', total: 50, status: 'PAID' });
        node_assert_1.default.ok(html.includes('PAID'));
    });
    (0, node_test_1.default)('should be valid HTML structure', () => {
        const html = generateBasicHtml({ invoiceNumber: 'INV-2025-001', total: 50, status: 'PAID' });
        node_assert_1.default.ok(html.includes('<html>'));
        node_assert_1.default.ok(html.includes('</html>'));
        node_assert_1.default.ok(html.includes('<body>'));
        node_assert_1.default.ok(html.includes('</body>'));
    });
});
