import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { injuryService } from '@/services/injury-service';
import {
  buildProfileSubjectOptions,
  resolveProfileSubjectId,
} from '@/utils/profile-subject';
import type { Injury } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useHealthHub');

export function useHealthHub() {
  const { currentUser } = useAuth();
  const { subjectId: subjectIdParam, childId: childIdParam } = useLocalSearchParams<{
    subjectId?: string | string[];
    childId?: string | string[];
  }>();
  const { children, profileMode, profileSubjectId, canSelectSelfProfile } = useChildContext();

  const explicitSubjectId = (() => {
    const raw = subjectIdParam ?? childIdParam;
    if (!raw) return null;
    return Array.isArray(raw) ? raw[0] ?? null : raw;
  })();

  const subjectOptions = buildProfileSubjectOptions({
    currentUser,
    children,
    includeSelf: children.length === 0 || canSelectSelfProfile,
  });

  const selectedSubjectId = resolveProfileSubjectId({
    explicitSubjectId,
    currentUserId: currentUser?.id,
    profileMode,
    profileSubjectId,
    subjectOptions,
  });

  const selectedChildId = (children.some((child) => child.id === selectedSubjectId) ? selectedSubjectId : null);

  const selectedChild = children.find((child) => child.id === selectedChildId) ?? null;
  const selectedSubjectName = (() => {
    if (selectedChild?.name) return selectedChild.name;
    if (currentUser?.fullName) return currentUser.fullName;
    if (currentUser?.name) return currentUser.name;
    return null;
  })();
  const selectedSubjectKind = selectedChildId ? 'child' : 'self';

  const subjectId = selectedSubjectId ?? null;

  const loadData = async () => {
    if (!subjectId) {
      return ok<{ injuries: Injury[] }>({
        injuries: [],
      });
    }

    try {
      const actorId = currentUser?.id ?? subjectId;
      const userInjuries = await injuryService.getUserInjuriesForActor(actorId, subjectId, true);
      return ok<{ injuries: Injury[] }>({
        injuries: userInjuries,
      });
    } catch (error) {
      logger.error('Failed to load health data:', error);
      return err(serviceError('UNKNOWN', 'Failed to load health dashboard data.', error));
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<{ injuries: Injury[] }>({
    load: loadData,
    deps: [subjectId],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: subjectId ? `health-hub:${subjectId}` : 'health-hub:missing',
  });

  const injuries = data?.injuries ?? [];
  const handleRefresh = onRefresh;

  const handleLogInjury = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (selectedChildId) {
      router.push({ pathname: '/health/log', params: { childId: selectedChildId } });
      return;
    }
    router.push(Routes.HEALTH_LOG);
  };

  const handleEditSelectedChild = () => {
    if (!selectedChildId) return;
    router.push(Routes.modalEditChildProfile(selectedChildId));
  };

  const handleInjuryPress = (injury: Injury) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.healthEntry(injury.id));
  };

  return {
    injuries,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    handleRefresh,
    retry,
    handleLogInjury,
    handleInjuryPress,
    selectedChildId: selectedChildId ?? undefined,
    selectedChildName: selectedChild?.name ?? null,
    selectedSubjectName,
    selectedSubjectKind,
    canEditSelectedChild: Boolean(selectedChildId),
    handleEditSelectedChild,
  } satisfies {
    injuries: Injury[];
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    handleRefresh: () => void;
    retry: () => void;
    handleLogInjury: () => void;
    handleInjuryPress: (injury: Injury) => void;
    selectedChildId: string | undefined;
    selectedChildName: string | null;
    selectedSubjectName: string | null;
    selectedSubjectKind: 'self' | 'child';
    canEditSelectedChild: boolean;
    handleEditSelectedChild: () => void;
  };
}
