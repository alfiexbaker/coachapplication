"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const review_service_1 = require("@/services/review-service");
(0, node_test_1.describe)('reviewService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.REVIEWS);
    });
    (0, node_test_1.it)('lists seeded reviews when storage is empty (happy path)', async () => {
        const result = await review_service_1.reviewService.list();
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.ok(result.data.length > 0);
        strict_1.default.ok(result.data[0].id);
    });
    (0, node_test_1.it)('returns zero rating for coach with no reviews (empty path)', async () => {
        const result = await review_service_1.reviewService.getCoachRating('coach-no-reviews');
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data.average, 0);
        strict_1.default.equal(result.data.count, 0);
    });
    (0, node_test_1.it)('creates and retrieves a review for a coach', async () => {
        const createResult = await review_service_1.reviewService.create({
            id: 'review_test_1',
            coachId: 'coach_test_1',
            coachName: 'Coach Test',
            parentId: 'parent_test_1',
            parentName: 'Parent Test',
            athleteId: 'athlete_test_1',
            athleteName: 'Athlete Test',
            rating: 5,
            title: 'Great Session',
            content: 'Very structured and useful.',
            isPublic: true,
            isVerifiedBooking: false,
            status: 'PUBLISHED',
            createdAt: '2026-02-11T00:00:00.000Z',
            helpfulCount: 0,
        });
        strict_1.default.equal(createResult.success, true);
        const byCoachResult = await review_service_1.reviewService.getByCoachId('coach_test_1');
        strict_1.default.equal(byCoachResult.success, true);
        if (!byCoachResult.success)
            return;
        strict_1.default.ok(byCoachResult.data.some((review) => review.id === 'review_test_1'));
    });
    (0, node_test_1.it)('returns err when storage read fails (error path)', async () => {
        const apiClientInternals = api_client_1.apiClient;
        const originalGet = apiClientInternals.get;
        apiClientInternals.get = async () => {
            throw new Error('forced review storage failure');
        };
        try {
            const result = await review_service_1.reviewService.list();
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'STORAGE');
        }
        finally {
            apiClientInternals.get = originalGet;
        }
    });
});
