/**
 * Hook for the Invites screen.
 * Manages invite list, tab filtering, accept/decline/rsvp, slot picking.
 */

import { useState, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { inviteService as sessionInviteService, inviteRsvpService } from '@/services/invite';
import type { SessionInvite, TimeSlot } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { getSessionInviteCoachName } from '@/utils/session-invite-display';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

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

  const loadInvites = useCallback(async () => {
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
  }, [currentUser]);

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

  const handleAcceptInvite = useCallback(
    async (invite: SessionInvite, selectedSlot: TimeSlot) => {
      setRespondingTo(invite.id);
      try {
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
      } catch {
        uiFeedback.showToast('Failed to accept invite. Please try again.', 'error');
      } finally {
        setRespondingTo(null);
      }
    },
    [onRefresh],
  );

  const handleDeclineInvite = useCallback(
    (invite: SessionInvite) => {
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
              try {
                await sessionInviteService.respondToInvite({
                  inviteId: invite.id,
                  response: 'DECLINED',
                });
                onRefresh();
              } catch {
                uiFeedback.showToast('Failed to decline invite.', 'error');
              } finally {
                setRespondingTo(null);
              }
            },
          },
        ],
      );
    },
    [onRefresh],
  );

  const showSlotPicker = useCallback(
    (invite: SessionInvite) => {
      if (invite.proposedSlots.length === 1) {
        handleAcceptInvite(invite, invite.proposedSlots[0]);
        return;
      }
      uiFeedback.alert('Select Time Slot', 'Choose a time that works for you:', [
        ...invite.proposedSlots.map((slot) => ({
          text: `${new Date(slot.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${slot.startTime}`,
          onPress: () => handleAcceptInvite(invite, slot),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    },
    [handleAcceptInvite],
  );

  const handleRsvp = useCallback(
    async (inviteId: string, rsvpStatus: 'going' | 'maybe' | 'cant_go') => {
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
    },
    [currentUser, onRefresh],
  );

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
