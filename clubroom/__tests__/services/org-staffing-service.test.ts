import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { orgStaffingService } from '@/services/org-staffing-service';
import { socialFeedService } from '@/services/social-feed-service';
import type { Booking, SessionOffering, User } from '@/constants/types';

function makeOffering(id: string, overrides: Partial<SessionOffering> = {}): SessionOffering {
  return {
    id,
    coachId: 'coach1',
    clubId: 'club_lions',
    actingAs: 'club',
    title: 'Club Session',
    sessionType: '1on1',
    maxParticipants: 8,
    location: 'Main Pitch',
    scheduledAt: '2030-03-10T18:00:00.000Z',
    isRecurring: false,
    recurrenceType: 'none',
    status: 'active',
    registrations: [],
    createdAt: '2030-03-01T09:00:00.000Z',
    ...overrides,
  };
}

function makeBooking(id: string, overrides: Partial<Booking> = {}): Booking {
  return {
    id,
    coachId: 'coach1',
    coachName: 'Director Kelly',
    clubId: 'club_lions',
    actingAs: 'club',
    athleteIds: ['athlete_1'],
    athleteNames: ['Athlete One'],
    bookedById: 'parent_1',
    bookedByName: 'Parent One',
    status: 'CONFIRMED',
    scheduledAt: '2030-03-10T18:00:00.000Z',
    location: 'Main Pitch',
    service: 'Club Session',
    serviceType: 'COACHING',
    sessionSource: 'direct',
    sessionSourceEntityId: 'offering_assigned',
    createdAt: '2030-03-01T09:00:00.000Z',
    ...overrides,
  };
}

async function withApiMode<T>(run: () => Promise<T>): Promise<T> {
  const originalDescriptor = Object.getOwnPropertyDescriptor(apiClient, 'isMockMode');
  Object.defineProperty(apiClient, 'isMockMode', {
    configurable: true,
    get: () => false,
  });

  try {
    return await run();
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(apiClient, 'isMockMode', originalDescriptor);
    } else {
      delete (apiClient as unknown as { isMockMode?: boolean }).isMockMode;
    }
  }
}

describe('orgStaffingService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_OFFERINGS);
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.USERS);
  });

  it('loads staff, workload, and only club-owned work for the selected org', async () => {
    const users: User[] = [
      {
        id: 'coach1',
        name: 'Director Kelly',
        email: 'kelly@example.com',
        postcode: '',
        dateOfBirth: '1980-01-01',
        role: 'COACH',
      },
      {
        id: 'coach2',
        name: 'Jess Okafor',
        email: 'jess@example.com',
        postcode: '',
        dateOfBirth: '1986-01-01',
        role: 'COACH',
      },
    ];

    const offerings: SessionOffering[] = [
      makeOffering('offering_unassigned', {
        title: 'Unassigned Session',
        assigneeCoachId: undefined,
        ownerCoachId: 'coach1',
      }),
      makeOffering('offering_assigned', {
        title: 'Assigned Session',
        coachId: 'coach2',
        ownerCoachId: 'coach2',
        assigneeCoachId: 'coach2',
      }),
      makeOffering('offering_self', {
        actingAs: 'self',
        clubId: undefined,
        title: 'Independent Session',
      }),
      makeOffering('offering_other_club', {
        clubId: 'club_eagles',
        title: 'Other Club Session',
      }),
    ];

    const bookings: Booking[] = [
      makeBooking('booking_linked', {
        sessionSourceEntityId: 'offering_assigned',
        coachId: 'coach2',
        coachName: 'Jess Okafor',
        ownerCoachId: 'coach2',
        assigneeCoachId: 'coach2',
      }),
      makeBooking('booking_independent', {
        actingAs: 'self',
        clubId: undefined,
        sessionSourceEntityId: 'offering_self',
      }),
    ];

    await apiClient.set(STORAGE_KEYS.USERS, users);
    await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, offerings);
    await apiClient.set(STORAGE_KEYS.BOOKINGS, bookings);

    const result = await orgStaffingService.getConsoleData('club_lions', 'coach1');

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.viewerMembership.role, 'OWNER');
    assert.equal(result.data.canManageAssignments, true);
    assert.equal(result.data.summary.activeOrgSessions, 2);
    assert.equal(result.data.summary.unassignedCount, 1);
    assert.equal(result.data.unassignedWork[0]?.offeringId, 'offering_unassigned');
    assert.equal(result.data.assignedWork[0]?.offeringId, 'offering_assigned');
    assert.equal(result.data.assignedWork[0]?.linkedBookingCount, 1);
    assert.ok(result.data.staff.some((member) => member.userId === 'coach2'));
  });

  it('fails closed in API mode instead of reading local staffing authority', async () => {
    await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [
      makeOffering('offering_api_console', {
        title: 'API Console Session',
        assigneeCoachId: undefined,
        ownerCoachId: 'coach1',
      }),
    ]);

    await withApiMode(async () => {
      const result = await orgStaffingService.getConsoleData('club_lions', 'coach1');

      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'VALIDATION');
      assert.match(result.error.message, /backend assignment authority/i);
    });
  });

  it('reassigns org-owned work and propagates new delivery truth into linked bookings', async () => {
    const users: User[] = [
      {
        id: 'coach1',
        name: 'Director Kelly',
        email: 'kelly@example.com',
        postcode: '',
        dateOfBirth: '1980-01-01',
        role: 'COACH',
      },
      {
        id: 'coach2',
        name: 'Jess Okafor',
        email: 'jess@example.com',
        postcode: '',
        dateOfBirth: '1986-01-01',
        role: 'COACH',
      },
    ];

    await apiClient.set(STORAGE_KEYS.USERS, users);
    await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [
      makeOffering('offering_assigned', {
        title: 'Assigned Session',
        coachId: 'coach1',
        ownerCoachId: 'coach1',
        assigneeCoachId: 'coach1',
      }),
    ]);
    await apiClient.set(STORAGE_KEYS.BOOKINGS, [
      makeBooking('booking_linked', {
        sessionSourceEntityId: 'offering_assigned',
        coachId: 'coach1',
        coachName: 'Director Kelly',
        ownerCoachId: 'coach1',
        assigneeCoachId: 'coach1',
      }),
    ]);

    const result = await orgStaffingService.assignOffering({
      clubId: 'club_lions',
      offeringId: 'offering_assigned',
      assigneeCoachId: 'coach2',
      actorUserId: 'coach1',
      actorRole: 'COACH',
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.deepEqual(result.data.updatedBookingIds, ['booking_linked']);

    const storedOfferings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
    const storedBookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const updatedOffering = storedOfferings.find((offering) => offering.id === 'offering_assigned');
    const updatedBooking = storedBookings.find((booking) => booking.id === 'booking_linked');

    assert.equal(updatedOffering?.coachId, 'coach2');
    assert.equal(updatedOffering?.assigneeCoachId, 'coach2');
    assert.equal(updatedBooking?.coachId, 'coach2');
    assert.equal(updatedBooking?.coachName, 'Jess Okafor');
    assert.equal(updatedBooking?.assigneeCoachId, 'coach2');
  });

  it('fails closed in API mode instead of mutating local club assignment state', async () => {
    await apiClient.set(STORAGE_KEYS.USERS, [
      {
        id: 'coach2',
        name: 'Jess Okafor',
        email: 'jess@example.com',
        postcode: '',
        dateOfBirth: '1986-01-01',
        role: 'COACH',
      },
    ] satisfies User[]);
    await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [
      makeOffering('offering_api_assignment', {
        title: 'API Assignment Session',
        coachId: 'coach1',
        ownerCoachId: 'coach1',
        assigneeCoachId: 'coach1',
      }),
    ]);
    await apiClient.set(STORAGE_KEYS.BOOKINGS, [
      makeBooking('booking_api_assignment', {
        sessionSourceEntityId: 'offering_api_assignment',
        coachId: 'coach1',
        coachName: 'Director Kelly',
        ownerCoachId: 'coach1',
        assigneeCoachId: 'coach1',
      }),
    ]);

    await withApiMode(async () => {
      const result = await orgStaffingService.assignOffering({
        clubId: 'club_lions',
        offeringId: 'offering_api_assignment',
        assigneeCoachId: 'coach2',
        actorUserId: 'coach1',
        actorRole: 'COACH',
      });

      assert.equal(result.success, false);
      if (result.success) return;

      assert.equal(result.error.code, 'VALIDATION');
      assert.match(result.error.message, /backend assignment authority/i);
    });

    const storedOfferings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
    const storedBookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
    const unchangedOffering = storedOfferings.find(
      (offering) => offering.id === 'offering_api_assignment',
    );
    const unchangedBooking = storedBookings.find(
      (booking) => booking.id === 'booking_api_assignment',
    );

    assert.equal(unchangedOffering?.coachId, 'coach1');
    assert.equal(unchangedOffering?.assigneeCoachId, 'coach1');
    assert.equal(unchangedBooking?.coachId, 'coach1');
    assert.equal(unchangedBooking?.assigneeCoachId, 'coach1');
  });

  it('blocks reassignment when the actor does not have club assignment authority', async () => {
    await apiClient.set(STORAGE_KEYS.USERS, [
      {
        id: 'coach2',
        name: 'Jess Okafor',
        email: 'jess@example.com',
        postcode: '',
        dateOfBirth: '1986-01-01',
        role: 'COACH',
      },
    ] satisfies User[]);
    await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [
      makeOffering('offering_assigned', {
        coachId: 'coach1',
        ownerCoachId: 'coach1',
        assigneeCoachId: 'coach1',
      }),
    ]);

    const result = await orgStaffingService.assignOffering({
      clubId: 'club_lions',
      offeringId: 'offering_assigned',
      assigneeCoachId: 'coach2',
      actorUserId: 'coach2',
      actorRole: 'COACH',
    });

    assert.equal(result.success, false);
    if (result.success) return;

    assert.equal(result.error.code, 'UNAUTHORIZED');
  });

  it('allows active head coaches to assign club work', async () => {
    const joinResult = socialFeedService.joinClub('coach3', 'LIONS-CLUB', 'HEAD_COACH');
    assert.equal(joinResult.success, true);

    await apiClient.set(STORAGE_KEYS.USERS, [
      {
        id: 'coach2',
        name: 'Jess Okafor',
        email: 'jess@example.com',
        postcode: '',
        dateOfBirth: '1986-01-01',
        role: 'COACH',
      },
      {
        id: 'coach3',
        name: 'Rita Walsh',
        email: 'rita@example.com',
        postcode: '',
        dateOfBirth: '1984-01-01',
        role: 'COACH',
      },
    ] satisfies User[]);
    await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, [
      makeOffering('offering_head_coach', {
        coachId: 'coach1',
        ownerCoachId: 'coach1',
        assigneeCoachId: 'coach1',
      }),
    ]);

    const result = await orgStaffingService.assignOffering({
      clubId: 'club_lions',
      offeringId: 'offering_head_coach',
      assigneeCoachId: 'coach2',
      actorUserId: 'coach3',
      actorRole: 'COACH',
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    const storedOfferings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
    const updatedOffering = storedOfferings.find((offering) => offering.id === 'offering_head_coach');

    assert.equal(updatedOffering?.assigneeCoachId, 'coach2');
    assert.equal(updatedOffering?.ownerCoachId, 'coach2');
  });
});
