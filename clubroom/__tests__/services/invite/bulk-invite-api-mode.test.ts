import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('bulkInviteService API mode', () => {
  it('fails closed when group invite authority fails', async (t) => {
    const [{ bulkInviteService }, { sessionInviteAuthorityService }, { err, serviceError }] =
      await Promise.all([
        import('@/services/invite/bulk-invite-service'),
        import('@/services/invite/session-invite-authority-service'),
        import('@/types/result'),
      ]);
    const originalGetGroupInvites = sessionInviteAuthorityService.getGroupInvites;
    const apiDown = err(serviceError('NETWORK', 'group invites api down'));

    sessionInviteAuthorityService.getGroupInvites = async () => apiDown;

    t.after(() => {
      sessionInviteAuthorityService.getGroupInvites = originalGetGroupInvites;
    });

    const rejectsWithApiDown = (error: unknown) => {
      assert.equal((error as { code?: string }).code, 'NETWORK');
      assert.match((error as { message?: string }).message ?? '', /group invites api down/i);
      return true;
    };

    await assert.rejects(() => bulkInviteService.getGroupInvites('group_api_down'), rejectsWithApiDown);
    await assert.rejects(() => bulkInviteService.getGroupStats('group_api_down'), rejectsWithApiDown);
  });
});
