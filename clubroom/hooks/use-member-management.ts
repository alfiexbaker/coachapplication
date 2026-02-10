/**
 * useMemberManagement — All state, data loading, and handlers for the Member Management screen.
 */
import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { clubService, type ClubMember } from '@/services/club-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import { createLogger } from '@/utils/logger';
import type { Club, ClubSquad, ClubRole } from '@/constants/types';

const logger = createLogger('MemberManagement');

const mapUserRoleToClubRole = (role: string | undefined): ClubRole | null => {
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'COACH') return 'COACH';
  if (role === 'USER') return 'MEMBER';
  return null;
};

export function useMemberManagement() {
  const { clubId, memberId } = useLocalSearchParams<{ clubId: string; memberId: string }>();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [member, setMember] = useState<ClubMember | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<ClubRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const loadData = useCallback(async () => {
    if (!clubId || !memberId) return;
    setLoading(true);
    try {
      const clubData = currentUser?.id
        ? socialFeedService.getUserClubs(currentUser.id).find((candidate) => candidate.id === clubId)
        : undefined;
      setClub(clubData || null);
      const memberData = await clubService.getMember(clubId, memberId);
      setMember(memberData);
      setSquads(await squadService.getSquads(clubId));
      setCurrentUserRole(mapUserRoleToClubRole(currentUser?.role));
    } catch (error) {
      logger.error('Failed to load member data', error);
    } finally {
      setLoading(false);
    }
  }, [clubId, memberId, currentUser?.id, currentUser?.role]);

  useEffect(() => { loadData(); }, [loadData]);

  const canManage = currentUserRole
    ? clubService.canRemoveMembers(currentUserRole) &&
      member?.role !== 'OWNER' &&
      (currentUserRole === 'OWNER' || clubService.canManageRole(currentUserRole, member?.role || 'MEMBER'))
    : false;

  const assignableRoles = currentUserRole ? clubService.getAssignableRoles(currentUserRole) : [];

  const handleChangeRole = useCallback(async (newRole: ClubRole) => {
    if (!clubId || !memberId || !currentUser || !member) return;
    try {
      const result = await clubService.changeMemberRole(clubId, memberId, newRole,
        { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Admin' });
      if (!result.success) { showToast('Failed to change role', 'error'); return; }
      setMember(result.data);
      setShowRolePicker(false);
      showToast(`${member.userName} is now ${clubService.formatRole(newRole)}`, 'success');
    } catch (error) {
      logger.error('Failed to change role', error);
      showToast('Failed to change role', 'error');
    }
  }, [clubId, memberId, currentUser, member, showToast]);

  const handleRemoveMember = useCallback(() => {
    if (!member) return;
    Alert.alert('Remove Member', `Are you sure you want to remove ${member.userName} from ${club?.name || 'this club'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        if (!clubId || !memberId || !currentUser) return;
        try {
          const result = await clubService.removeMember(clubId, memberId, 'LEFT_CLUB',
            { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Admin' });
          if (result.success) { showToast(`${member.userName} removed from club`, 'success'); router.back(); }
          else showToast('Failed to remove member', 'error');
        } catch (error) { logger.error('Failed to remove member', error); showToast('Failed to remove member', 'error'); }
      }},
    ]);
  }, [member, club, clubId, memberId, currentUser, showToast]);

  const handleBanMember = useCallback(() => {
    if (!member) return;
    Alert.alert('Ban Member', `This will permanently ban ${member.userName} from ${club?.name || 'this club'}. They will not be able to rejoin.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Ban', style: 'destructive', onPress: async () => {
        if (!clubId || !memberId || !currentUser) return;
        try {
          const result = await clubService.banMember(clubId, memberId, 'Banned by club management',
            { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Admin' });
          if (result.success) { showToast(`${member.userName} has been banned`, 'success'); router.back(); }
          else showToast('Failed to ban member', 'error');
        } catch (error) { logger.error('Failed to ban member', error); showToast('Failed to ban member', 'error'); }
      }},
    ]);
  }, [member, club, clubId, memberId, currentUser, showToast]);

  const handleToggleSquad = useCallback(async (squadId: string) => {
    if (!clubId || !memberId || !member) return;
    const isInSquad = member.squadIds?.includes(squadId);
    try {
      const result = isInSquad
        ? await clubService.removeMemberFromSquad(clubId, memberId, squadId)
        : await clubService.addMemberToSquad(clubId, memberId, squadId);
      if (result.success) {
        setMember(result.data);
        const squad = squads.find((s) => s.id === squadId);
        showToast(isInSquad ? `Removed from ${squad?.name || 'squad'}` : `Added to ${squad?.name || 'squad'}`, 'success');
      } else showToast('Failed to update squad membership', 'error');
    } catch (error) { logger.error('Failed to toggle squad', error); showToast('Failed to update squad membership', 'error'); }
  }, [clubId, memberId, member, squads, showToast]);

  return {
    member, club, squads, loading, canManage,
    showRolePicker, setShowRolePicker, assignableRoles,
    handleChangeRole, handleRemoveMember, handleBanMember, handleToggleSquad,
  };
}
