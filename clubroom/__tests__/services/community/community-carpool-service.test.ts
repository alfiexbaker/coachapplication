import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { communityCarpoolService } from '@/services/community/community-carpool-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('CommunityCarpoolService', () => {
  beforeEach(async () => {
    // Clear storage using storageService (not apiClient) since carpool uses storageService
    await storageService.removeItem(STORAGE_KEYS.CARPOOL_OFFERS);
  });

  describe('createCarpoolOffer', () => {
    it('should return ok() with created carpool offer', async () => {
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

      const result = await communityCarpoolService.createCarpoolOffer(params);

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.equal(result.data.parentId, params.parentId);
      assert.equal(result.data.seatsAvailable, 3);
      assert.equal(result.data.seatsTaken, 0);
      assert.equal(result.data.status, 'ACTIVE');
    });

    it('should return err() when seatsAvailable is invalid', async () => {
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

      const result = await communityCarpoolService.createCarpoolOffer(params);

      assert.ok(!result.success);
      assert.equal(result.error.code, 'VALIDATION_ERROR');
    });

    it('should initialize empty request arrays', async () => {
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

      const result = await communityCarpoolService.createCarpoolOffer(params);

      assert.ok(result.success);
      assert.ok(Array.isArray(result.data.requests));
      assert.ok(Array.isArray(result.data.acceptedRequests));
      assert.equal(result.data.requests.length, 0);
    });
  });

  describe('getCarpoolOffers', () => {
    it('should return offers for specific session', async () => {
      const sessionId = 'session-' + Math.random().toString(36).slice(2);

      await communityCarpoolService.createCarpoolOffer({
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

      const offers = await communityCarpoolService.getCarpoolOffers(sessionId);

      assert.ok(Array.isArray(offers));
      assert.ok(offers.length > 0);
      assert.equal(offers[0].sessionId, sessionId);
    });

    it('should return empty array for session with no offers', async () => {
      const sessionId = 'session-nonexistent-' + Math.random().toString(36).slice(2);
      const offers = await communityCarpoolService.getCarpoolOffers(sessionId);

      assert.ok(Array.isArray(offers));
      assert.equal(offers.length, 0);
    });
  });

  describe('requestCarpoolSeat', () => {
    it('should return ok() and create request', async () => {
      const createResult = await communityCarpoolService.createCarpoolOffer({
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

      assert.ok(createResult.success);

      const requestResult = await communityCarpoolService.requestCarpoolSeat({
        offerId: createResult.data.id,
        parentId: 'parent-' + Math.random().toString(36).slice(2),
        parentName: 'Parent 2',
        childNames: ['Child 1'],
        seatsRequested: 1,
      });

      assert.ok(requestResult.success);
      assert.ok(requestResult.data.id);
      assert.equal(requestResult.data.status, 'PENDING');
    });

    it('should return err() for non-existent offer', async () => {
      const result = await communityCarpoolService.requestCarpoolSeat({
        offerId: 'fake-offer-' + Math.random().toString(36).slice(2),
        parentId: 'parent1',
        parentName: 'Parent',
        childNames: ['Child'],
        seatsRequested: 1,
      });

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    it('should return err() when seats requested exceed available', async () => {
      const createResult = await communityCarpoolService.createCarpoolOffer({
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

      assert.ok(createResult.success);

      const requestResult = await communityCarpoolService.requestCarpoolSeat({
        offerId: createResult.data.id,
        parentId: 'parent2',
        parentName: 'Parent 2',
        childNames: ['Child 1', 'Child 2'],
        seatsRequested: 2,
      });

      assert.ok(!requestResult.success);
      assert.equal(requestResult.error.code, 'CONFLICT');
    });
  });

  describe('acceptRequest', () => {
    it('should return ok() and update request status', async () => {
      const createResult = await communityCarpoolService.createCarpoolOffer({
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

      assert.ok(createResult.success);

      const requestResult = await communityCarpoolService.requestCarpoolSeat({
        offerId: createResult.data.id,
        parentId: 'parent-' + Math.random().toString(36).slice(2),
        parentName: 'Parent 2',
        childNames: ['Child 1'],
        seatsRequested: 1,
      });

      assert.ok(requestResult.success);

      const acceptResult = await communityCarpoolService.acceptRequest(
        createResult.data.id,
        requestResult.data.id,
        createResult.data.parentId
      );

      assert.ok(acceptResult.success);
      assert.equal(acceptResult.data.status, 'ACCEPTED');
    });

    it('should return err() for non-existent offer', async () => {
      const result = await communityCarpoolService.acceptRequest(
        'fake-offer-' + Math.random().toString(36).slice(2),
        'fake-request',
        'parent1'
      );

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    it('should return err() when not the offer owner', async () => {
      const createResult = await communityCarpoolService.createCarpoolOffer({
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

      assert.ok(createResult.success);

      const requestResult = await communityCarpoolService.requestCarpoolSeat({
        offerId: createResult.data.id,
        parentId: 'parent-' + Math.random().toString(36).slice(2),
        parentName: 'Parent 2',
        childNames: ['Child 1'],
        seatsRequested: 1,
      });

      assert.ok(requestResult.success);

      const acceptResult = await communityCarpoolService.acceptRequest(
        createResult.data.id,
        requestResult.data.id,
        'wrong-parent-' + Math.random().toString(36).slice(2)
      );

      assert.ok(!acceptResult.success);
      assert.equal(acceptResult.error.code, 'UNAUTHORIZED');
    });

    it('should update seatsTaken when accepting request', async () => {
      const createResult = await communityCarpoolService.createCarpoolOffer({
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

      assert.ok(createResult.success);

      const requestResult = await communityCarpoolService.requestCarpoolSeat({
        offerId: createResult.data.id,
        parentId: 'parent-' + Math.random().toString(36).slice(2),
        parentName: 'Parent 2',
        childNames: ['Child 1', 'Child 2'],
        seatsRequested: 2,
      });

      assert.ok(requestResult.success);

      await communityCarpoolService.acceptRequest(
        createResult.data.id,
        requestResult.data.id,
        createResult.data.parentId
      );

      const offer = await communityCarpoolService.getCarpoolOffer(createResult.data.id);
      assert.ok(offer);
      assert.equal(offer.seatsTaken, 2);
    });
  });

  describe('declineRequest', () => {
    it('should return ok() and update request status', async () => {
      const createResult = await communityCarpoolService.createCarpoolOffer({
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

      assert.ok(createResult.success);

      const requestResult = await communityCarpoolService.requestCarpoolSeat({
        offerId: createResult.data.id,
        parentId: 'parent-' + Math.random().toString(36).slice(2),
        parentName: 'Parent 2',
        childNames: ['Child 1'],
        seatsRequested: 1,
      });

      assert.ok(requestResult.success);

      const declineResult = await communityCarpoolService.declineRequest(
        createResult.data.id,
        requestResult.data.id,
        createResult.data.parentId
      );

      assert.ok(declineResult.success);
      assert.equal(declineResult.data.status, 'DECLINED');
    });
  });

  describe('cancelOffer', () => {
    it('should return ok() and set status to CANCELLED', async () => {
      const createResult = await communityCarpoolService.createCarpoolOffer({
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

      assert.ok(createResult.success);

      const cancelResult = await communityCarpoolService.cancelOffer(
        createResult.data.id,
        createResult.data.parentId
      );

      assert.ok(cancelResult.success);
      assert.equal(cancelResult.data.status, 'CANCELLED');
    });

    it('should return err() when not the offer owner', async () => {
      const createResult = await communityCarpoolService.createCarpoolOffer({
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

      assert.ok(createResult.success);

      const cancelResult = await communityCarpoolService.cancelOffer(
        createResult.data.id,
        'wrong-parent'
      );

      assert.ok(!cancelResult.success);
      assert.equal(cancelResult.error.code, 'UNAUTHORIZED');
    });
  });
});
