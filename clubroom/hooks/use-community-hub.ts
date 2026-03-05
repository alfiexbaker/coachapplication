/**
 * Hook for the Community Hub screen.
 * Manages groups, tab state, and create group flow.
 */

import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';

import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { communityService } from '@/services/community-service';
import { ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import type { ParentGroup } from '@/constants/types';
import type { CreateGroupFormData } from '@/components/community/CreateGroupForm';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('CommunityHubScreen');

export type TabType = 'groups' | 'discover';

interface CommunityHubData {
  myGroups: ParentGroup[];
  publicGroups: ParentGroup[];
}

export interface UseCommunityHubResult {
  activeTab: TabType;
  setActiveTab: Dispatch<SetStateAction<TabType>>;
  myGroups: ParentGroup[];
  publicGroups: ParentGroup[];
  status: ScreenStatus;
  loading: boolean;
  error: ServiceError | null;
  refreshing: boolean;
  showCreateModal: boolean;
  setShowCreateModal: Dispatch<SetStateAction<boolean>>;
  creatingGroup: boolean;
  parentId: string;
  onRefresh: () => void;
  retry: () => void;
  handleCreateGroup: (data: CreateGroupFormData) => Promise<void>;
  handleJoinGroup: (group: ParentGroup) => Promise<void>;
  handleGroupPress: (group: ParentGroup) => void;
}

export function useCommunityHub(): UseCommunityHubResult {
  const { currentUser } = useAuth();
  const parentId = currentUser?.id ?? 'parent1';
  const parentName = currentUser?.fullName ?? currentUser?.name ?? 'Parent';

  const [activeTab, setActiveTab] = useState<TabType>('groups');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [groupsResult, publicResult] = await Promise.all([
        communityService.getParentGroups(parentId),
        communityService.getPublicGroups(),
      ]);

      if (!groupsResult.success) return err(groupsResult.error);
      if (!publicResult.success) return err(publicResult.error);

      const availablePublicGroups = publicResult.data.filter(
        (group) => !groupsResult.data.some((memberGroup) => memberGroup.id === group.id),
      );

      return ok<CommunityHubData>({
        myGroups: groupsResult.data,
        publicGroups: availablePublicGroups,
      });
    } catch (loadError) {
      logger.error('Failed to load community data:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load community data. Pull down to refresh.', loadError),
      );
    }
  }, [parentId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<CommunityHubData>({
    load: loadData,
    deps: [parentId],
    events: [ServiceEvents.GROUP_MEMBER_JOINED, ServiceEvents.GROUP_MEMBER_ROLE_CHANGED],
    isEmpty: (value) =>
      value.myGroups.length === 0 &&
      value.publicGroups.length === 0,
    refetchOnFocus: true,
  });

  const myGroups = data?.myGroups ?? [];
  const publicGroups = data?.publicGroups ?? [];
  const loading = status === 'loading';

  const handleCreateGroup = useCallback(
    async (data: CreateGroupFormData) => {
      setCreatingGroup(true);
      try {
        const result = await communityService.createGroup({
          name: data.name,
          description: data.description,
          type: data.type,
          memberIds: [],
          memberNames: [],
          creatorId: parentId,
          creatorName: parentName,
          isPublic: data.isPublic,
        });
        if (!result.success) {
          uiFeedback.alert('Could not create group', result.error.message);
          return;
        }
        setShowCreateModal(false);
        onRefresh();
      } catch (error) {
        logger.error('Failed to create group:', error);
      } finally {
        setCreatingGroup(false);
      }
    },
    [parentId, parentName, onRefresh],
  );

  const isCoachUser = currentUser?.role === 'COACH';

  const handleJoinGroup = useCallback(
    async (group: ParentGroup) => {
      try {
        const result = await communityService.joinGroup(group.id, parentId, parentName, {
          isCoach: isCoachUser,
        });
        if (!result.success) {
          uiFeedback.alert('Could not join', result.error.message);
          return;
        }
        onRefresh();
      } catch (error) {
        logger.error('Failed to join group:', error);
        uiFeedback.alert('Error', 'Failed to join group. Please try again.');
      }
    },
    [parentId, parentName, isCoachUser, onRefresh],
  );

  const handleGroupPress = useCallback((group: ParentGroup) => {
    router.push(Routes.communityGroup(group.id));
  }, []);

  return {
    activeTab,
    setActiveTab,
    myGroups,
    publicGroups,
    status,
    loading,
    error,
    refreshing,
    showCreateModal,
    setShowCreateModal,
    creatingGroup,
    parentId,
    onRefresh,
    retry,
    handleCreateGroup,
    handleJoinGroup,
    handleGroupPress,
  };
}
