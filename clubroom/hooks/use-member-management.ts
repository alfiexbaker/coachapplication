/**
 * useMemberManagement — All state, data loading, and handlers for the Member Management screen.
 */
import { useState } from 'react';

import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { clubService, type ClubMember } from '@/services/club-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import { createLogger } from '@/utils/logger';
import type { Club, ClubSquad, ClubRole } from '@/constants/types';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { ServiceEvents } from '@/services/event-bus';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('MemberManagement');

interface MemberManagementData {
  member: ClubMember | null;
  club: Club | null;
  squads: ClubSquad[];
  currentUserRole: ClubRole | null;
}

export interface UseMemberManagementResult {
  member: ClubMember | null;
  club: Club | null;
  squads: ClubSquad[];
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  canManage: boolean;
  showRolePicker: boolean;
  setShowRolePicker: (value: boolean) => void;
  assignableRoles: ClubRole[];
  handleChangeRole: (newRole: ClubRole) => Promise<void>;
  handleRemoveMember: () => void;
  handleBanMember: () => void;
  handleToggleSquad: (squadId: string) => Promise<void>;
}

export function useMemberManagement(): UseMemberManagementResult {
  const { clubId, memberId } = useLocalSearchParams<{ clubId: string; memberId: string }>();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [showRolePicker, setShowRolePicker] = useState(false);

  const loadData = async () => {
    if (!clubId || !memberId) {
      return ok<MemberManagementData>({
        member: null,
        club: null,
        squads: [],
        currentUserRole: null,
      });
    }

    try {
      const clubData = currentUser?.id
        ? socialFeedService
            .getUserClubs(currentUser.id)
            .find((candidate) => candidate.id === clubId)
        : undefined;
      const memberData = await clubService.getMember(clubId, memberId);
      const squads = await squadService.getSquads(clubId);
      const viewerMembership =
        currentUser?.id ? socialFeedService.getMembership(currentUser.id, clubId) : undefined;

      return ok<MemberManagementData>({
        member: memberData,
        club: clubData || null,
        squads,
        currentUserRole: viewerMembership?.role ?? null,
      });
    } catch (loadError) {
      logger.error('Failed to load member data', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load member data. Pull down to refresh.', loadError),
      );
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<MemberManagementData>({
    load: loadData,
    deps: [clubId, memberId, currentUser?.id],
    events: [
      ServiceEvents.CLUB_MEMBER_JOINED,
      ServiceEvents.CLUB_MEMBER_LEFT,
      ServiceEvents.SQUAD_MEMBER_ADDED,
      ServiceEvents.SQUAD_MEMBER_REMOVED,
    ],
    isEmpty: (value) => value.member === null || value.club === null,
    refetchOnFocus: true,
  });

  const member = data?.member ?? null;
  const club = data?.club ?? null;
  const squads = data?.squads ?? [];
  const currentUserRole =
    data?.currentUserRole
    ?? (currentUser?.id && clubId ? socialFeedService.getMembership(currentUser.id, clubId)?.role ?? null : null);
  const loading = status === 'loading';

  const canManage = currentUserRole
    ? clubService.canRemoveMembers(currentUserRole) &&
      member?.role !== 'OWNER' &&
      (currentUserRole === 'OWNER' ||
        clubService.canManageRole(currentUserRole, member?.role || 'MEMBER'))
    : false;

  const assignableRoles = currentUserRole ? clubService.getAssignableRoles(currentUserRole) : [];

  const handleChangeRole = async (newRole: ClubRole) => {
    if (!clubId || !memberId || !currentUser || !member) return;
    try {
      const result = await clubService.changeMemberRole(clubId, memberId, newRole, {
        id: currentUser.id,
        name: currentUser.fullName || currentUser.username || 'Admin',
      });
      if (!result.success) {
        showToast('Failed to change role', 'error');
        return;
      }
      setShowRolePicker(false);
      onRefresh();
      showToast(`${member.userName} is now ${clubService.formatRole(newRole)}`, 'success');
    } catch (error) {
      logger.error('Failed to change role', error);
      showToast('Failed to change role', 'error');
    }
  };

  const handleRemoveMember = () => {
    if (!member) return;
    uiFeedback.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.userName} from ${club?.name || 'this club'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!clubId || !memberId || !currentUser) return;
            try {
              const result = await clubService.removeMember(clubId, memberId, 'LEFT_CLUB', {
                id: currentUser.id,
                name: currentUser.fullName || currentUser.username || 'Admin',
              });
              if (result.success) {
                showToast(`${member.userName} removed from club`, 'success');
                router.back();
              } else showToast('Failed to remove member', 'error');
            } catch (error) {
              logger.error('Failed to remove member', error);
              showToast('Failed to remove member', 'error');
            }
          },
        },
      ],
    );
  };

  const handleBanMember = () => {
    if (!member) return;
    uiFeedback.alert(
      'Ban Member',
      `This will permanently ban ${member.userName} from ${club?.name || 'this club'}. They will not be able to rejoin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            if (!clubId || !memberId || !currentUser) return;
            try {
              const result = await clubService.banMember(
                clubId,
                memberId,
                'Banned by club management',
                {
                  id: currentUser.id,
                  name: currentUser.fullName || currentUser.username || 'Admin',
                },
              );
              if (result.success) {
                showToast(`${member.userName} has been banned`, 'success');
                router.back();
              } else showToast('Failed to ban member', 'error');
            } catch (error) {
              logger.error('Failed to ban member', error);
              showToast('Failed to ban member', 'error');
            }
          },
        },
      ],
    );
  };

  const handleToggleSquad = async (squadId: string) => {
    if (!clubId || !memberId || !member) return;
    const isInSquad = member.squadIds?.includes(squadId);
    try {
      const result = isInSquad
        ? await clubService.removeMemberFromSquad(clubId, memberId, squadId)
        : await clubService.addMemberToSquad(clubId, memberId, squadId);
      if (result.success) {
        onRefresh();
        const squad = squads.find((s) => s.id === squadId);
        showToast(
          isInSquad
            ? `Removed from ${squad?.name || 'squad'}`
            : `Added to ${squad?.name || 'squad'}`,
          'success',
        );
      } else showToast('Failed to update squad membership', 'error');
    } catch (error) {
      logger.error('Failed to toggle squad', error);
      showToast('Failed to update squad membership', 'error');
    }
  };

  return {
    member,
    club,
    squads,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    canManage,
    showRolePicker,
    setShowRolePicker,
    assignableRoles,
    handleChangeRole,
    handleRemoveMember,
    handleBanMember,
    handleToggleSquad,
  };
}
