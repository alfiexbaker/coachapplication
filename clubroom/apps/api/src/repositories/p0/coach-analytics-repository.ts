import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import {
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

export type CoachAnalyticsPeriod = 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';

interface CoachAnalyticsRepository {
  getAnalytics(coachUserId: string, period: CoachAnalyticsPeriod): Promise<CoachAnalyticsResult>;
}

export interface CoachAnalyticsResult {
  analytics: CoachAnalyticsPayload;
  dataVersion: string | null;
}

interface CoachAnalyticsPayload {
  coachId: string;
  coachName?: string;
  period: CoachAnalyticsPeriod;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  totalRevenue: number;
  revenueChange: number;
  revenueChangePercent: number;
  revenueTrend: 'UP' | 'DOWN' | 'STABLE';
  revenueChart: Array<{
    date: string;
    amount: number;
    sessionCount?: number;
  }>;
  projectedRevenue?: number;
  avgRevenuePerSession: number;
  sessions: {
    totalSessions: number;
    sessionsChange: number;
    sessionsChangePercent: number;
    avgSessionsPerWeek: number;
    avgDuration: number;
    popularSessionType: string;
    bySessionType: Array<{
      type: string;
      count: number;
      percentage: number;
      revenue: number;
    }>;
  };
  retention: {
    newClients: number;
    returningClients: number;
    churnRate: number;
    retentionRate: number;
    avgSessionsPerClient: number;
    totalActiveClients: number;
    clientsLost: number;
  };
  cancellations: {
    totalCancellations: number;
    cancellationRate: number;
    byReason: Array<{
      reason:
        | 'CLIENT_REQUEST'
        | 'WEATHER'
        | 'ILLNESS'
        | 'SCHEDULING_CONFLICT'
        | 'NO_SHOW'
        | 'COACH_CANCELLED'
        | 'OTHER';
      count: number;
      percentage: number;
    }>;
    byDayOfWeek: Array<{
      dayOfWeek: number;
      dayName: string;
      count: number;
      percentage: number;
    }>;
    avgNoticeHours: number;
    revenueLost: number;
  };
  peakHours: Array<{
    dayOfWeek: number;
    dayName: string;
    hour: number;
    sessionCount: number;
    intensity: number;
  }>;
  busiestDay: {
    dayOfWeek: number;
    dayName: string;
    sessionCount: number;
  };
  busiestHour: {
    hour: number;
    sessionCount: number;
  };
  topSkills: Array<{
    skill: string;
    sessionCount: number;
    percentage: number;
    revenue: number;
  }>;
  avgRating: number;
  ratingChange: number;
  reviewCount: number;
  computedAt: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const allowedCancellationReasons = new Set([
  'CLIENT_REQUEST',
  'WEATHER',
  'ILLNESS',
  'SCHEDULING_CONFLICT',
  'NO_SHOW',
  'COACH_CANCELLED',
  'OTHER',
]);

const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const asIsoString = (value: unknown): string | undefined =>
  typeof value === 'string'
    ? value
    : value instanceof Date
      ? value.toISOString()
      : undefined;
const round = (value: number): number => Math.round(value * 100) / 100;
const moneyFromMinor = (value: unknown): number => round((asNumber(value) ?? 0) / 100);
const percentage = (part: number, total: number): number =>
  total > 0 ? round((part / total) * 100) : 0;

function parseDate(value: unknown): Date | null {
  const iso = asIsoString(value);
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function periodBounds(period: CoachAnalyticsPeriod, now: Date) {
  if (period === 'WEEK') {
    const currentStart = new Date(now);
    currentStart.setUTCDate(currentStart.getUTCDate() - 7);
    const previousStart = new Date(currentStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - 7);
    return { currentStart, previousStart, previousEnd: currentStart };
  }
  if (period === 'MONTH') {
    const currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return { currentStart, previousStart, previousEnd: currentStart };
  }
  if (period === 'QUARTER') {
    const currentStart = new Date(now);
    currentStart.setUTCMonth(currentStart.getUTCMonth() - 3);
    const previousStart = new Date(currentStart);
    previousStart.setUTCMonth(previousStart.getUTCMonth() - 3);
    return { currentStart, previousStart, previousEnd: currentStart };
  }
  if (period === 'YEAR') {
    const currentStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const previousStart = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
    return { currentStart, previousStart, previousEnd: currentStart };
  }
  const currentStart = new Date(Date.UTC(2020, 0, 1));
  return { currentStart, previousStart: new Date(0), previousEnd: currentStart };
}

function dateInRange(date: Date | null, start: Date, end: Date): boolean {
  if (!date) {
    return false;
  }
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function statusOf(row: SeedRow): string {
  return (asString(row.status) ?? '').toUpperCase();
}

function serviceTypeOf(row: SeedRow): string {
  return asString(row.serviceType) ?? asString(row.sessionType) ?? 'session';
}

function bookingDate(row: SeedRow): Date | null {
  return parseDate(row.scheduledAt ?? row.sessionDate ?? row.createdAt);
}

function invoicePaidDate(row: SeedRow): Date | null {
  return parseDate(row.paidAt ?? row.updatedAt ?? row.createdAt);
}

function cancellationDate(row: SeedRow): Date | null {
  return parseDate(row.cancelledAt ?? row.updatedAt ?? row.scheduledAt);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizeCancellationReason(value: unknown) {
  const raw = (asString(value) ?? 'OTHER')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  return allowedCancellationReasons.has(raw) ? raw : 'OTHER';
}

function groupCountRows<T extends string | number>(
  rows: SeedRow[],
  keyFor: (row: SeedRow) => T | null,
): Map<T, number> {
  const counts = new Map<T, number>();
  for (const row of rows) {
    const key = keyFor(row);
    if (key == null) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function sumMoney(rows: SeedRow[], field = 'totalMinor'): number {
  return round(rows.reduce((sum, row) => sum + moneyFromMinor(row[field]), 0));
}

function activeParticipantsForBookings(
  participants: SeedRow[],
  bookingIds: Set<string>,
): SeedRow[] {
  return participants.filter((row) => {
    const bookingId = asString(row.bookingId);
    return Boolean(bookingId && bookingIds.has(bookingId) && !asString(row.deletedAt));
  });
}

function uniqueAthletes(participants: SeedRow[]): Set<string> {
  return new Set(
    participants
      .map((row) => asString(row.athleteId))
      .filter((athleteId): athleteId is string => Boolean(athleteId)),
  );
}

function average(values: number[]): number {
  return values.length > 0 ? round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function trend(change: number): 'UP' | 'DOWN' | 'STABLE' {
  if (change > 0) return 'UP';
  if (change < 0) return 'DOWN';
  return 'STABLE';
}

function percentChange(current: number, previous: number): number {
  if (previous > 0) {
    return round(((current - previous) / previous) * 100);
  }
  return current > 0 ? 100 : 0;
}

function buildRevenueChart(invoices: SeedRow[]): CoachAnalyticsPayload['revenueChart'] {
  const buckets = new Map<string, { amount: number; sessionCount: number }>();
  for (const invoice of invoices) {
    const date = invoicePaidDate(invoice);
    if (!date) {
      continue;
    }
    const key = isoDate(date);
    const existing = buckets.get(key) ?? { amount: 0, sessionCount: 0 };
    existing.amount = round(existing.amount + moneyFromMinor(invoice.totalMinor));
    existing.sessionCount += 1;
    buckets.set(key, existing);
  }
  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      amount: value.amount,
      sessionCount: value.sessionCount,
    }));
}

function buildPeakHours(bookings: SeedRow[]): {
  peakHours: CoachAnalyticsPayload['peakHours'];
  busiestDay: CoachAnalyticsPayload['busiestDay'];
  busiestHour: CoachAnalyticsPayload['busiestHour'];
} {
  const dayHourCounts = new Map<string, number>();
  const dayCounts = new Map<number, number>();
  const hourCounts = new Map<number, number>();
  for (const booking of bookings) {
    const date = bookingDate(booking);
    if (!date) continue;
    const dayOfWeek = date.getUTCDay();
    const hour = date.getUTCHours();
    const key = `${dayOfWeek}:${hour}`;
    dayHourCounts.set(key, (dayHourCounts.get(key) ?? 0) + 1);
    dayCounts.set(dayOfWeek, (dayCounts.get(dayOfWeek) ?? 0) + 1);
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  const maxSlotCount = Math.max(1, ...dayHourCounts.values());
  const peakHours = [...dayHourCounts.entries()]
    .map(([key, sessionCount]) => {
      const [dayOfWeekRaw, hourRaw] = key.split(':');
      const dayOfWeek = Number(dayOfWeekRaw);
      const hour = Number(hourRaw);
      return {
        dayOfWeek,
        dayName: DAY_NAMES[dayOfWeek] ?? 'Unknown',
        hour,
        sessionCount,
        intensity: round(sessionCount / maxSlotCount),
      };
    })
    .sort((left, right) => left.dayOfWeek - right.dayOfWeek || left.hour - right.hour);
  const [busiestDayValue, busiestDayCount = 0] =
    [...dayCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [6, 0];
  const [busiestHourValue, busiestHourCount = 0] =
    [...hourCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? [17, 0];
  return {
    peakHours,
    busiestDay: {
      dayOfWeek: busiestDayValue,
      dayName: DAY_NAMES[busiestDayValue] ?? 'Saturday',
      sessionCount: busiestDayCount,
    },
    busiestHour: {
      hour: busiestHourValue,
      sessionCount: busiestHourCount,
    },
  };
}

function buildAnalyticsFromTables(params: {
  tables: SeedTables;
  version: string | null;
  coachUserId: string;
  period: CoachAnalyticsPeriod;
}): CoachAnalyticsResult {
  const coach = asRows(params.tables.coachProfiles).find(
    (row) => asString(row.userId) === params.coachUserId && !asString(row.deletedAt),
  );
  if (!coach) {
    throw notFound('Coach profile not found');
  }
  const coachUser = asRows(params.tables.users).find(
    (row) => asString(row.id) === params.coachUserId && !asString(row.deletedAt),
  );
  const now = new Date();
  const { currentStart, previousStart, previousEnd } = periodBounds(params.period, now);
  const dateRange = {
    startDate: currentStart.toISOString(),
    endDate: now.toISOString(),
  };

  const allBookings = asRows(params.tables.bookings).filter(
    (row) => asString(row.coachUserId) === params.coachUserId && !asString(row.deletedAt),
  );
  const completedBookings = allBookings.filter((row) => statusOf(row) === 'COMPLETED');
  const currentCompletedBookings = completedBookings.filter((row) =>
    dateInRange(bookingDate(row), currentStart, now),
  );
  const previousCompletedBookings = completedBookings.filter((row) =>
    dateInRange(bookingDate(row), previousStart, previousEnd),
  );
  const cancelledBookings = allBookings.filter((row) => statusOf(row) === 'CANCELLED');
  const currentCancelledBookings = cancelledBookings.filter((row) =>
    dateInRange(cancellationDate(row), currentStart, now),
  );

  const paidInvoices = asRows(params.tables.invoices).filter(
    (row) =>
      asString(row.coachUserId) === params.coachUserId &&
      !asString(row.deletedAt) &&
      statusOf(row) === 'PAID',
  );
  const currentPaidInvoices = paidInvoices.filter((row) =>
    dateInRange(invoicePaidDate(row), currentStart, now),
  );
  const previousPaidInvoices = paidInvoices.filter((row) =>
    dateInRange(invoicePaidDate(row), previousStart, previousEnd),
  );
  const currentRevenue = sumMoney(currentPaidInvoices);
  const previousRevenue = sumMoney(previousPaidInvoices);
  const revenueChange = round(currentRevenue - previousRevenue);

  const participants = asRows(params.tables.bookingParticipants);
  const currentBookingIds = new Set(
    currentCompletedBookings
      .map((row) => asString(row.id))
      .filter((bookingId): bookingId is string => Boolean(bookingId)),
  );
  const previousBookingIds = new Set(
    previousCompletedBookings
      .map((row) => asString(row.id))
      .filter((bookingId): bookingId is string => Boolean(bookingId)),
  );
  const activeAthletes = uniqueAthletes(activeParticipantsForBookings(participants, currentBookingIds));
  const previousAthletes = uniqueAthletes(activeParticipantsForBookings(participants, previousBookingIds));
  const lifetimeBeforePeriodIds = new Set(
    completedBookings
      .filter((row) => {
        const date = bookingDate(row);
        return Boolean(date && date.getTime() < currentStart.getTime());
      })
      .map((row) => asString(row.id))
      .filter((bookingId): bookingId is string => Boolean(bookingId)),
  );
  const lifetimeBeforeAthletes = uniqueAthletes(
    activeParticipantsForBookings(participants, lifetimeBeforePeriodIds),
  );
  const newClients = [...activeAthletes].filter((athleteId) => !lifetimeBeforeAthletes.has(athleteId)).length;
  const clientsLost = [...previousAthletes].filter((athleteId) => !activeAthletes.has(athleteId)).length;
  const returningClients = Math.max(0, activeAthletes.size - newClients);

  const revenueByType = new Map<string, number>();
  for (const invoice of currentPaidInvoices) {
    const key = serviceTypeOf(invoice);
    revenueByType.set(key, round((revenueByType.get(key) ?? 0) + moneyFromMinor(invoice.totalMinor)));
  }
  const sessionTypeCounts = groupCountRows(currentCompletedBookings, (row) => serviceTypeOf(row));
  const bySessionType = [...sessionTypeCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([type, count]) => ({
      type,
      count,
      percentage: percentage(count, currentCompletedBookings.length),
      revenue: revenueByType.get(type) ?? 0,
    }));

  const currentFeedback = asRows(params.tables.sessionFeedback).filter((row) => {
    const rating = asNumber(row.rating);
    const bookingId = asString(row.bookingId);
    return Boolean(
      rating != null &&
        bookingId &&
        currentBookingIds.has(bookingId) &&
        !asString(row.deletedAt) &&
        asString(row.visibility) === 'public',
    );
  });
  const previousFeedback = asRows(params.tables.sessionFeedback).filter((row) => {
    const rating = asNumber(row.rating);
    const bookingId = asString(row.bookingId);
    return Boolean(
      rating != null &&
        bookingId &&
        previousBookingIds.has(bookingId) &&
        !asString(row.deletedAt) &&
        asString(row.visibility) === 'public',
    );
  });
  const avgRating = average(currentFeedback.map((row) => asNumber(row.rating) ?? 0));
  const previousAvgRating = average(previousFeedback.map((row) => asNumber(row.rating) ?? 0));

  const skillDefinitionsById = new Map(
    asRows(params.tables.skillDefinitions).flatMap((row) => {
      const id = asString(row.id);
      return id ? [[id, row] as const] : [];
    }),
  );
  const invoiceByBookingId = new Map(
    currentPaidInvoices.flatMap((row) => {
      const bookingId = asString(row.bookingId);
      return bookingId ? [[bookingId, row] as const] : [];
    }),
  );
  const currentAssessments = asRows(params.tables.athleteSkillAssessments).filter((row) =>
    Boolean(
      asString(row.assessorUserId) === params.coachUserId &&
        dateInRange(parseDate(row.assessedAt ?? row.createdAt), currentStart, now),
    ),
  );
  const skillBuckets = new Map<string, { count: number; revenue: number }>();
  for (const assessment of currentAssessments) {
    const skillDefinition = skillDefinitionsById.get(asString(assessment.skillDefinitionId) ?? '');
    const skill = asString(assessment.skillName) ?? asString(skillDefinition?.name) ?? 'General';
    const bookingId = asString(assessment.bookingId);
    const existing = skillBuckets.get(skill) ?? { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue = round(existing.revenue + moneyFromMinor(bookingId ? invoiceByBookingId.get(bookingId)?.totalMinor : 0));
    skillBuckets.set(skill, existing);
  }
  const topSkills = [...skillBuckets.entries()]
    .sort((left, right) => right[1].count - left[1].count)
    .slice(0, 5)
    .map(([skill, bucket]) => ({
      skill,
      sessionCount: bucket.count,
      percentage: percentage(bucket.count, currentAssessments.length),
      revenue: bucket.revenue,
    }));

  const cancellationReasonCounts = groupCountRows(currentCancelledBookings, (row) =>
    normalizeCancellationReason(row.cancelReason),
  );
  const cancellationDayCounts = groupCountRows(currentCancelledBookings, (row) => {
    const date = cancellationDate(row);
    return date ? date.getUTCDay() : null;
  });
  const avgNoticeHours = average(
    currentCancelledBookings.flatMap((row) => {
      const cancelledAt = parseDate(row.cancelledAt);
      const scheduledAt = bookingDate(row);
      if (!cancelledAt || !scheduledAt) return [];
      return [Math.max(0, round((scheduledAt.getTime() - cancelledAt.getTime()) / 3600000))];
    }),
  );
  const revenueLost = round(
    currentCancelledBookings.reduce(
      (sum, row) => sum + moneyFromMinor(row.cancellationFeeMinor ?? row.priceMinor),
      0,
    ),
  );
  const { peakHours, busiestDay, busiestHour } = buildPeakHours(currentCompletedBookings);
  const totalSessions = currentCompletedBookings.length;
  const previousSessions = previousCompletedBookings.length;
  const weeksInPeriod = Math.max(
    1,
    Math.ceil((now.getTime() - currentStart.getTime()) / (7 * 24 * 3600000)),
  );

  return {
    analytics: {
      coachId: params.coachUserId,
      coachName: asString(coachUser?.name),
      period: params.period,
      dateRange,
      totalRevenue: currentRevenue,
      revenueChange,
      revenueChangePercent: percentChange(currentRevenue, previousRevenue),
      revenueTrend: trend(revenueChange),
      revenueChart: buildRevenueChart(currentPaidInvoices),
      avgRevenuePerSession: totalSessions > 0 ? round(currentRevenue / totalSessions) : 0,
      sessions: {
        totalSessions,
        sessionsChange: totalSessions - previousSessions,
        sessionsChangePercent: percentChange(totalSessions, previousSessions),
        avgSessionsPerWeek: round(totalSessions / weeksInPeriod),
        avgDuration: average(currentCompletedBookings.map((row) => asNumber(row.durationMinutes) ?? 0)),
        popularSessionType: bySessionType[0]?.type ?? 'N/A',
        bySessionType,
      },
      retention: {
        newClients,
        returningClients,
        churnRate: percentage(clientsLost, previousAthletes.size),
        retentionRate: previousAthletes.size > 0 ? percentage(returningClients, previousAthletes.size) : 100,
        avgSessionsPerClient: activeAthletes.size > 0 ? round(totalSessions / activeAthletes.size) : 0,
        totalActiveClients: activeAthletes.size,
        clientsLost,
      },
      cancellations: {
        totalCancellations: currentCancelledBookings.length,
        cancellationRate: percentage(currentCancelledBookings.length, totalSessions + currentCancelledBookings.length),
        byReason: [...cancellationReasonCounts.entries()]
          .sort((left, right) => right[1] - left[1])
          .map(([reason, count]) => ({
            reason: reason as CoachAnalyticsPayload['cancellations']['byReason'][number]['reason'],
            count,
            percentage: percentage(count, currentCancelledBookings.length),
          })),
        byDayOfWeek: [...cancellationDayCounts.entries()]
          .sort((left, right) => left[0] - right[0])
          .map(([dayOfWeek, count]) => ({
            dayOfWeek,
            dayName: DAY_NAMES[dayOfWeek] ?? 'Unknown',
            count,
            percentage: percentage(count, currentCancelledBookings.length),
          })),
        avgNoticeHours,
        revenueLost,
      },
      peakHours,
      busiestDay,
      busiestHour,
      topSkills,
      avgRating,
      ratingChange: round(avgRating - previousAvgRating),
      reviewCount: currentFeedback.length,
      computedAt: now.toISOString(),
    },
    dataVersion: params.version,
  };
}

class StoreCoachAnalyticsRepository implements CoachAnalyticsRepository {
  constructor(
    private readonly storeProvider: () => {
      version: string;
      tables: SeedTables;
    },
  ) {}

  async getAnalytics(coachUserId: string, period: CoachAnalyticsPeriod): Promise<CoachAnalyticsResult> {
    const store = this.storeProvider();
    return buildAnalyticsFromTables({
      tables: store.tables,
      version: store.version,
      coachUserId,
      period,
    });
  }
}

class DbCoachAnalyticsRepository implements CoachAnalyticsRepository {
  async getAnalytics(coachUserId: string, period: CoachAnalyticsPeriod): Promise<CoachAnalyticsResult> {
    if (shouldUseDbFixtureFallback()) {
      return dbFixtureRepository.getAnalytics(coachUserId, period);
    }
    const prisma = getPrismaClientOrThrow();
    const coach = await prisma.coachProfile.findFirst({
      where: {
        userId: coachUserId,
        deletedAt: null,
      },
    });
    if (!coach) {
      throw notFound('Coach profile not found');
    }
    const [user, bookings, invoices, feedbackRows, assessments] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: coachUserId,
          deletedAt: null,
        },
      }),
      prisma.booking.findMany({
        where: {
          coachUserId,
          deletedAt: null,
        },
        include: {
          participants: {
            where: {
              deletedAt: null,
            },
          },
        },
      }),
      prisma.invoice.findMany({
        where: {
          coachUserId,
          deletedAt: null,
        },
      }),
      prisma.sessionFeedback.findMany({
        where: {
          deletedAt: null,
          rating: {
            not: null,
          },
          booking: {
            coachUserId,
            deletedAt: null,
          },
        },
      }),
      prisma.athleteSkillAssessment.findMany({
        where: {
          assessorUserId: coachUserId,
        },
        include: {
          skillDefinition: true,
        },
      }),
    ]);
    const tables: SeedTables = {
      coachProfiles: [normalizeForJson(coach) as SeedRow],
      users: user ? [normalizeForJson(user) as SeedRow] : [],
      bookings: bookings.map((row) => normalizeForJson(row) as SeedRow),
      bookingParticipants: bookings.flatMap((booking) =>
        booking.participants.map((row) => normalizeForJson(row) as SeedRow),
      ),
      invoices: invoices.map((row) => normalizeForJson(row) as SeedRow),
      sessionFeedback: feedbackRows.map((row) => normalizeForJson(row) as SeedRow),
      athleteSkillAssessments: assessments.map((row) => ({
        ...(normalizeForJson(row) as SeedRow),
        skillName: row.skillDefinition.name,
      })),
      skillDefinitions: assessments.map((row) => normalizeForJson(row.skillDefinition) as SeedRow),
    };
    return buildAnalyticsFromTables({
      tables,
      version: null,
      coachUserId,
      period,
    });
  }
}

const seedRepository = new StoreCoachAnalyticsRepository(() => getMarketplaceSeedStore());
const dbFixtureRepository = new StoreCoachAnalyticsRepository(() => getDbFixtureStore());
const dbRepository = new DbCoachAnalyticsRepository();

export function resolveCoachAnalyticsRepository(): CoachAnalyticsRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
