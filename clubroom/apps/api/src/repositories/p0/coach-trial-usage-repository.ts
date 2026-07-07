import { randomUUID } from 'node:crypto';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import {
  getPrismaClientOrThrow,
  shouldUseDbFixtureFallback,
} from '../../lib/prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const trialUsageSource = 'coach-trial-usage';
const trialConversionSource = 'coach-trial-conversion';

const asRows = (value: unknown): SeedRow[] =>
  Array.isArray(value) ? (value as SeedRow[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asObject = (value: unknown): SeedRow =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : {};
const asIsoString = (value: unknown, fallback = new Date().toISOString()): string =>
  typeof value === 'string'
    ? value
    : value instanceof Date
      ? value.toISOString()
      : fallback;

export interface CoachTrialUsage {
  id: string;
  coachId: string;
  parentId: string;
  familyId?: string;
  bookingId: string;
  usedAt: string;
}

export interface CoachTrialConversion {
  id: string;
  coachId: string;
  parentId: string;
  trialBookingId: string;
  regularBookingId: string;
  convertedAt: string;
}

export interface RecordTrialUsageInput {
  actorUserId: string;
  bookingId: string;
  familyId?: string;
  parentId: string;
  requestId?: string;
}

export interface RecordTrialConversionInput {
  actorUserId: string;
  parentId: string;
  regularBookingId: string;
  requestId?: string;
  trialBookingId: string;
}

export interface CoachTrialUsageRepository {
  listUsages(
    coachUserId: string,
    filters?: { parentId?: string },
  ): Promise<CoachTrialUsage[]>;
  recordUsage(
    coachUserId: string,
    input: RecordTrialUsageInput,
  ): Promise<{ usage: CoachTrialUsage; replay: boolean }>;
  listConversions(
    coachUserId: string,
    filters?: { trialBookingId?: string },
  ): Promise<CoachTrialConversion[]>;
  recordConversion(
    coachUserId: string,
    input: RecordTrialConversionInput,
  ): Promise<{ conversion: CoachTrialConversion; replay: boolean }>;
}

function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

function isActive(row: SeedRow | undefined): row is SeedRow {
  return Boolean(row && !asString(row.deletedAt));
}

function bookingStatus(row: SeedRow): string {
  return asString(row.status)?.toUpperCase() ?? 'CONFIRMED';
}

function metadataSource(row: SeedRow): string | undefined {
  return asString(asObject(row.metadataJson).source);
}

function parentMatchesBooking(
  tables: SeedTables,
  booking: SeedRow,
  parentId: string,
): boolean {
  if (asString(booking.bookedByUserId) === parentId) {
    return true;
  }
  return asRows(tables.bookingParticipants).some(
    (participant) =>
      asString(participant.bookingId) === asString(booking.id) &&
      asString(participant.guardianUserId) === parentId &&
      !asString(participant.deletedAt),
  );
}

function resolveFamilyIdForBooking(
  tables: SeedTables,
  bookingId: string,
  parentId: string,
): string | undefined {
  const participantAthleteIds = asRows(tables.bookingParticipants)
    .filter(
      (participant) =>
        asString(participant.bookingId) === bookingId &&
        asString(participant.guardianUserId) === parentId &&
        !asString(participant.deletedAt),
    )
    .map((participant) => asString(participant.athleteId))
    .filter((athleteId): athleteId is string => Boolean(athleteId));
  return asRows(tables.guardianChildLinks)
    .map((link) => ({
      athleteId: asString(link.athleteId),
      familyId: asString(link.familyId),
      guardianUserId: asString(link.guardianUserId),
    }))
    .find(
      (link) =>
        link.guardianUserId === parentId &&
        Boolean(link.athleteId && participantAthleteIds.includes(link.athleteId)) &&
        Boolean(link.familyId),
    )?.familyId;
}

function findBookingOrThrow(
  tables: SeedTables,
  coachUserId: string,
  bookingId: string,
): SeedRow {
  const booking = asRows(tables.bookings).find((row) => asString(row.id) === bookingId);
  if (!isActive(booking) || asString(booking.coachUserId) !== coachUserId) {
    throw notFound('Booking proof not found');
  }
  return booking;
}

function assertBookingParent(
  tables: SeedTables,
  booking: SeedRow,
  parentId: string,
): void {
  if (!parentMatchesBooking(tables, booking, parentId)) {
    throw forbidden('Parent is not linked to the booking proof', {
      bookingId: asString(booking.id),
      parentId,
    });
  }
}

function mapUsage(event: SeedRow, booking?: SeedRow): CoachTrialUsage {
  const metadata = asObject(event.metadataJson);
  const bookingId = asString(metadata.bookingId) ?? asString(event.bookingId) ?? '';
  const familyId = asString(metadata.familyId);
  return {
    id: asString(event.id) ?? `trial_usage:${bookingId}`,
    coachId: asString(metadata.coachId) ?? asString(booking?.coachUserId) ?? '',
    parentId: asString(metadata.parentId) ?? asString(booking?.bookedByUserId) ?? '',
    ...(familyId ? { familyId } : {}),
    bookingId,
    usedAt: asIsoString(event.occurredAt),
  };
}

function mapConversion(event: SeedRow, booking?: SeedRow): CoachTrialConversion {
  const metadata = asObject(event.metadataJson);
  return {
    id: asString(event.id) ?? `trial_conversion:${asString(metadata.trialBookingId) ?? ''}`,
    coachId: asString(metadata.coachId) ?? asString(booking?.coachUserId) ?? '',
    parentId: asString(metadata.parentId) ?? asString(booking?.bookedByUserId) ?? '',
    trialBookingId: asString(metadata.trialBookingId) ?? '',
    regularBookingId: asString(metadata.regularBookingId) ?? asString(event.bookingId) ?? '',
    convertedAt: asIsoString(event.occurredAt),
  };
}

function usageEventsFor(tables: SeedTables): SeedRow[] {
  return asRows(tables.bookingStatusEvents).filter(
    (event) => metadataSource(event) === trialUsageSource,
  );
}

function conversionEventsFor(tables: SeedTables): SeedRow[] {
  return asRows(tables.bookingStatusEvents).filter(
    (event) => metadataSource(event) === trialConversionSource,
  );
}

class StoreCoachTrialUsageRepository implements CoachTrialUsageRepository {
  constructor(private readonly getTables: () => SeedTables) {}

  async listUsages(
    coachUserId: string,
    filters: { parentId?: string } = {},
  ): Promise<CoachTrialUsage[]> {
    const tables = this.getTables();
    return usageEventsFor(tables)
      .flatMap((event) => {
        const bookingId = asString(event.bookingId);
        const booking = asRows(tables.bookings).find((row) => asString(row.id) === bookingId);
        if (!isActive(booking) || asString(booking.coachUserId) !== coachUserId) {
          return [];
        }
        const usage = mapUsage(event, booking);
        if (filters.parentId && usage.parentId !== filters.parentId) {
          return [];
        }
        return [usage];
      })
      .sort((left, right) => right.usedAt.localeCompare(left.usedAt));
  }

  async recordUsage(
    coachUserId: string,
    input: RecordTrialUsageInput,
  ): Promise<{ usage: CoachTrialUsage; replay: boolean }> {
    const tables = this.getTables();
    const booking = findBookingOrThrow(tables, coachUserId, input.bookingId);
    assertBookingParent(tables, booking, input.parentId);
    const existing = usageEventsFor(tables).find((event) => {
      const metadata = asObject(event.metadataJson);
      return (
        asString(event.bookingId) === input.bookingId &&
        asString(metadata.parentId) === input.parentId
      );
    });
    if (existing) {
      return { usage: mapUsage(existing, booking), replay: true };
    }

    const now = new Date().toISOString();
    const familyId =
      input.familyId ?? resolveFamilyIdForBooking(tables, input.bookingId, input.parentId);
    const event: SeedRow = {
      id: `bse_${randomUUID()}`,
      bookingId: input.bookingId,
      fromStatus: bookingStatus(booking),
      toStatus: bookingStatus(booking),
      actorUserId: input.actorUserId,
      reason: 'TRIAL_USAGE_RECORDED',
      requestId: input.requestId ?? null,
      occurredAt: now,
      metadataJson: {
        source: trialUsageSource,
        bookingId: input.bookingId,
        coachId: coachUserId,
        parentId: input.parentId,
        familyId: familyId ?? null,
      },
    };
    ensureTable(tables, 'bookingStatusEvents').push(event);
    return { usage: mapUsage(event, booking), replay: false };
  }

  async listConversions(
    coachUserId: string,
    filters: { trialBookingId?: string } = {},
  ): Promise<CoachTrialConversion[]> {
    const tables = this.getTables();
    return conversionEventsFor(tables)
      .flatMap((event) => {
        const bookingId = asString(event.bookingId);
        const booking = asRows(tables.bookings).find((row) => asString(row.id) === bookingId);
        if (!isActive(booking) || asString(booking.coachUserId) !== coachUserId) {
          return [];
        }
        const conversion = mapConversion(event, booking);
        if (filters.trialBookingId && conversion.trialBookingId !== filters.trialBookingId) {
          return [];
        }
        return [conversion];
      })
      .sort((left, right) => right.convertedAt.localeCompare(left.convertedAt));
  }

  async recordConversion(
    coachUserId: string,
    input: RecordTrialConversionInput,
  ): Promise<{ conversion: CoachTrialConversion; replay: boolean }> {
    const tables = this.getTables();
    const trialBooking = findBookingOrThrow(tables, coachUserId, input.trialBookingId);
    const regularBooking = findBookingOrThrow(tables, coachUserId, input.regularBookingId);
    assertBookingParent(tables, trialBooking, input.parentId);
    assertBookingParent(tables, regularBooking, input.parentId);
    const hasUsage = usageEventsFor(tables).some((event) => {
      const metadata = asObject(event.metadataJson);
      return (
        asString(event.bookingId) === input.trialBookingId &&
        asString(metadata.parentId) === input.parentId
      );
    });
    if (!hasUsage) {
      throw forbidden('Trial booking must have a recorded usage before conversion', {
        trialBookingId: input.trialBookingId,
      });
    }

    const existing = conversionEventsFor(tables).find((event) => {
      const metadata = asObject(event.metadataJson);
      return (
        asString(metadata.trialBookingId) === input.trialBookingId &&
        asString(metadata.regularBookingId) === input.regularBookingId
      );
    });
    if (existing) {
      return { conversion: mapConversion(existing, regularBooking), replay: true };
    }

    const now = new Date().toISOString();
    const event: SeedRow = {
      id: `bse_${randomUUID()}`,
      bookingId: input.regularBookingId,
      fromStatus: bookingStatus(regularBooking),
      toStatus: bookingStatus(regularBooking),
      actorUserId: input.actorUserId,
      reason: 'TRIAL_CONVERSION_RECORDED',
      requestId: input.requestId ?? null,
      occurredAt: now,
      metadataJson: {
        source: trialConversionSource,
        coachId: coachUserId,
        parentId: input.parentId,
        trialBookingId: input.trialBookingId,
        regularBookingId: input.regularBookingId,
      },
    };
    ensureTable(tables, 'bookingStatusEvents').push(event);
    return { conversion: mapConversion(event, regularBooking), replay: false };
  }
}

class DbCoachTrialUsageRepository implements CoachTrialUsageRepository {
  private readonly fixture = new StoreCoachTrialUsageRepository(
    () => getDbFixtureStore().tables,
  );

  async listUsages(
    coachUserId: string,
    filters: { parentId?: string } = {},
  ): Promise<CoachTrialUsage[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listUsages(coachUserId, filters);
    }
    const prisma = getPrismaClientOrThrow();
    const metadataFilters = [
      {
        metadataJson: {
          path: ['source'],
          equals: trialUsageSource,
        },
      },
    ];
    if (filters.parentId) {
      metadataFilters.push({
        metadataJson: {
          path: ['parentId'],
          equals: filters.parentId,
        },
      });
    }
    const events = await prisma.bookingStatusEvent.findMany({
      where: {
        AND: metadataFilters,
        booking: {
          coachUserId,
          deletedAt: null,
        },
      },
      include: {
        booking: true,
      },
      orderBy: {
        occurredAt: 'desc',
      },
    });
    return events.flatMap((event) => {
      const booking = event.booking as unknown as SeedRow;
      if (!isActive(booking) || asString(booking.coachUserId) !== coachUserId) {
        return [];
      }
      const usage = mapUsage(event as unknown as SeedRow, booking);
      return [usage];
    });
  }

  async recordUsage(
    coachUserId: string,
    input: RecordTrialUsageInput,
  ): Promise<{ usage: CoachTrialUsage; replay: boolean }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.recordUsage(coachUserId, input);
    }
    const prisma = getPrismaClientOrThrow();
    const booking = await prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        coachUserId,
        deletedAt: null,
      },
      include: {
        participants: true,
      },
    });
    if (!booking) {
      throw notFound('Booking proof not found');
    }
    const bookingRow = booking as unknown as SeedRow;
    const participantRows = asRows(booking.participants as unknown);
    if (
      asString(bookingRow.bookedByUserId) !== input.parentId &&
      !participantRows.some(
        (participant) =>
          asString(participant.guardianUserId) === input.parentId &&
          !asString(participant.deletedAt),
      )
    ) {
      throw forbidden('Parent is not linked to the booking proof', {
        bookingId: input.bookingId,
        parentId: input.parentId,
      });
    }

    const existingEvents = await prisma.bookingStatusEvent.findMany({
      where: {
        bookingId: input.bookingId,
      },
      orderBy: {
        occurredAt: 'desc',
      },
    });
    const existing = existingEvents.find((event) => {
      const metadata = asObject(event.metadataJson);
      return (
        asString(metadata.source) === trialUsageSource &&
        asString(metadata.parentId) === input.parentId
      );
    });
    if (existing) {
      return {
        usage: mapUsage(existing as unknown as SeedRow, bookingRow),
        replay: true,
      };
    }

    const participantAthleteIds = participantRows
      .filter((participant) => !asString(participant.deletedAt))
      .map((participant) => asString(participant.athleteId))
      .filter((athleteId): athleteId is string => Boolean(athleteId));
    const familyLink = await prisma.guardianChildLink.findFirst({
      where: {
        guardianUserId: input.parentId,
        athleteId: { in: participantAthleteIds },
        deletedAt: null,
      },
      select: {
        familyId: true,
      },
    });
    const familyId = input.familyId ?? familyLink?.familyId ?? null;
    const metadata = {
      source: trialUsageSource,
      bookingId: input.bookingId,
      coachId: coachUserId,
      parentId: input.parentId,
      familyId,
    };
    const event = await prisma.bookingStatusEvent.create({
      data: {
        id: `bse_${randomUUID()}`,
        bookingId: input.bookingId,
        fromStatus: booking.status,
        toStatus: booking.status,
        actorUserId: input.actorUserId,
        reason: 'TRIAL_USAGE_RECORDED',
        requestId: input.requestId ?? null,
        metadataJson: metadata as never,
      },
    });
    return {
      usage: mapUsage(event as unknown as SeedRow, bookingRow),
      replay: false,
    };
  }

  async listConversions(
    coachUserId: string,
    filters: { trialBookingId?: string } = {},
  ): Promise<CoachTrialConversion[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.listConversions(coachUserId, filters);
    }
    const prisma = getPrismaClientOrThrow();
    const metadataFilters = [
      {
        metadataJson: {
          path: ['source'],
          equals: trialConversionSource,
        },
      },
    ];
    if (filters.trialBookingId) {
      metadataFilters.push({
        metadataJson: {
          path: ['trialBookingId'],
          equals: filters.trialBookingId,
        },
      });
    }
    const events = await prisma.bookingStatusEvent.findMany({
      where: {
        AND: metadataFilters,
        booking: {
          coachUserId,
          deletedAt: null,
        },
      },
      include: {
        booking: true,
      },
      orderBy: {
        occurredAt: 'desc',
      },
    });
    return events.flatMap((event) => {
      const booking = event.booking as unknown as SeedRow;
      if (!isActive(booking) || asString(booking.coachUserId) !== coachUserId) {
        return [];
      }
      const conversion = mapConversion(event as unknown as SeedRow, booking);
      return [conversion];
    });
  }

  async recordConversion(
    coachUserId: string,
    input: RecordTrialConversionInput,
  ): Promise<{ conversion: CoachTrialConversion; replay: boolean }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fixture.recordConversion(coachUserId, input);
    }
    const prisma = getPrismaClientOrThrow();
    const [trialBooking, regularBooking] = await Promise.all([
      prisma.booking.findFirst({
        where: {
          id: input.trialBookingId,
          coachUserId,
          deletedAt: null,
        },
        include: {
          participants: true,
        },
      }),
      prisma.booking.findFirst({
        where: {
          id: input.regularBookingId,
          coachUserId,
          deletedAt: null,
        },
        include: {
          participants: true,
        },
      }),
    ]);
    if (!trialBooking || !regularBooking) {
      throw notFound('Booking proof not found');
    }
    for (const booking of [trialBooking, regularBooking]) {
      const bookingRow = booking as unknown as SeedRow;
      const participants = asRows(booking.participants as unknown);
      if (
        asString(bookingRow.bookedByUserId) !== input.parentId &&
        !participants.some(
          (participant) =>
            asString(participant.guardianUserId) === input.parentId &&
            !asString(participant.deletedAt),
        )
      ) {
        throw forbidden('Parent is not linked to the booking proof', {
          bookingId: asString(bookingRow.id),
          parentId: input.parentId,
        });
      }
    }

    const trialEvents = await prisma.bookingStatusEvent.findMany({
      where: {
        bookingId: input.trialBookingId,
      },
    });
    const hasUsage = trialEvents.some((event) => {
      const metadata = asObject(event.metadataJson);
      return (
        asString(metadata.source) === trialUsageSource &&
        asString(metadata.parentId) === input.parentId
      );
    });
    if (!hasUsage) {
      throw forbidden('Trial booking must have a recorded usage before conversion', {
        trialBookingId: input.trialBookingId,
      });
    }

    const conversionEvents = await prisma.bookingStatusEvent.findMany({
      where: {
        bookingId: input.regularBookingId,
      },
    });
    const existing = conversionEvents.find((event) => {
      const metadata = asObject(event.metadataJson);
      return (
        asString(metadata.source) === trialConversionSource &&
        asString(metadata.trialBookingId) === input.trialBookingId &&
        asString(metadata.regularBookingId) === input.regularBookingId
      );
    });
    const regularBookingRow = regularBooking as unknown as SeedRow;
    if (existing) {
      return {
        conversion: mapConversion(existing as unknown as SeedRow, regularBookingRow),
        replay: true,
      };
    }

    const metadata = {
      source: trialConversionSource,
      coachId: coachUserId,
      parentId: input.parentId,
      trialBookingId: input.trialBookingId,
      regularBookingId: input.regularBookingId,
    };
    const event = await prisma.bookingStatusEvent.create({
      data: {
        id: `bse_${randomUUID()}`,
        bookingId: input.regularBookingId,
        fromStatus: regularBooking.status,
        toStatus: regularBooking.status,
        actorUserId: input.actorUserId,
        reason: 'TRIAL_CONVERSION_RECORDED',
        requestId: input.requestId ?? null,
        metadataJson: metadata as never,
      },
    });
    return {
      conversion: mapConversion(event as unknown as SeedRow, regularBookingRow),
      replay: false,
    };
  }
}

const seedRepository = new StoreCoachTrialUsageRepository(
  () => getMarketplaceSeedStore().tables,
);
const dbRepository = new DbCoachTrialUsageRepository();

export function resolveCoachTrialUsageRepository(): CoachTrialUsageRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
