import { useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { blockService } from '@/services/block-service';
import { uiFeedback } from '@/services/ui-feedback';

export function useBlockUserAction() {
  const { currentUser } = useAuth();
  const actorUserId = currentUser?.id ?? '';

  const blockUser = useCallback(
    async (targetUserId: string, targetLabel: string, onBlocked?: () => void | Promise<void>) => {
      if (!actorUserId || !targetUserId || actorUserId === targetUserId) {
        uiFeedback.showToast('Unable to block this account.', 'error');
        return false;
      }

      const confirmed = await uiFeedback.confirm({
        title: `Block ${targetLabel}?`,
        message: `${targetLabel} will no longer be able to message you, appear in discovery, or interact through booking flows where blocking is enforced.`,
        confirmText: 'Block',
        cancelText: 'Cancel',
        destructive: true,
      });

      if (!confirmed) {
        return false;
      }

      const result = await blockService.blockUser(actorUserId, targetUserId);
      if (!result.success) {
        uiFeedback.showToast(result.error.message || 'Failed to block user.', 'error');
        return false;
      }

      uiFeedback.showToast(`${targetLabel} has been blocked.`, 'success');
      await onBlocked?.();
      return true;
    },
    [actorUserId],
  );

  return { blockUser, actorUserId };
}
