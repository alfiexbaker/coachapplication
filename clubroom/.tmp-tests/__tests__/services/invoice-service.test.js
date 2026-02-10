"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const invoice_service_1 = require("@/services/invoice-service");
const storage_service_1 = require("@/services/storage-service");
const STORAGE_KEY_INVOICES = 'clubroom.invoices';
(0, node_test_1.describe)('InvoiceService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await storage_service_1.storageService.removeItem(STORAGE_KEY_INVOICES);
    });
    (0, node_test_1.describe)('getUserInvoices', () => {
        (0, node_test_1.it)('should return empty array for user with no invoices', async () => {
            const userId = 'test-user-' + Math.random().toString(36).slice(2);
            const invoices = await invoice_service_1.invoiceService.getUserInvoices(userId);
            strict_1.default.equal(invoices.length, 0);
        });
        (0, node_test_1.it)('should return invoices for user as parent', async () => {
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
            await storage_service_1.storageService.setItem(STORAGE_KEY_INVOICES, [invoice]);
            const invoices = await invoice_service_1.invoiceService.getUserInvoices(userId);
            strict_1.default.equal(invoices.length, 1);
            strict_1.default.equal(invoices[0].userId, userId);
        });
        (0, node_test_1.it)('should limit results when limit parameter provided', async () => {
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
            await storage_service_1.storageService.setItem(STORAGE_KEY_INVOICES, invoices);
            const result = await invoice_service_1.invoiceService.getUserInvoices(userId, 5);
            strict_1.default.equal(result.length, 5);
        });
    });
    (0, node_test_1.describe)('getInvoiceById', () => {
        (0, node_test_1.it)('should return invoice when found', async () => {
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
            await storage_service_1.storageService.setItem(STORAGE_KEY_INVOICES, [invoice]);
            const result = await invoice_service_1.invoiceService.getInvoiceById(invoiceId);
            strict_1.default.ok(result);
            strict_1.default.equal(result?.id, invoiceId);
        });
        (0, node_test_1.it)('should return null when invoice not found', async () => {
            const result = await invoice_service_1.invoiceService.getInvoiceById('non-existent-invoice');
            strict_1.default.equal(result, null);
        });
    });
    (0, node_test_1.describe)('getInvoicesFiltered', () => {
        (0, node_test_1.it)('should filter by status', async () => {
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
                    status: 'PAID',
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
                    status: 'SENT',
                    createdAt: new Date().toISOString(),
                    coachBusinessName: 'Test Coaching',
                    coachBusinessEmail: 'coach@test.com',
                },
            ];
            await storage_service_1.storageService.setItem(STORAGE_KEY_INVOICES, invoices);
            const result = await invoice_service_1.invoiceService.getInvoicesFiltered(userId, { status: 'PAID' });
            strict_1.default.equal(result.length, 1);
            strict_1.default.equal(result[0].status, 'PAID');
        });
    });
    (0, node_test_1.describe)('markAsPaid', () => {
        (0, node_test_1.it)('should update invoice status to PAID', async () => {
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
                status: 'SENT',
                createdAt: new Date().toISOString(),
                coachBusinessName: 'Test Coaching',
                coachBusinessEmail: 'coach@test.com',
            };
            await storage_service_1.storageService.setItem(STORAGE_KEY_INVOICES, [invoice]);
            const result = await invoice_service_1.invoiceService.markAsPaid(invoiceId);
            strict_1.default.ok(result);
            strict_1.default.equal(result?.status, 'PAID');
            strict_1.default.ok(result?.paidAt);
        });
        (0, node_test_1.it)('should return null for non-existent invoice', async () => {
            const result = await invoice_service_1.invoiceService.markAsPaid('non-existent-invoice');
            strict_1.default.equal(result, null);
        });
        (0, node_test_1.it)('should return null for voided invoice', async () => {
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
                status: 'VOID',
                createdAt: new Date().toISOString(),
                coachBusinessName: 'Test Coaching',
                coachBusinessEmail: 'coach@test.com',
            };
            await storage_service_1.storageService.setItem(STORAGE_KEY_INVOICES, [invoice]);
            const result = await invoice_service_1.invoiceService.markAsPaid(invoiceId);
            strict_1.default.equal(result, null);
        });
    });
    (0, node_test_1.describe)('getInvoiceSummary', () => {
        (0, node_test_1.it)('should return summary with counts and totals', async () => {
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
                    status: 'PAID',
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
                    status: 'SENT',
                    createdAt: new Date().toISOString(),
                    coachBusinessName: 'Test Coaching',
                    coachBusinessEmail: 'coach@test.com',
                },
            ];
            await storage_service_1.storageService.setItem(STORAGE_KEY_INVOICES, invoices);
            const summary = await invoice_service_1.invoiceService.getInvoiceSummary(userId);
            strict_1.default.equal(summary.totalInvoices, 2);
            strict_1.default.equal(summary.paidCount, 1);
            strict_1.default.equal(summary.pendingCount, 1);
            strict_1.default.equal(summary.totalPaid, 50.0);
            strict_1.default.equal(summary.totalPending, 75.0);
        });
    });
});
