/**
 * Integration: Invite -> RSVP Chain
 *
 * Tests the invite lifecycle: createInvite -> getPendingInvites -> acceptInvite
 * Verifies cross-service interaction between session-invite-service and booking-crud-service.
 */

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import {
  sessionInviteService,
  type CreateInviteInput,
} from '@/services/invite/session-invite-service';
import { availabilityService } from '@/services/availability-service';

/**
 * Seed availability templates so the invite slot validation passes.
 * 2030-07-01 = Monday (dayOfWeek 1), 2030-07-03 = Wednesday (dayOfWeek 3).
 */
async function seedAvailability(coachId: string): Promise<void> {
  await availabilityService.saveTemplate({
    coachId,
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '20:00',
    isRecurring: true,
    maxConcurrent: 1,
    bufferMinutes: 0,
    location: 'Hackney Marshes',
  });
  await availabilityService.saveTemplate({
    coachId,
    dayOfWeek: 3,
    startTime: '08:00',
    endTime: '20:00',
    isRecurring: true,
    maxConcurrent: 1,
    bufferMinutes: 0,
    location: 'Victoria Park',
  });
}

function makeInviteInput(tag: string, overrides: Partial<CreateInviteInput> = {}): Omit<CreateInviteInput, 'athleteIds' | 'athleteNames'> & { athleteNames: string[] } {
  return {
    coachId: `coach-${tag}`,
    coachName: `Coach ${tag}`,
    parentId: `parent-${tag}`,
    parentName: `Parent ${tag}`,
    proposedSlots: [
      {
        date: '2030-07-01',
        startTime: '10:00',
        endTime: '11:00',
        location: 'Hackney Marshes',
      },
      {
        date: '2030-07-03',
        startTime: '14:00',
        endTime: '15:00',
        location: 'Victoria Park',
      },
    ],
    sessionType: '1:1 Coaching',
    focus: 'Finishing drills',
    price: 25,
    duration: 60,
    athleteNames: [`Athlete ${tag}`],
    ...overrides,
  };
}

describe('Integration: Invite -> RSVP Chain', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_INVITES);
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.INVITE_SLOT_HOLDS);
    await apiClient.remove(STORAGE_KEYS.NOTIFICATIONS);
    await apiClient.remove(STORAGE_KEYS.COACH_SESSIONS);
    await apiClient.remove(STORAGE_KEYS.AVAILABILITY_TEMPLATES);
    await apiClient.remove(STORAGE_KEYS.AVAILABILITY_OVERRIDES);
    await apiClient.remove(STORAGE_KEYS.BLOCKED_DATES);
    // Clear the in-memory cache
    await sessionInviteService.clearCache();
  });

  it('full flow: create invite -> verify pending -> accept with slot -> booking created', async () => {
    // Seed availability so slot validation passes
    await seedAvailability('coach-inv1');

    // Step 1: Create an invite
    const createResult = await sessionInviteService.createInvite(
      ['athlete-inv1'],
      makeInviteInput('inv1'),
    );
    assert.equal(createResult.success, true, 'createInvite should succeed');
    if (!createResult.success) return;

    const invite = createResult.data;
    assert.ok(invite.id, 'invite should have an id');
    assert.equal(invite.status, 'PENDING');
    assert.equal(invite.coachId, 'coach-inv1');
    assert.deepEqual(invite.athleteIds, ['athlete-inv1']);
    assert.equal(invite.proposedSlots.length, 2);

    // Step 2: Get pending invites -> verify it appears
    const pendingInvites = await sessionInviteService.getPendingInvites('parent-inv1');
    const found = pendingInvites.find((inv) => inv.id === invite.id);
    assert.ok(found, 'created invite should appear in pending invites');
    assert.equal(found!.status, 'PENDING');

    // Step 3: Accept the invite with the first proposed slot
    const selectedSlot = invite.proposedSlots[0];
    const acceptResult = await sessionInviteService.acceptInvite(invite.id, selectedSlot);
    assert.equal(acceptResult.success, true, 'acceptInvite should succeed');
    if (!acceptResult.success) return;

    const acceptedInvite = acceptResult.data;
    assert.equal(acceptedInvite.status, 'ACCEPTED');
    assert.ok(acceptedInvite.respondedAt, 'should have respondedAt timestamp');
    assert.ok(acceptedInvite.bookingId, 'accepted invite should have a bookingId');

    // Step 4: Verify a booking was actually created
    const bookings = await apiClient.get<Array<{ id: string; coachId: string; status: string }>>(
      STORAGE_KEYS.BOOKINGS,
      [],
    );
    const linkedBooking = bookings.find((b) => b.id === acceptedInvite.bookingId);
    assert.ok(linkedBooking, 'a booking should exist for the accepted invite');
    assert.equal(linkedBooking!.coachId, 'coach-inv1');
    assert.equal(linkedBooking!.status, 'CONFIRMED');
  });

  it('decline invite -> verify status change and no booking created', async () => {
    await seedAvailability('coach-dec1');

    const createResult = await sessionInviteService.createInvite(
      ['athlete-dec1'],
      makeInviteInput('dec1'),
    );
    assert.equal(createResult.success, true);
    if (!createResult.success) return;

    const declineResult = await sessionInviteService.declineInvite(createResult.data.id);
    assert.equal(declineResult.success, true, 'declineInvite should succeed');
    if (!declineResult.success) return;

    assert.equal(declineResult.data.status, 'DECLINED');

    // Verify no booking was created
    const bookings = await apiClient.get<Array<{ id: string; sessionInviteId?: string }>>(
      STORAGE_KEYS.BOOKINGS,
      [],
    );
    const linked = bookings.find((b) => b.sessionInviteId === createResult.data.id);
    assert.equal(linked, undefined, 'no booking should exist for a declined invite');
  });

  it('accepted invite no longer shows in pending list', async () => {
    await seedAvailability('coach-pend1');

    const createResult = await sessionInviteService.createInvite(
      ['athlete-pend1'],
      makeInviteInput('pend1'),
    );
    assert.equal(createResult.success, true);
    if (!createResult.success) return;

    // Accept it
    const slot = createResult.data.proposedSlots[0];
    await sessionInviteService.acceptInvite(createResult.data.id, slot);

    // Pending list should no longer contain it
    const pending = await sessionInviteService.getPendingInvites('parent-pend1');
    const found = pending.find((inv) => inv.id === createResult.data.id);
    assert.equal(found, undefined, 'accepted invite should not appear in pending list');
  });

  it('getInvite returns full invite by ID', async () => {
    await seedAvailability('coach-get1');

    const createResult = await sessionInviteService.createInvite(
      ['athlete-get1'],
      makeInviteInput('get1'),
    );
    assert.equal(createResult.success, true);
    if (!createResult.success) return;

    const fetched = await sessionInviteService.getInvite(createResult.data.id);
    assert.ok(fetched, 'getInvite should return the invite');
    assert.equal(fetched!.id, createResult.data.id);
    assert.equal(fetched!.focus, 'Finishing drills');
  });
});
