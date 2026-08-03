import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { api } from '@/constants/config';
import { addLocalStaffingMetrics, orgStaffingService } from '@/services/org-staffing-service';
import type { StaffingConsoleResponse } from '../../packages/shared-contracts/src/club/staffing';

function makeResponse(params: { today: string; tomorrow: string }): StaffingConsoleResponse {
  const baseWork = {
    title: 'Club Session',
    location: null,
    isVirtual: false,
    status: 'active' as const,
    sessionType: 'group' as const,
    currentParticipants: 4,
    maxParticipants: 12,
    createdByUserId: 'usr_owner',
    createdByName: null,
    assigneeCoachId: 'usr_coach',
    assigneeCoachName: 'Coach One',
    linkedBookingCount: 4,
    isRecurring: false,
  };

  return {
    club: { id: 'clb_123', name: 'Riverside FC' },
    viewerMembership: {
      clubId: 'clb_123',
      userId: 'usr_owner',
      role: 'OWNER',
      status: 'active',
    },
    privilegedAdminAccess: false,
    canManageAssignments: true,
    staff: [
      {
        userId: 'usr_coach',
        label: 'Coach One',
        role: 'COACH',
        status: 'active',
        canTakeAssignments: true,
        upcomingLoad: 2,
        nextSessionAt: params.today,
      },
      {
        userId: 'usr_head_coach',
        label: 'Head Coach',
        role: 'HEAD_COACH',
        status: 'active',
        canTakeAssignments: true,
        upcomingLoad: 0,
        nextSessionAt: null,
      },
    ],
    unassignedWork: [
      {
        ...baseWork,
        offeringId: 'gse_unassigned',
        scheduledAt: null,
        assigneeCoachId: null,
        assigneeCoachName: null,
      },
    ],
    assignedWork: [
      { ...baseWork, offeringId: 'gse_today', scheduledAt: params.today },
      { ...baseWork, offeringId: 'gse_tomorrow', scheduledAt: params.tomorrow },
    ],
    summary: {
      activeOrgSessions: 3,
      upcomingAssignedLoad: 2,
      unassignedCount: 1,
    },
    clubId: 'clb_123',
    requestId: 'req_123',
  };
}

describe('orgStaffingService', () => {
  it('derives Today workload in the device timezone without altering API truth', () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString();
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      12,
    ).toISOString();

    const data = addLocalStaffingMetrics(makeResponse({ today, tomorrow }));

    assert.equal(data.summary.assignedToday, 1);
    assert.equal(data.staff[0]?.assignedToday, 1);
    assert.equal(data.staff[1]?.assignedToday, 0);
    assert.equal(data.unassignedWork[0]?.scheduledAt, null);
    assert.equal(data.unassignedWork[0]?.location, null);
  });

  it('fails closed in explicit mock mode instead of reading local staffing authority', async (t) => {
    const descriptor = Object.getOwnPropertyDescriptor(api, 'useMock');
    Object.defineProperty(api, 'useMock', {
      configurable: true,
      value: true,
    });
    t.after(() => {
      if (descriptor) Object.defineProperty(api, 'useMock', descriptor);
    });

    const result = await orgStaffingService.getConsoleData('clb_123', 'usr_owner');

    assert.equal(result.success, false);
    assert.equal(result.success ? null : result.error.code, 'VALIDATION');
    assert.match(result.success ? '' : result.error.message, /requires live \/v1 API data/i);
  });

  it('fails closed in explicit mock mode instead of writing local assignments', async (t) => {
    const descriptor = Object.getOwnPropertyDescriptor(api, 'useMock');
    Object.defineProperty(api, 'useMock', {
      configurable: true,
      value: true,
    });
    t.after(() => {
      if (descriptor) Object.defineProperty(api, 'useMock', descriptor);
    });

    const result = await orgStaffingService.assignOffering({
      clubId: 'clb_123',
      offeringId: 'gse_123',
      assigneeCoachId: 'usr_coach',
      actorUserId: 'usr_owner',
    });

    assert.equal(result.success, false);
    assert.equal(result.success ? null : result.error.code, 'VALIDATION');
    assert.match(result.success ? '' : result.error.message, /requires live \/v1 API data/i);
  });
});
