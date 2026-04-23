/**
 * Hook for the Groups screen.
 * Manages joined groups and private group creation.
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

interface CommunityHubData {
  myGroups: ParentGroup[];
}

export interface UseCommunityHubResult {
  myGroups: ParentGroup[];
  status: ScreenStatus;
  loading: boolean;
  showLoadingState: boolean;
  isPending: boolean;
  error: ServiceError | null;
  refreshing: boolean;
  showCreateModal: boolean;
  setShowCreateModal: Dispatch<SetStateAction<boolean>>;
  creatingGroup: boolean;
  onRefresh: () => void;
  retry: () => void;
  handleCreateGroup: (data: CreateGroupFormData) => Promise<void>;
  handleGroupPress: (group: ParentGroup) => void;
}

export function useCommunityHub(): UseCommunityHubResult {
  const { currentUser } = useAuth();
  const parentId = currentUser?.id ?? 'parent1';
  const parentName = currentUser?.fullName ?? currentUser?.name ?? 'Parent';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const groupsResult = await communityService.getParentGroups(parentId);
      if (!groupsResult.success) return err(groupsResult.error);

      return ok<CommunityHubData>({
        myGroups: groupsResult.data,
      });
    } catch (loadError) {
      logger.error('Failed to load group data:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load groups. Pull down to refresh.', loadError),
      );
    }
  }, [parentId]);

  const {
    data,
    status,
    showLoadingState,
    isPending,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<CommunityHubData>({
    load: loadData,
    deps: [parentId],
    events: [ServiceEvents.GROUP_MEMBER_JOINED, ServiceEvents.GROUP_MEMBER_ROLE_CHANGED],
    isEmpty: (value) => value.myGroups.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'warm-first',
  });

  const myGroups = data?.myGroups ?? [];
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
          isPublic: false,
        });
        if (!result.success) {
          uiFeedback.showToast(result.error.message);
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

  const handleGroupPress = useCallback((group: ParentGroup) => {
    router.push(Routes.communityGroup(group.id));
  }, []);

  return {
    myGroups,
    status,
    loading,
    showLoadingState,
    isPending,
    error,
    refreshing,
    showCreateModal,
    setShowCreateModal,
    creatingGroup,
    onRefresh,
    retry,
    handleCreateGroup,
    handleGroupPress,
  };
}
