/**
 * Hook for the Coach Invites screen.
 * Manages pending club invites, accept/decline, and incoming code processing.
 */

import { useState, useEffect, useCallback } from 'react';

import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { socialFeedService } from '@/services/social-feed-service';
import { useScreen } from '@/hooks/use-screen';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { ClubRole } from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';
import { ORGANIZATION_ROLE_LABELS } from '@/contracts/club-governance';

const logger = createLogger('CoachInvitesScreen');

export interface PendingClubInvite {
  id: string;
  inviteCode: string;
  clubId: string;
  clubName: string;
  clubBadge?: string;
  role: ClubRole;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

export const ROLE_LABELS: Record<ClubRole, string> = {
  ...ORGANIZATION_ROLE_LABELS,
  ADMIN: 'Administrator',
};

interface CoachInvitesData {
  invites: PendingClubInvite[];
}

export function useCoachInvites() {
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{
    code?: string;
    clubId?: string;
    clubName?: string;
    role?: string;
  }>();

  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!currentUser) {
      return ok<CoachInvitesData>({ invites: [] });
    }

    try {
      const stored = await apiClient.get<PendingClubInvite[]>(
        `${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser.id}`,
        [],
      );
      const validInvites = stored.filter(
        (inv) => inv.status === 'pending' && new Date(inv.expiresAt) > new Date(),
      );
      return ok<CoachInvitesData>({ invites: validInvites });
    } catch (error) {
      logger.error('Failed to load invites', error);
      return err(serviceError('UNKNOWN', 'Failed to load club invites.', error));
    }
  }, [currentUser]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<CoachInvitesData>({
    load: loadInvites,
    deps: [currentUser?.id],
    isEmpty: (value) => value.invites.length === 0,
    refetchOnFocus: true,
  });

  // Handle incoming invite code from params
  useEffect(() => {
    const processIncomingInvite = async () => {
      if (params.code && params.clubId && params.clubName && currentUser) {
        try {
          const existing = await apiClient.get<PendingClubInvite[]>(
            `${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser.id}`,
            [],
          );
          if (!existing.find((inv) => inv.inviteCode === params.code)) {
            const knownClub = socialFeedService
              .getUserClubs(currentUser.id)
              .find((club) => club.id === params.clubId);
            const newInvite: PendingClubInvite = {
              id: `invite_${Date.now()}`,
              inviteCode: params.code,
              clubId: params.clubId,
              clubName: params.clubName,
              clubBadge: knownClub?.badge || params.clubName.slice(0, 2).toUpperCase(),
              role: (params.role as ClubRole) || 'COACH',
              invitedBy: 'Club Admin',
              invitedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              status: 'pending',
            };
            existing.push(newInvite);
            await apiClient.set(`${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser.id}`, existing);
            onRefresh();
          }
        } catch (incomingError) {
          logger.error('Failed to process incoming coach invite', incomingError);
        }
      }
    };
    void processIncomingInvite();
  }, [params.code, params.clubId, params.clubName, params.role, currentUser, onRefresh]);

  const handleAccept = useCallback(
    async (invite: PendingClubInvite) => {
      if (!currentUser) return;
      setRespondingTo(invite.id);
      try {
        const allInvites = await apiClient.get<PendingClubInvite[]>(
          `${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser.id}`,
          [],
        );
        const updated = allInvites.map((inv) =>
          inv.id === invite.id ? { ...inv, status: 'accepted' as const } : inv,
        );
        await apiClient.set(`${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser.id}`, updated);
        logger.info('Accepted club invite', { clubId: invite.clubId, role: invite.role });
        uiFeedback.showToast(`You've joined ${invite.clubName} as ${ROLE_LABELS[invite.role]}.`);
router.push(Routes.club(invite.clubId));
        onRefresh();
      } catch (error) {
        logger.error('Failed to accept invite', error);
        uiFeedback.showToast('Failed to accept invite. Please try again.', 'error');
      } finally {
        setRespondingTo(null);
      }
    },
    [currentUser, onRefresh],
  );

  const handleDecline = useCallback(
    (invite: PendingClubInvite) => {
      uiFeedback.alert(
        'Decline Invite',
        `Are you sure you want to decline the invitation to join ${invite.clubName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Decline',
            style: 'destructive',
            onPress: async () => {
              setRespondingTo(invite.id);
              try {
                const allInvites = await apiClient.get<PendingClubInvite[]>(
                  `${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser?.id}`,
                  [],
                );
                const updated = allInvites.map((inv) =>
                  inv.id === invite.id ? { ...inv, status: 'declined' as const } : inv,
                );
                await apiClient.set(
                  `${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser?.id}`,
                  updated,
                );
                onRefresh();
              } catch (error) {
                logger.error('Failed to decline invite', error);
                uiFeedback.showToast('Failed to decline invite.', 'error');
              } finally {
                setRespondingTo(null);
              }
            },
          },
        ],
      );
    },
    [currentUser, onRefresh],
  );

  const invites = data?.invites ?? [];

  const pendingCount = invites.length;

  return {
    invites,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    respondingTo,
    pendingCount,
    handleRefresh: onRefresh,
    retry,
    handleAccept,
    handleDecline,
  };
}

export function formatExpiry(expiresAt: string): string {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Expired';
  if (diffDays === 1) return 'Expires today';
  if (diffDays <= 7) return `Expires in ${diffDays} days`;
  return `Expires ${expires.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}
