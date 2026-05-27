import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient, apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from '@/services/api-auth-context';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ReviewSyncService');

export interface StoredCoachReview {
  id: string;
  coachId: string;
  coachName?: string;
  athleteId?: string;
  athleteName?: string;
  parentName?: string;
  userName?: string;
  userId?: string;
  parentId?: string;
  rating: number;
  text: string;
  content: string;
  createdAt: string;
  sessionDate: string;
  bookingId?: string;
  sessionType?: string;
  categories?: Record<string, number>;
}

interface PublicCoachReviewRecord {
  id: string;
  coachId: string;
  reviewerName: string;
  reviewerId?: string;
  athleteId?: string;
  athleteName?: string;
  rating: number;
  comment?: string;
  sessionType?: string;
  bookingId?: string;
  isVerifiedBooking?: boolean;
  categories?: Record<string, number>;
  createdAt: string;
}

interface DomainReviewRecord {
  id: string;
  coachId: string;
  coachName?: string;
  parentId?: string;
  parentName?: string;
  bookingId?: string;
  rating: number;
  content: string;
  isPublic: boolean;
  isVerifiedBooking: boolean;
  status: 'PUBLISHED';
  createdAt: string;
  helpfulCount: number;
}

interface ReviewBookingContext {
  id: string;
  coachId: string;
  coachName?: string;
  athleteId?: string;
  athleteName?: string;
  service?: string;
  scheduledAt?: string;
}

interface ReviewCurrentUserContext {
  id?: string;
  fullName?: string;
  name?: string;
  username?: string;
}

interface SubmitBookingReviewInput {
  booking: ReviewBookingContext;
  rating: number;
  text: string;
  categories: Record<string, number>;
  currentUser?: ReviewCurrentUserContext | null;
}

export interface SubmitBookingReviewResult {
  review: StoredCoachReview;
  reused: boolean;
}

interface ApiBookingReviewResponse {
  review: {
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
  };
  reused: boolean;
  requestId: string;
}

function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const row of rows) {
    if (!row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    result.push(row);
  }
  return result;
}

function toPublicReview(review: StoredCoachReview): PublicCoachReviewRecord {
  const reviewerName =
    review.parentName?.trim() ||
    review.userName?.trim() ||
    'Parent';
  const reviewerId = review.userId || review.parentId;
  const comment = review.text?.trim() || review.content?.trim();

  return {
    id: review.id,
    coachId: review.coachId,
    reviewerName,
    reviewerId,
    athleteId: review.athleteId,
    athleteName: review.athleteName,
    rating: review.rating,
    comment,
    sessionType: review.sessionType,
    bookingId: review.bookingId,
    isVerifiedBooking: Boolean(review.bookingId),
    categories: review.categories,
    createdAt: review.createdAt,
  };
}

function toDomainReview(review: StoredCoachReview): DomainReviewRecord {
  return {
    id: review.id,
    coachId: review.coachId,
    coachName: review.coachName,
    parentId: review.parentId || review.userId,
    parentName: review.parentName || review.userName || 'Parent',
    bookingId: review.bookingId,
    rating: review.rating,
    content: review.text || review.content || '',
    isPublic: true,
    isVerifiedBooking: Boolean(review.bookingId),
    status: 'PUBLISHED',
    createdAt: review.createdAt,
    helpfulCount: 0,
  };
}

function isSameStoredReview(existing: StoredCoachReview, incoming: StoredCoachReview): boolean {
  if (existing.id === incoming.id) {
    return true;
  }
  if (!existing.bookingId || existing.bookingId !== incoming.bookingId) {
    return false;
  }

  const existingReviewerId = existing.userId || existing.parentId;
  const incomingReviewerId = incoming.userId || incoming.parentId;
  return Boolean(existingReviewerId && incomingReviewerId && existingReviewerId === incomingReviewerId);
}

function isSamePublicReview(
  existing: PublicCoachReviewRecord,
  incoming: StoredCoachReview,
): boolean {
  if (existing.id === incoming.id) {
    return true;
  }
  const incomingReviewerId = incoming.userId || incoming.parentId;
  return Boolean(
    existing.bookingId &&
      existing.bookingId === incoming.bookingId &&
      existing.reviewerId &&
      incomingReviewerId &&
      existing.reviewerId === incomingReviewerId,
  );
}

function isSameDomainReview(existing: DomainReviewRecord, incoming: StoredCoachReview): boolean {
  if (existing.id === incoming.id) {
    return true;
  }
  const incomingReviewerId = incoming.userId || incoming.parentId;
  return Boolean(
    existing.bookingId &&
      existing.bookingId === incoming.bookingId &&
      existing.parentId &&
      incomingReviewerId &&
      existing.parentId === incomingReviewerId,
  );
}

function reviewerNameFor(user?: ReviewCurrentUserContext | null): string {
  return user?.fullName || user?.name || user?.username || 'Anonymous';
}

function toStoredReview(params: {
  id: string;
  booking: ReviewBookingContext;
  reviewerUserId?: string;
  reviewerName?: string;
  rating: number;
  text: string;
  categories?: Record<string, number>;
  createdAt: string;
  athleteId?: string;
}): StoredCoachReview {
  const reviewerName = params.reviewerName?.trim() || 'Anonymous';

  return {
    id: params.id,
    bookingId: params.booking.id,
    coachId: params.booking.coachId,
    coachName: params.booking.coachName,
    athleteId: params.athleteId ?? params.booking.athleteId,
    athleteName: params.booking.athleteName,
    parentName: reviewerName,
    userName: reviewerName,
    userId: params.reviewerUserId,
    parentId: params.reviewerUserId,
    rating: params.rating,
    text: params.text,
    content: params.text,
    categories: params.categories,
    sessionType: params.booking.service,
    createdAt: params.createdAt,
    sessionDate: params.booking.scheduledAt ?? params.createdAt,
  };
}

function toStoredReviewFromApi(
  payload: ApiBookingReviewResponse['review'],
  booking: ReviewBookingContext,
  currentUser?: ReviewCurrentUserContext | null,
): StoredCoachReview {
  return toStoredReview({
    id: payload.id,
    booking: {
      ...booking,
      coachId: payload.coachUserId || booking.coachId,
      athleteId: payload.athleteId || booking.athleteId,
    },
    reviewerUserId: payload.reviewerUserId,
    reviewerName: reviewerNameFor(currentUser),
    rating: payload.rating,
    text: payload.comment ?? '',
    categories: payload.categories,
    createdAt: payload.createdAt,
    athleteId: payload.athleteId,
  });
}

export async function getStoredCoachReviews(): Promise<StoredCoachReview[]> {
  const rows = await apiClient.get<StoredCoachReview[]>(STORAGE_KEYS.RATE_COACH_REVIEWS, []);
  return dedupeById(rows);
}

export function isReviewForBookingByUser(
  review: Pick<StoredCoachReview, 'bookingId' | 'userId' | 'parentId'>,
  bookingId: string,
  currentUserId?: string,
): boolean {
  if (review.bookingId !== bookingId) return false;
  if (!currentUserId) return true;
  return (
    review.userId === currentUserId ||
    review.parentId === currentUserId ||
    (!review.userId && !review.parentId)
  );
}

export async function appendCoachReview(review: StoredCoachReview): Promise<void> {
  const [rateReviews, publicReviews, domainReviews] = await Promise.all([
    apiClient.get<StoredCoachReview[]>(STORAGE_KEYS.RATE_COACH_REVIEWS, []),
    apiClient.get<PublicCoachReviewRecord[]>(STORAGE_KEYS.COACH_PUBLIC_REVIEWS, []),
    apiClient.get<DomainReviewRecord[]>(STORAGE_KEYS.REVIEWS, []),
  ]);

  const nextRateReviews = dedupeById([
    review,
    ...rateReviews.filter((existing) => !isSameStoredReview(existing, review)),
  ]);
  const nextPublicReviews = dedupeById([
    toPublicReview(review),
    ...publicReviews.filter((existing) => !isSamePublicReview(existing, review)),
  ]);
  const nextDomainReviews = dedupeById([
    toDomainReview(review),
    ...domainReviews.filter((existing) => !isSameDomainReview(existing, review)),
  ]);

  await Promise.all([
    apiClient.set(STORAGE_KEYS.RATE_COACH_REVIEWS, nextRateReviews),
    apiClient.set(STORAGE_KEYS.COACH_PUBLIC_REVIEWS, nextPublicReviews),
    apiClient.set(STORAGE_KEYS.REVIEWS, nextDomainReviews),
  ]);
}

export async function submitBookingReview(
  input: SubmitBookingReviewInput,
): Promise<Result<SubmitBookingReviewResult, ServiceError>> {
  if (!input.booking.id) {
    return err(serviceError('VALIDATION', 'A booking is required to submit a review.'));
  }

  if (apiClient.isMockMode) {
    try {
      const existingReview = (await getStoredCoachReviews()).find((review) =>
        isReviewForBookingByUser(review, input.booking.id, input.currentUser?.id),
      );
      if (existingReview) {
        return ok({ review: existingReview, reused: true });
      }

      const createdAt = new Date().toISOString();
      const review = toStoredReview({
        id: `review_${Date.now()}`,
        booking: input.booking,
        reviewerUserId: input.currentUser?.id,
        reviewerName: reviewerNameFor(input.currentUser),
        rating: input.rating,
        text: input.text,
        categories: input.categories,
        createdAt,
      });
      await appendCoachReview(review);
      return ok({ review, reused: false });
    } catch (error) {
      logger.error('Failed to submit local booking review', error);
      return err(serviceError('STORAGE', 'Failed to submit review locally.', error));
    }
  }

  const userResult = await resolveSignedInApiUser('Sign in to review this booking.');
  if (!userResult.success) {
    return err(userResult.error);
  }

  const actingRole = deriveApiActingRole(userResult.data, 'parent');
  const headers = buildApiAuthHeaders({ actingRole });
  const apiResult = await apiFetch<ApiBookingReviewResponse>(
    `/v1/bookings/${encodeURIComponent(input.booking.id)}/reviews`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        rating: input.rating,
        comment: input.text.trim() || null,
        categories: input.categories,
      }),
    },
  );

  if (!apiResult.success) {
    return err(apiResult.error);
  }

  const review = toStoredReviewFromApi(apiResult.data.review, input.booking, input.currentUser);

  try {
    await appendCoachReview(review);
  } catch (mirrorError) {
    logger.warn('Booking review submitted, but local review mirror failed', {
      bookingId: input.booking.id,
      reviewId: review.id,
      error: String(mirrorError),
    });
  }

  return ok({ review, reused: apiResult.data.reused });
}
