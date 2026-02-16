"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewService = void 0;
const api_client_1 = require("./api-client");
const notification_service_1 = require("./notification-service");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('ReviewService');
const DEFAULT_REVIEWS = [
    {
        id: 'review_seed_1',
        coachId: 'coach1',
        coachName: 'Sarah Mitchell',
        parentId: 'user4',
        parentName: 'John Henderson',
        athleteId: 'user1',
        athleteName: 'Tom Henderson',
        rating: 5,
        title: 'Huge confidence boost',
        content: 'Tom has improved massively in decision-making and composure in front of goal.',
        comment: 'Tom has improved massively in decision-making and composure in front of goal.',
        isPublic: true,
        isVerifiedBooking: true,
        status: 'PUBLISHED',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        helpfulCount: 4,
    },
    {
        id: 'review_seed_2',
        coachId: 'coach2',
        coachName: 'Mike Thompson',
        parentId: 'user5',
        parentName: 'Lisa Wilson',
        athleteId: 'user3',
        athleteName: 'James Wilson',
        rating: 5,
        title: 'Excellent structure',
        content: 'Sessions are focused, clear, and very practical. James looks forward to every one.',
        comment: 'Sessions are focused, clear, and very practical. James looks forward to every one.',
        isPublic: true,
        isVerifiedBooking: true,
        status: 'PUBLISHED',
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        helpfulCount: 2,
    },
    {
        id: 'review_seed_3',
        coachId: 'coach3',
        coachName: 'David Roberts',
        parentId: 'user4',
        parentName: 'John Henderson',
        athleteId: 'user2',
        athleteName: 'Emma Henderson',
        rating: 4,
        title: 'Great attention to detail',
        content: 'David gives very actionable feedback after each session.',
        comment: 'David gives very actionable feedback after each session.',
        isPublic: true,
        isVerifiedBooking: true,
        status: 'PUBLISHED',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        helpfulCount: 1,
    },
];
class ReviewService {
    async list() {
        try {
            const reviews = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.REVIEWS, DEFAULT_REVIEWS);
            return (0, result_1.ok)(reviews);
        }
        catch (error) {
            logger.error('Failed to list reviews', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to load reviews'));
        }
    }
    async getByCoachId(coachId) {
        try {
            const reviewsResult = await this.list();
            if (!reviewsResult.success) {
                return reviewsResult;
            }
            return (0, result_1.ok)(reviewsResult.data.filter((r) => r.coachId === coachId));
        }
        catch (error) {
            logger.error('Failed to get reviews by coach', { coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load coach reviews'));
        }
    }
    async create(review) {
        try {
            const currentResult = await this.list();
            if (!currentResult.success) {
                return currentResult;
            }
            const updated = [review, ...currentResult.data];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.REVIEWS, updated);
            // Notify coach of new review
            await notification_service_1.notificationService.notifyCoachNewReview({
                coachId: review.coachId,
                parentName: review.parentName || 'Parent',
                rating: review.rating,
                reviewId: review.id,
            });
            return (0, result_1.ok)(review);
        }
        catch (error) {
            logger.error('Failed to create review', { review, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to create review'));
        }
    }
    /**
     * Submit a review for a session (parent action)
     */
    async submitReview(params) {
        try {
            const review = {
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
        catch (error) {
            logger.error('Failed to submit review', { params, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to submit review'));
        }
    }
    /**
     * Get average rating for a coach
     */
    async getCoachRating(coachId) {
        try {
            const reviewsResult = await this.getByCoachId(coachId);
            if (!reviewsResult.success) {
                return reviewsResult;
            }
            if (reviewsResult.data.length === 0) {
                return (0, result_1.ok)({ average: 0, count: 0 });
            }
            const sum = reviewsResult.data.reduce((acc, r) => acc + r.rating, 0);
            return (0, result_1.ok)({
                average: Math.round((sum / reviewsResult.data.length) * 10) / 10,
                count: reviewsResult.data.length,
            });
        }
        catch (error) {
            logger.error('Failed to get coach rating', { coachId, error });
            return (0, result_1.err)((0, result_1.storageError)('Failed to load coach rating'));
        }
    }
}
exports.reviewService = new ReviewService();
