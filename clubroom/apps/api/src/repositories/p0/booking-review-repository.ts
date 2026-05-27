import crypto from 'node:crypto';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { badRequest, forbidden, notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

export interface BookingReviewInput {
  rating: number;
  comment?: string | null;
  categories?: Record<string, number>;
}

export interface BookingReviewResponse {
  id: string;
  bookingId: string;
  coachUserId: string;
  reviewerUserId: string;
  reviewerName: string | null;
  athleteId: string;
  athleteName: string | null;
  rating: number;
  comment: string | null;
  sessionType: string | null;
  categories: Record<string, number>;
  isVerifiedBooking: true;
  createdAt: string;
}

export interface BookingReviewListResult {
  reviews: BookingReviewResponse[];
  dataVersion: string | null;
}

export interface BookingReviewResult {
  review: BookingReviewResponse;
  reused: boolean;
  dataVersion: string | null;
}

export interface BookingReviewRepository {
  createBookingReview(params: {
    authUserId: string;
    bookingId: string;
    input: BookingReviewInput;
  }): Promise<BookingReviewResult>;
  listCoachReviews(params: { coachUserId: string }): Promise<BookingReviewListResult>;
}

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const asObject = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

function ensureRows(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return asRows(tables[key]);
}

function getAthleteUserIdsByAthleteId(tables: SeedTables): Map<string, string | undefined> {
  return new Map(
    asRows(tables.athletes)
      .map((row) => [asString(row.id), asString(row.userId)] as const)
      .filter(([id]) => Boolean(id))
      .map(([id, userId]) => [id as string, userId]),
  );
}

function displayNameForUser(user: SeedRow | undefined): string | null {
  const directName = asString(user?.displayName) ?? asString(user?.name);
  if (directName?.trim()) {
    return directName.trim();
  }

  const firstName = asString(user?.firstName);
  const lastName = asString(user?.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || null;
}

function displayNameForAthlete(athlete: SeedRow | undefined): string | null {
  const directName = asString(athlete?.displayName);
  if (directName?.trim()) {
    return directName.trim();
  }

  const firstName = asString(athlete?.firstName);
  const lastName = asString(athlete?.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || null;
}

function normalizeCategories(value: unknown): Record<string, number> {
  const source = asObject(value);
  if (!source) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(source)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
      .map(([key, rating]) => [key, Math.max(1, Math.min(5, Math.round(rating)))]),
  );
}

function canUserReviewBooking(params: {
  booking: SeedRow;
  participants: SeedRow[];
  athleteUserIdsByAthleteId: Map<string, string | undefined>;
  userId: string;
}): boolean {
  return (
    asString(params.booking.bookedByUserId) === params.userId ||
    params.participants.some((participant) => {
      if (asString(participant.guardianUserId) === params.userId) {
        return true;
      }
      const athleteId = asString(participant.athleteId);
      return Boolean(athleteId && params.athleteUserIdsByAthleteId.get(athleteId) === params.userId);
    })
  );
}

function isBookingReviewRow(row: SeedRow, bookingId: string, authUserId: string): boolean {
  if (
    asString(row.bookingId) !== bookingId ||
    asString(row.authorUserId) !== authUserId ||
    asString(row.deletedAt) != null
  ) {
    return false;
  }

  const metadata = asObject(row.metadataJson);
  if (metadata && asString(metadata.source) === 'booking-review') {
    return true;
  }

  return asNumber(row.rating) != null && asString(row.publicComment) != null;
}

function isPublicReviewRow(row: SeedRow): boolean {
  return (
    asString(row.deletedAt) == null &&
    asString(row.bookingId) != null &&
    asNumber(row.rating) != null &&
    asString(row.visibility) === 'public'
  );
}

function mapReviewRow(
  row: SeedRow,
  fallbackCoachUserId: string,
  context?: {
    reviewerName?: string | null;
    athleteName?: string | null;
    sessionType?: string | null;
  },
): BookingReviewResponse {
  const metadata = asObject(row.metadataJson);
  return {
    id: asString(row.id) ?? '',
    bookingId: asString(row.bookingId) ?? '',
    coachUserId: asString(row.coachUserId) ?? asString(metadata?.coachUserId) ?? fallbackCoachUserId,
    reviewerUserId: asString(row.authorUserId) ?? asString(metadata?.reviewerUserId) ?? '',
    reviewerName: context?.reviewerName ?? null,
    athleteId: asString(row.athleteId) ?? '',
    athleteName: context?.athleteName ?? null,
    rating: asNumber(row.rating) ?? 0,
    comment: asString(row.publicComment) ?? null,
    sessionType: context?.sessionType ?? null,
    categories: normalizeCategories(metadata?.categories),
    isVerifiedBooking: true,
    createdAt: asString(row.createdAt) ?? isoNow(),
  };
}

class StoreBookingReviewRepository implements BookingReviewRepository {
  constructor(private readonly storeProvider: () => { version: string; tables: SeedTables }) {}

  async createBookingReview(params: {
    authUserId: string;
    bookingId: string;
    input: BookingReviewInput;
  }): Promise<BookingReviewResult> {
    const store = this.storeProvider();
    const booking = asRows(store.tables.bookings).find(
      (row) => asString(row.id) === params.bookingId && asString(row.deletedAt) == null,
    );
    if (!booking) {
      throw notFound('Booking not found', { bookingId: params.bookingId });
    }

    const participants = asRows(store.tables.bookingParticipants).filter(
      (row) => asString(row.bookingId) === params.bookingId && asString(row.deletedAt) == null,
    );
    const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(store.tables);
    const canReview = canUserReviewBooking({
      booking,
      participants,
      athleteUserIdsByAthleteId,
      userId: params.authUserId,
    });
    if (!canReview) {
      throw forbidden('Only the booked family or athlete can review this booking', {
        bookingId: params.bookingId,
      });
    }

    if (asString(booking.status)?.toUpperCase() !== 'COMPLETED') {
      throw badRequest('Only completed bookings can be reviewed', {
        bookingId: params.bookingId,
        status: asString(booking.status),
      });
    }

    const feedbackRows = ensureRows(store.tables, 'sessionFeedback');
    const existing = feedbackRows.find((row) =>
      isBookingReviewRow(row, params.bookingId, params.authUserId),
    );
    const coachUserId = asString(booking.coachUserId) ?? '';
    if (existing) {
      return {
        review: mapReviewRow(existing, coachUserId),
        reused: true,
        dataVersion: store.version,
      };
    }

    const athleteId = asString(participants[0]?.athleteId);
    if (!athleteId) {
      throw badRequest('Booking has no reviewable athlete participant', { bookingId: params.bookingId });
    }

    const now = isoNow();
    const review: SeedRow = {
      id: newId('sfb'),
      bookingId: params.bookingId,
      athleteId,
      authorUserId: params.authUserId,
      coachUserId,
      rating: params.input.rating,
      publicComment: params.input.comment?.trim() || null,
      privateCommentEncrypted: null,
      visibility: 'public',
      metadataJson: {
        source: 'booking-review',
        coachUserId,
        reviewerUserId: params.authUserId,
        categories: params.input.categories ?? {},
      },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    feedbackRows.push(review);

    return {
      review: mapReviewRow(review, coachUserId),
      reused: false,
      dataVersion: store.version,
    };
  }

  async listCoachReviews(params: { coachUserId: string }): Promise<BookingReviewListResult> {
    const store = this.storeProvider();
    const completedCoachBookings = asRows(store.tables.bookings).filter(
      (row) =>
        asString(row.coachUserId) === params.coachUserId &&
        asString(row.deletedAt) == null &&
        asString(row.status)?.toUpperCase() === 'COMPLETED',
    );
    const bookingById = new Map(
      completedCoachBookings
        .map((booking) => [asString(booking.id), booking] as const)
        .filter((entry): entry is [string, SeedRow] => Boolean(entry[0])),
    );
    const participantsByBookingId = new Map<string, SeedRow[]>();
    for (const participant of asRows(store.tables.bookingParticipants)) {
      const bookingId = asString(participant.bookingId);
      if (!bookingId || asString(participant.deletedAt) != null) {
        continue;
      }
      const existing = participantsByBookingId.get(bookingId) ?? [];
      existing.push(participant);
      participantsByBookingId.set(bookingId, existing);
    }

    const athleteUserIdsByAthleteId = getAthleteUserIdsByAthleteId(store.tables);
    const usersById = new Map(
      asRows(store.tables.users)
        .map((user) => [asString(user.id), user] as const)
        .filter((entry): entry is [string, SeedRow] => Boolean(entry[0])),
    );
    const athletesById = new Map(
      asRows(store.tables.athletes)
        .map((athlete) => [asString(athlete.id), athlete] as const)
        .filter((entry): entry is [string, SeedRow] => Boolean(entry[0])),
    );

    const reviews = asRows(store.tables.sessionFeedback)
      .filter(isPublicReviewRow)
      .flatMap((row) => {
        const bookingId = asString(row.bookingId);
        const booking = bookingId ? bookingById.get(bookingId) : undefined;
        const authorUserId = asString(row.authorUserId);
        if (!booking || !authorUserId) {
          return [];
        }

        const participants = participantsByBookingId.get(bookingId as string) ?? [];
        if (
          !canUserReviewBooking({
            booking,
            participants,
            athleteUserIdsByAthleteId,
            userId: authorUserId,
          })
        ) {
          return [];
        }

        const athleteId = asString(row.athleteId);
        return [
          mapReviewRow(row, params.coachUserId, {
            reviewerName: displayNameForUser(usersById.get(authorUserId)),
            athleteName: athleteId ? displayNameForAthlete(athletesById.get(athleteId)) : null,
            sessionType: asString(booking.serviceType) ?? null,
          }),
        ];
      })
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

    return {
      reviews,
      dataVersion: store.version,
    };
  }
}

class PrismaBookingReviewRepository implements BookingReviewRepository {
  async createBookingReview(params: {
    authUserId: string;
    bookingId: string;
    input: BookingReviewInput;
  }): Promise<BookingReviewResult> {
    if (shouldUseDbFixtureFallback()) {
      return dbFixtureRepository.createBookingReview(params);
    }

    const prisma = getPrismaClientOrThrow();
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.bookingId,
        deletedAt: null,
      },
      include: {
        participants: {
          where: { deletedAt: null },
          include: {
            athlete: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });
    if (!booking) {
      throw notFound('Booking not found', { bookingId: params.bookingId });
    }

    const canReview =
      booking.bookedByUserId === params.authUserId ||
      booking.participants.some(
        (participant) =>
          participant.guardianUserId === params.authUserId ||
          participant.athlete.userId === params.authUserId,
      );
    if (!canReview) {
      throw forbidden('Only the booked family or athlete can review this booking', {
        bookingId: params.bookingId,
      });
    }

    if (booking.status !== 'COMPLETED') {
      throw badRequest('Only completed bookings can be reviewed', {
        bookingId: params.bookingId,
        status: booking.status,
      });
    }

    const existing = await prisma.sessionFeedback.findFirst({
      where: {
        bookingId: params.bookingId,
        authorUserId: params.authUserId,
        deletedAt: null,
        rating: { not: null },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return {
        review: mapReviewRow(normalizeForJson(existing) as SeedRow, booking.coachUserId),
        reused: true,
        dataVersion: null,
      };
    }

    const athleteId = booking.participants[0]?.athleteId;
    if (!athleteId) {
      throw badRequest('Booking has no reviewable athlete participant', { bookingId: params.bookingId });
    }

    const created = await prisma.sessionFeedback.create({
      data: {
        id: newId('sfb'),
        bookingId: params.bookingId,
        athleteId,
        authorUserId: params.authUserId,
        rating: params.input.rating,
        publicComment: params.input.comment?.trim() || null,
        privateCommentEncrypted: null,
        visibility: 'public',
      },
    });

    return {
      review: {
        ...mapReviewRow(normalizeForJson(created) as SeedRow, booking.coachUserId),
        coachUserId: booking.coachUserId,
        reviewerUserId: params.authUserId,
        categories: {},
      },
      reused: false,
      dataVersion: null,
    };
  }

  async listCoachReviews(params: { coachUserId: string }): Promise<BookingReviewListResult> {
    if (shouldUseDbFixtureFallback()) {
      return dbFixtureRepository.listCoachReviews(params);
    }

    const prisma = getPrismaClientOrThrow();
    const feedbackRows = await prisma.sessionFeedback.findMany({
      where: {
        deletedAt: null,
        rating: { not: null },
        visibility: 'public',
        booking: {
          coachUserId: params.coachUserId,
          status: 'COMPLETED',
          deletedAt: null,
        },
      },
      include: {
        athlete: {
          select: {
            displayName: true,
          },
        },
        booking: {
          select: {
            bookedByUserId: true,
            coachUserId: true,
            serviceType: true,
            participants: {
              where: {
                deletedAt: null,
              },
              include: {
                athlete: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const authorUserIds = Array.from(new Set(feedbackRows.map((row) => row.authorUserId)));
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: authorUserIds,
        },
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });
    const reviewerNameById = new Map(users.map((user) => [user.id, user.name]));

    const reviews = feedbackRows
      .filter((row) => {
        const booking = row.booking;
        if (!booking) {
          return false;
        }
        return (
          booking.bookedByUserId === row.authorUserId ||
          booking.participants.some(
            (participant) =>
              participant.guardianUserId === row.authorUserId ||
              participant.athlete.userId === row.authorUserId,
          )
        );
      })
      .map((row) => ({
        ...mapReviewRow(normalizeForJson(row) as SeedRow, row.booking?.coachUserId ?? params.coachUserId, {
          reviewerName: reviewerNameById.get(row.authorUserId) ?? null,
          athleteName: row.athlete.displayName,
          sessionType: row.booking?.serviceType ?? null,
        }),
        coachUserId: row.booking?.coachUserId ?? params.coachUserId,
        reviewerUserId: row.authorUserId,
        athleteId: row.athleteId,
        categories: {},
      }));

    return {
      reviews,
      dataVersion: null,
    };
  }
}

const seedRepository = new StoreBookingReviewRepository(() => getMarketplaceSeedStore());
const dbFixtureRepository = new StoreBookingReviewRepository(() => getDbFixtureStore());
const prismaRepository = new PrismaBookingReviewRepository();

export function resolveBookingReviewRepository(): BookingReviewRepository {
  return getApiDataBackend() === 'db' ? prismaRepository : seedRepository;
}
