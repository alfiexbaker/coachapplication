/**
 * Hook for the Invites screen.
 * Manages invite list, tab filtering, accept/decline/rsvp, slot picking.
 */

import { useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { inviteService as sessionInviteService, inviteRsvpService } from '@/services/invite';
import type { SessionInvite, TimeSlot } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { getSessionInviteCoachName } from '@/utils/session-invite-display';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('InvitesScreen');

export type TabFilter = 'pending' | 'maybe' | 'responded';

interface InvitesLoadData {
  invites: SessionInvite[];
}

export function formatExpiresIn(expiresAt: string): string {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Expired';
  if (diffDays === 1) return 'Expires today';
  if (diffDays <= 7) return `Expires in ${diffDays} days`;
  return `Expires ${expires.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

export function useInvites() {
  const { currentUser } = useAuth();

  const [tabFilter, setTabFilter] = useState<TabFilter>('pending');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const loadInvites = async () => {
    if (!currentUser) {
      return ok<InvitesLoadData>({ invites: [] });
    }

    try {
      const parentInvites = await sessionInviteService.getParentInvites(currentUser.id);
      logger.debug('Loaded invites', { count: parentInvites.length });
      return ok<InvitesLoadData>({ invites: parentInvites });
    } catch (loadError) {
      logger.error('Failed to load invites', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load invites. Please try again.', loadError));
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<InvitesLoadData>({
    load: loadInvites,
    deps: [currentUser?.id],
    isEmpty: (value) => value.invites.length === 0,
    refetchOnFocus: true,
  });

  const invites = data?.invites ?? [];

  const filteredInvites = invites.filter((invite) => {
    if (tabFilter === 'pending')
      return invite.status === 'PENDING' && new Date(invite.expiresAt) > new Date();
    if (tabFilter === 'maybe') return invite.status === 'MAYBE';
    return invite.status !== 'PENDING' && invite.status !== 'MAYBE';
  });

  const pendingCount = invites.filter(
    (i) => i.status === 'PENDING' && new Date(i.expiresAt) > new Date(),
  ).length;
  const maybeCount = invites.filter((i) => i.status === 'MAYBE').length;

  const handleAcceptInvite = async (invite: SessionInvite, selectedSlot: TimeSlot) => {
    setRespondingTo(invite.id);

    return await runAsyncTryCatchFinally(async () => {
      const result = await sessionInviteService.respondToInvite({
        inviteId: invite.id,
        response: 'ACCEPTED',
        selectedSlot,
      });
      if (!result.success) {
        uiFeedback.showToast(result.error?.message ?? 'Could not create the booking. Please try again.', 'error');
        logger.error('Invite acceptance failed', {
          inviteId: invite.id,
          error: result.error?.message,
        });
        return;
      }
      const coachName = getSessionInviteCoachName(invite);
      uiFeedback.showToast(`Session with ${coachName} on ${new Date(selectedSlot.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} at ${selectedSlot.startTime} has been booked.`, 'success');
      onRefresh();
    }, async error => {
      uiFeedback.showToast('Failed to accept invite. Please try again.', 'error');
    }, () => {
      setRespondingTo(null);
    });
  };

  const handleDeclineInvite = (invite: SessionInvite) => {
    const coachName = getSessionInviteCoachName(invite);
    uiFeedback.alert(
      'Decline Invite',
      `Are you sure you want to decline this invite from ${coachName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setRespondingTo(invite.id);

            await runAsyncTryCatchFinally(async () => {
              await sessionInviteService.respondToInvite({
                inviteId: invite.id,
                response: 'DECLINED',
              });
              onRefresh();
            }, async error => {
              uiFeedback.showToast('Failed to decline invite.', 'error');
            }, () => {
              setRespondingTo(null);
            });
          },
        },
      ],
    );
  };

  const showSlotPicker = (invite: SessionInvite) => {
    if (invite.proposedSlots.length === 1) {
      handleAcceptInvite(invite, invite.proposedSlots[0]);
      return;
    }
    void (async () => {
      const selected = await uiFeedback.choose({
        title: 'Select Time Slot',
        message: 'Choose a time that works for you:',
        options: invite.proposedSlots.map((slot, index) => ({
          id: String(index),
          label: `${new Date(slot.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${slot.startTime}`,
        })),
        cancelText: 'Cancel',
      });

      if (selected === null) return;
      const slotIndex = Number.parseInt(selected, 10);
      const slot = invite.proposedSlots[slotIndex];
      if (!slot) return;
      await handleAcceptInvite(invite, slot);
    })();
  };

  const handleRsvp = async (inviteId: string, rsvpStatus: 'going' | 'maybe' | 'cant_go') => {
    if (!currentUser) return;
    try {
      const result = await inviteRsvpService.respondToInvite(
        inviteId,
        currentUser.id,
        currentUser.fullName || currentUser.username || 'User',
        rsvpStatus,
        undefined,
        undefined,
        currentUser.avatar,
      );
      if (!result.success) {
        uiFeedback.showToast(result.error.message, 'error');
        return;
      }
      onRefresh();
    } catch {
      uiFeedback.showToast('Failed to respond. Please try again.', 'error');
    }
  };

  return {
    invites,
    filteredInvites,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    tabFilter,
    setTabFilter,
    respondingTo,
    pendingCount,
    maybeCount,
    handleRefresh: onRefresh,
    handleAcceptInvite,
    handleDeclineInvite,
    showSlotPicker,
    handleRsvp,
    retry,
  };
}
