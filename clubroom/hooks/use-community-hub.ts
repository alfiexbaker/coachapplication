/**
 * Hook for the Community Hub screen.
 * Manages groups, carpools, tab state, and create group flow.
 */

import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { communityService } from '@/services/community-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import type { ParentGroup, CarpoolOffer } from '@/constants/types';
import type { CreateGroupFormData } from '@/components/community/CreateGroupForm';

const logger = createLogger('CommunityHubScreen');

export type TabType = 'groups' | 'carpools' | 'discover';

export function useCommunityHub() {
  const { currentUser } = useAuth();
  const parentId = currentUser?.id ?? 'parent1';
  const parentName = currentUser?.fullName ?? currentUser?.name ?? 'Parent';

  const [activeTab, setActiveTab] = useState<TabType>('groups');
  const [myGroups, setMyGroups] = useState<ParentGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<ParentGroup[]>([]);
  const [carpoolOffers, setCarpoolOffers] = useState<CarpoolOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [groups, publicG, carpools] = await Promise.all([
        communityService.getParentGroups(parentId),
        communityService.getPublicGroups(),
        communityService.getAvailableCarpoolOffers(parentId),
      ]);
      setMyGroups(groups);
      setPublicGroups(publicG.filter((pg) => !groups.some((g) => g.id === pg.id)));
      setCarpoolOffers(carpools);
    } catch (error) {
      logger.error('Failed to load community data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    const unsub1 = onTyped(ServiceEvents.GROUP_MEMBER_JOINED, () => loadData());
    const unsub2 = onTyped(ServiceEvents.GROUP_MEMBER_ROLE_CHANGED, () => loadData());
    return () => { unsub1(); unsub2(); };
  }, [loadData]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const handleCreateGroup = useCallback(async (data: CreateGroupFormData) => {
    setCreatingGroup(true);
    try {
      await communityService.createGroup({
        name: data.name, description: data.description, type: data.type,
        memberIds: [], memberNames: [], creatorId: parentId, creatorName: parentName, isPublic: data.isPublic,
      });
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      logger.error('Failed to create group:', error);
    } finally {
      setCreatingGroup(false);
    }
  }, [parentId, parentName, loadData]);

  const isCoachUser = currentUser?.role === 'COACH';

  const handleJoinGroup = useCallback(async (group: ParentGroup) => {
    try {
      const result = await communityService.joinGroup(group.id, parentId, parentName, { isCoach: isCoachUser });
      if (!result.success) { Alert.alert('Could not join', result.error.message); return; }
      await loadData();
    } catch (error) {
      logger.error('Failed to join group:', error);
      Alert.alert('Error', 'Failed to join group. Please try again.');
    }
  }, [parentId, parentName, isCoachUser, loadData]);

  const handleGroupPress = useCallback((group: ParentGroup) => { router.push(Routes.communityGroup(group.id)); }, []);
  const handleCarpoolPress = useCallback(() => { router.push(Routes.CARPOOL); }, []);

  return {
    activeTab, setActiveTab, myGroups, publicGroups, carpoolOffers,
    loading, refreshing, showCreateModal, setShowCreateModal, creatingGroup,
    parentId, onRefresh, handleCreateGroup, handleJoinGroup, handleGroupPress, handleCarpoolPress,
  };
}
