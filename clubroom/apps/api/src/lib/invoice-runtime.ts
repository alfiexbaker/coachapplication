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
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from './prisma-runtime.js';
import { normalizeForJson } from '../repositories/p0/normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

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

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
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

function toInvoiceStatus(value: unknown): typeof INVOICE_STATUSES[number] {
  const status = asString(value)?.toUpperCase();
  if (status && INVOICE_STATUSES.includes(status as typeof INVOICE_STATUSES[number])) {
    return status as typeof INVOICE_STATUSES[number];
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
    isAdmin
    || asString(invoice.coachUserId) === authUserId
    || asString(invoice.payerUserId) === authUserId
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

function computeTaxBreakdown(totalMinor: number, taxRatePercent: number): {
  subtotalMinor: number;
  taxMinor: number;
} {
  const subtotalMinor = Math.round((totalMinor * 100) / (100 + taxRatePercent));
  return {
    subtotalMinor,
    taxMinor: totalMinor - subtotalMinor,
  };
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

function resolveBookingInvoiceContextFromTables(tables: SeedTables, bookingId: string): BookingInvoiceContext | null {
  const booking = getActiveRows(asRows(tables.bookings)).find((row) => asString(row.id) === bookingId);
  if (!booking) {
    return null;
  }

  const bookingParticipants = getActiveRows(asRows(tables.bookingParticipants)).filter(
    (row) => asString(row.bookingId) === bookingId,
  );
  const athleteId = asString(bookingParticipants[0]?.athleteId) ?? null;
  const payerUserId =
    asString(booking.bookedByUserId)
    ?? asString(bookingParticipants[0]?.guardianUserId)
    ?? null;
  const totalMinor =
    toInvoiceStatus(booking.status) === 'VOID'
      ? 0
      : (asString(booking.status) === 'CANCELLED'
          ? asNumber(booking.cancellationFeeMinor)
          : asNumber(booking.priceMinor)) ?? 0;
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

async function resolveBookingInvoiceContextFromDb(bookingId: string): Promise<BookingInvoiceContext | null> {
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
  const totalMinor = (
    booking.status === 'CANCELLED' ? booking.cancellationFeeMinor : booking.priceMinor
  ) ?? 0;
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: [booking.coachUserId, booking.bookedByUserId, firstParticipant?.guardianUserId]
          .filter((value): value is string => Boolean(value)),
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

export async function getBookingInvoiceContext(bookingId: string): Promise<BookingInvoiceContext | null> {
  const mutable = resolveMutableTables();
  if (mutable) {
    return resolveBookingInvoiceContextFromTables(mutable.tables, bookingId);
  }
  return resolveBookingInvoiceContextFromDb(bookingId);
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
      .sort((left, right) => (parseDate(asString(right.createdAt)) ?? 0) - (parseDate(asString(left.createdAt)) ?? 0));
  }

  const prisma = getPrismaClientOrThrow();
  const statuses = query.status
    ? query.status
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter((value): value is typeof INVOICE_STATUSES[number] => INVOICE_STATUSES.includes(value as typeof INVOICE_STATUSES[number]))
    : undefined;
  const where = {
    deletedAt: null,
    ...(isAdmin
      ? {}
      : {
          OR: [
            { coachUserId: authUserId },
            { payerUserId: authUserId },
          ],
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
    const invoice = getActiveRows(asRows(mutable.tables.invoices)).find((row) => asString(row.id) === invoiceId);
    if (!invoice) {
      return null;
    }
    const paymentAttempts = getMutableRows(mutable.tables, 'paymentAttempts');
    ensureAttemptFreshness(paymentAttempts);
    return {
      invoice: mapInvoice(invoice, users),
      lineItems: normalizeForJson(getActiveRows(asRows(mutable.tables.invoiceLineItems)).filter(
        (row) => asString(row.invoiceId) === invoiceId,
      )),
      events: normalizeForJson(asRows(mutable.tables.invoiceEvents).filter(
        (row) => asString(row.invoiceId) === invoiceId,
      )),
      reconcilerEntry: normalizeForJson(
        asRows(mutable.tables.reconcilerEntries).find((row) => asString(row.invoiceId) === invoiceId) ?? null,
      ),
      reminders: normalizeForJson(asRows(mutable.tables.paymentReminders).filter(
        (row) => asString(row.invoiceId) === invoiceId,
      )),
      paymentInstructionTemplates: normalizeForJson(
        getActiveRows(asRows(mutable.tables.paymentInstructionTemplates)).filter(
          (row) => asString(row.coachUserId) === asString(invoice.coachUserId),
        ),
      ),
      paymentAttempts: normalizeForJson(paymentAttempts
        .filter((row) => asString(row.invoiceId) === invoiceId)
        .map((row) => mapPaymentAttemptRow(row))),
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
    paymentAttempts: normalizeForJson(invoice.paymentAttempts.map((row) => mapPaymentAttemptRow(row as unknown as SeedRow))),
  };
}

export async function getInvoiceRow(invoiceId: string): Promise<SeedRow | null> {
  const mutable = resolveMutableTables();
  if (mutable) {
    return getActiveRows(asRows(mutable.tables.invoices)).find((row) => asString(row.id) === invoiceId) ?? null;
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

export async function generateInvoiceForBooking(input: GenerateInvoiceInput): Promise<GeneratedInvoiceRecord> {
  const taxRatePercent = input.taxRatePercent ?? 20;
  const mutable = resolveMutableTables();
  if (mutable) {
    const invoices = getMutableRows(mutable.tables, 'invoices');
    const existing = getActiveRows(invoices).find((row) => asString(row.bookingId) === input.bookingId);
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
      sentTo: context.payerUserId ? findUserEmail(asRows(mutable.tables.users), context.payerUserId) ?? null : null,
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

export async function createInvoiceReminder(input: CreateInvoiceReminderInput): Promise<InvoiceReminderRecord> {
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

  const updatedInvoice = invoice.status === 'DRAFT'
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

    const attempts = getMutableRows(mutable.tables, 'paymentAttempts');
    ensureAttemptFreshness(attempts);
    const existing = attempts.find(
      (row) =>
        asString(row.invoiceId) === input.invoiceId
        && asString(row.actorUserId) === input.actorUserId
        && asString(row.idempotencyKey) === input.idempotencyKey
        && ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(coerceAttemptStatus(row.status)),
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
        asString(row.invoiceId) === input.invoiceId
        && ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(coerceAttemptStatus(row.status))
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

export async function getHostedPaymentPageData(attemptId: string, token: string): Promise<HostedPaymentPageData> {
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
    if (toInvoiceStatus(invoice.status) === 'VOID' || toInvoiceStatus(invoice.status) === 'WRITTEN_OFF') {
      throw badRequest('Invoice cannot accept payment in its current state', {
        invoiceId: asString(invoice.id),
        status: invoice.status,
      });
    }

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
      const reconcilerEntry = reconcilerEntries.find((row) => asString(row.invoiceId) === asString(invoice.id));
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

  const refreshedAttempt = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: input.attemptId } });
  const refreshedInvoice = await prisma.invoice.findUniqueOrThrow({ where: { id: attempt.invoiceId } });
  return {
    invoice: normalizeForJson(refreshedInvoice),
    attempt: normalizeForJson(refreshedAttempt),
    alreadyCompleted,
  };
}

async function getPaymentAttemptById(attemptId: string): Promise<{ attempt: SeedRow; invoice: SeedRow } | null> {
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
