/**
 * Community Carpool Service
 *
 * Handles carpool coordination: creating offers, requesting seats,
 * accepting/declining requests, and cancellation management.
 *
 * API Integration Notes:
 * - Carpool data is persisted via apiClient (AsyncStorage in dev, API in prod)
 */

import { CarpoolOffer, CarpoolRequest } from '@/constants/types';
import { apiClient } from '../api-client';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  validationError,
  conflictError,
  unauthorized,
  storageError,
} from '@/types/result';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { accountIdsMatch } from '@/utils/account-id';

const logger = createLogger('CommunityCarpoolService');

export interface CreateCarpoolOfferParams {
  parentId: string;
  parentName: string;
  parentAvatar?: string;
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  seatsAvailable: number;
  pickupLocation: string;
  pickupTime: string;
  returnOffered: boolean;
  returnTime?: string;
  notes?: string;
}

export interface RequestCarpoolSeatParams {
  offerId: string;
  parentId: string;
  parentName: string;
  parentAvatar?: string;
  childNames: string[];
  seatsRequested: number;
  message?: string;
}

// Mock data for initial state
const mockCarpoolOffers: CarpoolOffer[] = [
  {
    id: 'carpool_1',
    parentId: 'parent1',
    sessionId: 'session_1',
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
    sessionId: 'session_2',
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
  private inMemoryCarpools: CarpoolOffer[] = [...mockCarpoolOffers];

  /**
   * Get all carpool offers for a session
   */
  async getCarpoolOffers(sessionId: string): Promise<Result<CarpoolOffer[], ServiceError>> {
    try {
      const persisted = await apiClient.get<CarpoolOffer[]>(STORAGE_KEYS.CARPOOL_OFFERS, []);
      const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

      const filtered = allOffers.filter(
        (offer) => offer.sessionId === sessionId && offer.status === 'ACTIVE',
      );

      logger.info('carpool_offers_retrieved', { sessionId, count: filtered.length });
      return ok(filtered);
    } catch (error) {
      logger.error('Failed to get carpool offers', error);
      return err(storageError(`Failed to get carpool offers: ${String(error)}`));
    }
  }

  /**
   * Get all carpool offers created by a parent
   */
  async getParentCarpoolOffers(parentId: string): Promise<Result<CarpoolOffer[], ServiceError>> {
    try {
      const persisted = await apiClient.get<CarpoolOffer[]>(STORAGE_KEYS.CARPOOL_OFFERS, []);
      const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

      const filtered = allOffers.filter((offer) => accountIdsMatch(offer.parentId, parentId));

      logger.info('parent_carpool_offers_retrieved', { parentId, count: filtered.length });
      return ok(filtered);
    } catch (error) {
      logger.error('Failed to get parent carpool offers', error);
      return err(storageError(`Failed to get parent carpool offers: ${String(error)}`));
    }
  }

  /**
   * Get all available carpool offers (excluding user's own offers)
   */
  async getAvailableCarpoolOffers(
    excludeParentId: string,
  ): Promise<Result<CarpoolOffer[], ServiceError>> {
    try {
      const persisted = await apiClient.get<CarpoolOffer[]>(STORAGE_KEYS.CARPOOL_OFFERS, []);
      const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

      const filtered = allOffers.filter(
        (offer) =>
          !accountIdsMatch(offer.parentId, excludeParentId) &&
          offer.status === 'ACTIVE' &&
          offer.seatsAvailable > offer.seatsTaken,
      );

      logger.info('available_carpool_offers_retrieved', {
        excludeParentId,
        count: filtered.length,
      });
      return ok(filtered);
    } catch (error) {
      logger.error('Failed to get available carpool offers', error);
      return err(storageError(`Failed to get available carpool offers: ${String(error)}`));
    }
  }

  /**
   * Get a single carpool offer by ID
   */
  async getCarpoolOffer(offerId: string): Promise<Result<CarpoolOffer, ServiceError>> {
    try {
      const persisted = await apiClient.get<CarpoolOffer[]>(STORAGE_KEYS.CARPOOL_OFFERS, []);
      const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

      const offer = allOffers.find((offer) => offer.id === offerId);

      if (!offer) {
        return err(notFound('Carpool offer', offerId));
      }

      logger.info('carpool_offer_retrieved', { offerId });
      return ok(offer);
    } catch (error) {
      logger.error('Failed to get carpool offer', error);
      return err(storageError(`Failed to get carpool offer: ${String(error)}`));
    }
  }

  /**
   * Create a new carpool offer
   */
  async createCarpoolOffer(
    params: CreateCarpoolOfferParams,
  ): Promise<Result<CarpoolOffer, ServiceError>> {
    try {
      // Validation
      if (!params.parentId) {
        return err(validationError('Parent ID is required'));
      }
      if (!params.sessionId) {
        return err(validationError('Session ID is required'));
      }
      if (params.seatsAvailable < 1) {
        return err(validationError('At least 1 seat must be available'));
      }

      const timestamp = new Date().toISOString();

      const newOffer: CarpoolOffer = {
        id: `carpool_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        parentId: params.parentId,
        sessionId: params.sessionId,
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
      return ok(newOffer);
    } catch (error) {
      logger.error('Failed to create carpool offer', error);
      return err(storageError(`Failed to create carpool offer: ${String(error)}`));
    }
  }

  /**
   * Request a seat on a carpool offer
   */
  async requestCarpoolSeat(
    params: RequestCarpoolSeatParams,
  ): Promise<Result<CarpoolRequest, ServiceError>> {
    const persisted = await apiClient.get<CarpoolOffer[]>(STORAGE_KEYS.CARPOOL_OFFERS, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    const offerIndex = allOffers.findIndex((o) => o.id === params.offerId);
    if (offerIndex === -1) {
      return err(notFound('Carpool offer', params.offerId));
    }

    const offer = allOffers[offerIndex];

    // Check available seats
    if (offer.seatsAvailable - offer.seatsTaken < params.seatsRequested) {
      return err(validationError('Not enough seats available'));
    }

    // Check if already requested
    if (
      offer.requests.some(
        (r) => accountIdsMatch(r.parentId, params.parentId) && r.status === 'PENDING',
      )
    ) {
      return err(conflictError('You already have a pending request for this carpool'));
    }

    const newRequest: CarpoolRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      offerId: params.offerId,
      parentId: params.parentId,
      seatsRequested: params.seatsRequested,
      message: params.message,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    offer.requests.push(newRequest);
    offer.updatedAt = new Date().toISOString();

    this.inMemoryCarpools = allOffers;
    await this.persistCarpools();

    return ok(newRequest);
  }

  /**
   * Accept a carpool seat request
   */
  async acceptCarpoolRequest(
    offerId: string,
    requestId: string,
  ): Promise<Result<void, ServiceError>> {
    const persisted = await apiClient.get<CarpoolOffer[]>(STORAGE_KEYS.CARPOOL_OFFERS, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    const offer = allOffers.find((o) => o.id === offerId);
    if (!offer) {
      return err(notFound('Carpool offer', offerId));
    }

    const request = offer.requests.find((r) => r.id === requestId);
    if (!request) {
      return err(notFound('Request', requestId));
    }

    if (request.status !== 'PENDING') {
      return err(conflictError('Request has already been processed'));
    }

    // Check available seats
    if (offer.seatsAvailable - offer.seatsTaken < request.seatsRequested) {
      return err(validationError('Not enough seats available'));
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
    return ok(undefined);
  }

  /**
   * Decline a carpool seat request
   */
  async declineCarpoolRequest(
    offerId: string,
    requestId: string,
  ): Promise<Result<void, ServiceError>> {
    const persisted = await apiClient.get<CarpoolOffer[]>(STORAGE_KEYS.CARPOOL_OFFERS, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    const offer = allOffers.find((o) => o.id === offerId);
    if (!offer) {
      return err(notFound('Carpool offer', offerId));
    }

    const request = offer.requests.find((r) => r.id === requestId);
    if (!request) {
      return err(notFound('Request', requestId));
    }

    if (request.status !== 'PENDING') {
      return err(conflictError('Request has already been processed'));
    }

    request.status = 'DECLINED';
    request.respondedAt = new Date().toISOString();
    offer.updatedAt = new Date().toISOString();

    this.inMemoryCarpools = allOffers;
    await this.persistCarpools();
    return ok(undefined);
  }

  /**
   * Cancel a carpool offer
   */
  async cancelCarpoolOffer(offerId: string, parentId: string): Promise<Result<void, ServiceError>> {
    const persisted = await apiClient.get<CarpoolOffer[]>(STORAGE_KEYS.CARPOOL_OFFERS, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    const offer = allOffers.find((o) => o.id === offerId);
    if (!offer) {
      return err(notFound('Carpool offer', offerId));
    }

    if (!accountIdsMatch(offer.parentId, parentId)) {
      return err(unauthorized('Only the offer creator can cancel it'));
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
    return ok(undefined);
  }

  /**
   * Cancel a carpool seat request
   */
  async cancelCarpoolRequest(
    offerId: string,
    requestId: string,
    parentId: string,
  ): Promise<Result<void, ServiceError>> {
    const persisted = await apiClient.get<CarpoolOffer[]>(STORAGE_KEYS.CARPOOL_OFFERS, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    const offer = allOffers.find((o) => o.id === offerId);
    if (!offer) {
      return err(notFound('Carpool offer', offerId));
    }

    const request = offer.requests.find((r) => r.id === requestId);
    if (!request) {
      return err(notFound('Request', requestId));
    }

    if (!accountIdsMatch(request.parentId, parentId)) {
      return err(unauthorized('Only the requester can cancel their request'));
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
    return ok(undefined);
  }

  private async persistCarpools(): Promise<void> {
    await apiClient.set(STORAGE_KEYS.CARPOOL_OFFERS, this.inMemoryCarpools);
  }
}

export const communityCarpoolService = new CommunityCarpoolService();
