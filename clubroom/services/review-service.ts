import { Review } from '@/constants/app-types';
import { MOCK_REVIEWS } from '@/constants/mock-data';
import { storageService } from './storage-service';

const STORAGE_KEY = 'clubroom.reviews';

class ReviewService {
  async list(): Promise<Review[]> {
    return storageService.getItem<Review[]>(STORAGE_KEY, MOCK_REVIEWS);
  }

  async create(review: Review) {
    const current = await this.list();
    const updated = [review, ...current];
    await storageService.setItem(STORAGE_KEY, updated);
    return review;
  }
}

export const reviewService = new ReviewService();
