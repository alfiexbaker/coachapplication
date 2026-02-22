import { Review } from '@/constants/types';
import { apiClient } from './api-client';
import { notificationService } from './notification-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('ReviewService');

// Extended review that works with both types
type ExtendedReview = Review & { comment?: string };

const DEFAULT_REVIEWS: ExtendedReview[] = [
  {
    id: 'review_seed_1',
    coachId: 'coach1',
    coachName: 'Jess Okafor',
    parentId: 'user4',
    parentName: 'Chris Barton',
    athleteId: 'user1',
    athleteName: 'Alfie Barton',
    rating: 5,
    title: 'Huge confidence boost',
    content: 'Alfie has improved massively in decision-making and composure in front of goal.',
    comment: 'Alfie has improved massively in decision-making and composure in front of goal.',
    isPublic: true,
    isVerifiedBooking: true,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    helpfulCount: 4,
  },
  {
    id: 'review_seed_2',
    coachId: 'coach2',
    coachName: 'Reuben Carr',
    parentId: 'user5',
    parentName: 'Nadia Mensah',
    athleteId: 'user3',
    athleteName: 'Kai Mensah',
    rating: 5,
    title: 'Excellent structure',
    content: 'Sessions are focused, clear, and very practical. Kai looks forward to every one.',
    comment: 'Sessions are focused, clear, and very practical. Kai looks forward to every one.',
    isPublic: true,
    isVerifiedBooking: true,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    helpfulCount: 2,
  },
  {
    id: 'review_seed_3',
    coachId: 'coach3',
    coachName: 'Aiden Sharma',
    parentId: 'user4',
    parentName: 'Chris Barton',
    athleteId: 'user2',
    athleteName: 'Maisie Barton',
    rating: 4,
    title: 'Great attention to detail',
    content: 'Aiden gives very actionable feedback after each session.',
    comment: 'Aiden gives very actionable feedback after each session.',
    isPublic: true,
    isVerifiedBooking: true,
    status: 'PUBLISHED',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    helpfulCount: 1,
  },
];

class ReviewService {
  async list(): Promise<Result<ExtendedReview[], ServiceError>> {
    try {
      const reviews = await apiClient.get<ExtendedReview[]>(STORAGE_KEYS.REVIEWS, DEFAULT_REVIEWS);
      return ok(reviews);
    } catch (error) {
      logger.error('Failed to list reviews', error);
      return err(storageError('Failed to load reviews'));
    }
  }

  async getByCoachId(coachId: string): Promise<Result<ExtendedReview[], ServiceError>> {
    try {
      const reviewsResult = await this.list();
      if (!reviewsResult.success) {
        return reviewsResult;
      }
      return ok(reviewsResult.data.filter((r) => r.coachId === coachId));
    } catch (error) {
      logger.error('Failed to get reviews by coach', { coachId, error });
      return err(storageError('Failed to load coach reviews'));
    }
  }

  async create(review: ExtendedReview): Promise<Result<ExtendedReview, ServiceError>> {
    try {
      const currentResult = await this.list();
      if (!currentResult.success) {
        return currentResult;
      }

      const updated = [review, ...currentResult.data];
      await apiClient.set(STORAGE_KEYS.REVIEWS, updated);

      // Notify coach of new review
      await notificationService.notifyCoachNewReview({
        coachId: review.coachId,
        parentName: review.parentName || 'Parent',
        rating: review.rating,
        reviewId: review.id,
      });

      return ok(review);
    } catch (error) {
      logger.error('Failed to create review', { review, error });
      return err(storageError('Failed to create review'));
    }
  }

  /**
   * Submit a review for a session (parent action)
   */
  async submitReview(params: {
    coachId: string;
    coachName: string;
    parentId: string;
    parentName: string;
    parentPhotoUrl?: string;
    athleteId?: string;
    athleteName?: string;
    bookingId?: string;
    rating: number;
    title?: string;
    content: string;
  }): Promise<Result<ExtendedReview, ServiceError>> {
    try {
      const review: ExtendedReview = {
        id: `review_${Date.now()}`,
        coachId: params.coachId,
        coachName: params.coachName,
        parentId: params.parentId,
        parentName: params.parentName,
        parentPhotoUrl: params.parentPhotoUrl,
        athleteId: params.athleteId,
        athleteName: params.athleteName,
        bookingId: params.bookingId,
        rating: params.rating,
        title: params.title,
        content: params.content,
        isPublic: true,
        isVerifiedBooking: !!params.bookingId,
        status: 'PUBLISHED',
        createdAt: new Date().toISOString(),
        helpfulCount: 0,
      };

      return this.create(review);
    } catch (error) {
      logger.error('Failed to submit review', { params, error });
      return err(storageError('Failed to submit review'));
    }
  }

  /**
   * Get average rating for a coach
   */
  async getCoachRating(
    coachId: string,
  ): Promise<Result<{ average: number; count: number }, ServiceError>> {
    try {
      const reviewsResult = await this.getByCoachId(coachId);
      if (!reviewsResult.success) {
        return reviewsResult;
      }

      if (reviewsResult.data.length === 0) {
        return ok({ average: 0, count: 0 });
      }

      const sum = reviewsResult.data.reduce((acc, r) => acc + r.rating, 0);
      return ok({
        average: Math.round((sum / reviewsResult.data.length) * 10) / 10,
        count: reviewsResult.data.length,
      });
    } catch (error) {
      logger.error('Failed to get coach rating', { coachId, error });
      return err(storageError('Failed to load coach rating'));
    }
  }
}

export const reviewService = new ReviewService();
