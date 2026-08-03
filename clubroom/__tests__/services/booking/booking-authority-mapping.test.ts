import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Booking } from '@/constants/app-types';
import {
  mapApiBookingToBooking,
  type ApiBookingResponse,
} from '@/services/booking/booking-authority-service';

const baseApiBooking: ApiBookingResponse = {
  id: 'booking_authoritative',
  coachUserId: 'usr_coach_authoritative',
  clubId: null,
  bookedByUserId: 'usr_parent_authoritative',
  recurringSeriesId: null,
  groupSessionId: null,
  status: 'CONFIRMED',
  scheduledAt: '2030-07-06T10:00:00.000Z',
  durationMinutes: 60,
  location: 'API pitch',
  serviceType: 'one_to_one',
  sessionTemplateId: null,
  objectives: ['Scanning'],
  notes: null,
  priceMinor: null,
  currency: 'GBP',
  participants: [
    {
      athleteId: 'ath_authoritative',
      guardianUserId: 'usr_parent_authoritative',
      status: 'confirmed',
    },
  ],
  version: 4,
  createdAt: '2030-07-01T10:00:00.000Z',
  updatedAt: '2030-07-02T10:00:00.000Z',
  cancelledAt: null,
  requestExpiresAt: '2030-07-02T10:00:00.000Z',
  requestResolvedAt: null,
  requestResolutionReason: null,
};

describe('booking API authority mapping', () => {
  it('does not retain legacy local fields when the API clears or replaces them', () => {
    const staleLocalBooking: Booking = {
      id: baseApiBooking.id,
      coachId: 'usr_stale_coach',
      clubId: 'clb_stale',
      athleteIds: ['ath_stale'],
      athleteId: 'ath_stale',
      bookedById: 'usr_stale_parent',
      status: 'CANCELLED',
      scheduledAt: '2020-01-01T00:00:00.000Z',
      duration: 30,
      location: 'Stale pitch',
      serviceType: 'stale_service',
      sessionTemplateId: 'template_stale',
      objectives: ['Stale objective'],
      notes: 'Stale note',
      price: 999,
      cancellationReason: 'Stale cancellation',
      cancelledBy: 'usr_stale_parent',
      cancelReason: 'Stale cancellation',
      statusBeforeCancellation: 'CONFIRMED',
      recurringBookingId: 'rec_stale',
      seriesId: 'rec_stale',
      groupSessionId: 'gse_stale',
      sessionSource: 'group',
      sessionSourceEntityId: 'gse_stale',
    };
    const legacyCall = mapApiBookingToBooking as unknown as (
      apiBooking: ApiBookingResponse,
      localBooking: Booking,
    ) => Booking;

    const mapped = legacyCall(baseApiBooking, staleLocalBooking);

    assert.equal(mapped.coachId, baseApiBooking.coachUserId);
    assert.deepEqual(mapped.athleteIds, ['ath_authoritative']);
    assert.equal(mapped.athleteId, 'ath_authoritative');
    assert.equal(mapped.bookedById, baseApiBooking.bookedByUserId);
    assert.equal(mapped.location, baseApiBooking.location);
    assert.equal(mapped.clubId, undefined);
    assert.equal(mapped.sessionTemplateId, undefined);
    assert.equal(mapped.notes, undefined);
    assert.equal(mapped.price, undefined);
    assert.equal(mapped.cancellationReason, undefined);
    assert.equal(mapped.cancelledBy, undefined);
    assert.equal(mapped.cancelReason, undefined);
    assert.equal(mapped.statusBeforeCancellation, undefined);
    assert.equal(mapped.recurringBookingId, undefined);
    assert.equal(mapped.groupSessionId, undefined);
    assert.equal(mapped.sessionSource, 'direct');
    assert.equal(mapped.sessionSourceEntityId, undefined);
    assert.equal(mapped.requestExpiresAt, baseApiBooking.requestExpiresAt);
    assert.equal(mapped.requestResolvedAt, undefined);
    assert.equal(mapped.requestResolutionReason, undefined);
    assert.equal(mapped.participants?.[0]?.guardianUserId, 'usr_parent_authoritative');
  });

  it('derives group and recurring linkage only from the API response', () => {
    const mapped = mapApiBookingToBooking({
      ...baseApiBooking,
      recurringSeriesId: 'rec_authoritative',
      groupSessionId: 'gse_authoritative',
      priceMinor: 3750,
      participants: [
        ...baseApiBooking.participants,
        {
          athleteId: 'ath_authoritative_two',
          guardianUserId: 'usr_parent_authoritative',
          status: 'pending',
        },
      ],
    });

    assert.equal(mapped.price, 37.5);
    assert.equal(mapped.recurringBookingId, 'rec_authoritative');
    assert.equal(mapped.seriesId, 'rec_authoritative');
    assert.equal(mapped.isRecurringGenerated, true);
    assert.equal(mapped.groupSessionId, 'gse_authoritative');
    assert.equal(mapped.isGroupSession, true);
    assert.equal(mapped.sessionSource, 'group');
    assert.equal(mapped.sessionSourceEntityId, 'gse_authoritative');
    assert.equal(mapped.isSharedSession, true);
  });
});
