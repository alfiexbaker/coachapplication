/**
 * useSquadDetail — All state, data loading, and handlers for the Squad Detail screen.
 * Manages squad info, members, editing, add/remove members, group chat, delete squad.
 */
import { useState, useEffect, startTransition, type Dispatch, type SetStateAction } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { clubService, type ClubMember } from '@/services/club-service';
import { squadService } from '@/services/squad-service';
import { squadGroupService } from '@/services/squad-group-service';
import type { ClubSquad } from '@/constants/types';
import { createLogger } from '@/utils/logger';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('SquadDetail');

interface LoadedSquadDetail {
  squadData: ClubSquad | null;
  clubId: string | null;
  clubMembers: ClubMember[];
  squadMembers: ClubMember[];
}

interface SquadDetailSetters {
  setSquad: Dispatch<SetStateAction<ClubSquad | null>>;
  setResolvedClubId: Dispatch<SetStateAction<string | null>>;
  setEditName: Dispatch<SetStateAction<string>>;
  setAllClubMembers: Dispatch<SetStateAction<ClubMember[]>>;
  setMembers: Dispatch<SetStateAction<ClubMember[]>>;
}

interface SquadDetailLoadSetters extends SquadDetailSetters {
  setLoading: Dispatch<SetStateAction<boolean>>;
}

async function getLoadedSquadDetail(squadId: string): Promise<LoadedSquadDetail> {
  const squadData = await squadService.getSquad(squadId);
  const clubId = squadData?.clubId ?? null;

  if (!clubId) {
    return {
      squadData,
      clubId,
      clubMembers: [],
      squadMembers: [],
    };
  }

  const clubMembers = await clubService.getMembers(clubId);
  return {
    squadData,
    clubId,
    clubMembers,
    squadMembers: clubMembers.filter((member) => member.squadIds?.includes(squadId)),
  };
}

function applyLoadedSquadDetail(snapshot: LoadedSquadDetail, setters: SquadDetailSetters) {
  setters.setSquad(snapshot.squadData);
  setters.setResolvedClubId(snapshot.clubId);
  if (snapshot.squadData) {
    setters.setEditName(snapshot.squadData.name);
  }
  setters.setAllClubMembers(snapshot.clubMembers);
  setters.setMembers(snapshot.squadMembers);
}

async function loadSquadDetailIntoState(
  squadId: string | undefined,
  setters: SquadDetailLoadSetters,
  isActive: () => boolean = () => true,
) {
  if (!squadId) {
    if (isActive()) {
      startTransition(() => {
        setters.setLoading(false);
      });
    }
    return;
  }

  setters.setLoading(true);

  return await runAsyncTryCatchFinally(
    async () => {
      const snapshot = await getLoadedSquadDetail(squadId);
      if (!isActive()) {
        return;
      }
      applyLoadedSquadDetail(snapshot, setters);
    },
    async (error) => {
      logger.error('Failed to load squad data', error);
    },
    () => {
      if (isActive()) {
        setters.setLoading(false);
      }
    },
  );
}

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

  const loadData = async () =>
    loadSquadDetailIntoState(squadId, {
      setSquad,
      setResolvedClubId,
      setEditName,
      setAllClubMembers,
      setMembers,
      setLoading,
    });

  useEffect(() => {
    let isActive = true;

    void loadSquadDetailIntoState(
      squadId,
      {
        setSquad,
        setResolvedClubId,
        setEditName,
        setAllClubMembers,
        setMembers,
        setLoading,
      },
      () => isActive,
    );

    return () => {
      isActive = false;
    };
  }, [squadId]);

  const membersNotInSquad = allClubMembers.filter((m) => !m.squadIds?.includes(squadId || ''));

  const handleGroupChat = async () => {
    if (!squadId || openingGroupChat) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpeningGroupChat(true);

    await runAsyncTryCatchFinally(
      async () => {
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
      },
      async (error) => {
        showToast('Failed to open group chat', 'error');
        logger.error('Error opening squad group chat', error);
      },
      () => {
        setOpeningGroupChat(false);
      },
    );
  };

  const handleSaveName = async () => {
    if (!squad || !resolvedClubId || !editName.trim()) return;
    try {
      const updatedSquad = await squadService.updateSquad(resolvedClubId, squad.id, {
        name: editName.trim(),
      });
      setSquad(updatedSquad);
      setIsEditing(false);
      showToast('Squad name updated', 'success');
      logger.action('RenameSquad', { squadId, newName: editName.trim() });
    } catch (error) {
      logger.error('Failed to rename squad', error);
      showToast('Failed to rename squad', 'error');
    }
  };

  const handleAddToSquad = async (member: ClubMember) => {
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
  };

  const handleRemoveFromSquad = (member: ClubMember) => {
    if (!resolvedClubId || !squadId) return;
    setMemberToRemove(member);
  };

  const confirmRemoveMember = async () => {
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
  };

  const handleDeleteSquad = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSquad = async () => {
    if (!squadId || !resolvedClubId) return;
    setDeleting(true);
    await runAsyncTryCatchFinally(
      async () => {
        await squadService.deleteSquad(resolvedClubId, squadId);
        showToast('Squad archived', 'success');
        setShowDeleteConfirm(false);
        router.replace(Routes.club(resolvedClubId));
      },
      async (error) => {
        logger.error('Failed to archive squad', error);
        showToast(error instanceof Error ? error.message : 'Failed to archive squad', 'error');
      },
      () => {
        setDeleting(false);
      },
    );
  };

  const handleInviteSquad = () => {
    router.push(Routes.squadInvite(squadId || ''));
  };

  const handleOpenSchedule = () => {
    if (!squadId) return;
    router.push(Routes.squadSchedule(squadId));
  };

  const cancelEdit = () => {
    if (squad) setEditName(squad.name);
    setIsEditing(false);
  };

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
