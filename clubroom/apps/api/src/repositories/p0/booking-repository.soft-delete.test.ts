import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  getMarketplaceSeedStore,
  resetMarketplaceSeedStoreForTests,
} from '../../lib/marketplace-seed-store.js';
import { resolveBookingRepository } from './booking-repository.js';

type SeedRow = Record<string, unknown>;

const rows = (value: unknown): SeedRow[] => (Array.isArray(value) ? value : []);
const text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

describe('booking repository soft-delete reads', () => {
  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
  });

  it('excludes retired bookings from list and detail reads', async () => {
    const tables = getMarketplaceSeedStore().tables;
    const source = rows(tables.bookings).find(
      (booking) => text(booking.coachUserId) && !text(booking.deletedAt),
    );
    assert.ok(source, 'expected an active seeded booking');

    const coachUserId = text(source.coachUserId);
    assert.ok(coachUserId, 'expected a seeded booking coach');
    const retiredId = 'bok_soft_deleted_read_test';
    rows(tables.bookings).push({
      ...source,
      id: retiredId,
      deletedAt: new Date().toISOString(),
      deletedByUserId: coachUserId,
    });

    const repository = resolveBookingRepository();
    const list = await repository.listVisibleBookings({ authUserId: coachUserId });

    assert.equal(list.bookings.some((booking) => booking.id === retiredId), false);
    await assert.rejects(
      () =>
        repository.getVisibleBookingById({
          authUserId: coachUserId,
          bookingId: retiredId,
        }),
      (error: unknown) =>
        Boolean(
          error &&
            typeof error === 'object' &&
            'status' in error &&
            error.status === 404,
        ),
    );
  });

  it('does not grant booking access through a retired participant link', async () => {
    const tables = getMarketplaceSeedStore().tables;
    const guardianLink = rows(tables.guardianChildLinks).find(
      (link) => text(link.guardianUserId) && text(link.athleteId) && !text(link.deletedAt),
    );
    const coachUserId = text(
      rows(tables.bookings).find((booking) => text(booking.coachUserId))?.coachUserId,
    );
    const guardianUserId = text(guardianLink?.guardianUserId);
    const athleteId = text(guardianLink?.athleteId);
    assert.ok(coachUserId && guardianUserId && athleteId, 'expected seeded relationship context');

    const now = new Date().toISOString();
    const bookingId = 'bok_retired_participant_read_test';
    rows(tables.bookings).push({
      id: bookingId,
      coachUserId,
      bookedByUserId: null,
      status: 'CONFIRMED',
      scheduledAt: now,
      durationMinutes: 60,
      location: 'Test pitch',
      serviceType: 'one_to_one',
      priceMinor: 0,
      currency: 'GBP',
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      deletedByUserId: null,
    });
    rows(tables.bookingParticipants).push({
      id: 'bkp_retired_participant_read_test',
      bookingId,
      athleteId,
      guardianUserId,
      status: 'confirmed',
      createdByUserId: coachUserId,
      updatedByUserId: coachUserId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      deletedAt: now,
      deletedByUserId: coachUserId,
    });

    const repository = resolveBookingRepository();
    const list = await repository.listVisibleBookings({ authUserId: guardianUserId });

    assert.equal(list.bookings.some((booking) => booking.id === bookingId), false);
    await assert.rejects(
      () =>
        repository.getVisibleBookingById({
          authUserId: guardianUserId,
          bookingId,
        }),
      (error: unknown) =>
        Boolean(
          error &&
            typeof error === 'object' &&
            'status' in error &&
            error.status === 403,
        ),
    );
  });
});
