"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const community_carpool_service_1 = require("@/services/community/community-carpool-service");
const storage_service_1 = require("@/services/storage-service");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('CommunityCarpoolService', () => {
    (0, node_test_1.beforeEach)(async () => {
        // Clear storage using storageService (not apiClient) since carpool uses storageService
        await storage_service_1.storageService.removeItem(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS);
    });
    (0, node_test_1.describe)('createCarpoolOffer', () => {
        (0, node_test_1.it)('should return ok() with created carpool offer', async () => {
            const params = {
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Test Parent',
                sessionId: 'session-' + Math.random().toString(36).slice(2),
                sessionName: 'Saturday Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 3,
                pickupLocation: 'High Street',
                pickupTime: '09:00',
                returnOffered: true,
                returnTime: '12:00',
            };
            const result = await community_carpool_service_1.communityCarpoolService.createCarpoolOffer(params);
            strict_1.default.ok(result.success);
            strict_1.default.ok(result.data.id);
            strict_1.default.equal(result.data.parentId, params.parentId);
            strict_1.default.equal(result.data.seatsAvailable, 3);
            strict_1.default.equal(result.data.seatsTaken, 0);
            strict_1.default.equal(result.data.status, 'ACTIVE');
        });
        (0, node_test_1.it)('should return err() when seatsAvailable is invalid', async () => {
            const params = {
                parentId: 'parent1',
                parentName: 'Test Parent',
                sessionId: 'session1',
                sessionName: 'Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 0,
                pickupLocation: 'High Street',
                pickupTime: '09:00',
                returnOffered: false,
            };
            const result = await community_carpool_service_1.communityCarpoolService.createCarpoolOffer(params);
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'VALIDATION_ERROR');
        });
        (0, node_test_1.it)('should initialize empty request arrays', async () => {
            const params = {
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Test Parent',
                sessionId: 'session1',
                sessionName: 'Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 2,
                pickupLocation: 'Park',
                pickupTime: '10:00',
                returnOffered: false,
            };
            const result = await community_carpool_service_1.communityCarpoolService.createCarpoolOffer(params);
            strict_1.default.ok(result.success);
            strict_1.default.ok(Array.isArray(result.data.requests));
            strict_1.default.ok(Array.isArray(result.data.acceptedRequests));
            strict_1.default.equal(result.data.requests.length, 0);
        });
    });
    (0, node_test_1.describe)('getCarpoolOffers', () => {
        (0, node_test_1.it)('should return offers for specific session', async () => {
            const sessionId = 'session-' + Math.random().toString(36).slice(2);
            await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 1',
                sessionId,
                sessionName: 'Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 2,
                pickupLocation: 'Location A',
                pickupTime: '09:00',
                returnOffered: false,
            });
            const offers = await community_carpool_service_1.communityCarpoolService.getCarpoolOffers(sessionId);
            strict_1.default.ok(Array.isArray(offers));
            strict_1.default.ok(offers.length > 0);
            strict_1.default.equal(offers[0].sessionId, sessionId);
        });
        (0, node_test_1.it)('should return empty array for session with no offers', async () => {
            const sessionId = 'session-nonexistent-' + Math.random().toString(36).slice(2);
            const offers = await community_carpool_service_1.communityCarpoolService.getCarpoolOffers(sessionId);
            strict_1.default.ok(Array.isArray(offers));
            strict_1.default.equal(offers.length, 0);
        });
    });
    (0, node_test_1.describe)('requestCarpoolSeat', () => {
        (0, node_test_1.it)('should return ok() and create request', async () => {
            const createResult = await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 1',
                sessionId: 'session1',
                sessionName: 'Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 3,
                pickupLocation: 'Location',
                pickupTime: '09:00',
                returnOffered: false,
            });
            strict_1.default.ok(createResult.success);
            const requestResult = await community_carpool_service_1.communityCarpoolService.requestCarpoolSeat({
                offerId: createResult.data.id,
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 2',
                childNames: ['Child 1'],
                seatsRequested: 1,
            });
            strict_1.default.ok(requestResult.success);
            strict_1.default.ok(requestResult.data.id);
            strict_1.default.equal(requestResult.data.status, 'PENDING');
        });
        (0, node_test_1.it)('should return err() for non-existent offer', async () => {
            const result = await community_carpool_service_1.communityCarpoolService.requestCarpoolSeat({
                offerId: 'fake-offer-' + Math.random().toString(36).slice(2),
                parentId: 'parent1',
                parentName: 'Parent',
                childNames: ['Child'],
                seatsRequested: 1,
            });
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should return err() when seats requested exceed available', async () => {
            const createResult = await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 1',
                sessionId: 'session1',
                sessionName: 'Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 1,
                pickupLocation: 'Location',
                pickupTime: '09:00',
                returnOffered: false,
            });
            strict_1.default.ok(createResult.success);
            const requestResult = await community_carpool_service_1.communityCarpoolService.requestCarpoolSeat({
                offerId: createResult.data.id,
                parentId: 'parent2',
                parentName: 'Parent 2',
                childNames: ['Child 1', 'Child 2'],
                seatsRequested: 2,
            });
            strict_1.default.ok(!requestResult.success);
            strict_1.default.equal(requestResult.error.code, 'CONFLICT');
        });
    });
    (0, node_test_1.describe)('acceptRequest', () => {
        (0, node_test_1.it)('should return ok() and update request status', async () => {
            const createResult = await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 1',
                sessionId: 'session1',
                sessionName: 'Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 3,
                pickupLocation: 'Location',
                pickupTime: '09:00',
                returnOffered: false,
            });
            strict_1.default.ok(createResult.success);
            const requestResult = await community_carpool_service_1.communityCarpoolService.requestCarpoolSeat({
                offerId: createResult.data.id,
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 2',
                childNames: ['Child 1'],
                seatsRequested: 1,
            });
            strict_1.default.ok(requestResult.success);
            const acceptResult = await community_carpool_service_1.communityCarpoolService.acceptRequest(createResult.data.id, requestResult.data.id, createResult.data.parentId);
            strict_1.default.ok(acceptResult.success);
            strict_1.default.equal(acceptResult.data.status, 'ACCEPTED');
        });
        (0, node_test_1.it)('should return err() for non-existent offer', async () => {
            const result = await community_carpool_service_1.communityCarpoolService.acceptRequest('fake-offer-' + Math.random().toString(36).slice(2), 'fake-request', 'parent1');
            strict_1.default.ok(!result.success);
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.it)('should return err() when not the offer owner', async () => {
            const createResult = await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 1',
                sessionId: 'session1',
                sessionName: 'Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 3,
                pickupLocation: 'Location',
                pickupTime: '09:00',
                returnOffered: false,
            });
            strict_1.default.ok(createResult.success);
            const requestResult = await community_carpool_service_1.communityCarpoolService.requestCarpoolSeat({
                offerId: createResult.data.id,
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 2',
                childNames: ['Child 1'],
                seatsRequested: 1,
            });
            strict_1.default.ok(requestResult.success);
            const acceptResult = await community_carpool_service_1.communityCarpoolService.acceptRequest(createResult.data.id, requestResult.data.id, 'wrong-parent-' + Math.random().toString(36).slice(2));
            strict_1.default.ok(!acceptResult.success);
            strict_1.default.equal(acceptResult.error.code, 'UNAUTHORIZED');
        });
        (0, node_test_1.it)('should update seatsTaken when accepting request', async () => {
            const createResult = await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 1',
                sessionId: 'session1',
                sessionName: 'Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 3,
                pickupLocation: 'Location',
                pickupTime: '09:00',
                returnOffered: false,
            });
            strict_1.default.ok(createResult.success);
            const requestResult = await community_carpool_service_1.communityCarpoolService.requestCarpoolSeat({
                offerId: createResult.data.id,
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 2',
                childNames: ['Child 1', 'Child 2'],
                seatsRequested: 2,
            });
            strict_1.default.ok(requestResult.success);
            await community_carpool_service_1.communityCarpoolService.acceptRequest(createResult.data.id, requestResult.data.id, createResult.data.parentId);
            const offer = await community_carpool_service_1.communityCarpoolService.getCarpoolOffer(createResult.data.id);
            strict_1.default.ok(offer);
            strict_1.default.equal(offer.seatsTaken, 2);
        });
    });
    (0, node_test_1.describe)('declineRequest', () => {
        (0, node_test_1.it)('should return ok() and update request status', async () => {
            const createResult = await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 1',
                sessionId: 'session1',
                sessionName: 'Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 3,
                pickupLocation: 'Location',
                pickupTime: '09:00',
                returnOffered: false,
            });
            strict_1.default.ok(createResult.success);
            const requestResult = await community_carpool_service_1.communityCarpoolService.requestCarpoolSeat({
                offerId: createResult.data.id,
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 2',
                childNames: ['Child 1'],
                seatsRequested: 1,
            });
            strict_1.default.ok(requestResult.success);
            const declineResult = await community_carpool_service_1.communityCarpoolService.declineRequest(createResult.data.id, requestResult.data.id, createResult.data.parentId);
            strict_1.default.ok(declineResult.success);
            strict_1.default.equal(declineResult.data.status, 'DECLINED');
        });
    });
    (0, node_test_1.describe)('cancelOffer', () => {
        (0, node_test_1.it)('should return ok() and set status to CANCELLED', async () => {
            const createResult = await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 1',
                sessionId: 'session1',
                sessionName: 'Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 3,
                pickupLocation: 'Location',
                pickupTime: '09:00',
                returnOffered: false,
            });
            strict_1.default.ok(createResult.success);
            const cancelResult = await community_carpool_service_1.communityCarpoolService.cancelOffer(createResult.data.id, createResult.data.parentId);
            strict_1.default.ok(cancelResult.success);
            strict_1.default.equal(cancelResult.data.status, 'CANCELLED');
        });
        (0, node_test_1.it)('should return err() when not the offer owner', async () => {
            const createResult = await community_carpool_service_1.communityCarpoolService.createCarpoolOffer({
                parentId: 'parent-' + Math.random().toString(36).slice(2),
                parentName: 'Parent 1',
                sessionId: 'session1',
                sessionName: 'Training',
                sessionDate: '2026-02-15',
                seatsAvailable: 3,
                pickupLocation: 'Location',
                pickupTime: '09:00',
                returnOffered: false,
            });
            strict_1.default.ok(createResult.success);
            const cancelResult = await community_carpool_service_1.communityCarpoolService.cancelOffer(createResult.data.id, 'wrong-parent');
            strict_1.default.ok(!cancelResult.success);
            strict_1.default.equal(cancelResult.error.code, 'UNAUTHORIZED');
        });
    });
});
