import { getApiDataBackend } from '../../lib/data-backend.js';
import { notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow } from '../../lib/prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

export type CoachEarningsPeriod = 'week' | 'month' | 'year';

export interface CoachEarningTransaction {
  id: string;
  coachId: string;
  type: 'SESSION_PAYMENT';
  amount: number;
  currency: string;
  status: 'COMPLETED';
  description: string;
  bookingId?: string;
  sessionDate?: string;
  createdAt: string;
  completedAt: string;
}

export interface CoachEarningsSnapshot {
  earnings: {
    coachId: string;
    availableBalance: number;
    pendingBalance: number;
    totalEarned: number;
    totalWithdrawn: number;
    totalSessions: number;
    averageSessionValue: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
    recentTransactions: CoachEarningTransaction[];
    pendingWithdrawals: CoachWithdrawalSnapshot[];
    payoutMethods: CoachPayoutMethodSnapshot[];
    defaultPayoutMethodId?: string;
    platformFeePercent: 0;
    currency: string;
    updatedAt: string;
  };
  calculation: {
    totalEarned: number;
    totalSessions: number;
    averageSessionValue: number;
    thisWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
  summary: {
    period: CoachEarningsPeriod;
    totalEarned: number;
    totalSessions: number;
    averagePerSession: number;
    comparedToLastPeriod: number;
  };
  transactions: CoachEarningTransaction[];
  totalTransactions: number;
}

type PayoutMethodType = 'BANK_ACCOUNT' | 'PAYPAL' | 'STRIPE';
type WithdrawalStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface CoachPayoutMethodSnapshot {
  id: string;
  coachId: string;
  type: PayoutMethodType;
  isDefault: boolean;
  isVerified: boolean;
  bankName?: string;
  accountLastFour?: string;
  paypalEmail?: string;
  stripeAccountId?: string;
  nickname?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface CoachWithdrawalSnapshot {
  id: string;
  coachId: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  payoutMethodId: string;
  payoutMethod: PayoutMethodType;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;
  reference?: string;
}

interface CoachEarningsRepository {
  getSnapshot(
    authUserId: string,
    period: CoachEarningsPeriod,
    limit?: number,
  ): Promise<CoachEarningsSnapshot>;
}

const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;
const asIsoString = (value: unknown, fallback = new Date().toISOString()): string =>
  typeof value === 'string'
    ? value
    : value instanceof Date
      ? value.toISOString()
      : fallback;
const roundMoney = (value: number): number => Math.round(value * 100) / 100;
const moneyFromMinor = (value: unknown): number => roundMoney((asNumber(value) ?? 0) / 100);

function requireStoreCoach(tables: SeedTables, authUserId: string): void {
  const coach = asRows(tables.coachProfiles).find(
    (row) => asString(row.userId) === authUserId && !asString(row.deletedAt),
  );
  if (!coach) {
    throw notFound('Coach profile not found');
  }
}

function activeCoachInvoices(tables: SeedTables, authUserId: string): SeedRow[] {
  return asRows(tables.invoices).filter(
    (row) => asString(row.coachUserId) === authUserId && !asString(row.deletedAt),
  );
}

function activeCoachPayoutMethods(tables: SeedTables, authUserId: string): SeedRow[] {
  return asRows(tables.coachPayoutMethods)
    .filter((row) => asString(row.coachUserId) === authUserId && !asString(row.deletedAt))
    .sort(
      (left, right) =>
        new Date(asIsoString(left.createdAt)).getTime() -
        new Date(asIsoString(right.createdAt)).getTime(),
    );
}

function coachWithdrawals(tables: SeedTables, authUserId: string): SeedRow[] {
  return asRows(tables.coachWithdrawals)
    .filter((row) => asString(row.coachUserId) === authUserId)
    .sort(
      (left, right) =>
        new Date(asIsoString(right.requestedAt)).getTime() -
        new Date(asIsoString(left.requestedAt)).getTime(),
    );
}

function transactionDate(row: SeedRow): string {
  return asIsoString(row.paidAt, asIsoString(row.updatedAt, asIsoString(row.createdAt)));
}

function invoiceDescription(row: SeedRow): string {
  const sessionType = asString(row.sessionType)?.replaceAll('_', ' ');
  if (sessionType) {
    return sessionType;
  }
  const invoiceNumber = asString(row.invoiceNumber);
  return invoiceNumber ? `Invoice ${invoiceNumber}` : 'Session payment';
}

function mapPaidTransaction(row: SeedRow, coachId: string): CoachEarningTransaction {
  const completedAt = transactionDate(row);
  const bookingId = asString(row.bookingId);
  const sessionDate =
    row.sessionDate === null || row.sessionDate === undefined
      ? undefined
      : asIsoString(row.sessionDate);
  return {
    id: `earning:${asString(row.id) ?? ''}`,
    coachId,
    type: 'SESSION_PAYMENT',
    amount: moneyFromMinor(row.totalMinor),
    currency: asString(row.currency) ?? 'GBP',
    status: 'COMPLETED',
    description: invoiceDescription(row),
    ...(bookingId ? { bookingId } : {}),
    ...(sessionDate ? { sessionDate } : {}),
    createdAt: completedAt,
    completedAt,
  };
}

function toPayoutMethodType(value: unknown): PayoutMethodType {
  if (value === 'PAYPAL' || value === 'STRIPE') {
    return value;
  }
  return 'BANK_ACCOUNT';
}

function toWithdrawalStatus(value: unknown): WithdrawalStatus {
  if (
    value === 'PROCESSING' ||
    value === 'COMPLETED' ||
    value === 'FAILED' ||
    value === 'CANCELLED'
  ) {
    return value;
  }
  return 'PENDING';
}

function mapPayoutMethod(row: SeedRow): CoachPayoutMethodSnapshot {
  const bankName = asString(row.bankName);
  const accountLastFour = asString(row.accountLastFour);
  const paypalEmail = asString(row.paypalEmail);
  const stripeAccountId = asString(row.stripeAccountId);
  const nickname = asString(row.nickname);
  const verifiedAt = row.verifiedAt ? asIsoString(row.verifiedAt) : undefined;
  return {
    id: asString(row.id) ?? '',
    coachId: asString(row.coachUserId) ?? '',
    type: toPayoutMethodType(row.type),
    isDefault: asBoolean(row.isDefault) ?? false,
    isVerified: asBoolean(row.isVerified) ?? false,
    ...(bankName ? { bankName } : {}),
    ...(accountLastFour ? { accountLastFour } : {}),
    ...(paypalEmail ? { paypalEmail } : {}),
    ...(stripeAccountId ? { stripeAccountId } : {}),
    ...(nickname ? { nickname } : {}),
    createdAt: asIsoString(row.createdAt),
    ...(verifiedAt ? { verifiedAt } : {}),
  };
}

function mapWithdrawal(row: SeedRow): CoachWithdrawalSnapshot {
  const processedAt = row.processedAt ? asIsoString(row.processedAt) : undefined;
  const completedAt = row.completedAt ? asIsoString(row.completedAt) : undefined;
  const failureReason = asString(row.failureReason);
  const reference = asString(row.reference);
  return {
    id: asString(row.id) ?? '',
    coachId: asString(row.coachUserId) ?? '',
    amount: moneyFromMinor(row.amountMinor),
    currency: asString(row.currency) ?? 'GBP',
    fee: moneyFromMinor(row.feeMinor),
    netAmount: moneyFromMinor(row.netAmountMinor),
    payoutMethodId: asString(row.payoutMethodId) ?? '',
    payoutMethod: toPayoutMethodType(row.payoutMethodType),
    status: toWithdrawalStatus(row.status),
    requestedAt: asIsoString(row.requestedAt),
    ...(processedAt ? { processedAt } : {}),
    ...(completedAt ? { completedAt } : {}),
    ...(failureReason ? { failureReason } : {}),
    ...(reference ? { reference } : {}),
  };
}

function startOfUtcWeek(now: Date): Date {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  return start;
}

function periodBounds(
  period: CoachEarningsPeriod,
  now: Date,
): {
  currentStart: Date;
  previousStart: Date;
  previousEnd: Date;
} {
  if (period === 'week') {
    const currentStart = new Date(now);
    currentStart.setUTCDate(currentStart.getUTCDate() - 7);
    const previousStart = new Date(currentStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - 7);
    return {
      currentStart,
      previousStart,
      previousEnd: currentStart,
    };
  }
  if (period === 'year') {
    return {
      currentStart: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
      previousStart: new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1)),
      previousEnd: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
    };
  }
  return {
    currentStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    previousStart: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
    previousEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  };
}

function totalForTransactions(transactions: CoachEarningTransaction[]): number {
  return roundMoney(transactions.reduce((sum, transaction) => sum + transaction.amount, 0));
}

function transactionsFrom(
  transactions: CoachEarningTransaction[],
  start: Date,
  end?: Date,
): CoachEarningTransaction[] {
  const startMs = start.getTime();
  const endMs = end?.getTime();
  return transactions.filter((transaction) => {
    const occurredAt = new Date(transaction.createdAt).getTime();
    return occurredAt >= startMs && (endMs === undefined || occurredAt < endMs);
  });
}

function buildSnapshot(
  invoices: SeedRow[],
  withdrawalRows: SeedRow[],
  payoutMethodRows: SeedRow[],
  authUserId: string,
  period: CoachEarningsPeriod,
  limit?: number,
): CoachEarningsSnapshot {
  const now = new Date();
  const paidTransactions = invoices
    .filter((row) => asString(row.status)?.toUpperCase() === 'PAID')
    .map((row) => mapPaidTransaction(row, authUserId))
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  const openInvoices = invoices.filter((row) =>
    ['DRAFT', 'SENT'].includes(asString(row.status)?.toUpperCase() ?? ''),
  );

  const thisWeekTransactions = transactionsFrom(paidTransactions, startOfUtcWeek(now));
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const thisMonthTransactions = transactionsFrom(paidTransactions, thisMonthStart);
  const lastMonthTransactions = transactionsFrom(
    paidTransactions,
    lastMonthStart,
    thisMonthStart,
  );

  const totalEarned = totalForTransactions(paidTransactions);
  const withdrawals = withdrawalRows.map(mapWithdrawal);
  const pendingWithdrawals = withdrawals.filter((withdrawal) =>
    ['PENDING', 'PROCESSING'].includes(withdrawal.status),
  );
  const totalWithdrawn = roundMoney(
    withdrawals
      .filter((withdrawal) => withdrawal.status === 'COMPLETED')
      .reduce((sum, withdrawal) => sum + withdrawal.amount, 0),
  );
  const reservedOrWithdrawn = roundMoney(
    withdrawals
      .filter((withdrawal) => !['FAILED', 'CANCELLED'].includes(withdrawal.status))
      .reduce((sum, withdrawal) => sum + withdrawal.amount, 0),
  );
  const payoutMethods = payoutMethodRows.map(mapPayoutMethod);
  const defaultPayoutMethodId = payoutMethods.find((method) => method.isDefault)?.id;
  const totalSessions = paidTransactions.length;
  const averageSessionValue =
    totalSessions > 0 ? roundMoney(totalEarned / totalSessions) : 0;
  const thisWeek = totalForTransactions(thisWeekTransactions);
  const thisMonth = totalForTransactions(thisMonthTransactions);
  const lastMonth = totalForTransactions(lastMonthTransactions);
  const currency =
    paidTransactions[0]?.currency ?? asString(openInvoices[0]?.currency) ?? 'GBP';

  const bounds = periodBounds(period, now);
  const currentPeriodTransactions = transactionsFrom(
    paidTransactions,
    bounds.currentStart,
  );
  const previousPeriodTransactions = transactionsFrom(
    paidTransactions,
    bounds.previousStart,
    bounds.previousEnd,
  );
  const currentPeriodTotal = totalForTransactions(currentPeriodTransactions);
  const previousPeriodTotal = totalForTransactions(previousPeriodTransactions);
  const comparedToLastPeriod =
    previousPeriodTotal > 0
      ? Math.round(((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100)
      : currentPeriodTotal > 0
        ? 100
        : 0;
  const visibleTransactions =
    limit === undefined ? paidTransactions : paidTransactions.slice(0, limit);
  const updatedAt = now.toISOString();

  return {
    earnings: {
      coachId: authUserId,
      availableBalance: Math.max(0, roundMoney(totalEarned - reservedOrWithdrawn)),
      pendingBalance: roundMoney(
        openInvoices.reduce((sum, invoice) => sum + moneyFromMinor(invoice.totalMinor), 0),
      ),
      totalEarned,
      totalWithdrawn,
      totalSessions,
      averageSessionValue,
      thisWeek,
      thisMonth,
      lastMonth,
      recentTransactions: paidTransactions.slice(0, 10),
      pendingWithdrawals,
      payoutMethods,
      ...(defaultPayoutMethodId ? { defaultPayoutMethodId } : {}),
      platformFeePercent: 0,
      currency,
      updatedAt,
    },
    calculation: {
      totalEarned,
      totalSessions,
      averageSessionValue,
      thisWeek,
      thisMonth,
      lastMonth,
    },
    summary: {
      period,
      totalEarned: currentPeriodTotal,
      totalSessions: currentPeriodTransactions.length,
      averagePerSession:
        currentPeriodTransactions.length > 0
          ? roundMoney(currentPeriodTotal / currentPeriodTransactions.length)
          : 0,
      comparedToLastPeriod,
    },
    transactions: visibleTransactions,
    totalTransactions: paidTransactions.length,
  };
}

class StoreCoachEarningsRepository implements CoachEarningsRepository {
  constructor(private readonly getTables: () => SeedTables) {}

  async getSnapshot(
    authUserId: string,
    period: CoachEarningsPeriod,
    limit?: number,
  ): Promise<CoachEarningsSnapshot> {
    const tables = this.getTables();
    requireStoreCoach(tables, authUserId);
    return buildSnapshot(
      activeCoachInvoices(tables, authUserId),
      coachWithdrawals(tables, authUserId),
      activeCoachPayoutMethods(tables, authUserId),
      authUserId,
      period,
      limit,
    );
  }
}

class DbCoachEarningsRepository implements CoachEarningsRepository {
  async getSnapshot(
    authUserId: string,
    period: CoachEarningsPeriod,
    limit?: number,
  ): Promise<CoachEarningsSnapshot> {
    const prisma = getPrismaClientOrThrow();
    const coach = await prisma.coachProfile.findFirst({
      where: {
        userId: authUserId,
        deletedAt: null,
      },
      select: {
        userId: true,
      },
    });
    if (!coach) {
      throw notFound('Coach profile not found');
    }
    const [invoices, withdrawals, payoutMethods] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          coachUserId: authUserId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.coachWithdrawal.findMany({
        where: {
          coachUserId: authUserId,
        },
        orderBy: {
          requestedAt: 'desc',
        },
      }),
      prisma.coachPayoutMethod.findMany({
        where: {
          coachUserId: authUserId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);
    return buildSnapshot(
      invoices as unknown as SeedRow[],
      withdrawals as unknown as SeedRow[],
      payoutMethods as unknown as SeedRow[],
      authUserId,
      period,
      limit,
    );
  }
}

const seedRepository = new StoreCoachEarningsRepository(
  () => getMarketplaceSeedStore().tables,
);
const dbRepository = new DbCoachEarningsRepository();

export function resolveCoachEarningsRepository(): CoachEarningsRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
