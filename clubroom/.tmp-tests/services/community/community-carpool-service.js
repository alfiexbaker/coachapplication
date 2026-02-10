"use strict";
/**
 * Community Carpool Service
 *
 * Handles carpool coordination: creating offers, requesting seats,
 * accepting/declining requests, and cancellation management.
 *
 * API Integration Notes:
 * - Carpool data is persisted via apiClient (AsyncStorage in dev, API in prod)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityCarpoolService = void 0;
const api_client_1 = require("../api-client");
const result_1 = require("@/types/result");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('CommunityCarpoolService');
// Mock data for initial state
const mockCarpoolOffers = [
    {
        id: 'carpool_1',
        parentId: 'parent1',
        parentName: 'John Henderson',
        sessionId: 'session_1',
        sessionName: 'Saturday Training',
        sessionDate: '2024-01-27',
        seatsAvailable: 3,
        seatsTaken: 1,
        pickupLocation: 'High Street Car Park',
        pickupTime: '09:00',
        returnOffered: true,
        returnTime: '12:00',
        notes: 'Will pick up from the main entrance',
        status: 'ACTIVE',
        requests: [
            {
                id: 'req_1',
                offerId: 'carpool_1',
                parentId: 'parent2',
                parentName: 'Lisa Wilson',
                childNames: ['James Wilson'],
                seatsRequested: 1,
                status: 'ACCEPTED',
                requestedAt: '2024-01-20T10:00:00Z',
                respondedAt: '2024-01-20T11:00:00Z',
            },
        ],
        acceptedRequests: [
            {
                id: 'req_1',
                offerId: 'carpool_1',
                parentId: 'parent2',
                parentName: 'Lisa Wilson',
                childNames: ['James Wilson'],
                seatsRequested: 1,
                status: 'ACCEPTED',
                requestedAt: '2024-01-20T10:00:00Z',
                respondedAt: '2024-01-20T11:00:00Z',
            },
        ],
        createdAt: '2024-01-19T09:00:00Z',
        updatedAt: '2024-01-20T11:00:00Z',
    },
    {
        id: 'carpool_2',
        parentId: 'parent2',
        parentName: 'Lisa Wilson',
        sessionId: 'session_2',
        sessionName: 'Sunday Match',
        sessionDate: '2024-01-28',
        seatsAvailable: 2,
        seatsTaken: 0,
        pickupLocation: 'Community Centre',
        pickupTime: '13:30',
        returnOffered: false,
        notes: 'Return to be arranged separately',
        status: 'ACTIVE',
        requests: [],
        acceptedRequests: [],
        createdAt: '2024-01-20T08:00:00Z',
        updatedAt: '2024-01-20T08:00:00Z',
    },
];
class CommunityCarpoolService {
    constructor() {
        this.inMemoryCarpools = [...mockCarpoolOffers];
    }
    /**
     * Get all carpool offers for a session
     */
    async getCarpoolOffers(sessionId) {
        try {
            const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS, []);
            const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;
            const filtered = allOffers.filter((offer) => offer.sessionId === sessionId && offer.status === 'ACTIVE');
            logger.info('carpool_offers_retrieved', { sessionId, count: filtered.length });
            return (0, result_1.ok)(filtered);
        }
        catch (error) {
            logger.error('Failed to get carpool offers', error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to get carpool offers: ${String(error)}`));
        }
    }
    /**
     * Get all carpool offers created by a parent
     */
    async getParentCarpoolOffers(parentId) {
        try {
            const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS, []);
            const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;
            const filtered = allOffers.filter((offer) => offer.parentId === parentId);
            logger.info('parent_carpool_offers_retrieved', { parentId, count: filtered.length });
            return (0, result_1.ok)(filtered);
        }
        catch (error) {
            logger.error('Failed to get parent carpool offers', error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to get parent carpool offers: ${String(error)}`));
        }
    }
    /**
     * Get all available carpool offers (excluding user's own offers)
     */
    async getAvailableCarpoolOffers(excludeParentId) {
        try {
            const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS, []);
            const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;
            const filtered = allOffers.filter((offer) => offer.parentId !== excludeParentId &&
                offer.status === 'ACTIVE' &&
                offer.seatsAvailable > offer.seatsTaken);
            logger.info('available_carpool_offers_retrieved', { excludeParentId, count: filtered.length });
            return (0, result_1.ok)(filtered);
        }
        catch (error) {
            logger.error('Failed to get available carpool offers', error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to get available carpool offers: ${String(error)}`));
        }
    }
    /**
     * Get a single carpool offer by ID
     */
    async getCarpoolOffer(offerId) {
        try {
            const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS, []);
            const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;
            const offer = allOffers.find((offer) => offer.id === offerId);
            if (!offer) {
                return (0, result_1.err)((0, result_1.notFound)('Carpool offer', offerId));
            }
            logger.info('carpool_offer_retrieved', { offerId });
            return (0, result_1.ok)(offer);
        }
        catch (error) {
            logger.error('Failed to get carpool offer', error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to get carpool offer: ${String(error)}`));
        }
    }
    /**
     * Create a new carpool offer
     */
    async createCarpoolOffer(params) {
        try {
            // Validation
            if (!params.parentId) {
                return (0, result_1.err)((0, result_1.validationError)('Parent ID is required'));
            }
            if (!params.sessionId) {
                return (0, result_1.err)((0, result_1.validationError)('Session ID is required'));
            }
            if (params.seatsAvailable < 1) {
                return (0, result_1.err)((0, result_1.validationError)('At least 1 seat must be available'));
            }
            const timestamp = new Date().toISOString();
            const newOffer = {
                id: `carpool_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                parentId: params.parentId,
                parentName: params.parentName,
                parentAvatar: params.parentAvatar,
                sessionId: params.sessionId,
                sessionName: params.sessionName,
                sessionDate: params.sessionDate,
                seatsAvailable: params.seatsAvailable,
                seatsTaken: 0,
                pickupLocation: params.pickupLocation,
                pickupTime: params.pickupTime,
                returnOffered: params.returnOffered,
                returnTime: params.returnTime,
                notes: params.notes,
                status: 'ACTIVE',
                requests: [],
                acceptedRequests: [],
                createdAt: timestamp,
                updatedAt: timestamp,
            };
            this.inMemoryCarpools.push(newOffer);
            await this.persistCarpools();
            logger.info('carpool_offer_created', { offerId: newOffer.id, sessionId: params.sessionId });
            return (0, result_1.ok)(newOffer);
        }
        catch (error) {
            logger.error('Failed to create carpool offer', error);
            return (0, result_1.err)((0, result_1.storageError)(`Failed to create carpool offer: ${String(error)}`));
        }
    }
    /**
     * Request a seat on a carpool offer
     */
    async requestCarpoolSeat(params) {
        const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS, []);
        const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;
        const offerIndex = allOffers.findIndex((o) => o.id === params.offerId);
        if (offerIndex === -1) {
            return (0, result_1.err)((0, result_1.notFound)('Carpool offer', params.offerId));
        }
        const offer = allOffers[offerIndex];
        // Check available seats
        if (offer.seatsAvailable - offer.seatsTaken < params.seatsRequested) {
            return (0, result_1.err)((0, result_1.validationError)('Not enough seats available'));
        }
        // Check if already requested
        if (offer.requests.some((r) => r.parentId === params.parentId && r.status === 'PENDING')) {
            return (0, result_1.err)((0, result_1.conflictError)('You already have a pending request for this carpool'));
        }
        const newRequest = {
            id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            offerId: params.offerId,
            parentId: params.parentId,
            parentName: params.parentName,
            parentAvatar: params.parentAvatar,
            childNames: params.childNames,
            seatsRequested: params.seatsRequested,
            message: params.message,
            status: 'PENDING',
            requestedAt: new Date().toISOString(),
        };
        offer.requests.push(newRequest);
        offer.updatedAt = new Date().toISOString();
        this.inMemoryCarpools = allOffers;
        await this.persistCarpools();
        return (0, result_1.ok)(newRequest);
    }
    /**
     * Accept a carpool seat request
     */
    async acceptCarpoolRequest(offerId, requestId) {
        const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS, []);
        const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;
        const offer = allOffers.find((o) => o.id === offerId);
        if (!offer) {
            return (0, result_1.err)((0, result_1.notFound)('Carpool offer', offerId));
        }
        const request = offer.requests.find((r) => r.id === requestId);
        if (!request) {
            return (0, result_1.err)((0, result_1.notFound)('Request', requestId));
        }
        if (request.status !== 'PENDING') {
            return (0, result_1.err)((0, result_1.conflictError)('Request has already been processed'));
        }
        // Check available seats
        if (offer.seatsAvailable - offer.seatsTaken < request.seatsRequested) {
            return (0, result_1.err)((0, result_1.validationError)('Not enough seats available'));
        }
        request.status = 'ACCEPTED';
        request.respondedAt = new Date().toISOString();
        offer.seatsTaken += request.seatsRequested;
        offer.acceptedRequests.push(request);
        offer.updatedAt = new Date().toISOString();
        // Update status if full
        if (offer.seatsTaken >= offer.seatsAvailable) {
            offer.status = 'FULL';
        }
        this.inMemoryCarpools = allOffers;
        await this.persistCarpools();
        return (0, result_1.ok)(undefined);
    }
    /**
     * Decline a carpool seat request
     */
    async declineCarpoolRequest(offerId, requestId) {
        const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS, []);
        const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;
        const offer = allOffers.find((o) => o.id === offerId);
        if (!offer) {
            return (0, result_1.err)((0, result_1.notFound)('Carpool offer', offerId));
        }
        const request = offer.requests.find((r) => r.id === requestId);
        if (!request) {
            return (0, result_1.err)((0, result_1.notFound)('Request', requestId));
        }
        if (request.status !== 'PENDING') {
            return (0, result_1.err)((0, result_1.conflictError)('Request has already been processed'));
        }
        request.status = 'DECLINED';
        request.respondedAt = new Date().toISOString();
        offer.updatedAt = new Date().toISOString();
        this.inMemoryCarpools = allOffers;
        await this.persistCarpools();
        return (0, result_1.ok)(undefined);
    }
    /**
     * Cancel a carpool offer
     */
    async cancelCarpoolOffer(offerId, parentId) {
        const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS, []);
        const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;
        const offer = allOffers.find((o) => o.id === offerId);
        if (!offer) {
            return (0, result_1.err)((0, result_1.notFound)('Carpool offer', offerId));
        }
        if (offer.parentId !== parentId) {
            return (0, result_1.err)((0, result_1.unauthorized)('Only the offer creator can cancel it'));
        }
        offer.status = 'CANCELLED';
        offer.updatedAt = new Date().toISOString();
        // Cancel all pending requests
        offer.requests.forEach((request) => {
            if (request.status === 'PENDING') {
                request.status = 'CANCELLED';
                request.respondedAt = new Date().toISOString();
            }
        });
        this.inMemoryCarpools = allOffers;
        await this.persistCarpools();
        return (0, result_1.ok)(undefined);
    }
    /**
     * Cancel a carpool seat request
     */
    async cancelCarpoolRequest(offerId, requestId, parentId) {
        const persisted = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS, []);
        const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;
        const offer = allOffers.find((o) => o.id === offerId);
        if (!offer) {
            return (0, result_1.err)((0, result_1.notFound)('Carpool offer', offerId));
        }
        const request = offer.requests.find((r) => r.id === requestId);
        if (!request) {
            return (0, result_1.err)((0, result_1.notFound)('Request', requestId));
        }
        if (request.parentId !== parentId) {
            return (0, result_1.err)((0, result_1.unauthorized)('Only the requester can cancel their request'));
        }
        // If request was accepted, free up seats
        if (request.status === 'ACCEPTED') {
            offer.seatsTaken -= request.seatsRequested;
            offer.acceptedRequests = offer.acceptedRequests.filter((r) => r.id !== requestId);
            // Update status if no longer full
            if (offer.status === 'FULL') {
                offer.status = 'ACTIVE';
            }
        }
        request.status = 'CANCELLED';
        request.respondedAt = new Date().toISOString();
        offer.updatedAt = new Date().toISOString();
        this.inMemoryCarpools = allOffers;
        await this.persistCarpools();
        return (0, result_1.ok)(undefined);
    }
    async persistCarpools() {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CARPOOL_OFFERS, this.inMemoryCarpools);
    }
}
exports.communityCarpoolService = new CommunityCarpoolService();
