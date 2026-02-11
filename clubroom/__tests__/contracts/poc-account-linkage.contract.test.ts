import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { User } from '@/constants/types';
import { POC_ACCOUNT_IDS } from '@/constants/poc-accounts';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { bookingService } from '@/services/booking-service';
import { coachService } from '@/services/coach-service';
import { communityGroupService } from '@/services/community/community-group-service';
import { familyService } from '@/services/family';
import { sessionInviteService } from '@/services/invite/session-invite-service';
import { userService } from '@/services/user-service';

const POC_USERS: User[] = [
  {
    id: POC_ACCOUNT_IDS.parent,
    email: 'parent1@clubroom.local',
    role: 'USER',
    name: 'Parent One',
    postcode: 'E1 1AA',
    dateOfBirth: '1988-01-01',
  },
  {
    id: POC_ACCOUNT_IDS.coachStorage,
    email: 'coach1@clubroom.local',
    role: 'COACH',
    name: 'Coach One',
    postcode: 'SW1A 1AA',
    dateOfBirth: '1990-01-01',
  },
];

describe('POC account linkage contract', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.USERS);
    await apiClient.remove(STORAGE_KEYS.AUTH_USER);
    await apiClient.remove(STORAGE_KEYS.BOOKINGS);
    await apiClient.remove(STORAGE_KEYS.SESSION_INVITES);
    await apiClient.remove(STORAGE_KEYS.PARENT_GROUPS);
    await apiClient.remove(STORAGE_KEYS.GROUP_INVITES);
    await sessionInviteService.clearCache();
    (communityGroupService as unknown as { inMemoryGroups: unknown[] }).inMemoryGroups = [];
    await familyService.seedDemoData();
  });

  it('resolves coach profile using canonical and storage aliases', async () => {
    const canonical = await coachService.getCoach(POC_ACCOUNT_IDS.coach);
    const storageId = await coachService.getCoach(POC_ACCOUNT_IDS.coachStorage);

    assert.equal(canonical.success, true);
    assert.equal(storageId.success, true);
    if (!canonical.success || !storageId.success) return;

    assert.equal(canonical.data.id, POC_ACCOUNT_IDS.coachStorage);
    assert.equal(storageId.data.id, POC_ACCOUNT_IDS.coachStorage);
  });

  it('keeps family mock graph linked to parent1 and child seed id', async () => {
    const members = await familyService.getFamilyMembers(POC_ACCOUNT_IDS.parent);

    assert.ok(members.length > 0);
    assert.ok(members.some((member) => member.id === POC_ACCOUNT_IDS.childSeed));
  });

  it('creates booking through service path with canonical POC account IDs', async () => {
    const result = await bookingService.createBooking({
      coachId: POC_ACCOUNT_IDS.coach,
      coachName: 'Coach One',
      athleteIds: [POC_ACCOUNT_IDS.athlete],
      athleteNames: ['Athlete One'],
      bookedById: POC_ACCOUNT_IDS.parent,
      bookedByName: 'Parent One',
      scheduledAt: '2030-06-20T10:00:00.000Z',
      duration: 60,
      location: 'Main Pitch',
      service: '1-on-1 Coaching',
      serviceType: 'COACHING',
      skipAvailabilityValidation: true,
    });

    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.coachId, POC_ACCOUNT_IDS.coach);
    assert.equal(result.data.bookedById, POC_ACCOUNT_IDS.parent);
    assert.equal(result.data.athleteId, POC_ACCOUNT_IDS.athlete);
  });

  it('resolves canonical seeded users via userService', async () => {
    await apiClient.set(STORAGE_KEYS.USERS, POC_USERS);

    const parent = await userService.getUserById(POC_ACCOUNT_IDS.parent);
    const coach = await userService.getUserById(POC_ACCOUNT_IDS.coachStorage);

    assert.equal(parent.success, true);
    assert.equal(coach.success, true);
  });

  it('keeps invite lookup linked across canonical and storage aliases', async () => {
    const created = await sessionInviteService.createInvite(POC_ACCOUNT_IDS.athleteStorage, {
      coachId: POC_ACCOUNT_IDS.coachStorage,
      coachName: 'Coach Alias',
      parentId: POC_ACCOUNT_IDS.parent,
      parentName: 'Parent Alias',
      athleteNames: 'Athlete Alias',
      proposedSlots: [],
      sessionType: '1:1 Coaching',
      focus: 'Passing',
    });
    assert.equal(created.success, true);
    if (!created.success) return;

    const coachInvites = await sessionInviteService.getCoachInvites(POC_ACCOUNT_IDS.coach);
    const parentInvites = await sessionInviteService.getParentInvites(POC_ACCOUNT_IDS.parent);

    assert.ok(coachInvites.length >= 1);
    assert.ok(parentInvites.length >= 1);
    assert.ok(coachInvites.some((invite) => invite.id === created.data.id));
    assert.ok(parentInvites.some((invite) => invite.id === created.data.id));
  });

  it('keeps community group membership linked across aliases', async () => {
    const created = await communityGroupService.createGroup({
      name: 'POC Alias Group',
      description: 'Alias compatibility contract',
      type: 'GENERAL',
      memberIds: [],
      memberNames: [],
      creatorId: POC_ACCOUNT_IDS.coachStorage,
      creatorName: 'Coach Alias',
      isPublic: true,
    });
    assert.equal(created.success, true);
    if (!created.success) return;

    const groupsByCanonical = await communityGroupService.getParentGroups(POC_ACCOUNT_IDS.coach);
    assert.equal(groupsByCanonical.success, true);
    if (!groupsByCanonical.success) return;

    assert.equal(groupsByCanonical.data.length, 1);
  });
});
