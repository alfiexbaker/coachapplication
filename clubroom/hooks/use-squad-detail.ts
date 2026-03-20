/**
 * useSquadDetail — All state, data loading, and handlers for the Squad Detail screen.
 * Manages squad info, members, editing, add/remove members, group chat, delete squad.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { clubService, type ClubMember } from '@/services/club-service';
import { squadService } from '@/services/squad-service';
import { squadGroupService } from '@/services/squad-group-service';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import type { ClubSquad } from '@/constants/types';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SquadDetail');

export function useSquadDetail(squadId: string | undefined) {
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [squad, setSquad] = useState<ClubSquad | null>(null);
  const [resolvedClubId, setResolvedClubId] = useState<string | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [allClubMembers, setAllClubMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<ClubMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openingGroupChat, setOpeningGroupChat] = useState(false);

  const loadData = useCallback(async () => {
    if (!squadId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const squadData = await squadService.getSquad(squadId);
      setSquad(squadData);
      const clubId = squadData?.clubId;
      setResolvedClubId(clubId || null);
      if (squadData) setEditName(squadData.name);
      if (!clubId) {
        setLoading(false);
        return;
      }

      const clubMembers = await clubService.getMembers(clubId);
      setAllClubMembers(clubMembers);
      setMembers(clubMembers.filter((m) => m.squadIds?.includes(squadId)));
    } catch (error) {
      logger.error('Failed to load squad data', error);
    } finally {
      setLoading(false);
    }
  }, [squadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const membersNotInSquad = useMemo(
    () => allClubMembers.filter((m) => !m.squadIds?.includes(squadId || '')),
    [allClubMembers, squadId],
  );

  const handleGroupChat = useCallback(async () => {
    if (!squadId || openingGroupChat) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpeningGroupChat(true);
    try {
      const result = await squadGroupService.getOrCreateSquadGroup(
        squadId,
        currentUser?.id ?? 'coach1',
        currentUser?.fullName ?? currentUser?.name ?? 'Coach',
      );
      if (result.success) {
        router.push(Routes.communityGroup(result.data.id));
      } else {
        showToast('Failed to open group chat', 'error');
        logger.error('Failed to open squad group chat', result.error);
      }
    } catch (error) {
      showToast('Failed to open group chat', 'error');
      logger.error('Error opening squad group chat', error);
    } finally {
      setOpeningGroupChat(false);
    }
  }, [squadId, openingGroupChat, currentUser, showToast]);

  const handleSaveName = useCallback(async () => {
    if (!squad || !resolvedClubId || !editName.trim()) return;
    try {
      const storedSquads = await apiClient.get<ClubSquad[]>('club_squads', []);
      const idx = storedSquads.findIndex((s) => s.id === squad.id);
      if (idx !== -1) {
        storedSquads[idx].name = editName.trim();
        await apiClient.set('club_squads', storedSquads);
      }
      setSquad({ ...squad, name: editName.trim() });
      setIsEditing(false);
      showToast('Squad name updated', 'success');
      logger.action('RenameSquad', { squadId, newName: editName.trim() });
    } catch (error) {
      logger.error('Failed to rename squad', error);
      showToast('Failed to rename squad', 'error');
    }
  }, [squad, resolvedClubId, editName, squadId, showToast]);

  const handleAddToSquad = useCallback(
    async (member: ClubMember) => {
      if (!resolvedClubId || !squadId) return;
      try {
        const result = await clubService.addMemberToSquad(resolvedClubId, member.userId, squadId);
        if (result.success) {
          await loadData();
          showToast(`${member.userName} added to squad`, 'success');
        } else {
          showToast('Failed to add member', 'error');
        }
      } catch (error) {
        logger.error('Failed to add member to squad', error);
        showToast('Failed to add member', 'error');
      }
    },
    [resolvedClubId, squadId, loadData, showToast],
  );

  const handleRemoveFromSquad = useCallback(
    (member: ClubMember) => {
      if (!resolvedClubId || !squadId) return;
      setMemberToRemove(member);
    },
    [resolvedClubId, squadId],
  );

  const confirmRemoveMember = useCallback(async () => {
    if (!resolvedClubId || !squadId || !memberToRemove) return;
    try {
      const result = await clubService.removeMemberFromSquad(
        resolvedClubId,
        memberToRemove.userId,
        squadId,
      );
      if (result.success) {
        showToast(`${memberToRemove.userName} removed from squad`, 'success');
        setMemberToRemove(null);
        await loadData();
      } else {
        showToast('Failed to remove member', 'error');
      }
    } catch (error) {
      logger.error('Failed to remove from squad', error);
      showToast('Failed to remove member', 'error');
    }
  }, [resolvedClubId, squadId, memberToRemove, loadData, showToast]);

  const handleDeleteSquad = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteSquad = useCallback(async () => {
    if (!squadId) return;
    setDeleting(true);
    try {
      const storedSquads = await apiClient.get<ClubSquad[]>(STORAGE_KEYS.CLUB_SQUADS, []);
      const fallbackSquads = resolvedClubId ? await squadService.getSquads(resolvedClubId) : [];
      const allSquads = storedSquads.length > 0 ? storedSquads : fallbackSquads;
      const deletedSquad = allSquads.find((s) => s.id === squadId);
      const filtered = allSquads.filter((s) => s.id !== squadId);
      await apiClient.set(STORAGE_KEYS.CLUB_SQUADS, filtered);
      emitTyped(ServiceEvents.SQUAD_DELETED, { squadId, clubId: deletedSquad?.clubId ?? '' });
      showToast('Squad deleted', 'success');
      logger.action('DeleteSquad', { squadId });
      router.back();
    } catch (error) {
      logger.error('Failed to delete squad', error);
      showToast('Failed to delete squad', 'error');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [resolvedClubId, squadId, showToast]);

  const handleInviteSquad = useCallback(() => {
    router.push(Routes.squadInvite(squadId || ''));
  }, [squadId]);

  const handleOpenSchedule = useCallback(() => {
    if (!squadId) return;
    router.push(Routes.squadSchedule(squadId));
  }, [squadId]);

  const cancelEdit = useCallback(() => {
    if (squad) setEditName(squad.name);
    setIsEditing(false);
  }, [squad]);

  return {
    squad,
    members,
    loading,
    resolvedClubId,
    isEditing,
    setIsEditing,
    editName,
    setEditName,
    cancelEdit,
    showAddMembers,
    setShowAddMembers,
    membersNotInSquad,
    showDeleteConfirm,
    setShowDeleteConfirm,
    deleting,
    memberToRemove,
    setMemberToRemove,
    openingGroupChat,
    handleGroupChat,
    handleSaveName,
    handleAddToSquad,
    handleRemoveFromSquad,
    confirmRemoveMember,
    handleDeleteSquad,
    confirmDeleteSquad,
    handleInviteSquad,
    handleOpenSchedule,
  };
}
