import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { ChildProfile } from '@/services/child-service';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('familyMemberService API mode', () => {
  it('initializes local family fixture caches empty outside mock mode', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'services/family/family-member-service.ts'),
      'utf8',
    );

    assert.ok(
      source.includes(
        'let mockFamilyMembers = USE_MOCK ? MOCK_FAMILY_MEMBERS.map((member) => ({ ...member })) : []',
      ),
    );
    assert.ok(
      source.includes(
        'let mockFamilyBookings = USE_MOCK ? MOCK_FAMILY_BOOKINGS.map((booking) => ({ ...booking })) : []',
      ),
    );
  });

  it('initializes local child fixture cache empty outside mock mode', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'services/child-service.ts'), 'utf8');

    assert.ok(
      source.includes(
        'let childrenCache: ChildProfile[] = USE_MOCK ? cloneChildProfiles(MOCK_CHILDREN) : []',
      ),
    );
    assert.ok(
      source.includes('childrenCache = USE_MOCK ? cloneChildProfiles(MOCK_CHILDREN) : []'),
    );
  });

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

  it('does not fall back to mock child profiles when API reads fail', async (t) => {
    const [{ childService }, { authService }] = await Promise.all([
      import('@/services/child-service'),
      import('@/services/auth-service'),
    ]);

    const auth = authService as unknown as {
      getCurrentUser: typeof authService.getCurrentUser;
    };
    const original = {
      getCurrentUser: auth.getCurrentUser,
      fetch: globalThis.fetch,
    };
    const fetchCalls: string[] = [];

    childService.__resetMockChildren();
    auth.getCurrentUser = async () =>
      ({
        id: 'usr_parent_child_api',
        email: 'parent.child.api@example.test',
        accountType: 'PARENT',
        firstName: 'Parent',
        lastName: 'API',
        isVerified: true,
        onboardingComplete: true,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      }) as Awaited<ReturnType<typeof authService.getCurrentUser>>;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      fetchCalls.push(url.pathname);

      if (url.pathname === '/v1/me') {
        return new Response(
          JSON.stringify({
            linkedFamilies: [{ familyId: 'fam_child_api', role: 'guardian' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.pathname === '/v1/families/fam_child_api') {
        return new Response(JSON.stringify({ message: 'family api down' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (url.pathname === '/v1/athletes/ath_user1') {
        return new Response(JSON.stringify({ message: 'athlete api down' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ message: `unexpected ${url.pathname}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    t.after(() => {
      auth.getCurrentUser = original.getCurrentUser;
      globalThis.fetch = original.fetch;
    });

    await assert.rejects(() => childService.getChildren('user4'), /family api down/i);
    await assert.rejects(() => childService.getChild('user1'), /athlete api down/i);
    assert.deepEqual(fetchCalls, [
      '/v1/me',
      '/v1/families/fam_child_api',
      '/v1/athletes/ath_user1',
    ]);
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

  it('surfaces backend child update failures instead of returning null', async () => {
    const [{ familyMemberService }, { childService }, { err, serviceError }] = await Promise.all([
      import('@/services/family/family-member-service'),
      import('@/services/child-service'),
      import('@/types/result'),
    ]);

    const originalGetChild = childService.getChild;
    const originalUpdateChild = childService.updateChild;
    const apiChild: ChildProfile = {
      id: 'ath_family_update',
      parentId: 'usr_parent_update',
      firstName: 'Update',
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

    childService.getChild = async () => apiChild;
    childService.updateChild = async () => err(serviceError('UNKNOWN', 'athlete update down'));

    try {
      await assert.rejects(
        () => familyMemberService.updateFamilyMember('ath_family_update', { name: 'Updated Athlete' }),
        /athlete update down/,
      );
      const result = await familyMemberService.update('ath_family_update', {
        name: 'Updated Athlete',
      });
      assert.equal(result.success, false);
      assert.match(result.success ? '' : result.error.message, /failed to update family member/i);
    } finally {
      childService.getChild = originalGetChild;
      childService.updateChild = originalUpdateChild;
    }
  });

  it('keeps API-mode family calendar available when optional booking enrichment fails', async () => {
    const [{ familyMemberService }, { childService }, { bookingAuthorityService }] =
      await Promise.all([
        import('@/services/family/family-member-service'),
        import('@/services/child-service'),
        import('@/services/booking'),
      ]);

    const originalGetChildren = childService.getChildren;
    const originalListBookings = bookingAuthorityService.listBookings;

    childService.getChildren = async (): Promise<ChildProfile[]> => [
      {
        id: 'ath_family_calendar',
        parentId: 'usr_parent_calendar',
        firstName: 'Calendar',
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
      },
    ];
    bookingAuthorityService.listBookings = async () =>
      ({
        success: false,
        error: { code: 'NETWORK', message: 'bookings api down' },
      }) as Awaited<ReturnType<typeof bookingAuthorityService.listBookings>>;

    try {
      const events = await familyMemberService.getFamilyCalendar('usr_parent_calendar', {
        startDate: '2030-01-01T00:00:00.000Z',
        endDate: '2030-01-31T23:59:59.999Z',
      });

      assert.deepEqual(events, []);
    } finally {
      childService.getChildren = originalGetChildren;
      bookingAuthorityService.listBookings = originalListBookings;
    }
  });

  it('keeps demo seed and clear helpers from writing visible API-mode family state', async () => {
    const [{ familyMemberService }, { childService }] = await Promise.all([
      import('@/services/family/family-member-service'),
      import('@/services/child-service'),
    ]);

    const originalGetChildren = childService.getChildren;
    childService.getChildren = async () => {
      throw new Error('children api still owns family state');
    };

    try {
      await familyMemberService.seedDemoData();
      await familyMemberService.clearAllData();
      await assert.rejects(
        () => familyMemberService.getFamilyMembers('usr_parent_family_seed_guard'),
        /children api still owns family state/,
      );
    } finally {
      childService.getChildren = originalGetChildren;
    }
  });

  it('surfaces backend child progress analytics failures instead of returning null', async () => {
    const [{ familyMemberService }, { childService }, { analyticsQueryService }, { err, serviceError }] =
      await Promise.all([
        import('@/services/family/family-member-service'),
        import('@/services/child-service'),
        import('@/services/analytics/analytics-query-service'),
        import('@/types/result'),
      ]);

    const originalGetChild = childService.getChild;
    const originalGetAthleteAnalytics = analyticsQueryService.getAthleteAnalytics;

    childService.getChild = async (childId: string): Promise<ChildProfile | null> => ({
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
    });
    analyticsQueryService.getAthleteAnalytics = async () =>
      err(serviceError('UNKNOWN', 'analytics api down'));

    try {
      await assert.rejects(
        () => familyMemberService.getChildProgress('ath_api_child_progress_down'),
        /analytics api down/,
      );
    } finally {
      childService.getChild = originalGetChild;
      analyticsQueryService.getAthleteAnalytics = originalGetAthleteAnalytics;
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

      assert.deepEqual(analyticsCalls, [{ athleteId: 'ath_api_child_progress', period: 'ALL' }]);
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
