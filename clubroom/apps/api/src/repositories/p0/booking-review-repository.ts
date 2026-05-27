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
  athleteId: string;
  rating: number;
  comment: string | null;
  categories: Record<string, number>;
  isVerifiedBooking: true;
  createdAt: string;
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

function mapReviewRow(row: SeedRow, fallbackCoachUserId: string): BookingReviewResponse {
  const metadata = asObject(row.metadataJson);
  return {
    id: asString(row.id) ?? '',
    bookingId: asString(row.bookingId) ?? '',
    coachUserId: asString(row.coachUserId) ?? asString(metadata?.coachUserId) ?? fallbackCoachUserId,
    reviewerUserId: asString(row.authorUserId) ?? asString(metadata?.reviewerUserId) ?? '',
    athleteId: asString(row.athleteId) ?? '',
    rating: asNumber(row.rating) ?? 0,
    comment: asString(row.publicComment) ?? null,
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
    const canReview =
      asString(booking.bookedByUserId) === params.authUserId ||
      participants.some((participant) => {
        if (asString(participant.guardianUserId) === params.authUserId) {
          return true;
        }
        const athleteId = asString(participant.athleteId);
        return Boolean(athleteId && athleteUserIdsByAthleteId.get(athleteId) === params.authUserId);
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
}

const seedRepository = new StoreBookingReviewRepository(() => getMarketplaceSeedStore());
const dbFixtureRepository = new StoreBookingReviewRepository(() => getDbFixtureStore());
const prismaRepository = new PrismaBookingReviewRepository();

export function resolveBookingReviewRepository(): BookingReviewRepository {
  return getApiDataBackend() === 'db' ? prismaRepository : seedRepository;
}
