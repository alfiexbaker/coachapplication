"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceService = void 0;
const FileSystem = __importStar(require("expo-file-system/legacy"));
const Sharing = __importStar(require("expo-sharing"));
const config_1 = require("@/constants/config");
const storage_service_1 = require("./storage-service");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const invoice_template_1 = require("./invoice-template");
// ============================================================================
// CONFIGURATION
// ============================================================================
const STORAGE_KEY_INVOICES = 'clubroom.invoices';
const USE_MOCK = config_1.api.useMock; // Toggle for mock vs API mode
const logger = (0, logger_1.createLogger)('InvoiceService');
// Default tax rate for UK VAT
const DEFAULT_TAX_RATE = 20;
// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_INVOICES = [
    {
        id: 'inv_001',
        invoiceNumber: 'INV-2025-001',
        userId: 'parent1',
        userName: 'John Henderson',
        bookingId: 'booking_001',
        coachName: 'Sarah Mitchell',
        coachId: 'coach1',
        athleteName: 'Tom Henderson',
        athleteId: 'user1',
        sessionDate: '2025-01-05T14:00:00.000Z',
        sessionType: '1-on-1 Training',
        sessionLocation: 'Central Park Training Ground',
        sessionDuration: 60,
        amount: 41.67,
        tax: 8.33,
        taxRate: 20,
        total: 50.0,
        currency: 'GBP',
        status: 'PAID',
        createdAt: '2025-01-05T15:00:00.000Z',
        paidAt: '2025-01-05T15:00:00.000Z',
        coachBusinessName: 'Sarah Mitchell Coaching',
        coachBusinessEmail: 'sarah.mitchell@coach.com',
        notes: 'Thank you for your business!',
    },
    {
        id: 'inv_002',
        invoiceNumber: 'INV-2025-002',
        userId: 'parent1',
        userName: 'John Henderson',
        bookingId: 'booking_002',
        coachName: 'Mike Thompson',
        coachId: 'coach2',
        athleteName: 'Emma Henderson',
        athleteId: 'user2',
        sessionDate: '2025-01-08T10:00:00.000Z',
        sessionType: 'Group Training - Striker Camp',
        sessionLocation: 'Hackney Sports Centre',
        sessionDuration: 90,
        amount: 62.50,
        tax: 12.50,
        taxRate: 20,
        total: 75.0,
        currency: 'GBP',
        status: 'SENT',
        createdAt: '2025-01-08T12:00:00.000Z',
        sentAt: '2025-01-08T12:30:00.000Z',
        sentTo: 'john.henderson@email.com',
        dueDate: '2025-01-22T00:00:00.000Z',
        coachBusinessName: 'Thompson Football Academy',
        coachBusinessEmail: 'mike.thompson@coach.com',
    },
    {
        id: 'inv_003',
        invoiceNumber: 'INV-2025-003',
        userId: 'parent1',
        userName: 'John Henderson',
        bookingId: 'booking_003',
        coachName: 'Sarah Mitchell',
        coachId: 'coach1',
        athleteName: 'Tom Henderson',
        athleteId: 'user1',
        sessionDate: '2025-01-10T16:00:00.000Z',
        sessionType: '1-on-1 Training',
        sessionLocation: 'Central Park Training Ground',
        sessionDuration: 60,
        amount: 41.67,
        tax: 8.33,
        taxRate: 20,
        total: 50.0,
        currency: 'GBP',
        status: 'DRAFT',
        createdAt: '2025-01-10T17:00:00.000Z',
        coachBusinessName: 'Sarah Mitchell Coaching',
        coachBusinessEmail: 'sarah.mitchell@coach.com',
    },
    {
        id: 'inv_004',
        invoiceNumber: 'INV-2024-045',
        userId: 'parent1',
        userName: 'John Henderson',
        bookingId: 'booking_old_001',
        coachName: 'David Roberts',
        coachId: 'coach3',
        athleteName: 'Tom Henderson',
        athleteId: 'user1',
        sessionDate: '2024-12-15T14:00:00.000Z',
        sessionType: 'Goalkeeper Training',
        sessionLocation: 'North London Sports Complex',
        sessionDuration: 60,
        amount: 37.50,
        tax: 7.50,
        taxRate: 20,
        total: 45.0,
        currency: 'GBP',
        status: 'PAID',
        createdAt: '2024-12-15T15:00:00.000Z',
        paidAt: '2024-12-15T15:30:00.000Z',
        coachBusinessName: 'Roberts Goalkeeping',
        coachBusinessEmail: 'david.roberts@coach.com',
    },
    {
        id: 'inv_005',
        invoiceNumber: 'INV-2024-046',
        userId: 'parent1',
        userName: 'John Henderson',
        bookingId: 'booking_old_002',
        coachName: 'Sarah Mitchell',
        coachId: 'coach1',
        athleteName: 'Emma Henderson',
        athleteId: 'user2',
        sessionDate: '2024-11-20T10:00:00.000Z',
        sessionType: '1-on-1 Training',
        sessionLocation: 'Central Park Training Ground',
        sessionDuration: 60,
        amount: 41.67,
        tax: 8.33,
        taxRate: 20,
        total: 50.0,
        currency: 'GBP',
        status: 'VOID',
        createdAt: '2024-11-20T11:00:00.000Z',
        voidedAt: '2024-11-21T09:00:00.000Z',
        voidReason: 'Session cancelled by coach',
        coachBusinessName: 'Sarah Mitchell Coaching',
        coachBusinessEmail: 'sarah.mitchell@coach.com',
    },
    // Parent 2 invoices
    {
        id: 'inv_006',
        invoiceNumber: 'INV-2025-004',
        userId: 'parent2',
        userName: 'Lisa Wilson',
        bookingId: 'booking_010',
        coachName: 'David Roberts',
        coachId: 'coach3',
        athleteName: 'James Wilson',
        athleteId: 'user3',
        sessionDate: '2025-01-07T15:00:00.000Z',
        sessionType: '1-on-1 Training',
        sessionLocation: 'Hackney Sports Centre',
        sessionDuration: 60,
        amount: 37.50,
        tax: 7.50,
        taxRate: 20,
        total: 45.0,
        currency: 'GBP',
        status: 'PAID',
        createdAt: '2025-01-07T16:00:00.000Z',
        paidAt: '2025-01-07T16:00:00.000Z',
        coachBusinessName: 'Roberts Goalkeeping',
        coachBusinessEmail: 'david.roberts@coach.com',
    },
    // Coach-generated invoice
    {
        id: 'inv_007',
        invoiceNumber: 'INV-2025-005',
        userId: 'coach1',
        userName: 'Sarah Mitchell',
        bookingId: 'booking_020',
        coachName: 'Sarah Mitchell',
        coachId: 'coach1',
        athleteName: 'Tom Henderson',
        athleteId: 'user1',
        sessionDate: '2025-01-12T14:00:00.000Z',
        sessionType: '1-on-1 Training',
        sessionLocation: 'Central Park Training Ground',
        sessionDuration: 60,
        amount: 41.67,
        tax: 8.33,
        taxRate: 20,
        total: 50.0,
        currency: 'GBP',
        status: 'SENT',
        createdAt: '2025-01-12T15:00:00.000Z',
        sentAt: '2025-01-12T15:30:00.000Z',
        sentTo: 'john.henderson@email.com',
        dueDate: '2025-01-26T00:00:00.000Z',
        coachBusinessName: 'Sarah Mitchell Coaching',
        coachBusinessEmail: 'sarah.mitchell@coach.com',
    },
];
// Mock booking data for generating invoices
const MOCK_BOOKINGS = {
    booking_new_001: {
        coachId: 'coach1',
        coachName: 'Sarah Mitchell',
        athleteId: 'user1',
        athleteName: 'Tom Henderson',
        userId: 'parent1',
        userName: 'John Henderson',
        sessionDate: '2025-01-15T14:00:00.000Z',
        sessionType: '1-on-1 Training',
        sessionLocation: 'Central Park Training Ground',
        sessionDuration: 60,
        amount: 50.0,
    },
};
// ============================================================================
// INVOICE SERVICE
// ============================================================================
class InvoiceService {
    // ==========================================================================
    // INVOICE RETRIEVAL
    // ==========================================================================
    /**
     * Get all invoices for a user
     */
    async getUserInvoices(userId, limit) {
        const allInvoices = await this.getAllInvoices();
        let userInvoices = allInvoices
            .filter((inv) => inv.userId === userId || inv.coachId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (limit && limit > 0) {
            userInvoices = userInvoices.slice(0, limit);
        }
        logger.info('invoices_retrieved', { userId, count: userInvoices.length });
        return userInvoices;
    }
    /**
     * Get invoices with filters
     */
    async getInvoicesFiltered(userId, filter, limit) {
        let invoices = await this.getUserInvoices(userId);
        // Filter by status
        if (filter.status) {
            const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
            invoices = invoices.filter((inv) => statuses.includes(inv.status));
        }
        // Filter by coach
        if (filter.coachId) {
            invoices = invoices.filter((inv) => inv.coachId === filter.coachId);
        }
        // Filter by booking
        if (filter.bookingId) {
            invoices = invoices.filter((inv) => inv.bookingId === filter.bookingId);
        }
        // Filter by date range
        if (filter.dateFrom) {
            const fromDate = new Date(filter.dateFrom).getTime();
            invoices = invoices.filter((inv) => new Date(inv.sessionDate).getTime() >= fromDate);
        }
        if (filter.dateTo) {
            const toDate = new Date(filter.dateTo).getTime();
            invoices = invoices.filter((inv) => new Date(inv.sessionDate).getTime() <= toDate);
        }
        if (limit && limit > 0) {
            invoices = invoices.slice(0, limit);
        }
        return invoices;
    }
    /**
     * Get a single invoice by ID
     */
    async getInvoiceById(invoiceId) {
        const allInvoices = await this.getAllInvoices();
        const invoice = allInvoices.find((inv) => inv.id === invoiceId);
        if (invoice) {
            logger.info('invoice_retrieved', { invoiceId });
        }
        else {
            logger.warn('invoice_not_found', { invoiceId });
        }
        return invoice || null;
    }
    /**
     * Get invoice by booking ID
     */
    async getInvoiceByBookingId(bookingId) {
        const allInvoices = await this.getAllInvoices();
        return allInvoices.find((inv) => inv.bookingId === bookingId) || null;
    }
    /**
     * Get all invoices (internal use)
     */
    async getAllInvoices() {
        if (USE_MOCK) {
            return storage_service_1.storageService.getItem(STORAGE_KEY_INVOICES, MOCK_INVOICES);
        }
        // TODO: API call when ready
        return storage_service_1.storageService.getItem(STORAGE_KEY_INVOICES, []);
    }
    /**
     * Save invoices to storage
     */
    async saveInvoices(invoices) {
        await storage_service_1.storageService.setItem(STORAGE_KEY_INVOICES, invoices);
    }
    // ==========================================================================
    // INVOICE GENERATION
    // ==========================================================================
    /**
     * Generate a new invoice for a booking
     */
    async generateInvoice(params) {
        const { bookingId, notes, dueDate, taxRate = DEFAULT_TAX_RATE } = params;
        // Check if invoice already exists for this booking
        const existingInvoice = await this.getInvoiceByBookingId(bookingId);
        if (existingInvoice) {
            logger.warn('invoice_already_exists', { bookingId, invoiceId: existingInvoice.id });
            return (0, result_1.ok)(existingInvoice);
        }
        // Get booking data (in real app, would fetch from booking service)
        const bookingData = MOCK_BOOKINGS[bookingId];
        if (!bookingData) {
            return (0, result_1.err)((0, result_1.notFound)('Booking', bookingId));
        }
        // Calculate tax
        const netAmount = bookingData.amount / (1 + taxRate / 100);
        const taxAmount = bookingData.amount - netAmount;
        // Generate invoice number
        const invoiceNumber = await this.generateInvoiceNumber();
        const newInvoice = {
            id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            invoiceNumber,
            userId: bookingData.userId,
            userName: bookingData.userName,
            bookingId,
            coachId: bookingData.coachId,
            coachName: bookingData.coachName,
            athleteId: bookingData.athleteId,
            athleteName: bookingData.athleteName,
            sessionDate: bookingData.sessionDate,
            sessionType: bookingData.sessionType,
            sessionLocation: bookingData.sessionLocation,
            sessionDuration: bookingData.sessionDuration,
            amount: Math.round(netAmount * 100) / 100,
            tax: Math.round(taxAmount * 100) / 100,
            taxRate,
            total: bookingData.amount,
            currency: 'GBP',
            status: 'DRAFT',
            createdAt: new Date().toISOString(),
            dueDate: dueDate || this.getDefaultDueDate(),
            notes,
            coachBusinessName: `${bookingData.coachName} Coaching`,
            coachBusinessEmail: `${bookingData.coachName.toLowerCase().replace(' ', '.')}@coach.com`,
        };
        const invoices = await this.getAllInvoices();
        invoices.unshift(newInvoice);
        await this.saveInvoices(invoices);
        logger.info('invoice_generated', {
            invoiceId: newInvoice.id,
            invoiceNumber,
            bookingId,
            total: newInvoice.total,
        });
        return (0, result_1.ok)(newInvoice);
    }
    /**
     * Generate next invoice number
     */
    async generateInvoiceNumber() {
        const invoices = await this.getAllInvoices();
        const year = new Date().getFullYear();
        // Find highest invoice number for current year
        const yearInvoices = invoices
            .filter((inv) => inv.invoiceNumber.includes(`-${year}-`))
            .map((inv) => {
            const match = inv.invoiceNumber.match(/INV-\d{4}-(\d+)/);
            return match ? parseInt(match[1], 10) : 0;
        });
        const nextNumber = yearInvoices.length > 0 ? Math.max(...yearInvoices) + 1 : 1;
        return `INV-${year}-${String(nextNumber).padStart(3, '0')}`;
    }
    /**
     * Get default due date (14 days from now)
     */
    getDefaultDueDate() {
        const date = new Date();
        date.setDate(date.getDate() + 14);
        return date.toISOString();
    }
    // ==========================================================================
    // INVOICE ACTIONS
    // ==========================================================================
    /**
     * Send invoice to email
     */
    async sendInvoice(invoiceId, email) {
        const invoice = await this.getInvoiceById(invoiceId);
        if (!invoice) {
            return { success: false, error: 'Invoice not found' };
        }
        if (invoice.status === 'VOID') {
            return { success: false, error: 'Cannot send a voided invoice' };
        }
        // Simulate sending email
        await this.simulateDelay(1000);
        const sentAt = new Date().toISOString();
        await this.updateInvoice(invoiceId, {
            status: 'SENT',
            sentAt,
            sentTo: email,
        });
        logger.info('invoice_sent', { invoiceId, email });
        return { success: true, sentAt };
    }
    /**
     * Mark invoice as paid
     */
    async markAsPaid(invoiceId) {
        const invoice = await this.getInvoiceById(invoiceId);
        if (!invoice) {
            logger.warn('mark_paid_invoice_not_found', { invoiceId });
            return null;
        }
        if (invoice.status === 'VOID') {
            logger.warn('mark_paid_voided_invoice', { invoiceId });
            return null;
        }
        const updatedInvoice = await this.updateInvoice(invoiceId, {
            status: 'PAID',
            paidAt: new Date().toISOString(),
        });
        logger.info('invoice_marked_paid', { invoiceId });
        return updatedInvoice;
    }
    /**
     * Void an invoice
     */
    async voidInvoice(invoiceId, reason) {
        const invoice = await this.getInvoiceById(invoiceId);
        if (!invoice) {
            logger.warn('void_invoice_not_found', { invoiceId });
            return null;
        }
        if (invoice.status === 'PAID') {
            logger.warn('void_paid_invoice', { invoiceId });
            return null;
        }
        const updatedInvoice = await this.updateInvoice(invoiceId, {
            status: 'VOID',
            voidedAt: new Date().toISOString(),
            voidReason: reason || 'Voided by user',
        });
        logger.info('invoice_voided', { invoiceId, reason });
        return updatedInvoice;
    }
    /**
     * Update an invoice
     */
    async updateInvoice(invoiceId, updates) {
        const invoices = await this.getAllInvoices();
        const index = invoices.findIndex((inv) => inv.id === invoiceId);
        if (index === -1) {
            return null;
        }
        invoices[index] = {
            ...invoices[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        await this.saveInvoices(invoices);
        return invoices[index];
    }
    // ==========================================================================
    // PDF GENERATION & DOWNLOAD
    // ==========================================================================
    /**
     * Download invoice as PDF
     * Returns PDF data that can be saved or shared
     */
    async downloadInvoice(invoiceId) {
        const invoice = await this.getInvoiceById(invoiceId);
        if (!invoice) {
            logger.warn('download_invoice_not_found', { invoiceId });
            return null;
        }
        // Generate PDF content (HTML to PDF)
        const htmlContent = (0, invoice_template_1.generateInvoiceHtml)(invoice);
        // For demo, we'll save as HTML file that can be printed/saved as PDF
        // In production, use a proper PDF library like react-native-html-to-pdf
        const filename = `${invoice.invoiceNumber}.html`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        try {
            await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
                encoding: FileSystem.EncodingType.UTF8,
            });
            logger.info('invoice_downloaded', { invoiceId, filename });
            return {
                base64: '', // Would contain actual PDF base64 in production
                filename,
                uri: fileUri,
            };
        }
        catch (error) {
            logger.error('invoice_download_failed', error);
            return null;
        }
    }
    /**
     * Share invoice via native share dialog
     */
    async shareInvoice(invoiceId) {
        const pdfData = await this.downloadInvoice(invoiceId);
        if (!pdfData) {
            return false;
        }
        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                logger.warn('sharing_not_available');
                return false;
            }
            await Sharing.shareAsync(pdfData.uri, {
                mimeType: 'text/html',
                dialogTitle: 'Share Invoice',
                UTI: 'public.html',
            });
            logger.info('invoice_shared', { invoiceId });
            return true;
        }
        catch (error) {
            logger.error('invoice_share_failed', error);
            return false;
        }
    }
    // ==========================================================================
    // SUMMARY & STATISTICS
    // ==========================================================================
    /**
     * Get invoice summary for a user
     */
    async getInvoiceSummary(userId) {
        const invoices = await this.getUserInvoices(userId);
        const summary = {
            userId,
            totalInvoices: invoices.length,
            paidCount: invoices.filter((inv) => inv.status === 'PAID').length,
            pendingCount: invoices.filter((inv) => inv.status === 'SENT').length,
            draftCount: invoices.filter((inv) => inv.status === 'DRAFT').length,
            voidedCount: invoices.filter((inv) => inv.status === 'VOID').length,
            totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
            totalPaid: invoices
                .filter((inv) => inv.status === 'PAID')
                .reduce((sum, inv) => sum + inv.total, 0),
            totalPending: invoices
                .filter((inv) => inv.status === 'SENT')
                .reduce((sum, inv) => sum + inv.total, 0),
            currency: 'GBP',
        };
        logger.info('invoice_summary_retrieved', summary);
        return summary;
    }
    // ==========================================================================
    // UTILITY METHODS
    // ==========================================================================
    /**
     * Format amount as currency string
     */
    formatAmount(amount, currency = 'GBP') {
        const symbol = currency === 'GBP' ? '\u00A3' : '$';
        return `${symbol}${amount.toFixed(2)}`;
    }
    /**
     * Get status display label
     */
    getStatusLabel(status) {
        const labels = {
            DRAFT: 'Draft',
            SENT: 'Sent',
            PAID: 'Paid',
            VOID: 'Voided',
        };
        return labels[status];
    }
    /**
     * Get status color for UI
     */
    getStatusColor(status) {
        const colors = {
            DRAFT: '#6B7280',
            SENT: '#2563EB',
            PAID: '#059669',
            VOID: '#DC2626',
        };
        return colors[status];
    }
    /**
     * Simulate network delay
     */
    simulateDelay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    // ==========================================================================
    // DEMO DATA SEEDING
    // ==========================================================================
    /**
     * Seed demo invoice data (for testing/demos)
     */
    async seedDemoData() {
        await this.saveInvoices(MOCK_INVOICES);
        logger.info('demo_data_seeded', { invoiceCount: MOCK_INVOICES.length });
    }
    /**
     * Clear all invoice data (for testing)
     */
    async clearAllData() {
        await storage_service_1.storageService.setItem(STORAGE_KEY_INVOICES, []);
        logger.info('invoice_data_cleared');
    }
}
// Export singleton instance
exports.invoiceService = new InvoiceService();
