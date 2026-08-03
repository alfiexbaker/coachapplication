import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  ownerDashboardResponseSchema,
  parseOrganizationRole,
  type OwnerDashboardFinanceSummary,
  type OwnerDashboardSupportIssue,
} from '@clubroom/shared-contracts';
import { recordAuditEvent } from '../../lib/audit-runtime.js';
import { isPrivilegedAdminAuth } from '../../lib/authz.js';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { ApiProblemError, forbidden, isZodValidationError, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { resolveHeadCoachOversight } from './head-coach-oversight.js';
import { resolveStaffingConsole } from './staffing-console.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const paramsSchema = z.object({ clubId: z.string().min(1) }).strict();

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const OPEN_SUPPORT_STATUSES = new Set(['OPEN', 'IN_REVIEW', 'ESCALATED', 'open', 'in_review']);

function requireAuthUserId(authUserId: string | undefined): string {
  if (!authUserId) {
    throw forbidden('Authenticated user is required');
  }
  return authUserId;
}

function parseOwnerDashboardResponse(payload: unknown) {
  const parsed = ownerDashboardResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiProblemError(500, 'INTERNAL_ERROR', 'Owner dashboard response invalid');
  }
  return parsed.data;
}

function readAuditResult(error: unknown): 'DENY' | 'ERROR' {
  return isZodValidationError(error) || (error instanceof ApiProblemError && error.status < 500)
    ? 'DENY'
    : 'ERROR';
}

async function recordOwnerDashboardAudit(params: {
  request: FastifyRequest;
  clubId: string;
  result: 'SUCCESS' | 'DENY' | 'ERROR';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await recordAuditEvent({
    request: params.request,
    action: 'club_owner_dashboard.read',
    resourceType: 'club',
    resourceId: params.clubId,
    subjectUserId: params.request.auth?.userId ?? null,
    result: params.result,
    sensitiveRead: true,
    metadata: params.metadata,
  });
}

function emptyFinanceSummary(): OwnerDashboardFinanceSummary {
  return {
    openTotal: 0,
    orgCreditOpen: 0,
    coachCollectedOpen: 0,
    collectedTotal: 0,
    writtenOffTotal: 0,
    overdueCount: 0,
    owedCount: 0,
    note: 'Finance summary is derived from backend invoices linked to club bookings. Provider payouts remain simulated.',
  };
}

function addInvoiceToFinance(
  summary: OwnerDashboardFinanceSummary,
  invoice: {
    status: string;
    totalMinor: number;
    dueDate?: string | null;
  },
): void {
  const status = invoice.status.toUpperCase();
  const amount = invoice.totalMinor / 100;
  if (status === 'PAID') {
    summary.collectedTotal += amount;
    return;
  }
  if (status === 'WRITTEN_OFF') {
    summary.writtenOffTotal += amount;
    return;
  }
  if (status === 'VOID') {
    return;
  }
  summary.openTotal += amount;
  summary.orgCreditOpen += amount;
  summary.owedCount += 1;
  if (invoice.dueDate && new Date(invoice.dueDate).getTime() < Date.now()) {
    summary.overdueCount += 1;
  }
}

function buildSeedFinanceSummary(tables: SeedTables, clubId: string): OwnerDashboardFinanceSummary {
  const clubBookingIds = new Set<string>();
  for (const booking of asRows(tables.bookings)) {
    const bookingId = asString(booking.id);
    if (
      bookingId &&
      asString(booking.clubId) === clubId &&
      !asString(booking.deletedAt)
    ) {
      clubBookingIds.add(bookingId);
    }
  }
  const summary = emptyFinanceSummary();
  for (const invoice of asRows(tables.invoices)) {
    const bookingId = asString(invoice.bookingId);
    if (!bookingId || !clubBookingIds.has(bookingId) || asString(invoice.deletedAt)) {
      continue;
    }
    addInvoiceToFinance(summary, {
      status: asString(invoice.status) ?? 'DRAFT',
      totalMinor: asNumber(invoice.totalMinor) ?? 0,
      dueDate: asString(invoice.dueDate) ?? null,
    });
  }
  return summary;
}

async function buildDbFinanceSummary(clubId: string): Promise<OwnerDashboardFinanceSummary> {
  const prisma = getPrismaClientOrThrow();
  const invoices = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      booking: {
        clubId,
        deletedAt: null,
      },
    },
    select: {
      status: true,
      totalMinor: true,
      dueDate: true,
    },
  });
  const summary = emptyFinanceSummary();
  for (const invoice of invoices) {
    addInvoiceToFinance(summary, {
      status: String(invoice.status),
      totalMinor: invoice.totalMinor,
      dueDate: invoice.dueDate?.toISOString() ?? null,
    });
  }
  return summary;
}

async function buildFinanceSummary(clubId: string): Promise<OwnerDashboardFinanceSummary> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    return buildDbFinanceSummary(clubId);
  }
  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  return buildSeedFinanceSummary(store.tables as SeedTables, clubId);
}

function supportIssueStatusFromIncident(status: string): OwnerDashboardSupportIssue['status'] {
  const normalized = status.toUpperCase();
  if (normalized === 'OPEN') {
    return 'pending';
  }
  if (OPEN_SUPPORT_STATUSES.has(normalized)) {
    return 'reviewed';
  }
  return 'resolved';
}

function readableIncidentDetails(incident: { details?: string | null; summary: string }): string {
  if (incident.details && !incident.details.startsWith('enc_')) {
    return incident.details;
  }
  return incident.summary;
}

function combineNames(names: string[]): string {
  const filtered = names.filter(Boolean);
  if (filtered.length === 0) {
    return 'Athlete';
  }
  const first = filtered[0] ?? 'Athlete';
  if (filtered.length === 1) {
    return first;
  }
  return `${first} + ${filtered.length - 1} more`;
}

function buildSeedSupportIssues(
  tables: SeedTables,
  clubId: string,
  supportLabel: string,
): OwnerDashboardSupportIssue[] {
  const clubBookings = asRows(tables.bookings).filter(
    (row) => asString(row.clubId) === clubId && !asString(row.deletedAt),
  );
  const bookingsById = new Map<string, SeedRow>();
  for (const booking of clubBookings) {
    const bookingId = asString(booking.id);
    if (bookingId) {
      bookingsById.set(bookingId, booking);
    }
  }
  const athletesById = new Map(
    asRows(tables.athletes).map((row) => [
      asString(row.id) ?? '',
      asString(row.displayName) ?? 'Athlete',
    ]),
  );
  const usersById = new Map(
    asRows(tables.users).map((row) => [
      asString(row.id) ?? '',
      asString(row.name) ?? asString(row.fullName) ?? asString(row.email) ?? 'Coach',
    ]),
  );
  const participantNamesByBookingId = new Map<string, string[]>();
  for (const participant of asRows(tables.bookingParticipants)) {
    if (asString(participant.deletedAt)) {
      continue;
    }
    const bookingId = asString(participant.bookingId);
    const athleteId = asString(participant.athleteId);
    if (!bookingId || !athleteId) {
      continue;
    }
    const names = participantNamesByBookingId.get(bookingId) ?? [];
    names.push(athletesById.get(athleteId) ?? 'Athlete');
    participantNamesByBookingId.set(bookingId, names);
  }

  return asRows(tables.safeguardingIncidents)
    .flatMap((incident): OwnerDashboardSupportIssue[] => {
      const bookingId = asString(incident.bookingId);
      const booking = bookingId ? bookingsById.get(bookingId) : undefined;
      const rawStatus = asString(incident.status) ?? 'OPEN';
      if (
        !bookingId ||
        !booking ||
        !OPEN_SUPPORT_STATUSES.has(rawStatus) ||
        asString(incident.deletedAt)
      ) {
        return [];
      }
      const coachUserId = asString(booking.coachUserId) ?? '';
      const summary = asString(incident.summary) ?? 'Support issue reported';
      return [
        {
          id: asString(incident.id) ?? bookingId,
          bookingId,
          status: supportIssueStatusFromIncident(rawStatus),
          category: asString(incident.category) ?? 'other',
          description: readableIncidentDetails({
            details: asString(incident.details) ?? asString(incident.detailsEncrypted) ?? null,
            summary,
          }),
          createdAt: asString(incident.createdAt) ?? new Date(0).toISOString(),
          scheduledAt: asString(booking.scheduledAt),
          sessionTitle: asString(booking.service) ?? asString(booking.serviceType) ?? 'Session',
          athleteLabel: combineNames(participantNamesByBookingId.get(bookingId) ?? []),
          supportLabel,
          deliveredByLabel: (usersById.get(coachUserId) ?? coachUserId) || 'Coach',
        },
      ];
    })
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

async function buildDbSupportIssues(
  clubId: string,
  supportLabel: string,
): Promise<OwnerDashboardSupportIssue[]> {
  const prisma = getPrismaClientOrThrow();
  const bookings = await prisma.booking.findMany({
    where: {
      clubId,
      deletedAt: null,
    },
    select: {
      id: true,
      coachUserId: true,
      scheduledAt: true,
      serviceType: true,
    },
  });
  const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));
  const bookingIds = bookings.map((booking) => booking.id);
  if (bookingIds.length === 0) {
    return [];
  }

  const incidents = await prisma.safeguardingIncident.findMany({
    where: {
      deletedAt: null,
      bookingId: { in: bookingIds },
      status: { in: ['OPEN', 'IN_REVIEW', 'ESCALATED'] },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  if (incidents.length === 0) {
    return [];
  }

  const participants = await prisma.bookingParticipant.findMany({
    where: {
      bookingId: { in: bookingIds },
      deletedAt: null,
    },
    select: {
      bookingId: true,
      athlete: {
        select: {
          displayName: true,
        },
      },
    },
  });
  const participantNamesByBookingId = new Map<string, string[]>();
  for (const participant of participants) {
    const names = participantNamesByBookingId.get(participant.bookingId) ?? [];
    names.push(participant.athlete.displayName);
    participantNamesByBookingId.set(participant.bookingId, names);
  }

  const coachIds = [...new Set(bookings.map((booking) => booking.coachUserId))];
  const users = await prisma.user.findMany({
    where: {
      id: { in: coachIds },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  const usersById = new Map(users.map((user) => [user.id, user.name || user.email || user.id]));

  return incidents.flatMap((incident): OwnerDashboardSupportIssue[] => {
    const bookingId = incident.bookingId ?? '';
    const booking = bookingsById.get(bookingId);
    if (!booking) {
      return [];
    }
    return [
      {
        id: incident.id,
        bookingId,
        status: supportIssueStatusFromIncident(String(incident.status)),
        category: incident.category,
        description: readableIncidentDetails({
          details: incident.detailsEncrypted,
          summary: incident.summary,
        }),
        createdAt: incident.createdAt.toISOString(),
        scheduledAt: booking.scheduledAt.toISOString(),
        sessionTitle: booking.serviceType ?? 'Session',
        athleteLabel: combineNames(participantNamesByBookingId.get(bookingId) ?? []),
        supportLabel,
        deliveredByLabel: usersById.get(booking.coachUserId) ?? booking.coachUserId,
      },
    ];
  });
}

async function buildSupportIssues(
  clubId: string,
  supportLabel: string,
): Promise<OwnerDashboardSupportIssue[]> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    return buildDbSupportIssues(clubId, supportLabel);
  }
  const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
  return buildSeedSupportIssues(store.tables as SeedTables, clubId, supportLabel);
}

function assertOwnerDashboardRole(role: string, isPrivilegedAdmin: boolean, clubId: string): void {
  if (isPrivilegedAdmin) {
    return;
  }
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw forbidden('You do not have permission to view owner dashboard data', {
      clubId,
    });
  }
}

async function assertOwnerDashboardAccess(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}): Promise<void> {
  if (params.isPrivilegedAdmin) {
    return;
  }

  let role: string | undefined;
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const club = await prisma.club.findFirst({
      where: { id: params.clubId, deletedAt: null },
      select: { id: true },
    });
    if (!club) {
      throw notFound('Club not found');
    }
    const membership = await prisma.clubMembership.findUnique({
      where: {
        clubId_userId: {
          clubId: params.clubId,
          userId: params.authUserId,
        },
      },
      select: { active: true, deletedAt: true, role: true },
    });
    role = membership?.active && !membership.deletedAt ? membership.role : undefined;
  } else {
    const store = getApiDataBackend() === 'db' ? getDbFixtureStore() : getMarketplaceSeedStore();
    const tables = store.tables as SeedTables;
    const club = asRows(tables.clubs).find(
      (candidate) => asString(candidate.id) === params.clubId && !asString(candidate.deletedAt),
    );
    if (!club) {
      throw notFound('Club not found');
    }
    const membership = asRows(tables.clubMemberships).find(
      (candidate) =>
        asString(candidate.clubId) === params.clubId &&
        asString(candidate.userId) === params.authUserId &&
        candidate.active !== false &&
        !asString(candidate.deletedAt),
    );
    role = asString(membership?.role);
  }

  assertOwnerDashboardRole(parseOrganizationRole(role) ?? '', false, params.clubId);
}

async function resolveOwnerDashboard(params: {
  clubId: string;
  authUserId: string;
  isPrivilegedAdmin: boolean;
}) {
  await assertOwnerDashboardAccess(params);
  const [staffing, oversight, finance] = await Promise.all([
    resolveStaffingConsole({
      clubId: params.clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    }),
    resolveHeadCoachOversight({
      clubId: params.clubId,
      authUserId: params.authUserId,
      isPrivilegedAdmin: params.isPrivilegedAdmin,
    }),
    buildFinanceSummary(params.clubId),
  ]);
  const supportIssues = await buildSupportIssues(params.clubId, staffing.club.name);
  const liveBookingCount = [...staffing.assignedWork, ...staffing.unassignedWork].reduce(
    (sum, item) => sum + item.linkedBookingCount,
    0,
  );
  return {
    club: staffing.club,
    viewerMembership: staffing.viewerMembership,
    privilegedAdminAccess: staffing.privilegedAdminAccess,
    summary: {
      activeStaffCount: staffing.staff.length,
      activeOrgSessions: staffing.summary.activeOrgSessions,
      liveBookingCount,
      unassignedCount: staffing.summary.unassignedCount,
      awaitingCompletionCount: oversight.summary.awaitingCompletionCount,
      overdueCompletionCount: oversight.summary.overdueCompletionCount,
      watchAthleteCount: oversight.summary.watchAthleteCount,
      overdueFollowUpCount: oversight.summary.overdueFollowUpCount,
      supportIssueCount: supportIssues.length,
    },
    finance,
    unassignedWork: staffing.unassignedWork,
    coachHealth: oversight.coachHealth,
    completionQueue: oversight.completionQueue,
    supportIssues,
  };
}

export function registerClubOwnerDashboardRoutes(app: FastifyInstance): void {
  app.get('/clubs/:clubId/owner-dashboard', async (request, reply) => {
    const rawClubId = asString((request.params as { clubId?: unknown } | undefined)?.clubId) ?? '';
    try {
      const authUserId = requireAuthUserId(request.auth?.userId);
      const params = paramsSchema.parse(request.params ?? {});
      const data = await resolveOwnerDashboard({
        clubId: params.clubId,
        authUserId,
        isPrivilegedAdmin: isPrivilegedAdminAuth(request.auth),
      });
      const payload = parseOwnerDashboardResponse({
        ...data,
        clubId: params.clubId,
        requestId: request.requestId,
      });
      await recordOwnerDashboardAudit({
        request,
        clubId: params.clubId,
        result: 'SUCCESS',
        metadata: {
          activeStaffCount: payload.summary.activeStaffCount,
          awaitingCompletionCount: payload.summary.awaitingCompletionCount,
          openFinanceTotal: payload.finance.openTotal,
        },
      });
      return reply.send(payload);
    } catch (error) {
      await recordOwnerDashboardAudit({
        request,
        clubId: rawClubId,
        result: readAuditResult(error),
        metadata: {
          errorCode: error instanceof ApiProblemError ? error.code : 'INTERNAL_ERROR',
        },
      });
      throw error;
    }
  });
}
