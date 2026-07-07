import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { ChildProfile } from '@/services/child-service';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('familyMemberService API mode', () => {
  it('child profile API reads reject missing auth context instead of empty state', async () => {
    const [{ childService }, { apiClient }] = await Promise.all([
      import('@/services/child-service'),
      import('@/services/api-client'),
    ]);

    await apiClient.remove(STORAGE_KEYS.AUTH_USER);

    await assert.rejects(
      () => childService.getChildren('usr_parent_no_session'),
      /sign in to view child profiles/i,
    );
    await assert.rejects(
      () => childService.getChild('ath_no_session'),
      /sign in to view athlete profile/i,
    );
  });

  it('surfaces backend family read failures instead of empty API-mode state', async () => {
    const [{ familyMemberService }, { childService }] = await Promise.all([
      import('@/services/family/family-member-service'),
      import('@/services/child-service'),
    ]);

    const originalGetChildren = childService.getChildren;
    const originalGetChild = childService.getChild;
    childService.getChildren = async () => {
      throw new Error('children api down');
    };
    childService.getChild = async () => {
      throw new Error('athlete detail api down');
    };

    try {
      await assert.rejects(
        () => familyMemberService.getFamilyMembers('usr_parent_family_down'),
        /children api down/,
      );
      await assert.rejects(
        () =>
          familyMemberService.getFamilyCalendar('usr_parent_family_down', {
            startDate: '2030-01-01T00:00:00.000Z',
            endDate: '2030-01-31T23:59:59.999Z',
          }),
        /children api down/,
      );
      await assert.rejects(
        () => familyMemberService.getFamilyOverview('usr_parent_family_down'),
        /children api down/,
      );
      await assert.rejects(
        () => familyMemberService.getChildProgress('ath_family_down'),
        /athlete detail api down/,
      );
    } finally {
      childService.getChildren = originalGetChildren;
      childService.getChild = originalGetChild;
    }
  });

  it('maps child progress from backend athlete analytics instead of fabricated local values', async () => {
    const [
      { familyMemberService },
      { childService },
      { analyticsQueryService },
      { bookingService },
    ] = await Promise.all([
      import('@/services/family/family-member-service'),
      import('@/services/child-service'),
      import('@/services/analytics/analytics-query-service'),
      import('@/services/booking'),
    ]);

    const originalGetChild = childService.getChild;
    const originalGetAthleteAnalytics = analyticsQueryService.getAthleteAnalytics;
    const originalListBookings = bookingService.list;
    const analyticsCalls: Array<{ athleteId: string; period: string }> = [];

    childService.getChild = async (childId: string): Promise<ChildProfile | null> => {
      assert.equal(childId, 'ath_api_child_progress');
      return {
        id: childId,
        parentId: 'usr_parent_progress',
        firstName: 'API',
        lastName: 'Athlete',
        dateOfBirth: '2014-05-12',
        gender: 'PREFER_NOT_TO_SAY',
        relationship: 'OTHER',
        primaryPosition: 'MID',
        disabilities: [],
        specialNeeds: [],
        hasSpecialNeeds: false,
        allergies: [],
        medicalConditions: [],
        medications: [],
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRelation: '',
        photoConsent: true,
        videoConsent: true,
        socialMediaConsent: false,
        emergencyTreatmentConsent: true,
        createdAt: '2026-07-01T09:00:00.000Z',
        updatedAt: '2026-07-01T09:00:00.000Z',
      };
    };
    analyticsQueryService.getAthleteAnalytics = async (athleteId, period) => {
      const requestedPeriod = period ?? 'MONTH';
      analyticsCalls.push({ athleteId, period: requestedPeriod });
      return {
        success: true,
        data: {
          athleteId,
          period: requestedPeriod,
          totalSessions: 7,
          sessionsThisPeriod: 3,
          averageSessionRating: 4.8,
          attendanceRate: 92,
          skills: [
            {
              skillName: 'Passing',
              category: 'Technical',
              currentLevel: 81,
              previousLevel: 76,
              changePercent: 6.6,
              history: [{ date: '2026-07-01', level: 81 }],
            },
          ],
          activeGoals: [
            {
              id: 'goal_active_api',
              userId: athleteId,
              athleteId,
              title: 'Improve passing range',
              category: 'BALL_SKILLS',
              status: 'ACTIVE',
              progress: 30,
              createdBy: 'COACH',
              createdById: 'usr_coach_progress',
              createdAt: '2026-07-01T09:00:00.000Z',
              updatedAt: '2026-07-01T09:00:00.000Z',
              milestones: [],
            },
          ],
          completedGoals: [
            {
              id: 'goal_complete_api',
              userId: athleteId,
              athleteId,
              title: 'Complete first session block',
              category: 'OTHER',
              status: 'COMPLETED',
              progress: 100,
              createdBy: 'COACH',
              createdById: 'usr_coach_progress',
              createdAt: '2026-06-01T09:00:00.000Z',
              updatedAt: '2026-07-01T09:00:00.000Z',
              milestones: [],
            },
          ],
          improvementRate: 14,
          consistencyScore: 88,
          percentileRank: 72,
          lastSessionDate: '2026-07-02T16:00:00.000Z',
          nextSessionDate: '2026-07-09T16:00:00.000Z',
        },
      } as Awaited<ReturnType<typeof analyticsQueryService.getAthleteAnalytics>>;
    };
    bookingService.list = async () => {
      throw new Error('booking mirrors should not be read for API-mode child progress');
    };

    try {
      const progress = await familyMemberService.getChildProgress('ath_api_child_progress');

      assert.deepEqual(analyticsCalls, [
        { athleteId: 'ath_api_child_progress', period: 'ALL' },
      ]);
      assert.deepEqual(progress, {
        childId: 'ath_api_child_progress',
        sessionsCompleted: 7,
        averageRating: 4.8,
        badgesEarned: 0,
        activeGoals: 1,
        completedGoals: 1,
        lastSessionDate: '2026-07-02T16:00:00.000Z',
        nextSessionDate: '2026-07-09T16:00:00.000Z',
        skillProgress: [{ skill: 'Passing', level: 81, change: 6.6 }],
      });
    } finally {
      childService.getChild = originalGetChild;
      analyticsQueryService.getAthleteAnalytics = originalGetAthleteAnalytics;
      bookingService.list = originalListBookings;
    }
  });
});
