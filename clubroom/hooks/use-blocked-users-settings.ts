import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { blockService } from '@/services/block-service';
import { uiFeedback } from '@/services/ui-feedback';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

export interface BlockedUserItem {
  id: string;
  name: string;
  blockedLabel: string;
}

function blockedDateLabel(value: string | null): string {
  if (!value) return 'Blocked';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Blocked';
  return `Blocked ${date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

export function useBlockedUsersSettings() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? '';
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const load = async () => {
    if (!userId) {
      return err(serviceError('UNAUTHORIZED', 'No user available.'));
    }

    const blockedResult = await blockService.getBlockedUserSummaries(userId);
    if (!blockedResult.success) {
      return err(blockedResult.error);
    }

    return ok(
      blockedResult.data.map((user) => ({
        id: user.id,
        name: user.name?.trim() || 'Blocked account',
        blockedLabel: blockedDateLabel(user.blockedAt),
      })),
    );
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen({
    load,
    deps: [userId],
    isEmpty: (items) => items.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: userId ? `blocked-users:${userId}` : 'blocked-users:missing',
  });

  const blockedUsers = data ?? [];

  const unblockUser = async (user: BlockedUserItem) => {
    if (!userId || pendingUserId) return;

    const confirmed = await uiFeedback.confirm({
      title: 'Unblock account?',
      message: `${user.name} may be able to find and contact you again.`,
      confirmText: 'Unblock',
      cancelText: 'Keep blocked',
      destructive: false,
    });

    if (!confirmed) {
      return;
    }

    setPendingUserId(user.id);
    await blockService
      .unblockUser(userId, user.id)
      .then((result) => {
        if (!result.success) {
          uiFeedback.showToast(result.error.message || 'Account was not unblocked.', 'error');
          return;
        }
        uiFeedback.showToast('Account unblocked.', 'success');
        onRefresh();
      })
      .catch(() => {
        uiFeedback.showToast('Account was not unblocked. Try again.', 'error');
      })
      .finally(() => setPendingUserId(null));
  };

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
