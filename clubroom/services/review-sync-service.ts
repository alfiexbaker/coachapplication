import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';

export interface StoredCoachReview {
  id: string;
  coachId: string;
  coachName?: string;
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
  rating: number;
  comment?: string;
  sessionType?: string;
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
    rating: review.rating,
    comment,
    sessionType: review.sessionType,
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

  const nextRateReviews = dedupeById([...rateReviews, review]);
  const nextPublicReviews = dedupeById([toPublicReview(review), ...publicReviews]);
  const nextDomainReviews = dedupeById([toDomainReview(review), ...domainReviews]);

  await Promise.all([
    apiClient.set(STORAGE_KEYS.RATE_COACH_REVIEWS, nextRateReviews),
    apiClient.set(STORAGE_KEYS.COACH_PUBLIC_REVIEWS, nextPublicReviews),
    apiClient.set(STORAGE_KEYS.REVIEWS, nextDomainReviews),
  ]);
}
