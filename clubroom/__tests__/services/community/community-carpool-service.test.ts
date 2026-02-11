import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { POC_ACCOUNT_IDS } from '@/constants/poc-accounts';
import { apiClient } from '@/services/api-client';
import { communityCarpoolService } from '@/services/community/community-carpool-service';
import type { Result, ServiceError } from '@/types/result';

function expectOk<T>(result: Result<T, ServiceError>): T {
  if (result.success) {
    return result.data;
  }
  assert.fail(`Expected ok() result, got error: ${result.error.code}`);
}

function expectErr<T>(result: Result<T, ServiceError>): ServiceError {
  if (!result.success) {
    return result.error;
  }
  assert.fail('Expected err() result, got ok()');
}

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

describe('communityCarpoolService', () => {
  beforeEach(async () => {
    seq = 0;
    await apiClient.remove(STORAGE_KEYS.CARPOOL_OFFERS);
  });

  it('creates carpool offer with ACTIVE status and zero seats taken', async () => {
    const created = expectOk(await communityCarpoolService.createCarpoolOffer({
      parentId: nextId('parent'),
      parentName: 'Parent A',
      sessionId: nextId('session'),
      sessionName: 'Saturday Training',
      sessionDate: '2026-03-01',
      seatsAvailable: 3,
      pickupLocation: 'North Gate',
      pickupTime: '09:00',
      returnOffered: true,
      returnTime: '11:00',
    }));

    assert.ok(created.id.length > 0);
    assert.equal(created.status, 'ACTIVE');
    assert.equal(created.seatsTaken, 0);
    assert.equal(created.requests.length, 0);
  });

  it('rejects invalid offer input when no seats are available', async () => {
    const error = expectErr(await communityCarpoolService.createCarpoolOffer({
      parentId: nextId('parent'),
      parentName: 'Parent A',
      sessionId: nextId('session'),
      sessionName: 'Saturday Training',
      sessionDate: '2026-03-01',
      seatsAvailable: 0,
      pickupLocation: 'North Gate',
      pickupTime: '09:00',
      returnOffered: false,
    }));

    assert.equal(error.code, 'VALIDATION');
  });

  it('returns session offers as Result and includes newly created offer', async () => {
    const sessionId = nextId('session');
    const created = expectOk(await communityCarpoolService.createCarpoolOffer({
      parentId: nextId('parent'),
      parentName: 'Parent A',
      sessionId,
      sessionName: 'Saturday Training',
      sessionDate: '2026-03-01',
      seatsAvailable: 2,
      pickupLocation: 'North Gate',
      pickupTime: '09:00',
      returnOffered: false,
    }));

    const offers = expectOk(await communityCarpoolService.getCarpoolOffers(sessionId));
    assert.ok(offers.some((offer) => offer.id === created.id));
  });

  it('accepts request and updates seats and offer status to FULL when capacity reached', async () => {
    const offer = expectOk(await communityCarpoolService.createCarpoolOffer({
      parentId: nextId('parent'),
      parentName: 'Parent A',
      sessionId: nextId('session'),
      sessionName: 'Saturday Training',
      sessionDate: '2026-03-01',
      seatsAvailable: 1,
      pickupLocation: 'North Gate',
      pickupTime: '09:00',
      returnOffered: false,
    }));

    const request = expectOk(await communityCarpoolService.requestCarpoolSeat({
      offerId: offer.id,
      parentId: nextId('parent'),
      parentName: 'Parent B',
      childNames: ['Child B'],
      seatsRequested: 1,
    }));

    expectOk(await communityCarpoolService.acceptCarpoolRequest(offer.id, request.id));

    const updatedOffer = expectOk(await communityCarpoolService.getCarpoolOffer(offer.id));
    const acceptedRequest = updatedOffer.requests.find((item) => item.id === request.id);

    assert.equal(updatedOffer.seatsTaken, 1);
    assert.equal(updatedOffer.status, 'FULL');
    assert.equal(acceptedRequest?.status, 'ACCEPTED');
  });

  it('declines request and keeps it in request list as DECLINED', async () => {
    const offer = expectOk(await communityCarpoolService.createCarpoolOffer({
      parentId: nextId('parent'),
      parentName: 'Parent A',
      sessionId: nextId('session'),
      sessionName: 'Saturday Training',
      sessionDate: '2026-03-01',
      seatsAvailable: 2,
      pickupLocation: 'North Gate',
      pickupTime: '09:00',
      returnOffered: false,
    }));

    const request = expectOk(await communityCarpoolService.requestCarpoolSeat({
      offerId: offer.id,
      parentId: nextId('parent'),
      parentName: 'Parent B',
      childNames: ['Child B'],
      seatsRequested: 1,
    }));

    expectOk(await communityCarpoolService.declineCarpoolRequest(offer.id, request.id));

    const updatedOffer = expectOk(await communityCarpoolService.getCarpoolOffer(offer.id));
    const declinedRequest = updatedOffer.requests.find((item) => item.id === request.id);
    assert.equal(declinedRequest?.status, 'DECLINED');
  });

  it('rejects cancellation when caller is not the offer owner', async () => {
    const offer = expectOk(await communityCarpoolService.createCarpoolOffer({
      parentId: nextId('parent'),
      parentName: 'Parent A',
      sessionId: nextId('session'),
      sessionName: 'Saturday Training',
      sessionDate: '2026-03-01',
      seatsAvailable: 2,
      pickupLocation: 'North Gate',
      pickupTime: '09:00',
      returnOffered: false,
    }));

    const error = expectErr(await communityCarpoolService.cancelCarpoolOffer(offer.id, nextId('parent')));
    assert.equal(error.code, 'UNAUTHORIZED');
  });

  it('cancels an accepted request and frees up the taken seat', async () => {
    const ownerId = nextId('parent');
    const requesterId = nextId('parent');
    const offer = expectOk(await communityCarpoolService.createCarpoolOffer({
      parentId: ownerId,
      parentName: 'Parent A',
      sessionId: nextId('session'),
      sessionName: 'Saturday Training',
      sessionDate: '2026-03-01',
      seatsAvailable: 1,
      pickupLocation: 'North Gate',
      pickupTime: '09:00',
      returnOffered: false,
    }));

    const request = expectOk(await communityCarpoolService.requestCarpoolSeat({
      offerId: offer.id,
      parentId: requesterId,
      parentName: 'Parent B',
      childNames: ['Child B'],
      seatsRequested: 1,
    }));
    expectOk(await communityCarpoolService.acceptCarpoolRequest(offer.id, request.id));
    expectOk(await communityCarpoolService.cancelCarpoolRequest(offer.id, request.id, requesterId));

    const updatedOffer = expectOk(await communityCarpoolService.getCarpoolOffer(offer.id));
    const cancelledRequest = updatedOffer.requests.find((item) => item.id === request.id);

    assert.equal(updatedOffer.seatsTaken, 0);
    assert.equal(updatedOffer.status, 'ACTIVE');
    assert.equal(cancelledRequest?.status, 'CANCELLED');
  });

  it('supports canonical account aliases in owner/requester authorization', async () => {
    const offer = expectOk(await communityCarpoolService.createCarpoolOffer({
      parentId: POC_ACCOUNT_IDS.coachStorage,
      parentName: 'Coach Alias',
      sessionId: nextId('session'),
      sessionName: 'Sunday Session',
      sessionDate: '2026-03-08',
      seatsAvailable: 1,
      pickupLocation: 'South Gate',
      pickupTime: '10:00',
      returnOffered: false,
    }));

    const request = expectOk(await communityCarpoolService.requestCarpoolSeat({
      offerId: offer.id,
      parentId: POC_ACCOUNT_IDS.athleteStorage,
      parentName: 'Athlete Alias',
      childNames: ['Alias Child'],
      seatsRequested: 1,
    }));

    expectOk(await communityCarpoolService.acceptCarpoolRequest(offer.id, request.id));
    expectOk(await communityCarpoolService.cancelCarpoolOffer(offer.id, POC_ACCOUNT_IDS.coach));
    expectOk(await communityCarpoolService.cancelCarpoolRequest(offer.id, request.id, POC_ACCOUNT_IDS.athlete));
  });
});
