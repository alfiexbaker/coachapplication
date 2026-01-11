import { Review } from '@/constants/types';
import { MOCK_REVIEWS } from '@/constants/mock-data';
import { storageService } from './storage-service';
import { notificationService } from './notification-service';

const STORAGE_KEY = 'clubroom.reviews';

// Extended review that works with both types
type ExtendedReview = Review & { comment?: string };

class ReviewService {
  async list(): Promise<ExtendedReview[]> {
    return storageService.getItem<ExtendedReview[]>(STORAGE_KEY, MOCK_REVIEWS as unknown as ExtendedReview[]);
  }

  async getByCoachId(coachId: string): Promise<ExtendedReview[]> {
    const reviews = await this.list();
    return reviews.filter((r) => r.coachId === coachId);
  }

  async create(review: ExtendedReview) {
    const current = await this.list();
    const updated = [review, ...current];
    await storageService.setItem(STORAGE_KEY, updated);

    // Notify coach of new review
    await notificationService.notifyCoachNewReview({
      coachId: review.coachId,
      parentName: review.parentName || 'Parent',
      rating: review.rating,
      reviewId: review.id,
    });

    return review;
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
  }): Promise<ExtendedReview> {
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
  }

  /**
   * Get average rating for a coach
   */
  async getCoachRating(coachId: string): Promise<{ average: number; count: number }> {
    const reviews = await this.getByCoachId(coachId);
    if (reviews.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return {
      average: Math.round((sum / reviews.length) * 10) / 10,
      count: reviews.length,
    };
  }
}

export const reviewService = new ReviewService();
