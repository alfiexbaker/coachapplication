import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import type { Result, ServiceError } from '@/types/result';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(async () => {
  globalThis.fetch = originalFetch;
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

function expectUnsupported(
  result: Result<unknown, ServiceError>,
  action: string,
  details: unknown = { missingAuthority: 'community_groups' },
): void {
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'UNSUPPORTED');
  assert.match(result.error.message, new RegExp(action, 'i'));
  assert.deepEqual(result.error.details, details);
}

describe('CommunityGroupService API mode', () => {
  it('does not merge local group overlays into API-mode reads', async () => {
    const [
      { authService },
      { registerApiAuthService },
      { ok },
      { STORAGE_KEYS },
      { setLocalOverlayValue },
      { communityGroupService },
    ] = await Promise.all([
      import('@/services/auth-service'),
      import('@/services/auth-service-registry'),
      import('@/types/result'),
      import('@/constants/storage-keys'),
      import('@/services/local-overlay-store'),
      import('@/services/community/community-group-service'),
    ]);
    const originalGetCurrentUser = authService.getCurrentUser;
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    authService.getCurrentUser = async () => ({
      id: 'parent_api_reader',
      email: 'parent.reader@example.com',
      accountType: 'PARENT',
      appRole: 'USER',
      firstName: 'Parent',
      lastName: 'Reader',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-03T12:00:00.000Z',
      updatedAt: '2026-07-03T12:00:00.000Z',
    });
    registerApiAuthService({
      getTokens: async () => ({
        accessToken: 'api-read-token',
        refreshToken: 'api-refresh-token',
        expiresAt: Date.now() + 3_600_000,
      }),
      refreshToken: async () => ok(undefined),
      logout: async () => {},
    });
    await setLocalOverlayValue(STORAGE_KEYS.PARENT_GROUPS, [
      {
        id: 'cgrp_api_real',
        name: 'Local Override',
        type: 'GENERAL',
        members: [{ parentId: 'local_parent', role: 'OWNER', joinedAt: '2026-07-01T09:00:00.000Z' }],
        createdById: 'local_parent',
        createdAt: '2026-07-01T09:00:00.000Z',
        updatedAt: '2026-07-01T09:30:00.000Z',
        lastMessagePreview: 'local-only preview',
        unreadCount: 99,
        isPublic: false,
      },
      {
        id: 'cgrp_local_only',
        name: 'Local Only',
        type: 'GENERAL',
        members: [{ parentId: 'local_parent', role: 'OWNER', joinedAt: '2026-07-01T09:00:00.000Z' }],
        createdById: 'local_parent',
        createdAt: '2026-07-01T09:00:00.000Z',
        updatedAt: '2026-07-01T09:30:00.000Z',
        isPublic: true,
      },
    ]);
    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({ url: String(input), init });
      return jsonResponse({
        groups: [
          {
            id: 'cgrp_api_real',
            groupType: 'GENERAL',
            ownerUserId: 'parent_api_reader',
            name: 'API Truth Group',
            visibility: 'PUBLIC',
            createdByUserId: 'parent_api_reader',
            createdAt: '2026-07-03T12:01:00.000Z',
            updatedAt: '2026-07-03T12:01:00.000Z',
            memberships: [
              {
                userId: 'parent_api_reader',
                role: 'OWNER',
                active: true,
                createdAt: '2026-07-03T12:01:00.000Z',
              },
            ],
          },
        ],
      });
    }) as typeof fetch;

    try {
      const result = await communityGroupService.getAllGroups();

      assert.equal(result.success, true);
      if (!result.success) {
        return;
      }
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0]?.url, 'http://localhost:4000/v1/community-groups');
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0]?.id, 'cgrp_api_real');
      assert.equal(result.data[0]?.name, 'API Truth Group');
      assert.equal(result.data[0]?.isPublic, true);
      assert.equal(result.data[0]?.unreadCount, 0);
      assert.deepEqual(result.data[0]?.members, [
        {
          parentId: 'parent_api_reader',
          role: 'OWNER',
          joinedAt: '2026-07-03T12:01:00.000Z',
        },
      ]);
    } finally {
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });

  it('creates general groups through the /v1 community-group authority', async () => {
    const [{ authService }, { registerApiAuthService }, { ok }, { communityGroupService }] =
      await Promise.all([
        import('@/services/auth-service'),
        import('@/services/auth-service-registry'),
        import('@/types/result'),
        import('@/services/community/community-group-service'),
      ]);
    const originalGetCurrentUser = authService.getCurrentUser;
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    authService.getCurrentUser = async () => ({
      id: 'parent_api_create',
      email: 'parent.create@example.com',
      accountType: 'PARENT',
      appRole: 'USER',
      firstName: 'Parent',
      lastName: 'Create',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-03T12:00:00.000Z',
      updatedAt: '2026-07-03T12:00:00.000Z',
    });
    registerApiAuthService({
      getTokens: async () => ({
        accessToken: 'api-create-token',
        refreshToken: 'api-refresh-token',
        expiresAt: Date.now() + 3_600_000,
      }),
      refreshToken: async () => ok(undefined),
      logout: async () => {},
    });
    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({ url: String(input), init });
      return jsonResponse({
        group: {
          id: 'cgrp_api_general_1',
          clubId: null,
          ownerUserId: 'parent_api_create',
          name: 'API Parent Group',
          description: 'Created via service',
          visibility: 'PUBLIC',
          createdByUserId: 'parent_api_create',
          createdAt: '2026-07-03T12:01:00.000Z',
          updatedAt: '2026-07-03T12:01:00.000Z',
          memberships: [
            {
              userId: 'parent_api_create',
              role: 'OWNER',
              active: true,
              createdAt: '2026-07-03T12:01:00.000Z',
            },
          ],
        },
      });
    }) as typeof fetch;

    try {
      const result = await communityGroupService.createGroup({
        name: 'API Parent Group',
        description: 'Created via service',
        type: 'GENERAL',
        memberIds: [],
        memberNames: [],
        creatorId: 'parent_api_create',
        creatorName: 'Parent Create',
        isPublic: true,
      });

      assert.equal(result.success, true);
      if (!result.success) {
        return;
      }
      assert.equal(result.data.id, 'cgrp_api_general_1');
      assert.equal(result.data.type, 'GENERAL');
      assert.equal(result.data.isPublic, true);
      assert.deepEqual(result.data.members, [
        {
          parentId: 'parent_api_create',
          role: 'OWNER',
          joinedAt: '2026-07-03T12:01:00.000Z',
        },
      ]);
      assert.equal(fetchCalls.length, 1);
      assert.equal(fetchCalls[0]?.url, 'http://localhost:4000/v1/community-groups');
      assert.equal(fetchCalls[0]?.init?.method, 'POST');
      assert.equal(
        (fetchCalls[0]?.init?.headers as Record<string, string>).Authorization,
        'Bearer api-create-token',
      );
      assert.equal(
        (fetchCalls[0]?.init?.headers as Record<string, string>)['x-acting-role'],
        'parent',
      );
      const payload = JSON.parse(String(fetchCalls[0]?.init?.body));
      assert.equal(payload.name, 'API Parent Group');
      assert.equal(payload.description, 'Created via service');
      assert.equal(payload.type, 'GENERAL');
      assert.equal(payload.isPublic, true);
      assert.deepEqual(payload.memberIds, []);
      assert.match(payload.idempotencyKey, /^community_group_create_/);
    } finally {
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });

  it('joins and leaves groups through the /v1 community-group authority', async () => {
    const [{ authService }, { registerApiAuthService }, { ok }, { communityGroupService }] =
      await Promise.all([
        import('@/services/auth-service'),
        import('@/services/auth-service-registry'),
        import('@/types/result'),
        import('@/services/community/community-group-service'),
      ]);
    const originalGetCurrentUser = authService.getCurrentUser;
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    authService.getCurrentUser = async () => ({
      id: 'parent_api_member',
      email: 'parent.member@example.com',
      accountType: 'PARENT',
      appRole: 'USER',
      firstName: 'Parent',
      lastName: 'Member',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-03T12:00:00.000Z',
      updatedAt: '2026-07-03T12:00:00.000Z',
    });
    registerApiAuthService({
      getTokens: async () => ({
        accessToken: 'api-member-token',
        refreshToken: 'api-refresh-token',
        expiresAt: Date.now() + 3_600_000,
      }),
      refreshToken: async () => ok(undefined),
      logout: async () => {},
    });
    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({ url: String(input), init });
      return jsonResponse({
        group: {
          id: 'cgrp_api_general_2',
          clubId: null,
          ownerUserId: 'parent_api_create',
          name: 'API Joinable Group',
          visibility: 'PUBLIC',
          createdByUserId: 'parent_api_create',
          createdAt: '2026-07-03T12:01:00.000Z',
          updatedAt: '2026-07-03T12:02:00.000Z',
          memberships: String(input).endsWith('/leave')
            ? [
                {
                  userId: 'parent_api_create',
                  role: 'OWNER',
                  active: true,
                  createdAt: '2026-07-03T12:01:00.000Z',
                },
              ]
            : [
                {
                  userId: 'parent_api_create',
                  role: 'OWNER',
                  active: true,
                  createdAt: '2026-07-03T12:01:00.000Z',
                },
                {
                  userId: 'parent_api_member',
                  role: 'MEMBER',
                  active: true,
                  createdAt: '2026-07-03T12:02:00.000Z',
                },
              ],
        },
      });
    }) as typeof fetch;

    try {
      const joined = await communityGroupService.joinGroup(
        'cgrp_api_general_2',
        'parent_api_member',
        'Parent Member',
      );
      assert.equal(joined.success, true);
      if (!joined.success) {
        return;
      }
      assert.equal(
        joined.data.members.some(
          (member) => member.parentId === 'parent_api_member' && member.role === 'MEMBER',
        ),
        true,
      );

      const left = await communityGroupService.leaveGroup(
        'cgrp_api_general_2',
        'parent_api_member',
      );
      assert.equal(left.success, true);

      assert.equal(fetchCalls.length, 2);
      assert.equal(
        fetchCalls[0]?.url,
        'http://localhost:4000/v1/community-groups/cgrp_api_general_2/join',
      );
      assert.equal(fetchCalls[0]?.init?.method, 'POST');
      assert.equal(
        fetchCalls[1]?.url,
        'http://localhost:4000/v1/community-groups/cgrp_api_general_2/leave',
      );
      assert.equal(fetchCalls[1]?.init?.method, 'POST');
      for (const call of fetchCalls) {
        assert.equal(
          (call.init?.headers as Record<string, string>).Authorization,
          'Bearer api-member-token',
        );
        assert.equal((call.init?.headers as Record<string, string>)['x-acting-role'], 'parent');
      }
    } finally {
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });

  it('manages group members through the /v1 community-group authority', async () => {
    const [{ authService }, { registerApiAuthService }, { ok }, { communityGroupService }] =
      await Promise.all([
        import('@/services/auth-service'),
        import('@/services/auth-service-registry'),
        import('@/types/result'),
        import('@/services/community/community-group-service'),
      ]);
    const originalGetCurrentUser = authService.getCurrentUser;
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    authService.getCurrentUser = async () => ({
      id: 'owner_api',
      email: 'owner.member-admin@example.com',
      accountType: 'PARENT',
      appRole: 'USER',
      firstName: 'Owner',
      lastName: 'Admin',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-03T12:00:00.000Z',
      updatedAt: '2026-07-03T12:00:00.000Z',
    });
    registerApiAuthService({
      getTokens: async () => ({
        accessToken: 'api-owner-token',
        refreshToken: 'api-refresh-token',
        expiresAt: Date.now() + 3_600_000,
      }),
      refreshToken: async () => ok(undefined),
      logout: async () => {},
    });
    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({ url: String(input), init });
      return jsonResponse({
        group: {
          id: 'group_api',
          clubId: null,
          ownerUserId: String(input).endsWith('/transfer-ownership') ? 'parent_api' : 'owner_api',
          name: 'API Managed Group',
          visibility: 'PRIVATE',
          createdByUserId: 'owner_api',
          createdAt: '2026-07-03T12:01:00.000Z',
          updatedAt: '2026-07-03T12:02:00.000Z',
          deletedAt: String(input).endsWith('/archive')
            ? '2026-07-03T12:03:00.000Z'
            : null,
          memberships: String(input).endsWith('/remove') || String(input).endsWith('/archive')
            ? []
            : String(input).endsWith('/transfer-ownership')
              ? [
                  {
                    userId: 'owner_api',
                    role: 'ADMIN',
                    active: true,
                    createdAt: '2026-07-03T12:01:00.000Z',
                  },
                  {
                    userId: 'parent_api',
                    role: 'OWNER',
                    active: true,
                    createdAt: '2026-07-03T12:02:00.000Z',
                  },
                ]
              : [
                {
                  userId: 'owner_api',
                  role: 'OWNER',
                  active: true,
                  createdAt: '2026-07-03T12:01:00.000Z',
                },
                {
                  userId: 'parent_api',
                  role: 'MODERATOR',
                  active: true,
                  createdAt: '2026-07-03T12:02:00.000Z',
                },
              ],
        },
      });
    }) as typeof fetch;

    try {
      const added = await communityGroupService.addMemberDirect(
        'group_api',
        'parent_api',
        'Parent API',
        'MEMBER',
      );
      assert.equal(added.success, true);

      const roleChanged = await communityGroupService.changeMemberRole({
        groupId: 'group_api',
        requesterId: 'client_spoof_ignored',
        memberId: 'parent_api',
        newRole: 'MODERATOR',
      });
      assert.equal(roleChanged.success, true);

      const ownerTransferred = await communityGroupService.changeMemberRole({
        groupId: 'group_api',
        requesterId: 'client_spoof_ignored',
        memberId: 'parent_api',
        newRole: 'OWNER',
      });
      assert.equal(ownerTransferred.success, true);

      const removed = await communityGroupService.removeMemberDirect('group_api', 'parent_api');
      assert.equal(removed.success, true);

      const archived = await communityGroupService.deleteGroup('group_api');
      assert.equal(archived.success, true);

      assert.equal(fetchCalls.length, 5);
      assert.equal(
        fetchCalls[0]?.url,
        'http://localhost:4000/v1/community-groups/group_api/members',
      );
      assert.equal(fetchCalls[0]?.init?.method, 'POST');
      assert.deepEqual(JSON.parse(String(fetchCalls[0]?.init?.body)), {
        memberUserId: 'parent_api',
        role: 'MEMBER',
      });
      assert.equal(
        fetchCalls[1]?.url,
        'http://localhost:4000/v1/community-groups/group_api/members/parent_api/role',
      );
      assert.equal(fetchCalls[1]?.init?.method, 'PATCH');
      assert.deepEqual(JSON.parse(String(fetchCalls[1]?.init?.body)), {
        role: 'MODERATOR',
      });
      assert.equal(
        fetchCalls[2]?.url,
        'http://localhost:4000/v1/community-groups/group_api/members/parent_api/transfer-ownership',
      );
      assert.equal(fetchCalls[2]?.init?.method, 'POST');
      assert.equal(
        fetchCalls[3]?.url,
        'http://localhost:4000/v1/community-groups/group_api/members/parent_api/remove',
      );
      assert.equal(fetchCalls[3]?.init?.method, 'POST');
      assert.equal(
        fetchCalls[4]?.url,
        'http://localhost:4000/v1/community-groups/group_api/archive',
      );
      assert.equal(fetchCalls[4]?.init?.method, 'POST');
      for (const call of fetchCalls) {
        assert.equal(
          (call.init?.headers as Record<string, string>).Authorization,
          'Bearer api-owner-token',
        );
        assert.equal((call.init?.headers as Record<string, string>)['x-acting-role'], 'parent');
      }
    } finally {
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });

  it('uses community group invite authority in API mode', async () => {
    const [{ authService }, { registerApiAuthService }, { ok }, { communityGroupService }] =
      await Promise.all([
        import('@/services/auth-service'),
        import('@/services/auth-service-registry'),
        import('@/types/result'),
        import('@/services/community/community-group-service'),
      ]);
    const originalGetCurrentUser = authService.getCurrentUser;
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    authService.getCurrentUser = async () => ({
      id: 'owner_api',
      email: 'owner.invites@example.com',
      accountType: 'PARENT',
      appRole: 'USER',
      firstName: 'Owner',
      lastName: 'Invites',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-03T12:00:00.000Z',
      updatedAt: '2026-07-03T12:00:00.000Z',
    });
    registerApiAuthService({
      getTokens: async () => ({
        accessToken: 'api-invite-token',
        refreshToken: 'api-refresh-token',
        expiresAt: Date.now() + 3_600_000,
      }),
      refreshToken: async () => ok(undefined),
      logout: async () => {},
    });
    const invite = {
      id: 'cgi_api',
      groupId: 'group_api',
      groupName: 'API Managed Group',
      inviterId: 'owner_api',
      inviterName: 'Owner Invites',
      inviteeId: 'parent_api',
      inviteeName: 'Parent API',
      status: 'PENDING',
      createdAt: '2026-07-03T12:02:00.000Z',
    };
    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({ url: String(input), init });
      const url = String(input);
      if (url.endsWith('/accept')) {
        return jsonResponse({
          invite: { ...invite, status: 'ACCEPTED', respondedAt: '2026-07-03T12:03:00.000Z' },
          group: {
            id: 'group_api',
            name: 'API Managed Group',
            visibility: 'PRIVATE',
            createdAt: '2026-07-03T12:01:00.000Z',
            memberships: [
              { userId: 'owner_api', role: 'OWNER', active: true },
              { userId: 'parent_api', role: 'MEMBER', active: true },
            ],
          },
        });
      }
      if (url.endsWith('/decline')) {
        return jsonResponse({
          invite: { ...invite, status: 'DECLINED', respondedAt: '2026-07-03T12:04:00.000Z' },
        });
      }
      if (url.endsWith('/me/community-group-invites')) {
        return jsonResponse({ invites: [invite] });
      }
      return jsonResponse({ invite }, 201);
    }) as typeof fetch;

    try {
      const created = await communityGroupService.inviteToGroup(
        'group_api',
        'owner_api',
        'parent_api',
        'Parent API',
      );
      assert.equal(created.success, true);
      if (!created.success) {
        return;
      }
      assert.equal(created.data.id, 'cgi_api');

      const listed = await communityGroupService.getGroupInvites('parent_api');
      assert.equal(listed.success, true);
      assert.equal(listed.success ? listed.data.length : 0, 1);

      const accepted = await communityGroupService.acceptGroupInvite('cgi_api');
      assert.equal(accepted.success, true);

      const declined = await communityGroupService.declineGroupInvite('cgi_api');
      assert.equal(declined.success, true);

      assert.deepEqual(
        fetchCalls.map((call) => [call.init?.method ?? 'GET', call.url]),
        [
          ['POST', 'http://localhost:4000/v1/community-groups/group_api/invites'],
          ['GET', 'http://localhost:4000/v1/me/community-group-invites'],
          ['POST', 'http://localhost:4000/v1/community-group-invites/cgi_api/accept'],
          ['POST', 'http://localhost:4000/v1/community-group-invites/cgi_api/decline'],
        ],
      );
      assert.deepEqual(JSON.parse(String(fetchCalls[0]?.init?.body)), {
        inviteeUserId: 'parent_api',
      });
      for (const call of fetchCalls) {
        assert.equal(
          (call.init?.headers as Record<string, string>).Authorization,
          'Bearer api-invite-token',
        );
      }
    } finally {
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });

  it('uses group join request authority in API mode', async () => {
    const [{ authService }, { registerApiAuthService }, { ok }, { communityGroupService }] =
      await Promise.all([
        import('@/services/auth-service'),
        import('@/services/auth-service-registry'),
        import('@/types/result'),
        import('@/services/community/community-group-service'),
      ]);
    const originalGetCurrentUser = authService.getCurrentUser;
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    const pendingRequest = {
      id: 'cgjr_api',
      groupId: 'group_api',
      groupName: 'API Managed Group',
      requesterId: 'coach_api',
      requesterName: 'Coach API',
      requestedRole: 'MEMBER',
      isCoach: true,
      status: 'PENDING',
      createdAt: '2026-07-03T12:02:00.000Z',
    };

    authService.getCurrentUser = async () => ({
      id: 'owner_api',
      email: 'owner.join-requests@example.com',
      accountType: 'PARENT',
      appRole: 'USER',
      firstName: 'Owner',
      lastName: 'Requests',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-03T12:00:00.000Z',
      updatedAt: '2026-07-03T12:00:00.000Z',
    });
    registerApiAuthService({
      getTokens: async () => ({
        accessToken: 'api-join-request-token',
        refreshToken: 'api-refresh-token',
        expiresAt: Date.now() + 3_600_000,
      }),
      refreshToken: async () => ok(undefined),
      logout: async () => {},
    });
    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({ url: String(input), init });
      const url = String(input);
      if (url.endsWith('/approve')) {
        return jsonResponse({
          request: {
            ...pendingRequest,
            status: 'ACCEPTED',
            respondedAt: '2026-07-03T12:03:00.000Z',
          },
          group: {
            id: 'group_api',
            name: 'API Managed Group',
            visibility: 'PRIVATE',
            createdAt: '2026-07-03T12:01:00.000Z',
            memberships: [
              { userId: 'owner_api', role: 'OWNER', active: true },
              { userId: 'coach_api', role: 'MEMBER', active: true },
            ],
          },
        });
      }
      if (url.endsWith('/reject')) {
        return jsonResponse({
          request: {
            ...pendingRequest,
            id: 'cgjr_api_reject',
            status: 'DECLINED',
            respondedAt: '2026-07-03T12:04:00.000Z',
          },
        });
      }
      if (url.endsWith('/join-requests') && init?.method === 'POST') {
        return jsonResponse({ request: pendingRequest }, 201);
      }
      if (url.endsWith('/join-requests')) {
        return jsonResponse({ requests: [pendingRequest] });
      }
      return jsonResponse({ request: pendingRequest });
    }) as typeof fetch;

    try {
      const requested = await communityGroupService.joinGroup(
        'group_api',
        'coach_api',
        'Coach API',
        {
          isCoach: true,
        },
      );
      assert.equal(requested.success, false);
      if (requested.success) {
        return;
      }
      assert.equal(requested.error.code, 'VALIDATION');
      assert.match(requested.error.message, /sent to the group admins/i);

      const pending = await communityGroupService.getPendingJoinRequests('group_api');
      assert.equal(pending.success, true);
      assert.equal(pending.success ? pending.data[0]?.id : undefined, 'cgjr_api');

      const approved = await communityGroupService.approveJoinRequest(
        'group_api',
        'cgjr_api',
        'owner_api',
      );
      assert.equal(approved.success, true);
      assert.equal(
        approved.success
          ? approved.data.members.some(
              (member) => member.parentId === 'coach_api' && member.role === 'MEMBER',
            )
          : false,
        true,
      );

      const rejected = await communityGroupService.rejectJoinRequest(
        'group_api',
        'cgjr_api_reject',
        'owner_api',
      );
      assert.equal(rejected.success, true);

      assert.deepEqual(
        fetchCalls.map((call) => [call.init?.method ?? 'GET', call.url]),
        [
          ['POST', 'http://localhost:4000/v1/community-groups/group_api/join-requests'],
          ['GET', 'http://localhost:4000/v1/community-groups/group_api/join-requests'],
          [
            'POST',
            'http://localhost:4000/v1/community-groups/group_api/join-requests/cgjr_api/approve',
          ],
          [
            'POST',
            'http://localhost:4000/v1/community-groups/group_api/join-requests/cgjr_api_reject/reject',
          ],
        ],
      );
      assert.deepEqual(JSON.parse(String(fetchCalls[0]?.init?.body)), {
        isCoach: true,
      });
      for (const call of fetchCalls) {
        assert.equal(
          (call.init?.headers as Record<string, string>).Authorization,
          'Bearer api-join-request-token',
        );
      }
    } finally {
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });

  it('creates squad groups through the /v1 community-group authority', async () => {
    const [{ authService }, { registerApiAuthService }, { ok }, { communityGroupService }] =
      await Promise.all([
        import('@/services/auth-service'),
        import('@/services/auth-service-registry'),
        import('@/types/result'),
        import('@/services/community/community-group-service'),
      ]);
    const originalGetCurrentUser = authService.getCurrentUser;
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

    authService.getCurrentUser = async () => ({
      id: 'coach_api_squad_create',
      email: 'coach.squad.create@example.com',
      accountType: 'COACH',
      appRole: 'USER',
      firstName: 'Coach',
      lastName: 'Squad',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-03T12:00:00.000Z',
      updatedAt: '2026-07-03T12:00:00.000Z',
    });
    registerApiAuthService({
      getTokens: async () => ({
        accessToken: 'api-squad-create-token',
        refreshToken: 'api-refresh-token',
        expiresAt: Date.now() + 3_600_000,
      }),
      refreshToken: async () => ok(undefined),
      logout: async () => {},
    });
    globalThis.fetch = (async (input, init) => {
      fetchCalls.push({ url: String(input), init });
      return jsonResponse({
        group: {
          id: 'cgrp_api_squad_1',
          groupType: 'SQUAD',
          clubId: 'club_api_1',
          squadId: 'squad_api_1',
          ownerUserId: 'coach_api_squad_create',
          name: 'U12 Parents',
          description: 'Parent group chat for U12',
          visibility: 'PRIVATE',
          createdByUserId: 'coach_api_squad_create',
          createdAt: '2026-07-03T12:01:00.000Z',
          updatedAt: '2026-07-03T12:01:00.000Z',
          memberships: [
            {
              userId: 'coach_api_squad_create',
              role: 'OWNER',
              active: true,
              createdAt: '2026-07-03T12:01:00.000Z',
            },
            {
              userId: 'parent_api_squad',
              role: 'MEMBER',
              active: true,
              createdAt: '2026-07-03T12:01:00.000Z',
            },
          ],
        },
      });
    }) as typeof fetch;

    try {
      const result = await communityGroupService.createGroup({
        name: 'U12 Parents',
        description: 'Parent group chat for U12',
        type: 'SQUAD',
        memberIds: ['parent_api_squad'],
        memberNames: ['Parent Squad'],
        creatorId: 'coach_api_squad_create',
        creatorName: 'Coach Squad',
        isPublic: false,
        clubId: 'club_api_1',
        squadId: 'squad_api_1',
      });

      assert.equal(result.success, true);
      if (!result.success) {
        return;
      }
      assert.equal(result.data.id, 'cgrp_api_squad_1');
      assert.equal(result.data.type, 'SQUAD');
      assert.equal(result.data.clubId, 'club_api_1');
      assert.equal(result.data.squadId, 'squad_api_1');
      assert.equal(result.data.isPublic, false);
      const requestBody = JSON.parse(String(fetchCalls[0]?.init?.body)) as Record<string, unknown>;
      assert.deepEqual(requestBody, {
        name: 'U12 Parents',
        description: 'Parent group chat for U12',
        type: 'SQUAD',
        clubId: 'club_api_1',
        squadId: 'squad_api_1',
        isPublic: false,
        memberIds: ['parent_api_squad'],
        idempotencyKey: requestBody.idempotencyKey,
      });
    } finally {
      authService.getCurrentUser = originalGetCurrentUser;
    }
  });

  it('keeps unsupported group creation lifecycles closed in API mode', async () => {
    const { communityGroupService } = await import('@/services/community/community-group-service');

    expectUnsupported(
      await communityGroupService.createGroup({
        name: 'API Session Group',
        type: 'SESSION',
        memberIds: [],
        memberNames: [],
        creatorId: 'parent_api',
        creatorName: 'Parent API',
        isPublic: false,
      }),
      'Session groups',
      { missingAuthority: 'community_group_session_link' },
    );
  });

});
