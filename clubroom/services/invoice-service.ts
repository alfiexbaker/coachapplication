import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { generateId } from "@/utils/generate-id";
import { api } from "@/constants/config";
import {
  Invoice,
  InvoiceStatus,
  InvoiceSummary,
  InvoiceFilter,
  GenerateInvoiceParams,
  InvoicePaymentSession,
} from "@/constants/types";
import { apiClient, apiFetch } from "./api-client";
import { createLogger } from "@/utils/logger";
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  serviceError,
  validationError,
} from "@/types/result";
import { emitTyped, ServiceEvents } from "./event-bus";
import { generateInvoiceHtml } from "./invoice-template";
import { bookingService } from "@/services/booking";
import { normalizeLegacyMockDates } from "@/utils/mock-date-normalizer";

// ============================================================================
// CONFIGURATION
// ============================================================================

const STORAGE_KEY_INVOICES = "clubroom.invoices";
const USE_MOCK = api.useMock; // Toggle for mock vs API mode
const logger = createLogger("InvoiceService");

// Default tax rate for UK VAT
const DEFAULT_TAX_RATE = 20;

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_INVOICES: Invoice[] = normalizeLegacyMockDates([
  {
    id: "inv_001",
    invoiceNumber: "INV-2025-001",
    userId: "parent1",
    bookingId: "booking_001",
    coachId: "coach1",
    athleteId: "user1",
    sessionDate: "2025-01-05T14:00:00.000Z",
    sessionType: "1-on-1 Training",
    sessionLocation: "Central Park Training Ground",
    sessionDuration: 60,
    amount: 41.67,
    tax: 8.33,
    taxRate: 20,
    total: 50.0,
    currency: "GBP",
    status: "PAID",
    createdAt: "2025-01-05T15:00:00.000Z",
    paidAt: "2025-01-05T15:00:00.000Z",
    coachBusinessName: "Jess Okafor Coaching",
    coachBusinessEmail: "jess.okafor@coach.com",
    notes: "Thank you for your business!",
  },
  {
    id: "inv_002",
    invoiceNumber: "INV-2025-002",
    userId: "parent1",
    bookingId: "booking_002",
    coachId: "coach2",
    athleteId: "user2",
    sessionDate: "2025-01-08T10:00:00.000Z",
    sessionType: "Group Training - Striker Camp",
    sessionLocation: "Hackney Sports Centre",
    sessionDuration: 90,
    amount: 62.5,
    tax: 12.5,
    taxRate: 20,
    total: 75.0,
    currency: "GBP",
    status: "SENT",
    createdAt: "2025-01-08T12:00:00.000Z",
    sentAt: "2025-01-08T12:30:00.000Z",
    sentTo: "chris.barton@email.com",
    dueDate: "2025-01-22T00:00:00.000Z",
    coachBusinessName: "Carr Football Academy",
    coachBusinessEmail: "reuben.carr@coach.com",
  },
  {
    id: "inv_003",
    invoiceNumber: "INV-2025-003",
    userId: "parent1",
    bookingId: "booking_003",
    coachId: "coach1",
    athleteId: "user1",
    sessionDate: "2025-01-10T16:00:00.000Z",
    sessionType: "1-on-1 Training",
    sessionLocation: "Central Park Training Ground",
    sessionDuration: 60,
    amount: 41.67,
    tax: 8.33,
    taxRate: 20,
    total: 50.0,
    currency: "GBP",
    status: "DRAFT",
    createdAt: "2025-01-10T17:00:00.000Z",
    coachBusinessName: "Jess Okafor Coaching",
    coachBusinessEmail: "jess.okafor@coach.com",
  },
  {
    id: "inv_004",
    invoiceNumber: "INV-2024-045",
    userId: "parent1",
    bookingId: "booking_old_001",
    coachId: "coach3",
    athleteId: "user1",
    sessionDate: "2024-12-15T14:00:00.000Z",
    sessionType: "Goalkeeper Training",
    sessionLocation: "North London Sports Complex",
    sessionDuration: 60,
    amount: 37.5,
    tax: 7.5,
    taxRate: 20,
    total: 45.0,
    currency: "GBP",
    status: "PAID",
    createdAt: "2024-12-15T15:00:00.000Z",
    paidAt: "2024-12-15T15:30:00.000Z",
    coachBusinessName: "Sharma Goalkeeping",
    coachBusinessEmail: "aiden.sharma@coach.com",
  },
  {
    id: "inv_005",
    invoiceNumber: "INV-2024-046",
    userId: "parent1",
    bookingId: "booking_old_002",
    coachId: "coach1",
    athleteId: "user2",
    sessionDate: "2024-11-20T10:00:00.000Z",
    sessionType: "1-on-1 Training",
    sessionLocation: "Central Park Training Ground",
    sessionDuration: 60,
    amount: 41.67,
    tax: 8.33,
    taxRate: 20,
    total: 50.0,
    currency: "GBP",
    status: "VOID",
    createdAt: "2024-11-20T11:00:00.000Z",
    voidedAt: "2024-11-21T09:00:00.000Z",
    voidReason: "Session cancelled by coach",
    coachBusinessName: "Jess Okafor Coaching",
    coachBusinessEmail: "jess.okafor@coach.com",
  },
  // Parent 2 invoices
  {
    id: "inv_006",
    invoiceNumber: "INV-2025-004",
    userId: "parent2",
    bookingId: "booking_010",
    coachId: "coach3",
    athleteId: "user3",
    sessionDate: "2025-01-07T15:00:00.000Z",
    sessionType: "1-on-1 Training",
    sessionLocation: "Hackney Sports Centre",
    sessionDuration: 60,
    amount: 37.5,
    tax: 7.5,
    taxRate: 20,
    total: 45.0,
    currency: "GBP",
    status: "PAID",
    createdAt: "2025-01-07T16:00:00.000Z",
    paidAt: "2025-01-07T16:00:00.000Z",
    coachBusinessName: "Sharma Goalkeeping",
    coachBusinessEmail: "aiden.sharma@coach.com",
  },
  // Coach-generated invoice
  {
    id: "inv_007",
    invoiceNumber: "INV-2025-005",
    userId: "coach1",
    bookingId: "booking_020",
    coachId: "coach1",
    athleteId: "user1",
    sessionDate: "2025-01-12T14:00:00.000Z",
    sessionType: "1-on-1 Training",
    sessionLocation: "Central Park Training Ground",
    sessionDuration: 60,
    amount: 41.67,
    tax: 8.33,
    taxRate: 20,
    total: 50.0,
    currency: "GBP",
    status: "SENT",
    createdAt: "2025-01-12T15:00:00.000Z",
    sentAt: "2025-01-12T15:30:00.000Z",
    sentTo: "chris.barton@email.com",
    dueDate: "2025-01-26T00:00:00.000Z",
    coachBusinessName: "Jess Okafor Coaching",
    coachBusinessEmail: "jess.okafor@coach.com",
  },
]);
function shiftMockInvoiceDate(
  iso: string,
  daysAgo: number,
  hour?: number,
  minute?: number,
): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  if (typeof hour === "number") {
    date.setHours(hour, minute ?? 0, 0, 0);
  }
  return date.toISOString();
}

// Keep demo invoices temporally relevant so UI examples don't look stale.
MOCK_INVOICES.forEach((invoice, index) => {
  const baseDaysAgo = 7 + index * 5;
  invoice.sessionDate = shiftMockInvoiceDate(
    invoice.sessionDate,
    baseDaysAgo,
    14,
    0,
  );
  invoice.createdAt = shiftMockInvoiceDate(
    invoice.createdAt,
    baseDaysAgo,
    15,
    0,
  );
  if (invoice.paidAt) {
    invoice.paidAt = shiftMockInvoiceDate(invoice.paidAt, baseDaysAgo, 15, 30);
  }
  if (invoice.sentAt) {
    invoice.sentAt = shiftMockInvoiceDate(invoice.sentAt, baseDaysAgo, 12, 30);
  }
  if (invoice.dueDate) {
    invoice.dueDate = shiftMockInvoiceDate(
      invoice.dueDate,
      Math.max(0, baseDaysAgo - 14),
      0,
      0,
    );
  }
  if (invoice.voidedAt) {
    invoice.voidedAt = shiftMockInvoiceDate(
      invoice.voidedAt,
      Math.max(0, baseDaysAgo - 1),
      9,
      0,
    );
  }
});

// Mock booking data for generating invoices
const MOCK_BOOKINGS: Record<
  string,
  {
    coachId: string;
    coachName: string;
    athleteId: string;
    athleteName: string;
    userId: string;
    userName: string;
    sessionDate: string;
    sessionType: string;
    sessionLocation: string;
    sessionDuration: number;
    amount: number;
  }
> = normalizeLegacyMockDates({
  booking_new_001: {
    coachId: "coach1",
    coachName: "Jess Okafor",
    athleteId: "user1",
    athleteName: "Alfie Barton",
    userId: "parent1",
    userName: "Chris Barton",
    sessionDate: "2025-01-15T14:00:00.000Z",
    sessionType: "1-on-1 Training",
    sessionLocation: "Central Park Training Ground",
    sessionDuration: 60,
    amount: 50.0,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface InvoicePdfData {
  base64: string;
  filename: string;
  uri: string;
}
export interface SendInvoiceResult {
  success: boolean;
  sentAt?: string;
  error?: string;
}
interface ApiInvoiceListResponse {
  invoices: Invoice[];
  total: number;
}
interface ApiInvoiceDetailResponse {
  invoice: Invoice;
}
interface ApiInvoiceGenerateResponse {
  invoice: Invoice;
}
interface ApiInvoiceReminderResponse {
  invoice: Invoice;
  sentAt: string;
}
interface ApiInvoicePaymentSessionResponse {
  invoiceId: string;
  invoiceStatus: InvoiceStatus;
  paymentSession: InvoicePaymentSession;
}
interface CreateInvoicePaymentSessionOptions {
  returnUrl?: string;
  cancelUrl?: string;
}

// ============================================================================
// INVOICE SERVICE
// ============================================================================

class InvoiceService {
  isUsingMockData(): boolean {
    return USE_MOCK;
  }
  private buildInvoiceSummary(
    userId: string,
    invoices: Invoice[],
  ): InvoiceSummary {
    return {
      userId,
      totalInvoices: invoices.length,
      paidCount: invoices.filter((inv) => inv.status === "PAID").length,
      pendingCount: invoices.filter((inv) => inv.status === "SENT").length,
      draftCount: invoices.filter((inv) => inv.status === "DRAFT").length,
      voidedCount: invoices.filter((inv) => inv.status === "VOID").length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
      totalPaid: invoices
        .filter((inv) => inv.status === "PAID")
        .reduce((sum, inv) => sum + inv.total, 0),
      totalPending: invoices
        .filter((inv) => inv.status === "SENT")
        .reduce((sum, inv) => sum + inv.total, 0),
      currency: "GBP",
    };
  }
  summarizeInvoices(userId: string, invoices: Invoice[]): InvoiceSummary {
    return this.buildInvoiceSummary(userId, invoices);
  }
  private async getAuthoritativeInvoices(
    filter?: InvoiceFilter,
  ): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (filter?.status) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : [filter.status];
      if (statuses.length > 0) {
        params.set("status", statuses.join(","));
      }
    }
    if (filter?.coachId) {
      params.set("coachId", filter.coachId);
    }
    if (filter?.bookingId) {
      params.set("bookingId", filter.bookingId);
    }
    if (filter?.dateFrom) {
      params.set("dateFrom", filter.dateFrom);
    }
    if (filter?.dateTo) {
      params.set("dateTo", filter.dateTo);
    }
    const result = await apiFetch<ApiInvoiceListResponse>(
      `/v1/invoices${params.size ? `?${params.toString()}` : ""}`,
      {
        method: "GET",
      },
    );
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data.invoices;
  }
  private async getAuthoritativeInvoice(
    invoiceId: string,
  ): Promise<Invoice | null> {
    const result = await apiFetch<ApiInvoiceDetailResponse>(
      `/v1/invoices/${invoiceId}`,
      {
        method: "GET",
      },
    );
    if (result.success) {
      return result.data.invoice;
    }
    if (result.error.code === "NOT_FOUND") {
      return null;
    }
    throw new Error(result.error.message);
  }
  private async runInvoiceTransition(
    invoiceId: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Invoice | null> {
    const result = await apiFetch<ApiInvoiceDetailResponse>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (result.success) {
      return result.data.invoice;
    }
    if (result.error.code === "NOT_FOUND") {
      return null;
    }
    throw new Error(result.error.message);
  }
  private resolveHostedActionUrl(url: string | undefined): string | undefined {
    if (!url) {
      return undefined;
    }
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    return `${api.baseUrl}${url.startsWith("/") ? url : `/${url}`}`;
  }

  // ==========================================================================
  // INVOICE RETRIEVAL
  // ==========================================================================

  /**
   * Get all invoices for a user
   */
  async getUserInvoices(userId: string, limit?: number): Promise<Invoice[]> {
    if (!USE_MOCK) {
      const invoices = await this.getAuthoritativeInvoices();
      return limit && limit > 0 ? invoices.slice(0, limit) : invoices;
    }
    const allInvoices = await this.getAllInvoices();
    let userInvoices = allInvoices
      .filter((inv) => inv.userId === userId || inv.coachId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    if (limit && limit > 0) {
      userInvoices = userInvoices.slice(0, limit);
    }
    logger.info("invoices_retrieved", {
      userId,
      count: userInvoices.length,
    });
    return userInvoices;
  }

  /**
   * Get invoices with filters
   */
  async getInvoicesFiltered(
    userId: string,
    filter: InvoiceFilter,
    limit?: number,
  ): Promise<Invoice[]> {
    if (!USE_MOCK) {
      const invoices = await this.getAuthoritativeInvoices(filter);
      return limit && limit > 0 ? invoices.slice(0, limit) : invoices;
    }
    let invoices = await this.getUserInvoices(userId);

    // Filter by status
    if (filter.status) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : [filter.status];
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
      invoices = invoices.filter(
        (inv) => new Date(inv.sessionDate).getTime() >= fromDate,
      );
    }
    if (filter.dateTo) {
      const toDate = new Date(filter.dateTo).getTime();
      invoices = invoices.filter(
        (inv) => new Date(inv.sessionDate).getTime() <= toDate,
      );
    }
    if (limit && limit > 0) {
      invoices = invoices.slice(0, limit);
    }
    return invoices;
  }

  /**
   * Get a single invoice by ID
   */
  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    if (!USE_MOCK) {
      const invoice = await this.getAuthoritativeInvoice(invoiceId);
      if (invoice) {
        logger.info("invoice_retrieved", {
          invoiceId,
        });
      } else {
        logger.warn("invoice_not_found", {
          invoiceId,
        });
      }
      return invoice;
    }
    const allInvoices = await this.getAllInvoices();
    const invoice = allInvoices.find((inv) => inv.id === invoiceId);
    if (invoice) {
      logger.info("invoice_retrieved", {
        invoiceId,
      });
    } else {
      logger.warn("invoice_not_found", {
        invoiceId,
      });
    }
    return invoice || null;
  }

  /**
   * Get invoice by booking ID
   */
  async getInvoiceByBookingId(bookingId: string): Promise<Invoice | null> {
    if (!USE_MOCK) {
      const invoices = await this.getAuthoritativeInvoices({
        bookingId,
      });
      return invoices[0] ?? null;
    }
    const allInvoices = await this.getAllInvoices();
    return allInvoices.find((inv) => inv.bookingId === bookingId) || null;
  }

  /**
   * Get all invoices (internal use)
   */
  private async getAllInvoices(): Promise<Invoice[]> {
    if (USE_MOCK) {
      return apiClient.get<Invoice[]>(STORAGE_KEY_INVOICES, MOCK_INVOICES);
    }
    return [];
  }

  /**
   * Save invoices to storage
   */
  private async saveInvoices(invoices: Invoice[]): Promise<void> {
    await apiClient.set(STORAGE_KEY_INVOICES, invoices);
  }

  /**
   * Upsert an invoice — saves it to storage if it doesn't already exist.
   * Used by hooks that create synthetic invoices from booking data.
   */
  async upsertInvoice(invoice: Invoice): Promise<void> {
    if (!USE_MOCK) {
      return;
    }
    const invoices = await this.getAllInvoices();
    const exists = invoices.some((inv) => inv.id === invoice.id);
    if (!exists) {
      invoices.unshift(invoice);
      await this.saveInvoices(invoices);
      logger.info("invoice_upserted", {
        invoiceId: invoice.id,
      });
    }
  }

  // ==========================================================================
  // INVOICE GENERATION
  // ==========================================================================

  /**
   * Generate a new invoice for a booking
   */
  async generateInvoice(
    params: GenerateInvoiceParams,
  ): Promise<Result<Invoice, ServiceError>> {
    if (!USE_MOCK) {
      const result = await apiFetch<ApiInvoiceGenerateResponse>(
        "/v1/invoices/generate",
        {
          method: "POST",
          body: JSON.stringify({
            bookingId: params.bookingId,
            notes: params.notes,
            dueDate: params.dueDate,
            taxRate: params.taxRate,
          }),
        },
      );
      if (!result.success) {
        return err(serviceError(result.error.code, result.error.message));
      }
      return ok(result.data.invoice);
    }
    const { bookingId, notes, dueDate, taxRate = DEFAULT_TAX_RATE } = params;

    // Check if invoice already exists for this booking
    const existingInvoice = await this.getInvoiceByBookingId(bookingId);
    if (existingInvoice) {
      logger.warn("invoice_already_exists", {
        bookingId,
        invoiceId: existingInvoice.id,
      });
      return ok(existingInvoice);
    }

    // Fetch real booking data
    const booking = await bookingService.getById(bookingId);
    if (booking) {
      const amount =
        booking.status === "CANCELLED"
          ? (booking.cancellationFee ?? 0)
          : (booking.price ?? 0);
      if (amount <= 0) {
        return err(validationError("Booking has no price"));
      }
      const roundMoney = (n: number): number => Math.round(n * 100) / 100;
      const netAmount = roundMoney(amount / (1 + taxRate / 100));
      const taxAmount = roundMoney(amount - netAmount);
      const invoiceNumber = await this.generateInvoiceNumber();
      const newInvoice: Invoice = {
        id: generateId("inv"),
        invoiceNumber,
        userId: booking.bookedById ?? booking.athleteId ?? "",
        bookingId,
        coachId: booking.coachId,
        athleteId: booking.athleteId,
        sessionDate: booking.scheduledAt,
        sessionType: booking.service ?? booking.serviceType ?? "Session",
        sessionLocation: booking.location ?? "",
        sessionDuration: booking.duration ?? 60,
        amount: netAmount,
        tax: taxAmount,
        taxRate,
        total: netAmount + taxAmount,
        currency: "GBP",
        status: "SENT",
        createdAt: new Date().toISOString(),
        dueDate: dueDate || this.getDefaultDueDate(),
        notes,
      };
      const invoices = await this.getAllInvoices();
      invoices.unshift(newInvoice);
      await this.saveInvoices(invoices);
      logger.info("invoice_generated", {
        invoiceId: newInvoice.id,
        invoiceNumber,
        bookingId,
        total: newInvoice.total,
      });
      return ok(newInvoice);
    }

    // Fallback to mock data for demo/testing
    const bookingData = MOCK_BOOKINGS[bookingId];
    if (!bookingData) {
      return err(notFound("Booking", bookingId));
    }
    const roundMoney = (n: number): number => Math.round(n * 100) / 100;
    const netAmount = roundMoney(bookingData.amount / (1 + taxRate / 100));
    const taxAmount = roundMoney(bookingData.amount - netAmount);
    const invoiceNumber = await this.generateInvoiceNumber();
    const newInvoice: Invoice = {
      id: generateId("inv"),
      invoiceNumber,
      userId: bookingData.userId,
      bookingId,
      coachId: bookingData.coachId,
      athleteId: bookingData.athleteId,
      sessionDate: bookingData.sessionDate,
      sessionType: bookingData.sessionType,
      sessionLocation: bookingData.sessionLocation,
      sessionDuration: bookingData.sessionDuration,
      amount: netAmount,
      tax: taxAmount,
      taxRate,
      total: netAmount + taxAmount,
      currency: "GBP",
      status: "SENT",
      createdAt: new Date().toISOString(),
      dueDate: dueDate || this.getDefaultDueDate(),
      notes,
      coachBusinessName: `${bookingData.coachName} Coaching`,
      coachBusinessEmail: `${bookingData.coachName.toLowerCase().replace(" ", ".")}@coach.com`,
    };
    const invoices = await this.getAllInvoices();
    invoices.unshift(newInvoice);
    await this.saveInvoices(invoices);
    logger.info("invoice_generated", {
      invoiceId: newInvoice.id,
      invoiceNumber,
      bookingId,
      total: newInvoice.total,
    });
    return ok(newInvoice);
  }

  /**
   * Generate next invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const invoices = await this.getAllInvoices();
    const year = new Date().getFullYear();

    // Find highest invoice number for current year
    const yearInvoices = invoices.flatMap((inv) => {
      if (!inv.invoiceNumber.includes(`-${year}-`)) return [];
      const match = inv.invoiceNumber.match(/INV-\d{4}-(\d+)/);
      return [match ? parseInt(match[1], 10) : 0];
    });
    const nextNumber =
      yearInvoices.length > 0 ? Math.max(...yearInvoices) + 1 : 1;
    return `INV-${year}-${String(nextNumber).padStart(3, "0")}`;
  }

  /**
   * Get default due date (14 days from now)
   */
  private getDefaultDueDate(): string {
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
  async sendInvoice(
    invoiceId: string,
    email: string,
  ): Promise<SendInvoiceResult> {
    if (!USE_MOCK) {
      const result = await apiFetch<ApiInvoiceReminderResponse>(
        `/v1/invoices/${invoiceId}/reminders`,
        {
          method: "POST",
          body: JSON.stringify({
            recipientEmail: email,
          }),
        },
      );
      if (!result.success) {
        return {
          success: false,
          error: result.error.message,
        };
      }
      return {
        success: true,
        sentAt: result.data.sentAt,
      };
    }
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) {
      return {
        success: false,
        error: "Invoice not found",
      };
    }
    if (invoice.status === "VOID") {
      return {
        success: false,
        error: "Cannot send a voided invoice",
      };
    }

    // Simulate sending email
    await this.simulateDelay(1000);
    const sentAt = new Date().toISOString();
    await this.updateInvoice(invoiceId, {
      status: "SENT",
      sentAt,
      sentTo: email,
    });
    logger.info("invoice_sent", {
      invoiceId,
      email,
    });
    return {
      success: true,
      sentAt,
    };
  }
  async createPaymentSession(
    invoiceId: string,
    options?: CreateInvoicePaymentSessionOptions,
  ): Promise<InvoicePaymentSession | null> {
    if (USE_MOCK) {
      return null;
    }
    const result = await apiFetch<ApiInvoicePaymentSessionResponse>(
      `/v1/invoices/${invoiceId}/payments`,
      {
        method: "POST",
        body: JSON.stringify({
          method: "card",
          idempotencyKey: apiClient.generateId("pay"),
          returnUrl: options?.returnUrl,
          cancelUrl: options?.cancelUrl,
        }),
      },
    );
    if (!result.success) {
      if (result.error.code === "NOT_FOUND") {
        return null;
      }
      throw new Error(result.error.message);
    }
    const paymentSession = result.data.paymentSession;
    return {
      ...paymentSession,
      nextAction: {
        ...paymentSession.nextAction,
        url: this.resolveHostedActionUrl(paymentSession.nextAction.url),
      },
    };
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId: string): Promise<Invoice | null> {
    if (!USE_MOCK) {
      const invoice = await this.runInvoiceTransition(
        invoiceId,
        `/v1/invoices/${invoiceId}/mark-paid`,
      );
      if (invoice) {
        emitTyped(ServiceEvents.INVOICE_PAID, {
          invoiceId,
          coachId: invoice.coachId,
          amount: invoice.total,
        });
      }
      return invoice;
    }
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) {
      logger.warn("mark_paid_invoice_not_found", {
        invoiceId,
      });
      return null;
    }
    if (invoice.status === "VOID") {
      logger.warn("mark_paid_voided_invoice", {
        invoiceId,
      });
      return null;
    }
    const updatedInvoice = await this.updateInvoice(invoiceId, {
      status: "PAID",
      paidAt: new Date().toISOString(),
    });
    if (updatedInvoice) {
      emitTyped(ServiceEvents.INVOICE_PAID, {
        invoiceId,
        coachId: invoice.coachId,
        amount: invoice.total,
      });
    }
    logger.info("invoice_marked_paid", {
      invoiceId,
    });
    return updatedInvoice;
  }

  /**
   * Undo mark-as-paid — move invoice back to SENT (owed)
   */
  async markAsUnpaid(invoiceId: string): Promise<Invoice | null> {
    if (!USE_MOCK) {
      const invoice = await this.runInvoiceTransition(
        invoiceId,
        `/v1/invoices/${invoiceId}/mark-unpaid`,
      );
      if (invoice) {
        emitTyped(ServiceEvents.INVOICE_RESTORED, {
          invoiceId,
          coachId: invoice.coachId,
          amount: invoice.total,
        });
      }
      return invoice;
    }
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) {
      logger.warn("mark_unpaid_invoice_not_found", {
        invoiceId,
      });
      return null;
    }
    if (invoice.status !== "PAID") {
      logger.warn("mark_unpaid_not_paid", {
        invoiceId,
        status: invoice.status,
      });
      return null;
    }
    const updatedInvoice = await this.updateInvoice(invoiceId, {
      status: "SENT",
      paidAt: undefined,
    });
    if (updatedInvoice) {
      emitTyped(ServiceEvents.INVOICE_RESTORED, {
        invoiceId,
        coachId: invoice.coachId,
        amount: invoice.total,
      });
    }
    logger.info("invoice_marked_unpaid", {
      invoiceId,
    });
    return updatedInvoice;
  }

  /**
   * Void an invoice
   */
  async voidInvoice(
    invoiceId: string,
    reason?: string,
  ): Promise<Invoice | null> {
    if (!USE_MOCK) {
      return this.runInvoiceTransition(
        invoiceId,
        `/v1/invoices/${invoiceId}/void`,
        {
          reason,
        },
      );
    }
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) {
      logger.warn("void_invoice_not_found", {
        invoiceId,
      });
      return null;
    }
    if (invoice.status === "PAID") {
      logger.warn("void_paid_invoice", {
        invoiceId,
      });
      return null;
    }
    const updatedInvoice = await this.updateInvoice(invoiceId, {
      status: "VOID",
      voidedAt: new Date().toISOString(),
      voidReason: reason || "Voided by user",
    });
    logger.info("invoice_voided", {
      invoiceId,
      reason,
    });
    return updatedInvoice;
  }

  /**
   * Write off an invoice (coach decides not to chase payment)
   */
  async writeOff(invoiceId: string, reason?: string): Promise<Invoice | null> {
    if (!USE_MOCK) {
      const invoice = await this.runInvoiceTransition(
        invoiceId,
        `/v1/invoices/${invoiceId}/write-off`,
        {
          reason,
        },
      );
      if (invoice) {
        emitTyped(ServiceEvents.INVOICE_WRITTEN_OFF, {
          invoiceId,
          coachId: invoice.coachId,
          amount: invoice.total,
        });
      }
      return invoice;
    }
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) {
      logger.warn("write_off_invoice_not_found", {
        invoiceId,
      });
      return null;
    }
    if (invoice.status === "PAID" || invoice.status === "VOID") {
      logger.warn("write_off_invalid_status", {
        invoiceId,
        status: invoice.status,
      });
      return null;
    }
    const updatedInvoice = await this.updateInvoice(invoiceId, {
      status: "WRITTEN_OFF",
      voidReason: reason || "Written off by coach",
    });
    if (updatedInvoice) {
      emitTyped(ServiceEvents.INVOICE_WRITTEN_OFF, {
        invoiceId,
        coachId: invoice.coachId,
        amount: invoice.total,
      });
    }
    logger.info("invoice_written_off", {
      invoiceId,
      reason,
    });
    return updatedInvoice;
  }

  /**
   * Restore a written-off invoice back to SENT status
   */
  async restoreFromWriteOff(invoiceId: string): Promise<Invoice | null> {
    if (!USE_MOCK) {
      const invoice = await this.runInvoiceTransition(
        invoiceId,
        `/v1/invoices/${invoiceId}/restore`,
      );
      if (invoice) {
        emitTyped(ServiceEvents.INVOICE_RESTORED, {
          invoiceId,
          coachId: invoice.coachId,
          amount: invoice.total,
        });
      }
      return invoice;
    }
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) {
      logger.warn("restore_invoice_not_found", {
        invoiceId,
      });
      return null;
    }
    if (invoice.status !== "WRITTEN_OFF") {
      logger.warn("restore_not_written_off", {
        invoiceId,
        status: invoice.status,
      });
      return null;
    }
    const updatedInvoice = await this.updateInvoice(invoiceId, {
      status: "SENT",
      voidReason: undefined,
    });
    if (updatedInvoice) {
      emitTyped(ServiceEvents.INVOICE_RESTORED, {
        invoiceId,
        coachId: invoice.coachId,
        amount: invoice.total,
      });
    }
    logger.info("invoice_restored", {
      invoiceId,
    });
    return updatedInvoice;
  }

  /**
   * Update an invoice
   */
  private async updateInvoice(
    invoiceId: string,
    updates: Partial<Invoice>,
  ): Promise<Invoice | null> {
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
  async downloadInvoice(invoiceId: string): Promise<InvoicePdfData | null> {
    const invoice = await this.getInvoiceById(invoiceId);
    if (!invoice) {
      logger.warn("download_invoice_not_found", {
        invoiceId,
      });
      return null;
    }

    // Generate PDF content (HTML to PDF)
    const htmlContent = generateInvoiceHtml(invoice);

    // For demo, we'll save as HTML file that can be printed/saved as PDF
    // In production, use a proper PDF library like react-native-html-to-pdf
    const filename = `${invoice.invoiceNumber}.html`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    try {
      await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      logger.info("invoice_downloaded", {
        invoiceId,
        filename,
      });
      return {
        base64: "",
        // Would contain actual PDF base64 in production
        filename,
        uri: fileUri,
      };
    } catch (error) {
      logger.error("invoice_download_failed", error);
      return null;
    }
  }

  /**
   * Share invoice via native share dialog
   */
  async shareInvoice(invoiceId: string): Promise<boolean> {
    const pdfData = await this.downloadInvoice(invoiceId);
    if (!pdfData) {
      return false;
    }
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        logger.warn("sharing_not_available");
        return false;
      }
      await Sharing.shareAsync(pdfData.uri, {
        mimeType: "text/html",
        dialogTitle: "Share Invoice",
        UTI: "public.html",
      });
      logger.info("invoice_shared", {
        invoiceId,
      });
      return true;
    } catch (error) {
      logger.error("invoice_share_failed", error);
      return false;
    }
  }

  // ==========================================================================
  // SUMMARY & STATISTICS
  // ==========================================================================

  /**
   * Get invoice summary for a user
   */
  async getInvoiceSummary(userId: string): Promise<InvoiceSummary> {
    const invoices = await this.getUserInvoices(userId);
    const summary = this.buildInvoiceSummary(userId, invoices);
    logger.info("invoice_summary_retrieved", summary);
    return summary;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Format amount as currency string
   */
  formatAmount(amount: number, _currency: string = "GBP"): string {
    const symbol = "\u00A3";
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * Get status display label
   */
  getStatusLabel(status: InvoiceStatus): string {
    const labels: Record<InvoiceStatus, string> = {
      DRAFT: "Draft",
      SENT: "Sent",
      PAID: "Paid",
      VOID: "Voided",
      WRITTEN_OFF: "Written Off",
    };
    return labels[status];
  }

  /**
   * Simulate network delay
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================================================================
  // DEMO DATA SEEDING
  // ==========================================================================

  /**
   * Seed demo invoice data (for testing/demos)
   */
  async seedDemoData(): Promise<void> {
    if (!USE_MOCK) {
      return;
    }
    await this.saveInvoices(MOCK_INVOICES);
    logger.info("demo_data_seeded", {
      invoiceCount: MOCK_INVOICES.length,
    });
  }

  /**
   * Clear all invoice data (for testing)
   */
  async clearAllData(): Promise<void> {
    if (!USE_MOCK) {
      return;
    }
    await apiClient.set(STORAGE_KEY_INVOICES, []);
    logger.info("invoice_data_cleared");
  }
}

// Export singleton instance
export const invoiceService = new InvoiceService();
