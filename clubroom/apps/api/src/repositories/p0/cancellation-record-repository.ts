import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asObject = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;

export interface CancellationRecordResponse {
  id: string;
  bookingId: string;
  cancelledBy: 'coach' | 'parent';
  cancelledAt: string;
  reason: string;
  reasonCategory: string;
  note: string;
  refundAmount: number;
  refundPercentage: number;
  hoursBeforeSession: number;
  coachId: string;
  familyId?: string;
}

export interface ListCancellationRecordsParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  coachId?: string;
}

export interface GetCancellationRecordParams {
  authUserId: string;
  isPrivilegedAdmin: boolean;
  bookingId: string;
}

export interface CancellationRecordListResult {
  records: CancellationRecordResponse[];
  dataVersion: string | null;
}

export interface CancellationRecordRepository {
  listCancellationRecords(
    params: ListCancellationRecordsParams,
  ): Promise<CancellationRecordListResult>;
  getCancellationRecordByBooking(
    params: GetCancellationRecordParams,
  ): Promise<CancellationRecordResponse | null>;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function getSeedParticipantRowsByBooking(tables: SeedTables): Map<string, SeedRow[]> {
  const rowsByBooking = new Map<string, SeedRow[]>();
  for (const participant of asRows(tables.bookingParticipants)) {
    const bookingId = asString(participant.bookingId);
    if (!bookingId) continue;
    const existing = rowsByBooking.get(bookingId) ?? [];
    existing.push(participant);
    rowsByBooking.set(bookingId, existing);
  }
  return rowsByBooking;
}

function getSeedAthleteUserIdsByAthleteId(tables: SeedTables): Map<string, string | undefined> {
  return new Map(
    asRows(tables.athletes).flatMap((athlete) => {
      const athleteId = asString(athlete.id);
      return athleteId ? [[athleteId, asString(athlete.userId)] as const] : [];
    }),
  );
}

function canReadSeedBooking(params: {
  booking: SeedRow;
  authUserId: string;
  isPrivilegedAdmin: boolean;
  participantRowsByBooking: Map<string, SeedRow[]>;
  athleteUserIdsByAthleteId: Map<string, string | undefined>;
}): boolean {
  if (params.isPrivilegedAdmin) return true;
  if (
    asString(params.booking.coachUserId) === params.authUserId ||
    asString(params.booking.bookedByUserId) === params.authUserId
  ) {
    return true;
  }
  const bookingId = asString(params.booking.id) ?? '';
  const participants = params.participantRowsByBooking.get(bookingId) ?? [];
  return participants.some((participant) => {
    if (asString(participant.guardianUserId) === params.authUserId) return true;
    const athleteId = asString(participant.athleteId);
    return Boolean(
      athleteId && params.athleteUserIdsByAthleteId.get(athleteId) === params.authUserId,
    );
  });
}

function getSeedCancellationNote(tables: SeedTables, bookingId: string): string {
  const event = [...asRows(tables.bookingStatusEvents)]
    .filter(
      (row) => asString(row.bookingId) === bookingId && asString(row.toStatus) === 'CANCELLED',
    )
    .sort((left, right) =>
      (asString(right.occurredAt) ?? '').localeCompare(asString(left.occurredAt) ?? ''),
    )[0];
  const metadata = asObject(event?.metadataJson);
  return asString(metadata?.note) ?? '';
}

function getSeedFamilyId(tables: SeedTables, participantRows: SeedRow[]): string | undefined {
  for (const participant of participantRows) {
    const athleteId = asString(participant.athleteId);
    const guardianUserId = asString(participant.guardianUserId);
    const link = asRows(tables.guardianChildLinks).find(
      (row) =>
        asString(row.athleteId) === athleteId &&
        (!guardianUserId || asString(row.guardianUserId) === guardianUserId) &&
        !asString(row.deletedAt),
    );
    const familyId = asString(link?.familyId);
    if (familyId) return familyId;
  }
  return undefined;
}

function mapCancellationRecord(params: {
  bookingId: string;
  coachUserId: string;
  cancelledByUserId?: string | null;
  cancelledAt: string;
  scheduledAt: string;
  cancelReason?: string | null;
  cancellationFeeMinor?: number | null;
  priceMinor?: number | null;
  note?: string | null;
  familyId?: string;
}): CancellationRecordResponse {
  const priceMinor = Math.max(0, params.priceMinor ?? 0);
  const feeMinor = Math.max(0, params.cancellationFeeMinor ?? 0);
  const refundMinor = Math.max(0, priceMinor - feeMinor);
  const refundPercentage = priceMinor > 0 ? roundOne((refundMinor / priceMinor) * 100) : 0;
  const cancelledAtMs = new Date(params.cancelledAt).getTime();
  const scheduledAtMs = new Date(params.scheduledAt).getTime();
  const hoursBeforeSession =
    Number.isFinite(cancelledAtMs) && Number.isFinite(scheduledAtMs)
      ? Math.max(0, roundOne((scheduledAtMs - cancelledAtMs) / 3600000))
      : 0;
  const reason = params.cancelReason?.trim() || 'Booking cancelled';
  return {
    id: `cancel_${params.bookingId}`,
    bookingId: params.bookingId,
    cancelledBy: params.cancelledByUserId === params.coachUserId ? 'coach' : 'parent',
    cancelledAt: params.cancelledAt,
    reason,
    reasonCategory: reason,
    note: params.note ?? '',
    refundAmount: roundMoney(refundMinor / 100),
    refundPercentage,
    hoursBeforeSession,
    coachId: params.coachUserId,
    ...(params.familyId ? { familyId: params.familyId } : {}),
  };
}

function mapSeedCancellationRecord(
  tables: SeedTables,
  booking: SeedRow,
  participantRowsByBooking: Map<string, SeedRow[]>,
): CancellationRecordResponse | null {
  const bookingId = asString(booking.id);
  const coachUserId = asString(booking.coachUserId);
  const cancelledAt = asString(booking.cancelledAt);
  const scheduledAt = asString(booking.scheduledAt);
  if (!bookingId || !coachUserId || !cancelledAt || !scheduledAt) return null;
  const participants = participantRowsByBooking.get(bookingId) ?? [];
  return mapCancellationRecord({
    bookingId,
    coachUserId,
    cancelledByUserId: asString(booking.cancelledByUserId) ?? null,
    cancelledAt,
    scheduledAt,
    cancelReason: asString(booking.cancelReason) ?? null,
    cancellationFeeMinor: asNumber(booking.cancellationFeeMinor) ?? null,
    priceMinor: asNumber(booking.priceMinor) ?? null,
    note: getSeedCancellationNote(tables, bookingId),
    familyId: getSeedFamilyId(tables, participants),
  });
}

function resolveSeedStore(): { tables: SeedTables; version: string } | null {
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

class DefaultCancellationRecordRepository implements CancellationRecordRepository {
  async listCancellationRecords(
    params: ListCancellationRecordsParams,
  ): Promise<CancellationRecordListResult> {
    const seedStore = resolveSeedStore();
    if (seedStore) {
      const participantRowsByBooking = getSeedParticipantRowsByBooking(seedStore.tables);
      const athleteUserIdsByAthleteId = getSeedAthleteUserIdsByAthleteId(seedStore.tables);
      const records = asRows(seedStore.tables.bookings)
        .filter((booking) => asString(booking.status)?.toUpperCase() === 'CANCELLED')
        .filter((booking) => !asString(booking.deletedAt))
        .filter((booking) => !params.coachId || asString(booking.coachUserId) === params.coachId)
        .filter((booking) =>
          canReadSeedBooking({
            booking,
            authUserId: params.authUserId,
            isPrivilegedAdmin: params.isPrivilegedAdmin,
            participantRowsByBooking,
            athleteUserIdsByAthleteId,
          }),
        )
        .flatMap((booking) => {
          const record = mapSeedCancellationRecord(
            seedStore.tables,
            booking,
            participantRowsByBooking,
          );
          return record ? [record] : [];
        })
        .sort((left, right) => right.cancelledAt.localeCompare(left.cancelledAt));
      return { records, dataVersion: seedStore.version };
    }

    const prisma = getPrismaClientOrThrow();
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CANCELLED',
        deletedAt: null,
        ...(params.coachId ? { coachUserId: params.coachId } : {}),
        ...(params.isPrivilegedAdmin
          ? {}
          : {
              OR: [
                { coachUserId: params.authUserId },
                { bookedByUserId: params.authUserId },
                {
                  participants: {
                    some: {
                      guardianUserId: params.authUserId,
                    },
                  },
                },
                {
                  participants: {
                    some: {
                      athlete: {
                        userId: params.authUserId,
                      },
                    },
                  },
                },
              ],
            }),
      },
      include: {
        participants: {
          include: {
            athlete: {
              select: {
                userId: true,
                guardianLinks: {
                  select: {
                    familyId: true,
                    guardianUserId: true,
                    deletedAt: true,
                  },
                },
              },
            },
          },
        },
        statusEvents: {
          where: {
            toStatus: 'CANCELLED',
          },
          orderBy: {
            occurredAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: [{ cancelledAt: 'desc' }, { updatedAt: 'desc' }],
    });

    const records = bookings.flatMap((booking) => {
      if (!booking.cancelledAt) return [];
      const firstFamilyId = booking.participants.flatMap((participant) => {
        const link = participant.athlete.guardianLinks.find(
          (item) =>
            !item.deletedAt &&
            (!participant.guardianUserId || item.guardianUserId === participant.guardianUserId),
        );
        return link?.familyId ? [link.familyId] : [];
      })[0];
      const metadata = asObject(booking.statusEvents[0]?.metadataJson);
      return [
        mapCancellationRecord({
          bookingId: booking.id,
          coachUserId: booking.coachUserId,
          cancelledByUserId: booking.cancelledByUserId,
          cancelledAt: booking.cancelledAt.toISOString(),
          scheduledAt: booking.scheduledAt.toISOString(),
          cancelReason: booking.cancelReason,
          cancellationFeeMinor: booking.cancellationFeeMinor,
          priceMinor: booking.priceMinor,
          note: asString(metadata?.note) ?? '',
          familyId: firstFamilyId,
        }),
      ];
    });
    return {
      records: normalizeForJson(records) as CancellationRecordResponse[],
      dataVersion: null,
    };
  }

  async getCancellationRecordByBooking(
    params: GetCancellationRecordParams,
  ): Promise<CancellationRecordResponse | null> {
    const seedStore = resolveSeedStore();
    if (seedStore) {
      const booking = asRows(seedStore.tables.bookings).find(
        (row) => asString(row.id) === params.bookingId && !asString(row.deletedAt),
      );
      if (!booking) {
        throw notFound('Booking not found', { bookingId: params.bookingId });
      }
      const participantRowsByBooking = getSeedParticipantRowsByBooking(seedStore.tables);
      const canRead = canReadSeedBooking({
        booking,
        authUserId: params.authUserId,
        isPrivilegedAdmin: params.isPrivilegedAdmin,
        participantRowsByBooking,
        athleteUserIdsByAthleteId: getSeedAthleteUserIdsByAthleteId(seedStore.tables),
      });
      if (!canRead) {
        throw forbidden('Booking does not belong to authenticated user');
      }
      if (asString(booking.status)?.toUpperCase() !== 'CANCELLED') {
        return null;
      }
      return mapSeedCancellationRecord(seedStore.tables, booking, participantRowsByBooking);
    }

    const prisma = getPrismaClientOrThrow();
    const booking = await prisma.booking.findUnique({
      where: {
        id: params.bookingId,
      },
      include: {
        participants: {
          include: {
            athlete: {
              select: {
                userId: true,
                guardianLinks: {
                  select: {
                    familyId: true,
                    guardianUserId: true,
                    deletedAt: true,
                  },
                },
              },
            },
          },
        },
        statusEvents: {
          where: {
            toStatus: 'CANCELLED',
          },
          orderBy: {
            occurredAt: 'desc',
          },
          take: 1,
        },
      },
    });
    if (!booking || booking.deletedAt) {
      throw notFound('Booking not found', { bookingId: params.bookingId });
    }
    const canRead =
      params.isPrivilegedAdmin ||
      booking.coachUserId === params.authUserId ||
      booking.bookedByUserId === params.authUserId ||
      booking.participants.some(
        (participant) =>
          participant.guardianUserId === params.authUserId ||
          participant.athlete.userId === params.authUserId,
      );
    if (!canRead) {
      throw forbidden('Booking does not belong to authenticated user');
    }
    if (booking.status !== 'CANCELLED' || !booking.cancelledAt) {
      return null;
    }
    const firstFamilyId = booking.participants.flatMap((participant) => {
      const link = participant.athlete.guardianLinks.find(
        (item) =>
          !item.deletedAt &&
          (!participant.guardianUserId || item.guardianUserId === participant.guardianUserId),
      );
      return link?.familyId ? [link.familyId] : [];
    })[0];
    const metadata = asObject(booking.statusEvents[0]?.metadataJson);
    return normalizeForJson(
      mapCancellationRecord({
        bookingId: booking.id,
        coachUserId: booking.coachUserId,
        cancelledByUserId: booking.cancelledByUserId,
        cancelledAt: booking.cancelledAt.toISOString(),
        scheduledAt: booking.scheduledAt.toISOString(),
        cancelReason: booking.cancelReason,
        cancellationFeeMinor: booking.cancellationFeeMinor,
        priceMinor: booking.priceMinor,
        note: asString(metadata?.note) ?? '',
        familyId: firstFamilyId,
      }),
    ) as CancellationRecordResponse;
  }
}

export const cancellationRecordRepository = new DefaultCancellationRecordRepository();
