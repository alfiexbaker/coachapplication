/**
 * Hook for the Coach Invites screen.
 * Manages pending club invites, accept/decline, and incoming code processing.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { socialFeedService } from '@/services/social-feed-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import type { ClubRole } from '@/constants/types';

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
  OWNER: 'Owner', ADMIN: 'Administrator', HEAD_COACH: 'Head Coach', COACH: 'Coach', MEMBER: 'Member',
};

export function useCoachInvites() {
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{ code?: string; clubId?: string; clubName?: string; role?: string }>();

  const [invites, setInvites] = useState<PendingClubInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!currentUser) return;
    try {
      const stored = await apiClient.get<PendingClubInvite[]>(`${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser.id}`, []);
      if (stored.length > 0) {
        const validInvites = stored.filter((inv) => inv.status === 'pending' && new Date(inv.expiresAt) > new Date());
        setInvites(validInvites);
      }
    } catch (error) {
      logger.error('Failed to load invites', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  // Handle incoming invite code from params
  useEffect(() => {
    const processIncomingInvite = async () => {
      if (params.code && params.clubId && params.clubName && currentUser) {
        const existing = await apiClient.get<PendingClubInvite[]>(`${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser.id}`, []);
        if (!existing.find((inv) => inv.inviteCode === params.code)) {
          const knownClub = socialFeedService.getUserClubs(currentUser.id).find((club) => club.id === params.clubId);
          const newInvite: PendingClubInvite = {
            id: `invite_${Date.now()}`, inviteCode: params.code, clubId: params.clubId,
            clubName: params.clubName,
            clubBadge: knownClub?.badge || params.clubName.slice(0, 2).toUpperCase(),
            role: (params.role as ClubRole) || 'COACH',
            invitedBy: 'Club Admin', invitedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending',
          };
          existing.push(newInvite);
          await apiClient.set(`${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser.id}`, existing);
          setInvites(existing.filter((inv) => inv.status === 'pending'));
        }
      }
    };
    processIncomingInvite();
  }, [params.code, params.clubId, params.clubName, params.role, currentUser]);

  useEffect(() => { loadInvites(); }, [loadInvites]);
  useFocusEffect(useCallback(() => { loadInvites(); }, [loadInvites]));

  const handleRefresh = useCallback(() => { setRefreshing(true); loadInvites(); }, [loadInvites]);

  const handleAccept = useCallback(async (invite: PendingClubInvite) => {
    if (!currentUser) return;
    setRespondingTo(invite.id);
    try {
      const allInvites = await apiClient.get<PendingClubInvite[]>(`${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser.id}`, []);
      const updated = allInvites.map((inv) => inv.id === invite.id ? { ...inv, status: 'accepted' as const } : inv);
      await apiClient.set(`${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser.id}`, updated);
      logger.info('Accepted club invite', { clubId: invite.clubId, role: invite.role });
      Alert.alert('Welcome!', `You've joined ${invite.clubName} as ${ROLE_LABELS[invite.role]}.`,
        [{ text: 'Go to Club', onPress: () => router.push(Routes.club(invite.clubId)) }]);
      loadInvites();
    } catch (error) {
      logger.error('Failed to accept invite', error);
      Alert.alert('Error', 'Failed to accept invite. Please try again.');
    } finally { setRespondingTo(null); }
  }, [currentUser, loadInvites]);

  const handleDecline = useCallback((invite: PendingClubInvite) => {
    Alert.alert('Decline Invite', `Are you sure you want to decline the invitation to join ${invite.clubName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        setRespondingTo(invite.id);
        try {
          const allInvites = await apiClient.get<PendingClubInvite[]>(`${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser?.id}`, []);
          const updated = allInvites.map((inv) => inv.id === invite.id ? { ...inv, status: 'declined' as const } : inv);
          await apiClient.set(`${STORAGE_KEYS.PENDING_CLUB_INVITES}_${currentUser?.id}`, updated);
          loadInvites();
        } catch (error) {
          logger.error('Failed to decline invite', error);
          Alert.alert('Error', 'Failed to decline invite.');
        } finally { setRespondingTo(null); }
      }},
    ]);
  }, [currentUser, loadInvites]);

  const pendingCount = invites.length;

  return {
    invites, loading, refreshing, respondingTo, pendingCount,
    handleRefresh, handleAccept, handleDecline,
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
