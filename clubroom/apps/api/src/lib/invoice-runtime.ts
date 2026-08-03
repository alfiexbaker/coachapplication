import crypto from 'node:crypto';
import { getApiDataBackend } from './data-backend.js';
import { badRequest, notFound } from './http-errors.js';
import { getMarketplaceSeedStore } from './marketplace-seed-store.js';
import {
  type HostedPaymentSession,
  type PaymentProviderName,
  getConfiguredPaymentProvider,
  verifySimulatedPaymentToken,
} from './payment-provider.js';
import type { PrismaClient } from '@clubroom/db';
import { getPrismaClientOrThrow } from './prisma-runtime.js';
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
export interface UpdateInvoiceReminderDeliveryInput {
  reminderId: string;
  deliveryStatus: 'sent' | 'skipped' | 'failed';
  deliveryProvider: string;
  deliveryError?: string;
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
export interface CompleteProviderInvoicePaymentInput {
  attemptId?: string;
  providerSessionId?: string;
  actorUserId?: string;
  provider: PaymentProviderName | string;
  source: string;
  reason: string;
  completionStatus: 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELED';
  expectedAmountMinor?: number;
  expectedCurrency?: string;
  failureCode?: string | null;
  failureReason?: string | null;
}
export interface CompleteProviderInvoicePaymentResult {
  invoice: SeedRow;
  attempt: SeedRow;
  alreadyCompleted: boolean;
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
export type ManualReceiptMethod = 'cash' | 'bank_transfer' | 'other';
export interface ManualPaymentReceiptInput {
  method?: ManualReceiptMethod;
  amountMinor?: number;
  receivedAt?: string;
  reference?: string;
  evidenceMediaId?: string;
  note?: string;
}
export interface TransitionInvoiceInput {
  invoiceId: string;
  actorUserId: string;
  action: InvoiceTransitionAction;
  reason?: string;
  requestId?: string;
  manualReceipt?: ManualPaymentReceiptInput;
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
  bookingStatus: string;
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
const INVOICEABLE_BOOKING_STATUSES = new Set([
  'CONFIRMED',
  'AWAITING_COMPLETION',
  'COMPLETED',
  'CANCELLED',
]);
function assertBookingReadyForInvoice(context: BookingInvoiceContext): void {
  if (!INVOICEABLE_BOOKING_STATUSES.has(context.bookingStatus.toUpperCase())) {
    throw badRequest('Booking must be confirmed before an invoice can be generated', {
      bookingId: context.bookingId,
      status: context.bookingStatus,
    });
  }
}
const INVOICE_STATUSES = ['DRAFT', 'SENT', 'PAID', 'VOID', 'WRITTEN_OFF'] as const;
type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
const ACTIVE_PAYMENT_ATTEMPT_STATUSES = new Set(['PENDING', 'ACTION_REQUIRED']);
const SIMULATED_REFUND_VERIFICATION_CODE = '000000';
const PROVIDER_PAYMENT_FAILURE_STATUSES = ['FAILED', 'EXPIRED', 'CANCELED'] as const;
type ProviderPaymentFailureStatus = (typeof PROVIDER_PAYMENT_FAILURE_STATUSES)[number];
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
        .flatMap((item) => (Boolean(item) ? [item.charAt(0).toUpperCase() + item.slice(1)] : []))
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
function emailDomain(email: string | undefined): string | null {
  return email?.split('@')[1]?.trim().toLowerCase() || null;
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
    const statuses = query.status.split(',').flatMap((value) => {
      const status = value.trim().toUpperCase();
      return status ? [status] : [];
    });
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

const CLUB_INVOICE_FINANCE_ROLES = ['ADMIN', 'CLUB_ADMIN', 'OWNER'] as const;
const CLUB_INVOICE_FINANCE_ROLE_SET = new Set<string>(CLUB_INVOICE_FINANCE_ROLES);

function hasClubInvoiceFinanceRole(value: unknown): boolean {
  return CLUB_INVOICE_FINANCE_ROLE_SET.has(
    String(value ?? '')
      .trim()
      .toUpperCase(),
  );
}

function isActiveClubMembershipRow(row: SeedRow): boolean {
  return row.active !== false && !asString(row.deletedAt);
}

function resolveInvoiceClubIdFromTables(tables: SeedTables, invoice: SeedRow): string | null {
  const bookingId = asString(invoice.bookingId);
  if (!bookingId) {
    return null;
  }
  const booking = asRows(tables.bookings).find(
    (row) => asString(row.id) === bookingId && !asString(row.deletedAt),
  );
  if (!booking) {
    return null;
  }
  const bookingClubId = asString(booking.clubId);
  if (bookingClubId) {
    return bookingClubId;
  }
  const groupSessionId = asString(booking.groupSessionId);
  if (!groupSessionId) {
    return null;
  }
  const groupSession = asRows(tables.groupSessions).find(
    (row) => asString(row.id) === groupSessionId && !asString(row.deletedAt),
  );
  return asString(groupSession?.clubId) ?? null;
}

function canManageClubInvoiceInTables(
  tables: SeedTables,
  invoice: SeedRow,
  authUserId: string,
): boolean {
  const clubId = resolveInvoiceClubIdFromTables(tables, invoice);
  if (!clubId) {
    return false;
  }
  return asRows(tables.clubMemberships).some(
    (row) =>
      asString(row.clubId) === clubId &&
      asString(row.userId) === authUserId &&
      isActiveClubMembershipRow(row) &&
      hasClubInvoiceFinanceRole(row.role),
  );
}

async function listClubInvoiceAccessInDb(authUserId: string): Promise<{
  clubIds: string[];
  groupSessionIds: string[];
}> {
  const prisma = getPrismaClientOrThrow();
  const memberships = await prisma.clubMembership.findMany({
    where: {
      userId: authUserId,
      active: true,
      deletedAt: null,
      role: {
        in: [...CLUB_INVOICE_FINANCE_ROLES],
      },
    },
    select: {
      clubId: true,
    },
  });
  const clubIds = [...new Set(memberships.map((membership) => membership.clubId))];
  if (clubIds.length === 0) {
    return {
      clubIds,
      groupSessionIds: [],
    };
  }
  const groupSessions = await prisma.groupSession.findMany({
    where: {
      clubId: {
        in: clubIds,
      },
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });
  return {
    clubIds,
    groupSessionIds: groupSessions.map((session) => session.id),
  };
}

async function canManageClubInvoiceInDb(invoice: SeedRow, authUserId: string): Promise<boolean> {
  const bookingId = asString(invoice.bookingId);
  if (!bookingId) {
    return false;
  }
  const prisma = getPrismaClientOrThrow();
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      deletedAt: null,
    },
    select: {
      clubId: true,
      groupSessionId: true,
    },
  });
  if (!booking) {
    return false;
  }
  let clubId = booking.clubId;
  if (!clubId && booking.groupSessionId) {
    const groupSession = await prisma.groupSession.findFirst({
      where: {
        id: booking.groupSessionId,
        deletedAt: null,
      },
      select: {
        clubId: true,
      },
    });
    clubId = groupSession?.clubId ?? null;
  }
  if (!clubId) {
    return false;
  }
  const membership = await prisma.clubMembership.findUnique({
    where: {
      clubId_userId: {
        clubId,
        userId: authUserId,
      },
    },
    select: {
      active: true,
      deletedAt: true,
      role: true,
    },
  });
  return Boolean(
    membership?.active && !membership.deletedAt && hasClubInvoiceFinanceRole(membership.role),
  );
}

export async function canManageClubInvoice(invoice: SeedRow, authUserId: string): Promise<boolean> {
  if (getApiDataBackend() === 'db') {
    return canManageClubInvoiceInDb(invoice, authUserId);
  }
  return canManageClubInvoiceInTables(getMarketplaceSeedStore().tables, invoice, authUserId);
}

export async function canManageInvoiceMoneyAction(
  invoice: SeedRow,
  authUserId: string,
  isAdmin: boolean,
): Promise<boolean> {
  return (
    isAdmin ||
    asString(invoice.coachUserId) === authUserId ||
    (await canManageClubInvoice(invoice, authUserId))
  );
}

function resolveMutableTables(): {
  tables: SeedTables;
  version: string;
} | null {
  if (getApiDataBackend() === 'seed') {
    const store = getMarketplaceSeedStore();
    return {
      tables: store.tables,
      version: store.version,
    };
  }
  return null;
}
function markMutableGroupSessionRegistrationPaid(params: {
  tables: SeedTables;
  invoice: SeedRow;
  paidAt: string;
  actorUserId: string;
}): void {
  const bookingId = asString(params.invoice.bookingId);
  if (!bookingId) {
    return;
  }
  const booking = getActiveRows(getMutableRows(params.tables, 'bookings')).find(
    (row) => asString(row.id) === bookingId,
  );
  const groupSessionId = asString(booking?.groupSessionId);
  if (!booking || !groupSessionId) {
    return;
  }
  const participant = getActiveRows(getMutableRows(params.tables, 'bookingParticipants')).find(
    (row) => asString(row.bookingId) === bookingId,
  );
  const athleteId = asString(participant?.athleteId);
  if (!athleteId) {
    return;
  }
  const registration = getActiveRows(
    getMutableRows(params.tables, 'groupSessionRegistrations'),
  ).find(
    (row) =>
      asString(row.groupSessionId) === groupSessionId &&
      asString(row.athleteId) === athleteId &&
      asString(row.status)?.toUpperCase() !== 'CANCELLED',
  );
  if (!registration) {
    return;
  }
  registration.paidAt = params.paidAt;
  registration.updatedAt = params.paidAt;
  registration.updatedByUserId = params.actorUserId;
  registration.version = (asNumber(registration.version) ?? 1) + 1;
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
    .update(
      JSON.stringify({
        amountMinor: params.amountMinor,
        reason: params.reason.trim(),
      }),
    )
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
}): string[] {
  const canceledAttemptIds: string[] = [];
  for (const row of params.paymentAttempts) {
    if (
      asString(row.invoiceId) === params.invoiceId &&
      ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(coerceAttemptStatus(row.status))
    ) {
      const attemptId = asString(row.id);
      row.status = 'CANCELED';
      row.canceledAt = params.now;
      row.updatedAt = params.now;
      row.failureReason = params.reason;
      if (attemptId) {
        canceledAttemptIds.push(attemptId);
      }
    }
  }
  return canceledAttemptIds;
}
function latestMarkedPaidEvent(invoiceEvents: SeedRow[], invoiceId: string): SeedRow | undefined {
  return invoiceEvents
    .filter(
      (row) =>
        asString(row.invoiceId) === invoiceId &&
        asString(row.eventType)?.toUpperCase() === 'MARKED_PAID',
    )
    .sort((left, right) => {
      const leftTime = Date.parse(asString(left.occurredAt) ?? '');
      const rightTime = Date.parse(asString(right.occurredAt) ?? '');
      return (
        (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0)
      );
    })[0];
}
function assertCanMarkPaidInvoiceUnpaid(params: {
  paidEvent: SeedRow | null | undefined;
  invoiceId: string;
}): void {
  const source = asString(coerceMetadata(params.paidEvent?.metadataJson).source);
  if (source && source !== 'manual-receipt' && source !== 'coach-reconciler') {
    throw badRequest('Provider-confirmed payments cannot be moved back to unpaid here', {
      invoiceId: params.invoiceId,
      paymentSource: source,
    });
  }
}
function normalizeManualReceipt(params: {
  input?: ManualPaymentReceiptInput;
  invoice: SeedRow;
  invoiceId: string;
  actorUserId: string;
  now: string;
}): Record<string, unknown> {
  const totalMinor = asNumber(params.invoice.totalMinor) ?? 0;
  const amountMinor = params.input?.amountMinor ?? totalMinor;
  if (amountMinor !== totalMinor) {
    throw badRequest('Manual receipt amount must match invoice total', {
      invoiceId: params.invoiceId,
      amountMinor,
      totalMinor,
    });
  }
  const receivedAt = params.input?.receivedAt ?? params.now;
  const receivedAtDate = new Date(receivedAt);
  if (Number.isNaN(receivedAtDate.valueOf())) {
    throw badRequest('Manual receipt receivedAt must be a valid date', {
      invoiceId: params.invoiceId,
      receivedAt,
    });
  }
  return {
    method: params.input?.method ?? 'other',
    amountMinor,
    currency: asString(params.invoice.currency) ?? 'GBP',
    receivedAt: receivedAtDate.toISOString(),
    receivedByUserId: params.actorUserId,
    reference: params.input?.reference ?? null,
    evidenceMediaId: params.input?.evidenceMediaId ?? null,
    note: params.input?.note ?? null,
  };
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
        throw badRequest('Voided invoices cannot be marked as paid', {
          invoiceId,
        });
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
        throw badRequest('Only paid invoices can be moved back to unpaid', {
          invoiceId,
        });
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
        throw badRequest('Paid or void invoices cannot be written off', {
          invoiceId,
        });
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
        throw badRequest('Only written-off invoices can be restored', {
          invoiceId,
        });
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
        throw badRequest('Paid invoices cannot be voided', {
          invoiceId,
        });
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
export function applyBookingCancellationInvoiceEffectsInTables(
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
export function applyBookingInvoiceAdjustmentsInTables(
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
    throw badRequest(
      'Booking series updates require explicit invoice adjustment for settled invoices',
      {
        bookingId: asString(blockedInvoice.bookingId),
        invoiceId: asString(blockedInvoice.id),
        invoiceStatus: toInvoiceStatus(blockedInvoice.status),
      },
    );
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
    bookingStatus: asString(booking.status) ?? 'PENDING',
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
    bookingStatus: booking.status,
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
    bookingStatus: booking.status,
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
  await Promise.all(
    invoices.map(async (invoice) => {
      const cancelPendingAttempts = tx.paymentAttempt.updateMany({
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
        await cancelPendingAttempts;
        return;
      }
      const voidReason = input.reason ?? 'Booking cancelled before payment.';
      const existingReconcilerPromise = tx.reconcilerEntry.findFirst({
        where: {
          invoiceId: invoice.id,
        },
      });
      const existingReconciler = await existingReconcilerPromise;
      const reconcilerWrite = existingReconciler
        ? tx.reconcilerEntry.update({
            where: {
              id: existingReconciler.id,
            },
            data: {
              state: 'VOID',
              internalNote: 'Voided because the linked booking was cancelled before payment.',
              updatedByUserId: input.actorUserId,
              version: {
                increment: 1,
              },
            },
          })
        : tx.reconcilerEntry.create({
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
      await Promise.all([
        cancelPendingAttempts,
        tx.invoice.update({
          where: {
            id: invoice.id,
          },
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
        }),
        tx.invoiceEvent.create({
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
        }),
        reconcilerWrite,
      ]);
    }),
  );
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
  await Promise.all(
    invoices.map(async (invoice) => {
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
        return;
      }
      const existingReconciler = await tx.reconcilerEntry.findFirst({
        where: {
          invoiceId: invoice.id,
        },
      });
      const reconcilerWrite = existingReconciler
        ? tx.reconcilerEntry.update({
            where: {
              id: existingReconciler.id,
            },
            data: {
              state: 'OUTSTANDING',
              internalNote: 'Restored because the linked booking was reopened.',
              updatedByUserId: input.actorUserId,
              version: {
                increment: 1,
              },
            },
          })
        : tx.reconcilerEntry.create({
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
      await Promise.all([
        tx.invoice.update({
          where: {
            id: invoice.id,
          },
          data: {
            status: 'SENT',
            voidedAt: null,
            voidReason: null,
            updatedByUserId: input.actorUserId,
            version: {
              increment: 1,
            },
          },
        }),
        tx.invoiceEvent.create({
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
        }),
        reconcilerWrite,
      ]);
    }),
  );
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
      bookingId: {
        in: input.bookingIds,
      },
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
    throw badRequest(
      'Booking series updates require explicit invoice adjustment for settled invoices',
      {
        bookingId: blockedInvoice.bookingId,
        invoiceId: blockedInvoice.id,
        invoiceStatus: blockedInvoice.status,
      },
    );
  }
  const now = new Date();
  await Promise.all(
    invoices.map(async (invoice) => {
      if (!invoice.bookingId) {
        return;
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
      await Promise.all([
        tx.invoice.update({
          where: {
            id: invoice.id,
          },
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
        }),
        tx.invoiceLineItem.updateMany({
          where: {
            invoiceId: invoice.id,
          },
          data: {
            description: formatSessionType(context.sessionType) ?? context.sessionType,
          },
        }),
        tx.invoiceEvent.create({
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
        }),
      ]);
    }),
  );
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
  await prisma.$transaction((tx) =>
    applyBookingCancellationInvoiceEffectsInDbTransaction(tx, input),
  );
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
    failedAt: asString(row.failedAt) ?? null,
    canceledAt: asString(row.canceledAt) ?? null,
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
      .flatMap((row) => {
        const canAccess =
          canAccessInvoiceRow(authUserId, isAdmin, row) ||
          canManageClubInvoiceInTables(mutable.tables, row, authUserId);
        if (!canAccess) return [];
        return matchesInvoiceFilters(row, query) ? [mapInvoice(row, users)] : [];
      })
      .sort(
        (left, right) =>
          (parseDate(asString(right.createdAt)) ?? 0) - (parseDate(asString(left.createdAt)) ?? 0),
      );
  }
  const prisma = getPrismaClientOrThrow();
  const statuses: InvoiceStatus[] | undefined = query.status
    ? query.status.split(',').flatMap((value) => {
        const mapped = value.trim().toUpperCase() as InvoiceStatus;
        return INVOICE_STATUSES.includes(mapped) ? [mapped] : [];
      })
    : undefined;
  const clubInvoiceAccess = isAdmin
    ? { clubIds: [], groupSessionIds: [] }
    : await listClubInvoiceAccessInDb(authUserId);
  const accessOr = [
    {
      coachUserId: authUserId,
    },
    {
      payerUserId: authUserId,
    },
    ...(clubInvoiceAccess.clubIds.length > 0
      ? [
          {
            booking: {
              is: {
                clubId: {
                  in: clubInvoiceAccess.clubIds,
                },
                deletedAt: null,
              },
            },
          },
        ]
      : []),
    ...(clubInvoiceAccess.groupSessionIds.length > 0
      ? [
          {
            booking: {
              is: {
                groupSessionId: {
                  in: clubInvoiceAccess.groupSessionIds,
                },
                deletedAt: null,
              },
            },
          },
        ]
      : []),
  ];
  const where = {
    deletedAt: null,
    ...(isAdmin
      ? {}
      : {
          OR: accessOr,
        }),
    ...(query.coachId
      ? {
          coachUserId: query.coachId,
        }
      : {}),
    ...(query.bookingId
      ? {
          bookingId: query.bookingId,
        }
      : {}),
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
            ...(query.dateFrom
              ? {
                  gte: new Date(query.dateFrom),
                }
              : {}),
            ...(query.dateTo
              ? {
                  lte: new Date(query.dateTo),
                }
              : {}),
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
        paymentAttempts.flatMap((row) =>
          asString(row.invoiceId) === invoiceId ? [mapPaymentAttemptRow(row)] : [],
        ),
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
      throw notFound('Invoice not found', {
        invoiceId: input.invoiceId,
      });
    }
    const bookingId = asString(invoice.bookingId);
    assertMutableInvoiceBookingLink(mutable.tables, invoice, input.invoiceId);
    const invoiceEvents = getMutableRows(mutable.tables, 'invoiceEvents');
    const currentStatus = toInvoiceStatus(invoice.status);
    if (input.action === 'mark-unpaid') {
      assertCanMarkPaidInvoiceUnpaid({
        paidEvent: latestMarkedPaidEvent(invoiceEvents, input.invoiceId),
        invoiceId: input.invoiceId,
      });
    }
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
    const manualReceipt =
      input.action === 'mark-paid'
        ? normalizeManualReceipt({
            input: input.manualReceipt,
            invoice,
            invoiceId: input.invoiceId,
            actorUserId: input.actorUserId,
            now,
          })
        : null;
    const canceledPaymentAttemptIds =
      input.action === 'mark-paid'
        ? cancelActivePaymentAttemptsForInvoice({
            paymentAttempts: getMutableRows(mutable.tables, 'paymentAttempts'),
            invoiceId: input.invoiceId,
            now,
            reason: 'Canceled after manual receipt was recorded.',
          })
        : [];
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
      invoiceEvents,
      invoiceId: input.invoiceId,
      eventType: plan.eventType,
      actorUserId: input.actorUserId,
      reason: plan.reason,
      requestId: input.requestId,
      occurredAt: now,
      metadata: {
        source: input.action === 'mark-paid' ? 'manual-receipt' : 'coach-reconciler',
        bookingId: bookingId ?? null,
        ...(manualReceipt
          ? {
              manualReceipt,
              canceledPaymentAttemptIds,
            }
          : {}),
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
      throw notFound('Invoice not found', {
        invoiceId: input.invoiceId,
      });
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
    if (input.action === 'mark-unpaid') {
      const paidEvent = await tx.invoiceEvent.findFirst({
        where: {
          invoiceId: input.invoiceId,
          eventType: 'MARKED_PAID',
        },
        orderBy: {
          occurredAt: 'desc',
        },
      });
      assertCanMarkPaidInvoiceUnpaid({
        paidEvent: paidEvent as unknown as SeedRow | null,
        invoiceId: input.invoiceId,
      });
    }
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
    const nowIsoString = now.toISOString();
    const manualReceipt =
      input.action === 'mark-paid'
        ? normalizeManualReceipt({
            input: input.manualReceipt,
            invoice: invoice as unknown as SeedRow,
            invoiceId: input.invoiceId,
            actorUserId: input.actorUserId,
            now: nowIsoString,
          })
        : null;
    const activePaymentAttempts =
      input.action === 'mark-paid'
        ? await tx.paymentAttempt.findMany({
            where: {
              invoiceId: input.invoiceId,
              status: {
                in: ['PENDING', 'ACTION_REQUIRED'],
              },
            },
            select: {
              id: true,
            },
          })
        : [];
    const canceledPaymentAttemptIds = activePaymentAttempts.map((attempt) => attempt.id);
    const data = {
      status: plan.nextStatus,
      updatedByUserId: input.actorUserId,
      version: {
        increment: 1,
      },
      ...(input.action === 'mark-paid'
        ? {
            paidAt: now,
          }
        : {}),
      ...(input.action === 'mark-unpaid'
        ? {
            paidAt: null,
          }
        : {}),
      ...(input.action === 'write-off'
        ? {
            paidAt: null,
            voidReason: plan.reason,
          }
        : {}),
      ...(input.action === 'restore'
        ? {
            voidReason: null,
          }
        : {}),
      ...(input.action === 'void'
        ? {
            paidAt: null,
            voidedAt: now,
            voidReason: plan.reason,
          }
        : {}),
    };
    const [updatedInvoice, , existingReconciler] = await Promise.all([
      tx.invoice.update({
        where: {
          id: input.invoiceId,
        },
        data,
      }),
      tx.invoiceEvent.create({
        data: {
          id: newId('ine'),
          invoiceId: input.invoiceId,
          eventType: plan.eventType,
          actorUserId: input.actorUserId,
          reason: plan.reason,
          requestId: input.requestId ?? null,
          metadataJson: {
            source: input.action === 'mark-paid' ? 'manual-receipt' : 'coach-reconciler',
            bookingId: invoice.bookingId ?? null,
            ...(manualReceipt
              ? {
                  manualReceipt,
                  canceledPaymentAttemptIds,
                }
              : {}),
          } as never,
        },
      }),
      tx.reconcilerEntry.findFirst({
        where: {
          invoiceId: input.invoiceId,
        },
      }),
      canceledPaymentAttemptIds.length > 0
        ? tx.paymentAttempt.updateMany({
            where: {
              id: {
                in: canceledPaymentAttemptIds,
              },
            },
            data: {
              status: 'CANCELED',
              canceledAt: now,
              failureReason: 'Canceled after manual receipt was recorded.',
            },
          })
        : Promise.resolve(null),
    ]);
    if (existingReconciler) {
      await tx.reconcilerEntry.update({
        where: {
          id: existingReconciler.id,
        },
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
    throw badRequest('Refund reason is required', {
      invoiceId: input.invoiceId,
    });
  }
  if (input.verificationCode.trim() !== SIMULATED_REFUND_VERIFICATION_CODE) {
    throw badRequest('Refund verification code is invalid', {
      invoiceId: input.invoiceId,
    });
  }
  const mutable = resolveMutableTables();
  if (mutable) {
    const invoices = getMutableRows(mutable.tables, 'invoices');
    const invoice = getActiveRows(invoices).find((row) => asString(row.id) === input.invoiceId);
    if (!invoice) {
      throw notFound('Invoice not found', {
        invoiceId: input.invoiceId,
      });
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
    const requestHash = buildRefundRequestHash({
      amountMinor,
      reason,
    });
    const invoiceEvents = getMutableRows(mutable.tables, 'invoiceEvents');
    const existing = existingRefundEventFromRows(
      invoiceEvents,
      input.invoiceId,
      input.idempotencyKey,
    );
    if (existing) {
      const metadata = coerceMetadata(existing.metadataJson);
      if (asString(metadata.requestHash) !== requestHash) {
        throw badRequest('Refund idempotency key already belongs to a different request', {
          invoiceId: input.invoiceId,
          idempotencyKey: input.idempotencyKey,
        });
      }
      return {
        invoice,
        refund: existing,
        reused: true,
      };
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
    return {
      invoice,
      refund: refundEvent,
      reused: false,
    };
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
      throw notFound('Invoice not found', {
        invoiceId: input.invoiceId,
      });
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
    const requestHash = buildRefundRequestHash({
      amountMinor,
      reason,
    });
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
    const [updatedInvoice, refundEvent, existingReconciler] = await Promise.all([
      tx.invoice.update({
        where: {
          id: input.invoiceId,
        },
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
      }),
      tx.invoiceEvent.create({
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
      }),
      tx.reconcilerEntry.findFirst({
        where: {
          invoiceId: input.invoiceId,
        },
      }),
    ]);
    if (existingReconciler) {
      await tx.reconcilerEntry.update({
        where: {
          id: existingReconciler.id,
        },
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
    const context = resolveBookingInvoiceContextFromTables(mutable.tables, input.bookingId);
    if (!context) {
      throw notFound('Booking not found', {
        bookingId: input.bookingId,
      });
    }
    assertBookingReadyForInvoice(context);
    const existing = getActiveRows(invoices).find(
      (row) => asString(row.bookingId) === input.bookingId,
    );
    if (existing) {
      return {
        invoice: existing,
        created: false,
      };
    }
    if (context.totalMinor <= 0) {
      throw badRequest('Booking has no billable value', {
        bookingId: input.bookingId,
      });
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
    return {
      invoice,
      created: true,
    };
  }
  const prisma = getPrismaClientOrThrow();
  const context = await resolveBookingInvoiceContextFromDb(input.bookingId);
  if (!context) {
    throw notFound('Booking not found', {
      bookingId: input.bookingId,
    });
  }
  assertBookingReadyForInvoice(context);
  const existing = await prisma.invoice.findFirst({
    where: {
      bookingId: input.bookingId,
      deletedAt: null,
    },
  });
  if (existing) {
    return {
      invoice: normalizeForJson(existing),
      created: false,
    };
  }
  if (context.totalMinor <= 0) {
    throw badRequest('Booking has no billable value', {
      bookingId: input.bookingId,
    });
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
      throw notFound('Invoice not found', {
        invoiceId: input.invoiceId,
      });
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
          recipientEmailDomain: emailDomain(input.recipientEmail),
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
        recipientEmailDomain: emailDomain(input.recipientEmail),
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
        recipientEmailDomain: emailDomain(input.recipientEmail),
        source: 'invoice-runtime',
      },
      requestId: null,
      occurredAt: now,
    });
    return {
      invoice,
      reminder,
      sentAt: now,
    };
  }
  const prisma = getPrismaClientOrThrow();
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: input.invoiceId,
      deletedAt: null,
    },
  });
  if (!invoice) {
    throw notFound('Invoice not found', {
      invoiceId: input.invoiceId,
    });
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
          where: {
            id: input.invoiceId,
          },
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
                  recipientEmailDomain: emailDomain(input.recipientEmail),
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
        recipientEmailDomain: emailDomain(input.recipientEmail),
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
        recipientEmailDomain: emailDomain(input.recipientEmail),
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
export async function updateInvoiceReminderDelivery(
  input: UpdateInvoiceReminderDeliveryInput,
): Promise<SeedRow> {
  const metadataPatch = {
    deliveryProvider: input.deliveryProvider,
    ...(input.deliveryError ? { deliveryError: input.deliveryError } : {}),
  };
  const mutable = resolveMutableTables();
  if (mutable) {
    const reminder = getMutableRows(mutable.tables, 'paymentReminders').find(
      (row) => asString(row.id) === input.reminderId,
    );
    if (!reminder) {
      throw notFound('Payment reminder not found', { reminderId: input.reminderId });
    }
    reminder.deliveryStatus = input.deliveryStatus;
    reminder.metadataJson = {
      ...coerceMetadata(reminder.metadataJson),
      ...metadataPatch,
    };
    return reminder;
  }
  const prisma = getPrismaClientOrThrow();
  const reminder = await prisma.paymentReminder.update({
    where: {
      id: input.reminderId,
    },
    data: {
      deliveryStatus: input.deliveryStatus,
      metadataJson: {
        ...(coerceMetadata(
          (
            await prisma.paymentReminder.findUnique({
              where: {
                id: input.reminderId,
              },
              select: {
                metadataJson: true,
              },
            })
          )?.metadataJson,
        ) as Record<string, unknown>),
        ...metadataPatch,
      } as never,
    },
  });
  return normalizeForJson(reminder);
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
      throw notFound('Invoice not found', {
        invoiceId: input.invoiceId,
      });
    }
    const status = toInvoiceStatus(invoice.status);
    if (status === 'PAID') {
      throw badRequest('Invoice is already paid', {
        invoiceId: input.invoiceId,
      });
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
      return {
        invoice,
        attempt: existing,
        hostedSession,
        reused: true,
      };
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
    return {
      invoice,
      attempt,
      hostedSession,
      reused: false,
    };
  }
  const prisma = getPrismaClientOrThrow();
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: input.invoiceId,
      deletedAt: null,
    },
  });
  if (!invoice) {
    throw notFound('Invoice not found', {
      invoiceId: input.invoiceId,
    });
  }
  if (invoice.status === 'PAID') {
    throw badRequest('Invoice is already paid', {
      invoiceId: input.invoiceId,
    });
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
    throw badRequest('Payment attempt token mismatch', {
      attemptId,
    });
  }
  const detail = await getPaymentAttemptById(attemptId);
  if (!detail) {
    throw notFound('Payment attempt not found', {
      attemptId,
    });
  }
  const attempt = detail.attempt;
  const invoice = detail.invoice;
  if (asString(attempt.providerSessionId) !== payload.providerSessionId) {
    throw badRequest('Payment attempt provider session mismatch', {
      attemptId,
    });
  }
  if ((asNumber(attempt.amountMinor) ?? 0) !== payload.amountMinor) {
    throw badRequest('Payment attempt amount mismatch', {
      attemptId,
    });
  }
  if ((asString(attempt.currency) ?? 'GBP') !== payload.currency) {
    throw badRequest('Payment attempt currency mismatch', {
      attemptId,
    });
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
function isProviderPaymentFailureStatus(value: string): value is ProviderPaymentFailureStatus {
  return PROVIDER_PAYMENT_FAILURE_STATUSES.includes(value as ProviderPaymentFailureStatus);
}

async function getPaymentAttemptForProviderCompletion(
  params:
    | { attemptId: string; providerSessionId?: string }
    | { attemptId?: string; providerSessionId: string },
): Promise<{ attempt: SeedRow; invoice: SeedRow } | null> {
  const mutable = resolveMutableTables();
  if (mutable) {
    const attempts = getMutableRows(mutable.tables, 'paymentAttempts');
    ensureAttemptFreshness(attempts);
    const attempt = attempts.find((row) =>
      params.attemptId
        ? asString(row.id) === params.attemptId
        : asString(row.providerSessionId) === params.providerSessionId,
    );
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
  const where = params.attemptId
    ? { id: params.attemptId }
    : { providerSessionId: params.providerSessionId };
  const attempt = await prisma.paymentAttempt.findFirst({
    where,
    include: {
      invoice: true,
    },
  });
  if (!attempt) {
    return null;
  }
  return {
    attempt: normalizeForJson(attempt),
    invoice: normalizeForJson(attempt.invoice),
  };
}

function assertProviderCompletionInput(input: CompleteProviderInvoicePaymentInput): void {
  if (!input.attemptId && !input.providerSessionId) {
    throw badRequest('Payment completion callback is missing attempt reference', {});
  }
}

function providerCompletionLookup(
  input: CompleteProviderInvoicePaymentInput,
):
  | { attemptId: string; providerSessionId?: string }
  | { attemptId?: string; providerSessionId: string } {
  if (input.attemptId) {
    return {
      attemptId: input.attemptId,
      providerSessionId: input.providerSessionId,
    };
  }
  if (input.providerSessionId) {
    return {
      providerSessionId: input.providerSessionId,
    };
  }
  throw badRequest('Payment completion callback is missing attempt reference', {});
}

function validateProviderCompletionBase(
  input: CompleteProviderInvoicePaymentInput,
  detail: { attempt: SeedRow; invoice: SeedRow },
): void {
  if (
    input.providerSessionId &&
    asString(detail.attempt.providerSessionId) !== input.providerSessionId
  ) {
    throw badRequest('Payment attempt provider session mismatch', {
      attemptId: asString(detail.attempt.id) ?? input.attemptId,
    });
  }
  if ((asString(detail.attempt.provider) ?? '') !== input.provider) {
    throw badRequest('Payment attempt provider mismatch', {
      attemptId: asString(detail.attempt.id) ?? input.attemptId,
      provider: asString(detail.attempt.provider) ?? null,
    });
  }
  if (
    input.expectedAmountMinor !== undefined &&
    (asNumber(detail.attempt.amountMinor) ?? 0) !== input.expectedAmountMinor
  ) {
    throw badRequest('Payment attempt amount mismatch', {
      attemptId: asString(detail.attempt.id) ?? input.attemptId,
    });
  }
  if (
    input.expectedCurrency !== undefined &&
    (asString(detail.attempt.currency) ?? 'GBP') !== input.expectedCurrency
  ) {
    throw badRequest('Payment attempt currency mismatch', {
      attemptId: asString(detail.attempt.id) ?? input.attemptId,
    });
  }
}

function applyMutableProviderFailureUpdate(params: {
  attempt: SeedRow;
  status: ProviderPaymentFailureStatus;
  actorUserId: string;
  failureCode?: string | null;
  failureReason: string;
  now: string;
}): void {
  const attempt = params.attempt;
  attempt.status = params.status;
  attempt.updatedAt = params.now;
  attempt.failureCode = params.failureCode ?? null;
  attempt.failureReason = params.failureReason;
  if (params.status === 'CANCELED') {
    attempt.canceledAt = params.now;
    attempt.failedAt = null;
  } else {
    attempt.failedAt = params.now;
    attempt.canceledAt = null;
  }
  attempt.actorUserId = attempt.actorUserId ?? params.actorUserId;
}

async function completeProviderInvoicePaymentForMutable(
  input: CompleteProviderInvoicePaymentInput,
): Promise<CompleteProviderInvoicePaymentResult> {
  const mutable = resolveMutableTables();
  if (!mutable) {
    throw new Error('Mutable invoice payment completion requires mutable tables.');
  }
  const detail = await getPaymentAttemptForProviderCompletion(providerCompletionLookup(input));
  if (!detail) {
    throw notFound('Payment attempt not found', {
      attemptId: input.attemptId,
      providerSessionId: input.providerSessionId,
    });
  }
  validateProviderCompletionBase(input, detail);
  const attempt = detail.attempt;
  const invoice = detail.invoice;
  const now = nowIso();
  const actorUserId = input.actorUserId ?? asString(attempt.actorUserId) ?? 'system';
  const attemptStatus = coerceAttemptStatus(attempt.status);
  if (input.completionStatus === 'COMPLETED') {
    if (attemptStatus === 'COMPLETED') {
      return {
        invoice,
        attempt,
        alreadyCompleted: true,
      };
    }
    if (!ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(attemptStatus)) {
      throw badRequest('Payment attempt is not payable', {
        attemptId: asString(attempt.id) ?? input.attemptId,
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
    const alreadyCompleted = toInvoiceStatus(invoice.status) === 'PAID';
    attempt.status = 'COMPLETED';
    attempt.confirmedAt = now;
    attempt.updatedAt = now;
    if (!alreadyCompleted) {
      invoice.status = 'PAID';
      invoice.paidAt = now;
      invoice.updatedAt = now;
      invoice.updatedByUserId = actorUserId;
      invoice.version = (asNumber(invoice.version) ?? 1) + 1;
      getMutableRows(mutable.tables, 'invoiceEvents').push({
        id: newId('ine'),
        invoiceId: asString(invoice.id),
        eventType: 'MARKED_PAID',
        actorUserId,
        reason: input.reason,
        metadataJson: {
          source: input.source,
          attemptId: asString(attempt.id),
          providerSessionId: asString(attempt.providerSessionId) ?? '',
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
        reconcilerEntry.updatedByUserId = actorUserId;
        reconcilerEntry.version = (asNumber(reconcilerEntry.version) ?? 1) + 1;
        reconcilerEntry.internalNote = input.reason;
      } else {
        reconcilerEntries.push({
          id: newId('rec'),
          invoiceId: asString(invoice.id),
          coachUserId: asString(invoice.coachUserId),
          state: 'PAID',
          internalNote: `Created by ${input.source}.`,
          createdByUserId: actorUserId,
          updatedByUserId: actorUserId,
          version: 1,
          createdAt: now,
          updatedAt: now,
        });
      }
      markMutableGroupSessionRegistrationPaid({
        tables: mutable.tables,
        invoice,
        paidAt: now,
        actorUserId,
      });
    }
    return {
      invoice,
      attempt,
      alreadyCompleted,
    };
  }

  if (!isProviderPaymentFailureStatus(input.completionStatus)) {
    throw badRequest('Unsupported payment completion status', {
      attemptId: asString(attempt.id) ?? input.attemptId,
      completionStatus: input.completionStatus,
    });
  }
  if (attemptStatus === 'COMPLETED') {
    return {
      invoice,
      attempt,
      alreadyCompleted: true,
    };
  }
  if (
    !ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(attemptStatus) &&
    attemptStatus !== input.completionStatus
  ) {
    throw badRequest('Payment attempt is not payable', {
      attemptId: asString(attempt.id) ?? input.attemptId,
      status: attempt.status,
    });
  }
  applyMutableProviderFailureUpdate({
    attempt,
    status: input.completionStatus,
    actorUserId,
    failureCode: input.failureCode,
    failureReason: input.failureReason ?? input.reason,
    now,
  });
  return {
    invoice,
    attempt,
    alreadyCompleted: false,
  };
}

async function completeProviderInvoicePaymentForPrisma(
  input: CompleteProviderInvoicePaymentInput,
): Promise<CompleteProviderInvoicePaymentResult> {
  const detail = await getPaymentAttemptForProviderCompletion(providerCompletionLookup(input));
  if (!detail) {
    throw notFound('Payment attempt not found', {
      attemptId: input.attemptId,
      providerSessionId: input.providerSessionId,
    });
  }
  validateProviderCompletionBase(input, detail);
  const attempt = detail.attempt;
  const invoice = detail.invoice;
  const attemptId = asString(attempt.id);
  const invoiceId = asString(invoice.id);
  const invoiceCoachUserId = asString(invoice.coachUserId);
  if (!attemptId || !invoiceId || !invoiceCoachUserId) {
    throw badRequest('Payment attempt is missing authoritative identifiers', {
      attemptId: input.attemptId,
      invoiceId,
      coachUserId: invoiceCoachUserId,
    });
  }
  const attemptStatus = coerceAttemptStatus(attempt.status);
  const actorUserId = input.actorUserId ?? asString(attempt.actorUserId) ?? 'system';

  if (input.completionStatus === 'COMPLETED') {
    if (attemptStatus === 'COMPLETED') {
      return {
        invoice: detail.invoice,
        attempt,
        alreadyCompleted: true,
      };
    }
    if (!ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(attemptStatus)) {
      throw badRequest('Payment attempt is not payable', {
        attemptId,
        status: attempt.status,
      });
    }
    const invoiceStatus = toInvoiceStatus(invoice.status);
    if (invoiceStatus === 'VOID' || invoiceStatus === 'WRITTEN_OFF') {
      throw badRequest('Invoice cannot accept payment in its current state', {
        invoiceId,
        status: invoice.status,
      });
    }
    if (invoiceStatus === 'PAID') {
      const now = new Date();
      const updatedAttempt = await getPrismaClientOrThrow().paymentAttempt.update({
        where: { id: attemptId },
        data: { status: 'COMPLETED', confirmedAt: now },
      });
      return {
        invoice: normalizeForJson(invoice),
        attempt: normalizeForJson(updatedAttempt),
        alreadyCompleted: true,
      };
    }
    const now = new Date();
    const booking = asString(invoice.bookingId)
      ? await getPrismaClientOrThrow().booking.findFirst({
          where: {
            id: asString(invoice.bookingId),
            deletedAt: null,
          },
          select: {
            id: true,
            coachUserId: true,
          },
        })
      : null;
    if (booking && asString(booking.coachUserId) !== asString(invoice.coachUserId)) {
      throw badRequest('Invoice booking coach link does not match authoritative booking', {
        invoiceId: asString(invoice.id),
        bookingId: asString(invoice.bookingId),
      });
    }
    const [existingReconciler, paidBooking] = await Promise.all([
      getPrismaClientOrThrow().reconcilerEntry.findFirst({
        where: {
          invoiceId: asString(invoice.id),
        },
      }),
      asString(invoice.bookingId)
        ? getPrismaClientOrThrow().booking.findFirst({
            where: {
              id: asString(invoice.bookingId),
              deletedAt: null,
            },
            select: {
              groupSessionId: true,
              participants: {
                where: {
                  deletedAt: null,
                },
                select: {
                  athleteId: true,
                },
                take: 1,
              },
            },
          })
        : Promise.resolve(null),
    ]);
    const reconcilerWrite = existingReconciler
      ? getPrismaClientOrThrow().reconcilerEntry.update({
          where: {
            id: existingReconciler.id,
          },
          data: {
            state: 'PAID',
            internalNote: input.reason,
            updatedByUserId: actorUserId,
            version: {
              increment: 1,
            },
          },
        })
      : getPrismaClientOrThrow().reconcilerEntry.create({
          data: {
            id: newId('rec'),
            invoiceId,
            coachUserId: invoiceCoachUserId,
            state: 'PAID',
            internalNote: `Created by ${input.source}.`,
            createdByUserId: actorUserId,
            updatedByUserId: actorUserId,
          },
        });
    const athleteId = paidBooking?.participants[0]?.athleteId;
    const registrationPaidWrite =
      paidBooking?.groupSessionId && athleteId
        ? getPrismaClientOrThrow().groupSessionRegistration.updateMany({
            where: {
              groupSessionId: paidBooking.groupSessionId,
              athleteId,
              deletedAt: null,
              status: {
                not: 'CANCELLED',
              },
            },
            data: {
              paidAt: now,
              updatedByUserId: actorUserId,
              version: {
                increment: 1,
              },
            },
          })
        : Promise.resolve(null);

    const [attempted, invoiceUpdated] = await Promise.all([
      getPrismaClientOrThrow().paymentAttempt.update({
        where: { id: attemptId },
        data: {
          status: 'COMPLETED',
          confirmedAt: now,
        },
      }),
      getPrismaClientOrThrow().invoice.update({
        where: {
          id: invoiceId,
        },
        data: {
          status: 'PAID',
          paidAt: now,
          updatedByUserId: actorUserId,
          version: {
            increment: 1,
          },
        },
      }),
      getPrismaClientOrThrow().invoiceEvent.create({
        data: {
          id: newId('ine'),
          invoiceId,
          eventType: 'MARKED_PAID',
          actorUserId,
          reason: input.reason,
          metadataJson: {
            source: input.source,
            attemptId,
            providerSessionId: asString(attempt.providerSessionId),
          } as never,
        },
      }),
      reconcilerWrite,
      registrationPaidWrite,
    ]);

    return {
      invoice: normalizeForJson(invoiceUpdated),
      attempt: normalizeForJson(attempted),
      alreadyCompleted: false,
    };
  }

  if (!isProviderPaymentFailureStatus(input.completionStatus)) {
    throw badRequest('Unsupported payment completion status', {
      attemptId,
      completionStatus: input.completionStatus,
    });
  }
  if (attemptStatus === 'COMPLETED') {
    return {
      invoice: detail.invoice,
      attempt,
      alreadyCompleted: true,
    };
  }
  if (
    !ACTIVE_PAYMENT_ATTEMPT_STATUSES.has(attemptStatus) &&
    attemptStatus !== input.completionStatus
  ) {
    throw badRequest('Payment attempt is not payable', {
      attemptId,
      status: attempt.status,
    });
  }
  const now = new Date();
  const failureData = {
    status: input.completionStatus,
    failureCode: input.failureCode ?? null,
    failureReason: input.failureReason ?? input.reason,
  } as const;
  const failedAttempt = await getPrismaClientOrThrow().paymentAttempt.update({
    where: {
      id: attemptId,
    },
    data: {
      status: failureData.status,
      failedAt:
        input.completionStatus === 'FAILED' || input.completionStatus === 'EXPIRED' ? now : null,
      canceledAt: input.completionStatus === 'CANCELED' ? now : null,
      failureCode: failureData.failureCode,
      failureReason: failureData.failureReason,
    },
  });
  return {
    invoice: normalizeForJson(detail.invoice),
    attempt: normalizeForJson(failedAttempt),
    alreadyCompleted: false,
  };
}

export async function completeProviderInvoicePayment(
  input: CompleteProviderInvoicePaymentInput,
): Promise<CompleteProviderInvoicePaymentResult> {
  assertProviderCompletionInput(input);
  const mutable = resolveMutableTables();
  if (mutable) {
    return completeProviderInvoicePaymentForMutable(input);
  }
  return completeProviderInvoicePaymentForPrisma(input);
}

export async function completeSimulatedInvoicePayment(
  input: CompleteSimulatedInvoicePaymentInput,
): Promise<CompleteSimulatedInvoicePaymentResult> {
  const payload = verifySimulatedPaymentToken(input.token);
  if (payload.attemptId !== input.attemptId) {
    throw badRequest('Payment attempt token mismatch', {
      attemptId: input.attemptId,
    });
  }
  return completeProviderInvoicePayment({
    attemptId: input.attemptId,
    providerSessionId: payload.providerSessionId,
    provider: 'simulated',
    source: 'simulated-provider',
    reason: 'Hosted payment confirmed by simulated provider.',
    completionStatus: 'COMPLETED',
    expectedAmountMinor: payload.amountMinor,
    expectedCurrency: payload.currency,
  });
}
async function getPaymentAttemptById(attemptId: string): Promise<{
  attempt: SeedRow;
  invoice: SeedRow;
} | null> {
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
    return {
      attempt,
      invoice,
    };
  }
  const prisma = getPrismaClientOrThrow();
  const attempt = await prisma.paymentAttempt.findUnique({
    where: {
      id: attemptId,
    },
    include: {
      invoice: true,
    },
  });
  if (!attempt) {
    return null;
  }
  return {
    attempt: normalizeForJson(attempt),
    invoice: normalizeForJson(attempt.invoice),
  };
}
