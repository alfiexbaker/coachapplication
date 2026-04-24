import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { useChildContext } from '@/hooks/use-child-context';
import { useScreen } from '@/hooks/use-screen';
import {
  progressService,
  type AthleteProgress,
  type SessionFeedback,
} from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { childService, type ChildProfile } from '@/services/child-service';
import { createLogger } from '@/utils/logger';
import type { BadgeAward } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type { SwitcherChild } from '@/components/family/child-switcher';
import { useRequiredParam } from '@/hooks/use-required-param';
import type { ScreenPendingState } from '@/hooks/use-screen-core';

const logger = createLogger('ChildProgressScreen');

export type ProgressTab = 'profile' | 'feedback' | 'badges' | 'radar';

export const PROGRESS_TABS: { id: ProgressTab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: 'person-circle-outline' },
  { id: 'radar', label: 'Radar', icon: 'stats-chart-outline' },
  { id: 'feedback', label: 'Feedback', icon: 'chatbubble-outline' },
  { id: 'badges', label: 'Badges', icon: 'ribbon-outline' },
];

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function isProgressTab(value: string | undefined): value is ProgressTab {
  return value === 'profile' || value === 'radar' || value === 'feedback' || value === 'badges';
}

function resolveProgressTab(value: string | string[] | undefined): ProgressTab {
  const normalized = normalizeParam(value);
  return isProgressTab(normalized) ? normalized : 'profile';
}

interface ChildProgressData {
  child: { id: string; name: string } | undefined;
  childProfile: ChildProfile | null;
  progress: AthleteProgress | null;
  feedback: SessionFeedback[];
  badges: BadgeAward[];
}

export function useChildProgress() {
  const childIdParam = useRequiredParam('childId');
  const { tab: rawTab } = useLocalSearchParams<{
    childId?: string | string[];
    tab?: string | string[];
  }>();
  const paramChildId = childIdParam.valid ? childIdParam.value : undefined;
  const paramTab = resolveProgressTab(rawTab);
  const {
    children: contextChildren,
    activeChildId: contextActiveChildId,
    setActiveChildId,
    isParent,
  } = useChildContext();

  const [activeTab, setActiveTab] = useState<ProgressTab>(paramTab);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(paramChildId);

  useEffect(() => {
    setActiveTab(paramTab);
  }, [paramTab]);

  // Derive switcher children from context
  const switcherChildren = useMemo<SwitcherChild[]>(
    () =>
      contextChildren.map((c) => ({
        id: c.id,
        name: c.name,
        initials: c.initials,
        colorCode: c.colorCode,
      })),
    [contextChildren],
  );

  // Default to context active child or param child or first child
  useEffect(() => {
    if (!selectedChildId || selectedChildId === paramChildId) {
      const defaultId = contextActiveChildId || paramChildId || contextChildren[0]?.id;
      if (defaultId) {
        setSelectedChildId(defaultId);
      }
    }
  }, [contextChildren, contextActiveChildId, paramChildId, selectedChildId]);

  const effectiveChildId = selectedChildId || paramChildId;

  useEffect(() => {
    if (!effectiveChildId || effectiveChildId === contextActiveChildId) {
      return;
    }
    void setActiveChildId(effectiveChildId);
  }, [effectiveChildId, contextActiveChildId, setActiveChildId]);

  const loadData = useCallback(async () => {
    if (!effectiveChildId) {
      return err(serviceError('VALIDATION', 'Missing child id for progress screen.'));
    }

    try {
      const contextChild = contextChildren.find((child) => child.id === effectiveChildId);
      const profile = await childService.getChild(effectiveChildId);
      const resolvedProfile = contextChild?.profile ?? profile ?? null;
      const childData =
        contextChild
          ? { id: contextChild.id, name: contextChild.fullName || contextChild.name }
          : resolvedProfile
            ? {
                id: resolvedProfile.id,
                name: `${resolvedProfile.firstName} ${resolvedProfile.lastName}`.trim(),
              }
            : undefined;

      const progressData = await progressService.getAthleteProgress(effectiveChildId, 'parent');
      progressData.athleteName = childData?.name || 'Athlete';

      const feedbackData = await progressService.getFeedbackForAthlete(effectiveChildId, 'parent');
      const badgesData = await badgeService.listAwardsForAthlete(effectiveChildId);
      const visibleBadges = badgesData.filter((badge) => badge.visibility !== 'coach_only');

      logger.info('Child progress loaded', {
        childId: effectiveChildId,
        childResolved: Boolean(childData),
        sessionCount: progressData.totalSessions,
        feedbackCount: feedbackData.length,
        badgeCount: visibleBadges.length,
      });

      return ok<ChildProgressData>({
        child: childData,
        childProfile: resolvedProfile,
        progress: progressData,
        feedback: feedbackData,
        badges: visibleBadges,
      });
    } catch (error) {
      logger.error('Failed to load child progress', error);
      return err(serviceError('UNKNOWN', 'Failed to load child progress data.', error));
    }
  }, [effectiveChildId, contextChildren]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    pendingState,
    showLoadingState,
    showSectionSkeleton,
    hasTruthfulFrame,
    hasRequestedTruthfulFrame,
  } = useScreen<ChildProgressData>({
    load: loadData,
    deps: [effectiveChildId],
    isEmpty: (value) => !value.child,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: effectiveChildId ?? null,
  });

  const child = data?.child;
  const childProfile = data?.childProfile ?? null;
  const progress = data?.progress ?? null;
  const feedback = data?.feedback ?? [];
  const badges = data?.badges ?? [];

  const handleSelectChild = useCallback(
    (childId: string) => {
      setSelectedChildId(childId);
      setActiveTab('profile');
      void setActiveChildId(childId);
    },
    [setActiveChildId],
  );

  const getTrendInfo = useCallback(
    (palette: { success: string; error: string; muted: string }) => {
      if (!progress) return { icon: 'remove', color: palette.muted, label: 'No Data' };
      switch (progress.overallTrend) {
        case 'improving':
          return { icon: 'trending-up', color: palette.success, label: 'Improving' };
        case 'declining':
          return { icon: 'trending-down', color: palette.error, label: 'Needs Attention' };
        default:
          return { icon: 'remove', color: palette.muted, label: 'Steady Progress' };
      }
    },
    [progress],
  );

  return {
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    pendingState,
    showLoadingState,
    showSectionSkeleton,
    hasTruthfulFrame,
    hasRequestedTruthfulFrame,
    child,
    childProfile,
    progress,
    feedback,
    badges,
    activeTab,
    setActiveTab,
    handleRefresh: onRefresh,
    getTrendInfo,
    // Child switcher
    switcherChildren,
    selectedChildId: effectiveChildId,
    activeChildId: contextActiveChildId ?? undefined,
    handleSelectChild,
    isParent,
  } satisfies {
    loading: boolean;
    status: ReturnType<typeof useScreen<ChildProgressData>>['status'];
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    pendingState: ScreenPendingState;
    showLoadingState: boolean;
    showSectionSkeleton: boolean;
    hasTruthfulFrame: boolean;
    hasRequestedTruthfulFrame: boolean;
    child: { id: string; name: string } | undefined;
    childProfile: ChildProfile | null;
    progress: AthleteProgress | null;
    feedback: SessionFeedback[];
    badges: BadgeAward[];
    activeTab: ProgressTab;
    setActiveTab: (tab: ProgressTab) => void;
    handleRefresh: () => void;
    getTrendInfo: (
      palette: { success: string; error: string; muted: string },
    ) => { icon: string; color: string; label: string };
    switcherChildren: SwitcherChild[];
    selectedChildId: string | undefined;
    activeChildId: string | undefined;
    handleSelectChild: (childId: string) => void;
    isParent: boolean;
  };
}
