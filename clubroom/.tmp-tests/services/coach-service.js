"use strict";
/**
 * Coach Service
 *
 * Manages coach profiles, reviews, and public-facing data.
 * Uses apiClient for all data access (AsyncStorage in mock mode, API in production).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.coachService = void 0;
const api_client_1 = require("./api-client");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const account_id_1 = require("@/utils/account-id");
const logger = (0, logger_1.createLogger)('CoachService');
// Storage keys (inline until added to storage-keys.ts)
const COACHES_KEY = 'clubroom.coaches';
const COACH_REVIEWS_KEY = 'clubroom.coach_reviews';
// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_COACHES = [
    {
        id: 'coach-1',
        name: 'Marcus Johnson',
        bio: 'Former professional footballer with 15 years of coaching experience. Specializing in youth development and technical skills. I believe in building confidence alongside ability, helping young players reach their full potential on and off the pitch.',
        sports: ['Football'],
        location: { city: 'Manchester', state: 'Greater Manchester', lat: 53.4808, lng: -2.2426 },
        distance: 2.5,
        rating: 4.8,
        reviewCount: 47,
        minPriceUsd: 35,
        maxPriceUsd: 60,
        profilePhotoUrl: undefined,
        coverPhotoUrl: undefined,
        joinedAt: '2021-03-15',
        totalSessions: 342,
        nextAvailable: new Date(Date.now() + 86400000 * 2).toISOString(),
        badges: ['Verified', 'Background Checked', 'Top Rated'],
        footballFocuses: ['Dribbling', 'Finishing', 'Ball Control', 'Speed Training'],
        experiences: [
            {
                title: 'Youth Academy Coach',
                organization: 'Manchester City FC Academy',
                startDate: '2019',
                endDate: undefined,
                current: true,
                description: 'Lead coach for U14 development squad',
            },
            {
                title: 'Private Football Coach',
                organization: 'Self-employed',
                startDate: '2015',
                endDate: '2019',
                current: false,
                description: 'Private 1-on-1 and small group coaching',
            },
        ],
        certifications: [
            { name: 'UEFA B License', issuer: 'UEFA', issueDate: '2018' },
            { name: 'FA Level 3', issuer: 'The FA', issueDate: '2017' },
            { name: 'First Aid Certified', issuer: 'St John Ambulance', issueDate: '2023' },
        ],
        languages: [
            { name: 'English', proficiency: 'Native' },
            { name: 'Spanish', proficiency: 'Conversational' },
        ],
    },
    {
        id: 'coach-2',
        name: 'Sarah Williams',
        bio: "Passionate about developing young talent. Former England Women's U21 player with a focus on technical excellence and tactical awareness.",
        sports: ['Football'],
        location: { city: 'London', state: 'Greater London', lat: 51.5074, lng: -0.1278 },
        distance: 5.0,
        rating: 4.9,
        reviewCount: 89,
        minPriceUsd: 45,
        maxPriceUsd: 75,
        profilePhotoUrl: undefined,
        coverPhotoUrl: undefined,
        joinedAt: '2020-06-01',
        totalSessions: 567,
        nextAvailable: new Date(Date.now() + 86400000).toISOString(),
        badges: ['Verified', 'Background Checked', 'Pro Athlete'],
        footballFocuses: ['Passing', 'Tactical Awareness', 'Defending', 'Leadership'],
        experiences: [
            {
                title: 'Head Coach',
                organization: 'Chelsea FC Women Academy',
                startDate: '2020',
                current: true,
            },
        ],
        certifications: [{ name: 'UEFA A License', issuer: 'UEFA', issueDate: '2020' }],
        languages: [{ name: 'English', proficiency: 'Native' }],
    },
];
const MOCK_REVIEWS = [
    {
        id: 'review-1',
        coachId: 'coach-1',
        reviewerName: 'James P.',
        reviewerId: 'parent-1',
        rating: 5,
        comment: 'Marcus is fantastic with my son. His confidence on the ball has improved dramatically over the past 3 months. Highly recommend!',
        sessionType: '1-on-1 Session',
        createdAt: '2024-01-10T14:00:00Z',
    },
    {
        id: 'review-2',
        coachId: 'coach-1',
        reviewerName: 'Emily R.',
        reviewerId: 'parent-2',
        rating: 5,
        comment: 'Professional, punctual, and great with kids. My daughter loves her sessions with Marcus.',
        sessionType: 'Group Session',
        createdAt: '2024-01-05T10:00:00Z',
    },
    {
        id: 'review-3',
        coachId: 'coach-1',
        reviewerName: 'David M.',
        reviewerId: 'parent-3',
        rating: 4,
        comment: 'Good coaching sessions. Would appreciate more feedback after each session.',
        sessionType: '1-on-1 Session',
        createdAt: '2023-12-20T16:00:00Z',
    },
    {
        id: 'review-4',
        coachId: 'coach-1',
        reviewerName: 'Lisa T.',
        reviewerId: 'parent-4',
        rating: 5,
        comment: 'Excellent coach! Really understands how to work with different skill levels.',
        createdAt: '2023-12-15T11:00:00Z',
    },
    {
        id: 'review-5',
        coachId: 'coach-2',
        reviewerName: 'Michael B.',
        reviewerId: 'parent-5',
        rating: 5,
        comment: 'Sarah is an incredible coach. Her experience as a professional really shows in how she teaches.',
        sessionType: '1-on-1 Session',
        createdAt: '2024-01-08T09:00:00Z',
    },
];
// ============================================================================
// SERVICE METHODS
// ============================================================================
exports.coachService = {
    /**
     * Get a single coach by ID
     */
    async getCoach(coachId) {
        logger.info('Getting coach', { coachId });
        try {
            const coaches = await api_client_1.apiClient.get(COACHES_KEY, MOCK_COACHES);
            const coach = coaches.find((c) => (0, account_id_1.accountIdsMatch)(c.id, coachId));
            if (!coach)
                return (0, result_1.err)((0, result_1.notFound)('Coach', coachId));
            return (0, result_1.ok)(coach);
        }
        catch (error) {
            logger.error('Failed to get coach', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to get coach'));
        }
    },
    /**
     * Get all coaches (with optional filters)
     */
    async getCoaches(filters) {
        logger.info('Getting coaches', { filters });
        try {
            let coaches = await api_client_1.apiClient.get(COACHES_KEY, MOCK_COACHES);
            if (filters?.minRating) {
                coaches = coaches.filter((c) => c.rating >= filters.minRating);
            }
            if (filters?.maxPrice) {
                coaches = coaches.filter((c) => c.minPriceUsd <= filters.maxPrice);
            }
            if (filters?.sport) {
                coaches = coaches.filter((c) => c.sports.some((s) => s.toLowerCase() === filters.sport.toLowerCase()));
            }
            return (0, result_1.ok)(coaches);
        }
        catch (error) {
            logger.error('Failed to get coaches', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to get coaches'));
        }
    },
    /**
     * Get reviews for a coach
     */
    async getCoachReviews(coachId) {
        logger.info('Getting coach reviews', { coachId });
        try {
            const reviews = await api_client_1.apiClient.get(COACH_REVIEWS_KEY, MOCK_REVIEWS);
            const coachReviews = reviews.filter((r) => (0, account_id_1.accountIdsMatch)(r.coachId, coachId));
            return (0, result_1.ok)(coachReviews);
        }
        catch (error) {
            logger.error('Failed to get coach reviews', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to get coach reviews'));
        }
    },
    /**
     * Submit a review for a coach
     */
    async submitReview(coachId, review) {
        logger.info('Submitting review', { coachId, rating: review.rating });
        try {
            const coaches = await api_client_1.apiClient.get(COACHES_KEY, MOCK_COACHES);
            const reviews = await api_client_1.apiClient.get(COACH_REVIEWS_KEY, MOCK_REVIEWS);
            const canonicalCoachId = coaches.find((coach) => (0, account_id_1.accountIdsMatch)(coach.id, coachId))?.id ?? coachId;
            const newReview = {
                id: `review-${Date.now()}`,
                coachId: canonicalCoachId,
                reviewerName: 'You',
                reviewerId: 'current-user',
                rating: review.rating,
                comment: review.comment,
                sessionType: review.sessionType,
                createdAt: new Date().toISOString(),
            };
            reviews.unshift(newReview);
            await api_client_1.apiClient.set(COACH_REVIEWS_KEY, reviews);
            return (0, result_1.ok)(newReview);
        }
        catch (error) {
            logger.error('Failed to submit review', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to submit review'));
        }
    },
    /**
     * Search coaches
     */
    async searchCoaches(query) {
        logger.info('Searching coaches', { query });
        try {
            const coaches = await api_client_1.apiClient.get(COACHES_KEY, MOCK_COACHES);
            const lowerQuery = query.toLowerCase();
            const results = coaches.filter((c) => c.name.toLowerCase().includes(lowerQuery) ||
                c.bio?.toLowerCase().includes(lowerQuery) ||
                c.footballFocuses?.some((f) => f.toLowerCase().includes(lowerQuery)));
            return (0, result_1.ok)(results);
        }
        catch (error) {
            logger.error('Failed to search coaches', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to search coaches'));
        }
    },
    /**
     * Get featured/recommended coaches
     */
    async getFeaturedCoaches() {
        logger.info('Getting featured coaches');
        try {
            const coaches = await api_client_1.apiClient.get(COACHES_KEY, MOCK_COACHES);
            const featured = [...coaches].sort((a, b) => b.rating - a.rating).slice(0, 5);
            return (0, result_1.ok)(featured);
        }
        catch (error) {
            logger.error('Failed to get featured coaches', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to get featured coaches'));
        }
    },
    /**
     * Follow/unfollow a coach
     */
    async toggleFollow(coachId, _userId) {
        logger.info('Toggling follow', { coachId });
        try {
            // TODO: Implement persistent follow storage when follow-service is integrated
            return (0, result_1.ok)(true);
        }
        catch (error) {
            logger.error('Failed to toggle follow', error);
            return (0, result_1.err)((0, result_1.storageError)('Failed to toggle follow'));
        }
    },
};
