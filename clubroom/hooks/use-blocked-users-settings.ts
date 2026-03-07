import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { blockService } from '@/services/block-service';
import { uiFeedback } from '@/services/ui-feedback';
import { userService } from '@/services/user-service';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

export interface BlockedUserItem {
  id: string;
  name: string;
  role: string;
  email: string;
  subtitle: string;
  missingProfile: boolean;
}

function toRoleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

export function useBlockedUsersSettings() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? '';
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      return err(serviceError('UNAUTHORIZED', 'No user available.'));
    }

    const blockedResult = await blockService.getBlockedUsers(userId);
    if (!blockedResult.success) {
      return err(blockedResult.error);
    }

    const blockedIds = blockedResult.data;
    if (blockedIds.length === 0) {
      return ok([] as BlockedUserItem[]);
    }

    const usersResult = await userService.getUsersByIds(blockedIds);
    if (!usersResult.success) {
      return err(usersResult.error);
    }

    const usersById = new Map(usersResult.data.map((user) => [user.id, user] as const));
    const items = blockedIds.map<BlockedUserItem>((blockedId) => {
      const user = usersById.get(blockedId);
      if (!user) {
        return {
          id: blockedId,
          name: 'Unknown user',
          role: 'Account',
          email: blockedId,
          subtitle: 'Profile record is unavailable, but the block is still active.',
          missingProfile: true,
        };
      }

      const roleLabel = toRoleLabel(user.role || 'user');
      const subtitleParts = [roleLabel];
      if (user.postcode) {
        subtitleParts.push(user.postcode);
      }

      return {
        id: blockedId,
        name: user.name || 'Unknown user',
        role: roleLabel,
        email: user.email || blockedId,
        subtitle: subtitleParts.join(' • '),
        missingProfile: false,
      };
    });

    return ok(items);
  }, [userId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen({
    load,
    deps: [userId],
    isEmpty: (items) => items.length === 0,
    refetchOnFocus: true,
  });

  const blockedUsers = useMemo(() => data ?? [], [data]);

  const unblockUser = useCallback(
    async (user: BlockedUserItem) => {
      if (!userId || pendingUserId) return;

      const confirmed = await uiFeedback.confirm({
        title: 'Unblock user?',
        message: `${user.name} will be able to message you, appear in discovery, and be invited again.`,
        confirmText: 'Unblock',
        cancelText: 'Keep blocked',
        destructive: false,
      });

      if (!confirmed) {
        return;
      }

      setPendingUserId(user.id);
      const result = await blockService.unblockUser(userId, user.id);
      if (result.success) {
        uiFeedback.showToast(`${user.name} has been unblocked.`, 'success');
        onRefresh();
      } else {
        uiFeedback.showToast(result.error.message || 'Failed to unblock user.', 'error');
      }
      setPendingUserId(null);
    },
    [onRefresh, pendingUserId, userId],
  );

  return {
    blockedUsers,
    blockedUsersCount: blockedUsers.length,
    pendingUserId,
    loading: status === 'loading' && blockedUsers.length === 0,
    empty: status === 'empty',
    status: status as ScreenStatus,
    error:
      status === 'error'
        ? ((error as ServiceError | null)?.message ?? 'Failed to load blocked users.')
        : null,
    refreshing,
    onRefresh,
    retry,
    unblockUser,
  };
}
