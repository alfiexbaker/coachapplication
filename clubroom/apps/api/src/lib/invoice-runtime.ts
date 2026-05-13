import crypto from 'node:crypto';
import { getApiDataBackend } from './data-backend.js';
import { getDbFixtureStore } from './db-fixture-store.js';
import { badRequest, notFound } from './http-errors.js';
import { getMarketplaceSeedStore } from './marketplace-seed-store.js';
import {
  type HostedPaymentSession,
  getConfiguredPaymentProvider,
  verifySimulatedPaymentToken,
} from './payment-provider.js';
import type { PrismaClient } from '@clubroom/db';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from './prisma-runtime.js';
import { normalizeForJson } from '../repositories/p0/normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
type InvoicePrismaTransaction = Pick<
  PrismaClient,
  | 'booking'
  | 'invoice'
  | 'invoiceEvent'
  | 'invoiceLineItem'
  | 'paymentAttempt'
  | 'reconcilerEntry'
  | 'user'
>;

export interface InvoiceListQuery {
  status?: string;
  coachId?: string;
  bookingId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InvoiceDetailRecord {
  invoice: SeedRow;
  lineItems: SeedRow[];
  events: SeedRow[];
  reconcilerEntry: SeedRow | null;
  reminders: SeedRow[];
  paymentInstructionTemplates: SeedRow[];
  paymentAttempts: SeedRow[];
}

export interface GenerateInvoiceInput {
  bookingId: string;
  actorUserId: string;
  notes?: string;
  dueDate?: string;
  taxRatePercent?: number;
}

export interface GeneratedInvoiceRecord {
  invoice: SeedRow;
  created: boolean;
}

export interface CreateInvoiceReminderInput {
  invoiceId: string;
  actorUserId: string;
  recipientEmail?: string;
  message?: string;
}

export interface InvoiceReminderRecord {
  invoice: SeedRow;
  reminder: SeedRow;
  sentAt: string;
}

export interface CreateInvoicePaymentSessionInput {
  invoiceId: string;
  actorUserId: string;
  idempotencyKey: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface InvoicePaymentSessionRecord {
  invoice: SeedRow;
  attempt: SeedRow;
  hostedSession: HostedPaymentSession;
  reused: boolean;
}

export interface RequestInvoiceRefundInput {
  invoiceId: string;
  actorUserId: string;
  reason: string;
  verificationCode: string;
  idempotencyKey: string;
  amountMinor?: number;
  requestId?: string;
}

export interface InvoiceRefundRecord {
  invoice: SeedRow;
  refund: SeedRow;
  reused: boolean;
}

export interface CompleteSimulatedInvoicePaymentInput {
  attemptId: string;
  token: string;
}

export interface CompleteSimulatedInvoicePaymentResult {
  invoice: SeedRow;
  attempt: SeedRow;
  alreadyCompleted: boolean;
}

export interface HostedPaymentPageData {
  invoice: SeedRow;
  attempt: SeedRow;
  token: string;
  returnUrl?: string | null;
  cancelUrl?: string | null;
}

export type InvoiceTransitionAction =
  | 'mark-paid'
  | 'mark-unpaid'
  | 'write-off'
  | 'restore'
  | 'void';

export interface TransitionInvoiceInput {
  invoiceId: string;
  actorUserId: string;
  action: InvoiceTransitionAction;
  reason?: string;
  requestId?: string;
}

export interface BookingInvoiceLifecycleInput {
  bookingId: string;
  actorUserId: string;
  reason?: string;
  requestId?: string;
}

export interface BookingInvoiceAdjustmentInput {
  bookingIds: string[];
  actorUserId: string;
  reason?: string;
  requestId?: string;
}

interface BookingInvoiceContext {
  bookingId: string;
  coachUserId: string;
  payerUserId: string | null;
  athleteId: string | null;
  sessionDate: string;
  sessionType: string;
  sessionLocation: string;
  sessionDurationMinutes: number;
  totalMinor: number;
  currency: string;
  coachBusinessName?: string | null;
  coachBusinessEmail?: string | null;
  billingAddress?: string | null;
}

const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'VOID', 'WRITTEN_OFF'] as const;
const ACTIVE_PAYMENT_ATTEMPT_STATUSES = new Set(['PENDING', 'ACTION_REQUIRED']);
const SIMULATED_REFUND_VERIFICATION_CODE = '000000';

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asBoolean = (value: unknown): boolean => value === true;
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

function getActiveRows(rows: SeedRow[]): SeedRow[] {
  return rows.filter((row) => row.deletedAt == null);
}

function getMutableRows(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key] as SeedRow[];
}

function moneyFromMinor(value: unknown): number {
  return Math.round((Number(value ?? 0) / 100) * 100) / 100;
}

function formatSessionType(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  switch (value) {
    case 'one_to_one':
      return '1-on-1 Training';
    case 'group':
      return 'Group Session';
    default:
      return value
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
  }
}

function toInvoiceStatus(value: unknown): (typeof INVOICE_STATUSES)[number] {
  const status = asString(value)?.toUpperCase();
  if (status && INVOICE_STATUSES.includes(status as (typeof INVOICE_STATUSES)[number])) {
    return status as (typeof INVOICE_STATUSES)[number];
  }
  return 'SENT';
}

function findUserEmail(users: SeedRow[], userId: string | undefined): string | undefined {
  if (!userId) {
    return undefined;
  }
  const user = users.find((row) => asString(row.id) === userId);
  return asString(user?.email);
}

function displayNameForUser(user: SeedRow | null | undefined): string | undefined {
  if (!user) {
    return undefined;
  }
  const displayName = asString(user.displayName) ?? asString(user.name);
  if (displayName) {
    return displayName;
  }
  const firstName = asString(user.firstName);
  const lastName = asString(user.lastName);
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ').trim();
  }
  return undefined;
}

function mapInvoice(row: SeedRow, users: SeedRow[]): SeedRow {
  const payerUserId = asString(row.payerUserId) ?? '';
  return {
    id: asString(row.id) ?? '',
    invoiceNumber: asString(row.invoiceNumber) ?? '',
    userId: payerUserId,
    bookingId: asString(row.bookingId) ?? '',
    coachId: asString(row.coachUserId) ?? '',
    athleteId: asString(row.athleteId),
    sessionDate: asString(row.sessionDate) ?? nowIso(),
    sessionType: formatSessionType(asString(row.sessionType)),
    sessionLocation: asString(row.sessionLocation),
    sessionDuration: asNumber(row.sessionDurationMinutes),
    amount: moneyFromMinor(row.subtotalMinor),
    tax: moneyFromMinor(row.taxMinor),
    taxRate: asNumber(row.taxRatePercent) ?? 0,
    total: moneyFromMinor(row.totalMinor),
    currency: asString(row.currency) ?? 'GBP',
    status: toInvoiceStatus(row.status),
    createdAt: asString(row.createdAt) ?? nowIso(),
    updatedAt: asString(row.updatedAt),
    sentAt: asString(row.sentAt),
    sentTo: asString(row.sentTo) ?? findUserEmail(users, payerUserId),
    paidAt: asString(row.paidAt),
    voidedAt: asString(row.voidedAt) ?? undefined,
    voidReason: asString(row.voidReason) ?? undefined,
    dueDate: asString(row.dueDate),
    notes: asString(row.notes),
    coachBusinessName: asString(row.coachBusinessName),
    coachBusinessEmail: asString(row.coachBusinessEmail),
    billingAddress: asString(row.billingAddress),
  };
}

function parseDate(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesInvoiceFilters(row: SeedRow, query: InvoiceListQuery): boolean {
  if (query.coachId && asString(row.coachUserId) !== query.coachId) {
    return false;
  }
  if (query.bookingId && asString(row.bookingId) !== query.bookingId) {
    return false;
  }
  if (query.status) {
    const statuses = query.status
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean);
    if (statuses.length > 0 && !statuses.includes(toInvoiceStatus(row.status))) {
      return false;
    }
  }

  const sessionDate = parseDate(asString(row.sessionDate));
  if (query.dateFrom) {
    const from = parseDate(query.dateFrom);
    if (from != null && (sessionDate == null || sessionDate < from)) {
      return false;
    }
  }
  if (query.dateTo) {
    const to = parseDate(query.dateTo);
    if (to != null && (sessionDate == null || sessionDate > to)) {
      return false;
    }
  }

  return true;
}

function canAccessInvoiceRow(authUserId: string, isAdmin: boolean, invoice: SeedRow): boolean {
  return (
    isAdmin ||
    asString(invoice.coachUserId) === authUserId ||
    asString(invoice.payerUserId) === authUserId
  );
}

function resolveMutableTables(): { tables: SeedTables; version: string } | null {
  if (getApiDataBackend() === 'seed') {
    const store = getMarketplaceSeedStore();
    return { tables: store.tables, version: store.version };
  }
  if (shouldUseDbFixtureFallback()) {
    const store = getDbFixtureStore();
    return { tables: store.tables, version: store.version };
  }
  return null;
}

function coerceMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function buildRefundRequestHash(params: { amountMinor: number; reason: string }): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ amountMinor: params.amountMinor, reason: params.reason.trim() }))
    .digest('hex');
}

function existingRefundEventFromRows(
  invoiceEvents: SeedRow[],
  invoiceId: string,
  idempotencyKey: string,
): SeedRow | undefined {
  return invoiceEvents.find((event) => {
    const metadata = coerceMetadata(event.metadataJson);
    return (
      asString(event.invoiceId) === invoiceId &&
      asString(event.eventType) === 'VOIDED' &&
      asString(metadata.source) === 'invoice-refund' &&
      asString(metadata.idempotencyKey) === idempotencyKey
    );
  });
}

function computeTaxBreakdown(
  totalMinor: number,
  taxRatePercent: number,
): {
  subtotalMinor: number;
  taxMinor: number;
} {
  const subtotalMinor = Math.round((totalMinor * 100) / (100 + taxRatePercent));
  return {
    subtotalMinor,
    taxMinor: totalMinor - subtotalMinor,
  };
}

function reconcileStateForInvoiceStatus(status: (typeof INVOICE_STATUSES)[number]): string {
  switch (status) {
    case 'PAID':
      return 'PAID';
    case 'WRITTEN_OFF':
      return 'WRITTEN_OFF';
    case 'VOID':
      return 'VOID';
    case 'DRAFT':
      return 'DRAFT';
    case 'SENT':
    default:
      return 'OUTSTANDING';
  }
}

function appendInvoiceEvent(params: {
  invoiceEvents: SeedRow[];
  invoiceId: string;
  eventType: string;
  actorUserId: string;
  reason: string;
  requestId?: string | null;
  occurredAt: string;
  metadata?: Record<string, unknown>;
}): void {
  params.invoiceEvents.push({
    id: newId('ine'),
    invoiceId: params.invoiceId,
    eventType: params.eventType,
    actorUserId: params.actorUserId,
    reason: params.reason,
    metadataJson: params.metadata ?? {},
    requestId: params.requestId ?? null,
    occurredAt: params.occurredAt,
  });
}

function updateReconcilerEntry(params: {
  reconcilerEntries: SeedRow[];
  invoice: SeedRow;
  actorUserId: string;
  nextStatus: (typeof INVOICE_STATUSES)[number];
  note: string;
  now: string;
}): void {
  const invoiceId = asString(params.invoice.id) ?? '';
  const existing = params.reconcilerEntries.find((row) => asString(row.invoiceId) === invoiceId);
  const nextState = reconcileStateForInvoiceStatus(params.nextStatus);

  if (existing) {
    existing.state = nextState;
    existing.internalNote = params.note;
    existing.updatedAt = params.now;
    existing.updatedByUserId = params.actorUserId;
    existing.version = (asNumber(existing.version) ?? 1) + 1;
    return;
  }

  params.reconcilerEntries.push({
    id: newId('rec'),
    invoiceId,
    coachUserId: asString(params.invoice.coachUserId),
    state: nextState,
    internalNote: params.note,
    createdByUserId: params.actorUserId,
    updatedByUserId: params.actorUserId,
    version: 1,
    createdAt: params.now,
    updatedAt: params.now,
  });
}

function cancelActivePaymentAttemptsForInvoice(params: {
  paymentAttempts: SeedRow[];
  invoiceId: string;
  now: string;
  reason: string;
}): void {
  for (const row of params.paymentAttempts) {
    if (
      asString(row.invoiceId) === params.invoiceId &&
      ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(coerceAttemptStatus(row.status))
    ) {
      row.status = 'CANCELED';
      row.canceledAt = params.now;
      row.updatedAt = params.now;
      row.failureReason = params.reason;
    }
  }
}

function getInvoiceTransitionPlan(params: {
  action: InvoiceTransitionAction;
  currentStatus: (typeof INVOICE_STATUSES)[number];
  reason?: string;
  invoiceId: string;
}): {
  nextStatus: (typeof INVOICE_STATUSES)[number];
  eventType: 'MARKED_PAID' | 'MARKED_UNPAID' | 'WRITTEN_OFF' | 'RESTORED' | 'VOIDED';
  reason: string;
  note: string;
  idempotent: boolean;
} {
  const { action, currentStatus, reason, invoiceId } = params;

  switch (action) {
    case 'mark-paid':
      if (currentStatus === 'VOID') {
        throw badRequest('Voided invoices cannot be marked as paid', { invoiceId });
      }
      return {
        nextStatus: 'PAID',
        eventType: 'MARKED_PAID',
        reason: reason ?? 'Marked paid in reconciler.',
        note: 'Marked paid via /v1/invoices/:invoiceId/mark-paid.',
        idempotent: currentStatus === 'PAID',
      };
    case 'mark-unpaid':
      if (currentStatus !== 'PAID') {
        throw badRequest('Only paid invoices can be moved back to unpaid', { invoiceId });
      }
      return {
        nextStatus: 'SENT',
        eventType: 'MARKED_UNPAID',
        reason: reason ?? 'Moved back to unpaid in reconciler.',
        note: 'Moved back to unpaid via /v1/invoices/:invoiceId/mark-unpaid.',
        idempotent: false,
      };
    case 'write-off':
      if (currentStatus === 'PAID' || currentStatus === 'VOID') {
        throw badRequest('Paid or void invoices cannot be written off', { invoiceId });
      }
      return {
        nextStatus: 'WRITTEN_OFF',
        eventType: 'WRITTEN_OFF',
        reason: reason ?? 'Written off by coach',
        note: 'Written off via /v1/invoices/:invoiceId/write-off.',
        idempotent: currentStatus === 'WRITTEN_OFF',
      };
    case 'restore':
      if (currentStatus !== 'WRITTEN_OFF') {
        throw badRequest('Only written-off invoices can be restored', { invoiceId });
      }
      return {
        nextStatus: 'SENT',
        eventType: 'RESTORED',
        reason: reason ?? 'Restored from write-off.',
        note: 'Restored via /v1/invoices/:invoiceId/restore.',
        idempotent: false,
      };
    case 'void':
      if (currentStatus === 'PAID') {
        throw badRequest('Paid invoices cannot be voided', { invoiceId });
      }
      return {
        nextStatus: 'VOID',
        eventType: 'VOIDED',
        reason: reason ?? 'Voided by coach',
        note: 'Voided via /v1/invoices/:invoiceId/void.',
        idempotent: currentStatus === 'VOID',
      };
  }
}

function assertMutableInvoiceBookingLink(
  tables: SeedTables,
  invoice: SeedRow,
  invoiceId: string,
): void {
  const bookingId = asString(invoice.bookingId);
  if (!bookingId) {
    return;
  }

  const bookingContext = resolveBookingInvoiceContextFromTables(tables, bookingId);
  if (!bookingContext) {
    throw badRequest('Invoice booking link is no longer authoritative', {
      invoiceId,
      bookingId,
    });
  }
  if (bookingContext.coachUserId !== asString(invoice.coachUserId)) {
    throw badRequest('Invoice booking coach link does not match authoritative booking', {
      invoiceId,
      bookingId,
    });
  }
}

function applyBookingCancellationInvoiceEffectsInTables(
  tables: SeedTables,
  input: BookingInvoiceLifecycleInput,
): void {
  const invoices = getActiveRows(getMutableRows(tables, 'invoices')).filter(
    (row) => asString(row.bookingId) === input.bookingId,
  );
  if (invoices.length === 0) {
    return;
  }

  const paidInvoice = invoices.find((row) => toInvoiceStatus(row.status) === 'PAID');
  if (paidInvoice) {
    throw badRequest('Paid booking invoices require a refund workflow before cancellation', {
      bookingId: input.bookingId,
      invoiceId: asString(paidInvoice.id),
    });
  }

  const now = nowIso();
  const paymentAttempts = getMutableRows(tables, 'paymentAttempts');
  const invoiceEvents = getMutableRows(tables, 'invoiceEvents');
  const reconcilerEntries = getMutableRows(tables, 'reconcilerEntries');

  for (const invoice of invoices) {
    const invoiceId = asString(invoice.id) ?? '';
    cancelActivePaymentAttemptsForInvoice({
      paymentAttempts,
      invoiceId,
      now,
      reason: 'Booking was cancelled before payment completion.',
    });

    const status = toInvoiceStatus(invoice.status);
    if (status !== 'DRAFT' && status !== 'SENT') {
      continue;
    }

    const voidReason = input.reason ?? 'Booking cancelled before payment.';
    invoice.status = 'VOID';
    invoice.paidAt = null;
    invoice.voidedAt = now;
    invoice.voidReason = voidReason;
    invoice.updatedAt = now;
    invoice.updatedByUserId = input.actorUserId;
    invoice.version = (asNumber(invoice.version) ?? 1) + 1;

    appendInvoiceEvent({
      invoiceEvents,
      invoiceId,
      eventType: 'VOIDED',
      actorUserId: input.actorUserId,
      reason: voidReason,
      requestId: input.requestId,
      occurredAt: now,
      metadata: {
        source: 'booking-cancellation',
        bookingId: input.bookingId,
      },
    });
    updateReconcilerEntry({
      reconcilerEntries,
      invoice,
      actorUserId: input.actorUserId,
      nextStatus: 'VOID',
      note: 'Voided because the linked booking was cancelled before payment.',
      now,
    });
  }
}

function wasInvoiceVoidedByBookingCancellation(
  invoiceEvents: SeedRow[],
  invoiceId: string,
  bookingId: string,
): boolean {
  return invoiceEvents.some((event) => {
    const metadata = coerceMetadata(event.metadataJson);
    return (
      asString(event.invoiceId) === invoiceId &&
      asString(event.eventType) === 'VOIDED' &&
      asString(metadata.source) === 'booking-cancellation' &&
      asString(metadata.bookingId) === bookingId
    );
  });
}

function applyBookingReopenInvoiceEffectsInTables(
  tables: SeedTables,
  input: BookingInvoiceLifecycleInput,
): void {
  const invoices = getActiveRows(getMutableRows(tables, 'invoices')).filter(
    (row) => asString(row.bookingId) === input.bookingId,
  );
  if (invoices.length === 0) {
    return;
  }

  const invoiceEvents = getMutableRows(tables, 'invoiceEvents');
  const reconcilerEntries = getMutableRows(tables, 'reconcilerEntries');
  const now = nowIso();

  for (const invoice of invoices) {
    const invoiceId = asString(invoice.id) ?? '';
    if (
      toInvoiceStatus(invoice.status) !== 'VOID' ||
      !wasInvoiceVoidedByBookingCancellation(invoiceEvents, invoiceId, input.bookingId)
    ) {
      continue;
    }

    invoice.status = 'SENT';
    invoice.voidedAt = null;
    invoice.voidReason = null;
    invoice.updatedAt = now;
    invoice.updatedByUserId = input.actorUserId;
    invoice.version = (asNumber(invoice.version) ?? 1) + 1;

    appendInvoiceEvent({
      invoiceEvents,
      invoiceId,
      eventType: 'RESTORED',
      actorUserId: input.actorUserId,
      reason: input.reason ?? 'Linked booking reopened.',
      requestId: input.requestId,
      occurredAt: now,
      metadata: {
        source: 'booking-reopen',
        bookingId: input.bookingId,
      },
    });
    updateReconcilerEntry({
      reconcilerEntries,
      invoice,
      actorUserId: input.actorUserId,
      nextStatus: 'SENT',
      note: 'Restored because the linked booking was reopened.',
      now,
    });
  }
}

function applyBookingInvoiceAdjustmentsInTables(
  tables: SeedTables,
  input: BookingInvoiceAdjustmentInput,
): void {
  const bookingIds = new Set(input.bookingIds);
  if (bookingIds.size === 0) {
    return;
  }

  const invoices = getActiveRows(getMutableRows(tables, 'invoices')).filter((row) =>
    bookingIds.has(asString(row.bookingId) ?? ''),
  );
  if (invoices.length === 0) {
    return;
  }

  const blockedInvoice = invoices.find((row) => {
    const status = toInvoiceStatus(row.status);
    return status !== 'DRAFT' && status !== 'SENT';
  });
  if (blockedInvoice) {
    throw badRequest('Booking series updates require explicit invoice adjustment for settled invoices', {
      bookingId: asString(blockedInvoice.bookingId),
      invoiceId: asString(blockedInvoice.id),
      invoiceStatus: toInvoiceStatus(blockedInvoice.status),
    });
  }

  const now = nowIso();
  const invoiceEvents = getMutableRows(tables, 'invoiceEvents');
  const lineItems = getMutableRows(tables, 'invoiceLineItems');
  for (const invoice of invoices) {
    const bookingId = asString(invoice.bookingId);
    const invoiceId = asString(invoice.id) ?? '';
    if (!bookingId) {
      continue;
    }

    const context = resolveBookingInvoiceContextFromTables(tables, bookingId);
    if (!context) {
      throw badRequest('Invoice booking link is no longer authoritative', {
        invoiceId,
        bookingId,
      });
    }
    if (context.coachUserId !== asString(invoice.coachUserId)) {
      throw badRequest('Invoice booking coach link does not match authoritative booking', {
        invoiceId,
        bookingId,
      });
    }

    invoice.sessionDate = context.sessionDate;
    invoice.sessionType = context.sessionType;
    invoice.sessionLocation = context.sessionLocation;
    invoice.sessionDurationMinutes = context.sessionDurationMinutes;
    invoice.updatedAt = now;
    invoice.updatedByUserId = input.actorUserId;
    invoice.version = (asNumber(invoice.version) ?? 1) + 1;

    for (const lineItem of lineItems.filter((row) => asString(row.invoiceId) === invoiceId)) {
      lineItem.description = formatSessionType(context.sessionType) ?? context.sessionType;
      lineItem.updatedAt = now;
    }

    appendInvoiceEvent({
      invoiceEvents,
      invoiceId,
      eventType: 'SENT',
      actorUserId: input.actorUserId,
      reason: input.reason ?? 'Linked booking series was updated.',
      requestId: input.requestId,
      occurredAt: now,
      metadata: {
        source: 'booking-series-update',
        bookingId,
      },
    });
  }
}

function defaultDueDateIso(): string {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  return dueDate.toISOString();
}

function coerceAttemptStatus(value: unknown): string {
  return asString(value)?.toUpperCase() ?? 'PENDING';
}

function expireAttemptRow(row: SeedRow): void {
  if (!ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(coerceAttemptStatus(row.status))) {
    return;
  }
  const expiresAt = parseDate(asString(row.expiresAt));
  if (expiresAt == null || expiresAt >= Date.now()) {
    return;
  }
  row.status = 'EXPIRED';
  row.updatedAt = nowIso();
}

function ensureAttemptFreshness(rows: SeedRow[]): void {
  for (const row of rows) {
    expireAttemptRow(row);
  }
}

function resolveBookingInvoiceContextFromTables(
  tables: SeedTables,
  bookingId: string,
): BookingInvoiceContext | null {
  const booking = getActiveRows(asRows(tables.bookings)).find(
    (row) => asString(row.id) === bookingId,
  );
  if (!booking) {
    return null;
  }

  const bookingParticipants = getActiveRows(asRows(tables.bookingParticipants)).filter(
    (row) => asString(row.bookingId) === bookingId,
  );
  const athleteId = asString(bookingParticipants[0]?.athleteId) ?? null;
  const payerUserId =
    asString(booking.bookedByUserId) ?? asString(bookingParticipants[0]?.guardianUserId) ?? null;
  const totalMinor =
    toInvoiceStatus(booking.status) === 'VOID'
      ? 0
      : ((asString(booking.status) === 'CANCELLED'
          ? asNumber(booking.cancellationFeeMinor)
          : asNumber(booking.priceMinor)) ?? 0);
  const users = asRows(tables.users);
  const coachUser = users.find((row) => asString(row.id) === asString(booking.coachUserId));
  const payerUser = users.find((row) => asString(row.id) === payerUserId);

  return {
    bookingId,
    coachUserId: asString(booking.coachUserId) ?? '',
    payerUserId,
    athleteId,
    sessionDate: asString(booking.scheduledAt) ?? nowIso(),
    sessionType: asString(booking.serviceType) ?? 'Training Session',
    sessionLocation: asString(booking.location) ?? 'Training Ground',
    sessionDurationMinutes: asNumber(booking.durationMinutes) ?? 60,
    totalMinor,
    currency: asString(booking.currency) ?? 'GBP',
    coachBusinessName: displayNameForUser(coachUser) ?? null,
    coachBusinessEmail: asString(coachUser?.email) ?? null,
    billingAddress: displayNameForUser(payerUser) ?? null,
  };
}

async function resolveBookingInvoiceContextFromDb(
  bookingId: string,
): Promise<BookingInvoiceContext | null> {
  const prisma = getPrismaClientOrThrow();
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      deletedAt: null,
    },
    include: {
      participants: {
        where: {
          deletedAt: null,
        },
      },
    },
  });
  if (!booking) {
    return null;
  }

  const firstParticipant = booking.participants[0] ?? null;
  const totalMinor =
    (booking.status === 'CANCELLED' ? booking.cancellationFeeMinor : booking.priceMinor) ?? 0;
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: [booking.coachUserId, booking.bookedByUserId, firstParticipant?.guardianUserId].filter(
          (value): value is string => Boolean(value),
        ),
      },
    },
  });
  const coachUser = users.find((row) => row.id === booking.coachUserId);
  const payerUserId = booking.bookedByUserId ?? firstParticipant?.guardianUserId ?? null;
  const payerUser = users.find((row) => row.id === payerUserId);

  return {
    bookingId: booking.id,
    coachUserId: booking.coachUserId,
    payerUserId,
    athleteId: firstParticipant?.athleteId ?? null,
    sessionDate: booking.scheduledAt.toISOString(),
    sessionType: booking.serviceType ?? 'Training Session',
    sessionLocation: booking.location,
    sessionDurationMinutes: booking.durationMinutes,
    totalMinor,
    currency: booking.currency,
    coachBusinessName: coachUser?.name || coachUser?.email || null,
    coachBusinessEmail: coachUser?.email ?? null,
    billingAddress: payerUser?.name || payerUser?.email || null,
  };
}

async function resolveBookingInvoiceContextFromDbTransaction(
  tx: Pick<PrismaClient, 'booking' | 'user'>,
  bookingId: string,
): Promise<BookingInvoiceContext | null> {
  const booking = await tx.booking.findFirst({
    where: {
      id: bookingId,
      deletedAt: null,
    },
    include: {
      participants: {
        where: {
          deletedAt: null,
        },
      },
    },
  });
  if (!booking) {
    return null;
  }

  const firstParticipant = booking.participants[0] ?? null;
  const totalMinor =
    (booking.status === 'CANCELLED' ? booking.cancellationFeeMinor : booking.priceMinor) ?? 0;
  const users = await tx.user.findMany({
    where: {
      id: {
        in: [booking.coachUserId, booking.bookedByUserId, firstParticipant?.guardianUserId].filter(
          (value): value is string => Boolean(value),
        ),
      },
    },
  });
  const coachUser = users.find((row) => row.id === booking.coachUserId);
  const payerUserId = booking.bookedByUserId ?? firstParticipant?.guardianUserId ?? null;
  const payerUser = users.find((row) => row.id === payerUserId);

  return {
    bookingId: booking.id,
    coachUserId: booking.coachUserId,
    payerUserId,
    athleteId: firstParticipant?.athleteId ?? null,
    sessionDate: booking.scheduledAt.toISOString(),
    sessionType: booking.serviceType ?? 'Training Session',
    sessionLocation: booking.location,
    sessionDurationMinutes: booking.durationMinutes,
    totalMinor,
    currency: booking.currency,
    coachBusinessName: coachUser?.name || coachUser?.email || null,
    coachBusinessEmail: coachUser?.email ?? null,
    billingAddress: payerUser?.name || payerUser?.email || null,
  };
}

export async function getBookingInvoiceContext(
  bookingId: string,
): Promise<BookingInvoiceContext | null> {
  const mutable = resolveMutableTables();
  if (mutable) {
    return resolveBookingInvoiceContextFromTables(mutable.tables, bookingId);
  }
  return resolveBookingInvoiceContextFromDb(bookingId);
}

export async function applyBookingCancellationInvoiceEffectsInDbTransaction(
  tx: InvoicePrismaTransaction,
  input: BookingInvoiceLifecycleInput,
): Promise<void> {
  const invoices = await tx.invoice.findMany({
    where: {
      bookingId: input.bookingId,
      deletedAt: null,
    },
  });
  if (invoices.length === 0) {
    return;
  }

  const paidInvoice = invoices.find((invoice) => invoice.status === 'PAID');
  if (paidInvoice) {
    throw badRequest('Paid booking invoices require a refund workflow before cancellation', {
      bookingId: input.bookingId,
      invoiceId: paidInvoice.id,
    });
  }

  const now = new Date();
  for (const invoice of invoices) {
    await tx.paymentAttempt.updateMany({
      where: {
        invoiceId: invoice.id,
        status: {
          in: ['PENDING', 'ACTION_REQUIRED'],
        },
      },
      data: {
        status: 'CANCELED',
        canceledAt: now,
        failureReason: 'Booking was cancelled before payment completion.',
      },
    });

    if (invoice.status !== 'DRAFT' && invoice.status !== 'SENT') {
      continue;
    }

    const voidReason = input.reason ?? 'Booking cancelled before payment.';
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'VOID',
        paidAt: null,
        voidedAt: now,
        voidReason,
        updatedByUserId: input.actorUserId,
        version: {
          increment: 1,
        },
      },
    });
    await tx.invoiceEvent.create({
      data: {
        id: newId('ine'),
        invoiceId: invoice.id,
        eventType: 'VOIDED',
        actorUserId: input.actorUserId,
        reason: voidReason,
        requestId: input.requestId ?? null,
        metadataJson: {
          source: 'booking-cancellation',
          bookingId: input.bookingId,
        } as never,
      },
    });

    const existingReconciler = await tx.reconcilerEntry.findFirst({
      where: { invoiceId: invoice.id },
    });
    if (existingReconciler) {
      await tx.reconcilerEntry.update({
        where: { id: existingReconciler.id },
        data: {
          state: 'VOID',
          internalNote: 'Voided because the linked booking was cancelled before payment.',
          updatedByUserId: input.actorUserId,
          version: {
            increment: 1,
          },
        },
      });
    } else {
      await tx.reconcilerEntry.create({
        data: {
          id: newId('rec'),
          invoiceId: invoice.id,
          coachUserId: invoice.coachUserId,
          state: 'VOID',
          internalNote: 'Voided because the linked booking was cancelled before payment.',
          createdByUserId: input.actorUserId,
          updatedByUserId: input.actorUserId,
        },
      });
    }
  }
}

export async function applyBookingReopenInvoiceEffectsInDbTransaction(
  tx: InvoicePrismaTransaction,
  input: BookingInvoiceLifecycleInput,
): Promise<void> {
  const invoices = await tx.invoice.findMany({
    where: {
      bookingId: input.bookingId,
      status: 'VOID',
      deletedAt: null,
    },
  });
  if (invoices.length === 0) {
    return;
  }

  const now = new Date();
  for (const invoice of invoices) {
    const cancellationVoidEvent = await tx.invoiceEvent.findFirst({
      where: {
        invoiceId: invoice.id,
        eventType: 'VOIDED',
        metadataJson: {
          path: ['source'],
          equals: 'booking-cancellation',
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
    });
    const metadata = coerceMetadata(cancellationVoidEvent?.metadataJson);
    if (asString(metadata.bookingId) !== input.bookingId) {
      continue;
    }

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'SENT',
        voidedAt: null,
        voidReason: null,
        updatedByUserId: input.actorUserId,
        version: {
          increment: 1,
        },
      },
    });
    await tx.invoiceEvent.create({
      data: {
        id: newId('ine'),
        invoiceId: invoice.id,
        eventType: 'RESTORED',
        actorUserId: input.actorUserId,
        reason: input.reason ?? 'Linked booking reopened.',
        requestId: input.requestId ?? null,
        metadataJson: {
          source: 'booking-reopen',
          bookingId: input.bookingId,
        } as never,
      },
    });

    const existingReconciler = await tx.reconcilerEntry.findFirst({
      where: { invoiceId: invoice.id },
    });
    if (existingReconciler) {
      await tx.reconcilerEntry.update({
        where: { id: existingReconciler.id },
        data: {
          state: 'OUTSTANDING',
          internalNote: 'Restored because the linked booking was reopened.',
          updatedByUserId: input.actorUserId,
          version: {
            increment: 1,
          },
        },
      });
    } else {
      await tx.reconcilerEntry.create({
        data: {
          id: newId('rec'),
          invoiceId: invoice.id,
          coachUserId: invoice.coachUserId,
          state: 'OUTSTANDING',
          internalNote: 'Restored because the linked booking was reopened.',
          createdByUserId: input.actorUserId,
          updatedByUserId: input.actorUserId,
        },
      });
    }
  }
}

export async function applyBookingInvoiceAdjustmentsInDbTransaction(
  tx: InvoicePrismaTransaction,
  input: BookingInvoiceAdjustmentInput,
): Promise<void> {
  if (input.bookingIds.length === 0) {
    return;
  }

  const invoices = await tx.invoice.findMany({
    where: {
      bookingId: { in: input.bookingIds },
      deletedAt: null,
    },
  });
  if (invoices.length === 0) {
    return;
  }

  const blockedInvoice = invoices.find(
    (invoice) => invoice.status !== 'DRAFT' && invoice.status !== 'SENT',
  );
  if (blockedInvoice) {
    throw badRequest('Booking series updates require explicit invoice adjustment for settled invoices', {
      bookingId: blockedInvoice.bookingId,
      invoiceId: blockedInvoice.id,
      invoiceStatus: blockedInvoice.status,
    });
  }

  const now = new Date();
  for (const invoice of invoices) {
    if (!invoice.bookingId) {
      continue;
    }

    const context = await resolveBookingInvoiceContextFromDbTransaction(tx, invoice.bookingId);
    if (!context) {
      throw badRequest('Invoice booking link is no longer authoritative', {
        invoiceId: invoice.id,
        bookingId: invoice.bookingId,
      });
    }
    if (context.coachUserId !== invoice.coachUserId) {
      throw badRequest('Invoice booking coach link does not match authoritative booking', {
        invoiceId: invoice.id,
        bookingId: invoice.bookingId,
      });
    }

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        sessionDate: new Date(context.sessionDate),
        sessionType: context.sessionType,
        sessionLocation: context.sessionLocation,
        sessionDurationMinutes: context.sessionDurationMinutes,
        updatedByUserId: input.actorUserId,
        version: {
          increment: 1,
        },
      },
    });
    await tx.invoiceLineItem.updateMany({
      where: { invoiceId: invoice.id },
      data: {
        description: formatSessionType(context.sessionType) ?? context.sessionType,
      },
    });
    await tx.invoiceEvent.create({
      data: {
        id: newId('ine'),
        invoiceId: invoice.id,
        eventType: 'SENT',
        actorUserId: input.actorUserId,
        reason: input.reason ?? 'Linked booking series was updated.',
        requestId: input.requestId ?? null,
        occurredAt: now,
        metadataJson: {
          source: 'booking-series-update',
          bookingId: invoice.bookingId,
        } as never,
      },
    });
  }
}

export async function applyBookingCancellationInvoiceEffects(
  input: BookingInvoiceLifecycleInput,
): Promise<void> {
  const mutable = resolveMutableTables();
  if (mutable) {
    applyBookingCancellationInvoiceEffectsInTables(mutable.tables, input);
    return;
  }

  const prisma = getPrismaClientOrThrow();
  await prisma.$transaction((tx) => applyBookingCancellationInvoiceEffectsInDbTransaction(tx, input));
}

export async function applyBookingReopenInvoiceEffects(
  input: BookingInvoiceLifecycleInput,
): Promise<void> {
  const mutable = resolveMutableTables();
  if (mutable) {
    applyBookingReopenInvoiceEffectsInTables(mutable.tables, input);
    return;
  }

  const prisma = getPrismaClientOrThrow();
  await prisma.$transaction((tx) => applyBookingReopenInvoiceEffectsInDbTransaction(tx, input));
}

export async function applyBookingInvoiceAdjustments(
  input: BookingInvoiceAdjustmentInput,
): Promise<void> {
  const mutable = resolveMutableTables();
  if (mutable) {
    applyBookingInvoiceAdjustmentsInTables(mutable.tables, input);
    return;
  }

  const prisma = getPrismaClientOrThrow();
  await prisma.$transaction((tx) => applyBookingInvoiceAdjustmentsInDbTransaction(tx, input));
}

function mapPaymentAttemptRow(row: SeedRow): SeedRow {
  return normalizeForJson({
    id: asString(row.id) ?? '',
    invoiceId: asString(row.invoiceId) ?? '',
    actorUserId: asString(row.actorUserId) ?? '',
    provider: asString(row.provider) ?? 'simulated',
    providerSessionId: asString(row.providerSessionId) ?? null,
    idempotencyKey: asString(row.idempotencyKey) ?? null,
    status: coerceAttemptStatus(row.status),
    amountMinor: asNumber(row.amountMinor) ?? 0,
    currency: asString(row.currency) ?? 'GBP',
    expiresAt: asString(row.expiresAt) ?? null,
    confirmedAt: asString(row.confirmedAt) ?? null,
    failureCode: asString(row.failureCode) ?? null,
    failureReason: asString(row.failureReason) ?? null,
    metadataJson: coerceMetadata(row.metadataJson),
    createdAt: asString(row.createdAt) ?? nowIso(),
    updatedAt: asString(row.updatedAt) ?? nowIso(),
  });
}

export async function listAccessibleInvoices(
  authUserId: string,
  isAdmin: boolean,
  query: InvoiceListQuery,
): Promise<SeedRow[]> {
  const mutable = resolveMutableTables();
  if (mutable) {
    const users = asRows(mutable.tables.users);
    return getActiveRows(asRows(mutable.tables.invoices))
      .filter((row) => canAccessInvoiceRow(authUserId, isAdmin, row))
      .filter((row) => matchesInvoiceFilters(row, query))
      .map((row) => mapInvoice(row, users))
      .sort(
        (left, right) =>
          (parseDate(asString(right.createdAt)) ?? 0) - (parseDate(asString(left.createdAt)) ?? 0),
      );
  }

  const prisma = getPrismaClientOrThrow();
  const statuses = query.status
    ? query.status
        .split(',')
        .map((value) => value.trim().toUpperCase())
        .filter((value): value is (typeof INVOICE_STATUSES)[number] =>
          INVOICE_STATUSES.includes(value as (typeof INVOICE_STATUSES)[number]),
        )
    : undefined;
  const where = {
    deletedAt: null,
    ...(isAdmin
      ? {}
      : {
          OR: [{ coachUserId: authUserId }, { payerUserId: authUserId }],
        }),
    ...(query.coachId ? { coachUserId: query.coachId } : {}),
    ...(query.bookingId ? { bookingId: query.bookingId } : {}),
    ...(statuses
      ? {
          status: {
            in: statuses,
          },
        }
      : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          sessionDate: {
            ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
            ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
          },
        }
      : {}),
  } as const;
  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
  });
  return invoices.map((row) => normalizeForJson(mapInvoice(row as unknown as SeedRow, [])));
}

export async function getInvoiceDetail(invoiceId: string): Promise<InvoiceDetailRecord | null> {
  const mutable = resolveMutableTables();
  if (mutable) {
    const users = asRows(mutable.tables.users);
    const invoice = getActiveRows(asRows(mutable.tables.invoices)).find(
      (row) => asString(row.id) === invoiceId,
    );
    if (!invoice) {
      return null;
    }
    const paymentAttempts = getMutableRows(mutable.tables, 'paymentAttempts');
    ensureAttemptFreshness(paymentAttempts);
    return {
      invoice: mapInvoice(invoice, users),
      lineItems: normalizeForJson(
        getActiveRows(asRows(mutable.tables.invoiceLineItems)).filter(
          (row) => asString(row.invoiceId) === invoiceId,
        ),
      ),
      events: normalizeForJson(
        asRows(mutable.tables.invoiceEvents).filter((row) => asString(row.invoiceId) === invoiceId),
      ),
      reconcilerEntry: normalizeForJson(
        asRows(mutable.tables.reconcilerEntries).find(
          (row) => asString(row.invoiceId) === invoiceId,
        ) ?? null,
      ),
      reminders: normalizeForJson(
        asRows(mutable.tables.paymentReminders).filter(
          (row) => asString(row.invoiceId) === invoiceId,
        ),
      ),
      paymentInstructionTemplates: normalizeForJson(
        getActiveRows(asRows(mutable.tables.paymentInstructionTemplates)).filter(
          (row) => asString(row.coachUserId) === asString(invoice.coachUserId),
        ),
      ),
      paymentAttempts: normalizeForJson(
        paymentAttempts
          .filter((row) => asString(row.invoiceId) === invoiceId)
          .map((row) => mapPaymentAttemptRow(row)),
      ),
    };
  }

  const prisma = getPrismaClientOrThrow();
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      deletedAt: null,
    },
    include: {
      lineItems: true,
      events: {
        orderBy: {
          occurredAt: 'asc',
        },
      },
      reconcilerEntries: true,
      reminders: {
        orderBy: {
          sentAt: 'desc',
        },
      },
      paymentAttempts: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
  if (!invoice) {
    return null;
  }
  const paymentInstructionTemplates = await prisma.paymentInstructionTemplate.findMany({
    where: {
      coachUserId: invoice.coachUserId,
      deletedAt: null,
    },
  });

  return {
    invoice: normalizeForJson(mapInvoice(invoice as unknown as SeedRow, [])),
    lineItems: normalizeForJson(invoice.lineItems),
    events: normalizeForJson(invoice.events),
    reconcilerEntry: normalizeForJson(invoice.reconcilerEntries[0] ?? null),
    reminders: normalizeForJson(invoice.reminders),
    paymentInstructionTemplates: normalizeForJson(paymentInstructionTemplates),
    paymentAttempts: normalizeForJson(
      invoice.paymentAttempts.map((row) => mapPaymentAttemptRow(row as unknown as SeedRow)),
    ),
  };
}

export async function getInvoiceRow(invoiceId: string): Promise<SeedRow | null> {
  const mutable = resolveMutableTables();
  if (mutable) {
    return (
      getActiveRows(asRows(mutable.tables.invoices)).find(
        (row) => asString(row.id) === invoiceId,
      ) ?? null
    );
  }

  const prisma = getPrismaClientOrThrow();
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      deletedAt: null,
    },
  });
  return invoice ? normalizeForJson(invoice) : null;
}

export async function transitionInvoiceStatus(input: TransitionInvoiceInput): Promise<SeedRow> {
  const mutable = resolveMutableTables();
  if (mutable) {
    const invoices = getMutableRows(mutable.tables, 'invoices');
    const invoice = getActiveRows(invoices).find((row) => asString(row.id) === input.invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId: input.invoiceId });
    }

    const bookingId = asString(invoice.bookingId);
    assertMutableInvoiceBookingLink(mutable.tables, invoice, input.invoiceId);

    const currentStatus = toInvoiceStatus(invoice.status);
    const plan = getInvoiceTransitionPlan({
      action: input.action,
      currentStatus,
      reason: input.reason,
      invoiceId: input.invoiceId,
    });
    if (plan.idempotent) {
      return invoice;
    }

    const now = nowIso();
    invoice.status = plan.nextStatus;
    invoice.updatedAt = now;
    invoice.updatedByUserId = input.actorUserId;
    invoice.version = (asNumber(invoice.version) ?? 1) + 1;

    switch (input.action) {
      case 'mark-paid':
        invoice.paidAt = now;
        break;
      case 'mark-unpaid':
        invoice.paidAt = null;
        break;
      case 'write-off':
        invoice.paidAt = null;
        invoice.voidReason = plan.reason;
        break;
      case 'restore':
        invoice.voidReason = null;
        break;
      case 'void':
        invoice.paidAt = null;
        invoice.voidedAt = now;
        invoice.voidReason = plan.reason;
        break;
    }

    appendInvoiceEvent({
      invoiceEvents: getMutableRows(mutable.tables, 'invoiceEvents'),
      invoiceId: input.invoiceId,
      eventType: plan.eventType,
      actorUserId: input.actorUserId,
      reason: plan.reason,
      requestId: input.requestId,
      occurredAt: now,
      metadata: {
        source: 'coach-reconciler',
        bookingId: bookingId ?? null,
      },
    });
    updateReconcilerEntry({
      reconcilerEntries: getMutableRows(mutable.tables, 'reconcilerEntries'),
      invoice,
      actorUserId: input.actorUserId,
      nextStatus: plan.nextStatus,
      note: plan.note,
      now,
    });

    return invoice;
  }

  const prisma = getPrismaClientOrThrow();
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: {
        id: input.invoiceId,
        deletedAt: null,
      },
    });
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId: input.invoiceId });
    }

    if (invoice.bookingId) {
      const booking = await tx.booking.findFirst({
        where: {
          id: invoice.bookingId,
          deletedAt: null,
        },
      });
      if (!booking) {
        throw badRequest('Invoice booking link is no longer authoritative', {
          invoiceId: input.invoiceId,
          bookingId: invoice.bookingId,
        });
      }
      if (booking.coachUserId !== invoice.coachUserId) {
        throw badRequest('Invoice booking coach link does not match authoritative booking', {
          invoiceId: input.invoiceId,
          bookingId: invoice.bookingId,
        });
      }
    }

    const currentStatus = toInvoiceStatus(invoice.status);
    const plan = getInvoiceTransitionPlan({
      action: input.action,
      currentStatus,
      reason: input.reason,
      invoiceId: input.invoiceId,
    });
    if (plan.idempotent) {
      return normalizeForJson(invoice);
    }

    const now = new Date();
    const data = {
      status: plan.nextStatus,
      updatedByUserId: input.actorUserId,
      version: {
        increment: 1,
      },
      ...(input.action === 'mark-paid' ? { paidAt: now } : {}),
      ...(input.action === 'mark-unpaid' ? { paidAt: null } : {}),
      ...(input.action === 'write-off' ? { paidAt: null, voidReason: plan.reason } : {}),
      ...(input.action === 'restore' ? { voidReason: null } : {}),
      ...(input.action === 'void' ? { paidAt: null, voidedAt: now, voidReason: plan.reason } : {}),
    };

    const updatedInvoice = await tx.invoice.update({
      where: { id: input.invoiceId },
      data,
    });
    await tx.invoiceEvent.create({
      data: {
        id: newId('ine'),
        invoiceId: input.invoiceId,
        eventType: plan.eventType,
        actorUserId: input.actorUserId,
        reason: plan.reason,
        requestId: input.requestId ?? null,
        metadataJson: {
          source: 'coach-reconciler',
          bookingId: invoice.bookingId ?? null,
        } as never,
      },
    });

    const existingReconciler = await tx.reconcilerEntry.findFirst({
      where: { invoiceId: input.invoiceId },
    });
    if (existingReconciler) {
      await tx.reconcilerEntry.update({
        where: { id: existingReconciler.id },
        data: {
          state: reconcileStateForInvoiceStatus(plan.nextStatus),
          internalNote: plan.note,
          updatedByUserId: input.actorUserId,
          version: {
            increment: 1,
          },
        },
      });
    } else {
      await tx.reconcilerEntry.create({
        data: {
          id: newId('rec'),
          invoiceId: input.invoiceId,
          coachUserId: invoice.coachUserId,
          state: reconcileStateForInvoiceStatus(plan.nextStatus),
          internalNote: plan.note,
          createdByUserId: input.actorUserId,
          updatedByUserId: input.actorUserId,
        },
      });
    }

    return normalizeForJson(updatedInvoice);
  });
}

export async function requestInvoiceRefund(
  input: RequestInvoiceRefundInput,
): Promise<InvoiceRefundRecord> {
  const reason = input.reason.trim();
  if (!reason) {
    throw badRequest('Refund reason is required', { invoiceId: input.invoiceId });
  }
  if (input.verificationCode.trim() !== SIMULATED_REFUND_VERIFICATION_CODE) {
    throw badRequest('Refund verification code is invalid', { invoiceId: input.invoiceId });
  }

  const mutable = resolveMutableTables();
  if (mutable) {
    const invoices = getMutableRows(mutable.tables, 'invoices');
    const invoice = getActiveRows(invoices).find((row) => asString(row.id) === input.invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId: input.invoiceId });
    }
    assertMutableInvoiceBookingLink(mutable.tables, invoice, input.invoiceId);

    const totalMinor = asNumber(invoice.totalMinor) ?? 0;
    const amountMinor = input.amountMinor ?? totalMinor;
    if (amountMinor !== totalMinor || amountMinor <= 0) {
      throw badRequest('Refund amount must match the paid invoice total', {
        invoiceId: input.invoiceId,
        totalMinor,
        amountMinor,
      });
    }

    const requestHash = buildRefundRequestHash({ amountMinor, reason });
    const invoiceEvents = getMutableRows(mutable.tables, 'invoiceEvents');
    const existing = existingRefundEventFromRows(invoiceEvents, input.invoiceId, input.idempotencyKey);
    if (existing) {
      const metadata = coerceMetadata(existing.metadataJson);
      if (asString(metadata.requestHash) !== requestHash) {
        throw badRequest('Refund idempotency key already belongs to a different request', {
          invoiceId: input.invoiceId,
          idempotencyKey: input.idempotencyKey,
        });
      }
      return { invoice, refund: existing, reused: true };
    }

    const status = toInvoiceStatus(invoice.status);
    if (status !== 'PAID') {
      throw badRequest('Only paid invoices can be refunded', {
        invoiceId: input.invoiceId,
        status,
      });
    }

    const now = nowIso();
    const refundId = newId('rfnd');
    invoice.status = 'VOID';
    invoice.paidAt = null;
    invoice.voidedAt = now;
    invoice.voidReason = reason;
    invoice.updatedAt = now;
    invoice.updatedByUserId = input.actorUserId;
    invoice.version = (asNumber(invoice.version) ?? 1) + 1;

    appendInvoiceEvent({
      invoiceEvents,
      invoiceId: input.invoiceId,
      eventType: 'VOIDED',
      actorUserId: input.actorUserId,
      reason,
      requestId: input.requestId,
      occurredAt: now,
      metadata: {
        source: 'invoice-refund',
        refundId,
        provider: 'simulated',
        status: 'APPROVED',
        amountMinor,
        currency: asString(invoice.currency) ?? 'GBP',
        idempotencyKey: input.idempotencyKey,
        requestHash,
        bookingId: asString(invoice.bookingId) ?? null,
      },
    });

    const refundEvent = invoiceEvents[invoiceEvents.length - 1];
    updateReconcilerEntry({
      reconcilerEntries: getMutableRows(mutable.tables, 'reconcilerEntries'),
      invoice,
      actorUserId: input.actorUserId,
      nextStatus: 'VOID',
      note: 'Refund approved through backend invoice authority.',
      now,
    });
    return { invoice, refund: refundEvent, reused: false };
  }

  const prisma = getPrismaClientOrThrow();
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: {
        id: input.invoiceId,
        deletedAt: null,
      },
    });
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId: input.invoiceId });
    }
    if (invoice.bookingId) {
      const booking = await tx.booking.findFirst({
        where: {
          id: invoice.bookingId,
          deletedAt: null,
        },
      });
      if (!booking) {
        throw badRequest('Invoice booking link is no longer authoritative', {
          invoiceId: input.invoiceId,
          bookingId: invoice.bookingId,
        });
      }
      if (booking.coachUserId !== invoice.coachUserId) {
        throw badRequest('Invoice booking coach link does not match authoritative booking', {
          invoiceId: input.invoiceId,
          bookingId: invoice.bookingId,
        });
      }
    }

    const totalMinor = invoice.totalMinor;
    const amountMinor = input.amountMinor ?? totalMinor;
    if (amountMinor !== totalMinor || amountMinor <= 0) {
      throw badRequest('Refund amount must match the paid invoice total', {
        invoiceId: input.invoiceId,
        totalMinor,
        amountMinor,
      });
    }

    const requestHash = buildRefundRequestHash({ amountMinor, reason });
    const existing = await tx.invoiceEvent.findFirst({
      where: {
        invoiceId: input.invoiceId,
        eventType: 'VOIDED',
        metadataJson: {
          path: ['idempotencyKey'],
          equals: input.idempotencyKey,
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
    });
    const existingMetadata = coerceMetadata(existing?.metadataJson);
    if (existing && asString(existingMetadata.source) === 'invoice-refund') {
      if (asString(existingMetadata.requestHash) !== requestHash) {
        throw badRequest('Refund idempotency key already belongs to a different request', {
          invoiceId: input.invoiceId,
          idempotencyKey: input.idempotencyKey,
        });
      }
      return {
        invoice: normalizeForJson(invoice),
        refund: normalizeForJson(existing),
        reused: true,
      };
    }

    if (invoice.status !== 'PAID') {
      throw badRequest('Only paid invoices can be refunded', {
        invoiceId: input.invoiceId,
        status: invoice.status,
      });
    }

    const now = new Date();
    const refundId = newId('rfnd');
    const updatedInvoice = await tx.invoice.update({
      where: { id: input.invoiceId },
      data: {
        status: 'VOID',
        paidAt: null,
        voidedAt: now,
        voidReason: reason,
        updatedByUserId: input.actorUserId,
        version: {
          increment: 1,
        },
      },
    });

    const refundEvent = await tx.invoiceEvent.create({
      data: {
        id: newId('ine'),
        invoiceId: input.invoiceId,
        eventType: 'VOIDED',
        actorUserId: input.actorUserId,
        reason,
        requestId: input.requestId ?? null,
        metadataJson: {
          source: 'invoice-refund',
          refundId,
          provider: 'simulated',
          status: 'APPROVED',
          amountMinor,
          currency: invoice.currency,
          idempotencyKey: input.idempotencyKey,
          requestHash,
          bookingId: invoice.bookingId ?? null,
        } as never,
      },
    });

    const existingReconciler = await tx.reconcilerEntry.findFirst({
      where: { invoiceId: input.invoiceId },
    });
    if (existingReconciler) {
      await tx.reconcilerEntry.update({
        where: { id: existingReconciler.id },
        data: {
          state: 'VOID',
          internalNote: 'Refund approved through backend invoice authority.',
          updatedByUserId: input.actorUserId,
          version: {
            increment: 1,
          },
        },
      });
    } else {
      await tx.reconcilerEntry.create({
        data: {
          id: newId('rec'),
          invoiceId: input.invoiceId,
          coachUserId: invoice.coachUserId,
          state: 'VOID',
          internalNote: 'Refund approved through backend invoice authority.',
          createdByUserId: input.actorUserId,
          updatedByUserId: input.actorUserId,
        },
      });
    }

    return {
      invoice: normalizeForJson(updatedInvoice),
      refund: normalizeForJson(refundEvent),
      reused: false,
    };
  });
}

export async function generateInvoiceForBooking(
  input: GenerateInvoiceInput,
): Promise<GeneratedInvoiceRecord> {
  const taxRatePercent = input.taxRatePercent ?? 20;
  const mutable = resolveMutableTables();
  if (mutable) {
    const invoices = getMutableRows(mutable.tables, 'invoices');
    const existing = getActiveRows(invoices).find(
      (row) => asString(row.bookingId) === input.bookingId,
    );
    if (existing) {
      return { invoice: existing, created: false };
    }

    const context = resolveBookingInvoiceContextFromTables(mutable.tables, input.bookingId);
    if (!context) {
      throw notFound('Booking not found', { bookingId: input.bookingId });
    }
    if (context.totalMinor <= 0) {
      throw badRequest('Booking has no billable value', { bookingId: input.bookingId });
    }

    const { subtotalMinor, taxMinor } = computeTaxBreakdown(context.totalMinor, taxRatePercent);
    const now = nowIso();
    const invoiceId = newId('invc');
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const invoice: SeedRow = {
      id: invoiceId,
      invoiceNumber,
      bookingId: context.bookingId,
      coachUserId: context.coachUserId,
      payerUserId: context.payerUserId,
      athleteId: context.athleteId,
      status: 'SENT',
      sessionDate: context.sessionDate,
      sessionType: context.sessionType,
      sessionLocation: context.sessionLocation,
      sessionDurationMinutes: context.sessionDurationMinutes,
      subtotalMinor,
      taxMinor,
      taxRatePercent,
      totalMinor: context.totalMinor,
      currency: context.currency,
      dueDate: input.dueDate ?? defaultDueDateIso(),
      sentAt: null,
      paidAt: null,
      voidedAt: null,
      voidReason: null,
      notes: input.notes ?? null,
      coachBusinessName: context.coachBusinessName ?? null,
      coachBusinessEmail: context.coachBusinessEmail ?? null,
      billingAddress: context.billingAddress ?? null,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
      sentTo: context.payerUserId
        ? (findUserEmail(asRows(mutable.tables.users), context.payerUserId) ?? null)
        : null,
    };
    invoices.push(invoice);

    getMutableRows(mutable.tables, 'invoiceLineItems').push({
      id: newId('ili'),
      invoiceId,
      description: `${context.sessionType} on ${new Date(context.sessionDate).toISOString().slice(0, 10)}`,
      quantity: 1,
      unitAmountMinor: subtotalMinor,
      lineSubtotalMinor: subtotalMinor,
      taxRatePercent,
      taxMinor,
      totalMinor: context.totalMinor,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });
    getMutableRows(mutable.tables, 'invoiceEvents').push({
      id: newId('ine'),
      invoiceId,
      eventType: 'GENERATED',
      actorUserId: input.actorUserId,
      reason: 'Generated from booking through authoritative invoice runtime.',
      metadataJson: {
        bookingId: input.bookingId,
        source: 'invoice-runtime',
      },
      requestId: null,
      occurredAt: now,
    });

    return { invoice, created: true };
  }

  const prisma = getPrismaClientOrThrow();
  const existing = await prisma.invoice.findFirst({
    where: {
      bookingId: input.bookingId,
      deletedAt: null,
    },
  });
  if (existing) {
    return { invoice: normalizeForJson(existing), created: false };
  }

  const context = await resolveBookingInvoiceContextFromDb(input.bookingId);
  if (!context) {
    throw notFound('Booking not found', { bookingId: input.bookingId });
  }
  if (context.totalMinor <= 0) {
    throw badRequest('Booking has no billable value', { bookingId: input.bookingId });
  }

  const { subtotalMinor, taxMinor } = computeTaxBreakdown(context.totalMinor, taxRatePercent);
  const now = new Date();
  const invoiceId = newId('invc');
  const invoiceNumber = `INV-${now.getUTCFullYear()}-${String(Date.now()).slice(-6)}`;
  const dueDate = new Date(input.dueDate ?? defaultDueDateIso());

  const created = await prisma.invoice.create({
    data: {
      id: invoiceId,
      invoiceNumber,
      bookingId: context.bookingId,
      coachUserId: context.coachUserId,
      payerUserId: context.payerUserId,
      athleteId: context.athleteId,
      status: 'SENT',
      sessionDate: new Date(context.sessionDate),
      sessionType: context.sessionType,
      sessionLocation: context.sessionLocation,
      sessionDurationMinutes: context.sessionDurationMinutes,
      subtotalMinor,
      taxMinor,
      taxRatePercent,
      totalMinor: context.totalMinor,
      currency: context.currency,
      dueDate,
      notes: input.notes ?? null,
      coachBusinessName: context.coachBusinessName ?? null,
      coachBusinessEmail: context.coachBusinessEmail ?? null,
      billingAddress: context.billingAddress ?? null,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
      lineItems: {
        create: {
          id: newId('ili'),
          description: `${context.sessionType} on ${new Date(context.sessionDate).toISOString().slice(0, 10)}`,
          quantity: 1,
          unitAmountMinor: subtotalMinor,
          lineSubtotalMinor: subtotalMinor,
          taxRatePercent,
          taxMinor,
          totalMinor: context.totalMinor,
          sortOrder: 0,
        },
      },
      events: {
        create: {
          id: newId('ine'),
          eventType: 'GENERATED',
          actorUserId: input.actorUserId,
          reason: 'Generated from booking through authoritative invoice runtime.',
          metadataJson: {
            bookingId: input.bookingId,
            source: 'invoice-runtime',
          } as never,
        },
      },
    },
  });

  return {
    invoice: normalizeForJson(created),
    created: true,
  };
}

export async function createInvoiceReminder(
  input: CreateInvoiceReminderInput,
): Promise<InvoiceReminderRecord> {
  const mutable = resolveMutableTables();
  if (mutable) {
    const invoices = getMutableRows(mutable.tables, 'invoices');
    const invoice = getActiveRows(invoices).find((row) => asString(row.id) === input.invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId: input.invoiceId });
    }
    const status = toInvoiceStatus(invoice.status);
    if (status === 'VOID' || status === 'PAID' || status === 'WRITTEN_OFF') {
      throw badRequest('Only open invoices can be sent or reminded', {
        invoiceId: input.invoiceId,
        status,
      });
    }

    const now = nowIso();
    const recipientUserId = asString(invoice.payerUserId) ?? null;
    if (status === 'DRAFT') {
      invoice.status = 'SENT';
      invoice.sentAt = now;
      invoice.sentTo = input.recipientEmail ?? invoice.sentTo ?? null;
      invoice.updatedAt = now;
      invoice.updatedByUserId = input.actorUserId;
      invoice.version = (asNumber(invoice.version) ?? 1) + 1;
      getMutableRows(mutable.tables, 'invoiceEvents').push({
        id: newId('ine'),
        invoiceId: input.invoiceId,
        eventType: 'SENT',
        actorUserId: input.actorUserId,
        reason: 'Invoice sent to payer.',
        metadataJson: {
          recipientEmail: input.recipientEmail ?? null,
          source: 'invoice-runtime',
        },
        requestId: null,
        occurredAt: now,
      });
    }

    const reminder = {
      id: newId('rem'),
      invoiceId: input.invoiceId,
      recipientUserId,
      sentByUserId: input.actorUserId,
      channel: 'email',
      deliveryStatus: 'queued',
      messageSnapshot: input.message ?? null,
      sentAt: now,
      metadataJson: {
        recipientEmail: input.recipientEmail ?? null,
      },
    };
    getMutableRows(mutable.tables, 'paymentReminders').push(reminder);
    getMutableRows(mutable.tables, 'invoiceEvents').push({
      id: newId('ine'),
      invoiceId: input.invoiceId,
      eventType: 'REMINDER_SENT',
      actorUserId: input.actorUserId,
      reason: 'Invoice reminder queued.',
      metadataJson: {
        recipientEmail: input.recipientEmail ?? null,
        source: 'invoice-runtime',
      },
      requestId: null,
      occurredAt: now,
    });

    return { invoice, reminder, sentAt: now };
  }

  const prisma = getPrismaClientOrThrow();
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: input.invoiceId,
      deletedAt: null,
    },
  });
  if (!invoice) {
    throw notFound('Invoice not found', { invoiceId: input.invoiceId });
  }
  if (invoice.status === 'VOID' || invoice.status === 'PAID' || invoice.status === 'WRITTEN_OFF') {
    throw badRequest('Only open invoices can be sent or reminded', {
      invoiceId: input.invoiceId,
      status: invoice.status,
    });
  }
  const now = new Date();

  const updatedInvoice =
    invoice.status === 'DRAFT'
      ? await prisma.invoice.update({
          where: { id: input.invoiceId },
          data: {
            status: 'SENT',
            sentAt: now,
            updatedByUserId: input.actorUserId,
            version: {
              increment: 1,
            },
            events: {
              create: {
                id: newId('ine'),
                eventType: 'SENT',
                actorUserId: input.actorUserId,
                reason: 'Invoice sent to payer.',
                metadataJson: {
                  recipientEmail: input.recipientEmail ?? null,
                  source: 'invoice-runtime',
                } as never,
              },
            },
          },
        })
      : invoice;

  const reminder = await prisma.paymentReminder.create({
    data: {
      id: newId('rem'),
      invoiceId: input.invoiceId,
      recipientUserId: invoice.payerUserId,
      sentByUserId: input.actorUserId,
      channel: 'email',
      deliveryStatus: 'queued',
      messageSnapshot: input.message ?? null,
      metadataJson: {
        recipientEmail: input.recipientEmail ?? null,
      } as never,
    },
  });
  await prisma.invoiceEvent.create({
    data: {
      id: newId('ine'),
      invoiceId: input.invoiceId,
      eventType: 'REMINDER_SENT',
      actorUserId: input.actorUserId,
      reason: 'Invoice reminder queued.',
      metadataJson: {
        recipientEmail: input.recipientEmail ?? null,
        source: 'invoice-runtime',
      } as never,
    },
  });

  return {
    invoice: normalizeForJson(updatedInvoice),
    reminder: normalizeForJson(reminder),
    sentAt: now.toISOString(),
  };
}

export async function createInvoicePaymentSession(
  input: CreateInvoicePaymentSessionInput,
): Promise<InvoicePaymentSessionRecord> {
  const provider = getConfiguredPaymentProvider();
  const mutable = resolveMutableTables();
  if (mutable) {
    const invoices = getMutableRows(mutable.tables, 'invoices');
    const invoice = getActiveRows(invoices).find((row) => asString(row.id) === input.invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId: input.invoiceId });
    }
    const status = toInvoiceStatus(invoice.status);
    if (status === 'PAID') {
      throw badRequest('Invoice is already paid', { invoiceId: input.invoiceId });
    }
    if (status !== 'SENT') {
      throw badRequest('Only sent invoices can create payment sessions', {
        invoiceId: input.invoiceId,
        status,
      });
    }
    assertMutableInvoiceBookingLink(mutable.tables, invoice, input.invoiceId);

    const attempts = getMutableRows(mutable.tables, 'paymentAttempts');
    ensureAttemptFreshness(attempts);
    const existing = attempts.find(
      (row) =>
        asString(row.invoiceId) === input.invoiceId &&
        asString(row.actorUserId) === input.actorUserId &&
        asString(row.idempotencyKey) === input.idempotencyKey &&
        ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(coerceAttemptStatus(row.status)),
    );
    if (existing) {
      const hostedSession: HostedPaymentSession = {
        provider: asString(existing.provider) === 'stripe' ? 'stripe' : 'simulated',
        providerSessionId: asString(existing.providerSessionId) ?? '',
        status: 'ACTION_REQUIRED' as const,
        expiresAt: asString(existing.expiresAt) ?? nowIso(),
        nextAction: {
          type: 'open_url' as const,
          method: 'GET' as const,
          url: asString(coerceMetadata(existing.metadataJson).nextActionUrl) ?? '',
        },
      };
      return { invoice, attempt: existing, hostedSession, reused: true };
    }

    for (const row of attempts) {
      if (
        asString(row.invoiceId) === input.invoiceId &&
        ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(coerceAttemptStatus(row.status))
      ) {
        row.status = 'CANCELED';
        row.canceledAt = nowIso();
        row.updatedAt = nowIso();
        row.failureReason = 'Superseded by a newer payment attempt.';
      }
    }

    const attemptId = newId('payatt');
    const hostedSession = await provider.createHostedPaymentSession({
      attemptId,
      invoiceId: input.invoiceId,
      invoiceNumber: asString(invoice.invoiceNumber) ?? input.invoiceId,
      amountMinor: asNumber(invoice.totalMinor) ?? 0,
      currency: asString(invoice.currency) ?? 'GBP',
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
    });
    const now = nowIso();
    const attempt: SeedRow = {
      id: attemptId,
      invoiceId: input.invoiceId,
      actorUserId: input.actorUserId,
      provider: hostedSession.provider,
      providerSessionId: hostedSession.providerSessionId,
      idempotencyKey: input.idempotencyKey,
      status: hostedSession.status,
      amountMinor: asNumber(invoice.totalMinor) ?? 0,
      currency: asString(invoice.currency) ?? 'GBP',
      expiresAt: hostedSession.expiresAt,
      confirmedAt: null,
      failedAt: null,
      canceledAt: null,
      failureCode: null,
      failureReason: null,
      metadataJson: {
        nextActionUrl: hostedSession.nextAction.url,
        nextActionMethod: hostedSession.nextAction.method ?? 'GET',
        returnUrl: input.returnUrl ?? null,
        cancelUrl: input.cancelUrl ?? null,
      },
      createdAt: now,
      updatedAt: now,
    };
    attempts.push(attempt);
    getMutableRows(mutable.tables, 'invoiceEvents').push({
      id: newId('ine'),
      invoiceId: input.invoiceId,
      eventType: 'PAYMENT_SESSION_CREATED',
      actorUserId: input.actorUserId,
      reason: 'Hosted payment session created.',
      metadataJson: {
        attemptId,
        provider: hostedSession.provider,
      },
      requestId: null,
      occurredAt: now,
    });
    return { invoice, attempt, hostedSession, reused: false };
  }

  const prisma = getPrismaClientOrThrow();
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: input.invoiceId,
      deletedAt: null,
    },
  });
  if (!invoice) {
    throw notFound('Invoice not found', { invoiceId: input.invoiceId });
  }
  if (invoice.status === 'PAID') {
    throw badRequest('Invoice is already paid', { invoiceId: input.invoiceId });
  }
  if (invoice.status !== 'SENT') {
    throw badRequest('Only sent invoices can create payment sessions', {
      invoiceId: input.invoiceId,
      status: invoice.status,
    });
  }
  if (invoice.bookingId) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: invoice.bookingId,
        deletedAt: null,
      },
    });
    if (!booking) {
      throw badRequest('Invoice booking link is no longer authoritative', {
        invoiceId: input.invoiceId,
        bookingId: invoice.bookingId,
      });
    }
    if (booking.coachUserId !== invoice.coachUserId) {
      throw badRequest('Invoice booking coach link does not match authoritative booking', {
        invoiceId: input.invoiceId,
        bookingId: invoice.bookingId,
      });
    }
  }

  await prisma.paymentAttempt.updateMany({
    where: {
      invoiceId: input.invoiceId,
      status: {
        in: ['PENDING', 'ACTION_REQUIRED'],
      },
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: 'EXPIRED',
      failureReason: 'Attempt expired before completion.',
    },
  });

  const existing = await prisma.paymentAttempt.findFirst({
    where: {
      invoiceId: input.invoiceId,
      actorUserId: input.actorUserId,
      idempotencyKey: input.idempotencyKey,
      status: {
        in: ['PENDING', 'ACTION_REQUIRED'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  if (existing) {
    const metadata = coerceMetadata(existing.metadataJson);
    return {
      invoice: normalizeForJson(invoice),
      attempt: normalizeForJson(existing),
      hostedSession: {
        provider: existing.provider === 'stripe' ? 'stripe' : 'simulated',
        providerSessionId: existing.providerSessionId ?? '',
        status: 'ACTION_REQUIRED',
        expiresAt: existing.expiresAt?.toISOString() ?? nowIso(),
        nextAction: {
          type: 'open_url',
          method: 'GET',
          url: asString(metadata.nextActionUrl) ?? '',
        },
      },
      reused: true,
    };
  }

  await prisma.paymentAttempt.updateMany({
    where: {
      invoiceId: input.invoiceId,
      status: {
        in: ['PENDING', 'ACTION_REQUIRED'],
      },
    },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
      failureReason: 'Superseded by a newer payment attempt.',
    },
  });

  const attemptId = newId('payatt');
  const hostedSession = await provider.createHostedPaymentSession({
    attemptId,
    invoiceId: input.invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    amountMinor: invoice.totalMinor,
    currency: invoice.currency,
    returnUrl: input.returnUrl,
    cancelUrl: input.cancelUrl,
  });

  const attempt = await prisma.paymentAttempt.create({
    data: {
      id: attemptId,
      invoiceId: input.invoiceId,
      actorUserId: input.actorUserId,
      provider: hostedSession.provider,
      providerSessionId: hostedSession.providerSessionId,
      idempotencyKey: input.idempotencyKey,
      status: hostedSession.status,
      amountMinor: invoice.totalMinor,
      currency: invoice.currency,
      expiresAt: new Date(hostedSession.expiresAt),
      metadataJson: {
        nextActionUrl: hostedSession.nextAction.url,
        nextActionMethod: hostedSession.nextAction.method ?? 'GET',
        returnUrl: input.returnUrl ?? null,
        cancelUrl: input.cancelUrl ?? null,
      } as never,
    },
  });
  await prisma.invoiceEvent.create({
    data: {
      id: newId('ine'),
      invoiceId: input.invoiceId,
      eventType: 'PAYMENT_SESSION_CREATED',
      actorUserId: input.actorUserId,
      reason: 'Hosted payment session created.',
      metadataJson: {
        attemptId,
        provider: hostedSession.provider,
      } as never,
    },
  });

  return {
    invoice: normalizeForJson(invoice),
    attempt: normalizeForJson(attempt),
    hostedSession,
    reused: false,
  };
}

export async function getHostedPaymentPageData(
  attemptId: string,
  token: string,
): Promise<HostedPaymentPageData> {
  const payload = verifySimulatedPaymentToken(token);
  if (payload.attemptId !== attemptId) {
    throw badRequest('Payment attempt token mismatch', { attemptId });
  }

  const detail = await getPaymentAttemptById(attemptId);
  if (!detail) {
    throw notFound('Payment attempt not found', { attemptId });
  }
  const attempt = detail.attempt;
  const invoice = detail.invoice;
  if (asString(attempt.providerSessionId) !== payload.providerSessionId) {
    throw badRequest('Payment attempt provider session mismatch', { attemptId });
  }
  if ((asNumber(attempt.amountMinor) ?? 0) !== payload.amountMinor) {
    throw badRequest('Payment attempt amount mismatch', { attemptId });
  }
  if ((asString(attempt.currency) ?? 'GBP') !== payload.currency) {
    throw badRequest('Payment attempt currency mismatch', { attemptId });
  }
  if (!ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(coerceAttemptStatus(attempt.status))) {
    throw badRequest('Payment attempt is not payable', {
      attemptId,
      status: attempt.status,
    });
  }

  return {
    invoice,
    attempt,
    token,
    returnUrl: payload.returnUrl ?? null,
    cancelUrl: payload.cancelUrl ?? null,
  };
}

export async function completeSimulatedInvoicePayment(
  input: CompleteSimulatedInvoicePaymentInput,
): Promise<CompleteSimulatedInvoicePaymentResult> {
  const payload = verifySimulatedPaymentToken(input.token);
  if (payload.attemptId !== input.attemptId) {
    throw badRequest('Payment attempt token mismatch', { attemptId: input.attemptId });
  }

  const mutable = resolveMutableTables();
  if (mutable) {
    const attempts = getMutableRows(mutable.tables, 'paymentAttempts');
    ensureAttemptFreshness(attempts);
    const attempt = attempts.find((row) => asString(row.id) === input.attemptId);
    if (!attempt) {
      throw notFound('Payment attempt not found', { attemptId: input.attemptId });
    }
    const invoice = getActiveRows(getMutableRows(mutable.tables, 'invoices')).find(
      (row) => asString(row.id) === asString(attempt.invoiceId),
    );
    if (!invoice) {
      throw notFound('Invoice not found', { invoiceId: asString(attempt.invoiceId) });
    }

    if (asString(attempt.providerSessionId) !== payload.providerSessionId) {
      throw badRequest('Payment attempt provider session mismatch', { attemptId: input.attemptId });
    }
    if ((asNumber(attempt.amountMinor) ?? 0) !== payload.amountMinor) {
      throw badRequest('Payment attempt amount mismatch', { attemptId: input.attemptId });
    }
    if ((asString(attempt.currency) ?? 'GBP') !== payload.currency) {
      throw badRequest('Payment attempt currency mismatch', { attemptId: input.attemptId });
    }
    const attemptStatus = coerceAttemptStatus(attempt.status);
    if (attemptStatus === 'COMPLETED') {
      return { invoice, attempt, alreadyCompleted: true };
    }
    if (!ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(attemptStatus)) {
      throw badRequest('Payment attempt is not payable', {
        attemptId: input.attemptId,
        status: attempt.status,
      });
    }
    if (
      toInvoiceStatus(invoice.status) === 'VOID' ||
      toInvoiceStatus(invoice.status) === 'WRITTEN_OFF'
    ) {
      throw badRequest('Invoice cannot accept payment in its current state', {
        invoiceId: asString(invoice.id),
        status: invoice.status,
      });
    }
    assertMutableInvoiceBookingLink(mutable.tables, invoice, asString(invoice.id) ?? '');

    const now = nowIso();
    const alreadyCompleted = toInvoiceStatus(invoice.status) === 'PAID';
    attempt.status = 'COMPLETED';
    attempt.confirmedAt = now;
    attempt.updatedAt = now;
    if (!alreadyCompleted) {
      invoice.status = 'PAID';
      invoice.paidAt = now;
      invoice.updatedAt = now;
      invoice.updatedByUserId = asString(attempt.actorUserId) ?? 'system';
      invoice.version = (asNumber(invoice.version) ?? 1) + 1;
      getMutableRows(mutable.tables, 'invoiceEvents').push({
        id: newId('ine'),
        invoiceId: asString(invoice.id),
        eventType: 'MARKED_PAID',
        actorUserId: asString(attempt.actorUserId) ?? null,
        reason: 'Hosted payment confirmed by simulated provider.',
        metadataJson: {
          source: 'simulated-provider',
          attemptId: input.attemptId,
          providerSessionId: payload.providerSessionId,
        },
        requestId: null,
        occurredAt: now,
      });
      const reconcilerEntries = getMutableRows(mutable.tables, 'reconcilerEntries');
      const reconcilerEntry = reconcilerEntries.find(
        (row) => asString(row.invoiceId) === asString(invoice.id),
      );
      if (reconcilerEntry) {
        reconcilerEntry.state = 'PAID';
        reconcilerEntry.updatedAt = now;
        reconcilerEntry.updatedByUserId = asString(attempt.actorUserId) ?? 'system';
        reconcilerEntry.version = (asNumber(reconcilerEntry.version) ?? 1) + 1;
        reconcilerEntry.internalNote = 'Marked paid by hosted payment confirmation.';
      } else {
        reconcilerEntries.push({
          id: newId('rec'),
          invoiceId: asString(invoice.id),
          coachUserId: asString(invoice.coachUserId),
          state: 'PAID',
          internalNote: 'Created by hosted payment confirmation.',
          createdByUserId: asString(attempt.actorUserId) ?? 'system',
          updatedByUserId: asString(attempt.actorUserId) ?? 'system',
          version: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { invoice, attempt, alreadyCompleted };
  }

  const prisma = getPrismaClientOrThrow();
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: input.attemptId },
    include: { invoice: true },
  });
  if (!attempt) {
    throw notFound('Payment attempt not found', { attemptId: input.attemptId });
  }
  if (attempt.providerSessionId !== payload.providerSessionId) {
    throw badRequest('Payment attempt provider session mismatch', { attemptId: input.attemptId });
  }
  if (attempt.amountMinor !== payload.amountMinor) {
    throw badRequest('Payment attempt amount mismatch', { attemptId: input.attemptId });
  }
  if (attempt.currency !== payload.currency) {
    throw badRequest('Payment attempt currency mismatch', { attemptId: input.attemptId });
  }
  if (attempt.status === 'COMPLETED') {
    return {
      invoice: normalizeForJson(attempt.invoice),
      attempt: normalizeForJson(attempt),
      alreadyCompleted: true,
    };
  }
  if (!ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(attempt.status)) {
    throw badRequest('Payment attempt is not payable', {
      attemptId: input.attemptId,
      status: attempt.status,
    });
  }
  if (attempt.invoice.status === 'VOID' || attempt.invoice.status === 'WRITTEN_OFF') {
    throw badRequest('Invoice cannot accept payment in its current state', {
      invoiceId: attempt.invoiceId,
      status: attempt.invoice.status,
    });
  }
  if (attempt.invoice.bookingId) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: attempt.invoice.bookingId,
        deletedAt: null,
      },
    });
    if (!booking) {
      throw badRequest('Invoice booking link is no longer authoritative', {
        invoiceId: attempt.invoiceId,
        bookingId: attempt.invoice.bookingId,
      });
    }
    if (booking.coachUserId !== attempt.invoice.coachUserId) {
      throw badRequest('Invoice booking coach link does not match authoritative booking', {
        invoiceId: attempt.invoiceId,
        bookingId: attempt.invoice.bookingId,
      });
    }
  }

  const alreadyCompleted = attempt.invoice.status === 'PAID';
  const now = new Date();
  await prisma.paymentAttempt.update({
    where: { id: input.attemptId },
    data: {
      status: 'COMPLETED',
      confirmedAt: now,
    },
  });
  if (!alreadyCompleted) {
    await prisma.invoice.update({
      where: { id: attempt.invoiceId },
      data: {
        status: 'PAID',
        paidAt: now,
        updatedByUserId: attempt.actorUserId,
        version: {
          increment: 1,
        },
      },
    });
    await prisma.invoiceEvent.create({
      data: {
        id: newId('ine'),
        invoiceId: attempt.invoiceId,
        eventType: 'MARKED_PAID',
        actorUserId: attempt.actorUserId,
        reason: 'Hosted payment confirmed by simulated provider.',
        metadataJson: {
          source: 'simulated-provider',
          attemptId: input.attemptId,
          providerSessionId: payload.providerSessionId,
        } as never,
      },
    });
    const existingReconciler = await prisma.reconcilerEntry.findFirst({
      where: { invoiceId: attempt.invoiceId },
    });
    if (existingReconciler) {
      await prisma.reconcilerEntry.update({
        where: { id: existingReconciler.id },
        data: {
          state: 'PAID',
          internalNote: 'Marked paid by hosted payment confirmation.',
          updatedByUserId: attempt.actorUserId,
          version: {
            increment: 1,
          },
        },
      });
    } else {
      await prisma.reconcilerEntry.create({
        data: {
          id: newId('rec'),
          invoiceId: attempt.invoiceId,
          coachUserId: attempt.invoice.coachUserId,
          state: 'PAID',
          internalNote: 'Created by hosted payment confirmation.',
          createdByUserId: attempt.actorUserId,
          updatedByUserId: attempt.actorUserId,
        },
      });
    }
  }

  const refreshedAttempt = await prisma.paymentAttempt.findUniqueOrThrow({
    where: { id: input.attemptId },
  });
  const refreshedInvoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: attempt.invoiceId },
  });
  return {
    invoice: normalizeForJson(refreshedInvoice),
    attempt: normalizeForJson(refreshedAttempt),
    alreadyCompleted,
  };
}

async function getPaymentAttemptById(
  attemptId: string,
): Promise<{ attempt: SeedRow; invoice: SeedRow } | null> {
  const mutable = resolveMutableTables();
  if (mutable) {
    const attempts = getMutableRows(mutable.tables, 'paymentAttempts');
    ensureAttemptFreshness(attempts);
    const attempt = attempts.find((row) => asString(row.id) === attemptId);
    if (!attempt) {
      return null;
    }
    const invoice = getActiveRows(getMutableRows(mutable.tables, 'invoices')).find(
      (row) => asString(row.id) === asString(attempt.invoiceId),
    );
    if (!invoice) {
      return null;
    }
    return { attempt, invoice };
  }

  const prisma = getPrismaClientOrThrow();
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: attemptId },
    include: { invoice: true },
  });
  if (!attempt) {
    return null;
  }
  return {
    attempt: normalizeForJson(attempt),
    invoice: normalizeForJson(attempt.invoice),
  };
}
